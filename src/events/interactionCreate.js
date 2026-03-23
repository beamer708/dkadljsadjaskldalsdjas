const { Events, MessageFlags } = require('discord.js');
const path = require('path');
const fs = require('fs');
const { sendLog } = require('../utils/logger');

// Routes every incoming interaction to the correct command or component handler
module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // --- Slash commands ---
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) {
        await interaction.reply({ content: 'Unknown command.', flags: MessageFlags.Ephemeral });
        return;
      }
      try {
        await command.execute(interaction);
        // Log every slash command use after successful execution
        await sendLog(interaction.client, 'action', {
          label: 'ACTION — Slash Command Used',
          content: `Command: /${interaction.commandName}\nUser: ${interaction.user.tag}\nUser ID: ${interaction.user.id}\nChannel: <#${interaction.channelId}>`,
        });
      } catch (err) {
        console.error(`[InteractionCreate] Command error (${interaction.commandName}):`, err);
        const msg = { content: 'An error occurred while running that command.', flags: MessageFlags.Ephemeral };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(msg);
        } else {
          await interaction.reply(msg);
        }
      }
      return;
    }

    // --- Button interactions ---
    if (interaction.isButton()) {
      const componentsPath = path.join(__dirname, '../components');
      const files = fs.readdirSync(componentsPath).filter(f => f.endsWith('.js'));

      for (const file of files) {
        const component = require(path.join(componentsPath, file));
        // Each component exports a customId (string or prefix) and an execute function
        if (
          component.customId === interaction.customId ||
          (component.customIdPrefix && interaction.customId.startsWith(component.customIdPrefix))
        ) {
          try {
            await component.execute(interaction);
          } catch (err) {
            console.error(`[InteractionCreate] Button error (${interaction.customId}):`, err);
            const msg = { content: 'An error occurred handling that button.', flags: MessageFlags.Ephemeral };
            if (interaction.replied || interaction.deferred) {
              await interaction.followUp(msg);
            } else {
              await interaction.reply(msg);
            }
          }
          return;
        }
      }
    }

    // --- Select menu interactions ---
    if (interaction.isStringSelectMenu()) {
      const componentsPath = path.join(__dirname, '../components');
      const files = fs.readdirSync(componentsPath).filter(f => f.endsWith('.js'));

      for (const file of files) {
        const component = require(path.join(componentsPath, file));
        if (component.customId === interaction.customId) {
          try {
            await component.execute(interaction);
          } catch (err) {
            console.error(`[InteractionCreate] Select menu error (${interaction.customId}):`, err);
            const msg = { content: 'An error occurred handling that selection.', flags: MessageFlags.Ephemeral };
            if (interaction.replied || interaction.deferred) {
              await interaction.followUp(msg);
            } else {
              await interaction.reply(msg);
            }
          }
          return;
        }
      }
    }

    // --- Modal submissions ---
    if (interaction.isModalSubmit()) {
      const componentsPath = path.join(__dirname, '../components');
      const files = fs.readdirSync(componentsPath).filter(f => f.endsWith('.js'));

      for (const file of files) {
        const component = require(path.join(componentsPath, file));
        if (component.modalId === interaction.customId && typeof component.handleModal === 'function') {
          try {
            await component.handleModal(interaction);
          } catch (err) {
            console.error(`[InteractionCreate] Modal error (${interaction.customId}):`, err);
            const msg = { content: 'An error occurred handling that modal.', flags: MessageFlags.Ephemeral };
            if (interaction.replied || interaction.deferred) {
              await interaction.followUp(msg);
            } else {
              await interaction.reply(msg);
            }
          }
          return;
        }
      }
    }
  },
};
