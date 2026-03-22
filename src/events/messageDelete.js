const { Events } = require('discord.js');
const { sendLog } = require('../utils/logger');

// Fires when a message is deleted — logs the content and author to the action log channel
module.exports = {
  name: Events.MessageDelete,
  async execute(message) {
    // Ignore partial messages that were never cached (content unavailable)
    if (!message.author) return;

    // Ignore bot messages
    if (message.author.bot) return;

    const content = message.content
      ? message.content
      : (message.attachments.size > 0 ? '[attachment]' : '[no text content / not cached]');

    await sendLog(message.client, 'action', {
      label: 'ACTION — Message Deleted',
      content: [
        `User: ${message.author.tag}`,
        `User ID: ${message.author.id}`,
        `Channel: <#${message.channelId}>`,
        `Content: ${content}`,
      ].join('\n'),
    });
  },
};
