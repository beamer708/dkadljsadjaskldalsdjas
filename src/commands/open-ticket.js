const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  SectionBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');

// Sends the Components v2 @howtoerlc support panel with a Get Assistance button
module.exports = {
  data: new SlashCommandBuilder()
    .setName('open-ticket')
    .setDescription('Opens the @howtoerlc support panel'),

  async execute(interaction) {
    const container = new ContainerBuilder()
      .setAccentColor(0x52D973)
      // Section 1 — Header
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('## @howtoerlc')
      )
      // Separator
      .addSeparatorComponents(
        new SeparatorBuilder()
          .setSpacing(SeparatorSpacingSize.Small)
          .setDivider(true)
      )
      // Section 2 — Call to action: text left, button right
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              'Having an issue with the **@howtoerlc website** or need help with something in the server?\n\nPress **Get Assistance** below to open a support ticket.\nA staff member will be with you shortly.'
            )
          )
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId('open_ticket_button')
              .setLabel('Get Assistance')
              .setStyle(ButtonStyle.Secondary)
          )
      )
      // Separator
      .addSeparatorComponents(
        new SeparatorBuilder()
          .setSpacing(SeparatorSpacingSize.Small)
          .setDivider(true)
      )
      // Section 4 — Footer subtext
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('-# @howtoerlc — Built for ERLC communities that mean business.')
      );

    // Send the panel directly to the channel
    await interaction.channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });

    // Acknowledge the interaction silently
    await interaction.reply({ content: 'Support panel posted.', flags: MessageFlags.Ephemeral });
  },
};
