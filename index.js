const { Client, GatewayIntentBits, Partials } = require('discord.js');
// NOTE: GuildMembers is a privileged intent — enable it in the Discord Developer Portal
// under your application > Bot > Privileged Gateway Intents > Server Members Intent
const config = require('./config.json');
const { loadCommands } = require('./src/handlers/commandHandler');
const { loadEvents } = require('./src/handlers/eventHandler');

// Validate all required config fields before attempting to start
const REQUIRED_FIELDS = [
  'token', 'clientId', 'guildId', 'staffRoleId', 'supportCategoryId',
  'logChannelId', 'joinGateChannelId', 'ticketLogChannelId', 'ticketTranscriptChannelId',
  'updatesChannelId', 'updatesPingRoleId',
];
let configValid = true;
for (const field of REQUIRED_FIELDS) {
  if (!config[field]) {
    console.warn(`[Config] WARNING: Missing or empty required field: "${field}"`);
    configValid = false;
  }
}
if (!configValid) {
  console.warn('[Config] One or more required config fields are missing. Some features may not work correctly.');
}

// Privileged intents required — enable these in the Discord Developer Portal:
//   Application > Bot > Privileged Gateway Intents
//   - Server Members Intent  → for guildMemberAdd (join logging)
//   - Message Content Intent → for messageDelete (deleted message logging)
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember],
});

// Load all commands and events, then log in
(async () => {
  await loadCommands(client);
  await loadEvents(client);
  await client.login(config.token);
})();
