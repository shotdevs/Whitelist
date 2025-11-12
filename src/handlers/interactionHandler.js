import {
  handleWhitelistApply,
  handleWhitelistStatus,
  handleOpenModal,
  handleModalSubmit,
  handleAcceptReject,
  handlePlatformSelect,
} from "../commands/whitelistHandlers.js";
import { handleWelcomeTest } from "./welcomeHandler.js";
import { handleButton } from "../utils/buttonHandlers.js";
import { handleModal } from "../utils/modalHandlers.js";
import { handleSelectMenu } from "../utils/selectMenuHandlers.js";
import { handleCommandError } from "../utils/errorHandler.js";
import logger from "../utils/logger.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function handleInteractions(interaction, client) {
  try {
    // Whitelist system handlers
    if (interaction.isChatInputCommand() && interaction.commandName === "whitelist-apply") {
      return await handleWhitelistApply(interaction);
    }

    if (interaction.isChatInputCommand() && interaction.commandName === "whitelist-status") {
      return await handleWhitelistStatus(interaction);
    }

    if (interaction.isChatInputCommand() && interaction.commandName === "welcome-test") {
      return await handleWelcomeTest(interaction);
    }

    if (interaction.isButton() && interaction.customId === "open_whitelist_modal") {
      return await handleOpenModal(interaction);
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "platform_select") {
      return await handlePlatformSelect(interaction);
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith("whitelist_modal_")) {
      return await handleModalSubmit(interaction, client);
    }

    if (
      interaction.isButton() &&
      (interaction.customId.startsWith("accept_app_") ||
        interaction.customId.startsWith("reject_app_"))
    ) {
      return await handleAcceptReject(interaction, client);
    }

    // Ticket system handlers
    logger.logDebug('Interaction received', { 
      type: interaction.type, 
      user: interaction.user ? interaction.user.id : 'Unknown',
      guild: interaction.guild ? interaction.guild.id : 'Unknown'
    });

    if (interaction.isChatInputCommand()) {
      // Try to load ticket commands dynamically
      const commandsPath = path.join(__dirname, '../commands');
      const commandFiles = fs.readdirSync(commandsPath).filter(file => file.startsWith('ticket-') && file.endsWith('.js'));
      
      for (const file of commandFiles) {
        const commandModule = await import(`../commands/${file}`);
        const command = commandModule.default || commandModule;
        if (command.data && command.data.name === interaction.commandName) {
          try {
            await command.execute(interaction);
            return;
          } catch (error) {
            await handleCommandError(error, interaction);
            return;
          }
        }
      }
      
      // Also check ticket.js command
      if (interaction.commandName === 'ticket') {
        const ticketCommand = await import('../commands/ticket.js');
        const command = ticketCommand.default || ticketCommand;
        try {
          await command.execute(interaction);
          return;
        } catch (error) {
          await handleCommandError(error, interaction);
          return;
        }
      }
    } else if (interaction.isButton()) {
      // Check if it's a ticket system button
      if (interaction.customId.includes('ticket') || 
          interaction.customId.includes('claim') || 
          interaction.customId.includes('close') ||
          interaction.customId.includes('create_ticket') ||
          interaction.customId.includes('add_user') ||
          interaction.customId.includes('delete_ticket')) {
        try {
          await handleButton(interaction);
        } catch (error) {
          await handleCommandError(error, interaction);
        }
      }
    } else if (interaction.isModalSubmit()) {
      // Check if it's a ticket system modal
      if (interaction.customId.includes('ticket') || 
          interaction.customId.includes('close') ||
          interaction.customId.includes('create_ticket') ||
          interaction.customId.includes('confirm_delete')) {
        try {
          await handleModal(interaction);
        } catch (error) {
          await handleCommandError(error, interaction);
        }
      }
    } else if (interaction.isStringSelectMenu()) {
      // Check if it's a ticket system select menu
      if (interaction.customId.includes('select_user')) {
        try {
          await handleSelectMenu(interaction);
        } catch (error) {
          await handleCommandError(error, interaction);
        }
      }
    }
  } catch (err) {
    console.error("⚠️ Interaction handler error:", err);
    logger.logError('Error in interaction handler:', err);
  }
}
