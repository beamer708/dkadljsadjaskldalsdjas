"""UI builders for structured embeds and component views (Components v2 pattern)."""

from typing import Iterable, Optional
import discord

from src.utils.embeds import brand_embed, BRAND_ACCENT


def sectioned_embed(
    *,
    title: str,
    subtitle: Optional[str] = None,
    action_text: Optional[str] = None,
    fields: Optional[Iterable[tuple[str, str, bool]]] = None,
    color: discord.Color = BRAND_ACCENT,
) -> discord.Embed:
    """
    Create a clean, minimal embed that follows the design sections:
    title -> subtitle -> action prompt -> optional fields.
    """
    description_lines: list[str] = []
    if subtitle:
        description_lines.append(f"**{subtitle}**")
    if action_text:
        description_lines.append(action_text)

    embed = brand_embed(title=title, description="\n".join(description_lines), color=color)
    if fields:
        for name, value, inline in fields:
            embed.add_field(name=name, value=value, inline=inline)
    return embed


def build_order_menu_embed() -> discord.Embed:
    """Embed for the order menu dropdown."""
    return sectioned_embed(
        title="U-Drive Orders",
        subtitle="Choose a service to start",
        action_text="Select an option below to open an order ticket.",
        fields=[
            ("Standard Ride", "Pickup and drop-off (limo & blackout tiers).", False),
            ("Getaway Driver", "Emergency pickup when evading police.", False),
            ("Transit Services", "Public transportation (bus services).", False),
        ],
    )


def build_support_ticket_opened_embed(user: discord.User, service_name: Optional[str] = None) -> discord.Embed:
    """Embed for newly opened support tickets."""
    fields = [
        ("User ID", f"`{user.id}`", True),
        ("Account Created", f"<t:{int(user.created_at.timestamp())}:R>", True),
    ]
    if service_name:
        fields.append(("Service", service_name, True))

    embed = sectioned_embed(
        title="Support Ticket Opened",
        subtitle=str(user),
        action_text="Reply in this channel to message the user. Use the control below to close the ticket.",
        fields=fields,
    )
    embed.set_author(name=str(user), icon_url=user.display_avatar.url)
    embed.timestamp = discord.utils.utcnow()
    return embed


def build_order_details_embed(service_label: str, user: discord.User, details: dict[str, str]) -> discord.Embed:
    """Embed summarizing order details inside a ticket channel."""
    lines = []
    if roblox_username := details.get("roblox_username"):
        lines.append(f"**Roblox Username:** {roblox_username}")
    if location := details.get("location"):
        lines.append(f"**Location:** {location}")
    body = "\n".join(lines) if lines else "No additional details provided."

    embed = sectioned_embed(
        title=f"Order Ticket - {service_label}",
        subtitle=str(user),
        action_text=body,
    )
    embed.set_author(name=str(user), icon_url=user.display_avatar.url)
    embed.timestamp = discord.utils.utcnow()
    return embed


