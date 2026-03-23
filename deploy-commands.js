const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const getConfig = require('./src/utils/getConfig');
const config = getConfig();

// Reads all command files and deploys them to the configured guild via the Discord REST API
async function deploy() {
  const commands = [];
  const commandsPath = path.join(__dirname, 'src/commands');
  const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

  for (const file of files) {
    const command = require(path.join(commandsPath, file));
    if (command.data) {
      commands.push(command.data.toJSON());
    }
  }

  const rest = new REST().setToken(config.token);

  console.log(`[Deploy] Registering ${commands.length} command(s) to guild ${config.guildId}...`);

  const data = await rest.put(
    Routes.applicationGuildCommands(config.clientId, config.guildId),
    { body: commands },
  );

  console.log(`[Deploy] Successfully registered ${data.length} command(s).`);
}

deploy().catch(err => {
  console.error('[Deploy] Failed to register commands:', err);
  process.exit(1);
});
