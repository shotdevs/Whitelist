import { SlashCommandBuilder } from '@discordjs/builders';
import { PermissionFlagsBits } from 'discord-api-types/v10';
import { AttachmentBuilder } from 'discord.js';
import { Ticket } from '../models/ticketModels.js';
import { generateTranscript } from '../utils/transcriptGenerator.js';

export const data = new SlashCommandBuilder()
    .setName('ticket-transcript')
    .setDescription('Manually generates a transcript for a ticket.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption(option => option.setName('ticket-id').setDescription('The ID of the ticket to generate a transcript for'));

export async function execute(interaction) {
    let interactionReplyAvailable = true;
    try {
        await interaction.deferReply({ ephemeral: true });
    } catch (error) {
        console.error('Failed to defer reply (transcript):', error);
        if (error && error.code === 10062) {
            interactionReplyAvailable = false;
        } else {
            return;
        }
    }

    const ticketId = interaction.options.getString('ticket-id');
    let ticket;

    if (ticketId) {
        ticket = await Ticket.findOne({ ticketId: ticketId, guildId: interaction.guild.id });
    } else {
        ticket = await Ticket.findOne({ channelId: interaction.channel.id });
    }

    if (!ticket) {
        if (interactionReplyAvailable) return interaction.editReply({ content: 'Ticket not found.' });
        return interaction.channel?.send({ content: 'Ticket not found.' });
    }

    const transcript = await generateTranscript(ticket);
    const attachment = new AttachmentBuilder(Buffer.from(transcript), { name: `transcript-${ticket.ticketId}.html` });

    if (interactionReplyAvailable) await interaction.editReply({ files: [attachment] });
    else await interaction.channel?.send({ content: 'Transcript generated.', files: [attachment] });
}

export default { data, execute };
