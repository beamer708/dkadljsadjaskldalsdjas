const path = require('path');
const raw = require(path.join(__dirname, '../../config.json'));

// Merge environment variables (priority) with config.json (fallback).
// Mambahost injects BOT_TOKEN, CLIENT_ID, and GUILD_ID at runtime.
const _config = {
  ...raw,
  token:      process.env.BOT_TOKEN   || raw.token,
  clientId:   process.env.CLIENT_ID   || raw.clientId,
  guildId:    process.env.GUILD_ID    || raw.guildId,
  apiSecret:  process.env.API_SECRET  || raw.apiSecret  || '',
  websiteUrl: process.env.WEBSITE_URL || raw.websiteUrl || '',
};

function getConfig() {
  return _config;
}

module.exports = { getConfig };
