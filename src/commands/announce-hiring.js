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

module.exports = {
  data: new SlashCommandBuilder()
    .setName('announce-hiring')
    .setDescription('Post a hiring announcement to this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const container = new ContainerBuilder()
      .setAccentColor(0xF5F0E8)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('## We Are Hiring')
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          'Unity Vault is opening applications for new staff members.\n\n' +
          'We are looking for dedicated individuals to help organize, moderate,\n' +
          'and grow the Unity Vault community.\n\n' +
          'If you are structured, consistent, and passionate about the ERLC\n' +
          'community — we want to hear from you.'
        )
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          '**What we are looking for:**\n' +
          'Organized and reliable team members\n' +
          'Clear communicators\n' +
          'People who care about the ERLC community'
        )
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('Press Apply below to submit your application.')
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel('Apply Now')
            .setStyle(ButtonStyle.Link)
            .setURL('https://unityvault.space/staff-application'),
        )
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('-# Unity Vault • Helping ERLC communities grow smarter.')
      );

    await interaction.channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });

    await interaction.reply({ content: 'Hiring announcement posted.', flags: MessageFlags.Ephemeral });
  },
};
