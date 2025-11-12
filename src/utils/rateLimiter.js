import NodeCache from 'node-cache';
import { GuildConfig, UserStats } from '../models/ticketModels.js';

const rateLimitCache = new NodeCache({ stdTTL: 300 }); // Cache for 5 minutes

export async function checkRateLimit(client, userId, guildId) {
    const cacheKey = `${userId}-${guildId}`;
    const cachedResult = rateLimitCache.get(cacheKey);
    if (cachedResult) {
        return cachedResult;
    }

    const guildConfig = await GuildConfig.findOne({ guildId });
    if (!guildConfig.rateLimit.enabled) {
        return { limited: false };
    }

    const guild = await client.guilds.fetch(guildId);
    const member = await guild.members.fetch(userId);
    const hasBypassRole = member.roles.cache.some(role => guildConfig.rateLimit.bypassRoles.includes(role.id));
    if (hasBypassRole) {
        return { limited: false };
    }

    const userStats = await UserStats.findOne({ userId, guildId });
    if (!userStats || !userStats.lastTicketCreated) {
        return { limited: false };
    }

    const timeSinceLastTicket = Date.now() - userStats.lastTicketCreated.getTime();
    if (timeSinceLastTicket < guildConfig.rateLimit.cooldown) {
        const result = {
            limited: true,
            remainingTime: guildConfig.rateLimit.cooldown - timeSinceLastTicket,
        };
        rateLimitCache.set(cacheKey, result);
        return result;
    }

    const result = { limited: false };
    rateLimitCache.set(cacheKey, result);
    return result;
}

export async function updateRateLimit(userId, guildId) {
    const cacheKey = `${userId}-${guildId}`;
    rateLimitCache.del(cacheKey);
    await UserStats.findOneAndUpdate(
        { userId, guildId },
        { lastTicketCreated: new Date() },
        { upsert: true }
    );
}

export default { checkRateLimit, updateRateLimit };
