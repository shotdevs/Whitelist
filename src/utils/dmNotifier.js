import { createInfoContainer } from './embedBuilder.js';
import logger from './logger.js';

async function sendDMNotification(client, userId, payload) {
    try {
        const user = await client.users.fetch(userId);
        await user.send(payload);
    } catch (error) {
        logger.logWarn('Failed to send DM notification', { userId, error: error.message });
    }
}

export async function notifyTicketCreated(client, userId, ticket, guildConfig) {
    if (guildConfig && guildConfig.dmNotifications && guildConfig.dmNotifications.onCreate) {
        const guild = await client.guilds.fetch(ticket.guildId).catch(() => null);
        const guildName = guild ? guild.name : 'Unknown Server';
        const payload = createInfoContainer('Ticket Created', `Your ticket #${ticket.ticketId.substring(0,8)} has been created in ${guildName}. You can view it here: <#${ticket.channelId}>`);
        await sendDMNotification(client, userId, payload);
    }
}

export async function notifyTicketClosed(client, userId, ticket, guildConfig) {
    if (guildConfig && guildConfig.dmNotifications && guildConfig.dmNotifications.onClose) {
        const guild = await client.guilds.fetch(ticket.guildId).catch(() => null);
        const guildName = guild ? guild.name : 'Unknown Server';
        const payload = createInfoContainer('Ticket Closed', `Your ticket #${ticket.ticketId.substring(0,8)} in ${guildName} has been closed.`);
        await sendDMNotification(client, userId, payload);
    }
}

export default {
    notifyTicketCreated,
    notifyTicketClosed,
};
