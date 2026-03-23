const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const { getConfig } = require('./getConfig');

// Maps log type keys to config.json channel ID fields
const CHANNEL_MAP = {
  action:     'logChannelId',
  join:       'joinGateChannelId',
  ticket:     'ticketLogChannelId',
  transcript: 'ticketTranscriptChannelId',
};

// Sends a structured Components v2 log container to the channel for the given type.
// data: { label: string, content: string }
async function sendLog(client, type, { label, content }) {
  const channelKey = CHANNEL_MAP[type];
  if (!channelKey) {
    console.warn(`[Logger] Unknown log type: "${type}"`);
    return;
  }

  const channelId = getConfig()[channelKey];
  if (!channelId) {
    console.warn(`[Logger] Config field "${channelKey}" is missing or empty — skipping ${type} log.`);
    return;
  }

  const channel = client.channels.cache.get(channelId);
  if (!channel) {
    console.warn(`[Logger] Could not resolve channel for "${channelKey}" (ID: ${channelId}) — skipping ${type} log.`);
    return;
  }

  const now = Math.floor(Date.now() / 1000);

  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## ${label}`)
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(content)
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`-# <t:${now}:R>`)
    );

  await channel.send({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  }).catch(err => console.error(`[Logger] Failed to send "${type}" log:`, err.message));
}

module.exports = { sendLog };
