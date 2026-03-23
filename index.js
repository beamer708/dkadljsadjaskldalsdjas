const { Client, GatewayIntentBits, Partials } = require('discord.js');
// NOTE: GuildMembers is a privileged intent — enable it in the Discord Developer Portal
// under your application > Bot > Privileged Gateway Intents > Server Members Intent
const getConfig = require('./src/utils/getConfig');
const { loadCommands } = require('./src/handlers/commandHandler');
const { loadEvents } = require('./src/handlers/eventHandler');
const { startServer } = require('./src/server');

const config = getConfig()

const required = ['token', 'clientId', 'guildId']
const missing = required.filter(key => !config[key])

if (missing.length > 0) {
  console.error(`STARTUP ERROR: Missing required config values: ${missing.join(', ')}`)
  console.error('Set these as environment variables on your hosting service.')
  process.exit(1)
}

// Warn about optional fields that are missing but won't crash the bot
const OPTIONAL_FIELDS = [
  'staffRoleId', 'supportCategoryId',
  'logChannelId', 'joinGateChannelId', 'ticketLogChannelId', 'ticketTranscriptChannelId',
  'updatesChannelId', 'updatesPingRoleId',
  'applicationChannelId', 'suggestionChannelId', 'communityTeamRoleId', 'betaTesterRoleId',
]
for (const field of OPTIONAL_FIELDS) {
  if (!config[field]) {
    console.warn(`[Config] WARNING: Missing or empty field: "${field}" — related features may not work.`)
  }
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
  startServer(client);
})();
