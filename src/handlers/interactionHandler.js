import {
  handleWhitelistApply,
  handleOpenModal,
  handleModalSubmit,
  handleAcceptReject,
} from "../commands/whitelistHandlers.js";

export async function handleInteractions(interaction, client) {
  try {
    if (interaction.isChatInputCommand() && interaction.commandName === "whitelist-apply") {
      return await handleWhitelistApply(interaction);
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
