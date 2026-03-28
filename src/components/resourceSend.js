const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
} = require('discord.js');
const getConfig = require('../utils/getConfig');
const { draftMap, buildSentContainer } = require('../utils/resourceDraft');

module.exports = {
  customId: 'resource_send',

  async execute(interaction) {
    const draft = draftMap.get(interaction.user.id);
    if (!draft) {
      return interaction.reply({ content: 'No active draft. Run /resource-release again.', flags: MessageFlags.Ephemeral });
    }

    // Validate required fields
    const missing = [];
    if (!draft.title)       missing.push('Title');
    if (!draft.description) missing.push('Description');

    if (missing.length > 0) {
      return interaction.reply({
        content: `Missing required fields: **${missing.join(', ')}**. Fill them in before sending.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const config = getConfig();
    const resourcesChannel = await interaction.client.channels.fetch(config.resourcesChannelId).catch(() => null);
    if (!resourcesChannel) {
      return interaction.reply({ content: 'Resources channel not found. Check config.', flags: MessageFlags.Ephemeral });
    }

    // Build the public release panel
    const panel = new ContainerBuilder()
      .setAccentColor(0xF5F0E8)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`## ${draft.title}`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );

    // Image section
    if (draft.imageUrl) {
      panel.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(draft.imageUrl)
        )
      );
      panel.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );
    }

    panel.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(draft.description)
    );

    // Link button to website
    if (config.websiteUrl) {
      panel.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );
      panel.addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel('Visit Website')
            .setStyle(ButtonStyle.Link)
            .setURL(config.websiteUrl)
        )
      );
    }

    // Send role ping first, then the panel
    if (config.resourcesPingRoleId) {
      await resourcesChannel.send(`<@&${config.resourcesPingRoleId}>`);
    }
    await resourcesChannel.send({
      components: [panel],
      flags: MessageFlags.IsComponentsV2,
    });

    draftMap.delete(interaction.user.id);

    await interaction.update({
      components: [buildSentContainer(draft)],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
