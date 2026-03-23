const { MessageFlags } = require('discord.js');

module.exports = {
  customIdPrefix: 'sug_thread_',
  async execute(interaction) {
    const threadId = interaction.customId.replace('sug_thread_', '');
    await interaction.reply({
      content: `Discussion thread: <#${threadId}>`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
