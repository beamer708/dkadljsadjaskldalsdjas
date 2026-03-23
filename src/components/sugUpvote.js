const { handleVote } = require('../utils/handleVote');

module.exports = {
  customIdPrefix: 'sug_upvote_',
  async execute(interaction) {
    await handleVote(interaction, 'up');
  },
};
