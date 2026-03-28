const { MessageFlags } = require('discord.js');
const { draftMap, buildCancelledContainer } = require('../utils/resourceDraft');

module.exports = {
  customId: 'resource_cancel',

  async execute(interaction) {
    draftMap.delete(interaction.user.id);

    await interaction.update({
      components: [buildCancelledContainer()],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
