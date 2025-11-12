import mongoose from 'mongoose';

const userStatsSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    ticketsCreated: { type: Number, default: 0 },
    ticketsClosed: { type: Number, default: 0 },
    lastTicketCreated: { type: Date, default: null },
    activeTickets: { type: [String], default: [] },
    totalResponseTime: { type: Number, default: 0 },
    averageResponseTime: { type: Number, default: 0 },
}, { timestamps: true });

userStatsSchema.index({ userId: 1, guildId: 1 }, { unique: true });

userStatsSchema.methods.incrementCreated = function() {
    this.ticketsCreated += 1;
    return this.save();
};

userStatsSchema.methods.incrementClosed = function() {
    this.ticketsClosed += 1;
    return this.save();
};

userStatsSchema.methods.updateResponseTime = function(duration) {
    this.totalResponseTime += duration;
    this.calculateAverage();
    return this.save();
};

userStatsSchema.methods.calculateAverage = function() {
    if (this.ticketsClosed > 0) {
        this.averageResponseTime = this.totalResponseTime / this.ticketsClosed;
    }
};

export default mongoose.model('UserStats', userStatsSchema);
