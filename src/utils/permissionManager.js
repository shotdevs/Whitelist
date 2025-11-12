import { PermissionsBitField } from 'discord.js';

export async function setTicketPermissions(channel, guild, creatorId, categoryConfig, isClosed = false) {
    const staffRoles = categoryConfig.staffRoles.map(roleId => ({
        id: roleId,
        allow: [PermissionsBitField.Flags.ViewChannel],
    }));

    const overwrites = [
        {
            id: guild.roles.everyone,
            deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
            id: creatorId,
            allow: [PermissionsBitField.Flags.ViewChannel],
            deny: isClosed ? [PermissionsBitField.Flags.SendMessages] : [],
        },
        ...staffRoles,
    ];

    await channel.permissionOverwrites.set(overwrites);
}

export async function addUserToTicket(channel, userId) {
    await channel.permissionOverwrites.edit(userId, {
        ViewChannel: true,
        SendMessages: true,
    });
}

export async function removeUserFromTicket(channel, userId) {
    await channel.permissionOverwrites.delete(userId);
}

export default {
    setTicketPermissions,
    addUserToTicket,
    removeUserFromTicket,
};
