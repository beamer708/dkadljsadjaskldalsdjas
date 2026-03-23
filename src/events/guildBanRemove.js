const { Events, AuditLogEvent } = require('discord.js');
const { sendLog } = require('../utils/logger');

module.exports = {
  name: Events.GuildBanRemove,
  async execute(ban) {
    const { user, guild } = ban;

    let executor = 'Unknown';
    try {
      const logs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanRemove });
      const entry = logs.entries.first();
      if (entry && entry.target?.id === user.id) {
        executor = entry.executor?.tag ?? 'Unknown';
      }
    } catch {
      // Audit log unavailable — non-fatal
    }

    await sendLog(guild.client, 'action', {
      label: 'Member Unbanned',
      content: [
        `**User:** ${user.tag}`,
        `**User ID:** ${user.id}`,
        `**Moderator:** ${executor}`,
      ].join('\n'),
    });
  },
};
