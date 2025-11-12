import { GuildConfig } from '../models/ticketModels.js';
import { formatTimestamp } from './formatters.js';

export async function generateTranscript(ticket) {
    const guildConfig = await GuildConfig.findOne({ guildId: ticket.guildId });

    if (guildConfig.transcripts.format === 'html') {
        let html = `
            <html>
                <head>
                    <title>Ticket Transcript: ${ticket.ticketId}</title>
                    <style>
                        body { font-family: sans-serif; background-color: #36393f; color: #dcddde; }
                        .message { margin-bottom: 10px; }
                        .author { font-weight: bold; }
                        .timestamp { color: #72767d; font-size: 0.8em; }
                    </style>
                </head>
                <body>
                    <h1>Ticket Transcript: ${ticket.ticketId}</h1>
                    <p><strong>Creator:</strong> <@${ticket.creatorId}></p>
                    <p><strong>Category:</strong> ${ticket.categoryId}</p>
                    <hr>
        `;

        for (const message of ticket.messages) {
            html += `
                <div class="message">
                    <span class="author"><@${message.authorId}></span>
                    <span class="timestamp">${new Date(message.timestamp).toLocaleString()}</span>
                    <p>${message.content}</p>
                    ${message.attachments.map(url => `<a href="${url}">${url}</a>`).join('<br>')}
                </div>
            `;
        }

        html += '</body></html>';
        return html;
    } else {
        // Plain text transcript
        let transcript = `Transcript for ticket #${ticket.ticketId}\n`;
        transcript += `Created by: <@${ticket.creatorId}> on ${formatTimestamp(ticket.createdAt)}\n`;
        transcript += '==================================================\n';
        for (const message of ticket.messages) {
            transcript += `[${new Date(message.timestamp).toLocaleString()}] <@${message.authorId}>: ${message.content}\n`;
        }
        return transcript;
    }
}

export default { generateTranscript };
