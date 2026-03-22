const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const { draftMap } = require('../utils/updateDraft');

module.exports = {
  customId: 'update_set_title',
  modalId: 'modal_set_title',

  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('modal_set_title')
      .setTitle('Set Title');

    const input = new TextInputBuilder()
      .setCustomId('title_input')
      .setLabel('Update title')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(100);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
  },

  async handleModal(interaction) {
    const draft = draftMap.get(interaction.user.id);
    if (!draft) {
      return interaction.reply({ content: 'No active draft. Run /website-update again.', flags: 64 });
    }
    draft.title = interaction.fields.getTextInputValue('title_input');
    const { refreshSetupPanel } = require('../utils/updateDraft');
    await refreshSetupPanel(interaction, draft);
  },
};
