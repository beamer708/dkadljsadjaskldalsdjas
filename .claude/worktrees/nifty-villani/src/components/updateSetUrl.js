const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const { draftMap, refreshSetupPanel } = require('../utils/updateDraft');

module.exports = {
  customId: 'update_set_url',
  modalId: 'modal_set_url',

  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('modal_set_url')
      .setTitle('Set View URL');

    const input = new TextInputBuilder()
      .setCustomId('input_url')
      .setLabel('Update URL')
      .setPlaceholder('e.g. https://unityvault.space/updates/2-1-0')
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setMaxLength(500);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
  },

  async handleModal(interaction) {
    const draft = draftMap.get(interaction.user.id);
    if (!draft) {
      return interaction.reply({ content: 'No active draft. Run /website-update again.', flags: 64 });
    }
    draft.viewUrl = interaction.fields.getTextInputValue('input_url').trim();
    await refreshSetupPanel(interaction, draft);
  },
};
