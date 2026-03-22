const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

// Reads every .js file in src/commands and registers it on client.commands
async function loadCommands(client) {
  client.commands = new Collection();
  const commandsPath = path.join(__dirname, '../commands');
  const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

  for (const file of files) {
    const command = require(path.join(commandsPath, file));
    if (!command.data || !command.execute) {
      console.warn(`[CommandHandler] Skipping ${file} — missing data or execute export.`);
      continue;
    }
    client.commands.set(command.data.name, command);
    console.log(`[CommandHandler] Loaded command: ${command.data.name}`);
  }
}

module.exports = { loadCommands };
