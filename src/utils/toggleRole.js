const { MessageFlags } = require('discord.js');

async function toggleRole(interaction, roleId) {
  try {
    const member = interaction.member;
    const hasRole = member.roles.cache.has(roleId);

    if (hasRole) {
      await member.roles.remove(roleId);
      await interaction.reply({
        content: 'The role has been removed.',
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [] },
      });
    } else {
      await member.roles.add(roleId);
      await interaction.reply({
        content: 'The role has been added.',
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [] },
      });
    }
  } catch (err) {
    console.error('[toggleRole] Error:', err.message);
    const msg = {
      content: 'Something went wrong. Please try again.',
      flags: MessageFlags.Ephemeral,
      allowedMentions: { parse: [] },
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(msg);
    } else {
      await interaction.reply(msg);
    }
  }
}

module.exports = { toggleRole };
