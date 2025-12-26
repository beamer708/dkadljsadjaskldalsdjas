"""Ping command cog - demonstrates basic slash and prefix commands."""

from typing import TYPE_CHECKING
import discord
from discord.ext import commands
from discord import app_commands

from src.utils.embeds import info_embed

if TYPE_CHECKING:
    from src.bot import Bot


class Ping(commands.Cog):
    """Ping command to check bot latency."""
    
    def __init__(self, bot: "Bot") -> None:
        """Initialize the Ping cog."""
        self.bot = bot
    
    @app_commands.command(name="ping", description="Check the bot's latency")
    async def ping_slash(self, interaction: discord.Interaction) -> None:
        """Slash command to check bot latency."""
        # Calculate latency
        latency = round(self.bot.latency * 1000, 2)
        
        # Create embed response
        embed = info_embed(
            "🏓 Pong!",
            f"Bot latency: **{latency}ms**"
        )
        
        await interaction.response.send_message(embed=embed, ephemeral=False)
    
    @commands.command(name="ping", aliases=["p"])
    async def ping_prefix(self, ctx: commands.Context) -> None:
        """Prefix command to check bot latency."""
        # Calculate latency
        latency = round(self.bot.latency * 1000, 2)
        
        # Create embed response
        embed = info_embed(
            "🏓 Pong!",
            f"Bot latency: **{latency}ms**"
        )
        
        await ctx.send(embed=embed)


async def setup(bot: "Bot") -> None:
    """Setup function for the Ping cog."""
    await bot.add_cog(Ping(bot))

