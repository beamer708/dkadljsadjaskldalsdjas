"""Main bot class for the Discord bot."""

import logging
import asyncio
import contextlib
from itertools import cycle
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


def get_prefix(bot: commands.Bot, message: discord.Message) -> str:
    """
    Get command prefix for a message.
    
    Args:
        bot: The bot instance
        message: The message to get prefix for
        
    Returns:
        The command prefix string
    """
    # Access config from bot instance
    if hasattr(bot, 'config') and bot.config:
        return bot.config.prefix
    return "!"  # Fallback default


class Bot(commands.Bot):
    """Main bot class extending discord.py's Bot."""
    
    def __init__(self, config: Config) -> None:
        """Initialize the bot with configuration."""
        self.config = config
        self.status_task: Optional[asyncio.Task] = None
        self._status_messages = cycle(
            [
                (discord.ActivityType.playing, "Smooth Rides Daily"),
                (discord.ActivityType.playing, "Stealthy Rides Guaranteed"),
                (discord.ActivityType.playing, "Safe Public Transit"),
                (discord.ActivityType.playing, "Message for support"),
            ]
        )
        
        # Set up intents
        intents = discord.Intents.default()
        intents.message_content = True  # Required for prefix commands
        intents.members = True  # Useful for member-related commands
        intents.guilds = True
        
        # Initialize bot with prefix and intents
        super().__init__(
            command_prefix=get_prefix,
            intents=intents,
            application_id=config.application_id,
            help_command=None,  # Disable default help command (can be added as cog)
        )
    
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
        if self.status_task:
            self.status_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self.status_task
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

    def start_status_rotation(self) -> None:
        """Start background status rotation if not already running."""
        if self.status_task and not self.status_task.done():
            logger.debug("Status rotation task already running; skipping new start")
            return

        async def _rotate_statuses() -> None:
            """Background loop to rotate bot presence."""
            try:
                while not self.is_closed():
                    activity_type, message = next(self._status_messages)
                    activity = discord.Activity(type=activity_type, name=message)
                    await self.change_presence(activity=activity, status=discord.Status.online)
                    logger.info(
                        "Rotating status set to '%s' (%s)",
                        message,
                        activity_type.name,
                    )
                    await asyncio.sleep(5)
            except asyncio.CancelledError:
                logger.info("Status rotation task cancelled")
                raise
            except Exception as exc:
                logger.error(f"Status rotation task encountered an error: {exc}", exc_info=True)

        self.status_task = asyncio.create_task(_rotate_statuses(), name="status_rotation")
        logger.info("Started rotating status task")


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

