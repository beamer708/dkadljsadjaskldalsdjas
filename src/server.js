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
const { generateSuggestionId } = require('./utils/suggestionId');

// --- Environment ---

const PORT = process.env.SERVER_PORT || process.env.PORT || 3001;

if (!getConfig().apiSecret) {
  console.warn('[Server] WARNING: API_SECRET is not set. All incoming requests will be rejected.');
}

// --- File paths (absolute — required for hosted environments) ---

const APPLICATIONS_FILE = path.join(__dirname, '../applications.json');
const SUGGESTIONS_FILE = path.join(__dirname, '../suggestions.json');
const PARTNERSHIPS_FILE = path.join(__dirname, '../partnerships.json');

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

function buildSuggestionVotingPanel(data, { disableVotes = false, statusLine = null } = {}) {
  const { suggestionId, discordId, username, category, title, details, upvotes = 0, downvotes = 0, threadId } = data;

  const headerLines = [
    `**From:** <@${discordId}> (${username})`,
    `**Category:** ${category}`,
  ];
  if (statusLine) headerLines.push(statusLine);

  const voteRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`sug_upvote_${suggestionId}`)
      .setLabel(`👍  ${upvotes}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disableVotes),
    new ButtonBuilder()
      .setCustomId(`sug_downvote_${suggestionId}`)
      .setLabel(`👎  ${downvotes}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disableVotes),
    ...(threadId ? [
      new ButtonBuilder()
        .setCustomId(`sug_thread_${threadId}`)
        .setLabel('💬  View Thread')
        .setStyle(ButtonStyle.Primary),
    ] : []),
  );

  const staffRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`sug_approve_${suggestionId}`)
      .setLabel('Approve')
      .setStyle(ButtonStyle.Success)
      .setDisabled(disableVotes),
    new ButtonBuilder()
      .setCustomId(`sug_decline_${suggestionId}`)
      .setLabel('Decline')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disableVotes),
  );

  return new ContainerBuilder()
    .setAccentColor(0x5865F2)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## ${suggestionId} — Suggestion`)
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(headerLines.join('\n'))
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**${title}**\n${details}`)
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('-# Submitted via unityvault.space')
    )
    .addActionRowComponents(voteRow)
    .addActionRowComponents(staffRow);
}

function buildPartnershipPanel(data, { disabled = false, status = null } = {}) {
  const { serverName, inviteLink, serverType, reason, offering } = data;
  const key = serverName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 80);

  const infoLines = [
    `**Server Name:** ${serverName}`,
    `**Invite Link:** ${inviteLink}`,
    `**Server Type:** ${serverType}`,
  ];
  if (status) infoLines.push(status);

  return new ContainerBuilder()
    .setAccentColor(0xF5F0E8)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('## New Partnership Application')
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
      new TextDisplayBuilder().setContent(`**Why do they want to partner?**\n${reason}`)
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**What do they offer the ERLC community?**\n${offering}`)
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
          .setCustomId(`partner_approve_${key}`)
          .setLabel('Approve')
          .setStyle(ButtonStyle.Success)
          .setDisabled(disabled),
        new ButtonBuilder()
          .setCustomId(`partner_deny_${key}`)
          .setLabel('Deny')
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

      const suggestionId = generateSuggestionId();
      const sugChannel = await client.channels.fetch(getConfig().suggestionChannelId);

      // Send the public voting panel (no threadId yet)
      const panelData = { suggestionId, discordId, username, category, title, details, upvotes: 0, downvotes: 0, threadId: null };
      const sentMsg = await sugChannel.send({
        components: [buildSuggestionVotingPanel(panelData)],
        flags: MessageFlags.IsComponentsV2,
      });

      // Create a discussion thread on the panel message
      let threadId = null;
      try {
        const thread = await sentMsg.startThread({
          name: `${suggestionId} — ${title}`.slice(0, 100),
          autoArchiveDuration: 10080, // 7 days
          reason: `Discussion thread for ${suggestionId}`,
        });
        threadId = thread.id;
        await thread.send(`**Discussion thread for ${suggestionId}**\nFeel free to share your thoughts below.`);
      } catch (err) {
        console.error('[Server] Failed to create suggestion thread:', err);
      }

      // Re-edit the panel now that we have the threadId
      if (threadId) {
        const updatedData = { ...panelData, threadId };
        await sentMsg.edit({
          components: [buildSuggestionVotingPanel(updatedData)],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      // Store all fields in suggestions.json
      const store = readStore(SUGGESTIONS_FILE);
      store[suggestionId] = {
        discordId,
        username,
        category,
        title,
        details,
        upvotes: 0,
        downvotes: 0,
        voters: [],
        messageId: sentMsg.id,
        channelId: sugChannel.id,
        threadId,
        status: 'pending',
      };
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
            `**${title}** (${suggestionId}) has been posted to the suggestions channel for community voting.\n` +
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

      res.json({ success: true, suggestionId });
    } catch (err) {
      console.error('[Server] /api/suggestion error:', err);
      res.status(500).json({ success: false });
    }
  });

  // POST /api/partnership
  app.post('/api/partnership', async (req, res) => {
    try {
      const { serverName, inviteLink, serverType, reason, offering } = req.body;

      const key = serverName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 80);

      const partnerChannel = await client.channels.fetch(getConfig().partnershipChannelId);
      const data = { serverName, inviteLink, serverType, reason, offering };
      await partnerChannel.send({
        components: [buildPartnershipPanel(data)],
        flags: MessageFlags.IsComponentsV2,
      });

      const store = readStore(PARTNERSHIPS_FILE);
      store[key] = {
        serverName,
        inviteLink,
        serverType,
        reason,
        offering,
        status: 'pending',
        timestamp: new Date().toISOString(),
      };
      writeStore(PARTNERSHIPS_FILE, store);

      res.json({ success: true });
    } catch (err) {
      console.error('[Server] /api/partnership error:', err);
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
  buildSuggestionVotingPanel,
  buildPartnershipPanel,
  APPLICATIONS_FILE,
  SUGGESTIONS_FILE,
  PARTNERSHIPS_FILE,
  readStore,
  writeStore,
};
