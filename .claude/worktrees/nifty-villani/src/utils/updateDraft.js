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
// Each entry: { version, title, description, improvements: [], bugs: [], viewUrl, sentBy }
const draftMap = new Map();

// Build the ephemeral setup panel reflecting current draft state
function buildSetupContainer(draft) {
  const version     = draft.version     || '_not set_';
  const title       = draft.title       || '_not set_';
  const description = draft.description || '_not set_';
  const viewUrl     = draft.viewUrl     || 'Not set';

  return new ContainerBuilder()
    .setAccentColor(0xF5F0E8)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('## Website Update — Draft')
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Version:** ${version}\n` +
        `**Title:** ${title}\n` +
        `**Description:** ${description}\n` +
        `**Improvements:** ${draft.improvements.length} added\n` +
        `**Bug Fixes:** ${draft.bugs.length} added\n` +
        `**View URL:** ${viewUrl}`
      )
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    )
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('update_set_version').setLabel('Set Version').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('update_set_title').setLabel('Set Title').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('update_set_description').setLabel('Set Description').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('update_add_improvement').setLabel('Add Improvement').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('update_add_bug').setLabel('Add Bug Fix').setStyle(ButtonStyle.Secondary),
      )
    )
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('update_set_url').setLabel('Set View URL').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('update_send').setLabel('Send Update').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('update_cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger),
      )
    );
}

// Build the ephemeral sent confirmation panel (shown to admin after posting)
function buildSentContainer(draft) {
  return new ContainerBuilder()
    .setAccentColor(0x57F287)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('## Update Sent')
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Version:** ${draft.version}\n` +
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
      new TextDisplayBuilder().setContent('## Cancelled\nThe website update draft has been discarded.')
    );
}

// Edit the original ephemeral reply to reflect updated draft state
// Must deferUpdate first so the modal submit interaction is acknowledged
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
