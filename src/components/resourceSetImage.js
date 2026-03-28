const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const { draftMap, refreshSetupPanel } = require('../utils/resourceDraft');

module.exports = {
  customId: 'resource_set_image',
  modalId: 'modal_resource_set_image',

  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('modal_resource_set_image')
      .setTitle('Set Image');

    const input = new TextInputBuilder()
      .setCustomId('resource_image_input')
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
      return interaction.reply({ content: 'No active draft. Run /resource-release again.', flags: 64 });
    }
    draft.imageUrl = interaction.fields.getTextInputValue('resource_image_input').trim() || null;
    await refreshSetupPanel(interaction, draft);
  },
};
