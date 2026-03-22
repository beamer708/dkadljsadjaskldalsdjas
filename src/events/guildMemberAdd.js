const { Events } = require('discord.js');
const { sendLog } = require('../utils/logger');

const DAY_MS = 86_400_000;

// Fires when a member joins the server — logs the event and flags suspicious accounts
module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    const user = member.user;
    const accountAgeMs = Date.now() - user.createdTimestamp;
    const accountDays = Math.floor(accountAgeMs / DAY_MS);

    const joinTs    = Math.floor(member.joinedTimestamp / 1000);
    const createdTs = Math.floor(user.createdTimestamp / 1000);

    // Suspicious flag detection
    const flags = [];
    if (accountDays < 7) {
      flags.push('Account less than 7 days old');
    } else if (accountDays < 30) {
      flags.push('Account less than 30 days old (caution)');
    }
    if (/\d{4,}/.test(user.username) || /[^a-zA-Z0-9_.# ]/.test(user.username)) {
      flags.push('Username contains excessive numbers or symbols');
    }

    const statusLine = flags.length > 0
      ? `⚠ Flagged: ${flags.join(' | ')}`
      : 'Status: Clean';

    await sendLog(member.client, 'join', {
      label: 'JOIN — Member Joined',
      content: [
        `User: ${user.tag}`,
        `User ID: ${user.id}`,
        `Account created: <t:${createdTs}:F>`,
        `Joined server: <t:${joinTs}:F>`,
        statusLine,
      ].join('\n'),
    });
  },
};
