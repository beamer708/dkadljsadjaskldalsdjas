const { MessageFlags, PermissionFlagsBits } = require('discord.js');
const {
  buildPartnershipPanel,
  PARTNERSHIPS_FILE,
  readStore,
  writeStore,
} = require('../server');

module.exports = {
  customIdPrefix: 'partner_approve_',

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: 'You do not have permission to action partnership applications.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const key = interaction.customId.replace('partner_approve_', '');
    const store = readStore(PARTNERSHIPS_FILE);
    const partnerData = store[key];

    if (!partnerData) {
      return interaction.reply({
        content: 'Partnership data not found. It may have already been actioned.',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (partnerData.status !== 'pending') {
      return interaction.reply({
        content: 'This application has already been actioned.',
        flags: MessageFlags.Ephemeral,
      });
    }

    partnerData.status = 'approved';
    store[key] = partnerData;
    writeStore(PARTNERSHIPS_FILE, store);

    await interaction.deferUpdate();
    await interaction.editReply({
      components: [buildPartnershipPanel(partnerData, {
        disabled: true,
        status: `**Status:** Approved by ${interaction.user.tag}`,
      })],
      flags: MessageFlags.IsComponentsV2,
    });

    await interaction.followUp({
      content: 'Partnership approved.',
      flags: MessageFlags.Ephemeral,
    });
  },
};
