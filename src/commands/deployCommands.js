import { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import dotenv from 'dotenv';
import { data as ticketData } from './ticket.js';
import { data as ticketPanelData } from './ticket-panel.js';
import { data as ticketCategoryData } from './ticket-category.js';
import { data as ticketListData } from './ticket-list.js';
import { data as ticketSetupData } from './ticket-setup.js';
import { data as ticketBlacklistData } from './ticket-blacklist.js';
import { data as ticketTranscriptData } from './ticket-transcript.js';
dotenv.config();

const commands = [
  new SlashCommandBuilder()
    .setName('whitelist-apply')
    .setDescription('Send the whitelist application embed (staff-only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .toJSON(),
  new SlashCommandBuilder()
    .setName('whitelist-status')
    .setDescription('Check your whitelist application status')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('welcome-test')
    .setDescription('Test the welcome card system (staff-only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .toJSON(),
  ticketData.toJSON(),
  ticketPanelData.toJSON(),
  ticketCategoryData.toJSON(),
  ticketListData.toJSON(),
  ticketSetupData.toJSON(),
  ticketBlacklistData.toJSON(),
  ticketTranscriptData.toJSON()
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

export async function deployCommands() {
  try {
    console.log('Registering slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('✅ Slash commands registered successfully.');
  } catch (err) {
    console.error('❌ Error registering commands:', err);
  }
}
