const { getConfig } = require('./getConfig');

// Returns true if the interaction member holds the configured staff role
function isStaff(interaction) {
  return interaction.member.roles.cache.has(getConfig().staffRoleId);
}

module.exports = { isStaff };
