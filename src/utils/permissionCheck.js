const config = require('../../config.json');

// Returns true if the interaction member holds the configured staff role
function isStaff(interaction) {
  return interaction.member.roles.cache.has(config.staffRoleId);
}

module.exports = { isStaff };
