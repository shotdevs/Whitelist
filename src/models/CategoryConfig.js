import mongoose from 'mongoose';

const modalFieldSchema = new mongoose.Schema({
    label: { type: String, required: true, maxLength: 45 },
    placeholder: { type: String, maxLength: 100 },
    required: { type: Boolean, default: true },
    minLength: { type: Number, default: 1 },
    maxLength: { type: Number, default: 4000 },
    style: { type: String, enum: ['short', 'paragraph'], default: 'short' }
});

const categoryConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    // categoryId should be unique per guild. Do not set `unique: true` here
    // as that creates a global unique index across all guilds. Instead we
    // create a compound unique index on { guildId, categoryId } below.
    categoryId: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: 'A ticket category.' },
    emoji: { type: String, default: '🎫' },
    buttonColor: { type: String, enum: ['primary', 'secondary', 'success', 'danger'], default: 'primary' },
    discordCategoryId: { type: String, required: true },
    staffRoles: { type: [String], default: [] },
    logChannel: { type: String, default: null },
    modalFields: {
        type: [modalFieldSchema],
        validate: [v => v.length <= 5, 'A category can have a maximum of 5 modal fields.']
    },
    namingScheme: { type: String, default: 'ticket-{increment}' },
    autoGreeting: { type: String, default: 'Welcome to your ticket! Please describe your issue.' },
    maxTicketsPerUser: { type: Number, default: 1 },
    enabled: { type: Boolean, default: true },
}, { timestamps: true });

// Ensure categoryId is unique within a guild (compound unique index)
categoryConfigSchema.index({ guildId: 1, categoryId: 1 }, { unique: true });

export default mongoose.model('CategoryConfig', categoryConfigSchema);
