const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
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

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('role_select')
      .setPlaceholder('Choose your roles')
      .setMinValues(0)
      .setMaxValues(3)
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('Notifications')
          .setDescription('Receive general Unity Vault notifications')
          .setValue('role_notifications')
          .setEmoji('🔔'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Updates')
          .setDescription('Get notified about website and bot updates')
          .setValue('role_updates')
          .setEmoji('📢'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Server News')
          .setDescription('Stay informed on Unity Vault server news')
          .setValue('role_news')
          .setEmoji('📰'),
      );

    const container = new ContainerBuilder()
      .setAccentColor(0xF5F0E8)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('## Select Your Roles')
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          'Use the menu below to assign yourself notification roles.\nSelect the updates you want to receive.'
        )
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(selectMenu)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('-# You can update your roles at any time.')
      );

    await roleChannel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });

    await interaction.reply({ content: 'Role panel posted.', flags: MessageFlags.Ephemeral });
  },
};
