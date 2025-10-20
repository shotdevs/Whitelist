// models/Whitelist.js
import mongoose from 'mongoose';

const WhitelistSchema = new mongoose.Schema({
  discordId: { type: String, required: true },
  discordTag: { type: String },
  ign: { type: String, required: true },
  platform: { type: String, enum: ['Java', 'Bedrock'], required: true },
  date: { type: Date, default: Date.now },
  processedBy: { type: String, default: 'bot' }
});

export default mongoose.models.Whitelist || mongoose.model('Whitelist', WhitelistSchema);
