"""Configuration management for the Discord bot."""

import json
import os
from pathlib import Path
from typing import Optional


class Config:
    """Loads and manages bot configuration from config.json or environment variables."""
    
    def __init__(self) -> None:
        """Initialize configuration from file or environment variables."""
        self.token: str = self._get_config("token")
        self.application_id: int = int(self._get_config("application_id", required=True))
        
        # Handle optional dev_guild_id
        dev_guild_id_str = self._get_config("dev_guild_id", required=False)
        self.dev_guild_id: Optional[int] = int(dev_guild_id_str) if dev_guild_id_str else None
        
        self.prefix: str = self._get_config("prefix", default="!")
        sync_str = self._get_config("sync_commands", default="true")
        self.sync_commands: bool = sync_str.lower() in ("true", "1", "yes")
    
    def _get_config(self, key: str, default: Optional[str] = None, required: bool = True) -> str:
        """
        Get configuration value from config.json (prioritized) or environment variable.
        
        For the token, only config.json is used (no environment variables).
        
        Args:
            key: Configuration key name
            default: Default value if not found and not required
            required: Whether the key is required
            
        Returns:
            Configuration value as string
            
        Raises:
            ValueError: If required key is missing
        """
        # For token, ONLY use config.json (never environment variables)
        if key == "token":
            config_path = Path(__file__).parent.parent.parent / "config.json"
            if not config_path.exists():
                raise ValueError(
                    "config.json not found. Please create config.json with your bot token."
                )
            with open(config_path, "r", encoding="utf-8") as f:
                config = json.load(f)
                if key not in config or not config[key]:
                    raise ValueError(
                        f"Missing required configuration: {key}. "
                        f"Please add '{key}' to config.json"
                    )
                return str(config[key])
        
        # For other config values: Try config.json first, then environment variables
        config_path = Path(__file__).parent.parent.parent / "config.json"
        if config_path.exists():
            with open(config_path, "r", encoding="utf-8") as f:
                config = json.load(f)
                if key in config and config[key]:
                    return str(config[key])
        
        # Try environment variable as fallback
        env_key = f"DISCORD_{key.upper()}"
        env_value = os.getenv(env_key)
        if env_value:
            return env_value
        
        # Use default or raise error
        if default is not None:
            return str(default)
        
        if required:
            raise ValueError(
                f"Missing required configuration: {key}. "
                f"Please add '{key}' to config.json"
            )
        
        return ""

