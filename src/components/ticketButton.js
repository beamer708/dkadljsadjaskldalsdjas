const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ChannelType,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const getConfig = require('../utils/getConfig');
const { generateTicketId } = require('../utils/ticketId');
const { sendLog } = require('../utils/logger');

// Handles the "Get Assistance" button — creates a private channel in the support category
module.exports = {
  customId: 'open_ticket_button',
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild;
    const member = interaction.member;

    const ticketId = generateTicketId();

    // Sanitise username for use as a Discord channel name (lowercase, hyphens only)
    const safeName = member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 40);
    const channelName = `${ticketId.toLowerCase()}-${safeName}`;

    // Create a private text channel inside the support category
    let ticketChannel;
    try {
      ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: getConfig().supportCategoryId,
        permissionOverwrites: [
          {
            id: guild.id, // deny @everyone
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: member.id, // allow ticket opener
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
          },
          {
            id: getConfig().staffRoleId, // allow staff role
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages],
          },
          {
            id: interaction.client.user.id, // allow the bot itself
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages],
          },
        ],
        reason: `Support ticket opened by ${member.user.tag}`,
      });
    } catch (err) {
      console.error('[ticketButton] Failed to create channel:', err.message);
      return interaction.editReply({ content: `Could not create a ticket channel: ${err.message}` });
    }

    // Build the ticket embed
    const ticketEmbed = new EmbedBuilder()
      .setColor(0x52D973)
      .setTitle(`Support Ticket — ${ticketId}`)
      .addFields(
        { name: 'User', value: `${member.user.tag} (<@${member.user.id}>)`, inline: true },
        { name: 'User ID', value: member.user.id, inline: true },
        { name: 'Status', value: '🟢 Open', inline: true },
        { name: 'Opened', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
      )
      .setFooter({ text: '@howtoerlc Support' })
      .setTimestamp();

    // Build the action row with Resolve and Escalate buttons
    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`resolve_ticket:${ticketId}`)
        .setLabel('Mark Resolved')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`escalate_ticket:${ticketId}`)
        .setLabel('Escalate to Staff')
        .setStyle(ButtonStyle.Danger),
    );

    // Send the ticket embed to the new private channel
    await ticketChannel.send({ content: `<@${member.id}>`, embeds: [ticketEmbed], components: [actionRow] });

    // Confirm to the user where their ticket was created
    await interaction.editReply({ content: `Your ticket has been opened: <#${ticketChannel.id}>` });

    // DM the ticket opener
    try {
      const dmContainer = new ContainerBuilder()
        .setAccentColor(0x52D973)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('## Ticket Opened')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            'Your support ticket has been opened with the @howtoerlc team.\n' +
            'A staff member will be with you shortly.'
          )
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('-# @howtoerlc — Built for ERLC communities that mean business.')
        );
      await member.user.send({ components: [dmContainer], flags: MessageFlags.IsComponentsV2 });
    } catch {
      // DMs may be disabled — non-fatal
    }

    // Log the ticket open event
    const now = Math.floor(Date.now() / 1000);
    await sendLog(interaction.client, 'action', {
      label: 'ACTION — Ticket Opened',
      content: `User: ${member.user.tag}\nUser ID: ${member.user.id}\nTicket ID: ${ticketId}`,
    });
    await sendLog(interaction.client, 'ticket', {
      label: 'TICKET — Opened',
      content: `Ticket ID: ${ticketId}\nUser: ${member.user.tag}\nTimestamp: <t:${now}:F>`,
    });
  },
};
