import { SlashCommandBuilder } from '@discordjs/builders';
import { PermissionFlagsBits } from 'discord-api-types/v10';
import { ChannelType } from 'discord.js';
import { CategoryConfig } from '../models/ticketModels.js';
import { createSuccessContainer, createErrorContainer, createInfoContainer } from '../utils/embedBuilder.js';

export const data = new SlashCommandBuilder()
    .setName('ticket-category')
    .setDescription('Manage ticket categories.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand(subcommand =>
        subcommand
            .setName('create')
            .setDescription('Creates a new ticket category.')
            .addStringOption(option => option.setName('name').setDescription('The name of the category').setRequired(true))
            .addChannelOption(option =>
                option.setName('discord-category')
                    .setDescription('The Discord category to create tickets in')
                    .addChannelTypes(ChannelType.GuildCategory)
                    .setRequired(true))
            .addStringOption(option => option.setName('description').setDescription('A description for the category'))
            .addStringOption(option => option.setName('emoji').setDescription('An emoji for the category button'))
            .addStringOption(option => 
                option.setName('button-color')
                    .setDescription('The color of the category button')
                    .addChoices(
                        { name: 'Primary (Blue)', value: 'primary' },
                        { name: 'Secondary (Grey)', value: 'secondary' },
                        { name: 'Success (Green)', value: 'success' },
                        { name: 'Danger (Red)', value: 'danger' }
                    ))
            .addRoleOption(option => option.setName('role1').setDescription('First staff role'))
            .addRoleOption(option => option.setName('role2').setDescription('Second staff role'))
            .addRoleOption(option => option.setName('role3').setDescription('Third staff role'))
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('edit')
            .setDescription('Edits an existing ticket category.')
            .addStringOption(option => option.setName('category-id').setDescription('The ID of the category to edit').setRequired(true))
            .addStringOption(option => option.setName('name').setDescription('The new name of the category'))
            .addStringOption(option => 
                option.setName('button-color')
                    .setDescription('The color of the category button')
                    .addChoices(
                        { name: 'Primary (Blue)', value: 'primary' },
                        { name: 'Secondary (Grey)', value: 'secondary' },
                        { name: 'Success (Green)', value: 'success' },
                        { name: 'Danger (Red)', value: 'danger' }
                    ))
            .addRoleOption(option => option.setName('role1').setDescription('First staff role'))
            .addRoleOption(option => option.setName('role2').setDescription('Second staff role'))
            .addRoleOption(option => option.setName('role3').setDescription('Third staff role'))
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('delete')
            .setDescription('Deletes a ticket category.')
            .addStringOption(option => option.setName('category-id').setDescription('The ID of the category to delete').setRequired(true))
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('list')
            .setDescription('Lists all ticket categories in the server.')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('toggle')
            .setDescription('Toggles a ticket category on or off.')
            .addStringOption(option => option.setName('category-id').setDescription('The ID of the category to toggle').setRequired(true))
            .addBooleanOption(option => option.setName('enabled').setDescription('Whether the category should be enabled').setRequired(true))
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('naming')
            .setDescription('Set the ticket naming format for a category.')
            .addStringOption(option => option.setName('category-id').setDescription('The ID of the category').setRequired(true))
            .addStringOption(option => 
                option.setName('format')
                    .setDescription('Naming format: {num}, {username}, {id}')
                    .setRequired(true)
                    .addChoices(
                        { name: 'ticket-{num} (e.g., ticket-0001)', value: 'ticket-{num}' },
                        { name: 'ticket-{username} (e.g., ticket-john)', value: 'ticket-{username}' },
                        { name: '{username}-ticket (e.g., john-ticket)', value: '{username}-ticket' },
                        { name: '{username}-{num} (e.g., john-0001)', value: '{username}-{num}' },
                        { name: 'Custom format', value: 'custom' }
                    ))
            .addStringOption(option => 
                option.setName('custom')
                    .setDescription('Custom format (if "Custom format" selected). Use {num}, {username}, {id}')
                    .setRequired(false))
    );

export async function execute(interaction) {
    let interactionReplyAvailable = true;
    try {
        await interaction.deferReply({ ephemeral: true });
    } catch (error) {
        console.error('Failed to defer reply (category):', error);
        if (error && error.code === 10062) {
            interactionReplyAvailable = false;
        } else {
            return;
        }
    }
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'create') {
        const name = interaction.options.getString('name');
        const discordCategory = interaction.options.getChannel('discord-category');
        const description = interaction.options.getString('description');
        const emoji = interaction.options.getString('emoji');
        const buttonColor = interaction.options.getString('button-color') || 'primary';
        const staffRoles = [
            interaction.options.getRole('role1'),
            interaction.options.getRole('role2'),
            interaction.options.getRole('role3'),
        ].filter(Boolean).map(r => r.id);

        try {
            const timestamp = Date.now();
            const randomNum = Math.floor(Math.random() * 10000);
            const categoryId = `${name.toLowerCase().replace(/\s+/g, '-')}-${timestamp}-${randomNum}`;
            
            const newCategory = new CategoryConfig({
                guildId: interaction.guild.id,
                categoryId: categoryId,
                name: name,
                discordCategoryId: discordCategory.id,
                description: description,
                emoji: emoji,
                buttonColor: buttonColor,
                staffRoles: staffRoles,
            });
            await newCategory.save();
            if (interactionReplyAvailable) {
                await interaction.editReply(createSuccessContainer(`Category "${name}" created successfully with ID: ${categoryId}`));
            } else {
                await interaction.channel?.send({ content: `Category "${name}" created successfully with ID: ${categoryId}` });
            }
        } catch (error) {
            if (error && (error.code === 11000 || (error.name === 'MongoError' && error.code === 11000))) {
                if (interactionReplyAvailable) {
                    return interaction.editReply(createErrorContainer('Error creating category: a category with that ID already exists.'));
                } else {
                    return interaction.channel?.send({ content: 'Error creating category: a category with that ID already exists.' });
                }
            }
            if (interactionReplyAvailable) {
                await interaction.editReply(createErrorContainer(`Error creating category: ${error.message}`));
            } else {
                await interaction.channel?.send({ content: `Error creating category: ${error.message}` });
            }
        }
    } else if (subcommand === 'edit') {
        const categoryId = interaction.options.getString('category-id');
        const newName = interaction.options.getString('name');
        const newButtonColor = interaction.options.getString('button-color');
        const newStaffRoles = [
            interaction.options.getRole('role1'),
            interaction.options.getRole('role2'),
            interaction.options.getRole('role3'),
        ].filter(Boolean).map(r => r.id);
        const category = await CategoryConfig.findOne({ categoryId: categoryId, guildId: interaction.guild.id });
        if (!category) {
            return interaction.editReply(createErrorContainer('Category not found.'));
        }
        if (newName) category.name = newName;
        if (newButtonColor) category.buttonColor = newButtonColor;
        if (newStaffRoles.length > 0) category.staffRoles = newStaffRoles;
        await category.save();
        await interaction.editReply(createSuccessContainer(`Category "${category.name}" (ID: ${category.categoryId}) updated successfully.`));
    } else if (subcommand === 'delete') {
        const categoryId = interaction.options.getString('category-id');
        await CategoryConfig.deleteOne({ categoryId: categoryId, guildId: interaction.guild.id });
        await interaction.editReply(createSuccessContainer('Category deleted successfully.'));
    } else if (subcommand === 'list') {
        const categories = await CategoryConfig.find({ guildId: interaction.guild.id });
        const categoryList = categories.map(c => `**ID:** ${c.categoryId} | **Name:** ${c.name} | **Enabled:** ${c.enabled} | **Button Color:** ${c.buttonColor}`).join('\n');
        const payload = createInfoContainer('Category List', categoryList || 'No categories found.');
        await interaction.editReply(payload);
    } else if (subcommand === 'toggle') {
        const categoryId = interaction.options.getString('category-id');
        const enabled = interaction.options.getBoolean('enabled');
        const category = await CategoryConfig.findOne({ categoryId: categoryId, guildId: interaction.guild.id });
        if (!category) {
            return interaction.editReply(createErrorContainer('Category not found.'));
        }
        category.enabled = enabled;
        await category.save();
        await interaction.editReply(createSuccessContainer(`Category "${category.name}" has been ${enabled ? 'enabled' : 'disabled'}.`));
    } else if (subcommand === 'naming') {
        const categoryId = interaction.options.getString('category-id');
        let format = interaction.options.getString('format');
        const custom = interaction.options.getString('custom');
        
        if (format === 'custom' && !custom) {
            return interaction.editReply(createErrorContainer('Please provide a custom format when selecting "Custom format".'));
        }
        
        if (format === 'custom') {
            format = custom;
        }
        
        const category = await CategoryConfig.findOne({ categoryId: categoryId, guildId: interaction.guild.id });
        if (!category) {
            return interaction.editReply(createErrorContainer('Category not found.'));
        }
        
        category.namingScheme = format;
        await category.save();
        
        await interaction.editReply(createSuccessContainer(`Naming format for category "${category.name}" updated to: \`${format}\`\n\nExample: \`${format.replace('{num}', '0001').replace('{username}', 'john').replace('{id}', 'abc123')}\``));
    }
}

export default { data, execute };
