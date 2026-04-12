const fs = require('fs');
const path = require('path');
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
  MessageFlags,
} = require('discord.js');
const { sendLog } = require('./logger');
const getConfig = require('./getConfig');

// Simple promise-based delay
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Single entry point for all ticket close operations — called from resolveButton and close-ticket
async function closeTicket(channel, ticketId, closedByUser, client) {
  // Resolve ticket opener from channel permission overwrites (member type = 1, not the bot)
  const openerOverwrite = channel.permissionOverwrites.cache.find(
    ow => ow.type === 1 && ow.id !== client.user.id
  );
  const openerUser = openerOverwrite
    ? await client.users.fetch(openerOverwrite.id).catch(() => null)
    : null;

  // STEP 1 — DM the ticket opener
  if (openerUser) {
    try {
      const resolvedDm = new ContainerBuilder()
        .setAccentColor(0x52D973)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('## Ticket Resolved')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            'Your support ticket has been marked as resolved.\n' +
            'If you need further assistance, feel free to open a new ticket.'
          )
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('-# @howtoerlc — Built for ERLC communities that mean business.')
        );
      await openerUser.send({ components: [resolvedDm], flags: MessageFlags.IsComponentsV2 });
    } catch {
      // DMs may be disabled — non-fatal
    }
  }

  // STEP 2 — Send loading message to the ticket channel
  const loadingContainer = new ContainerBuilder()
    .setAccentColor(0x52D973)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('## Closing Ticket')
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        'This ticket will be closing shortly.\nPlease wait while we finalize everything.'
      )
    );

  let loadingMsg = null;
  try {
    loadingMsg = await channel.send({
      components: [loadingContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  } catch (err) {
    console.error('[closeTicket] Failed to send loading message:', err.message);
  }

  // STEP 3 — Run transcript + logs + 4s delay concurrently
  await Promise.all([
    generateAndSendTranscript(channel, ticketId, closedByUser, openerUser, client),
    disableTicketButtons(channel, ticketId),
    sendCloseLogs(client, ticketId, openerUser, closedByUser),
    delay(4000),
  ]);

  // STEP 4 — Edit loading message to closed confirmation
  if (loadingMsg) {
    const closedContainer = new ContainerBuilder()
      .setAccentColor(0x52D973)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('## Ticket Closed')
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          'This ticket has been closed.\nThank you for reaching out to @howtoerlc.'
        )
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          '-# @howtoerlc — Built for ERLC communities that mean business.'
        )
      );

    await loadingMsg.edit({
      components: [closedContainer],
      flags: MessageFlags.IsComponentsV2,
    }).catch(err => console.error('[closeTicket] Failed to edit loading message:', err.message));
  }

  // STEP 5 — Delete the ticket channel (3s grace period so the closed message is visible)
  await delay(3000);
  await channel.delete('Ticket closed')
    .catch(err => console.error('[closeTicket] Failed to delete channel:', err.message));
}

// Disables both action buttons on the original ticket embed
async function disableTicketButtons(channel, ticketId) {
  try {
    const messages = await channel.messages.fetch({ limit: 20 });
    const ticketMsg = messages.find(
      m => m.components.length > 0 &&
        m.components[0].components.some(c => c.customId?.startsWith('resolve_ticket:'))
    );
    if (!ticketMsg) return;

    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`resolve_ticket:${ticketId}`)
        .setLabel('Mark Resolved')
        .setStyle(ButtonStyle.Success)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId(`escalate_ticket:${ticketId}`)
        .setLabel('Escalate to Staff')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(true),
    );
    await ticketMsg.edit({ components: [disabledRow] });
  } catch (err) {
    console.error('[closeTicket] Failed to disable buttons:', err.message);
  }
}

// Fetches all messages, saves transcript to disk, and uploads to transcript channel
async function generateAndSendTranscript(channel, ticketId, closedByUser, openerUser, client) {
  // Paginate message fetch to collect all messages
  const allMessages = [];
  let lastId;
  try {
    while (true) {
      const options = { limit: 100 };
      if (lastId) options.before = lastId;
      const fetched = await channel.messages.fetch(options);
      if (fetched.size === 0) break;
      allMessages.push(...fetched.values());
      lastId = fetched.last().id;
      if (fetched.size < 100) break;
    }
  } catch (err) {
    console.error('[closeTicket] Failed to fetch messages for transcript:', err.message);
    return;
  }

  // Filter system messages, sort oldest first
  const filtered = allMessages
    .filter(m => !m.system)
    .sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  // Format each message as [ISO timestamp] username: content
  const lines = filtered.map(m => {
    const ts = new Date(m.createdTimestamp).toISOString();
    const content = m.content
      ? m.content
      : (m.attachments.size > 0 || m.embeds.length > 0 ? '[attachment or embed]' : '[no content]');
    return `[${ts}] ${m.author.tag}: ${content}`;
  });

  const transcriptText = [
    `Transcript: ${ticketId}`,
    `Opened by: ${openerUser?.tag ?? 'Unknown'}`,
    `Closed by: ${closedByUser.tag}`,
    `Messages: ${filtered.length}`,
    `Generated: ${new Date().toISOString()}`,
    '─'.repeat(60),
    ...lines,
  ].join('\n');

  // Ensure /transcripts directory exists
  const transcriptsDir = path.join(__dirname, '../../transcripts');
  if (!fs.existsSync(transcriptsDir)) {
    fs.mkdirSync(transcriptsDir, { recursive: true });
  }

  const filename = `transcript-${ticketId}.txt`;
  const filepath = path.join(transcriptsDir, filename);
  fs.writeFileSync(filepath, transcriptText, 'utf-8');

  // Resolve transcript channel
  const transcriptChannel = client.channels.cache.get(getConfig().ticketTranscriptChannelId);
  if (!transcriptChannel) {
    console.warn('[closeTicket] Transcript channel not found (ticketTranscriptChannelId).');
    return;
  }

  // Send the info container first (Components v2 — no file attachment)
  const transcriptContainer = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('## Ticket Transcript')
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `Ticket ID: ${ticketId}\nUser: ${openerUser?.tag ?? 'Unknown'}\nClosed by: ${closedByUser.tag}\nMessages logged: ${filtered.length}`
      )
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('-# Transcript attached below.')
    );

  await transcriptChannel.send({
    components: [transcriptContainer],
    flags: MessageFlags.IsComponentsV2,
  }).catch(err => console.error('[closeTicket] Failed to send transcript container:', err.message));

  // Send the file as a plain message — IsComponentsV2 flag blocks file attachments
  const attachment = new AttachmentBuilder(filepath, { name: filename });
  await transcriptChannel.send({
    files: [attachment],
  }).catch(err => console.error('[closeTicket] Failed to send transcript file:', err.message));
}

// Sends action log and ticket log for the close event
async function sendCloseLogs(client, ticketId, openerUser, closedByUser) {
  const now = Math.floor(Date.now() / 1000);
  const userTag = openerUser?.tag ?? 'Unknown';
  const userId = openerUser?.id ?? 'Unknown';

  await sendLog(client, 'action', {
    label: 'ACTION — Ticket Closed',
    content: `User: ${userTag}\nUser ID: ${userId}\nTicket ID: ${ticketId}\nClosed by: ${closedByUser.tag}`,
  });

  await sendLog(client, 'ticket', {
    label: 'TICKET — Closed',
    content: `Ticket ID: ${ticketId}\nUser: ${userTag}\nClosed by: ${closedByUser.tag}\nResolution: Closed\nTimestamp: <t:${now}:F>`,
  });
}

module.exports = { closeTicket };
