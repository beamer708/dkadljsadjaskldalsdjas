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

// Sends the Components v2 Unity Vault support panel with a Get Assistance button
module.exports = {
  data: new SlashCommandBuilder()
    .setName('open-ticket')
    .setDescription('Opens the Unity Vault support panel'),

  async execute(interaction) {
    const container = new ContainerBuilder()
      .setAccentColor(0xF5F0E8)
      // Section 1 — Header
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('## Unity Vault')
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
              'Having an issue with the **Unity Vault website** or need help with something in the server?\n\nPress **Get Assistance** below to open a support ticket.\nA staff member will be with you shortly.'
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
        new TextDisplayBuilder().setContent('-# Helping ERLC communities grow smarter.')
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
