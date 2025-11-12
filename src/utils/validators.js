export async function validateChannelId(client, guildId, channelId) {
    try {
        const guild = await client.guilds.fetch(guildId);
        const channel = await guild.channels.fetch(channelId);
        return { valid: !!channel, error: null };
    } catch (error) {
        return { valid: false, error: 'Channel not found or bot lacks permissions.' };
    }
}

// Add more validators as needed...

export default {
    validateChannelId,
};
