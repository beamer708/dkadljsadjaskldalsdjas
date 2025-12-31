"""Independent order ticket system using server channels (separate from support)."""

import asyncio
import logging
from typing import TYPE_CHECKING, Optional
import discord
from discord import app_commands
from discord.ext import commands

from src.utils.embeds import brand_embed, BRAND_ACCENT
from src.utils.ui import build_order_menu_embed, build_order_details_embed

if TYPE_CHECKING:
    from src.bot import Bot

logger = logging.getLogger(__name__)

ORDER_CATEGORY_NAME = "Orders"
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


def _short_id(length: int = 4) -> str:
    alphabet = "abcdefghijklmnopqrstuvwxyz0123456789"
    return "".join(discord.utils._random.choice(alphabet) for _ in range(length))


async def ensure_orders_category(guild: discord.Guild) -> Optional[discord.CategoryChannel]:
    """Get or create the Orders category (server channels)."""
    for category in guild.categories:
        if category.name == ORDER_CATEGORY_NAME:
            return category
    if not guild.me.guild_permissions.manage_channels:
        logger.warning("Missing manage_channels in %s; cannot create Orders category.", guild.id)
        return None
    try:
        category = await guild.create_category(ORDER_CATEGORY_NAME, reason="Create Orders category")
        logger.info("Created Orders category in guild %s", guild.id)
        return category
    except Exception as exc:
        logger.error("Failed to create Orders category in guild %s: %s", guild.id, exc, exc_info=True)
        return None


async def create_order_channel(
    guild: discord.Guild,
    user: discord.User,
    service: dict,
) -> Optional[discord.TextChannel]:
    """Create a server ticket channel for an order."""
    category = await ensure_orders_category(guild)
    if category is None:
        return None

    base_username = user.name.lower().replace(" ", "-")[:16]
    service_slug = service["label"].lower().replace(" ", "-")
    channel_name = f"order-{base_username}-{service_slug}-{_short_id()}"

    overwrites = {
        guild.default_role: discord.PermissionOverwrite(view_channel=False),
        guild.me: discord.PermissionOverwrite(
            view_channel=True, send_messages=True, read_message_history=True, manage_messages=True
        ),
        user: discord.PermissionOverwrite(
            view_channel=True, send_messages=True, read_message_history=True, attach_files=True
        ),
    }

    role = guild.get_role(service["role_id"])
    if role:
        overwrites[role] = discord.PermissionOverwrite(
            view_channel=True, send_messages=True, read_message_history=True
        )

    # Allow admins to see if they have administrator
    for r in guild.roles:
        if r.permissions.administrator:
            overwrites.setdefault(
                r,
                discord.PermissionOverwrite(
                    view_channel=True, send_messages=True, read_message_history=True, manage_messages=True
                ),
            )

    try:
        channel = await guild.create_text_channel(
            channel_name,
            category=category,
            overwrites=overwrites,
            reason=f"Order ticket for {user} ({service['label']})",
        )
        logger.info("Created order channel %s for user %s (%s)", channel.id, user.id, service["label"])
        return channel
    except discord.Forbidden:
        logger.warning("Missing permissions to create order channel in guild %s", guild.id)
        return None
    except Exception as exc:
        logger.error("Failed to create order channel in guild %s: %s", guild.id, exc, exc_info=True)
        return None


class OrderSelect(discord.ui.Select):
    """Select menu for choosing a service; creates server ticket channel."""

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
        await self.handle_selection(interaction, service_key)
        logger.info("Order selection by user %s (%s)", interaction.user.id, service_key)

    async def handle_selection(self, interaction: discord.Interaction, service_key: str) -> None:
        service = SERVICES.get(service_key)
        if service is None:
            await interaction.response.send_message(
                embed=brand_embed(title="Invalid selection", description="That service is not available."),
                ephemeral=True,
            )
            return

        guild = interaction.guild
        if guild is None and getattr(self.bot.config, "dev_guild_id", None):
            guild = self.bot.get_guild(self.bot.config.dev_guild_id)
        if guild is None:
            await interaction.response.send_message(
                embed=brand_embed(title="Error", description="No guild context available."), ephemeral=True
            )
            return

        user = interaction.user

        # Prevent duplicate active orders per user
        if user.id in self.bot.get_cog("Orders").active_orders:  # type: ignore[attr-defined]
            existing_id = self.bot.get_cog("Orders").active_orders[user.id]  # type: ignore[attr-defined]
            await interaction.response.send_message(
                embed=brand_embed(
                    title="Order Already Open",
                    description=f"You already have an open order: <#{existing_id}>",
                ),
                ephemeral=True,
            )
            return

        channel = await create_order_channel(guild, user, service)
        if channel is None:
            await interaction.response.send_message(
                embed=brand_embed(title="Ticket creation failed", description="Could not create your order ticket."),
                ephemeral=True,
            )
            return

        # Track active order
        self.bot.get_cog("Orders").active_orders[user.id] = channel.id  # type: ignore[attr-defined]

        # Ask for details inside the ticket channel
        await self.ask_for_details(channel, user, service)

        # Ack the interaction
        if interaction.response.is_done():
            await interaction.followup.send("Order ticket created", ephemeral=True)
        else:
            await interaction.response.send_message("Order ticket created", ephemeral=True)

    async def ask_for_details(self, channel: discord.TextChannel, user: discord.User, service: dict) -> None:
        role = channel.guild.get_role(service.get("role_id"))
        mention = role.mention if role else "Order ticket created"
        if role is None:
            logger.warning("Service role missing for %s in guild %s", service.get("label"), channel.guild.id)

        prompt = brand_embed(
            title=f"{service['label']} Order Intake",
            description="Please provide the following details:",
            color=BRAND_ACCENT,
        )
        prompt.add_field(name="1) Roblox Username", value="Reply with your Roblox username.", inline=False)
        prompt.add_field(name="2) Location", value="Reply with your location.", inline=False)
        prompt.set_footer(text="Please answer in this channel.")

        await channel.send(
            content=mention,
            embed=prompt,
            allowed_mentions=discord.AllowedMentions(roles=True, users=False, everyone=False, replied_user=False),
        )

        roblox_username = await self.wait_for_response(channel, user, "Roblox Username", timeout=300)
        if roblox_username is None:
            await channel.send(embed=brand_embed(title="Timed Out", description="No response received."))
            self.cleanup_active(user.id)
            return

        location = await self.wait_for_response(channel, user, "Location", timeout=300)
        if location is None:
            await channel.send(embed=brand_embed(title="Timed Out", description="No response received."))
            self.cleanup_active(user.id)
            return

        summary = brand_embed(
            title="Order Ticket Summary",
            description=(
                f"**Service:** {service['label']}\n"
                f"**User:** {user.mention} (`{user.id}`)\n"
                f"**Roblox Username:** {roblox_username}\n"
                f"**Location:** {location}"
            ),
            color=BRAND_ACCENT,
        )
        summary.set_author(name=str(user), icon_url=user.display_avatar.url)
        summary.timestamp = discord.utils.utcnow()

        await channel.send(
            content=mention,
            embed=summary,
            allowed_mentions=discord.AllowedMentions(roles=True, users=False, everyone=False, replied_user=False),
        )
        logger.info(
            "Order channel %s finalized for user %s (%s)",
            channel.id,
            user.id,
            service.get("label"),
        )
        self.cleanup_active(user.id)

    async def wait_for_response(
        self,
        channel: discord.TextChannel,
        user: discord.User,
        field: str,
        timeout: float = 300.0,
    ) -> Optional[str]:
        def check(msg: discord.Message) -> bool:
            return msg.channel.id == channel.id and msg.author.id == user.id

        try:
            msg = await self.bot.wait_for("message", check=check, timeout=timeout)
            return msg.content.strip()
        except asyncio.TimeoutError:
            return None
        except Exception as exc:
            logger.error("Error collecting %s from user %s: %s", field, user.id, exc, exc_info=True)
            return None

    def cleanup_active(self, user_id: int) -> None:
        orders_cog = self.bot.get_cog("Orders")
        if orders_cog and hasattr(orders_cog, "active_orders"):
            orders_cog.active_orders.pop(user_id, None)


class OrderView(discord.ui.View):
    """View that contains the order select menu."""

    def __init__(self, bot: "Bot") -> None:
        super().__init__(timeout=None)
        self.add_item(OrderSelect(bot))


class Orders(commands.Cog):
    """Cog for posting the order menu (independent order system)."""

    def __init__(self, bot: "Bot") -> None:
        self.bot = bot
        self.active_orders: dict[int, int] = {}  # user_id -> channel_id

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
        try:
            self.bot.add_view(OrderView(self.bot))
            logger.info("Registered persistent OrderView (Components v2)")
        except Exception as exc:
            logger.error("Failed to register persistent OrderView: %s", exc, exc_info=True)

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
        embed = build_order_menu_embed()

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

