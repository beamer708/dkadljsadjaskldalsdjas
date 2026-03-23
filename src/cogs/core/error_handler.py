"""Centralized error handling for commands."""

import logging
import traceback
from typing import TYPE_CHECKING
import discord
from discord.ext import commands
from discord import app_commands

from src.utils.embeds import error_embed

if TYPE_CHECKING:
    from src.bot import Bot

logger = logging.getLogger(__name__)


class ErrorHandler(commands.Cog):
    """Handles errors for prefix and slash commands."""
    
    def __init__(self, bot: "Bot") -> None:
        """Initialize the ErrorHandler cog."""
        self.bot = bot
    
    @commands.Cog.listener()
    async def on_command_error(
        self, 
        ctx: commands.Context, 
        error: commands.CommandError
    ) -> None:
        """Handle errors for prefix commands."""
        # Ignore commands that weren't found
        if isinstance(error, commands.CommandNotFound):
            return
        
        # Check if command has its own error handler
        if hasattr(ctx.command, 'on_error'):
            return
        
        # Handle specific errors
        if isinstance(error, commands.MissingRequiredArgument):
            embed = error_embed(
                "Missing Required Argument",
                f"You're missing the `{error.param.name}` argument."
            )
            await ctx.send(embed=embed)
            return
        
        if isinstance(error, commands.MissingPermissions):
            embed = error_embed(
                "Missing Permissions",
                "You don't have permission to use this command."
            )
            await ctx.send(embed=embed)
            return
        
        if isinstance(error, commands.BotMissingPermissions):
            missing = ", ".join(error.missing_permissions)
            embed = error_embed(
                "Bot Missing Permissions",
                f"I need the following permissions: {missing}"
            )
            await ctx.send(embed=embed)
            return
        
        if isinstance(error, commands.CommandOnCooldown):
            embed = error_embed(
                "Command on Cooldown",
                f"Please wait {error.retry_after:.2f} seconds before using this command again."
            )
            await ctx.send(embed=embed)
            return
        
        if isinstance(error, commands.GuildNotFound):
            embed = error_embed("Guild Not Found", "The specified guild could not be found.")
            await ctx.send(embed=embed)
            return
        
        if isinstance(error, commands.MemberNotFound):
            embed = error_embed("Member Not Found", "The specified member could not be found.")
            await ctx.send(embed=embed)
            return
        
        # Log unexpected errors
        logger.error(f"Unexpected error in command {ctx.command}: {error}", exc_info=error)
        embed = error_embed(
            "An Error Occurred",
            "An unexpected error occurred. Please try again later."
        )
        await ctx.send(embed=embed)
    
    @commands.Cog.listener()
    async def on_app_command_error(
        self,
        interaction: discord.Interaction,
        error: app_commands.AppCommandError
    ) -> None:
        """Handle errors for slash commands."""
        # Handle command on cooldown
        if isinstance(error, app_commands.CommandOnCooldown):
            embed = error_embed(
                "Command on Cooldown",
                f"Please wait {error.retry_after:.2f} seconds before using this command again."
            )
            if interaction.response.is_done():
                await interaction.followup.send(embed=embed, ephemeral=True)
            else:
                await interaction.response.send_message(embed=embed, ephemeral=True)
            return
        
        # Handle missing permissions
        if isinstance(error, app_commands.MissingPermissions):
            embed = error_embed(
                "Missing Permissions",
                "You don't have permission to use this command."
            )
            if interaction.response.is_done():
                await interaction.followup.send(embed=embed, ephemeral=True)
            else:
                await interaction.response.send_message(embed=embed, ephemeral=True)
            return
        
        # Handle bot missing permissions
        if isinstance(error, app_commands.BotMissingPermissions):
            missing = ", ".join(error.missing_permissions)
            embed = error_embed(
                "Bot Missing Permissions",
                f"I need the following permissions: {missing}"
            )
            if interaction.response.is_done():
                await interaction.followup.send(embed=embed, ephemeral=True)
            else:
                await interaction.response.send_message(embed=embed, ephemeral=True)
            return
        
        # Handle command not found
        if isinstance(error, app_commands.CommandNotFound):
            return
        
        # Log unexpected errors
        logger.error(f"Unexpected error in app command: {error}", exc_info=error)
        embed = error_embed(
            "An Error Occurred",
            "An unexpected error occurred. Please try again later."
        )
        
        try:
            if interaction.response.is_done():
                await interaction.followup.send(embed=embed, ephemeral=True)
            else:
                await interaction.response.send_message(embed=embed, ephemeral=True)
        except discord.HTTPException:
            logger.error("Failed to send error message to user")


async def setup(bot: "Bot") -> None:
    """Setup function for the ErrorHandler cog."""
    await bot.add_cog(ErrorHandler(bot))

