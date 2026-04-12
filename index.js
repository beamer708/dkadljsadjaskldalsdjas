const { Client, GatewayIntentBits, Partials } = require('discord.js');
// NOTE: GuildMembers is a privileged intent — enable it in the Discord Developer Portal
// under your application > Bot > Privileged Gateway Intents > Server Members Intent
const getConfig = require('./src/utils/getConfig');
const { loadCommands } = require('./src/handlers/commandHandler');
const { loadEvents } = require('./src/handlers/eventHandler');
const { startServer } = require('./src/server');

const config = getConfig()

// Sensitive values must come from environment variables
const missingSensitive = ['token', 'apiSecret'].filter(key => !config[key])
if (missingSensitive.length > 0) {
  for (const key of missingSensitive) {
    console.error(`STARTUP ERROR: Missing sensitive environment variable: ${key}`)
  }
  console.error('Set BOT_TOKEN and API_SECRET on your hosting service.')
  process.exit(1)
}

// Non-sensitive required values — warn but allow bot to start
const missingRequired = ['clientId', 'guildId'].filter(key => !config[key])
for (const key of missingRequired) {
  console.warn(`CONFIG WARNING: Missing value: "${key}". Related features may not work.`)
}

// Warn about optional fields that are missing but won't crash the bot
const OPTIONAL_FIELDS = [
  'staffRoleId', 'supportCategoryId',
  'logChannelId', 'joinGateChannelId', 'ticketLogChannelId', 'ticketTranscriptChannelId',
  'updatesChannelId', 'updatesPingRoleId',
  'staffForumChannelId', 'suggestionForumChannelId',
  'communityTeamRoleId', 'betaTesterRoleId',
  'partnershipChannelId', 'rolePanelChannelId', 'welcomeChannelId',
  'notificationsRoleId', 'updatesRoleId', 'serverNewsRoleId',
]
for (const field of OPTIONAL_FIELDS) {
  if (!config[field]) {
    console.warn(`[Config] WARNING: Missing or empty field: "${field}" — related features may not work.`)
  }
}

// Privileged intents required — enable these in the Discord Developer Portal:
//   Application > Bot > Privileged Gateway Intents
//   - Server Members Intent  → for guildMemberAdd, guildMemberUpdate (join logging, role changes)
//   - Message Content Intent → for messageDelete, messageUpdate (message logging)
// GuildModeration is required for guildBanAdd and guildBanRemove (no portal toggle needed)
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
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
