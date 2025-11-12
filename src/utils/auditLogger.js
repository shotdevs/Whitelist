import { StaffActions } from '../models/ticketModels.js';

export async function logTicketAction(guildId, ticketId, staffId, action, reason, targetUserId) {
    await StaffActions.create({
        guildId,
        ticketId,
        staffId,
        action,
        reason,
        targetUserId,
    });
    // This is a simplified version. A complete implementation would also send a message to a log channel.
}

export default {
    logTicketAction,
};
