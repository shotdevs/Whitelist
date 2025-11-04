import Whitelist from "../models/Whitelist.js";

export async function handleWhitelistRemove(message, client) {
  if (!message.content.startsWith("!wremove") || message.author.bot) return;

  const staffRoleId = process.env.STAFF_ROLE_ID;
  if (!message.member.roles.cache.has(staffRoleId)) {
    return message.reply("❌ You are not authorized to use this command.");
  }

  const args = message.content.split(" ");
  const ign = args[1];

  if (!ign) {
    return message.reply("⚠️ Usage: `!wremove <username>`");
  }

  const whitelistData = await Whitelist.findOne({ ign });
  if (!whitelistData) {
    return message.reply(`⚠️ No whitelist record found for **${ign}**.`);
  }

  try {
    const consoleChannel = await client.channels.fetch(process.env.CONSOLE_CHANNEL_ID);
    const cmd = `whitelist remove ${ign}`;
    await consoleChannel.send(`${process.env.CONSOLE_COMMAND_PREFIX}${cmd}`);
  } catch (err) {
    console.error("⚠️ Console channel error:", err);
  }

  await Whitelist.deleteOne({ ign });
  await message.reply(`✅ Successfully removed **${ign}** from the whitelist.`);
}
