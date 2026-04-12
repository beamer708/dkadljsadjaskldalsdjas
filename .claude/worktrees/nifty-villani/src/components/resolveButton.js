const { MessageFlags } = require('discord.js');
const { isStaff } = require('../utils/permissionCheck');
const { closeTicket } = require('../utils/closeTicket');

// Handles the "Mark Resolved" button — delegates all close logic to closeTicket utility
module.exports = {
  customIdPrefix: 'resolve_ticket:',
  async execute(interaction) {
    const ticketId = interaction.customId.split(':')[1];
    const channel = interaction.channel;

    // Allow ticket opener (has explicit permission overwrite) or staff to resolve
    const hasOverwrite = channel.permissionOverwrites.cache.has(interaction.user.id);
    if (!hasOverwrite && !isStaff(interaction)) {
      return interaction.reply({
        content: 'Only the ticket owner or staff can resolve this ticket.',
        flags: MessageFlags.Ephemeral,
      });
    }

    // Acknowledge the interaction silently before the close sequence begins
    await interaction.reply({ content: 'Closing ticket...', flags: MessageFlags.Ephemeral });

    await closeTicket(channel, ticketId, interaction.user, interaction.client);
  },
};
