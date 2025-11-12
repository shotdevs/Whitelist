export function formatTicketName(template, replacements) {
    let name = template;
    
    if (replacements.increment !== undefined) {
        const paddedNum = String(replacements.increment).padStart(4, '0');
        name = name.replace(/{num}/g, paddedNum);
        name = name.replace(/{increment}/g, paddedNum);
    }
    
    if (replacements.username) {
        name = name.replace(/{username}/g, replacements.username);
    }
    
    if (replacements.userid) {
        name = name.replace(/{userid}/g, replacements.userid);
    }
    
    if (replacements.shortid) {
        name = name.replace(/{id}/g, replacements.shortid);
    }
    
    if (replacements.category) {
        name = name.replace(/{category}/g, replacements.category);
    }
    
    return name.replace(/[^a-zA-Z0-9-_]/g, '').substring(0, 100);
}

export function formatDuration(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    let str = '';
    if (days > 0) str += `${days}d `;
    if (hours > 0) str += `${hours}h `;
    if (minutes > 0) str += `${minutes}m `;
    if (seconds > 0) str += `${seconds}s`;

    return str.trim();
}

export function formatTimestamp(date) {
    return `<t:${Math.floor(date.getTime() / 1000)}:f>`;
}

export default {
    formatTicketName,
    formatDuration,
    formatTimestamp,
};
