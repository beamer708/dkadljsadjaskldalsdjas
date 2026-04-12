"""Decorators for command permission checks and other utilities.

Note: For slash commands, use app_commands.checks decorators directly.
For prefix commands, use commands.has_permissions or commands.check directly.
These utilities provide convenience wrappers.
"""

from typing import Callable
import discord
from discord.ext import commands
from discord import app_commands


def is_guild_owner() -> Callable:
    """
    Decorator to check if the user is the guild owner (for prefix commands).
    
    Usage:
        @commands.command()
        @is_guild_owner()
        async def my_command(ctx):
            ...
    
    For slash commands, use:
        @app_commands.checks.has_permissions(administrator=True)
        or check manually in the command handler.
    """
    def predicate(ctx: commands.Context) -> bool:
        """Check if user is guild owner."""
        if ctx.guild is None:
            return False
        return ctx.author.id == ctx.guild.owner_id
    
    return commands.check(predicate)


# Note: For app_commands, use app_commands.checks.has_permissions() directly
# For commands, use commands.has_permissions() directly
# Both are already well-implemented in discord.py, so we don't need wrappers here

