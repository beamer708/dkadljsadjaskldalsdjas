const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const { isStaff } = require('../utils/permissionCheck');
const {
  buildApplicationPanel,
  APPLICATIONS_FILE,
  readStore,
  writeStore,
} = require('../server');

module.exports = {
  customIdPrefix: 'app_deny_',

  async execute(interaction) {
    if (!isStaff(interaction)) {
      return interaction.reply({
        content: 'You do not have permission to action applications.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const discordId = interaction.customId.replace('app_deny_', '');
    const store = readStore(APPLICATIONS_FILE);
    const appData = store[discordId];

    if (!appData) {
      return interaction.reply({
        content: 'Application data not found. It may have already been actioned.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const { username } = appData;

    // DM the applicant
    const dmContainer = new ContainerBuilder()
      .setAccentColor(0xF5F0E8)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('## Application Update')
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `Thank you for your interest in Unity Vault.\n\n` +
          `After careful review, we are unable to move forward with your application at this time.\n` +
          `You are welcome to apply again in the future.`
        )
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('-# Unity Vault • Helping ERLC communities grow smarter.')
      );

    try {
      const user = await interaction.client.users.fetch(discordId);
      await user.send({ components: [dmContainer], flags: MessageFlags.IsComponentsV2 });
    } catch (err) {
      console.warn(`[AppDeny] Failed to DM applicant ${discordId}: ${err.message}`);
    }

    // Edit original panel — disable buttons, add status line
    const fullData = { discordId, ...appData };
    await interaction.deferUpdate();
    await interaction.editReply({
      components: [buildApplicationPanel(fullData, {
        disabled: true,
        status: `**Status:** Denied by ${interaction.user.tag}`,
      })],
      flags: MessageFlags.IsComponentsV2,
    });

    // Remove from store
    delete store[discordId];
    writeStore(APPLICATIONS_FILE, store);

    await interaction.followUp({
      content: `Application denied. ${username} has been notified.`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
