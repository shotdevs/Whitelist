import { AttachmentBuilder } from "discord.js";
import { NewWelcomeCard } from "pixel-cards";

const MESSAGE_FLAGS = 1 << 15;
const WELCOME_CHANNEL_ID = "1435129947709636629";
const BACKGROUND_IMAGE = "https://iili.io/KQObJJS.md.webp";

export async function sendWelcomeMessage(member, channel) {
  const card = await NewWelcomeCard({
    username: member.user.username,
    userPosition: "New Member",
    avatar: member.user.displayAvatarURL({ extension: "png", size: 256 }),
    backgroundImage: BACKGROUND_IMAGE
  });

  const attachment = new AttachmentBuilder(card, { name: "welcome.png" });

  await channel.send({
    flags: MESSAGE_FLAGS,
    files: [attachment],
    components: [
      {
        type: 17,
        components: [
          {
            type: 12,
            items: [
              {
                media: {
                  url: "attachment://welcome.png"
                }
              }
            ]
          },
          {
            type: 10,
            content: `# 🎉 Welcome to ZEAKMC!\n\nHey ${member}! We're excited to have you here!\n\n**Get Started:**\n• Check out <#1377936652516724776> for server info\n• Read the rules in <#1172901905513914450>\n• Say hi in chat!\n\n**Want to join the Minecraft server?**\nUse \`/whitelist-status\` to check if you're whitelisted, or ask a staff member about applying!\n\n-# You are member #${member.guild.memberCount}`
          }
        ]
      }
    ]
  });
}

export async function handleWelcome(member, client) {
  try {
    const welcomeChannel = await client.channels.fetch(WELCOME_CHANNEL_ID).catch(() => null);
    if (!welcomeChannel) {
      console.error("⚠️ Welcome channel not found");
      return;
    }

    await sendWelcomeMessage(member, welcomeChannel);
  } catch (error) {
    console.error("⚠️ Error sending welcome message:", error);
  }
}

export async function handleWelcomeTest(interaction) {
  try {
    await interaction.deferReply({ flags: 64 });

    const welcomeChannel = await interaction.client.channels.fetch(WELCOME_CHANNEL_ID).catch(() => null);
    if (!welcomeChannel) {
      return interaction.editReply({
        content: "❌ Welcome channel not found!"
      });
    }

    await sendWelcomeMessage(interaction.member, welcomeChannel);

    await interaction.editReply({
      content: `✅ Welcome card sent to <#${WELCOME_CHANNEL_ID}>!`
    });
  } catch (error) {
    console.error("⚠️ Error testing welcome card:", error);
    await interaction.editReply({
      content: "❌ Failed to send welcome card. Check console for errors."
    });
  }
}
