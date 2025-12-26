"""Core event handlers for the bot."""

import logging
from typing import TYPE_CHECKING
import discord
from discord.ext import commands

if TYPE_CHECKING:
    from src.bot import Bot

logger = logging.getLogger(__name__)


class Events(commands.Cog):
    """Handles core bot events."""
    
    def __init__(self, bot: "Bot") -> None:
        """Initialize the Events cog."""
        self.bot = bot
    
    @commands.Cog.listener()
    async def on_ready(self) -> None:
        """Called when the bot is ready."""
        assert self.bot.user is not None
        logger.info(f"{self.bot.user.name} is ready!")
        logger.info(f"Bot ID: {self.bot.user.id}")
        logger.info(f"Discord.py version: {discord.__version__}")
        logger.info(f"Connected to {len(self.bot.guilds)} guild(s)")
        logger.info(f"Bot is visible to {len(self.bot.users)} user(s)")
        
        # Set bot presence
        activity = discord.Game(name=f"{self.bot.config.prefix}help")
        await self.bot.change_presence(activity=activity, status=discord.Status.online)
    
    @commands.Cog.listener()
    async def on_guild_join(self, guild: discord.Guild) -> None:
        """Called when the bot joins a new guild."""
        logger.info(f"Joined guild: {guild.name} (ID: {guild.id})")
    
    @commands.Cog.listener()
    async def on_guild_remove(self, guild: discord.Guild) -> None:
        """Called when the bot leaves a guild."""
        logger.info(f"Left guild: {guild.name} (ID: {guild.id})")


async def setup(bot: "Bot") -> None:
    """Setup function for the Events cog."""
    await bot.add_cog(Events(bot))

