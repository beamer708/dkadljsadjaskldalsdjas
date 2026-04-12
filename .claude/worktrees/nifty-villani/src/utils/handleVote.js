const { MessageFlags } = require('discord.js');
const {
  buildSuggestionVotingPanel,
  SUGGESTIONS_FILE,
  readStore,
  writeStore,
} = require('../server');

async function handleVote(interaction, voteType) {
  const prefix = voteType === 'up' ? 'sug_upvote_' : 'sug_downvote_';
  const suggestionId = interaction.customId.replace(prefix, '');

  const store = readStore(SUGGESTIONS_FILE);
  const sugData = store[suggestionId];

  if (!sugData) {
    return interaction.reply({
      content: 'Suggestion not found.',
      flags: MessageFlags.Ephemeral,
    });
  }

  if (sugData.status !== 'pending') {
    return interaction.reply({
      content: 'This suggestion has already been resolved.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const userId = interaction.user.id;

  if (sugData.voters.includes(userId)) {
    return interaction.reply({
      content: 'You have already voted on this suggestion.',
      flags: MessageFlags.Ephemeral,
    });
  }

  // Record vote
  sugData.voters.push(userId);
  if (voteType === 'up') {
    sugData.upvotes += 1;
  } else {
    sugData.downvotes += 1;
  }
  store[suggestionId] = sugData;
  writeStore(SUGGESTIONS_FILE, store);

  // Edit the original panel with updated vote counts
  try {
    const channel = await interaction.client.channels.fetch(sugData.channelId);
    const message = await channel.messages.fetch(sugData.messageId);
    await message.edit({
      components: [buildSuggestionVotingPanel({ ...sugData, suggestionId })],
      flags: MessageFlags.IsComponentsV2,
    });
  } catch (err) {
    console.error('[handleVote] Failed to update panel:', err);
  }

  await interaction.reply({
    content: voteType === 'up' ? '👍 Your upvote has been recorded.' : '👎 Your downvote has been recorded.',
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = { handleVote };
