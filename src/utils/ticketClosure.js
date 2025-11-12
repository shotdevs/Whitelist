import { AttachmentBuilder, ButtonStyle } from 'discord.js';
import { Ticket, StaffActions, UserStats, GuildConfig, CategoryConfig } from '../models/ticketModels.js';
import { generateTranscript } from './transcriptGenerator.js';
import { setTicketPermissions } from './permissionManager.js';
import { createCloseContainer } from './embedBuilder.js';
import { notifyTicketClosed } from './dmNotifier.js';
import { requestFeedback } from './feedbackCollector.js';

export async function closeTicket(client, ticket, closer, reason) {
    ticket.status = 'closed';
    ticket.closedAt = new Date();
    ticket.closedBy = closer.id;
    ticket.closeReason = reason;
    await ticket.save();

    const guildConfig = await GuildConfig.findOne({ guildId: ticket.guildId });
    const categoryConfig = await CategoryConfig.findOne({ categoryId: ticket.categoryId });

    const transcript = await generateTranscript(ticket);
    const attachment = new AttachmentBuilder(Buffer.from(transcript), { name: `transcript-${ticket.ticketId}.html` });

    const logChannelId = categoryConfig.logChannel || guildConfig.defaultLogChannel;
    if (logChannelId) {
        const guild = await client.guilds.fetch(ticket.guildId);
        const logChannel = await guild.channels.fetch(logChannelId);
        const logPayload = createCloseContainer(reason, closer);
        logPayload.files = [attachment];
        await logChannel.send(logPayload);
    }

    const guild = await client.guilds.fetch(ticket.guildId);
    const channel = await guild.channels.fetch(ticket.channelId);
    await channel.setName(`closed-${channel.name}`);
    await setTicketPermissions(channel, guild, ticket.creatorId, categoryConfig, true); // isClosed = true

    const closePayload = createCloseContainer(reason, closer);
    await channel.send(closePayload);
    
    await notifyTicketClosed(client, ticket.creatorId, ticket, guildConfig);

    await StaffActions.create({
        guildId: ticket.guildId,
        ticketId: ticket.ticketId,
        staffId: closer.id,
        action: 'close',
        reason: reason,
    });

    await UserStats.updateOne(
        { userId: ticket.creatorId, guildId: ticket.guildId },
        { $pull: { activeTickets: ticket.ticketId } }
    );
    
    await requestFeedback(client, ticket, guildConfig);
    
    // Auto-delete ticket after 5 seconds
    setTimeout(async () => {
        try {
            const existingTicket = await Ticket.findById(ticket._id);
            if (!existingTicket) {
                // Ticket was already deleted
                return;
            }

            try {
                const guild = await client.guilds.fetch(ticket.guildId);
                const channel = await guild.channels.fetch(ticket.channelId);
                
                await channel.send(createCloseContainer('This ticket will be deleted shortly.', closer));
                
                // Wait 5 seconds before deleting
                setTimeout(async () => {
                    try {
                        await channel.delete();
                    } catch (channelError) {
                        // Channel might have been manually deleted, which is fine
                        if (channelError.code !== 10003) { // 10003 = Unknown Channel
                            console.error('Error deleting channel:', channelError);
                        }
                    }
                }, 5000);
            } catch (channelError) {
                // Channel might have been manually deleted, which is fine
                if (channelError.code !== 10003) { // 10003 = Unknown Channel
                    console.error('Error fetching channel:', channelError);
                }
            }

            // Always try to clean up the database record
            await Ticket.deleteOne({ _id: ticket._id });
        } catch (error) {
            console.error('Error in ticket cleanup:', error);
        }
    }, 5000);
}

export async function deleteTicket(client, ticket) {
    try {
        const existingTicket = await Ticket.findById(ticket._id);
        if (!existingTicket) {
            // Ticket was already deleted
            return;
        }

        try {
            const guild = await client.guilds.fetch(ticket.guildId);
            const channel = await guild.channels.fetch(ticket.channelId);
            await channel.delete();
        } catch (channelError) {
            // Channel might have been manually deleted, which is fine
            if (channelError.code !== 10003) { // 10003 = Unknown Channel
                console.error('Error deleting channel:', channelError);
            }
        }

        // Always try to clean up the database record
        await Ticket.deleteOne({ _id: ticket._id });
    } catch (error) {
        console.error('Error in deleteTicket:', error);
    }
}

export default { closeTicket, deleteTicket };
