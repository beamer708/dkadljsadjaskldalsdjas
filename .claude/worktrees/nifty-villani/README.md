# Modern Discord Bot

A modern Discord bot built with Python and discord.py, featuring slash commands, context menus, modals, buttons, select menus, and autocomplete support.

## Features

- ✅ **Slash Commands** (app_commands) with autocomplete
- ✅ **Context Menus** (user & message commands)
- ✅ **Modals** (forms)
- ✅ **Buttons & Select Menus** (Views)
- ✅ **Prefix Commands** (legacy text commands with `!` prefix)
- ✅ **Cog-based Architecture** for scalability
- ✅ **Centralized Error Handling**
- ✅ **Embed-based Responses**
- ✅ **Ephemeral Responses** where appropriate
- ✅ **Permission Checks** using decorators
- ✅ **Graceful Startup & Shutdown**

## Project Structure

```
.
├── main.py                 # Entry point
├── src/
│   ├── bot.py             # Main bot class
│   ├── config/
│   │   └── __init__.py    # Configuration management
│   ├── utils/
│   │   ├── embeds.py      # Embed utilities
│   │   └── decorators.py  # Permission decorators
│   └── cogs/
│       ├── core/
│       │   ├── events.py           # Core event handlers (on_ready, etc.)
│       │   └── error_handler.py    # Centralized error handling
│       └── commands/
│           ├── ping.py    # Ping command (slash + prefix)
│           └── demo.py    # Demo commands (buttons, modals, autocomplete)
├── config.json.example    # Example configuration file
├── requirements.txt       # Python dependencies
└── README.md             # This file
```

## Installation

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure the Bot

Copy the example configuration file:

```bash
cp config.json.example config.json
```

Edit `config.json` and fill in your bot credentials:

```json
{
  "token": "YOUR_BOT_TOKEN_HERE",
  "application_id": "YOUR_APPLICATION_ID_HERE",
  "dev_guild_id": "YOUR_DEV_GUILD_ID_HERE",
  "prefix": "!",
  "sync_commands": true
}
```

**Where to find these values:**

- **Token**: Found in the [Discord Developer Portal](https://discord.com/developers/applications) under your bot's "Bot" section
- **Application ID**: Found in the "General Information" section of your application
- **Dev Guild ID**: The ID of your development/testing server (right-click server → Copy Server ID)
- **Prefix**: The prefix for legacy text commands (default: `!`)
- **sync_commands**: Whether to sync slash commands on startup (recommended: `true`)

### Alternative: Environment Variables

Instead of using `config.json`, you can set environment variables:

```bash
export DISCORD_TOKEN="your_token_here"
export DISCORD_APPLICATION_ID="your_app_id_here"
export DISCORD_DEV_GUILD_ID="your_guild_id_here"
export DISCORD_PREFIX="!"
export DISCORD_SYNC_COMMANDS="true"
```

### 3. Bot Setup on Discord

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application or select an existing one
3. Go to the "Bot" section and create a bot
4. Enable the following **Privileged Gateway Intents** (if needed):
   - Server Members Intent (if you need member-related features)
   - Message Content Intent (required for prefix commands)
5. Copy the bot token
6. Go to "OAuth2" → "URL Generator":
   - Select scopes: `bot`, `applications.commands`
   - Select bot permissions as needed
   - Copy the generated URL and invite the bot to your server

## Running the Bot

### Basic Run

```bash
python main.py
```

### For Bot Hosting Platforms

Most bot hosting platforms (like Replit, Railway, Heroku, etc.) will automatically detect `main.py` as the entry point. Ensure:

1. The platform supports Python 3.8+
2. You set environment variables or upload `config.json` (check platform documentation)
3. The platform keeps the process running (most do this automatically)

## Commands

### Slash Commands

- `/ping` - Check bot latency
- `/demo` - Demo buttons and select menus
- `/modal` - Demo modal form
- `/autocomplete-demo [option]` - Demo autocomplete (type to see suggestions)

### Context Menus

- Right-click on a message → "Demo Context Menu"
- Right-click on a user → "Get User Info"

### Prefix Commands

- `!ping` - Check bot latency (same as `/ping`)
- `!demo` - Demo buttons and select menus

## Architecture

### Cogs System

The bot uses a cog-based architecture for modularity:

- **Core Cogs** (`src/cogs/core/`): Essential bot functionality
  - `events.py`: Handles `on_ready`, `on_guild_join`, etc.
  - `error_handler.py`: Centralized error handling for all commands

- **Command Cogs** (`src/cogs/commands/`): User-facing commands
  - `ping.py`: Simple ping command
  - `demo.py`: Comprehensive demo of Discord UI features

### Configuration

Configuration is managed through `src/config/__init__.py`, which:
- Loads from `config.json` or environment variables
- Provides type-safe access to configuration values
- Validates required configuration on startup

### Error Handling

All errors are caught and handled gracefully:
- Prefix command errors → `ErrorHandler.on_command_error()`
- Slash command errors → `ErrorHandler.on_app_command_error()`
- User-friendly error messages with embeds
- Comprehensive error logging

## Adding New Commands

### Slash Command Example

```python
# src/cogs/commands/my_command.py
from typing import TYPE_CHECKING
import discord
from discord import app_commands

if TYPE_CHECKING:
    from src.bot import Bot

class MyCommand(commands.Cog):
    def __init__(self, bot: "Bot") -> None:
        self.bot = bot
    
    @app_commands.command(name="mycommand", description="My command description")
    async def my_slash_command(self, interaction: discord.Interaction) -> None:
        await interaction.response.send_message("Hello!", ephemeral=False)

async def setup(bot: "Bot") -> None:
    await bot.add_cog(MyCommand(bot))
```

### Prefix Command Example

```python
@commands.command(name="mycommand", aliases=["mc"])
async def my_prefix_command(self, ctx: commands.Context) -> None:
    await ctx.send("Hello!")
```

## Best Practices

- ✅ All commands use embeds for responses
- ✅ Slash commands use ephemeral responses when appropriate
- ✅ Async/await patterns throughout
- ✅ Type hints for better code clarity
- ✅ Comprehensive error handling
- ✅ Rate limit friendly (discord.py handles this automatically)
- ✅ Clean separation of concerns (cogs, utils, config)

## Troubleshooting

### Commands not syncing

- Check that `sync_commands` is set to `true` in config
- Verify your `application_id` is correct
- For global sync, wait up to 1 hour for commands to propagate
- For dev guild sync, commands appear instantly

### Bot not responding

- Verify the bot token is correct
- Check that the bot is online (green status)
- Ensure the bot has proper permissions in the server
- Check logs for error messages

### Intents errors

- Enable required intents in the Discord Developer Portal
- Ensure `intents.message_content = True` is set (already configured in `bot.py`)

## License

This bot template is provided as-is for educational and development purposes.

## Support

For discord.py documentation: https://discordpy.readthedocs.io/

