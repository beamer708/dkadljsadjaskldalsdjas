const { Events } = require('discord.js');
const { sendLog } = require('../utils/logger');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    const user = member.user;
    const createdTs = Math.floor(user.createdTimestamp / 1000);

    await sendLog(member.client, 'join', {
      label: 'Member Left',
      content: [
        `**User:** ${user.tag}`,
        `**User ID:** ${user.id}`,
        `**Account Created:** <t:${createdTs}:F>`,
      ].join('\n'),
    });
  },
};
