"""Production-grade ride ticket system using discord.py 2.6+ with Components v2.

Replace BOT_TOKEN, GUILD_ID, and ACTIVE_DRIVER_ROLE_ID before running.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Optional

import discord
from discord import app_commands
from discord.ext import commands

logger = logging.getLogger(__name__)

# --- Deployment constants (replace these) ---
BOT_TOKEN = "MTQ1NDIyMTY4ODI2MTcwNTk3NA.G-aYln.QDYs-wt6my_qgFbWpeQAl1QG8nBctv_v5Kxxyc"
GUILD_ID = 1405537856365137961  # Replace with your guild/server id
ACTIVE_DRIVER_ROLE_ID = 1408456213733314592  # Replace with the Active Driver role id

# --- Ticket configuration ---
ORDER_CATEGORY_NAME = "ride-tickets"
RIDE_TYPES: dict[str, str] = {
    "u_driver": "U-Driver",
    "u_getaway": "U-Getaway Driver",
    "u_transit": "U-Transit",
}


def _short_id(length: int = 4) -> str:
    alphabet = "abcdefghijklmnopqrstuvwxyz0123456789"
    return "".join(discord.utils._random.choice(alphabet) for _ in range(length))


async def ensure_category(guild: discord.Guild) -> Optional[discord.CategoryChannel]:
    """Get or create the category used for ride tickets."""
    for category in guild.categories:
        if category.name.lower() == ORDER_CATEGORY_NAME.lower():
            return category
    if not guild.me.guild_permissions.manage_channels:
        logger.warning("Missing manage_channels; cannot create category in guild %s", guild.id)
        return None
    try:
        return await guild.create_category(ORDER_CATEGORY_NAME, reason="Create ride ticket category")
    except Exception as exc:  # pragma: no cover - discord API failure
        logger.error("Failed to create category in guild %s: %s", guild.id, exc, exc_info=True)
        return None


async def create_ticket_channel(
    guild: discord.Guild, user: discord.User | discord.Member, ride_label: str
) -> Optional[discord.TextChannel]:
    """Create a private ticket channel with enforced overwrites."""
    category = await ensure_category(guild)
    if category is None:
        return None

    channel_name = f"ride-{user.name.lower().replace(' ', '-')[:12]}-{ride_label.lower().replace(' ', '-')}-{_short_id()}"

    overwrites = {
        guild.default_role: discord.PermissionOverwrite(view_channel=False),
        guild.me: discord.PermissionOverwrite(
            view_channel=True,
            send_messages=True,
            read_message_history=True,
            manage_messages=True,
            manage_channels=True,
        ),
        user: discord.PermissionOverwrite(
            view_channel=True, send_messages=True, read_message_history=True, attach_files=True
        ),
    }

    active_driver_role = guild.get_role(ACTIVE_DRIVER_ROLE_ID)
    if active_driver_role:
        overwrites[active_driver_role] = discord.PermissionOverwrite(
            view_channel=True, send_messages=True, read_message_history=True, attach_files=True
        )

    try:
        channel = await guild.create_text_channel(
            name=channel_name,
            category=category,
            overwrites=overwrites,
            reason=f"Ride ticket for {user} ({ride_label})",
        )
        logger.info("Created ride ticket channel %s for user %s", channel.id, user.id)
        return channel
    except discord.Forbidden:
        logger.warning("Missing permissions to create ride ticket in guild %s", guild.id)
        return None
    except Exception as exc:  # pragma: no cover - discord API failure
        logger.error("Failed to create ride ticket in guild %s: %s", guild.id, exc, exc_info=True)
        return None


class CloseTicketView(discord.ui.View):
    """Persistent view with a close button restricted to Active Driver role."""

    def __init__(self) -> None:
        super().__init__(timeout=None)

    @discord.ui.button(
        label="Close Ticket",
        style=discord.ButtonStyle.danger,
        custom_id="close_ticket_button",
    )
    async def close_ticket(  # type: ignore[override]
        self, interaction: discord.Interaction, button: discord.ui.Button
    ) -> None:
        if interaction.guild is None or interaction.channel is None:
            await interaction.response.send_message("Cannot close outside a guild channel.", ephemeral=True)
            return

        driver_role = interaction.guild.get_role(ACTIVE_DRIVER_ROLE_ID)
        has_access = driver_role and driver_role in interaction.user.roles  # type: ignore[union-attr]
        if not has_access:
            await interaction.response.send_message(
                "Only members with the Active Driver role can close tickets.",
                ephemeral=True,
            )
            return

        await interaction.response.send_message("Closing ticket in 5 seconds...", ephemeral=False)
        await asyncio.sleep(5)

        # Delete channel (archive alternative can be implemented here if desired)
        try:
            await interaction.channel.delete(reason=f"Ticket closed by {interaction.user}")
        except discord.Forbidden:
            await interaction.followup.send("I do not have permission to delete this channel.", ephemeral=True)
        except Exception as exc:  # pragma: no cover - discord API failure
            logger.error("Failed to delete ticket channel %s: %s", interaction.channel.id, exc, exc_info=True)
            await interaction.followup.send("Failed to delete the channel.", ephemeral=True)


class RideDetailsModal(discord.ui.Modal, title="Ride Details"):
    """Modal that collects pickup info and urgency."""

    pickup_location: discord.ui.TextInput
    urgent: discord.ui.TextInput

    def __init__(self, ride_label: str, channel_id: int) -> None:
        super().__init__(timeout=None)
        self.ride_label = ride_label
        self.channel_id = channel_id

        self.pickup_location = discord.ui.TextInput(
            label="Pickup location",
            placeholder="Enter pickup address or landmark",
            max_length=200,
            required=True,
            style=discord.TextStyle.short,
        )
        self.urgent = discord.ui.TextInput(
            label="Is this urgent? (Yes/No)",
            placeholder="Yes or No",
            max_length=10,
            required=True,
            style=discord.TextStyle.short,
        )
        self.add_item(self.pickup_location)
        self.add_item(self.urgent)

    async def on_submit(self, interaction: discord.Interaction) -> None:  # type: ignore[override]
        channel = interaction.client.get_channel(self.channel_id)  # type: ignore[attr-defined]
        if not isinstance(channel, discord.TextChannel):
            await interaction.response.send_message(
                "Ticket channel not found. Please try again.", ephemeral=True
            )
            return

        urgency_raw = self.urgent.value.strip().lower()
        if urgency_raw not in {"yes", "no"}:
            # Normalize unexpected input while acknowledging validation.
            urgency_display = f"Invalid ({self.urgent.value}); treating as No"
            urgency_value = "No"
        else:
            urgency_value = "Yes" if urgency_raw == "yes" else "No"
            urgency_display = urgency_value

        embed = discord.Embed(
            title="Ride Ticket",
            description="Ride request captured.",
            color=discord.Color.blurple(),
        )
        embed.add_field(name="Ride Type", value=self.ride_label, inline=True)
        embed.add_field(name="Pickup Location", value=self.pickup_location.value.strip(), inline=False)
        embed.add_field(name="Urgent", value=urgency_display, inline=True)
        embed.add_field(name="Ticket Creator", value=interaction.user.mention, inline=False)
        embed.set_footer(text="Close the ticket when fulfilled.")
        embed.timestamp = discord.utils.utcnow()

        # Components cannot live inside embed fields; attach the view to the message instead.
        await channel.send(embed=embed, view=CloseTicketView())
        await interaction.response.send_message(
            f"Ticket created in {channel.mention}. A driver will assist you shortly.",
            ephemeral=True,
        )


class RideSelect(discord.ui.Select):
    """Select menu for ride type selection."""

    def __init__(self) -> None:
        options = [
            discord.SelectOption(label=label, value=key)
            for key, label in RIDE_TYPES.items()
        ]
        super().__init__(
            placeholder="Choose your ride type",
            min_values=1,
            max_values=1,
            options=options,
            custom_id="ride_type_select",
        )

    async def callback(self, interaction: discord.Interaction) -> None:  # type: ignore[override]
        ride_key = self.values[0]
        ride_label = RIDE_TYPES.get(ride_key, "Unknown")

        guild = interaction.guild or interaction.client.get_guild(GUILD_ID)  # type: ignore[attr-defined]
        if guild is None:
            await interaction.response.send_message("Guild context missing.", ephemeral=True)
            return

        channel = await create_ticket_channel(guild, interaction.user, ride_label)
        if channel is None:
            await interaction.response.send_message(
                "Could not create your ticket. Please contact an admin.", ephemeral=True
            )
            return

        role = guild.get_role(ACTIVE_DRIVER_ROLE_ID)
        mention = role.mention if role else ""
        await channel.send(
            content=mention or "Active Driver role not configured.",
            allowed_mentions=discord.AllowedMentions(roles=True, users=False, everyone=False),
        )

        # Open the modal to collect details right after selection.
        await interaction.response.send_modal(RideDetailsModal(ride_label=ride_label, channel_id=channel.id))


class RidePanelView(discord.ui.View):
    """Persistent view containing the ride selection menu."""

    def __init__(self) -> None:
        super().__init__(timeout=None)
        self.add_item(RideSelect())


class Orders(commands.Cog):
    """Slash command to post the ride ticket panel."""

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    async def cog_load(self) -> None:
        # Register persistent views so components keep working after restarts.
        self.bot.add_view(RidePanelView())
        self.bot.add_view(CloseTicketView())

    @app_commands.command(name="ride-panel", description="Post the ride ticket panel")
    @app_commands.guilds(discord.Object(id=GUILD_ID))
    @app_commands.default_permissions(administrator=True)
    async def ride_panel(self, interaction: discord.Interaction) -> None:
        embed = discord.Embed(
            title="Request a Ride",
            description=(
                "Select your ride type below to open a private ticket.\n"
                "A modal will collect pickup location and urgency."
            ),
            color=discord.Color.blurple(),
        )
        embed.set_footer(text="Components are attached to this message (not embedded fields).")

        view = RidePanelView()
        # Components must live on the message itself; Discord does not permit placing them inside embed fields.
        await interaction.channel.send(embed=embed, view=view)

        if interaction.response.is_done():
            await interaction.followup.send("Ride panel posted.", ephemeral=True)
        else:
            await interaction.response.send_message("Ride panel posted.", ephemeral=True)


async def setup(bot: commands.Bot) -> None:
    """Cog setup entrypoint for dynamic loading."""
    await bot.add_cog(Orders(bot))


# Optional standalone entrypoint for quick deployment.
class TicketBot(commands.Bot):
    def __init__(self) -> None:
        intents = discord.Intents.default()
        intents.guilds = True
        intents.members = True
        super().__init__(command_prefix="!", intents=intents)

    async def setup_hook(self) -> None:
        await self.add_cog(Orders(self))
        await self.tree.sync(guild=discord.Object(id=GUILD_ID))


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    bot = TicketBot()
    bot.run(BOT_TOKEN)

