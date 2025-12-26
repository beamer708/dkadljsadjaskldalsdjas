"""Utility functions for creating Discord embeds."""

from typing import Optional
import discord
from discord import Embed


def success_embed(title: str, description: str = "", **kwargs) -> Embed:
    """
    Create a success embed with green color.
    
    Args:
        title: Embed title
        description: Embed description
        **kwargs: Additional embed fields
        
    Returns:
        Discord Embed object
    """
    embed = Embed(title=title, description=description, color=discord.Color.green(), **kwargs)
    return embed


def error_embed(title: str, description: str = "", **kwargs) -> Embed:
    """
    Create an error embed with red color.
    
    Args:
        title: Embed title
        description: Embed description
        **kwargs: Additional embed fields
        
    Returns:
        Discord Embed object
    """
    embed = Embed(title=title, description=description, color=discord.Color.red(), **kwargs)
    return embed


def info_embed(title: str, description: str = "", **kwargs) -> Embed:
    """
    Create an info embed with blue color.
    
    Args:
        title: Embed title
        description: Embed description
        **kwargs: Additional embed fields
        
    Returns:
        Discord Embed object
    """
    embed = Embed(title=title, description=description, color=discord.Color.blue(), **kwargs)
    return embed


def warning_embed(title: str, description: str = "", **kwargs) -> Embed:
    """
    Create a warning embed with orange color.
    
    Args:
        title: Embed title
        description: Embed description
        **kwargs: Additional embed fields
        
    Returns:
        Discord Embed object
    """
    embed = Embed(title=title, description=description, color=discord.Color.orange(), **kwargs)
    return embed

