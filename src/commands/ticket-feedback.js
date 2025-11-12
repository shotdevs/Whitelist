import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { TicketFeedback, GuildConfig } from '../models/ticketModels.js';

export const data = new SlashCommandBuilder()
    .setName('ticket-feedback')
    .setDescription('View and manage ticket feedback')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand(subcommand =>
        subcommand
            .setName('view')
            .setDescription('View recent ticket feedback')
            .addIntegerOption(option =>
                option
                    .setName('limit')
                    .setDescription('Number of feedback entries to display (default: 10)')
                    .setMinValue(1)
                    .setMaxValue(50)
                    .setRequired(false)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('stats')
            .setDescription('View feedback statistics')
            .addUserOption(option =>
                option
                    .setName('staff')
                    .setDescription('Filter by staff member')
                    .setRequired(false)
            )
            .addStringOption(option =>
                option
                    .setName('category')
                    .setDescription('Filter by category')
                    .setRequired(false)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('toggle')
            .setDescription('Enable or disable feedback collection')
            .addBooleanOption(option =>
                option
                    .setName('enabled')
                    .setDescription('Enable feedback collection')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('channel')
            .setDescription('Set the channel where feedback will be posted')
            .addChannelOption(option =>
                option
                    .setName('channel')
                    .setDescription('The channel to post feedback to (leave empty to disable)')
                    .setRequired(false)
            )
    );

export async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'view') {
        await handleView(interaction);
    } else if (subcommand === 'stats') {
        await handleStats(interaction);
    } else if (subcommand === 'toggle') {
        await handleToggle(interaction);
    } else if (subcommand === 'channel') {
        await handleChannel(interaction);
    }
}

async function handleView(interaction) {
    await interaction.deferReply({ flags: 64 });

    const limit = interaction.options.getInteger('limit') || 10;

    const feedbacks = await TicketFeedback.find({ guildId: interaction.guildId })
        .sort({ submittedAt: -1 })
        .limit(limit);

    if (feedbacks.length === 0) {
        await interaction.editReply({
            content: '❌ No feedback found.',
            flags: 64
        });
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle('📝 Recent Ticket Feedback')
        .setColor(0x5865F2)
        .setTimestamp();

    for (const feedback of feedbacks) {
        const user = await interaction.client.users.fetch(feedback.userId).catch(() => null);
        const userName = user ? user.tag : 'Unknown User';
        const stars = '⭐'.repeat(feedback.rating);
        const feedbackText = feedback.feedback ? `\n*"${feedback.feedback}"*` : '';

        embed.addFields({
            name: `Ticket #${feedback.ticketId} - ${stars} (${feedback.rating}/5)`,
            value: `**User:** ${userName}\n**Submitted:** <t:${Math.floor(feedback.submittedAt.getTime() / 1000)}:R>${feedbackText}`,
            inline: false
        });
    }

    await interaction.editReply({
        embeds: [embed],
        flags: 64
    });
}

async function handleStats(interaction) {
    await interaction.deferReply({ flags: 64 });

    const staffFilter = interaction.options.getUser('staff');
    const categoryFilter = interaction.options.getString('category');

    const filter = { guildId: interaction.guildId };
    if (staffFilter) filter.staffMember = staffFilter.id;
    if (categoryFilter) filter.category = categoryFilter;

    const feedbacks = await TicketFeedback.find(filter);

    if (feedbacks.length === 0) {
        await interaction.editReply({
            content: '❌ No feedback found with the specified filters.',
            flags: 64
        });
        return;
    }

    const totalFeedback = feedbacks.length;
    const averageRating = feedbacks.reduce((sum, f) => sum + f.rating, 0) / totalFeedback;
    const ratingBreakdown = {
        1: feedbacks.filter(f => f.rating === 1).length,
        2: feedbacks.filter(f => f.rating === 2).length,
        3: feedbacks.filter(f => f.rating === 3).length,
        4: feedbacks.filter(f => f.rating === 4).length,
        5: feedbacks.filter(f => f.rating === 5).length
    };

    const embed = new EmbedBuilder()
        .setTitle('📊 Feedback Statistics')
        .setColor(0x5865F2)
        .setTimestamp()
        .addFields(
            {
                name: 'Total Feedback',
                value: totalFeedback.toString(),
                inline: true
            },
            {
                name: 'Average Rating',
                value: `${'⭐'.repeat(Math.round(averageRating))} (${averageRating.toFixed(2)}/5)`,
                inline: true
            },
            {
                name: '\u200b',
                value: '\u200b',
                inline: true
            },
            {
                name: 'Rating Breakdown',
                value: Object.entries(ratingBreakdown)
                    .map(([rating, count]) => `${'⭐'.repeat(parseInt(rating))}: ${count} (${((count / totalFeedback) * 100).toFixed(1)}%)`)
                    .join('\n'),
                inline: false
            }
        );

    if (staffFilter) {
        embed.setDescription(`**Filtered by Staff:** ${staffFilter.tag}`);
    }
    if (categoryFilter) {
        const desc = embed.data.description || '';
        embed.setDescription(desc + `\n**Filtered by Category:** ${categoryFilter}`);
    }

    await interaction.editReply({
        embeds: [embed],
        flags: 64
    });
}

async function handleToggle(interaction) {
    await interaction.deferReply({ flags: 64 });

    const enabled = interaction.options.getBoolean('enabled');

    await GuildConfig.updateOne(
        { guildId: interaction.guildId },
        { $set: { enableFeedback: enabled } },
        { upsert: true }
    );

    await interaction.editReply({
        content: `✅ Feedback collection has been **${enabled ? 'enabled' : 'disabled'}**.`,
        flags: 64
    });
}

async function handleChannel(interaction) {
    await interaction.deferReply({ flags: 64 });

    const channel = interaction.options.getChannel('channel');

    if (channel) {
        await GuildConfig.updateOne(
            { guildId: interaction.guildId },
            { $set: { feedbackChannel: channel.id } },
            { upsert: true }
        );

        await interaction.editReply({
            content: `✅ Feedback will now be posted to ${channel}.`,
            flags: 64
        });
    } else {
        await GuildConfig.updateOne(
            { guildId: interaction.guildId },
            { $set: { feedbackChannel: null } },
            { upsert: true }
        );

        await interaction.editReply({
            content: `✅ Feedback channel posting has been disabled.`,
            flags: 64
        });
    }
}

export default { data, execute };
