import {
  handleWhitelistApply,
  handleWhitelistStatus,
  handleOpenModal,
  handleModalSubmit,
  handleAcceptReject,
} from "../commands/whitelistHandlers.js";
import { handleWelcomeTest } from "./welcomeHandler.js";

export async function handleInteractions(interaction, client) {
  try {
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

    if (interaction.isModalSubmit() && interaction.customId === "whitelist_modal") {
      return await handleModalSubmit(interaction, client);
    }

    if (
      interaction.isButton() &&
      (interaction.customId.startsWith("accept_app_") ||
        interaction.customId.startsWith("reject_app_"))
    ) {
      return await handleAcceptReject(interaction, client);
    }
  } catch (err) {
    console.error("⚠️ Interaction handler error:", err);
  }
}
