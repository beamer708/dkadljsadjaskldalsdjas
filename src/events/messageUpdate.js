const {
  Events,
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

module.exports = {
  name: Events.MessageUpdate,
  async execute(oldMessage, newMessage) {
    if (!newMessage.author) return;
    if (newMessage.author.bot) return;

    // Only log if content actually changed
    if (oldMessage.content === newMessage.content) return;

    const oldContent = oldMessage.content || 'Unknown — message not cached';
    const newContent = newMessage.content || 'Unknown';

    const logChannelId = getConfig().logChannelId;
    if (!logChannelId) return;

    const channel = newMessage.client.channels.cache.get(logChannelId);
    if (!channel) return;

    const now = Math.floor(Date.now() / 1000);

    const container = new ContainerBuilder()
      .setAccentColor(0xF5F0E8)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('## Message Edited')
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Author:** ${newMessage.author.tag}\n` +
          `**Channel:** <#${newMessage.channelId}>\n` +
          `**Before:** ${oldContent}\n` +
          `**After:** ${newContent}`
        )
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel('Jump to Message')
            .setStyle(ButtonStyle.Link)
            .setURL(newMessage.url),
        )
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
      allowedMentions: { parse: [] },
    }).catch(err => console.error('[messageUpdate] Failed to send log:', err.message));
  },
};
