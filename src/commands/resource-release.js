const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const { draftMap, buildSetupContainer } = require('../utils/resourceDraft');

// Admin-only command — creates a draft and sends the ephemeral setup panel
module.exports = {
  data: new SlashCommandBuilder()
    .setName('resource-release')
    .setDescription('Post a tool/resource release announcement')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    draftMap.set(interaction.user.id, {
      title: null,
      description: null,
      imageUrl: null,
      sentBy: interaction.user.tag,
    });

    await interaction.reply({
      components: [buildSetupContainer(draftMap.get(interaction.user.id))],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    });
  },
};
