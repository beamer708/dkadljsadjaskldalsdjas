const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const { draftMap } = require('../utils/updateDraft');

module.exports = {
  customId: 'update_set_version',
  modalId: 'modal_set_version',

  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('modal_set_version')
      .setTitle('Set Version');

    const input = new TextInputBuilder()
      .setCustomId('version_input')
      .setLabel('Version (e.g. v1.2.0)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(32);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
  },

  async handleModal(interaction) {
    const draft = draftMap.get(interaction.user.id);
    if (!draft) {
      return interaction.reply({ content: 'No active draft. Run /website-update again.', flags: 64 });
    }
    draft.version = interaction.fields.getTextInputValue('version_input');
    const { refreshSetupPanel } = require('../utils/updateDraft');
    await refreshSetupPanel(interaction, draft);
  },
};
