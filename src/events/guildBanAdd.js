const { Events, AuditLogEvent } = require('discord.js');
const { sendLog } = require('../utils/logger');

module.exports = {
  name: Events.GuildBanAdd,
  async execute(ban) {
    const { user, guild } = ban;

    let executor = 'Unknown';
    let reason = 'No reason provided';
    try {
      const logs = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanAdd });
      const entry = logs.entries.first();
      if (entry && entry.target?.id === user.id) {
        executor = entry.executor?.tag ?? 'Unknown';
        reason = entry.reason ?? 'No reason provided';
      }
    } catch {
      // Audit log unavailable — non-fatal
    }

    await sendLog(guild.client, 'action', {
      label: 'Member Banned',
      content: [
        `**User:** ${user.tag}`,
        `**User ID:** ${user.id}`,
        `**Moderator:** ${executor}`,
        `**Reason:** ${reason}`,
      ].join('\n'),
    });
  },
};
