# AGENTS.md

This file provides guidance to Qoder (qoder.com) when working with code in this repository.

## Commands

### Development
- **Start bot**: `npm start` (runs src/index.js)
- **Deploy slash commands**: `npm run deploy` (registers Discord commands with the guild)

### Testing
- No automated test framework is configured in this project

## Architecture Overview

### Bot Structure
This is a Discord.js v14 bot for Minecraft server whitelist management integrated with DiscordSRV. The bot uses MongoDB for persistent storage and handles whitelist applications through Discord interactions.

### Core Components

**Entry Point** (`src/index.js`)
- Initializes Discord client with necessary intents (Guilds, GuildMembers, GuildMessages, MessageContent, DirectMessages)
- Connects to MongoDB on startup
- Registers three main event handlers: `guildMemberAdd`, `interactionCreate`, `messageCreate`

**Event Flow**
1. **Interaction Events** → `interactionHandler.js` routes to appropriate handlers:
   - Slash commands: `/whitelist-apply`, `/whitelist-status`, `/welcome-test`
   - Button clicks: `open_whitelist_modal`, accept/reject buttons
   - Modal submissions: whitelist application form
   
2. **Message Events** → `messageHandler.js` processes prefix commands:
   - `!wremove <username>` for manual whitelist removal

3. **Member Join Events** → `welcomeHandler.js` sends welcome cards using pixel-cards library

### Whitelist Application Flow
1. Staff runs `/whitelist-apply` → Bot posts embed with "Apply Now" button
2. User clicks button → Modal opens for IGN input
3. On submission:
   - Application saved to MongoDB with "Pending" status
   - Staff notification posted to forms channel with Accept/Reject buttons
   - User receives confirmation
4. Staff clicks Accept:
   - Sends whitelist command to DiscordSRV console channel
   - Assigns whitelisted role to user
   - Updates DB status to "Accepted"
   - Posts public announcement in results channel
5. Staff clicks Reject:
   - Updates DB status to "Rejected"
   - Posts public rejection notice in results channel

### Database Schema
**Whitelist model** (`models/Whitelist.js`):
- `discordId`: User's Discord ID (required)
- `discordTag`: Username#discriminator
- `ign`: Minecraft username (required)
- `status`: Enum ['Pending', 'Accepted', 'Rejected']
- `date`: Submission timestamp
- `processedBy`: Staff who processed (default: 'bot')

### Configuration
All configuration is done via `.env` file:
- Discord credentials: `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID`
- Channel IDs: `CONSOLE_CHANNEL_ID` (DiscordSRV), `FORMS_CHANNEL_ID` (staff review), `PUBLIC_RESULTS_CHANNEL_ID`
- Role IDs: `WHITELISTED_ROLE_ID`, `STAFF_ROLE_ID`
- MongoDB: `MONGO_URI`
- DiscordSRV settings: `CONSOLE_COMMAND_PREFIX` (default: !), `WHITELIST_COMMAND_TEMPLATE` (e.g., "whitelist add {ign}")
- Welcome card: `WELCOME_CHANNEL_ID` hardcoded in welcomeHandler.js:5

### Discord API Usage Notes
- Uses `flags: 64` for ephemeral replies (visible only to command user)
- Uses `MESSAGE_FLAGS = 1 << 15` for suppressible embeds
- Embeds created using raw component API (type 17 for container, type 10 for rich content, type 1 for action rows)
- Welcome cards use `pixel-cards` library to generate images

### Integration with DiscordSRV
- Bot sends Minecraft commands to console channel as text messages prefixed with `CONSOLE_COMMAND_PREFIX`
- DiscordSRV must be configured to accept commands from the specified console channel
- Commands follow template: `{prefix}{template}` where template contains `{ign}` placeholder
