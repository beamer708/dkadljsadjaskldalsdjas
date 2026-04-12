const { toggleRole } = require('../utils/toggleRole');
const getConfig = require('../utils/getConfig');
const { MessageFlags } = require('discord.js');

const ROLE_MAP = {
  role_notifications: 'notificationsRoleId',
  role_updates:       'updatesRoleId',
  role_news:          'serverNewsRoleId',
};

module.exports = {
  customId: 'about_role_select',

  async execute(interaction) {
    const value = interaction.values[0];
    const configKey = ROLE_MAP[value];

    if (!configKey) {
      return interaction.reply({
        content: 'Unknown role selection.',
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [] },
      });
    }

    const roleId = getConfig()[configKey];
    if (!roleId) {
      return interaction.reply({
        content: 'This role is not configured. Please contact a staff member.',
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [] },
      });
    }

    await toggleRole(interaction, roleId);
  },
};
