"""Independent order ticket system (separate from support tickets)."""

import asyncio
import logging
import secrets
import string
from typing import TYPE_CHECKING, Optional
import discord
from discord import app_commands
from discord.ext import commands

from src.utils.embeds import brand_embed, BRAND_ACCENT

if TYPE_CHECKING:
    from src.bot import Bot

logger = logging.getLogger(__name__)

ORDER_CATEGORY_NAME = "Orders"
ORDER_STAFF_ROLE_ID: Optional[int] = None  # Set to a role ID if you have a dedicated orders team

SERVICES = {
    "standard": {
        "label": "Standard Ride",
        "description": "Pickup and drop-off (limo & blackout tiers).",
    },
    "getaway": {
        "label": "Getaway Driver",
        "description": "Emergency pickup when evading police.",
    },
    "transit": {
        "label": "Transit Services",
        "description": "Public transportation (bus services).",
    },
}


def _short_id(length: int = 4) -> str:
    alphabet = string.ascii_lowercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


async def ensure_orders_category(guild: discord.Guild) -> Optional[discord.CategoryChannel]:
    """Get or create the Orders category."""
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
    service_label: str,
) -> Optional[discord.TextChannel]:
    """Create a ticket channel for an order."""
    category = await ensure_orders_category(guild)
    if category is None:
        return None

    base_username = user.name.lower().replace(" ", "-")[:16]
    channel_name = f"order-{base_username}-{service_label.lower().replace(' ', '-')}-{_short_id()}"

    overwrites = {
        guild.default_role: discord.PermissionOverwrite(view_channel=False),
        guild.me: discord.PermissionOverwrite(view_channel=True, send_messages=True, read_message_history=True),
    }

    # Allow the user
    overwrites[user] = discord.PermissionOverwrite(
        view_channel=True, send_messages=True, read_message_history=True, attach_files=True
    )

    # Optional staff role
    if ORDER_STAFF_ROLE_ID:
        staff_role = guild.get_role(ORDER_STAFF_ROLE_ID)
        if staff_role:
            overwrites[staff_role] = discord.PermissionOverwrite(
                view_channel=True, send_messages=True, read_message_history=True
            )

    try:
        channel = await guild.create_text_channel(
            channel_name,
            category=category,
            overwrites=overwrites,
            reason=f"Order ticket for {user} ({service_label})",
        )
        logger.info("Created order channel %s for user %s (%s)", channel.id, user.id, service_label)
        return channel
    except discord.Forbidden:
        logger.warning("Missing permissions to create order channel in guild %s", guild.id)
        return None
    except Exception as exc:
        logger.error("Failed to create order channel in guild %s: %s", guild.id, exc, exc_info=True)
        return None


class OrderModal(discord.ui.Modal):
    """Modal to collect order details."""

    def __init__(self, bot: "Bot", service_key: str):
        self.bot = bot
        self.service_key = service_key
        service_label = SERVICES[service_key]["label"]
        super().__init__(title=f"{service_label} Order Form", timeout=300)

        self.roblox_username = discord.ui.TextInput(
            label="Roblox Username", placeholder="Enter your Roblox username", required=True, max_length=100
        )
        self.location = discord.ui.TextInput(
            label="Location",
            style=discord.TextStyle.paragraph,
            placeholder="Where should we meet you?",
            required=True,
            max_length=500,
        )

        self.add_item(self.roblox_username)
        self.add_item(self.location)

    async def on_submit(self, interaction: discord.Interaction) -> None:
        service_label = SERVICES[self.service_key]["label"]
        guild = interaction.guild

        if guild is None:
            await interaction.response.send_message(
                embed=brand_embed(title="Unable to create ticket", description="No guild context available."),
                ephemeral=True,
            )
            return

        channel = await create_order_channel(guild, interaction.user, service_label)
        if channel is None:
            await interaction.response.send_message(
                embed=brand_embed(title="Ticket creation failed", description="I could not create your order ticket."),
                ephemeral=True,
            )
            return

        summary = brand_embed(
            title="Order Ticket Created",
            description=(
                f"**Service:** {service_label}\n"
                f"**Roblox Username:** {self.roblox_username.value}\n"
                f"**Location:** {self.location.value}"
            ),
            color=BRAND_ACCENT,
        )
        summary.set_author(name=str(interaction.user), icon_url=interaction.user.display_avatar.url)

        await channel.send(content=interaction.user.mention, embed=summary)
        await interaction.response.send_message(
            embed=brand_embed(
                title="Order ticket created",
                description=f"Channel: {channel.mention}\nA team member will assist you shortly.",
            ),
            ephemeral=True,
        )
        logger.info(
            "Order modal submitted by %s; ticket channel %s created for %s",
            interaction.user.id,
            channel.id,
            service_label,
        )


class OrderSelect(discord.ui.Select):
    """Select menu for choosing a service."""

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
        modal = OrderModal(self.bot, service_key)
        await interaction.response.send_modal(modal)
        logger.info("Order modal opened for user %s (%s)", interaction.user.id, service_key)


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

        # Send directly to channel (not ephemeral, no followup)
        await interaction.response.send_message(embed=embed, view=view)
        logger.info("Order menu posted in channel %s by %s", interaction.channel_id, interaction.user.id)


async def setup(bot: "Bot") -> None:
    """Setup function for the Orders cog."""
    await bot.add_cog(Orders(bot))

