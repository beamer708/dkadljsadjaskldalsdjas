const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MessageFlags,
} = require('discord.js');
const { isStaff } = require('../utils/permissionCheck');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Post the Unity Vault panel to this channel'),

  async execute(interaction) {
    if (!isStaff(interaction)) {
      return interaction.reply({
        content: 'You do not have permission to use this command.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const container = new ContainerBuilder()
      .setAccentColor(0xF5F0E8)
      // About — Header
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          '## Unity Vault\nThe resource vault built for the ERLC community.'
        )
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      // About — Body
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          'Built for server owners, designers, and communities who want to\n' +
          'grow with clarity. No guesswork. No wasted time.\n\n' +
          'Everything you need is organized and ready to use.'
        )
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      // About — CTA Buttons
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel('Enter Vault')
            .setStyle(ButtonStyle.Link)
            .setURL('https://unityvault.space'),
          new ButtonBuilder()
            .setLabel('Apply to Staff')
            .setStyle(ButtonStyle.Link)
            .setURL('https://unityvault.space/staff-application'),
          new ButtonBuilder()
            .setLabel('Learn More')
            .setStyle(ButtonStyle.Link)
            .setURL('https://unityvault.space/about'),
        )
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      // Roles — Header
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('## Notification Roles')
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      // Roles — Notifications
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
      // Roles — Updates
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
      // Roles — Server News
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
          '-# Helping ERLC communities grow smarter. · Pressing Toggle will add or remove the role.'
        )
      );

    await interaction.channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });

    await interaction.reply({ content: 'Panel posted.', flags: MessageFlags.Ephemeral });
  },
};
