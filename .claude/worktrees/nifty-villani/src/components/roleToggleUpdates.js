const { toggleRole } = require('../utils/toggleRole');
const getConfig = require('../utils/getConfig');

module.exports = {
  customId: 'role_toggle_updates',
  async execute(interaction) {
    await toggleRole(interaction, getConfig().updatesRoleId);
  },
};
