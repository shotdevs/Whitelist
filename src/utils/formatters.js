export function formatTicketName(template, replacements) {
    let name = template;
    for (const key in replacements) {
        name = name.replace(`{${key}}`, replacements[key]);
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
