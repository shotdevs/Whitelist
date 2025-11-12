import { SlashCommandBuilder } from '@discordjs/builders';
import { PermissionFlagsBits } from 'discord-api-types/v10';
import { ButtonStyle } from 'discord.js';
import { CategoryConfig } from '../models/ticketModels.js';
import { createPanelContainer } from '../utils/embedBuilder.js';

export const data = new SlashCommandBuilder()
    .setName('ticket-panel')
    .setDescription('Creates a ticket panel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(option => option.setName('channel').setDescription('The channel to send the panel to').setRequired(true))
    .addStringOption(option => option.setName('title').setDescription('The title of the panel embed'))
    .addStringOption(option => option.setName('description').setDescription('The description of the panel embed'))
    .addStringOption(option => option.setName('color').setDescription('The color of the panel embed (hex code)'));

export async function execute(interaction) {
    let interactionReplyAvailable = true;
    try {
        await interaction.deferReply({ ephemeral: true });
    } catch (error) {
        console.error('Failed to defer reply:', error);
        if (error && error.code === 10062) {
            interactionReplyAvailable = false;
        } else {
            return;
        }
    }

    try {
        const channel = interaction.options.getChannel('channel');
        const title = interaction.options.getString('title') || 'Create a Ticket';
        const description = interaction.options.getString('description') || 'Click a button below to create a ticket.';
        const color = interaction.options.getString('color') || '#5865F2';

        const categories = await CategoryConfig.find({ guildId: interaction.guild.id, enabled: true });

        if (!categories.length) {
            return interaction.editReply({ content: 'No enabled ticket categories found for this server.' });
        }

        const buttons = [];
        for (const category of categories) {
            let buttonStyle;
            switch (category.buttonColor) {
                case 'secondary':
                    buttonStyle = ButtonStyle.Secondary;
                    break;
                case 'success':
                    buttonStyle = ButtonStyle.Success;
                    break;
                case 'danger':
                    buttonStyle = ButtonStyle.Danger;
                    break;
                default:
                    buttonStyle = ButtonStyle.Primary;
                    break;
            }
            
            const button = {
                type: 2,
                custom_id: `create_ticket:${category.categoryId}`,
                label: category.name,
                style: buttonStyle
            };
            
            if (category.emoji) {
                const raw = String(category.emoji).trim();
                const customMatch = raw.match(/^<a?:([^:>]+):(\d+)>$/);
                if (customMatch) {
                    const [, name, id] = customMatch;
                    button.emoji = { id, name };
                } else if (/^\d+$/.test(raw)) {
                    button.emoji = { id: raw };
                } else if (/^:[^:]+:$/.test(raw)) {
                    console.warn(`Panel command: emoji value appears to be a shortcode and will be ignored: ${raw}`);
                } else {
                    button.emoji = { name: raw };
                }
            }
            buttons.push(button);
        }

        const payload = createPanelContainer(title, description, color, buttons);
        await channel.send(payload);

        if (interactionReplyAvailable) {
            await interaction.editReply({ content: 'Panel created successfully.' });
        } else {
            try {
                await interaction.channel?.send({ content: 'Panel created successfully.' });
            } catch (fallbackError) {
                console.error('Failed to send fallback confirmation message:', fallbackError);
            }
        }
    } catch (error) {
        console.error('Error in panel command:', error);
        try {
            if (interactionReplyAvailable) {
                await interaction.editReply({ content: 'An error occurred while creating the panel. Please check the bot permissions and try again.' });
            } else {
                await interaction.channel?.send({ content: 'An error occurred while creating the panel. Please check the bot permissions and try again.' });
            }
        } catch (replyError) {
            console.error('Failed to send error message:', replyError);
        }
    }
}

export default { data, execute };
