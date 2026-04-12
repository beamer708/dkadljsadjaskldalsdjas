const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const { draftMap, buildSetupContainer } = require('../utils/updateDraft');

// Admin-only command — creates a draft and sends the ephemeral setup panel
module.exports = {
  data: new SlashCommandBuilder()
    .setName('website-update')
    .setDescription('Post a website update announcement')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    // Initialize a fresh draft for this user
    draftMap.set(interaction.user.id, {
      version: null,
      title: null,
      description: null,
      improvements: [],
      bugs: [],
      viewUrl: '',
      sentBy: interaction.user.tag,
    });

    await interaction.reply({
      components: [buildSetupContainer(draftMap.get(interaction.user.id))],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    });
  },
};
