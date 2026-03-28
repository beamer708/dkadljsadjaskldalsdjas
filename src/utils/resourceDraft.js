const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');

// Shared draft state keyed by user.id
// Each entry: { title, description, imageUrl, sentBy }
const draftMap = new Map();

// Build the ephemeral setup panel reflecting current draft state
function buildSetupContainer(draft) {
  const title       = draft.title       || '_not set_';
  const description = draft.description || '_not set_';
  const imageUrl    = draft.imageUrl    || '_not set_';

  return new ContainerBuilder()
    .setAccentColor(0xF5F0E8)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('## Resource Release — Draft')
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Title:** ${title}\n` +
        `**Description:** ${description}\n` +
        `**Image URL:** ${imageUrl}`
      )
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    )
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('resource_set_title').setLabel('Set Title').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('resource_set_description').setLabel('Set Description').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('resource_set_image').setLabel('Set Image').setStyle(ButtonStyle.Secondary),
      )
    )
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('resource_send').setLabel('Send Release').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('resource_cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger),
      )
    );
}

// Build the ephemeral sent confirmation panel
function buildSentContainer(draft) {
  return new ContainerBuilder()
    .setAccentColor(0x57F287)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('## Resource Release Sent')
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Title:** ${draft.title}\n` +
        `**Description:** ${draft.description}`
      )
    );
}

// Build the cancelled panel
function buildCancelledContainer() {
  return new ContainerBuilder()
    .setAccentColor(0xED4245)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('## Cancelled\nThe resource release draft has been discarded.')
    );
}

// Edit the original ephemeral reply to reflect updated draft state
async function refreshSetupPanel(interaction, draft) {
  await interaction.deferUpdate();
  await interaction.editReply({
    components: [buildSetupContainer(draft)],
    flags: MessageFlags.IsComponentsV2,
  });
}

module.exports = {
  draftMap,
  buildSetupContainer,
  buildSentContainer,
  buildCancelledContainer,
  refreshSetupPanel,
};
