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
        Get configuration value from environment variable or config.json.
        
        Args:
            key: Configuration key name
            default: Default value if not found and not required
            required: Whether the key is required
            
        Returns:
            Configuration value as string
            
        Raises:
            ValueError: If required key is missing
        """
        # Try environment variable first (with prefix)
        env_key = f"DISCORD_{key.upper()}"
        env_value = os.getenv(env_key)
        if env_value:
            return env_value
        
        # Try config.json
        config_path = Path(__file__).parent.parent.parent / "config.json"
        if config_path.exists():
            with open(config_path, "r", encoding="utf-8") as f:
                config = json.load(f)
                if key in config:
                    return str(config[key])
        
        # Use default or raise error
        if default is not None:
            return str(default)
        
        if required:
            raise ValueError(
                f"Missing required configuration: {key}. "
                f"Set DISCORD_{key.upper()} environment variable or add it to config.json"
            )
        
        return ""

