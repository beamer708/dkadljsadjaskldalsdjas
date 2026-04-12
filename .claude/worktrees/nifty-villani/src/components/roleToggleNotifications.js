const { toggleRole } = require('../utils/toggleRole');
const getConfig = require('../utils/getConfig');

module.exports = {
  customId: 'role_toggle_notifications',
  async execute(interaction) {
    await toggleRole(interaction, getConfig().notificationsRoleId);
  },
};
