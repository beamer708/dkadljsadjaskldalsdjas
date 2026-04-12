const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const { isStaff } = require('../utils/permissionCheck');
const {
  buildSuggestionVotingPanel,
  SUGGESTIONS_FILE,
  readStore,
  writeStore,
} = require('../server');

module.exports = {
  customIdPrefix: 'sug_decline_',

  async execute(interaction) {
    if (!isStaff(interaction)) {
      return interaction.reply({
        content: 'You do not have permission to action suggestions.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const suggestionId = interaction.customId.replace('sug_decline_', '');
    const store = readStore(SUGGESTIONS_FILE);
    const sugData = store[suggestionId];

    if (!sugData) {
      return interaction.reply({
        content: 'Suggestion data not found. It may have already been actioned.',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (sugData.status !== 'pending') {
      return interaction.reply({
        content: 'This suggestion has already been resolved.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const { discordId, username, title } = sugData;

    // DM the submitter
    const dmContainer = new ContainerBuilder()
      .setAccentColor(0xF5F0E8)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('## Suggestion Update')
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `Thank you for submitting your suggestion to Unity Vault.\n\n` +
          `After review, we have decided not to move forward with **${title}** (${suggestionId}) at this time.\n` +
          `We appreciate your input and encourage you to share future ideas.`
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
      console.warn(`[SugDecline] Failed to DM user ${discordId}: ${err.message}`);
    }

    // Update store status
    sugData.status = 'declined';
    store[suggestionId] = sugData;
    writeStore(SUGGESTIONS_FILE, store);

    // Edit the panel in the suggestions channel
    await interaction.deferUpdate();
    await interaction.editReply({
      components: [buildSuggestionVotingPanel({ ...sugData, suggestionId }, {
        disableVotes: true,
        statusLine: `**Status:** ❌ Declined by ${interaction.user.tag}`,
      })],
      flags: MessageFlags.IsComponentsV2,
    });

    await interaction.followUp({
      content: `Suggestion declined. ${username} has been notified.`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
