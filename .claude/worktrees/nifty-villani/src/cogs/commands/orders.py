"""Production-grade ride ticket system using discord.py 2.6+ with Components v2.

Replace BOT_TOKEN, GUILD_ID, and ACTIVE_DRIVER_ROLE_ID before running.
"""

from __future__ import annotations

import asyncio
import logging
import secrets
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
RIDE_SELECT_ID = "ride_select"  # Components v2 deterministic custom_id
CLOSE_TICKET_ID = "close_ticket"  # Components v2 deterministic custom_id
CLAIM_TICKET_ID = "claim_ticket"  # Components v2 deterministic custom_id


def _short_id(length: int = 4) -> str:
    alphabet = "abcdefghijklmnopqrstuvwxyz0123456789"
    # Use secrets for simple non-crypto but deterministic-free ID generation; avoids private discord utils.
    return "".join(secrets.choice(alphabet) for _ in range(length))


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


class TicketActionsView(discord.ui.View):
    """Persistent Components v2 view for claim + close actions."""

    def __init__(self, *, claimed_by: Optional[int] = None) -> None:
        super().__init__(timeout=None)
        self.claimed_by = claimed_by
        # decorator-created buttons exist after __init__; set disabled state accordingly
        self.claim_button.disabled = claimed_by is not None  # type: ignore[attr-defined]

    @discord.ui.button(
        label="Claim Ticket",
        style=discord.ButtonStyle.primary,
        custom_id=CLAIM_TICKET_ID,
    )
    async def claim_button(  # type: ignore[override]
        self, interaction: discord.Interaction, button: discord.ui.Button
    ) -> None:
        if interaction.guild is None or interaction.channel is None or interaction.message is None:
            await interaction.response.send_message("Unable to claim in this context.", ephemeral=True)
            return

        driver_role = interaction.guild.get_role(ACTIVE_DRIVER_ROLE_ID)
        if not (driver_role and driver_role in interaction.user.roles):  # type: ignore[union-attr]
            await interaction.response.send_message(
                "Only Active Drivers can claim tickets.", ephemeral=True
            )
            return

        if self.claimed_by and self.claimed_by != interaction.user.id:
            await interaction.response.send_message(
                f"Already claimed by <@{self.claimed_by}>.", ephemeral=True
            )
            return

        # Mark claimed and lock out other drivers.
        self.claimed_by = interaction.user.id
        self.claim_button.disabled = True

        embed = interaction.message.embeds[0] if interaction.message.embeds else None
        if embed:
            updated = embed.copy()
            # Replace or add Claimed By field.
            updated_fields = []
            claimed_field_written = False
            for field in embed.fields:
                if field.name.lower() == "claimed by":
                    updated_fields.append(
                        ("Claimed By", interaction.user.mention, field.inline)
                    )
                    claimed_field_written = True
                else:
                    updated_fields.append((field.name, field.value, field.inline))
            if not claimed_field_written:
                updated_fields.append(("Claimed By", interaction.user.mention, False))

            updated.clear_fields()
            for name, value, inline in updated_fields:
                updated.add_field(name=name, value=value, inline=inline)
            await interaction.message.edit(embed=updated, view=self)

        # Persist view state for restarts.
        try:
            interaction.client.add_view(self, message_id=interaction.message.id)  # type: ignore[attr-defined]
        except Exception:
            logger.exception("Failed to persist claim view for message %s", interaction.message.id)

        await interaction.response.send_message(f"Ticket claimed by {interaction.user.mention}.", ephemeral=True)

    @discord.ui.button(
        label="Close Ticket",
        style=discord.ButtonStyle.danger,
        custom_id=CLOSE_TICKET_ID,
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

    def __init__(self, ride_key: str, ride_label: str) -> None:
        super().__init__(timeout=None)
        self.ride_key = ride_key
        self.ride_label = ride_label

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
        guild = interaction.guild
        if guild is None:
            await interaction.response.send_message("No guild context; cannot create ticket.", ephemeral=True)
            return

        channel = await create_ticket_channel(guild, interaction.user, self.ride_label)
        if channel is None:
            await interaction.response.send_message("Could not create your ticket channel.", ephemeral=True)
            return

        urgency_raw = self.urgent.value.strip().lower()
        if urgency_raw not in {"yes", "no"}:
            urgency_display = f"Invalid ({self.urgent.value}); treating as No"
            urgency_value = "No"
        else:
            urgency_value = "Yes" if urgency_raw == "yes" else "No"
            urgency_display = urgency_value

        embed = discord.Embed(
            title="Ride Ticket",
            description="Ride request logged.",
            color=discord.Color.dark_embed(),
        )
        embed.add_field(name="Ride Type", value=self.ride_label, inline=True)
        embed.add_field(name="Pickup Location", value=self.pickup_location.value.strip(), inline=False)
        embed.add_field(name="Urgent", value=urgency_display, inline=True)
        embed.add_field(name="Requested By", value=interaction.user.mention, inline=True)
        embed.add_field(name="Claimed By", value="Unclaimed", inline=True)
        embed.timestamp = discord.utils.utcnow()

        role = guild.get_role(ACTIVE_DRIVER_ROLE_ID)
        mention = role.mention if role else ""

        # Components v2: action row (view) sent on the same payload as the embed.
        view = TicketActionsView()
        message = await channel.send(
            content=mention or "Active Driver role not configured.",
            embed=embed,
            view=view,
            allowed_mentions=discord.AllowedMentions(roles=True, users=False, everyone=False),
        )
        # Persist view across restarts.
        try:
            interaction.client.add_view(view, message_id=message.id)  # type: ignore[attr-defined]
        except Exception:
            logger.exception("Failed to persist ticket actions view for message %s", message.id)

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
            custom_id=RIDE_SELECT_ID,
        )

    async def callback(self, interaction: discord.Interaction) -> None:  # type: ignore[override]
        ride_key = self.values[0]
        ride_label = RIDE_TYPES.get(ride_key, "Unknown")

        guild = interaction.guild or interaction.client.get_guild(GUILD_ID)  # type: ignore[attr-defined]
        if guild is None:
            await interaction.response.send_message("Guild context missing.", ephemeral=True)
            return

        # Components v2: a select menu triggers a modal; channel creation happens after modal submission.
        await interaction.response.send_modal(RideDetailsModal(ride_key=ride_key, ride_label=ride_label))


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
        self.bot.add_view(TicketActionsView())

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
            color=discord.Color.dark_embed(),
        )
        embed.add_field(
            name="Ride Type",
            value="Use the dropdown attached to this message.",
            inline=False,
        )

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

