const { Events, AuditLogEvent, ChannelType } = require('discord.js');
const { sendLog } = require('../utils/logger');

const CHANNEL_TYPE_NAMES = {
  [ChannelType.GuildText]:        'Text Channel',
  [ChannelType.GuildVoice]:       'Voice Channel',
  [ChannelType.GuildCategory]:    'Category',
  [ChannelType.GuildAnnouncement]:'Announcement Channel',
  [ChannelType.GuildForum]:       'Forum Channel',
  [ChannelType.GuildStageVoice]:  'Stage Channel',
};

module.exports = {
  name: Events.ChannelCreate,
  async execute(channel) {
    if (!channel.guild) return;

    let executor = 'Unknown';
    try {
      const logs = await channel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelCreate });
      const entry = logs.entries.first();
      if (entry && entry.target?.id === channel.id) {
        executor = entry.executor?.tag ?? 'Unknown';
      }
    } catch {
      // Audit log unavailable — non-fatal
    }

    const typeName = CHANNEL_TYPE_NAMES[channel.type] ?? `Type ${channel.type}`;

    await sendLog(channel.client, 'action', {
      label: 'Channel Created',
      content: [
        `**Name:** ${channel.name}`,
        `**Type:** ${typeName}`,
        `**Created by:** ${executor}`,
      ].join('\n'),
    });
  },
};
