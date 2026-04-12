const { Events } = require('discord.js');
const { sendLog } = require('../utils/logger');

module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember) {
    const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
    const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

    for (const [, role] of addedRoles) {
      await sendLog(newMember.client, 'action', {
        label: 'Role Assigned',
        content: [
          `**User:** ${newMember.user.tag}`,
          `**Role Added:** ${role.name}`,
        ].join('\n'),
      });
    }

    for (const [, role] of removedRoles) {
      await sendLog(newMember.client, 'action', {
        label: 'Role Removed',
        content: [
          `**User:** ${newMember.user.tag}`,
          `**Role Removed:** ${role.name}`,
        ].join('\n'),
      });
    }
  },
};
