"""Utility functions for creating Discord embeds using U-Drive branding."""

from typing import Optional
import discord
from discord import Embed

# U-Drive brand palette
BRAND_PRIMARY = discord.Color.from_rgb(244, 246, 251)  # #F4F6FB
BRAND_ACCENT = discord.Color.from_rgb(63, 169, 245)    # #3FA9F5


def brand_embed(title: str, description: str = "", *, color: discord.Color = BRAND_PRIMARY, **kwargs) -> Embed:
    """
    Create a brand-aligned embed.

    Args:
        title: Embed title
        description: Embed description
        color: Border color to use (defaults to U-Drive primary)
        **kwargs: Additional embed kwargs

    Returns:
        Discord Embed object
    """
    return Embed(title=title, description=description, color=color, **kwargs)


def success_embed(title: str, description: str = "", **kwargs) -> Embed:
    """Create a success embed using the primary brand color."""
    return brand_embed(title, description, **kwargs)


def error_embed(title: str, description: str = "", **kwargs) -> Embed:
    """Create an error embed using the primary brand color."""
    return brand_embed(title, description, **kwargs)


def info_embed(title: str, description: str = "", **kwargs) -> Embed:
    """Create an informational embed using the primary brand color."""
    return brand_embed(title, description, **kwargs)


def warning_embed(title: str, description: str = "", **kwargs) -> Embed:
    """Create a warning embed using the primary brand color."""
    return brand_embed(title, description, **kwargs)

