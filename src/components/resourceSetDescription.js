const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const { draftMap, refreshSetupPanel } = require('../utils/resourceDraft');

module.exports = {
  customId: 'resource_set_description',
  modalId: 'modal_resource_set_description',

  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('modal_resource_set_description')
      .setTitle('Set Description');

    const input = new TextInputBuilder()
      .setCustomId('resource_description_input')
      .setLabel('Resource description')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(1000);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
  },

  async handleModal(interaction) {
    const draft = draftMap.get(interaction.user.id);
    if (!draft) {
      return interaction.reply({ content: 'No active draft. Run /resource-release again.', flags: 64 });
    }
    draft.description = interaction.fields.getTextInputValue('resource_description_input');
    await refreshSetupPanel(interaction, draft);
  },
};
