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
const getConfig = require('../utils/getConfig');

// Posts the about panel to the current channel and the role panel to the roles channel — staff only
module.exports = {
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Post the Unity Vault about panel and role panel'),

  async execute(interaction) {
    console.log('panel command executed');
    if (!isStaff(interaction)) {
      return interaction.reply({
        content: 'You do not have permission to use this command.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const { rolePanelChannelId } = getConfig();

    // --- About Panel ---
    const aboutContainer = new ContainerBuilder()
      .setAccentColor(0xF5F0E8)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          '## Unity Vault\nThe resource vault built for the ERLC community.'
        )
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
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
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('-# Helping ERLC communities grow smarter.')
      );

    await interaction.channel.send({
      components: [aboutContainer],
      flags: MessageFlags.IsComponentsV2,
    });

    // --- Role Panel ---
    if (rolePanelChannelId) {
      const roleChannel = await interaction.client.channels.fetch(rolePanelChannelId);
      if (roleChannel) {
        const roleContainer = new ContainerBuilder()
          .setAccentColor(0xF5F0E8)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('## Notification Roles')
          )
          .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
          )
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
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              '-# Pressing Toggle will add the role if you do not have it, or remove it if you do.'
            )
          );

        await roleChannel.send({
          components: [roleContainer],
          flags: MessageFlags.IsComponentsV2,
        });
      }
    }

    await interaction.reply({ content: 'Panels posted.', flags: MessageFlags.Ephemeral });
  },
};
