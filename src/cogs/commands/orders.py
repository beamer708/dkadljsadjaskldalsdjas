"""Order menu cog providing dropdown-triggered, DM-based ticket creation."""

import asyncio
import logging
from typing import TYPE_CHECKING, Optional
import discord
from discord import app_commands
from discord.ext import commands

from src.utils.embeds import brand_embed, BRAND_ACCENT

if TYPE_CHECKING:
    from src.bot import Bot
    from src.cogs.core.support import Support

logger = logging.getLogger(__name__)

SERVICES = {
    "standard": {
        "label": "Standard Ride",
        "description": "Pickup to your location — limo & blackout tiers",
        "long": (
            "A driver will pick you up and take you to your location.\n"
            "Includes limo and blackout tiers."
        ),
    },
    "getaway": {
        "label": "Getaway Driver",
        "description": "Emergency pickup when evading police",
        "long": (
            "Emergency pickup when evading police.\n"
            "Driver meets you at a specified location."
        ),
    },
    "transit": {
        "label": "Transit Services",
        "description": "Public transportation such as buses",
        "long": (
            "Public transportation options such as buses."
        ),
    },
}


class OrderSelect(discord.ui.Select):
    """Select menu for choosing a service."""
    
    def __init__(self) -> None:
        options = [
            discord.SelectOption(
                label=data["label"],
                description=data["description"][:100],
                value=key,
            )
            for key, data in SERVICES.items()
        ]
        super().__init__(
            placeholder="Select a service to start your order",
            min_values=1,
            max_values=1,
            options=options,
            custom_id="order_service_select",
        )
    
    async def callback(self, interaction: discord.Interaction) -> None:  # type: ignore[override]
        view: OrderView = self.view  # type: ignore[assignment]
        await view.handle_selection(interaction, self.values[0])


class OrderView(discord.ui.View):
    """View that contains the order select menu."""
    
    def __init__(self, bot: "Bot") -> None:
        super().__init__(timeout=None)
        self.bot = bot
        self.add_item(OrderSelect())
    
    async def handle_selection(self, interaction: discord.Interaction, service_key: str) -> None:
        support_cog: Optional["Support"] = self.bot.get_cog("Support")  # type: ignore[type-arg]
        if support_cog is None:
            await interaction.response.send_message(
                embed=brand_embed(
                    title="Support Unavailable",
                    description="The support system is not loaded. Please try again later.",
                ),
                ephemeral=True,
            )
            return
        
        service = SERVICES.get(service_key)
        if service is None:
            await interaction.response.send_message(
                embed=brand_embed(title="Invalid Selection", description="That service is not available."),
                ephemeral=True,
            )
            return
        
        if interaction.user.id in support_cog.tickets:
            existing_channel_id = support_cog.tickets[interaction.user.id]
            note = (
                f"You already have an open ticket (`{existing_channel_id}`). "
                "Please continue there to avoid duplicates."
            )
            await interaction.response.send_message(
                embed=brand_embed(title="Ticket Already Open", description=note),
                ephemeral=True,
            )
            return
        
        await interaction.response.send_message(
            embed=brand_embed(
                title="Check Your DMs",
                description="I sent you a DM to collect your order details.",
            ),
            ephemeral=True,
        )
        
        guild = interaction.guild
        if guild is None and self.bot.config.dev_guild_id:
            guild = self.bot.get_guild(self.bot.config.dev_guild_id)
        
        if guild is None:
            await interaction.followup.send(
                embed=brand_embed(
                    title="Unable to Create Ticket",
                    description="No guild context available to create your order ticket.",
                ),
                ephemeral=True,
            )
            return
        
        await self._collect_and_create(interaction.user, guild, service, support_cog)
    
    async def _collect_and_create(
        self,
        user: discord.User,
        guild: discord.Guild,
        service: dict[str, str],
        support_cog: "Support",
    ) -> None:
        """Collect order details via DM and create the ticket."""
        try:
            dm = user.dm_channel or await user.create_dm()
        except discord.Forbidden:
            logger.warning("Cannot DM user %s for order intake (DMs closed)", user.id)
            return
        except Exception as exc:
            logger.error("Failed to open DM with user %s: %s", user.id, exc, exc_info=True)
            return
        
        intro_embed = brand_embed(
            title=f"{service['label']} Intake",
            description=(
                f"{service['long']}\n\n"
                "Please answer the following to start your ticket:"
            ),
        )
        await dm.send(embed=intro_embed)
        
        roblox_username = await self._prompt(dm, user, "Roblox Username:")
        if roblox_username is None:
            await dm.send(embed=brand_embed(title="Timed Out", description="No response received. Please try again."))
            return
        
        location = await self._prompt(dm, user, "Your Location:")
        if location is None:
            await dm.send(embed=brand_embed(title="Timed Out", description="No response received. Please try again."))
            return
        
        details = {"roblox_username": roblox_username, "location": location}
        channel = await support_cog.create_ticket_from_order(
            user=user,
            guild=guild,
            service_name=service["label"],
            details=details,
        )
        if channel is None:
            await dm.send(embed=brand_embed(title="Ticket Creation Failed", description="We could not create your ticket. Please try again later."))
            return
        
        await dm.send(
            embed=brand_embed(
                title="Ticket Created",
                description=f"Your order ticket has been created: `{channel.name}`\nOur team will contact you shortly.",
            )
        )
    
    async def _prompt(self, dm: discord.DMChannel, user: discord.User, question: str, timeout: float = 120.0) -> Optional[str]:
        """Prompt the user for input and return the response content."""
        await dm.send(question)
        
        def check(msg: discord.Message) -> bool:
            return msg.author.id == user.id and isinstance(msg.channel, discord.DMChannel)
        
        try:
            msg = await self.bot.wait_for("message", check=check, timeout=timeout)
            return msg.content.strip()
        except asyncio.TimeoutError:
            return None
        except Exception as exc:
            logger.error("Error while collecting input from user %s: %s", user.id, exc, exc_info=True)
            return None


class Orders(commands.Cog):
    """Cog for posting the order menu."""
    
    def __init__(self, bot: "Bot") -> None:
        self.bot = bot
    
    async def cog_load(self) -> None:
        """Log cog load and ensure command is registered in the correct scope."""
        guild = (
            discord.Object(id=self.bot.config.dev_guild_id)
            if getattr(self.bot.config, "dev_guild_id", None)
            else None
        )
        try:
            # Ensure command exists in tree for the target scope
            existing = self.bot.tree.get_command("order-menu", type=discord.AppCommandType.chat_input, guild=guild)
            if existing:
                self.bot.tree.remove_command("order-menu", type=discord.AppCommandType.chat_input, guild=guild)
                logger.info("Removed existing /order-menu before re-registering")
            self.bot.tree.add_command(self.order_menu, guild=guild)
            scope = f"guild {guild.id}" if guild else "global scope"
            logger.info("Registered /order-menu slash command in %s", scope)
        except Exception as exc:
            logger.error("Failed to register /order-menu: %s", exc, exc_info=True)
    
    @app_commands.command(name="order-menu", description="Post the order dropdown menu (Admin only)")
    @app_commands.default_permissions(administrator=True)
    @app_commands.checks.has_permissions(administrator=True)
    async def order_menu(self, interaction: discord.Interaction) -> None:
        """Post the order embed with dropdown in the current channel."""
        # Runtime fail-safe permission check
        if not interaction.user.guild_permissions.administrator:
            await interaction.response.send_message(
                embed=brand_embed(
                    title="Permission Denied",
                    description="You need administrator permissions to use this command.",
                ),
                ephemeral=True,
            )
            return
        
        view = OrderView(self.bot)
        embed = brand_embed(
            title="U-Drive Orders",
            description=(
                "Select a service below to start a private order ticket via DM.\n"
                "A team member will follow up once your ticket is created."
            ),
            color=BRAND_ACCENT,
        )
        embed.add_field(name="Standard Ride", value="Pickup to your location (limo & blackout tiers).", inline=False)
        embed.add_field(name="Getaway Driver", value="Emergency pickup while evading police.", inline=False)
        embed.add_field(name="Transit Services", value="Public transportation such as buses.", inline=False)
        
        await interaction.response.send_message(embed=embed, view=view)
        logger.info("Order menu posted in channel %s by %s", interaction.channel_id, interaction.user.id)


async def setup(bot: "Bot") -> None:
    """Setup function for the Orders cog."""
    await bot.add_cog(Orders(bot))

