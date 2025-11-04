import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  PermissionsBitField,
} from "discord.js";
import Whitelist from "../models/Whitelist.js";

export async function handleWhitelistApply(interaction) {
  const staffRoleId = process.env.STAFF_ROLE_ID;
  const member = interaction.member;
  const hasStaffRole = staffRoleId ? member.roles.cache.has(staffRoleId) : false;
  const canManageGuild = member.permissions.has(PermissionsBitField.Flags.ManageGuild);

  if (!hasStaffRole && !canManageGuild) {
    return interaction.reply({
      content: "❌ You don't have permission to use this command.",
      ephemeral: true,
    });
  }

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
}

export async function handleOpenModal(interaction) {
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
}

export async function handleModalSubmit(interaction, client) {
  if (!interaction.isModalSubmit()) return;
  
  await interaction.deferReply({ flags: 64 });

  const ign = interaction.fields.getTextInputValue("ign").trim();
  const discordTag = interaction.user.tag;

  const existing = await Whitelist.findOne({
    $or: [{ discordId: interaction.user.id }, { ign }],
  });

  if (existing) {
    return interaction.editReply({
      content: "❌ You (or this IGN) already have a pending or approved application."
    });
  }

  await Whitelist.create({
    discordId: interaction.user.id,
    discordTag,
    ign,
    status: "Pending",
  });

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
    content: "✅ Your application has been submitted for review. Please wait for staff to review it."
  });
}

export async function handleAcceptReject(interaction, client) {
  const staff = interaction.member;
  const staffRoleId = process.env.STAFF_ROLE_ID;
  const acceptRoleId = "1426799180059508819";

  if (!staff.roles.cache.has(staffRoleId) && !staff.roles.cache.has(acceptRoleId)) {
    return interaction.reply({
      content: "❌ You are not authorized to manage applications.",
      flags: 64
    });
  }

  const applicantId = interaction.customId.split("_").pop();
  const appData = await Whitelist.findOne({ discordId: applicantId });

  if (!appData) {
    return interaction.reply({
      content: "⚠️ Application not found in database.",
      flags: 64
    });
  }

  const applicant = await client.users.fetch(applicantId).catch(() => null);
  const message = interaction.message;
  const resultsChannel = await client.channels.fetch(process.env.PUBLIC_RESULTS_CHANNEL_ID);

  if (interaction.customId.startsWith("accept_app_")) {
    const consoleChannel = await client.channels.fetch(process.env.CONSOLE_CHANNEL_ID);
    const cmd = process.env.WHITELIST_COMMAND_TEMPLATE.replace("{ign}", appData.ign);
    await consoleChannel.send(`${process.env.CONSOLE_COMMAND_PREFIX}${cmd}`);

    try {
      const guildMember = await interaction.guild.members.fetch(applicantId);
      if (process.env.WHITELISTED_ROLE_ID) {
        await guildMember.roles.add(process.env.WHITELISTED_ROLE_ID, "Whitelist approved");
      }
    } catch {}

    await Whitelist.updateOne({ discordId: applicantId }, { status: "Accepted" });

    const acceptEmbed = new EmbedBuilder()
      .setTitle("APPLICATION RESULT | ZEAKMC")
      .setColor(0x57f287)
      .setThumbnail("https://media.discordapp.net/attachments/1146822834346283090/1430060184331485234/zeakmclgoo.png")
      .setDescription(
        `Hey ${applicant}\nYour in-game name **${appData.ign}** is **whitelisted successfully!**\n\nYou can join now ➜ [Server IP](https://discord.com/channels/1172901904934780968/1377936652516724776)`
      )
      .setTimestamp()
      .setFooter({
        text: "ZEAKMC 💚",
        iconURL: "https://media.discordapp.net/attachments/1146822834346283090/1430060184331485234/zeakmclgoo.png",
      });

    await resultsChannel.send({ content: `${applicant}`, embeds: [acceptEmbed] });

    const updatedEmbed = EmbedBuilder.from(message.embeds[0])
      .setColor(0x57f287)
      .spliceFields(2, 1, { name: "Status", value: `✅ Accepted by ${staff}` });
    await message.edit({ embeds: [updatedEmbed], components: [] });

    await interaction.reply({
      content: "✅ Application accepted and result posted.",
      flags: 64
    });
  }

  if (interaction.customId.startsWith("reject_app_")) {
    await Whitelist.updateOne({ discordId: applicantId }, { status: "Rejected" });

    const rejectEmbed = new EmbedBuilder()
      .setTitle("APPLICATION RESULT | ZEAKMC")
      .setColor(0xff0000)
      .setThumbnail("https://media.discordapp.net/attachments/1146822834346283090/1430060184331485234/zeakmclgoo.png")
      .setDescription(
        `Hey ${applicant}\nYour whitelist application for **${appData.ign}** has been **rejected** by the staff team.\n\nYou can reapply later if appropriate.`
      )
      .addFields({ name: "Reviewed By", value: `${staff}`, inline: true })
      .setTimestamp()
      .setFooter({
        text: "ZEAKMC 💔",
        iconURL: "https://media.discordapp.net/attachments/1146822834346283090/1430060184331485234/zeakmclgoo.png",
      });

    await resultsChannel.send({ content: `${applicant}`, embeds: [rejectEmbed] });

    const updatedEmbed = EmbedBuilder.from(message.embeds[0])
      .setColor(0xff0000)
      .spliceFields(2, 1, { name: "Status", value: `❌ Rejected by ${staff}` });
    await message.edit({ embeds: [updatedEmbed], components: [] });

    await interaction.reply({
      content: "🚫 Application rejected and result posted.",
      flags: 64
    });
  }
}
