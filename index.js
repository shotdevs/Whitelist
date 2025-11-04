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
  PermissionsBitField,
} from "discord.js";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Whitelist from "./models/Whitelist.js";

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

// ------------------------------------------------
// MongoDB connection
// ------------------------------------------------
async function connectMongo() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
  }
}

// ------------------------------------------------
// Bot ready
// ------------------------------------------------
client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

// ------------------------------------------------
// Interaction handler
// ------------------------------------------------
client.on("interactionCreate", async (interaction) => {
  try {
    // ------------------------------------------------
    // /whitelist-apply command
    // ------------------------------------------------
    if (interaction.isChatInputCommand() && interaction.commandName === "whitelist-apply") {
      const staffRoleId = process.env.STAFF_ROLE_ID;
      const member = interaction.member;
      const hasStaffRole = staffRoleId ? member.roles.cache.has(staffRoleId) : false;
      const canManageGuild = member.permissions.has(PermissionsBitField.Flags.ManageGuild);

      if (!hasStaffRole && !canManageGuild)
        return interaction.reply({
          content: "❌ You don’t have permission to use this command.",
          ephemeral: true,
        });

      const embed = new EmbedBuilder()
        .setTitle("Whitelist Application")
        .setDescription("Click the button below to apply for whitelist access to the Minecraft server.")
        .setColor(0x00ff99)
        .setFooter({ text: "ZEAKMC | WHITELIST APPLICATION" });

      const button = new ButtonBuilder()
        .setCustomId("open_whitelist_modal")
        .setLabel("APPLY NOW")
        .setStyle(ButtonStyle.Primary);

      await interaction.reply({
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(button)],
      });
      return;
    }

    // ------------------------------------------------
    // Apply button pressed -> open modal
    // ------------------------------------------------
    if (interaction.isButton() && interaction.customId === "open_whitelist_modal") {
      const modal = new ModalBuilder()
        .setCustomId("whitelist_modal")
        .setTitle("ZEAKMC Whitelist Application");

      const ignInput = new TextInputBuilder()
        .setCustomId("ign")
        .setLabel("Minecraft Username (IGN)")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Blucifer_xd")
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(ignInput));
      await interaction.showModal(modal);
      return;
    }

    // ------------------------------------------------
    // Modal submitted -> save pending
    // ------------------------------------------------
    if (interaction.isModalSubmit() && interaction.customId === "whitelist_modal") {
      await interaction.deferReply({ ephemeral: true });

      const ign = interaction.fields.getTextInputValue("ign").trim();
      const discordTag = interaction.user.tag;

      // Check if exists
      const existing = await Whitelist.findOne({
        $or: [{ discordId: interaction.user.id }, { ign }],
      });
      if (existing) {
        return interaction.editReply({
          content: "❌ You (or this IGN) already have a pending or approved application.",
          ephemeral: true,
        });
      }

      await Whitelist.create({
        discordId: interaction.user.id,
        discordTag,
        ign,
        status: "Pending",
      });

      // Send to staff logs
      const logEmbed = new EmbedBuilder()
        .setTitle("📝 New Whitelist Application")
        .addFields(
          { name: "User", value: `<@${interaction.user.id}> (${discordTag})` },
          { name: "IGN", value: `\`${ign}\`` },
          { name: "Status", value: "🕓 Pending review" }
        )
        .setColor(0x0099ff)
        .setTimestamp();

      const acceptButton = new ButtonBuilder()
        .setCustomId(`accept_app_${interaction.user.id}`)
        .setLabel("✅ Accept")
        .setStyle(ButtonStyle.Success);

      const rejectButton = new ButtonBuilder()
        .setCustomId(`reject_app_${interaction.user.id}`)
        .setLabel("❌ Reject")
        .setStyle(ButtonStyle.Danger);

      const formsChannel = await client.channels.fetch(process.env.FORMS_CHANNEL_ID);
      await formsChannel.send({
        embeds: [logEmbed],
        components: [new ActionRowBuilder().addComponents(acceptButton, rejectButton)],
      });

      await interaction.editReply({
        content: "✅ Your application has been submitted for review. Please wait for staff to review it.",
        ephemeral: true,
      });
    }

    // ------------------------------------------------
    // Staff Accept / Reject
    // ------------------------------------------------
    if (
      interaction.isButton() &&
      (interaction.customId.startsWith("accept_app_") ||
        interaction.customId.startsWith("reject_app_"))
    ) {
      const staff = interaction.member;
      const staffRoleId = process.env.STAFF_ROLE_ID;
      if (!staff.roles.cache.has(staffRoleId))
        return interaction.reply({
          content: "❌ You are not authorized to manage applications.",
          ephemeral: true,
        });

      const applicantId = interaction.customId.split("_").pop();
      const appData = await Whitelist.findOne({ discordId: applicantId });
      if (!appData)
        return interaction.reply({
          content: "⚠️ Application not found in database.",
          ephemeral: true,
        });

      const applicant = await client.users.fetch(applicantId).catch(() => null);
      const message = interaction.message;
      const resultsChannel = await client.channels.fetch(
        process.env.PUBLIC_RESULTS_CHANNEL_ID
      );

      // ✅ ACCEPT
      if (interaction.customId.startsWith("accept_app_")) {
        const consoleChannel = await client.channels.fetch(process.env.CONSOLE_CHANNEL_ID);
        const cmd = process.env.WHITELIST_COMMAND_TEMPLATE.replace("{ign}", appData.ign);
        await consoleChannel.send(`${process.env.CONSOLE_COMMAND_PREFIX}${cmd}`);

        try {
          const guildMember = await interaction.guild.members.fetch(applicantId);
          if (process.env.WHITELISTED_ROLE_ID)
            await guildMember.roles.add(
              process.env.WHITELISTED_ROLE_ID,
              "Whitelist approved"
            );
        } catch {}

        await Whitelist.updateOne({ discordId: applicantId }, { status: "Accepted" });

        const acceptEmbed = new EmbedBuilder()
          .setTitle("APPLICATION RESULT | ZEAKMC")
          .setColor(0x57f287)
          .setThumbnail(
            "https://media.discordapp.net/attachments/1146822834346283090/1430060184331485234/zeakmclgoo.png"
          )
          .setDescription(
            `Hey ${applicant}\nYour in-game name **${appData.ign}** is **whitelisted successfully!**\n\nYou can join now ➜ [Server IP](https://discord.com/channels/1172901904934780968/1377936652516724776)`
          )
          .addFields({ name: "Approved By", value: `${staff}`, inline: true })
          .setTimestamp()
          .setFooter({
            text: "ZEAKMC 💚",
            iconURL:
              "https://media.discordapp.net/attachments/1146822834346283090/1430060184331485234/zeakmclgoo.png",
          });

        await resultsChannel.send({ content: `${applicant}`, embeds: [acceptEmbed] });

        const updatedEmbed = EmbedBuilder.from(message.embeds[0])
          .setColor(0x57f287)
          .spliceFields(2, 1, { name: "Status", value: `✅ Accepted by ${staff}` });
        await message.edit({ embeds: [updatedEmbed], components: [] });

        await interaction.reply({
          content: "✅ Application accepted and result posted.",
          ephemeral: true,
        });
      }

      // ❌ REJECT
      if (interaction.customId.startsWith("reject_app_")) {
        await Whitelist.updateOne({ discordId: applicantId }, { status: "Rejected" });

        const rejectEmbed = new EmbedBuilder()
          .setTitle("APPLICATION RESULT | ZEAKMC")
          .setColor(0xff0000)
          .setThumbnail(
            "https://media.discordapp.net/attachments/1146822834346283090/1430060184331485234/zeakmclgoo.png"
          )
          .setDescription(
            `Hey ${applicant}\nYour whitelist application for **${appData.ign}** has been **rejected** by the staff team.\n\nYou can reapply later if appropriate.`
          )
          .addFields({ name: "Reviewed By", value: `${staff}`, inline: true })
          .setTimestamp()
          .setFooter({
            text: "ZEAKMC 💔",
            iconURL:
              "https://media.discordapp.net/attachments/1146822834346283090/1430060184331485234/zeakmclgoo.png",
          });

        await resultsChannel.send({ content: `${applicant}`, embeds: [rejectEmbed] });

        const updatedEmbed = EmbedBuilder.from(message.embeds[0])
          .setColor(0xff0000)
          .spliceFields(2, 1, { name: "Status", value: `❌ Rejected by ${staff}` });
        await message.edit({ embeds: [updatedEmbed], components: [] });

        await interaction.reply({
          content: "🚫 Application rejected and result posted.",
          ephemeral: true,
        });
      }
    }
  } catch (err) {
    console.error("⚠️ Interaction handler error:", err);
  }
});

// ------------------------------------------------
// !wremove <ign> (Staff only)
// ------------------------------------------------
client.on("messageCreate", async (message) => {
  if (!message.content.startsWith("!wremove") || message.author.bot) return;

  const staffRoleId = process.env.STAFF_ROLE_ID;
  if (!message.member.roles.cache.has(staffRoleId))
    return message.reply("❌ You are not authorized to use this command.");

  const args = message.content.split(" ");
  const ign = args[1];
  if (!ign) return message.reply("⚠️ Usage: `!wremove <username>`");

  const whitelistData = await Whitelist.findOne({ ign });
  if (!whitelistData)
    return message.reply(`⚠️ No whitelist record found for **${ign}**.`);

  try {
    const consoleChannel = await client.channels.fetch(process.env.CONSOLE_CHANNEL_ID);
    const cmd = `whitelist remove ${ign}`;
    await consoleChannel.send(`${process.env.CONSOLE_COMMAND_PREFIX}${cmd}`);
  } catch (err) {
    console.error("⚠️ Console channel error:", err);
  }

  await Whitelist.deleteOne({ ign });
  await message.reply(`✅ Successfully removed **${ign}** from the whitelist.`);
});

// ------------------------------------------------
await connectMongo();
await client.login(process.env.DISCORD_TOKEN);
