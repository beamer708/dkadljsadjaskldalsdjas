const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const { draftMap } = require('../utils/updateDraft');

module.exports = {
  customId: 'update_set_description',
  modalId: 'modal_set_description',

  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('modal_set_description')
      .setTitle('Set Description');

    const input = new TextInputBuilder()
      .setCustomId('description_input')
      .setLabel('Update description')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(1000);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
  },

  async handleModal(interaction) {
    const draft = draftMap.get(interaction.user.id);
    if (!draft) {
      return interaction.reply({ content: 'No active draft. Run /website-update again.', flags: 64 });
    }
    draft.description = interaction.fields.getTextInputValue('description_input');
    const { refreshSetupPanel } = require('../utils/updateDraft');
    await refreshSetupPanel(interaction, draft);
  },
};
