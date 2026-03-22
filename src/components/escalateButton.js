const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const config = require('../../config.json');
const { sendLog } = require('../utils/logger');

// Handles the "Escalate to Staff" button — pings staff and updates the ticket status; one-time use
module.exports = {
  customIdPrefix: 'escalate_ticket:',
  async execute(interaction) {
    await interaction.deferReply();

    const ticketId = interaction.customId.split(':')[1];
    const thread = interaction.channel;

    // Locate the original ticket embed message
    let ticketMsg = null;
    try {
      const messages = await thread.messages.fetch({ limit: 20 });
      ticketMsg = messages.find(
        m => m.components.length > 0 &&
          m.components[0].components.some(c => c.customId?.startsWith('escalate_ticket:'))
      );
    } catch (err) {
      console.error('[escalateButton] Failed to fetch messages:', err);
    }

    // Prevent escalation if the escalate button is already disabled
    if (ticketMsg) {
      const escalateComp = ticketMsg.components[0]?.components.find(c => c.customId?.startsWith('escalate_ticket:'));
      if (escalateComp?.disabled) {
        return interaction.editReply({ content: 'This ticket has already been escalated.' });
      }
    }

    // Build the escalation embed
    const escalateEmbed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle(`Ticket Escalated — ${ticketId}`)
      .addFields(
        { name: 'User', value: `${interaction.user.tag}`, inline: true },
        { name: 'Status', value: '🔴 Escalated', inline: true },
        { name: 'Escalated At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
      )
      .setFooter({ text: 'Unity Vault Support' })
      .setTimestamp();

    // Ping staff role and send the escalation embed
    await interaction.editReply({
      content: `<@&${config.staffRoleId}> — this ticket has been escalated.`,
      embeds: [escalateEmbed],
    });

    // Update the original ticket embed: change Status field to Escalated
    if (ticketMsg) {
      try {
        const originalEmbed = ticketMsg.embeds[0];
        const updatedEmbed = EmbedBuilder.from(originalEmbed)
          .spliceFields(
            originalEmbed.fields.findIndex(f => f.name === 'Status'),
            1,
            { name: 'Status', value: '🔴 Escalated', inline: true }
          );

        // Disable only the Escalate button; keep Resolve active
        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`resolve_ticket:${ticketId}`)
            .setLabel('Mark Resolved')
            .setStyle(ButtonStyle.Success)
            .setDisabled(false),
          new ButtonBuilder()
            .setCustomId(`escalate_ticket:${ticketId}`)
            .setLabel('Escalate to Staff')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(true),
        );

        await ticketMsg.edit({ embeds: [updatedEmbed], components: [disabledRow] });
      } catch (err) {
        console.error('[escalateButton] Failed to update original embed:', err);
      }
    }

    // Log the escalation event
    const now = Math.floor(Date.now() / 1000);
    await sendLog(interaction.client, 'action', {
      label: 'ACTION — Ticket Escalated',
      content: `User: ${interaction.user.tag}\nUser ID: ${interaction.user.id}\nTicket ID: ${ticketId}\nEscalated by: ${interaction.user.tag}`,
    });
    await sendLog(interaction.client, 'ticket', {
      label: 'TICKET — Escalated',
      content: `Ticket ID: ${ticketId}\nUser: ${interaction.user.tag}\nStaff pinged: <@&${config.staffRoleId}>\nTimestamp: <t:${now}:F>`,
    });
  },
};
