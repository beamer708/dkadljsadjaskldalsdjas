"""Demo cog showcasing buttons, select menus, modals, and autocomplete."""

from typing import TYPE_CHECKING
import discord
from discord.ext import commands
from discord import app_commands
from discord.ui import Button, Select, View, Modal, TextInput

from src.utils.embeds import success_embed, info_embed, error_embed

if TYPE_CHECKING:
    from src.bot import Bot


# Demo data for autocomplete
DEMO_OPTIONS = ["Option 1", "Option 2", "Option 3", "Option 4", "Option 5"]


class DemoView(View):
    """A view containing buttons and select menus for demonstration."""
    
    def __init__(self) -> None:
        """Initialize the demo view."""
        super().__init__(timeout=300.0)  # 5 minute timeout
    
    @discord.ui.button(label="Click Me!", style=discord.ButtonStyle.primary, emoji="✅")
    async def primary_button(
        self, 
        interaction: discord.Interaction, 
        button: Button
    ) -> None:
        """Handle primary button click."""
        embed = success_embed("Button Clicked!", "You clicked the primary button!")
        await interaction.response.send_message(embed=embed, ephemeral=True)
    
    @discord.ui.button(label="Danger!", style=discord.ButtonStyle.danger, emoji="⚠️")
    async def danger_button(
        self, 
        interaction: discord.Interaction, 
        button: Button
    ) -> None:
        """Handle danger button click."""
        embed = error_embed("Danger!", "You clicked the danger button!")
        await interaction.response.send_message(embed=embed, ephemeral=True)
    
    @discord.ui.button(label="Disabled", style=discord.ButtonStyle.secondary, disabled=True)
    async def disabled_button(
        self, 
        interaction: discord.Interaction, 
        button: Button
    ) -> None:
        """This button is disabled and won't be called."""
        pass
    
    @discord.ui.select(
        placeholder="Choose an option...",
        options=[
            discord.SelectOption(label="Option 1", value="1", description="First option"),
            discord.SelectOption(label="Option 2", value="2", description="Second option"),
            discord.SelectOption(label="Option 3", value="3", description="Third option"),
        ]
    )
    async def demo_select(
        self, 
        interaction: discord.Interaction, 
        select: Select
    ) -> None:
        """Handle select menu selection."""
        selected = select.values[0]
        embed = info_embed(
            "Selection Made!",
            f"You selected: **Option {selected}**"
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)


class DemoModal(Modal, title="Demo Form"):
    """A modal form for demonstration."""
    
    name_input = TextInput(
        label="Your Name",
        placeholder="Enter your name here...",
        required=True,
        max_length=100
    )
    
    message_input = TextInput(
        label="Your Message",
        placeholder="Enter a message...",
        style=discord.TextStyle.long,
        required=False,
        max_length=500
    )
    
    async def on_submit(self, interaction: discord.Interaction) -> None:
        """Handle modal submission."""
        embed = success_embed(
            "Form Submitted!",
            f"**Name:** {self.name_input.value}\n"
            f"**Message:** {self.message_input.value or 'None'}"
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)


class Demo(commands.Cog):
    """Demo commands showcasing Discord UI components."""
    
    def __init__(self, bot: "Bot") -> None:
        """Initialize the Demo cog."""
        self.bot = bot
    
    @app_commands.command(name="demo", description="Demonstrate buttons and select menus")
    async def demo_slash(self, interaction: discord.Interaction) -> None:
        """Slash command demonstrating buttons and select menus."""
        embed = info_embed(
            "🎮 Demo UI Components",
            "Click the buttons or select an option from the dropdown menu below!"
        )
        view = DemoView()
        await interaction.response.send_message(embed=embed, view=view)
    
    @app_commands.command(name="modal", description="Demonstrate a modal form")
    async def modal_slash(self, interaction: discord.Interaction) -> None:
        """Slash command demonstrating modals."""
        modal = DemoModal()
        await interaction.response.send_modal(modal)
    
    @app_commands.command(name="autocomplete-demo", description="Demonstrate autocomplete")
    async def autocomplete_demo(
        self,
        interaction: discord.Interaction,
        option: str
    ) -> None:
        """Slash command with autocomplete functionality."""
        embed = success_embed(
            "Autocomplete Selected!",
            f"You selected: **{option}**"
        )
        await interaction.response.send_message(embed=embed, ephemeral=False)
    
    @autocomplete_demo.autocomplete("option")
    async def option_autocomplete(
        self,
        interaction: discord.Interaction,
        current: str
    ) -> list[app_commands.Choice[str]]:
        """Autocomplete handler for the option parameter."""
        # Filter options based on what the user has typed
        filtered = [
            app_commands.Choice(name=opt, value=opt)
            for opt in DEMO_OPTIONS
            if current.lower() in opt.lower()
        ]
        return filtered[:25]  # Discord allows max 25 choices
    
    @app_commands.context_menu(name="Demo Context Menu")
    async def demo_context_menu(
        self,
        interaction: discord.Interaction,
        message: discord.Message
    ) -> None:
        """Context menu command for messages."""
        embed = info_embed(
            "Context Menu Used!",
            f"You right-clicked on a message from {message.author.mention}\n"
            f"Message content: {message.content[:100]}..."
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)
    
    @app_commands.context_menu(name="Get User Info")
    async def user_info_context_menu(
        self,
        interaction: discord.Interaction,
        user: discord.User
    ) -> None:
        """Context menu command for users."""
        embed = info_embed(
            f"User Info: {user.name}",
            f"**ID:** {user.id}\n"
            f"**Created:** {user.created_at.strftime('%Y-%m-%d %H:%M:%S')}\n"
            f"**Bot:** {'Yes' if user.bot else 'No'}"
        )
        embed.set_thumbnail(url=user.display_avatar.url)
        await interaction.response.send_message(embed=embed, ephemeral=True)
    
    @commands.command(name="demo", aliases=["d"])
    async def demo_prefix(self, ctx: commands.Context) -> None:
        """Prefix command demonstrating buttons and select menus."""
        embed = info_embed(
            "🎮 Demo UI Components",
            "Click the buttons or select an option from the dropdown menu below!"
        )
        view = DemoView()
        await ctx.send(embed=embed, view=view)


async def setup(bot: "Bot") -> None:
    """Setup function for the Demo cog."""
    await bot.add_cog(Demo(bot))

