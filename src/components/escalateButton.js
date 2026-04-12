const {
  EmbedBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const getConfig = require('../utils/getConfig');
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

    // Build the escalation container
    const now = Math.floor(Date.now() / 1000);
    const escalateContainer = new ContainerBuilder()
      .setAccentColor(0x52D973)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('## Ticket Escalated')
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `This ticket has been escalated to the staff team.\n` +
          `**Ticket ID:** ${ticketId}\n` +
          `**User:** ${interaction.user.tag}\n` +
          `**Time:** <t:${now}:F>`
        )
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('-# @howtoerlc • Staff have been notified.')
      );

    // Ping staff role as a plain message, then send the container
    await interaction.editReply({ content: `<@&${getConfig().staffRoleId}>` });
    await interaction.followUp({
      components: [escalateContainer],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
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
    await sendLog(interaction.client, 'action', {
      label: 'ACTION — Ticket Escalated',
      content: `User: ${interaction.user.tag}\nUser ID: ${interaction.user.id}\nTicket ID: ${ticketId}\nEscalated by: ${interaction.user.tag}`,
    });
    await sendLog(interaction.client, 'ticket', {
      label: 'TICKET — Escalated',
      content: `Ticket ID: ${ticketId}\nUser: ${interaction.user.tag}\nStaff pinged: <@&${getConfig().staffRoleId}>\nTimestamp: <t:${now}:F>`,
    });
  },
};
