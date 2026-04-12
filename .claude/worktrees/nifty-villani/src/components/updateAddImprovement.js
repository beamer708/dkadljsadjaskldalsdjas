const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const { draftMap, refreshSetupPanel } = require('../utils/updateDraft');

module.exports = {
  customId: 'update_add_improvement',
  modalId: 'modal_add_improvement',

  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('modal_add_improvement')
      .setTitle('Add Improvement');

    const input = new TextInputBuilder()
      .setCustomId('input_improvement')
      .setLabel('Improvement')
      .setPlaceholder('e.g. Redesigned homepage layout')
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
    draft.improvements.push(interaction.fields.getTextInputValue('input_improvement'));
    await refreshSetupPanel(interaction, draft);
  },
};
