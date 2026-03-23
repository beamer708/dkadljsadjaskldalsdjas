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

// Sends the static Unity Vault about panel to the channel — staff only
module.exports = {
  data: new SlashCommandBuilder()
    .setName('about-panel')
    .setDescription('Post the Unity Vault about panel to this channel'),

  async execute(interaction) {
    if (!isStaff(interaction)) {
      return interaction.reply({
        content: 'You do not have permission to use this command.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const container = new ContainerBuilder()
      .setAccentColor(0xF5F0E8)
      // Section 1 — Header
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          '## Unity Vault\nThe resource vault built for the ERLC community.'
        )
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      // Section 2 — Body
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
      // Section 3 — CTA Buttons
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
      // Section 4 — Role Selection
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('**Stay in the loop.** Pick a notification role below.')
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('about_role_select')
            .setPlaceholder('Choose a notification role')
            .setMinValues(0)
            .setMaxValues(1)
            .addOptions(
              new StringSelectMenuOptionBuilder()
                .setLabel('Notifications')
                .setDescription('General announcements')
                .setValue('role_notifications'),
              new StringSelectMenuOptionBuilder()
                .setLabel('Updates')
                .setDescription('Website and bot updates')
                .setValue('role_updates'),
              new StringSelectMenuOptionBuilder()
                .setLabel('Server News')
                .setDescription('Server news and developments')
                .setValue('role_news'),
            )
        )
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      // Section 5 — Footer
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('-# Helping ERLC communities grow smarter.')
      );

    // Send the panel to the channel
    await interaction.channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });

    // Acknowledge silently
    await interaction.reply({ content: 'About panel posted.', flags: MessageFlags.Ephemeral });
  },
};
