const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  PermissionFlagsBits,
} = require('discord.js');
const getConfig = require('../utils/getConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role-panel')
    .setDescription('Post the role selection panel to the roles channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const rolePanelChannelId = getConfig().rolePanelChannelId;
    if (!rolePanelChannelId) {
      return interaction.reply({
        content: 'rolePanelChannelId is not configured.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const roleChannel = await interaction.client.channels.fetch(rolePanelChannelId);
    if (!roleChannel) {
      return interaction.reply({
        content: 'Could not find the role panel channel.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const container = new ContainerBuilder()
      .setAccentColor(0xF5F0E8)
      // Header
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('## Notification Roles')
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      // Notifications row
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('🔔 **Notifications**')
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('role_toggle_notifications')
            .setLabel('Toggle')
            .setStyle(ButtonStyle.Secondary),
        )
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      // Updates row
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('📢 **Updates**')
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('role_toggle_updates')
            .setLabel('Toggle')
            .setStyle(ButtonStyle.Secondary),
        )
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      // Server News row
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('📰 **Server News**')
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('role_toggle_news')
            .setLabel('Toggle')
            .setStyle(ButtonStyle.Secondary),
        )
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      // Footer
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          '-# Pressing Toggle will add the role if you do not have it, or remove it if you do.'
        )
      );

    await roleChannel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });

    await interaction.reply({ content: 'Role panel posted.', flags: MessageFlags.Ephemeral });
  },
};
