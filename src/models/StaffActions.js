import mongoose from 'mongoose';

const staffActionsSchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    ticketId: { type: String, required: true, index: true },
    staffId: { type: String, required: true, index: true },
    action: {
        type: String,
        enum: ['claim', 'close', 'reopen', 'delete', 'transfer', 'add_user', 'remove_user', 'rename'],
        required: true
    },
    targetUserId: { type: String, default: null },
    reason: { type: String, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now, expires: '90d' } // Auto-delete after 90 days
});

export default mongoose.model('StaffActions', staffActionsSchema);
