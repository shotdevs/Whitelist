import { Ticket, StaffActions } from '../models/ticketModels.js';
import { addUserToTicket } from './permissionManager.js';
import { createSuccessContainer } from './embedBuilder.js';

export async function handleSelectMenu(interaction) {
    const [action, data] = interaction.customId.split(':');

    if (action === 'select_user') {
        const ticketId = data;
        const ticket = await Ticket.findOne({ ticketId: ticketId });
        
        try {
            if (!ticket) {
                return interaction.reply({ content: 'This ticket no longer exists.', ephemeral: true });
            }
            
            const selectedUserId = interaction.values[0];
            
            // Add the selected user directly
            await addUserToTicket(interaction.channel, selectedUserId);
            ticket.participants.push(selectedUserId);
            await ticket.save();
            await StaffActions.create({ 
                guildId: interaction.guild.id, 
                ticketId: ticket.ticketId, 
                staffId: interaction.user.id, 
                action: 'add_user', 
                targetUserId: selectedUserId 
            });
            
            await interaction.reply({ 
                content: `<@${selectedUserId}> has been added to the ticket.`, 
                ephemeral: true 
            });
            
            // Notify in the ticket channel
            await interaction.channel.send(
                createSuccessContainer(`<@${selectedUserId}> has been added to the ticket by ${interaction.user.tag}.`)
            );
        } catch (error) {
            console.error('Error in select_user handler:', error);
            try {
                await interaction.reply({ 
                    content: 'An error occurred while adding the user to the ticket.', 
                    ephemeral: true 
                });
            } catch (replyError) {
                // Interaction likely expired
                return;
            }
        }
    }
}

export default { handleSelectMenu };
