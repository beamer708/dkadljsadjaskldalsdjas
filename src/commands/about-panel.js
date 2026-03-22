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
        new TextDisplayBuilder().setContent('## Build Something Worth Joining.')
      )
      // Separator
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      // Section 2 — Body
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          'Most ERLC servers fail quietly.\n' +
          'Not because the idea was wrong. Because the foundation was not there.\n\n' +
          '**Unity Vault** gives you the resources, structure, and direction to build a server that lasts.\n' +
          'No guesswork. No wasted time. Clear guidance and curated tools, ready to use.'
        )
      )
      // Separator
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      // Section 3 — Founded line
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          '**Ready to start?** Visit the website and take the first step.\n' +
          '-# Unity Vault • Helping ERLC communities grow smarter.'
        )
      )
      // Separator
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      // Section 4 — Link buttons
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel('Visit Website')
            .setStyle(ButtonStyle.Link)
            .setURL('https://unityvault.space'),
          new ButtonBuilder()
            .setLabel('Apply')
            .setStyle(ButtonStyle.Link)
            .setURL('https://unityvault.space/staff-application'),
          new ButtonBuilder()
            .setLabel('Learn More')
            .setStyle(ButtonStyle.Link)
            .setURL('https://unityvault.space/about'),
        )
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
