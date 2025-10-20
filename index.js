// index.js
import {
  Client,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  PermissionsBitField
} from 'discord.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Whitelist from './models/Whitelist.js';

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.DirectMessages],
  partials: [Partials.Channel]
});

async function connectMongo() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err);
  }
}

client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  try {
    // /whitelist-apply command
    if (interaction.isChatInputCommand() && interaction.commandName === 'whitelist-apply') {
      const staffRoleId = process.env.STAFF_ROLE_ID;
      const member = interaction.member;
      const hasStaffRole = staffRoleId ? member.roles.cache.has(staffRoleId) : false;
      const canManageGuild = member.permissions.has(PermissionsBitField.Flags.ManageGuild);

      if (!hasStaffRole && !canManageGuild)
        return interaction.reply({ content: '❌ You don’t have permission to use this command.', ephemeral: true });

      const embed = new EmbedBuilder()
        .setTitle('🎮 Whitelist Application')
        .setDescription('Click the button below to apply for whitelist access to the Minecraft server.')
        .setColor(0x00ff99)
        .setFooter({ text: 'Applications are auto-whitelisted via DiscordSRV' });

      const button = new ButtonBuilder()
        .setCustomId('open_whitelist_modal')
        .setLabel('Apply for Whitelist')
        .setStyle(ButtonStyle.Primary);

      await interaction.reply({
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(button)]
      });
      return;
    }

    // Button pressed → open modal
    if (interaction.isButton() && interaction.customId === 'open_whitelist_modal') {
      const modal = new ModalBuilder()
        .setCustomId('whitelist_modal')
        .setTitle('Whitelist Application');

      const discordTagInput = new TextInputBuilder()
        .setCustomId('discordTag')
        .setLabel('Discord Tag (optional)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder(interaction.user.tag)
        .setRequired(false);

      const ignInput = new TextInputBuilder()
        .setCustomId('ign')
        .setLabel('Minecraft Username (IGN)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Player123')
        .setRequired(true);

      const platformInput = new TextInputBuilder()
        .setCustomId('platform')
        .setLabel('Platform (Java or Bedrock)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Java')
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(discordTagInput),
        new ActionRowBuilder().addComponents(ignInput),
        new ActionRowBuilder().addComponents(platformInput)
      );

      await interaction.showModal(modal);
      return;
    }

    // Modal submitted
    if (interaction.isModalSubmit() && interaction.customId === 'whitelist_modal') {
      await interaction.deferReply({ ephemeral: true });

      const discordTag = interaction.fields.getTextInputValue('discordTag') || interaction.user.tag;
      let ign = interaction.fields.getTextInputValue('ign').trim();
      let platform = interaction.fields.getTextInputValue('platform').trim();

      platform = platform.toLowerCase().startsWith('b') ? 'Bedrock' : 'Java';
      if (platform === 'Bedrock' && !ign.startsWith('_')) ign = `_${ign}`;

      try {
        await Whitelist.create({
          discordId: interaction.user.id,
          discordTag,
          ign,
          platform
        });
      } catch (err) {
        console.error('❌ DB write failed:', err);
      }

      // DM user
      try {
        await interaction.user.send({
          embeds: [
            new EmbedBuilder()
              .setTitle('✅ Whitelisted')
              .setDescription('You’ve been successfully whitelisted on the Minecraft server!')
              .addFields(
                { name: 'IGN', value: `\`${ign}\``, inline: true },
                { name: 'Platform', value: `\`${platform}\``, inline: true }
              )
              .setColor(0x57f287)
          ]
        });
      } catch {
        console.log('⚠️ User has DMs disabled.');
      }

      // Post to whitelist-forms channel
      try {
        const formsChannel = await client.channels.fetch(process.env.FORMS_CHANNEL_ID);
        if (formsChannel?.isTextBased()) {
          const logEmbed = new EmbedBuilder()
            .setTitle('📝 New Whitelist Application')
            .addFields(
              { name: 'User', value: `<@${interaction.user.id}> (${discordTag})` },
              { name: 'IGN', value: `\`${ign}\``, inline: true },
              { name: 'Platform', value: `\`${platform}\``, inline: true },
              { name: 'Date', value: new Date().toUTCString() },
              { name: 'Status', value: process.env.AUTO_WHITELIST === 'true' ? 'Auto-whitelisted via DiscordSRV' : 'Pending' }
            )
            .setColor(0x0099ff);
          await formsChannel.send({ embeds: [logEmbed] });
        }
      } catch (err) {
        console.error('⚠️ Could not post to forms channel:', err);
      }

      // Auto-whitelist using DiscordSRV console
      if (process.env.AUTO_WHITELIST === 'true') {
        try {
          const consoleChannel = await client.channels.fetch(process.env.CONSOLE_CHANNEL_ID);
          const cmd = process.env.WHITELIST_COMMAND_TEMPLATE.replace('{ign}', ign);
          await consoleChannel.send(`${process.env.CONSOLE_COMMAND_PREFIX}${cmd}`);
        } catch (err) {
          console.error('⚠️ Failed sending command to console channel:', err);
        }
      }

      // Assign role
      try {
        const member = await interaction.guild.members.fetch(interaction.user.id);
        const roleId = process.env.WHITELISTED_ROLE_ID;
        if (roleId && !member.roles.cache.has(roleId))
          await member.roles.add(roleId, 'Auto-whitelisted');
      } catch (err) {
        console.error('⚠️ Failed assigning role:', err);
      }
// Announce whitelist result publicly
try {
  const resultsChannel = await client.channels.fetch(process.env.PUBLIC_RESULTS_CHANNEL_ID);
  if (resultsChannel?.isTextBased()) {
    const publicEmbed = new EmbedBuilder()
      .setTitle('🎉 Whitelist Application Result')
      .setDescription(`Hey ${interaction.user}, you have been **whitelisted successfully** on the Minecraft server!`)
      .addFields(
        { name: 'IGN', value: `\`${ign}\``, inline: true },
        { name: 'Platform', value: `\`${platform}\``, inline: true }
      )
      .setThumbnail(process.env.SERVER_LOGO || null)
      .setColor(0x57f287)
      .setTimestamp()
      .setFooter({ text: 'Welcome to the community!' });

    await resultsChannel.send({ content: `Congrats ${interaction.user}! 🎉`, embeds: [publicEmbed] });
  }
} catch (err) {
  console.error('⚠️ Failed posting public whitelist message:', err);
}
      await interaction.editReply({
        content: '✅ Application submitted and processed successfully.',
        ephemeral: true
      });
    }
  } catch (err) {
    console.error('⚠️ Interaction handler error:', err);
  }
});

await connectMongo();
await client.login(process.env.DISCORD_TOKEN);
