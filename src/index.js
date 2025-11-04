import {
  Client,
  GatewayIntentBits,
  Partials,
} from "discord.js";
import dotenv from "dotenv";
import { connectMongo } from "./config/database.js";
import { handleInteractions } from "./handlers/interactionHandler.js";
import { handleMessages } from "./handlers/messageHandler.js";

dotenv.config();

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

client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  await handleInteractions(interaction, client);
});

client.on("messageCreate", async (message) => {
  await handleMessages(message, client);
});

await connectMongo();
await client.login(process.env.DISCORD_TOKEN);
