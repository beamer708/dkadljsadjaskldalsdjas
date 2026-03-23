const { MessageFlags } = require('discord.js');
const getConfig = require('../utils/getConfig');

const ROLE_VALUE_MAP = {
  role_notifications: 'notificationsRoleId',
  role_updates:       'updatesRoleId',
  role_news:          'serverNewsRoleId',
};

module.exports = {
  customId: 'role_select',

  async execute(interaction) {
    const member = interaction.member;
    const selected = interaction.values;
    const config = getConfig();

    for (const [value, configKey] of Object.entries(ROLE_VALUE_MAP)) {
      const roleId = config[configKey];
      if (!roleId) continue;

      const isSelected = selected.includes(value);
      const hasRole = member.roles.cache.has(roleId);

      try {
        if (isSelected && !hasRole) {
          await member.roles.add(roleId);
        } else if (!isSelected && hasRole) {
          await member.roles.remove(roleId);
        }
      } catch (err) {
        console.error(`[roleSelect] Failed to update role ${roleId}: ${err.message}`);
      }
    }

    await interaction.reply({
      content: 'Your roles have been updated.',
      flags: MessageFlags.Ephemeral,
    });
  },
};
