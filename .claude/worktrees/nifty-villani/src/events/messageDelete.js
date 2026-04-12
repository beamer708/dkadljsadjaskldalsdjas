const { Events } = require('discord.js');
const { sendLog } = require('../utils/logger');

module.exports = {
  name: Events.MessageDelete,
  async execute(message) {
    if (!message.author) return;
    if (message.author.bot) return;

    const content = message.content || 'Unknown — message not cached';

    await sendLog(message.client, 'action', {
      label: 'Message Deleted',
      content: [
        `**Author:** ${message.author.tag}`,
        `**Channel:** <#${message.channelId}>`,
        `**Content:** ${content}`,
      ].join('\n'),
    });
  },
};
