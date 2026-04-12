"""Welcome system for new members."""

import logging
from typing import TYPE_CHECKING
import discord
from discord.ext import commands

from src.utils.embeds import success_embed

if TYPE_CHECKING:
    from src.bot import Bot

logger = logging.getLogger(__name__)

# Target channel ID for welcome messages
WELCOME_CHANNEL_ID = 1411380862477668372


class Welcome(commands.Cog):
    """Handles welcome messages for new members."""
    
    def __init__(self, bot: "Bot") -> None:
        """Initialize the Welcome cog."""
        self.bot = bot
    
    @commands.Cog.listener()
    async def on_member_join(self, member: discord.Member) -> None:
        """Called when a member joins a guild."""
        try:
            # Get the welcome channel
            channel = self.bot.get_channel(WELCOME_CHANNEL_ID)
            if channel is None:
                # Try fetching if not in cache
                try:
                    channel = await self.bot.fetch_channel(WELCOME_CHANNEL_ID)
                except discord.NotFound:
                    logger.warning(
                        f"Welcome channel {WELCOME_CHANNEL_ID} not found. "
                        f"Skipping welcome message for {member}."
                    )
                    return
                except discord.Forbidden:
                    logger.warning(
                        f"No permission to access welcome channel {WELCOME_CHANNEL_ID}. "
                        f"Skipping welcome message for {member}."
                    )
                    return
            
            # Check if we can send messages to the channel
            if not channel.permissions_for(member.guild.me).send_messages:
                logger.warning(
                    f"Bot lacks permission to send messages in welcome channel {WELCOME_CHANNEL_ID}."
                )
                return
            
            # Create welcome embed
            embed = success_embed(
                title=f"Welcome to {member.guild.name}!",
                description=f"{member.mention} has joined the server!"
            )
            embed.set_thumbnail(url=member.display_avatar.url)
            embed.add_field(
                name="Member Count",
                value=f"{member.guild.member_count:,}",
                inline=True
            )
            embed.add_field(
                name="Account Created",
                value=f"<t:{int(member.created_at.timestamp())}:R>",
                inline=True
            )
            embed.set_footer(text=f"User ID: {member.id}")
            embed.timestamp = discord.utils.utcnow()
            
            # Send welcome message
            await channel.send(embed=embed)
            logger.info(f"Sent welcome message for {member} ({member.id}) in {member.guild.name}")
            
        except discord.HTTPException as e:
            logger.error(f"Failed to send welcome message for {member}: {e}", exc_info=True)
        except Exception as e:
            logger.error(f"Unexpected error in welcome system for {member}: {e}", exc_info=True)


async def setup(bot: "Bot") -> None:
    """Setup function for the Welcome cog."""
    await bot.add_cog(Welcome(bot))

