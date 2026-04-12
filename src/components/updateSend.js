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
const { draftMap, buildSentContainer } = require('../utils/updateDraft');

module.exports = {
  customId: 'update_send',

  async execute(interaction) {
    const draft = draftMap.get(interaction.user.id);
    if (!draft) {
      return interaction.reply({ content: 'No active draft. Run /website-update again.', flags: MessageFlags.Ephemeral });
    }

    // Validate required fields
    const missing = [];
    if (!draft.version)     missing.push('Version');
    if (!draft.title)       missing.push('Title');
    if (!draft.description) missing.push('Description');

    if (missing.length > 0) {
      return interaction.reply({
        content: `Missing required fields: **${missing.join(', ')}**. Fill them in before sending.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const updatesChannel = await interaction.client.channels.fetch(getConfig().updatesChannelId).catch(() => null);
    if (!updatesChannel) {
      return interaction.reply({ content: 'Updates channel not found. Check config.', flags: MessageFlags.Ephemeral });
    }

    // Build the public update panel
    const panel = new ContainerBuilder()
      .setAccentColor(0x52D973)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`## ${draft.title}`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(draft.description)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );

    // Optional image
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

    // Conditional improvements section
    if (draft.improvements.length > 0) {
      const lines = draft.improvements.map(i => `• ${i}`).join('\n');
      panel.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Improvements**\n${lines}`)
      );
      panel.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );
    }

    // Conditional bug fixes section
    if (draft.bugs.length > 0) {
      const lines = draft.bugs.map(b => `• ${b}`).join('\n');
      panel.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Bug Fixes**\n${lines}`)
      );
      panel.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );
    }

    // Fallback if both arrays are empty
    if (draft.improvements.length === 0 && draft.bugs.length === 0) {
      panel.addTextDisplayComponents(
        new TextDisplayBuilder().setContent("**What's Included:** No specific changes listed.")
      );
      panel.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );
    }

    panel.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`-# ${draft.version} • Website Update`)
    );

    // View Update button row if URL is set
    if (draft.viewUrl) {
      panel.addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel('View Update')
            .setStyle(ButtonStyle.Link)
            .setURL(draft.viewUrl)
        )
      );
    }

    // Send role ping first, then the panel
    await updatesChannel.send(`<@&${getConfig().updatesPingRoleId}>`);
    await updatesChannel.send({
      components: [panel],
      flags: MessageFlags.IsComponentsV2,
    });

    // Update the ephemeral setup panel to sent state
    draftMap.delete(interaction.user.id);

    await interaction.update({
      components: [buildSentContainer(draft)],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
