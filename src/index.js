import {
  Client,
  GatewayIntentBits,
  Partials,
} from "discord.js";
import dotenv from "dotenv";
import { connectMongo } from "./config/database.js";
import { handleInteractions } from "./handlers/interactionHandler.js";
import { handleMessages } from "./handlers/messageHandler.js";
import { handleWelcome } from "./handlers/welcomeHandler.js";
import LicenseManager from "./utils/LicenseManager.js";
import { setupGlobalErrorHandlers } from "./utils/errorHandler.js";
import logger from "./utils/logger.js";

dotenv.config();

async function startBot() {
  // Verify license before starting the bot
  if (process.env.LICENSE_KEY && process.env.LICENSE_API_BASE_URL && process.env.CLIENT_ID) {
    console.log('Verifying license...');
    const licenseManager = new LicenseManager(process.env.LICENSE_API_BASE_URL, process.env.CLIENT_ID);
    const verificationResult = await licenseManager.verifyLicense(process.env.LICENSE_KEY);

    if (!verificationResult.success) {
      console.error(`[LICENSE ERROR] ${verificationResult.message}`);
      console.error('Bot will not start due to a failed license verification.');
      process.exit(1);
    }

    console.log(`[LICENSE INFO] ${verificationResult.message}`);
  } else {
    console.warn('[LICENSE WARNING] License verification skipped - missing LICENSE_KEY, LICENSE_API_BASE_URL, or CLIENT_ID environment variables.');
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel],
  });

  client.once("clientReady", () => {
    logger.logInfo(`🤖 Logged in as ${client.user.tag}`);
    logger.logInfo(`Bot is in ${client.guilds.cache.size} guilds.`);
  });

  client.on("guildMemberAdd", async (member) => {
    await handleWelcome(member, client);
  });

  client.on("interactionCreate", async (interaction) => {
    await handleInteractions(interaction, client);
  });

  client.on("messageCreate", async (message) => {
    await handleMessages(message, client);
  });

  // Setup global error handlers
  setupGlobalErrorHandlers();

  // Connect to MongoDB
  await connectMongo();

  // Login to Discord
  try {
    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    console.error('Failed to log in to Discord. Please check your DISCORD_TOKEN.', error);
    process.exit(1);
  }

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    logger.logInfo('Shutting down...');
    client.destroy();
    process.exit(0);
  });
}

startBot();
