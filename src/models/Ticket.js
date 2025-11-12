import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    authorId: { type: String, required: true },
    content: { type: String, required: true, maxLength: 2000 },
    timestamp: { type: Date, default: Date.now },
    attachments: { type: [String], default: [] }
});

const transferHistorySchema = new mongoose.Schema({
    from: { type: String },
    to: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const ticketSchema = new mongoose.Schema({
    ticketId: { type: String, required: true, unique: true },
    guildId: { type: String, required: true, index: true },
    categoryId: { type: String, ref: 'CategoryConfig', required: true },
    channelId: { type: String, required: true, index: true },
    creatorId: { type: String, required: true, index: true },
    claimedBy: { type: String, default: null },
    status: { type: String, enum: ['open', 'pending', 'claimed', 'closed', 'archived'], default: 'open', index: true },
    closedAt: { type: Date, default: null },
    lastActivity: { type: Date, default: Date.now },
    participants: { type: [String], default: [] },
    modalResponses: { type: mongoose.Schema.Types.Mixed, default: {} },
    messages: { type: [messageSchema], default: [] },
    transferHistory: { type: [transferHistorySchema], default: [] },
    closeReason: { type: String, default: null },
    closedBy: { type: String, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

ticketSchema.virtual('age').get(function() {
    return Date.now() - this.createdAt;
});

export default mongoose.model('Ticket', ticketSchema);
