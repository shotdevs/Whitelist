const COMPONENT_FLAGS = 1 << 15;

export function createTicketContainer(ticket, buttons = []) {
    const components = [
        {
            type: 10,
            content: `# 🎫 Ticket #${ticket.ticketId.substring(0, 8)}\n**Created by:** <@${ticket.creatorId}> • **Status:** \`${ticket.status}\``
        },
        {
            type: 14,
            divider: true,
            spacing: 1
        },
        {
            type: 10,
            content: `**📋 Category:** ${ticket.categoryId}\n**📅 Created:** <t:${Math.floor(ticket.createdAt.getTime() / 1000)}:R>\n**🆔 Ticket ID:** \`${ticket.ticketId.substring(0, 8)}\`\n**📝 Reason:** ${ticket.modalResponses.reason || 'No reason provided'}`
        }
    ];

    if (buttons.length > 0) {
        components.push({
            type: 1,
            components: buttons
        });
    }

    const container = { type: 17, components, accent_color: null };

    return { flags: COMPONENT_FLAGS, components: [container] };
}

export function createSuccessContainer(message, buttons = []) {
    const components = [
        {
            type: 10,
            content: `# ✅ Success\n${message}`
        }
    ];

    if (buttons.length > 0) {
        components.push({
            type: 1,
            components: buttons
        });
    }

    const container = { type: 17, components, accent_color: null };
    return { flags: COMPONENT_FLAGS, components: [container] };
}

export function createErrorContainer(message) {
    const container = {
        type: 17,
        components: [{ type: 10, content: `# ❌ Error\n${message}` }],
        accent_color: null
    };
    return { flags: COMPONENT_FLAGS, components: [container] };
}

export function createInfoContainer(title, description, buttons = []) {
    const components = [
        {
            type: 10,
            content: `# ℹ️ ${title}\n${description}`
        }
    ];

    if (buttons.length > 0) {
        components.push({
            type: 1,
            components: buttons
        });
    }

    const container = { type: 17, components, accent_color: null };
    return { flags: COMPONENT_FLAGS, components: [container] };
}

export function createLogContainer({ action, staffMember, target, reason }) {
    let content = '# 📝 Ticket Action Log\n';
    if (action) content += `**Action:** ${action}\n`;
    if (staffMember) content += `**👤 Staff Member:** ${staffMember}\n`;
    if (target) content += `**🎯 Target:** ${target}\n`;
    if (reason) content += `**📝 Reason:** ${reason}\n`;
    content += `\n*<t:${Math.floor(Date.now() / 1000)}:F>*`;

    const container = { type: 17, components: [{ type: 10, content }], accent_color: null };
    return { flags: COMPONENT_FLAGS, components: [container] };
}

export function createStatsContainer(stats) {
    return {
        flags: COMPONENT_FLAGS,
        components: [{
            type: 17,
            components: [
                { type: 10, content: `# 📊 Ticket Statistics` },
                { type: 14, divider: true, spacing: 1 },
                { type: 10, content: `**📈 Total Tickets:** ${stats.totalTickets}\n**🔓 Open Tickets:** ${stats.openTickets}\n**🔒 Closed Tickets:** ${stats.closedTickets}\n**➕ Created by Users:** ${stats.totalCreated}\n**➖ Closed by Users:** ${stats.totalClosed}` }
            ],
            accent_color: null
        }]
    };
}

export function createPanelContainer(title, description, color, buttons = []) {
    const components = [
        {
            type: 10,
            content: `# 🎫 ${title}\n${description}`
        },
        {
            type: 14,
            divider: true,
            spacing: 1
        },
        {
            type: 10,
            content: `**How to Create a Ticket**\nClick one of the buttons below to create a ticket. Our support team will assist you shortly.\n\n**Need Help?**\nIf you have any questions, feel free to reach out to our support team.`
        }
    ];

    if (buttons.length > 0) {
        components.push({
            type: 1,
            components: buttons
        });
    }

    const container = { type: 17, components, accent_color: null };
    if (color && color !== 'null') {
        try {
            const parsed = parseInt(color.replace('#', '0x'));
            if (!Number.isNaN(parsed)) container.accent_color = parsed;
        } catch (e) {
            container.accent_color = null;
        }
    }
    return { flags: COMPONENT_FLAGS, components: [container] };
}

export function createCloseContainer(reason, closer, buttons = []) {
    const components = [
        {
            type: 10,
            content: `# 🔒 Ticket Closed\n**Closed by:** <@${closer.id}>\n**Reason:** ${reason || 'No reason provided'}\n\n*<t:${Math.floor(Date.now() / 1000)}:F>*`
        }
    ];

    if (buttons.length > 0) components.push({ type: 1, components: buttons });
    const container = { type: 17, components, accent_color: null };
    return { flags: COMPONENT_FLAGS, components: [container] };
}

export { COMPONENT_FLAGS };

export default {
    createTicketContainer,
    createSuccessContainer,
    createErrorContainer,
    createInfoContainer,
    createLogContainer,
    createStatsContainer,
    createPanelContainer,
    createCloseContainer,
    COMPONENT_FLAGS
};
