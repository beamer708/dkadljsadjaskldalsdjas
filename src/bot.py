"""Main bot class for the Discord bot."""

import logging
import asyncio
from pathlib import Path
from typing import Optional
import discord
from discord.ext import commands

from src.config import Config

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)


class Bot(commands.Bot):
    """Main bot class extending discord.py's Bot."""
    
    def __init__(self, config: Config) -> None:
        """Initialize the bot with configuration."""
        self.config = config
        
        # Set up intents
        intents = discord.Intents.default()
        intents.message_content = True  # Required for prefix commands
        intents.members = True  # Useful for member-related commands
        intents.guilds = True
        
        # Initialize bot with prefix and intents
        super().__init__(
            command_prefix=self._get_prefix,
            intents=intents,
            application_id=config.application_id,
            help_command=None,  # Disable default help command (can be added as cog)
        )
    
    async def _get_prefix(self, message: discord.Message) -> str:
        """Dynamic prefix getter (can be per-guild in the future)."""
        return self.config.prefix
    
    async def setup_hook(self) -> None:
        """Called when the bot is starting up, before on_ready."""
        logger.info("Loading cogs...")
        
        # Load core cogs
        core_path = Path(__file__).parent / "cogs" / "core"
        for cog_file in core_path.glob("*.py"):
            if cog_file.stem != "__init__":
                cog_name = f"src.cogs.core.{cog_file.stem}"
                try:
                    await self.load_extension(cog_name)
                    logger.info(f"Loaded cog: {cog_name}")
                except Exception as e:
                    logger.error(f"Failed to load cog {cog_name}: {e}", exc_info=True)
        
        # Load command cogs
        commands_path = Path(__file__).parent / "cogs" / "commands"
        for cog_file in commands_path.glob("*.py"):
            if cog_file.stem != "__init__":
                cog_name = f"src.cogs.commands.{cog_file.stem}"
                try:
                    await self.load_extension(cog_name)
                    logger.info(f"Loaded cog: {cog_name}")
                except Exception as e:
                    logger.error(f"Failed to load cog {cog_name}: {e}", exc_info=True)
        
        # Sync slash commands
        if self.config.sync_commands:
            logger.info("Syncing slash commands...")
            try:
                if self.config.dev_guild_id:
                    # Sync to dev guild (faster, good for development)
                    guild = discord.Object(id=self.config.dev_guild_id)
                    synced = await self.tree.sync(guild=guild)
                    logger.info(f"Synced {len(synced)} command(s) to dev guild")
                else:
                    # Global sync (takes up to 1 hour to propagate)
                    synced = await self.tree.sync()
                    logger.info(f"Synced {len(synced)} command(s) globally")
            except Exception as e:
                logger.error(f"Failed to sync commands: {e}", exc_info=True)
    
    async def on_connect(self) -> None:
        """Called when the bot connects to Discord."""
        logger.info("Connected to Discord")
    
    async def on_disconnect(self) -> None:
        """Called when the bot disconnects from Discord."""
        logger.warning("Disconnected from Discord")
    
    async def close(self) -> None:
        """Cleanup when bot is shutting down."""
        logger.info("Shutting down bot...")
        await super().close()
    
    async def start(self) -> None:
        """Start the bot with proper error handling."""
        try:
            await super().start(self.config.token)
        except KeyboardInterrupt:
            logger.info("Received keyboard interrupt, shutting down...")
        except Exception as e:
            logger.error(f"Bot crashed: {e}", exc_info=True)
        finally:
            await self.close()


async def main() -> None:
    """Main entry point for the bot."""
    try:
        config = Config()
        bot = Bot(config)
        await bot.start()
    except Exception as e:
        logger.error(f"Failed to start bot: {e}", exc_info=True)


if __name__ == "__main__":
    asyncio.run(main())

