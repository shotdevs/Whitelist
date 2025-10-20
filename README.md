# Minecraft Auto-Whitelist Discord Bot

A **Discord bot** to automate whitelist applications for a Minecraft server integrated with **DiscordSRV**.  
Includes **MongoDB storage**, automatic **role assignment**, DM confirmation, staff logs, and **public whitelist result announcements**.

---

## Features

- `/whitelist-apply` command (staff-only)
- Button + Modal for Minecraft username & platform
- Automatic `_` prefix for Bedrock usernames
- DM confirmation to applicant
- Logs application in a staff-only channel
- Sends whitelist command to DiscordSRV console channel
- Assigns a “Whitelisted” role automatically
- Public announcement embed for successfully whitelisted players
- MongoDB storage of all applications
- Fully configurable via `.env`

---

## Tech Stack

- **Node.js** (v18+)
- **Discord.js v14**
- **MongoDB** (via Mongoose)
- **DiscordSRV** for server whitelist automation
- `.env` for sensitive configuration

---

## Setup

1.  **Clone the repository**
    ```bash
    git clone <your-repo-url>
    cd <repo-folder>
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Create `.env` in the project root:**
    ```env
    DISCORD_TOKEN=YOUR_BOT_TOKEN
    CLIENT_ID=YOUR_CLIENT_ID
    GUILD_ID=YOUR_GUILD_ID
    
    CONSOLE_CHANNEL_ID=DISCORDSRV_CONSOLE_CHANNEL_ID
    FORMS_CHANNEL_ID=WHITELIST_FORMS_CHANNEL_ID
    WHITELISTED_ROLE_ID=WHITELISTED_ROLE_ID
    STAFF_ROLE_ID=STAFF_ROLE_ID_OR_EMPTY
    
    MONGO_URI=MONGODB_CONNECTION_URI
    
    CONSOLE_COMMAND_PREFIX=!
    WHITELIST_COMMAND_TEMPLATE=whitelist add {ign}
    AUTO_WHITELIST=true
    
    PUBLIC_RESULTS_CHANNEL_ID=PUBLIC_WHITELIST_RESULTS_CHANNEL_ID
    SERVER_LOGO=[https://example.com/server_logo.png](https://example.com/server_logo.png)
    ```
    > Replace placeholders with your actual bot credentials, role/channel IDs, MongoDB URI, and server logo URL.

---

4.  **Deploy the slash command**
    ```bash
    npm run deploy
    ```

5.  **Run the bot**
    ```bash
    npm start
    ```

---

## Usage

1.  Staff runs `/whitelist-apply` → bot posts an embed with “Apply for Whitelist” button.

2.  User clicks the button → modal opens for Minecraft username and Platform.

3.  Bot actions on submission:
    - Saves application to MongoDB
    - Sends DM confirmation to user
    - Logs in forms channel for staff review
    - Sends whitelist command to DiscordSRV console channel
    - Assigns Whitelisted role
    - Posts public announcement embed in configured channel

---

## Folder Structure
project/
├── .env
├── package.json
├── deploy-commands.js
├── index.js
└── models/
    └── Whitelist.js

    ## Customization

- **Staff-only command:** Assign a role ID in `.env` for `STAFF_ROLE_ID` or rely on Manage Guild permission.
- **Whitelist command template:** Change `WHITELIST_COMMAND_TEMPLATE` in `.env` if your Minecraft server uses a different command.
- **Public announcement:** Add a server logo via `SERVER_LOGO` URL.

---

## Notes

- Discord modals do not support dropdowns, so Platform input is text-based (Java or Bedrock).
- Duplicate IGN checks can be added in MongoDB for extra security.
- DiscordSRV must be configured to accept commands from the console channel.

---

## License

MIT License – free to use, modify, and distribute.
