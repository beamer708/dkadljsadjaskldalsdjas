const { Events } = require('discord.js');

// Fires once when the bot successfully connects and is ready to receive interactions
module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`[Ready] Logged in as ${client.user.tag}`);
  },
};
