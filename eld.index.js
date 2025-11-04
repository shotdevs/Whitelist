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
    // ----------------------------------------------------------------
    // 1. /whitelist-apply command
    // (This posts the initial "Apply" button)
    // ----------------------------------------------------------------
    if (interaction.isChatInputCommand() && interaction.commandName === 'whitelist-apply') {
      const staffRoleId = process.env.STAFF_ROLE_ID;
      const member = interaction.member;
      const hasStaffRole = staffRoleId ? member.roles.cache.has(staffRoleId) : false;
      const canManageGuild = member.permissions.has(PermissionsBitField.Flags.ManageGuild);

      if (!hasStaffRole && !canManageGuild)
        return interaction.reply({ content: '❌ You don’t have permission to use this command.', ephemeral: true });

      const embed = new EmbedBuilder()
        .setTitle('Whitelist Application')
        .setDescription('Click the button below to apply for whitelist access to the Minecraft server.')
        .setColor(0x00ff99)
        .setFooter({ text: 'ZEAKMC| WHITELIST APPLICATION' });

      const button = new ButtonBuilder()
        .setCustomId('open_whitelist_modal') // This ID now triggers the platform choice
        .setLabel('APPLY NOW')
        .setStyle(ButtonStyle.Primary);

      await interaction.reply({
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(button)]
      });
      return;
    }

    // ----------------------------------------------------------------
    // 2. "Apply for Whitelist" Button Pressed
    // (This now shows the Java/Bedrock platform choice)
    // ----------------------------------------------------------------
    if (interaction.isButton() && interaction.customId === 'open_whitelist_modal') {
      const javaButton = new ButtonBuilder()
        .setCustomId('select_platform_java')
        .setLabel('Java Edition')
        .setStyle(ButtonStyle.Success);

      const bedrockButton = new ButtonBuilder()
        .setCustomId('select_platform_bedrock')
        .setLabel('Bedrock Edition')
        .setStyle(ButtonStyle.Secondary);

      await interaction.reply({
        content: 'Please select your Minecraft platform:',
        components: [new ActionRowBuilder().addComponents(javaButton, bedrockButton)],
        ephemeral: true // This message is hidden
      });
      return;
    }

    // ----------------------------------------------------------------
    // 3. Platform Button (Java or Bedrock) Pressed
    // (This opens the simplified modal)
    // ----------------------------------------------------------------
    if (interaction.isButton() && (interaction.customId === 'select_platform_java' || interaction.customId === 'select_platform_bedrock')) {
      
      // We pass the platform choice in the modal's custom ID
      const modalCustomId = interaction.customId === 'select_platform_java' 
        ? 'whitelist_modal_java' 
        : 'whitelist_modal_bedrock';
      
      const platformName = interaction.customId === 'select_platform_java' ? 'Java' : 'Bedrock';

      const modal = new ModalBuilder()
        .setCustomId(modalCustomId)
        .setTitle(`${platformName} Whitelist Application`);

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
        .setPlaceholder('Blucifer_xd')
        .setRequired(true);

      // No more platform input needed!
      modal.addComponents(
        new ActionRowBuilder().addComponents(discordTagInput),
        new ActionRowBuilder().addComponents(ignInput)
      );

      await interaction.showModal(modal);
      return;
    }

    // ----------------------------------------------------------------
    // 4. Modal Submitted
    // (This processes the application)
    // ----------------------------------------------------------------
    if (interaction.isModalSubmit() && interaction.customId.startsWith('whitelist_modal_')) {
      await interaction.deferReply({ ephemeral: true });

      // Determine platform from the modal's ID
      const platform = interaction.customId === 'whitelist_modal_java' ? 'Java' : 'Bedrock';

      const discordTag = interaction.fields.getTextInputValue('discordTag') || interaction.user.tag;
      let ign = interaction.fields.getTextInputValue('ign').trim();

      // --- DUPLICATE CHECK ---
      const existing = await Whitelist.findOne({
        $or: [{ discordId: interaction.user.id }, { ign: ign }]
      });

      if (existing) {
        return interaction.editReply({
          content: `❌ You (or this IGN) are already whitelisted.`,
          ephemeral: true
        });
      }
      // --- END OF CHECK ---

      // Apply Bedrock prefix if needed
      if (platform === 'Bedrock' && !ign.startsWith('_')) ign = `_${ign}`;

      // --- Save to Database ---
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

      // --- DM user ---
      try {
        await interaction.user.send({
          embeds: [
            new EmbedBuilder()
.setTitle('APPLICATION RESULT | ZEAKMC')
                .setColor(0x57f287)
                .setThumbnail('https://media.discordapp.net/attachments/1146822834346283090/1430060184331485234/zeakmclgoo.png?ex=68f866d5&is=68f71555&hm=afaecd9c1d33de52c00093eda43a269a0405c6662e73788dcc0228e03dfe7bec&=&format=webp&quality=lossless&width=282&height=282')
                .setDescription(`Hey <@${interaction.user.id}> \n your in-game name ${ign} is whitelisted successfully you can join ip from https://discord.com/channels/1172901904934780968/1377936652516724776 Join now`)
                .addFields(
                    { name: 'Platform', value: `\`${platform}\``, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'ZEAKMC 💚', iconURL: 'https://media.discordapp.net/attachments/1146822834346283090/1430060184331485234/zeakmclgoo.png?ex=68f866d5&is=68f71555&hm=afaecd9c1d33de52c00093eda43a269a0405c6662e73788dcc0228e03dfe7bec&=&format=webp&quality=lossless&width=282&height=282' }) // <- Semicolon removed from here
        ]
    });
      } catch {
        console.log('⚠️ User has DMs disabled.');
      }

      // --- Post to staff logs channel ---
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

      // --- Auto-whitelist using DiscordSRV console ---
      if (process.env.AUTO_WHITELIST === 'true') {
        try {
          const consoleChannel = await client.channels.fetch(process.env.CONSOLE_CHANNEL_ID);
          const cmd = process.env.WHITELIST_COMMAND_TEMPLATE.replace('{ign}', ign);
          await consoleChannel.send(`${process.env.CONSOLE_COMMAND_PREFIX}${cmd}`);
        } catch (err) {
          console.error('⚠️ Failed sending command to console channel:', err);
        }
      }

      // --- Assign role ---
      try {
        const member = await interaction.guild.members.fetch(interaction.user.id);
        const roleId = process.env.WHITELISTED_ROLE_ID;
        if (roleId && !member.roles.cache.has(roleId))
          await member.roles.add(roleId, 'Auto-whitelisted');
      } catch (err) {
        console.error('⚠️ Failed assigning role:', err);
      }

      // --- Announce whitelist result publicly ---
      try {
        const resultsChannel = await client.channels.fetch(process.env.PUBLIC_RESULTS_CHANNEL_ID);
        if (resultsChannel?.isTextBased()) {
          const publicEmbed = new EmbedBuilder()
            .setTitle('APPLICATION RESULT | ZEAKMC')
            .setDescription(`Hey ${interaction.user}, 
   Your username ${ign} successfully whitelisted. ip in https://discord.com/channels/1172901904934780968/1377936652516724776 Join now!💚`)
            .setThumbnail('https://media.discordapp.net/attachments/1146822834346283090/1430060184331485234/zeakmclgoo.png?ex=68f866d5&is=68f71555&hm=afaecd9c1d33de52c00093eda43a269a0405c6662e73788dcc0228e03dfe7bec&=&format=webp&quality=lossless&width=282&height=282')
            .setColor(0x57f287)
            .setTimestamp()
            .setFooter({ text: 'ZEAKMC🩵', iconURL: 'https://media.discordapp.net/attachments/1146822834346283090/1430060184331485234/zeakmclgoo.png?ex=68f866d5&is=68f71555&hm=afaecd9c1d33de52c00093eda43a269a0405c6662e73788dcc0228e03dfe7bec&=&format=webp&quality=lossless&width=282&height=282'  });

          await resultsChannel.send({ content: `${interaction.user}`, embeds: [publicEmbed] });

        }
      } catch (err) {
        console.error('⚠️ Failed posting public whitelist message:', err);
      }
      
      // --- Send final hidden confirmation ---
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