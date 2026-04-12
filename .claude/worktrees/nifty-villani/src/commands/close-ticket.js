const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { isStaff } = require('../utils/permissionCheck');
const { closeTicket } = require('../utils/closeTicket');
const getConfig = require('../utils/getConfig');

// Staff-only command — delegates all close logic to closeTicket utility
module.exports = {
  data: new SlashCommandBuilder()
    .setName('close-ticket')
    .setDescription('(Staff only) Close the current support ticket channel'),

  async execute(interaction) {
    if (!isStaff(interaction)) {
      return interaction.reply({
        content: 'You do not have permission to use this command.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const channel = interaction.channel;

    // Ensure this command is used inside a ticket channel in the support category
    if (channel.parentId !== getConfig().supportCategoryId) {
      return interaction.reply({
        content: 'This command can only be used inside a ticket channel.',
        flags: MessageFlags.Ephemeral,
      });
    }

    // Extract ticket ID from channel name (format: ticket-001-username)
    const ticketIdMatch = channel.name.match(/ticket-\d+/i);
    const ticketId = ticketIdMatch ? ticketIdMatch[0].toUpperCase() : 'UNKNOWN';

    // Acknowledge the command silently before the close sequence begins
    await interaction.reply({ content: 'Closing ticket...', flags: MessageFlags.Ephemeral });

    await closeTicket(channel, ticketId, interaction.user, interaction.client);
  },
};
