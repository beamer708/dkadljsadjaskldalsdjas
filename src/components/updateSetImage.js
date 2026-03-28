const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const { draftMap, refreshSetupPanel } = require('../utils/updateDraft');

module.exports = {
  customId: 'update_set_image',
  modalId: 'modal_update_set_image',

  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('modal_update_set_image')
      .setTitle('Set Image');

    const input = new TextInputBuilder()
      .setCustomId('update_image_input')
      .setLabel('Image URL')
      .setPlaceholder('e.g. https://example.com/image.png')
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
    draft.imageUrl = interaction.fields.getTextInputValue('update_image_input').trim() || null;
    await refreshSetupPanel(interaction, draft);
  },
};
