import { ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { TicketFeedback, GuildConfig } from '../models/ticketModels.js';
import { COMPONENT_FLAGS } from './embedBuilder.js';

const feedbackCollectors = new Map();

export async function requestFeedback(client, ticket, guildConfig) {
    if (!guildConfig.enableFeedback) {
        return;
    }

    try {
        const user = await client.users.fetch(ticket.creatorId);
        
        const embed = {
            type: 'rich',
            title: '📝 Rate Your Support Experience',
            description: `Thank you for using our ticket system! We'd love to hear your feedback on ticket **#${ticket.ticketId}**.`,
            fields: [
                {
                    name: 'How would you rate your experience?',
                    value: 'Please click one of the buttons below to rate your experience (1-5 stars).',
                    inline: false
                }
            ],
            color: null,
            footer: {
                text: 'Your feedback helps us improve our support service'
            },
            timestamp: new Date().toISOString()
        };

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`feedback_${ticket.ticketId}_1`)
                .setLabel('1⭐')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`feedback_${ticket.ticketId}_2`)
                .setLabel('2 ⭐')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`feedback_${ticket.ticketId}_3`)
                .setLabel('3 ⭐')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`feedback_${ticket.ticketId}_4`)
                .setLabel('4 ⭐')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`feedback_${ticket.ticketId}_5`)
                .setLabel('5 ⭐')
                .setStyle(ButtonStyle.Success)
        );

        const message = await user.send({
            embeds: [embed],
            components: [row]
        });

        feedbackCollectors.set(ticket.ticketId, {
            messageId: message.id,
            userId: user.id,
            guildId: ticket.guildId,
            ticketId: ticket.ticketId,
            category: ticket.categoryId,
            staffMember: ticket.closedBy || ticket.claimedBy
        });

        setTimeout(() => {
            feedbackCollectors.delete(ticket.ticketId);
        }, 24 * 60 * 60 * 1000);

    } catch (error) {
        console.error('Error sending feedback request:', error);
    }
}

export async function handleFeedbackButton(interaction) {
    const [, ticketId, ratingStr] = interaction.customId.split('_');
    const rating = parseInt(ratingStr);

    const collectorData = feedbackCollectors.get(ticketId);
    if (!collectorData) {
        await interaction.reply({
            content: '❌ This feedback request has expired.',
            ephemeral: true
        });
        return;
    }

    const feedbackModal = {
        type: 9,
        custom_id: `feedback_modal_${ticketId}_${rating}`,
        title: 'Additional Feedback (Optional)',
        components: [
            {
                type: 1,
                components: [
                    {
                        type: 4,
                        custom_id: 'feedback_text',
                        label: 'Tell us more about your experience',
                        style: 2,
                        required: false,
                        max_length: 1000,
                        placeholder: 'Share any additional comments, suggestions, or feedback...'
                    }
                ]
            }
        ]
    };

    await interaction.showModal(feedbackModal);
}

export async function handleFeedbackModal(interaction) {
    const [, , ticketId, ratingStr] = interaction.customId.split('_');
    const rating = parseInt(ratingStr);
    const feedbackText = interaction.fields.getTextInputValue('feedback_text') || '';

    const collectorData = feedbackCollectors.get(ticketId);
    if (!collectorData) {
        await interaction.reply({
            content: '❌ This feedback request has expired.',
            ephemeral: true
        });
        return;
    }

    const feedbackRecord = await TicketFeedback.create({
        ticketId: ticketId,
        guildId: collectorData.guildId,
        userId: collectorData.userId,
        rating: rating,
        feedback: feedbackText,
        staffMember: collectorData.staffMember,
        category: collectorData.category,
        submittedAt: new Date()
    });

    feedbackCollectors.delete(ticketId);

    try {
        await interaction.message.edit({
            embeds: [
                {
                    type: 'rich',
                    title: '✅ Thank You for Your Feedback!',
                    description: `You rated your experience: ${'⭐'.repeat(rating)}`,
                    color: null,
                    footer: {
                        text: 'Your feedback has been recorded'
                    },
                    timestamp: new Date().toISOString()
                }
            ],
            components: []
        });
    } catch (error) {
        console.error('Error editing feedback message:', error);
    }

    await interaction.reply({
        content: '✅ Thank you for your feedback! Your response has been recorded.',
        ephemeral: true
    });

    await postFeedbackToChannel(interaction.client, feedbackRecord, collectorData);
}

async function postFeedbackToChannel(client, feedbackRecord, collectorData) {
    try {
        const guildConfig = await GuildConfig.findOne({ guildId: collectorData.guildId });
        
        if (!guildConfig || !guildConfig.feedbackChannel) {
            return;
        }

        const guild = await client.guilds.fetch(collectorData.guildId);
        const feedbackChannel = await guild.channels.fetch(guildConfig.feedbackChannel);
        
        if (!feedbackChannel) {
            return;
        }

        const user = await client.users.fetch(collectorData.userId).catch(() => null);
        const staffMember = collectorData.staffMember ? await client.users.fetch(collectorData.staffMember).catch(() => null) : null;
        
        const stars = '⭐'.repeat(feedbackRecord.rating);
        
        let content = `# 📝 New Feedback Received\n\n`;
        content += `**Ticket ID:** #${feedbackRecord.ticketId}\n`;
        content += `**Rating:** ${stars} (${feedbackRecord.rating}/5)\n`;
        content += `**User:** ${user ? `${user.tag} (${user.id})` : 'Unknown User'}\n`;
        
        if (staffMember) {
            content += `**Staff Member:** ${staffMember.tag}\n`;
        }
        
        if (feedbackRecord.feedback) {
            content += `\n**Feedback:**\n> ${feedbackRecord.feedback}\n`;
        }
        
        content += `\n*<t:${Math.floor(feedbackRecord.submittedAt.getTime() / 1000)}:F>*`;

        const container = {
            type: 17,
            components: [
                {
                    type: 10,
                    content: content
                }
            ],
            accent_color: null
        };

        await feedbackChannel.send({ 
            flags: COMPONENT_FLAGS, 
            components: [container] 
        });
    } catch (error) {
        console.error('Error posting feedback to channel:', error);
    }
}

export default { requestFeedback, handleFeedbackButton, handleFeedbackModal };
