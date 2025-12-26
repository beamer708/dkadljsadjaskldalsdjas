"""Logging system for server events."""

import logging
from typing import TYPE_CHECKING, Optional
import discord
from discord.ext import commands

from src.utils.embeds import info_embed, warning_embed, BRAND_PRIMARY

if TYPE_CHECKING:
    from src.bot import Bot

logger = logging.getLogger(__name__)

# Category and channel names
LOGS_CATEGORY_NAME = "Server Logs"
MEMBER_LOGS_CHANNEL_NAME = "member-logs"
MESSAGE_LOGS_CHANNEL_NAME = "message-logs"


class LoggingSystem(commands.Cog):
    """Handles server event logging."""
    
    def __init__(self, bot: "Bot") -> None:
        """Initialize the LoggingSystem cog."""
        self.bot = bot
        self.logs_category_cache: dict[int, Optional[discord.CategoryChannel]] = {}
        self.member_logs_cache: dict[int, Optional[discord.TextChannel]] = {}
        self.message_logs_cache: dict[int, Optional[discord.TextChannel]] = {}
    
    async def get_or_create_logs_category(self, guild: discord.Guild) -> Optional[discord.CategoryChannel]:
        """
        Get or create the Server Logs category.
        
        Args:
            guild: The guild to get/create the category in
            
        Returns:
            The category channel, or None if creation failed
        """
        # Check cache first
        if guild.id in self.logs_category_cache:
            cached = self.logs_category_cache[guild.id]
            if cached and cached in guild.categories:
                return cached
        
        # Try to find existing category
        for category in guild.categories:
            if category.name == LOGS_CATEGORY_NAME:
                self.logs_category_cache[guild.id] = category
                return category
        
        # Create new category if we have permission
        if not guild.me.guild_permissions.manage_channels:
            logger.warning(f"Bot lacks manage_channels permission in {guild.name}. Cannot create logs category.")
            self.logs_category_cache[guild.id] = None
            return None
        
        try:
            category = await guild.create_category(
                LOGS_CATEGORY_NAME,
                reason="Automatic logs category creation"
            )
            self.logs_category_cache[guild.id] = category
            logger.info(f"Created logs category '{LOGS_CATEGORY_NAME}' in {guild.name}")
            return category
        except discord.HTTPException as e:
            logger.error(f"Failed to create logs category in {guild.name}: {e}", exc_info=True)
            self.logs_category_cache[guild.id] = None
            return None
    
    async def get_or_create_logs_channel(
        self,
        guild: discord.Guild,
        channel_name: str,
        cache: dict[int, Optional[discord.TextChannel]]
    ) -> Optional[discord.TextChannel]:
        """
        Get or create a logs channel.
        
        Args:
            guild: The guild to get/create the channel in
            channel_name: Name of the channel to create
            cache: Cache dictionary for the channel type
            
        Returns:
            The text channel, or None if creation failed
        """
        # Check cache first
        if guild.id in cache:
            cached = cache[guild.id]
            if cached and cached in guild.channels:
                return cached
        
        # Try to find existing channel
        for channel in guild.channels:
            if isinstance(channel, discord.TextChannel) and channel.name == channel_name:
                cache[guild.id] = channel
                return channel
        
        # Get or create category
        category = await self.get_or_create_logs_category(guild)
        
        # Create new channel if we have permission
        if not guild.me.guild_permissions.manage_channels:
            logger.warning(f"Bot lacks manage_channels permission in {guild.name}. Cannot create logs channel.")
            cache[guild.id] = None
            return None
        
        try:
            overwrites = {
                guild.default_role: discord.PermissionOverwrite(view_channel=False),
                guild.me: discord.PermissionOverwrite(view_channel=True, send_messages=True)
            }
            
            channel = await guild.create_text_channel(
                channel_name,
                category=category,
                overwrites=overwrites,
                reason="Automatic logs channel creation"
            )
            cache[guild.id] = channel
            logger.info(f"Created logs channel '{channel_name}' in {guild.name}")
            return channel
        except discord.HTTPException as e:
            logger.error(f"Failed to create logs channel '{channel_name}' in {guild.name}: {e}", exc_info=True)
            cache[guild.id] = None
            return None
    
    async def get_member_logs_channel(self, guild: discord.Guild) -> Optional[discord.TextChannel]:
        """Get or create the member-logs channel."""
        return await self.get_or_create_logs_channel(
            guild,
            MEMBER_LOGS_CHANNEL_NAME,
            self.member_logs_cache
        )
    
    async def get_message_logs_channel(self, guild: discord.Guild) -> Optional[discord.TextChannel]:
        """Get or create the message-logs channel."""
        return await self.get_or_create_logs_channel(
            guild,
            MESSAGE_LOGS_CHANNEL_NAME,
            self.message_logs_cache
        )
    
    @commands.Cog.listener()
    async def on_member_join(self, member: discord.Member) -> None:
        """Log when a member joins the server."""
        try:
            channel = await self.get_member_logs_channel(member.guild)
            if channel is None:
                return
            
            # Check permissions
            if not channel.permissions_for(member.guild.me).send_messages:
                return
            
            embed = info_embed(
                title="Member Joined",
                description=f"{member.mention} (`{member.name}`)"
            )
            embed.set_thumbnail(url=member.display_avatar.url)
            embed.add_field(name="User ID", value=f"`{member.id}`", inline=True)
            embed.add_field(
                name="Account Created",
                value=f"<t:{int(member.created_at.timestamp())}:R>",
                inline=True
            )
            embed.add_field(
                name="Member Count",
                value=f"{member.guild.member_count:,}",
                inline=True
            )
            embed.color = BRAND_PRIMARY
            embed.set_footer(text=f"User ID: {member.id}")
            embed.timestamp = discord.utils.utcnow()
            
            await channel.send(embed=embed)
            
        except Exception as e:
            logger.error(f"Failed to log member join for {member}: {e}", exc_info=True)
    
    @commands.Cog.listener()
    async def on_member_remove(self, member: discord.Member) -> None:
        """Log when a member leaves the server."""
        try:
            channel = await self.get_member_logs_channel(member.guild)
            if channel is None:
                return
            
            # Check permissions
            if not channel.permissions_for(member.guild.me).send_messages:
                return
            
            # Get member roles (excluding @everyone)
            roles = [role.mention for role in member.roles if role != member.guild.default_role]
            roles_str = ", ".join(roles) if roles else "None"
            
            embed = warning_embed(
                title="Member Left",
                description=f"{member.mention} (`{member.name}`) left the server"
            )
            embed.set_thumbnail(url=member.display_avatar.url)
            embed.add_field(name="User ID", value=f"`{member.id}`", inline=True)
            embed.add_field(
                name="Roles",
                value=roles_str if len(roles_str) <= 1024 else f"{len(roles)} roles",
                inline=False
            )
            embed.add_field(
                name="Member Count",
                value=f"{member.guild.member_count:,}",
                inline=True
            )
            embed.color = BRAND_PRIMARY
            embed.set_footer(text=f"User ID: {member.id}")
            embed.timestamp = discord.utils.utcnow()
            
            await channel.send(embed=embed)
            
        except Exception as e:
            logger.error(f"Failed to log member leave for {member}: {e}", exc_info=True)
    
    @commands.Cog.listener()
    async def on_message_delete(self, message: discord.Message) -> None:
        """Log when a message is deleted."""
        try:
            # Ignore DMs and bots
            if not message.guild or message.author.bot:
                return
            
            channel = await self.get_message_logs_channel(message.guild)
            if channel is None:
                return
            
            # Check permissions
            if not channel.permissions_for(message.guild.me).send_messages:
                return
            
            # Don't log deletions in the logs channels themselves
            if message.channel.id == channel.id:
                return
            
            embed = warning_embed(
                title="Message Deleted",
                description=f"Message deleted in {message.channel.mention}"
            )
            embed.add_field(
                name="Author",
                value=f"{message.author.mention} (`{message.author.name}`)",
                inline=True
            )
            embed.add_field(name="Channel", value=message.channel.mention, inline=True)
            
            # Add message content if available (truncated if too long)
            if message.content:
                content = message.content[:1024]
                if len(message.content) > 1024:
                    content += "..."
                embed.add_field(name="Content", value=content, inline=False)
            else:
                embed.add_field(name="Content", value="*No text content*", inline=False)
            
            # Add attachment info if any
            if message.attachments:
                attachments = "\n".join([f"- {att.filename} ({att.size} bytes)" for att in message.attachments])
                embed.add_field(name="Attachments", value=attachments[:1024], inline=False)
            
            # Add embed info if any
            if message.embeds:
                embed.add_field(name="Embeds", value=f"{len(message.embeds)} embed(s)", inline=True)
            
            embed.color = BRAND_PRIMARY
            embed.set_footer(text=f"Message ID: {message.id} | User ID: {message.author.id}")
            embed.timestamp = message.created_at
            
            await channel.send(embed=embed)
            
        except Exception as e:
            logger.error(f"Failed to log message deletion: {e}", exc_info=True)


async def setup(bot: "Bot") -> None:
    """Setup function for the LoggingSystem cog."""
    await bot.add_cog(LoggingSystem(bot))

