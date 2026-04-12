const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const { draftMap, refreshSetupPanel } = require('../utils/updateDraft');

module.exports = {
  customId: 'update_add_bug',
  modalId: 'modal_add_bug',

  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('modal_add_bug')
      .setTitle('Add Bug Fix');

    const input = new TextInputBuilder()
      .setCustomId('input_bug')
      .setLabel('Bug Fix')
      .setPlaceholder('e.g. Fixed broken navigation link')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(200);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
  },

  async handleModal(interaction) {
    const draft = draftMap.get(interaction.user.id);
    if (!draft) {
      return interaction.reply({ content: 'No active draft. Run /website-update again.', flags: 64 });
    }
    draft.bugs.push(interaction.fields.getTextInputValue('input_bug'));
    await refreshSetupPanel(interaction, draft);
  },
};
