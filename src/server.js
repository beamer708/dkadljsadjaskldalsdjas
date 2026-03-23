const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
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
const getConfig = require('./utils/getConfig');

// --- Environment ---

const PORT = process.env.SERVER_PORT || process.env.PORT || 3001;

if (!getConfig().apiSecret) {
  console.warn('[Server] WARNING: API_SECRET is not set. All incoming requests will be rejected.');
}

// --- File paths (absolute — required for hosted environments) ---

const APPLICATIONS_FILE = path.join(__dirname, '../applications.json');
const SUGGESTIONS_FILE = path.join(__dirname, '../suggestions.json');

// --- JSON store helpers ---

function ensureFile(fp) {
  if (!fs.existsSync(fp)) fs.writeFileSync(fp, '{}', 'utf8');
}

function readStore(fp) {
  ensureFile(fp);
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch {
    return {};
  }
}

function writeStore(fp, data) {
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf8');
}

// --- Panel builders ---

function buildApplicationPanel(data, { disabled = false, status = null } = {}) {
  const { discordId, username, age, timezone, reason, experience, roleApplying } = data;

  const infoLines = [
    `**Applicant:** ${username}`,
    `**Discord ID:** ${discordId}`,
    `**Age:** ${age}`,
    `**Timezone:** ${timezone}`,
    `**Role Applying For:** ${roleApplying}`,
  ];
  if (status) infoLines.push(status);

  return new ContainerBuilder()
    .setAccentColor(0xF5F0E8)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('## New Application')
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(infoLines.join('\n'))
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Why do you want to join?**\n${reason}`)
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Previous Experience:**\n${experience || 'None provided.'}`)
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('-# Submitted via unityvault.space')
    )
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`app_accept_${discordId}`)
          .setLabel('Accept')
          .setStyle(ButtonStyle.Success)
          .setDisabled(disabled),
        new ButtonBuilder()
          .setCustomId(`app_deny_${discordId}`)
          .setLabel('Deny')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(disabled),
      )
    );
}

function buildSuggestionPanel(data, { disabled = false, status = null } = {}) {
  const { discordId, username, category, title, details } = data;

  const infoLines = [
    `**From:** ${username}`,
    `**Category:** ${category}`,
    `**Title:** ${title}`,
  ];
  if (status) infoLines.push(status);

  return new ContainerBuilder()
    .setAccentColor(0xF5F0E8)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('## New Suggestion')
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(infoLines.join('\n'))
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Details:**\n${details}`)
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('-# Submitted via unityvault.space')
    )
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`sug_approve_${discordId}`)
          .setLabel('Approve')
          .setStyle(ButtonStyle.Success)
          .setDisabled(disabled),
        new ButtonBuilder()
          .setCustomId(`sug_decline_${discordId}`)
          .setLabel('Decline')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(disabled),
      )
    );
}

// --- DM helper ---

async function sendDm(client, discordId, container) {
  try {
    const user = await client.users.fetch(discordId);
    await user.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
  } catch (err) {
    console.warn(`[Server] Failed to DM user ${discordId}: ${err.message}`);
  }
}

// --- Secret validation middleware ---

function validateSecret(req, res, next) {
  const secret = getConfig().apiSecret;
  const provided = req.headers['x-api-secret'];

  if (!secret || provided !== secret) {
    return res.status(401).json({ success: false, error: 'Unauthorized.' });
  }

  next();
}

// --- Express server ---

function startServer(client) {
  const app = express();

  // CORS — restrict to website domain in production, allow all in dev
  app.use(cors({
    origin: getConfig().websiteUrl || '*',
    methods: ['POST'],
  }));

  app.use(express.json());

  // Apply secret validation to all routes
  app.use(validateSecret);

  // POST /api/application
  app.post('/api/application', async (req, res) => {
    try {
      const { username, discordId, age, timezone, reason, experience, roleApplying } = req.body;

      // Send application panel to applicationChannelId
      const appChannel = await client.channels.fetch(getConfig().applicationChannelId);
      const data = { discordId, username, age, timezone, reason, experience: experience || '', roleApplying };
      await appChannel.send({
        components: [buildApplicationPanel(data)],
        flags: MessageFlags.IsComponentsV2,
      });

      // Store in applications.json
      const store = readStore(APPLICATIONS_FILE);
      store[discordId] = { username, age, timezone, reason, experience: experience || '', roleApplying };
      writeStore(APPLICATIONS_FILE, store);

      // DM the applicant
      const dmContainer = new ContainerBuilder()
        .setAccentColor(0xF5F0E8)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('## Application Received')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `Thank you for applying to Unity Vault, ${username}.\n\n` +
            `Your application for **${roleApplying}** has been received and is currently under review.\n` +
            `You will receive a DM here when a decision has been made.`
          )
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('-# Unity Vault • Helping ERLC communities grow smarter.')
        );

      await sendDm(client, discordId, dmContainer);

      res.json({ success: true });
    } catch (err) {
      console.error('[Server] /api/application error:', err);
      res.status(500).json({ success: false });
    }
  });

  // POST /api/suggestion
  app.post('/api/suggestion', async (req, res) => {
    try {
      const { username, discordId, category, title, details } = req.body;

      // Send suggestion panel to suggestionChannelId
      const sugChannel = await client.channels.fetch(getConfig().suggestionChannelId);
      const data = { discordId, username, category, title, details };
      await sugChannel.send({
        components: [buildSuggestionPanel(data)],
        flags: MessageFlags.IsComponentsV2,
      });

      // Store in suggestions.json
      const store = readStore(SUGGESTIONS_FILE);
      store[discordId] = { username, title, category, details };
      writeStore(SUGGESTIONS_FILE, store);

      // DM the submitter
      const dmContainer = new ContainerBuilder()
        .setAccentColor(0xF5F0E8)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('## Suggestion Received')
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `Thank you for your suggestion, ${username}.\n\n` +
            `**${title}** has been submitted to the Unity Vault team for review.\n` +
            `You will receive a DM here once a decision has been made.`
          )
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('-# Unity Vault • Helping ERLC communities grow smarter.')
        );

      await sendDm(client, discordId, dmContainer);

      res.json({ success: true });
    } catch (err) {
      console.error('[Server] /api/suggestion error:', err);
      res.status(500).json({ success: false });
    }
  });

  // Bind to 0.0.0.0 — required for hosted environments to expose the port
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`)
  })
}

module.exports = {
  startServer,
  buildApplicationPanel,
  buildSuggestionPanel,
  APPLICATIONS_FILE,
  SUGGESTIONS_FILE,
  readStore,
  writeStore,
};
