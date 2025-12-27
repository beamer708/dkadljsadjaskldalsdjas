"""Independent order ticket system using DM-only tickets (separate from support)."""

import asyncio
import logging
from typing import TYPE_CHECKING, Optional
import discord
from discord import app_commands
from discord.ext import commands

from src.utils.embeds import brand_embed, BRAND_ACCENT

if TYPE_CHECKING:
    from src.bot import Bot

logger = logging.getLogger(__name__)

ORDER_LOG_CHANNEL_NAME = "orders-log"

SERVICES = {
    "standard": {
        "label": "Standard Ride",
        "description": "Pickup and drop-off (limo & blackout tiers).",
        "role_id": 1405553962010148925,  # Driver role
    },
    "getaway": {
        "label": "Getaway Driver",
        "description": "Emergency pickup when evading police.",
        "role_id": 1453927013688807677,  # Getaway Driver role
    },
    "transit": {
        "label": "Transit Services",
        "description": "Public transportation (bus services).",
        "role_id": 1409702187851972778,  # Transit role
    },
}


async def ensure_orders_log_channel(guild: discord.Guild) -> Optional[discord.TextChannel]:
    """Get or create a staff-only orders log channel (not a public ticket channel)."""
    for channel in guild.text_channels:
        if channel.name == ORDER_LOG_CHANNEL_NAME:
            return channel

    if not guild.me.guild_permissions.manage_channels:
        logger.warning("Missing manage_channels in %s; cannot create orders log channel.", guild.id)
        return None

    overwrites = {
        guild.default_role: discord.PermissionOverwrite(view_channel=False),
        guild.me: discord.PermissionOverwrite(view_channel=True, send_messages=True, read_message_history=True),
    }

    # Allow all service-specific roles if they exist
    for svc in SERVICES.values():
        role = guild.get_role(svc["role_id"])
        if role:
            overwrites[role] = discord.PermissionOverwrite(
                view_channel=True, send_messages=True, read_message_history=True
            )

    try:
        channel = await guild.create_text_channel(
            ORDER_LOG_CHANNEL_NAME,
            overwrites=overwrites,
            reason="Create orders staff log channel",
        )
        logger.info("Created orders log channel in guild %s", guild.id)
        return channel
    except Exception as exc:
        logger.error("Failed to create orders log channel in guild %s: %s", guild.id, exc, exc_info=True)
        return None


class OrderModal(discord.ui.Modal):
    """Modal kept for compatibility; not used in DM-based intake flow."""

    def __init__(self, *args, **kwargs):
        super().__init__(title="Unused", timeout=1)


class OrderSelect(discord.ui.Select):
    """Select menu for choosing a service; triggers DM intake (no modal)."""

    def __init__(self, bot: "Bot") -> None:
        self.bot = bot
        options = [
            discord.SelectOption(label=data["label"], description=data["description"][:100], value=key)
            for key, data in SERVICES.items()
        ]
        super().__init__(
            placeholder="Select a service to start your order",
            min_values=1,
            max_values=1,
            options=options,
            custom_id="order_service_select",
        )

    async def callback(self, interaction: discord.Interaction) -> None:  # type: ignore[override]
        service_key = self.values[0]
        await interaction.response.send_message(
            embed=brand_embed(
                title="Check Your DMs",
                description="I sent you a DM to collect your order details.",
            ),
            ephemeral=True,
        )
        await self.start_dm_intake(interaction, service_key)
        logger.info("Order selection by user %s (%s)", interaction.user.id, service_key)

    async def start_dm_intake(self, interaction: discord.Interaction, service_key: str) -> None:
        """Collect details in DMs and notify staff."""
        service = SERVICES.get(service_key)
        if service is None:
            return

        # Resolve guild context for staff notifications
        guild = interaction.guild
        if guild is None and getattr(self.bot.config, "dev_guild_id", None):
            guild = self.bot.get_guild(self.bot.config.dev_guild_id)
        if guild is None:
            return

        user = interaction.user
        try:
            dm = user.dm_channel or await user.create_dm()
        except discord.Forbidden:
            logger.warning("Cannot DM user %s for order intake (DMs closed)", user.id)
            return
        except Exception as exc:
            logger.error("Failed to open DM with user %s: %s", user.id, exc, exc_info=True)
            return

        intro = brand_embed(
            title=f"{service['label']} Order",
            description="Please provide the following details to create your order ticket.",
            color=BRAND_ACCENT,
        )
        intro.add_field(name="Step 1", value="Reply with your Roblox Username.", inline=False)
        intro.add_field(name="Step 2", value="Then reply with your Location.", inline=False)
        await dm.send(embed=intro)

        roblox_username = await self.prompt(dm, user, "Roblox Username:", timeout=180)
        if roblox_username is None:
            await dm.send(embed=brand_embed(title="Timed Out", description="No response received. Please try again."))
            return

        location = await self.prompt(dm, user, "Location:", timeout=180)
        if location is None:
            await dm.send(embed=brand_embed(title="Timed Out", description="No response received. Please try again."))
            return

        # Confirm to user
        confirm = brand_embed(
            title="Order Ticket Created",
            description=(
                f"**Service:** {service['label']}\n"
                f"**Roblox Username:** {roblox_username}\n"
                f"**Location:** {location}\n\n"
                "A team member will assist you shortly."
            ),
            color=BRAND_ACCENT,
        )
        confirm.set_author(name=str(user), icon_url=user.display_avatar.url)
        await dm.send(embed=confirm)
        logger.info("DM order ticket opened for user %s (%s)", user.id, service['label'])

        # Staff notification (role mention above embed)
        await self.notify_staff(guild, user, service, roblox_username, location)

    async def prompt(self, dm: discord.DMChannel, user: discord.User, question: str, timeout: float = 180.0) -> Optional[str]:
        """Prompt user in DM and wait for a response."""
        await dm.send(question)

        def check(msg: discord.Message) -> bool:
            return msg.author.id == user.id and isinstance(msg.channel, discord.DMChannel)

        try:
            msg = await self.bot.wait_for("message", check=check, timeout=timeout)
            return msg.content.strip()
        except asyncio.TimeoutError:
            return None
        except Exception as exc:
            logger.error("Error collecting input from user %s: %s", user.id, exc, exc_info=True)
            return None

    async def notify_staff(
        self,
        guild: discord.Guild,
        user: discord.User,
        service: dict,
        roblox_username: str,
        location: str,
    ) -> None:
        """Notify appropriate staff role in a log channel."""
        log_channel = await ensure_orders_log_channel(guild)
        if log_channel is None:
            return

        role = guild.get_role(service.get("role_id"))
        content = role.mention if role else "Order notification"
        if role is None:
            logger.warning("Service role missing for %s in guild %s", service.get("label"), guild.id)

        embed = brand_embed(
            title="New Order Ticket",
            description=(
                f"**Service:** {service['label']}\n"
                f"**User:** {user.mention} (`{user.id}`)\n"
                f"**Roblox Username:** {roblox_username}\n"
                f"**Location:** {location}"
            ),
            color=BRAND_ACCENT,
        )
        embed.set_author(name=str(user), icon_url=user.display_avatar.url)

        try:
            await log_channel.send(
                content=content,
                embed=embed,
                allowed_mentions=discord.AllowedMentions(roles=True, users=False, everyone=False, replied_user=False),
            )
            logger.info(
                "Order staff notified for service %s in guild %s (role mentioned: %s)",
                service.get("label"),
                guild.id,
                bool(role),
            )
        except Exception as exc:
            logger.error("Failed to notify staff for order in guild %s: %s", guild.id, exc, exc_info=True)


class OrderView(discord.ui.View):
    """View that contains the order select menu."""

    def __init__(self, bot: "Bot") -> None:
        super().__init__(timeout=None)
        self.add_item(OrderSelect(bot))


class Orders(commands.Cog):
    """Cog for posting the order menu (independent order system)."""

    def __init__(self, bot: "Bot") -> None:
        self.bot = bot

    async def cog_load(self) -> None:
        """Log cog load and ensure command is registered."""
        guild = (
            discord.Object(id=self.bot.config.dev_guild_id)
            if getattr(self.bot.config, "dev_guild_id", None)
            else None
        )
        try:
            existing = self.bot.tree.get_command("order-menu", type=discord.AppCommandType.chat_input, guild=guild)
            if existing:
                self.bot.tree.remove_command("order-menu", type=discord.AppCommandType.chat_input, guild=guild)
                logger.info("Removed existing /order-menu before re-registering")
            self.bot.tree.add_command(self.order_menu, guild=guild)
            scope = f"guild {guild.id}" if guild else "global scope"
            logger.info("Registered /order-menu slash command in %s", scope)
        except Exception as exc:
            logger.error("Failed to register /order-menu: %s", exc, exc_info=True)

    @app_commands.command(name="order-menu", description="Post the order dropdown menu (Admin only)")
    @app_commands.default_permissions(administrator=True)
    @app_commands.checks.has_permissions(administrator=True)
    async def order_menu(self, interaction: discord.Interaction) -> None:
        """Post the order embed with dropdown in the current channel."""
        if not interaction.user.guild_permissions.administrator:
            await interaction.response.send_message(
                embed=brand_embed(
                    title="Permission Denied",
                    description="You need administrator permissions to use this command.",
                ),
                ephemeral=True,
            )
            return

        view = OrderView(self.bot)
        embed = brand_embed(
            title="U-Drive Orders",
            description=(
                "Choose a service from the menu below to open an order ticket.\n"
                "A modal form will collect your Roblox username and location."
            ),
            color=BRAND_ACCENT,
        )
        embed.add_field(name="Standard Ride", value="Pickup and drop-off (limo & blackout tiers).", inline=False)
        embed.add_field(name="Getaway Driver", value="Emergency pickup when evading police.", inline=False)
        embed.add_field(name="Transit Services", value="Public transportation (bus services).", inline=False)

        # Send directly to the channel (regular message)
        await interaction.channel.send(embed=embed, view=view)

        # Ephemeral confirmation to the command user
        if interaction.response.is_done():
            await interaction.followup.send("Complete", ephemeral=True)
        else:
            await interaction.response.send_message("Complete", ephemeral=True)

        logger.info("Order menu posted in channel %s by %s", interaction.channel_id, interaction.user.id)


async def setup(bot: "Bot") -> None:
    """Setup function for the Orders cog."""
    await bot.add_cog(Orders(bot))

