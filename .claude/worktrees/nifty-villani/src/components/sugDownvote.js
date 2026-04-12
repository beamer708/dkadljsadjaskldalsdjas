const { handleVote } = require('../utils/handleVote');

module.exports = {
  customIdPrefix: 'sug_downvote_',
  async execute(interaction) {
    await handleVote(interaction, 'down');
  },
};
