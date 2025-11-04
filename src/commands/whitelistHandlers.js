import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField,
} from "discord.js";
import Whitelist from "../models/Whitelist.js";

const MESSAGE_FLAGS = 1 << 15;

export async function handleWhitelistStatus(interaction) {
  await interaction.deferReply({ flags: 64 });

  const application = await Whitelist.findOne({ discordId: interaction.user.id });

  if (!application) {
    return interaction.editReply({
      flags: MESSAGE_FLAGS,
      components: [
        {
          type: 17,
          components: [
            {
              type: 10,
              content: `# ❓ No Application Found\n\nHey <@${interaction.user.id}>!\n\nYou haven't submitted a whitelist application yet.\n\n**Want to apply?**\n check whitelist channel <#1429724945881235566> to create an application form.\n\n-# ZEAKMC Whitelist System`
            }
          ]
        }
      ]
    });
  }

  const statusEmoji = {
    Pending: "🕓",
    Accepted: "✅",
    Rejected: "❌"
  };

  const statusColor = {
    Pending: "🟡",
    Accepted: "🟢",
    Rejected: "🔴"
  };

  const statusMessage = {
    Pending: "Your application is currently under review by our staff team. Please be patient!",
    Accepted: "Congratulations! You've been whitelisted. Check <#1377936652516724776> for the server IP.",
    Rejected: "Your application was rejected. You may reapply if appropriate."
  };

  return interaction.editReply({
    flags: MESSAGE_FLAGS,
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: `# ${statusEmoji[application.status]} Whitelist Status\n\n**Applicant:** <@${interaction.user.id}>\n**IGN:** \`${application.ign}\`\n**Status:** ${statusColor[application.status]} **${application.status}**\n\n${statusMessage[application.status]}\n\n**Submitted:** <t:${Math.floor(new Date(application.date).getTime() / 1000)}:R>\n\n-# ZEAKMC Whitelist System`
          }
        ]
      }
    ]
  });
}

export async function handleWhitelistApply(interaction) {
  const staffRoleId = process.env.STAFF_ROLE_ID;
  const member = interaction.member;
  const hasStaffRole = staffRoleId ? member.roles.cache.has(staffRoleId) : false;
  const canManageGuild = member.permissions.has(PermissionsBitField.Flags.ManageGuild);

  if (!hasStaffRole && !canManageGuild) {
    return interaction.reply({
      content: "❌ You don't have permission to use this command.",
      flags: 64
    });
  }

  const applyButton = new ButtonBuilder()
    .setCustomId("open_whitelist_modal")
    .setLabel("✨ APPLY NOW")
    .setStyle(ButtonStyle.Success);

  await interaction.reply({
    flags: MESSAGE_FLAGS,
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: "# 🎮 Whitelist Application\n\nClick the button below to apply for whitelist access to the **ZEAKMC Minecraft Server**.\n\n**Requirements:**\n• Valid Minecraft username\n• Discord account in good standing\n\n-# ZEAKMC | Powered by your application"
          },
          {
            type: 1,
            components: [applyButton]
          }
        ]
      }
    ]
  });
}

export async function handleOpenModal(interaction) {
  const existingApplication = await Whitelist.findOne({
    discordId: interaction.user.id,
    status: { $in: ["Pending", "Accepted"] },
  });

  if (existingApplication) {
    return interaction.reply({
      content: "You have already submitted an application.",
      flags: 64
    });
  }

  const platformSelectMenu = {
    type: 3, // String Select
    custom_id: "platform_select",
    placeholder: "Choose your platform",
    options: [
      {
        label: "Java Edition",
        value: "java",
        description: "For PC/Mac/Linux Java Edition players",
        emoji: { name: "☕" },
      },
      {
        label: "Bedrock Edition",
        value: "bedrock",
        description: "For Console/Mobile/Windows 10 Bedrock players",
        emoji: { name: "🎮" },
      },
    ],
  };

  await interaction.reply({
    flags: 64,
    // Use legacy-style action row for interaction replies (type 1 required at top-level)
    content: "# 📝 Whitelist Application\n\nPlease select your Minecraft platform below:",
    components: [
      {
        type: 1, // Action Row
        components: [platformSelectMenu],
      },
    ],
  });
}

export async function handlePlatformSelect(interaction) {
  const platform = interaction.values[0];

  const modal = new ModalBuilder()
    .setCustomId(`whitelist_modal_${platform}`)
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
  const platform = interaction.customId.split("_")[2];
  const discordTag = interaction.user.tag;

  const existing = await Whitelist.findOne({
    discordId: interaction.user.id,
    status: { $in: ['Pending', 'Accepted'] }
  });

  if (existing) {
    return interaction.editReply({
      content: "❌ You already have a pending or approved application. Only rejected users can reapply."
    });
  }

  const existingIgn = await Whitelist.findOne({
    ign,
    status: { $in: ['Pending', 'Accepted'] }
  });

  if (existingIgn) {
    return interaction.editReply({
      content: "❌ This IGN already has a pending or approved application."
    });
  }

  await Whitelist.create({
    discordId: interaction.user.id,
    discordTag,
    ign,
    platform,
    status: "Pending",
  });

  const acceptButton = new ButtonBuilder()
    .setCustomId(`accept_app_${interaction.user.id}`)
    .setLabel("✅ Accept")
    .setStyle(ButtonStyle.Success);

  const rejectButton = new ButtonBuilder()
    .setCustomId(`reject_app_${interaction.user.id}`)
    .setLabel("❌ Reject")
    .setStyle(ButtonStyle.Danger);

  const platformEmoji = platform === 'java' ? '☕' : '🎮';
  const platformName = platform === 'java' ? 'Java Edition' : 'Bedrock Edition';

  const formsChannel = await client.channels.fetch(process.env.FORMS_CHANNEL_ID);
  await formsChannel.send({
    flags: MESSAGE_FLAGS,
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: `# 📝 New Whitelist Application\n\n**Applicant:** <@${interaction.user.id}>\n**Discord Tag:** \`${discordTag}\`\n**IGN:** \`${ign}\`\n**Platform:** ${platformEmoji} ${platformName}\n\n**Status:** 🕓 Pending Review\n\n-# Submitted on <t:${Math.floor(Date.now() / 1000)}:F>`
          },
          {
            type: 1,
            components: [acceptButton, rejectButton]
          }
        ]
      }
    ]
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
    const finalIgn = appData.platform === 'bedrock' ? `_${appData.ign}` : appData.ign;
    const cmd = process.env.WHITELIST_COMMAND_TEMPLATE.replace("{ign}", finalIgn);
    await consoleChannel.send(`${process.env.CONSOLE_COMMAND_PREFIX}${cmd}`);

    try {
      const guildMember = await interaction.guild.members.fetch(applicantId);
      if (process.env.WHITELISTED_ROLE_ID) {
        await guildMember.roles.add(process.env.WHITELISTED_ROLE_ID, "Whitelist approved");
      }
    } catch {}

    await Whitelist.updateOne({ discordId: applicantId }, { status: "Accepted" });

    await resultsChannel.send({
      flags: MESSAGE_FLAGS,
      // ensure the applicant mention pings correctly when using Components V2
      allowed_mentions: { users: [applicantId] },
      components: [
        {
          type: 17,
          components: [
            {
              type: 10,
              content: `# ✅ APPLICATION APPROVED | ZEAKMC\n\nHey <@${applicantId}>! Great news!\n\n**Your IGN \`${appData.ign}\` has been whitelisted successfully!**\n\nYou can now join the server:\n➜ Check <#1377936652516724776> for the server IP \n\n-# Welcome to ZEAKMC 💚`
            }
          ]
        }
      ]
    });

    await message.edit({
      flags: MESSAGE_FLAGS,
      components: [
        {
          type: 17,
          components: [
            {
              type: 10,
              content: `# 📝 Whitelist Application\n\n**Applicant:** <@${applicantId}>\n**Discord Tag:** \`${appData.discordTag}\`\n**IGN:** \`${appData.ign}\`\n\n**Status:** ✅ Accepted by ${staff}\n\n-# Processed on <t:${Math.floor(Date.now() / 1000)}:F>`
            }
          ]
        }
      ]
    });

    await interaction.reply({
      content: "✅ Application accepted and result posted.",
      flags: 64
    });
  }

  if (interaction.customId.startsWith("reject_app_")) {
    await Whitelist.updateOne({ discordId: applicantId }, { status: "Rejected" });

    await resultsChannel.send({
      flags: MESSAGE_FLAGS,
      // ensure the applicant mention pings correctly when using Components V2
      allowed_mentions: { users: [applicantId] },
      components: [
        {
          type: 17,
          components: [
            {
              type: 10,
              content: `# ❌ APPLICATION REJECTED | ZEAKMC\n\nHey <@${applicantId}>,\n\nUnfortunately, your whitelist application for **\`${appData.ign}\`** has been **rejected** by the staff team.\n\n**You may reapply later if appropriate.**\n\n**Reviewed by:** ${staff}\n\n-# Thank you for your interest in ZEAKMC`
            }
          ]
        }
      ]
    });

    await message.edit({
      flags: MESSAGE_FLAGS,
      components: [
        {
          type: 17,
          components: [
            {
              type: 10,
              content: `# 📝 Whitelist Application\n\n**Applicant:** <@${applicantId}>\n**Discord Tag:** \`${appData.discordTag}\`\n**IGN:** \`${appData.ign}\`\n\n**Status:** ❌ Rejected by ${staff}\n\n-# Processed on <t:${Math.floor(Date.now() / 1000)}:F>`
            }
          ]
        }
      ]
    });

    await interaction.reply({
      content: "🚫 Application rejected and result posted.",
      flags: 64
    });
  }
}
