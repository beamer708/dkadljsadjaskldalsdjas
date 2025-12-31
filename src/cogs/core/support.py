"""DM-based customer support ticket system for U-Drive."""

import json
import logging
import secrets
import string
from datetime import datetime
from pathlib import Path
from typing import TYPE_CHECKING, Optional, Dict
import discord
from discord.ext import commands
from discord import app_commands
from src.utils.embeds import brand_embed, BRAND_PRIMARY
from src.utils.ui import build_support_ticket_opened_embed, build_order_details_embed

if TYPE_CHECKING:
    from src.bot import Bot

logger = logging.getLogger(__name__)

# Configuration constants
SUPPORT_CATEGORY_NAME = "Support Tickets"
TICKETS_FILE = Path(__file__).parent.parent.parent.parent / "tickets.json"
TICKET_PREFIX = "support"
SHORT_ID_LENGTH = 6
SUPPORT_STAFF_ROLE_ID = 1454227177615655034  # Role ID for staff who can close tickets
TRANSCRIPTS_DIR = Path(__file__).parent.parent.parent.parent / "transcripts"
SUPPORT_CLOSE_CUSTOM_ID = "support_close_ticket"


class CloseTicketView(discord.ui.View):
    """Persistent view that allows staff to close tickets via button."""

    def __init__(self, support: "Support") -> None:
        super().__init__(timeout=None)
        self.support = support

    @discord.ui.button(
        label="Close Ticket",
        style=discord.ButtonStyle.danger,
        custom_id=SUPPORT_CLOSE_CUSTOM_ID,
        emoji="🛑",
    )
    async def close_ticket_button(
        self, interaction: discord.Interaction, button: discord.ui.Button
    ) -> None:
        logger.info(
            "Close-ticket button invoked in channel %s by user %s",
            interaction.channel_id,
            interaction.user.id if interaction.user else "unknown",
        )
        try:
            await interaction.response.defer(ephemeral=True)
        except Exception as exc:
            logger.error("Failed to defer close-ticket interaction: %s", exc, exc_info=True)
            return

        if not interaction.guild or not isinstance(interaction.user, discord.Member):
            embed = self.support.create_brand_embed(
                title="Invalid Context",
                description="Use this button inside a support ticket channel.",
            )
            await interaction.followup.send(embed=embed, ephemeral=True)
            return

        staff_role = interaction.guild.get_role(SUPPORT_STAFF_ROLE_ID)
        if not staff_role or staff_role not in interaction.user.roles:
            embed = self.support.create_brand_embed(
                title="Permission Denied",
                description="You need the support staff role to close tickets.",
            )
            await interaction.followup.send(embed=embed, ephemeral=True)
            return

        channel = interaction.channel
        if not isinstance(channel, discord.TextChannel):
            embed = self.support.create_brand_embed(
                title="Error",
                description="This channel is not a support ticket.",
            )
            await interaction.followup.send(embed=embed, ephemeral=True)
            return

        try:
            await self.support.close_ticket(interaction, channel, interaction.user)
        except Exception as exc:
            logger.error(
                "Error handling close-ticket button in channel %s: %s",
                channel.id,
                exc,
                exc_info=True,
            )
            await interaction.followup.send(
                embed=self.support.create_brand_embed(
                    title="Error",
                    description="Could not close this ticket. Try again or use /close.",
                ),
                ephemeral=True,
            )

class Support(commands.Cog):
    """Handles DM-based support tickets for U-Drive customer support."""
    
    def __init__(self, bot: "Bot") -> None:
        """Initialize the Support cog."""
        self.bot = bot
        self.tickets: Dict[int, int] = {}  # user_id -> channel_id
        self.channel_to_user: Dict[int, int] = {}  # channel_id -> user_id
        self.closing_channels: set[int] = set()  # Track channels being closed to prevent duplicates
        self.channel_service: Dict[int, str] = {}  # channel_id -> service name
        # Ensure transcripts directory exists
        TRANSCRIPTS_DIR.mkdir(exist_ok=True)
        self.load_tickets()

    async def cog_load(self) -> None:
        """Register the slash command and log load events."""
        guild = discord.Object(id=self.bot.config.dev_guild_id) if self.bot.config.dev_guild_id else None

        # Remove any stale registration to avoid duplicates
        try:
            existing = self.bot.tree.get_command("close", type=discord.AppCommandType.chat_input, guild=guild)
            if existing:
                self.bot.tree.remove_command("close", type=discord.AppCommandType.chat_input, guild=guild)
                logger.info("Removed existing /close command before re-registering")
        except Exception as exc:  # Defensive logging only
            logger.warning(f"Failed to check/remove existing /close command: {exc}", exc_info=True)

        try:
            self.bot.tree.add_command(self.close_command, guild=guild)
            scope = f"guild {guild.id}" if guild else "global scope"
            logger.info(f"Registered /close slash command in {scope}")
        except Exception as exc:
            logger.error(f"Failed to register /close command: {exc}", exc_info=True)

        try:
            self.bot.add_view(CloseTicketView(self))
            logger.info("Registered persistent CloseTicketView (Components v2)")
        except Exception as exc:
            logger.error("Failed to register persistent CloseTicketView: %s", exc, exc_info=True)

        logger.info("Support cog loaded")

    async def cog_unload(self) -> None:
        """Cleanup command registration when the cog is unloaded."""
        guild = discord.Object(id=self.bot.config.dev_guild_id) if self.bot.config.dev_guild_id else None
        try:
            removed = self.bot.tree.remove_command("close", type=discord.AppCommandType.chat_input, guild=guild)
            if removed:
                logger.info("Unregistered /close slash command during cog unload")
        except Exception as exc:
            logger.warning(f"Failed to unregister /close command: {exc}", exc_info=True)
    
    def load_tickets(self) -> None:
        """Load ticket mappings from file."""
        try:
            if TICKETS_FILE.exists():
                with open(TICKETS_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.tickets = {int(k): int(v) for k, v in data.get("tickets", {}).items()}
                    self.channel_to_user = {int(k): int(v) for k, v in data.get("channel_to_user", {}).items()}
                    self.channel_service = {int(k): v for k, v in data.get("channel_service", {}).items()}
                logger.info(f"Loaded {len(self.tickets)} ticket(s) from storage")
        except Exception as e:
            logger.error(f"Failed to load tickets: {e}", exc_info=True)
            self.tickets = {}
            self.channel_to_user = {}
            self.channel_service = {}
    
    def save_tickets(self) -> None:
        """Save ticket mappings to file."""
        try:
            data = {
                "tickets": {str(k): str(v) for k, v in self.tickets.items()},
                "channel_to_user": {str(k): str(v) for k, v in self.channel_to_user.items()},
                "channel_service": {str(k): v for k, v in self.channel_service.items()},
            }
            with open(TICKETS_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save tickets: {e}", exc_info=True)
    
    def generate_short_id(self) -> str:
        """Generate a short random ID for ticket channel naming."""
        alphabet = string.ascii_lowercase + string.digits
        return ''.join(secrets.choice(alphabet) for _ in range(SHORT_ID_LENGTH))
    
    async def get_support_category(self, guild: discord.Guild) -> Optional[discord.CategoryChannel]:
        """
        Get or create the support tickets category.
        
        Args:
            guild: The guild to get/create the category in
            
        Returns:
            The category channel, or None if creation failed
        """
        # Try to find existing category
        for category in guild.categories:
            if category.name == SUPPORT_CATEGORY_NAME:
                return category
        
        # Create new category if we have permission
        if not guild.me.guild_permissions.manage_channels:
            logger.warning(f"Bot lacks manage_channels permission in {guild.name}. Cannot create support category.")
            return None
        
        try:
            category = await guild.create_category(
                SUPPORT_CATEGORY_NAME,
                reason="Auto-create support tickets category"
            )
            logger.info(f"Created support category '{SUPPORT_CATEGORY_NAME}' in {guild.name}")
            return category
        except discord.HTTPException as e:
            logger.error(f"Failed to create support category in {guild.name}: {e}", exc_info=True)
            return None
    
    async def get_staff_roles(self, guild: discord.Guild) -> list[discord.Role]:
        """
        Get staff roles from the guild.
        For now, returns roles with 'admin' or 'staff' in the name (case-insensitive).
        Can be extended to use config-based role IDs.
        
        Args:
            guild: The guild to get staff roles from
            
        Returns:
            List of staff roles
        """
        staff_roles = []
        for role in guild.roles:
            role_name_lower = role.name.lower()
            if any(keyword in role_name_lower for keyword in ['admin', 'staff', 'mod', 'moderator']):
                staff_roles.append(role)
        return staff_roles
    
    async def create_ticket_channel(
        self,
        guild: discord.Guild,
        user: discord.User
    ) -> Optional[discord.TextChannel]:
        """
        Create a support ticket channel for a user.
        
        Args:
            guild: The guild to create the channel in
            user: The user who opened the ticket
            
        Returns:
            The created channel, or None if creation failed
        """
        # Check permissions
        if not guild.me.guild_permissions.manage_channels:
            logger.warning(f"Bot lacks manage_channels permission in {guild.name}. Cannot create ticket channel.")
            return None
        
        # Get or create category
        category = await self.get_support_category(guild)
        if category is None:
            logger.error(f"Failed to get/create support category in {guild.name}")
            return None
        
        # Generate channel name
        username_clean = user.name.lower().replace(' ', '-')[:20]  # Clean and truncate
        short_id = self.generate_short_id()
        channel_name = f"{TICKET_PREFIX}-{username_clean}-{short_id}"
        
        # Set up permissions
        overwrites = {
            guild.default_role: discord.PermissionOverwrite(view_channel=False),
            guild.me: discord.PermissionOverwrite(
                view_channel=True,
                send_messages=True,
                read_message_history=True,
                manage_messages=True
            )
        }
        
        # Add staff roles
        staff_roles = await self.get_staff_roles(guild)
        for role in staff_roles:
            overwrites[role] = discord.PermissionOverwrite(
                view_channel=True,
                send_messages=True,
                read_message_history=True
            )
        
        try:
            channel = await guild.create_text_channel(
                channel_name,
                category=category,
                overwrites=overwrites,
                reason=f"Support ticket created for {user} (ID: {user.id})"
            )
            logger.info(f"Created support ticket channel {channel.name} for user {user} (ID: {user.id})")
            return channel
        except discord.HTTPException as e:
            logger.error(f"Failed to create ticket channel in {guild.name}: {e}", exc_info=True)
            return None
    
    def create_brand_embed(self, title: str, description: str = "") -> discord.Embed:
        """Create an embed using U-Drive primary brand color."""
        return brand_embed(title=title, description=description, color=BRAND_PRIMARY)
    
    async def get_or_create_staff_log_channel(self, guild: discord.Guild) -> Optional[discord.TextChannel]:
        """
        Get or create the staff log channel for ticket closures.
        
        Args:
            guild: The guild to get/create the channel in
            
        Returns:
            The text channel, or None if creation failed
        """
        channel_name = "ticket-logs"
        
        # Try to find existing channel
        for channel in guild.channels:
            if isinstance(channel, discord.TextChannel) and channel.name == channel_name:
                return channel
        
        # Get or create support category
        category = await self.get_support_category(guild)
        
        # Create new channel if we have permission
        if not guild.me.guild_permissions.manage_channels:
            logger.warning(f"Bot lacks manage_channels permission in {guild.name}. Cannot create staff log channel.")
            return None
        
        try:
            overwrites = {
                guild.default_role: discord.PermissionOverwrite(view_channel=False),
                guild.me: discord.PermissionOverwrite(view_channel=True, send_messages=True)
            }
            
            # Add staff role
            staff_role = guild.get_role(SUPPORT_STAFF_ROLE_ID)
            if staff_role:
                overwrites[staff_role] = discord.PermissionOverwrite(
                    view_channel=True,
                    send_messages=True,
                    read_message_history=True
                )
            
            channel = await guild.create_text_channel(
                channel_name,
                category=category,
                overwrites=overwrites,
                reason="Auto-create ticket logs channel"
            )
            logger.info(f"Created staff log channel '{channel_name}' in {guild.name}")
            return channel
        except discord.HTTPException as e:
            logger.error(f"Failed to create staff log channel in {guild.name}: {e}", exc_info=True)
            return None
    
    async def generate_transcript(self, channel: discord.TextChannel) -> Optional[Path]:
        """
        Generate a transcript of all messages in the ticket channel.
        
        Args:
            channel: The ticket channel to generate transcript for
            
        Returns:
            Path to the transcript file, or None if generation failed
        """
        try:
            # Get channel name and extract username
            channel_name = channel.name
            transcript_filename = f"{channel_name}.txt"
            transcript_path = TRANSCRIPTS_DIR / transcript_filename
            
            # Fetch all messages (oldest first)
            messages = []
            async for message in channel.history(limit=None, oldest_first=True):
                messages.append(message)
            
            # Generate transcript content
            transcript_lines = [
                f"{'='*60}",
                f"U-Drive Support Ticket Transcript",
                f"Channel: {channel_name}",
                f"Channel ID: {channel.id}",
                f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}",
                f"{'='*60}",
                ""
            ]
            
            for message in messages:
                # Format timestamp
                timestamp = message.created_at.strftime('%Y-%m-%d %H:%M:%S UTC')
                
                # Format author
                if message.author.bot:
                    author_str = f"[BOT] {message.author.name} ({message.author.id})"
                else:
                    author_str = f"{message.author.name} ({message.author.id})"
                
                # Add message header
                transcript_lines.append(f"[{timestamp}] {author_str}")
                
                # Add message content
                if message.content:
                    transcript_lines.append(f"Content: {message.content}")
                else:
                    transcript_lines.append("Content: [No text content]")
                
                # Add attachments
                if message.attachments:
                    transcript_lines.append("Attachments:")
                    for att in message.attachments:
                        transcript_lines.append(f"  - {att.filename}: {att.url} ({att.size} bytes)")
                
                # Add embeds info
                if message.embeds:
                    transcript_lines.append(f"Embeds: {len(message.embeds)} embed(s)")
                
                transcript_lines.append("")  # Empty line between messages
            
            # Write transcript to file
            transcript_content = "\n".join(transcript_lines)
            with open(transcript_path, "w", encoding="utf-8") as f:
                f.write(transcript_content)
            
            logger.info(f"Generated transcript for channel {channel.name} ({channel.id})")
            return transcript_path
        except Exception as e:
            logger.error(f"Failed to generate transcript for channel {channel.id}: {e}", exc_info=True)
            return None
    
    async def send_ticket_opened_message(
        self,
        channel: discord.TextChannel,
        user: discord.User,
        service_name: Optional[str] = None
    ) -> None:
        """Send the initial ticket message in the channel."""
        try:
            # Ping staff role above the embed so the notification is seen first
            staff_role = channel.guild.get_role(SUPPORT_STAFF_ROLE_ID) if channel.guild else None
            if staff_role:
                try:
                    await channel.send(
                        content=staff_role.mention,
                        allowed_mentions=discord.AllowedMentions(
                            roles=True, users=False, everyone=False, replied_user=False
                        ),
                    )
                except discord.Forbidden:
                    logger.warning(
                        "Missing permission to mention staff role %s in channel %s",
                        SUPPORT_STAFF_ROLE_ID,
                        channel.id,
                    )
                except Exception as exc:
                    logger.error(
                        "Failed to ping staff role %s in channel %s: %s",
                        SUPPORT_STAFF_ROLE_ID,
                        channel.id,
                        exc,
                        exc_info=True,
                    )
            else:
                logger.warning("Staff role %s not found in guild %s", SUPPORT_STAFF_ROLE_ID, channel.guild.id if channel.guild else "unknown")

            embed = build_support_ticket_opened_embed(user, service_name)
            view = CloseTicketView(self)
            await channel.send(embed=embed, view=view)
            logger.info("Attached CloseTicketView to support channel %s", channel.id)
        except Exception as e:
            logger.error(f"Failed to send ticket opened message: {e}", exc_info=True)
    
    async def send_user_confirmation(
        self,
        user: discord.User,
        channel: discord.TextChannel,
        service_name: Optional[str] = None
    ) -> None:
        """Send confirmation DM to the user that their ticket was created."""
        try:
            embed = self.create_brand_embed(
                title="Support Ticket Opened",
                description=(
                    "Thank you for contacting U-Drive support!\n\n"
                    "Your message has been received and a support ticket has been created. "
                    "Our support team will respond to you as soon as possible.\n\n"
                    f"**Ticket ID:** `{channel.name}`\n"
                    "You can continue messaging me here, and all your messages will be forwarded to our support team."
                )
            )
            if service_name:
                embed.add_field(name="Service", value=service_name, inline=False)
            embed.set_footer(text="U-Drive Support")
            embed.timestamp = discord.utils.utcnow()
            
            await user.send(embed=embed)
            logger.info(f"Sent ticket confirmation to user {user} (ID: {user.id})")
        except discord.Forbidden:
            logger.warning(f"Cannot send DM to user {user} (ID: {user.id}) - DMs may be disabled")
        except Exception as e:
            logger.error(f"Failed to send confirmation to user {user}: {e}", exc_info=True)
    
    @commands.Cog.listener()
    async def on_message(self, message: discord.Message) -> None:
        """Handle incoming messages for DM intake and ticket channel replies."""
        # Ignore bot messages
        if message.author.bot:
            return
        
        # Handle DMs (ticket creation and message relay)
        if isinstance(message.channel, discord.DMChannel):
            await self.handle_dm(message)
        # Handle messages in ticket channels (staff replies)
        elif isinstance(message.channel, discord.TextChannel) and message.guild:
            await self.handle_ticket_channel_message(message)
    
    async def handle_dm(self, message: discord.Message) -> None:
        """Handle DM messages from users."""
        user = message.author
        
        # Check if user already has an active ticket
        if user.id in self.tickets:
            channel_id = self.tickets[user.id]
            try:
                channel = self.bot.get_channel(channel_id)
                if channel is None:
                    channel = await self.bot.fetch_channel(channel_id)
                
                # Verify channel still exists and is accessible
                if channel and isinstance(channel, discord.TextChannel):
                    # Relay message to ticket channel
                    await self.relay_dm_to_ticket(message, channel, user)
                    return
                else:
                    # Channel doesn't exist, remove from mapping
                    logger.warning(f"Ticket channel {channel_id} no longer exists, removing mapping")
                    self.tickets.pop(user.id, None)
                    self.channel_to_user.pop(channel_id, None)
                    self.channel_service.pop(channel_id, None)
                    self.save_tickets()
            except discord.NotFound:
                # Channel was deleted, remove from mapping
                logger.info(f"Ticket channel {channel_id} not found, removing mapping")
                self.tickets.pop(user.id, None)
                self.channel_to_user.pop(channel_id, None)
                self.channel_service.pop(channel_id, None)
                self.save_tickets()
            except Exception as e:
                logger.error(f"Error checking existing ticket for user {user.id}: {e}", exc_info=True)
        
        # Create new ticket for first message
        await self.create_new_ticket(message, user)
    
    async def create_new_ticket(self, message: discord.Message, user: discord.User, service_name: Optional[str] = None) -> None:
        """Create a new support ticket from a user's DM."""
        # Find the support server (use the first guild the bot is in, or configurable)
        # For now, use dev_guild_id if available, otherwise first guild
        guild = None
        if self.bot.config.dev_guild_id:
            guild = self.bot.get_guild(self.bot.config.dev_guild_id)
        
        if guild is None and self.bot.guilds:
            guild = self.bot.guilds[0]
        
        if guild is None:
            logger.error("No guild available to create support ticket")
            try:
                error_embed = self.create_brand_embed(
                    title="Support Unavailable",
                    description="Sorry, support services are currently unavailable. Please try again later."
                )
                await user.send(embed=error_embed)
            except Exception:
                pass
            return
        
        # Create ticket channel
        channel = await self.create_ticket_channel(guild, user)
        if channel is None:
            logger.error(f"Failed to create ticket channel for user {user.id}")
            try:
                error_embed = self.create_brand_embed(
                    title="Support Unavailable",
                    description="Sorry, we were unable to create your support ticket. Please try again later."
                )
                await user.send(embed=error_embed)
            except Exception:
                pass
            return
        
        # Store ticket mapping
        self.tickets[user.id] = channel.id
        self.channel_to_user[channel.id] = user.id
        if service_name:
            self.channel_service[channel.id] = service_name
        self.save_tickets()
        
        # Send initial ticket message
        await self.send_ticket_opened_message(channel, user, service_name=service_name)
        
        # Relay the user's initial message
        await self.relay_dm_to_ticket(message, channel, user)
        
        # Send confirmation to user
        await self.send_user_confirmation(user, channel, service_name=service_name)
    
    async def create_ticket_from_order(
        self,
        user: discord.User,
        guild: discord.Guild,
        service_name: str,
        details: Optional[dict[str, str]] = None
    ) -> Optional[discord.TextChannel]:
        """
        Create a ticket for an order-based request and tag it with the service name.
        
        Args:
            user: The user placing the order
            guild: Guild to create the ticket in
            service_name: Selected service name
            details: Optional dict with additional context (e.g., roblox_username, location)
            
        Returns:
            The created ticket channel or None on failure
        """
        if user.id in self.tickets:
            existing_channel_id = self.tickets[user.id]
            existing_channel = self.bot.get_channel(existing_channel_id)
            if existing_channel is None:
                try:
                    existing_channel = await self.bot.fetch_channel(existing_channel_id)
                except Exception:
                    existing_channel = None
            if existing_channel:
                logger.info("User %s already has an open ticket (%s); skipping new order ticket", user.id, existing_channel.id)
                return existing_channel
        
        channel = await self.create_ticket_channel(guild, user)
        if channel is None:
            return None
        
        self.tickets[user.id] = channel.id
        self.channel_to_user[channel.id] = user.id
        self.channel_service[channel.id] = service_name
        self.save_tickets()
        
        try:
            await channel.edit(topic=f"Service: {service_name}")
        except Exception as exc:
            logger.warning("Failed to set topic for channel %s: %s", channel.id, exc)
        
        await self.send_ticket_opened_message(channel, user, service_name=service_name)
        
        # Send details to staff channel
        if details:
            detail_embed = build_order_details_embed(service_name, user, details)
            await channel.send(embed=detail_embed)
        
        await self.send_user_confirmation(user, channel, service_name=service_name)
        return channel
    
    async def relay_dm_to_ticket(
        self,
        message: discord.Message,
        channel: discord.TextChannel,
        user: discord.User
    ) -> None:
        """Relay a DM message to the ticket channel."""
        try:
            embed = self.create_brand_embed(
                title="User Message",
                description=message.content if message.content else "*No text content*"
            )
            embed.set_author(name=str(user), icon_url=user.display_avatar.url)
            embed.add_field(name="User ID", value=f"`{user.id}`", inline=True)
            
            # Add attachment info if any
            if message.attachments:
                attachment_info = []
                for att in message.attachments[:5]:  # Limit to 5 attachments in embed
                    attachment_info.append(f"[{att.filename}]({att.url}) ({att.size} bytes)")
                embed.add_field(
                    name="Attachments",
                    value="\n".join(attachment_info),
                    inline=False
                )
                # Try to forward attachments (may fail if too large or rate-limited)
                try:
                    files = []
                    for att in message.attachments[:10]:  # Limit to 10 attachments
                        try:
                            files.append(await att.to_file())
                        except Exception as e:
                            logger.warning(f"Failed to download attachment {att.filename}: {e}")
                    if files:
                        await channel.send(embed=embed, files=files)
                    else:
                        await channel.send(embed=embed)
                except discord.HTTPException as e:
                    # If sending with files fails, send embed only
                    logger.warning(f"Failed to send attachments, sending embed only: {e}")
                    await channel.send(embed=embed)
            else:
                await channel.send(embed=embed)
            
            logger.info(f"Relayed DM from user {user.id} to ticket channel {channel.id}")
        except discord.Forbidden:
            logger.warning(f"Cannot send message to ticket channel {channel.id} - missing permissions")
        except Exception as e:
            logger.error(f"Failed to relay DM to ticket channel: {e}", exc_info=True)
    
    async def handle_ticket_channel_message(self, message: discord.Message) -> None:
        """Handle messages in ticket channels (relay staff replies to user DMs)."""
        channel = message.channel
        
        # Check if this is a ticket channel
        if channel.id not in self.channel_to_user:
            return
        
        # Ignore if message is from bot
        if message.author.bot:
            return
        
        # Get user ID from channel mapping
        user_id = self.channel_to_user[channel.id]
        
        try:
            user = await self.bot.fetch_user(user_id)
        except discord.NotFound:
            logger.warning(f"User {user_id} not found, removing ticket mapping")
            self.tickets.pop(user_id, None)
            self.channel_to_user.pop(channel.id, None)
            self.channel_service.pop(channel.id, None)
            self.save_tickets()
            return
        except Exception as e:
            logger.error(f"Failed to fetch user {user_id}: {e}", exc_info=True)
            return
        
        # Relay staff message to user DM
        try:
            embed = self.create_brand_embed(
                title="Support Team Reply",
                description=message.content if message.content else "*No text content*"
            )
            embed.set_author(name=str(message.author), icon_url=message.author.display_avatar.url)
            embed.set_footer(text="U-Drive Support Team")
            embed.timestamp = message.created_at
            
            # Add attachment info if any
            if message.attachments:
                attachment_info = []
                for att in message.attachments[:5]:  # Limit to 5 in embed
                    attachment_info.append(f"[{att.filename}]({att.url})")
                embed.add_field(
                    name="Attachments",
                    value="\n".join(attachment_info),
                    inline=False
                )
                # Try to forward attachments
                try:
                    files = []
                    for att in message.attachments[:10]:  # Limit to 10 attachments
                        try:
                            files.append(await att.to_file())
                        except Exception as e:
                            logger.warning(f"Failed to download attachment {att.filename}: {e}")
                    if files:
                        await user.send(embed=embed, files=files)
                    else:
                        await user.send(embed=embed)
                except discord.HTTPException as e:
                    # If sending with files fails, send embed only
                    logger.warning(f"Failed to send attachments to user, sending embed only: {e}")
                    await user.send(embed=embed)
            else:
                await user.send(embed=embed)
            
            logger.info(f"Relayed staff message from {message.author.id} to user {user_id} via DM")
        except discord.Forbidden:
            logger.warning(f"Cannot send DM to user {user_id} - user may have DMs disabled")
            # Optionally notify in the channel
            try:
                error_embed = self.create_brand_embed(
                    title="Delivery Failed",
                    description=f"Unable to deliver message to user. They may have DMs disabled."
                )
                await channel.send(embed=error_embed)
            except Exception:
                pass
        except Exception as e:
            logger.error(f"Failed to relay staff message to user {user_id}: {e}", exc_info=True)
    
    async def close_ticket(
        self,
        interaction: discord.Interaction,
        channel: discord.TextChannel,
        staff_member: discord.Member
    ) -> None:
        """
        Close a support ticket, generate transcript, and clean up.
        
        Args:
            interaction: The interaction that triggered the close
            channel: The ticket channel to close
            staff_member: The staff member closing the ticket
        """
        channel_id = channel.id
        
        # Check if channel is already being closed
        if channel_id in self.closing_channels:
            embed = self.create_brand_embed(
                title="Already Closing",
                description="This ticket is already being closed. Please wait..."
            )
            await interaction.followup.send(embed=embed, ephemeral=True)
            return
        
        # Mark as closing
        self.closing_channels.add(channel_id)
        
        try:
            # Get user ID from mapping
            user_id = self.channel_to_user.get(channel_id)
            if not user_id:
                embed = self.create_brand_embed(
                    title="Error",
                    description="This channel is not a valid support ticket."
                )
                await interaction.followup.send(embed=embed, ephemeral=True)
                self.closing_channels.discard(channel_id)
                return
            
            # Fetch user
            try:
                user = await self.bot.fetch_user(user_id)
            except discord.NotFound:
                logger.warning(f"User {user_id} not found when closing ticket")
                user = None
            
            # Generate transcript BEFORE deletion
            transcript_path = await self.generate_transcript(channel)
            
            if not transcript_path:
                # If transcript generation failed, don't delete the channel
                embed = self.create_brand_embed(
                    title="Error",
                    description="Failed to generate transcript. Ticket not closed. Please try again."
                )
                await interaction.followup.send(embed=embed, ephemeral=True)
                self.closing_channels.discard(channel_id)
                return
            
            # Send closure message to user via DM
            if user:
                try:
                    close_embed = self.create_brand_embed(
                        title="Support Ticket Closed",
                        description=(
                            "Your U-Drive support ticket has been closed.\n\n"
                            "If you need further assistance, please feel free to send us a new message."
                        )
                    )
                    close_embed.set_footer(text="U-Drive Support")
                    close_embed.timestamp = discord.utils.utcnow()
                    
                    # Attach transcript if possible
                    try:
                        await user.send(
                            embed=close_embed,
                            file=discord.File(transcript_path, filename=transcript_path.name)
                        )
                    except discord.HTTPException:
                        # If sending with file fails, send embed only
                        await user.send(embed=close_embed)
                except discord.Forbidden:
                    logger.warning(f"Cannot send closure DM to user {user_id} - DMs may be disabled")
                except Exception as e:
                    logger.error(f"Failed to send closure message to user {user_id}: {e}", exc_info=True)
            
            # Log closure to staff log channel
            if channel.guild:
                log_channel = await self.get_or_create_staff_log_channel(channel.guild)
                if log_channel:
                    try:
                        log_embed = self.create_brand_embed(
                            title="Ticket Closed",
                            description=f"Support ticket `{channel.name}` has been closed."
                        )
                        log_embed.add_field(name="Channel ID", value=f"`{channel_id}`", inline=True)
                        log_embed.add_field(name="User ID", value=f"`{user_id}`", inline=True)
                        log_embed.add_field(name="Closed By", value=f"{staff_member.mention} (`{staff_member.name}`)", inline=False)
                        log_embed.add_field(name="Staff ID", value=f"`{staff_member.id}`", inline=True)
                        log_embed.timestamp = discord.utils.utcnow()
                        
                        # Send transcript to log channel
                        await log_channel.send(
                            embed=log_embed,
                            file=discord.File(transcript_path, filename=transcript_path.name)
                        )
                        logger.info(f"Logged ticket closure for channel {channel.name} ({channel_id})")
                    except Exception as e:
                        logger.error(f"Failed to log ticket closure: {e}", exc_info=True)
            
            # Remove from ticket mappings
            self.tickets.pop(user_id, None)
            self.channel_to_user.pop(channel_id, None)
            self.channel_service.pop(channel_id, None)
            self.save_tickets()
            
            # Delete the channel
            try:
                await channel.delete(reason=f"Ticket closed by {staff_member} ({staff_member.id})")
                logger.info(f"Deleted ticket channel {channel.name} ({channel_id})")
            except discord.Forbidden:
                logger.error(f"Cannot delete channel {channel_id} - missing permissions")
                embed = self.create_brand_embed(
                    title="Warning",
                    description="Ticket mappings removed, but channel could not be deleted due to missing permissions."
                )
                await interaction.followup.send(embed=embed, ephemeral=True)
            except Exception as e:
                logger.error(f"Failed to delete channel {channel_id}: {e}", exc_info=True)
                embed = self.create_brand_embed(
                    title="Warning",
                    description="Ticket mappings removed, but channel deletion failed."
                )
                await interaction.followup.send(embed=embed, ephemeral=True)
            
            # Send success confirmation
            success_embed = self.create_brand_embed(
                title="Ticket Closed",
                description=f"Support ticket `{channel.name}` has been successfully closed."
            )
            await interaction.followup.send(embed=success_embed, ephemeral=False)
            
        finally:
            # Always remove from closing set
            self.closing_channels.discard(channel_id)
    
    @app_commands.command(name="close", description="Close this support ticket (Staff only)")
    @app_commands.guild_only()
    async def close_command(self, interaction: discord.Interaction) -> None:
        """Close command - restricted to staff role."""
        # Defer response
        await interaction.response.defer(ephemeral=True)
        
        # Check if in a guild
        if not interaction.guild:
            embed = self.create_brand_embed(
                title="Error",
                description="This command can only be used in a server."
            )
            await interaction.followup.send(embed=embed, ephemeral=True)
            return
        
        # Check if user has the required role
        member = interaction.user
        if not isinstance(member, discord.Member):
            embed = self.create_brand_embed(
                title="Error",
                description="Unable to verify your permissions."
            )
            await interaction.followup.send(embed=embed, ephemeral=True)
            return
        
        staff_role = interaction.guild.get_role(SUPPORT_STAFF_ROLE_ID)
        if not staff_role:
            logger.warning(f"Staff role {SUPPORT_STAFF_ROLE_ID} not found in guild {interaction.guild.id}")
            embed = self.create_brand_embed(
                title="Error",
                description="Support system configuration error. Please contact an administrator."
            )
            await interaction.followup.send(embed=embed, ephemeral=True)
            return
        
        if staff_role not in member.roles:
            embed = self.create_brand_embed(
                title="Permission Denied",
                description="You do not have permission to close support tickets."
            )
            await interaction.followup.send(embed=embed, ephemeral=True)
            return
        
        # Check if this is a ticket channel
        channel = interaction.channel
        if not isinstance(channel, discord.TextChannel):
            embed = self.create_brand_embed(
                title="Error",
                description="This command can only be used in a text channel."
            )
            await interaction.followup.send(embed=embed, ephemeral=True)
            return
        
        if channel.id not in self.channel_to_user:
            embed = self.create_brand_embed(
                title="Error",
                description="This channel is not a support ticket channel."
            )
            await interaction.followup.send(embed=embed, ephemeral=True)
            return
        
        # Close the ticket
        await self.close_ticket(interaction, channel, member)


async def setup(bot: "Bot") -> None:
    """Setup function for the Support cog."""
    await bot.add_cog(Support(bot))

