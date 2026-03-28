const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const { draftMap, refreshSetupPanel } = require('../utils/resourceDraft');

module.exports = {
  customId: 'resource_set_title',
  modalId: 'modal_resource_set_title',

  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('modal_resource_set_title')
      .setTitle('Set Title');

    const input = new TextInputBuilder()
      .setCustomId('resource_title_input')
      .setLabel('Resource title')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(100);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
  },

  async handleModal(interaction) {
    const draft = draftMap.get(interaction.user.id);
    if (!draft) {
      return interaction.reply({ content: 'No active draft. Run /resource-release again.', flags: 64 });
    }
    draft.title = interaction.fields.getTextInputValue('resource_title_input');
    await refreshSetupPanel(interaction, draft);
  },
};
