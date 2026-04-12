const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const getConfig = require('../utils/getConfig');
const { isStaff } = require('../utils/permissionCheck');
const {
  buildApplicationPanel,
  APPLICATIONS_FILE,
  readStore,
  writeStore,
} = require('../server');

// Maps roleApplying value to the config key holding the role ID
const ROLE_MAP = {
  'Community Team': 'communityTeamRoleId',
  'Beta Tester': 'betaTesterRoleId',
};

module.exports = {
  customIdPrefix: 'app_accept_',

  async execute(interaction) {
    if (!isStaff(interaction)) {
      return interaction.reply({
        content: 'You do not have permission to action applications.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const discordId = interaction.customId.replace('app_accept_', '');
    const store = readStore(APPLICATIONS_FILE);
    const appData = store[discordId];

    if (!appData) {
      return interaction.reply({
        content: 'Application data not found. It may have already been actioned.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const { username, roleApplying } = appData;

    // Assign role based on roleApplying value
    const roleConfigKey = ROLE_MAP[roleApplying];
    if (roleConfigKey && getConfig()[roleConfigKey]) {
      try {
        const member = await interaction.guild.members.fetch(discordId);
        await member.roles.add(getConfig()[roleConfigKey]);
      } catch (err) {
        console.warn(`[AppAccept] Could not assign role to ${discordId}: ${err.message}`);
      }
    } else {
      console.warn(`[AppAccept] Unknown roleApplying value "${roleApplying}" for ${discordId} — role not assigned.`);
    }

    // DM the applicant
    const dmContainer = new ContainerBuilder()
      .setAccentColor(0x52D973)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('## Application Accepted')
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `Congratulations. Your application to @howtoerlc has been accepted.\n\n` +
          `You have been given the **${roleApplying}** role.\n` +
          `Welcome to the team.`
        )
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('-# @howtoerlc — Built for ERLC communities that mean business.')
      );

    try {
      const user = await interaction.client.users.fetch(discordId);
      await user.send({ components: [dmContainer], flags: MessageFlags.IsComponentsV2 });
    } catch (err) {
      console.warn(`[AppAccept] Failed to DM applicant ${discordId}: ${err.message}`);
    }

    // Edit original panel — disable buttons, add status line
    const fullData = { discordId, ...appData };
    await interaction.deferUpdate();
    await interaction.editReply({
      components: [buildApplicationPanel(fullData, {
        disabled: true,
        status: `**Status:** Accepted by ${interaction.user.tag}`,
      })],
      flags: MessageFlags.IsComponentsV2,
    });

    // Remove from store
    delete store[discordId];
    writeStore(APPLICATIONS_FILE, store);

    await interaction.followUp({
      content: `Application accepted. ${username} has been given the ${roleApplying} role.`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
