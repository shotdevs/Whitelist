import { Schema, model } from 'mongoose';

const ticketFeedbackSchema = new Schema({
    ticketId: {
        type: String,
        required: true,
        index: true
    },
    guildId: {
        type: String,
        required: true,
        index: true
    },
    userId: {
        type: String,
        required: true,
        index: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    feedback: {
        type: String,
        default: ''
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    staffMember: {
        type: String,
        default: null
    },
    category: {
        type: String,
        default: null
    }
});

ticketFeedbackSchema.index({ guildId: 1, submittedAt: -1 });
ticketFeedbackSchema.index({ staffMember: 1, submittedAt: -1 });

export default model('TicketFeedback', ticketFeedbackSchema);
