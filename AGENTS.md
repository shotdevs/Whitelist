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
This is a Discord.js v14 bot combining **Minecraft server whitelist management** (integrated with DiscordSRV) and a **full-featured ticket system**. The bot uses MongoDB for persistent storage and handles both whitelist applications and support tickets through Discord interactions.

### Core Components

**Entry Point** (`src/index.js`)
- Initializes Discord client with necessary intents (Guilds, GuildMembers, GuildMessages, MessageContent, DirectMessages)
- Verifies license for ticket system features (optional - skips if not configured)
- Connects to MongoDB on startup
- Sets up global error handlers
- Registers three main event handlers: `guildMemberAdd`, `interactionCreate`, `messageCreate`

**Event Flow**
1. **Interaction Events** → `interactionHandler.js` routes to appropriate handlers:
   - **Whitelist commands**: `/whitelist-apply`, `/whitelist-status`, `/welcome-test`
   - **Ticket commands**: `/ticket`, `/ticket-panel`, `/ticket-category`, `/ticket-list`, `/ticket-setup`, `/ticket-blacklist`, `/ticket-transcript`
   - **Button clicks**: whitelist accept/reject, ticket create/close/claim/add user/delete
   - **Modal submissions**: whitelist application form, ticket creation, ticket close reason, delete confirmation
   - **Select menus**: platform selection (whitelist), user selection (tickets)
   
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

### Ticket System Flow
1. **Setup**: Staff runs `/ticket-setup init` to initialize guild configuration
2. **Category Creation**: Staff uses `/ticket-category create` to create ticket categories with custom settings
3. **Panel Creation**: Staff uses `/ticket-panel` to create a ticket panel in a channel with buttons for each category
4. **Ticket Creation**:
   - User clicks button on panel → Modal opens with custom fields
   - On submission: Ticket channel created in designated category with permissions set
   - Staff notified in ticket channel with claim/close/add user buttons
5. **Ticket Management**:
   - Staff can claim tickets (`/ticket claim` or button)
   - Add users to tickets (`/ticket add` or button)
   - Close tickets with reason (`/ticket close` or button)
   - Delete tickets (`/ticket delete` or button)
   - Transfer ownership (`/ticket transfer`)
   - Reopen closed tickets (`/ticket reopen`)
   - Rename ticket channels (`/ticket rename`)
6. **Ticket Closure**:
   - Ticket status updated to "closed"
   - Transcript generated and sent to log channel
   - Channel renamed with "closed-" prefix
   - Permissions updated (creator can't send messages)
   - Auto-deleted after 10 seconds (5s warning + 5s delete)

### Database Schema

**Whitelist System**
- **Whitelist model** (`models/Whitelist.js`):
  - `discordId`: User's Discord ID (required)
  - `discordTag`: Username#discriminator
  - `ign`: Minecraft username (required)
  - `status`: Enum ['Pending', 'Accepted', 'Rejected']
  - `date`: Submission timestamp
  - `processedBy`: Staff who processed (default: 'bot')

**Ticket System** (all in `models/ticketModels.js`)
- **Ticket model**: Stores ticket information (ID, guild, category, channel, creator, status, messages, participants, etc.)
- **GuildConfig model**: Guild-wide settings (prefix, staff roles, log channel, rate limits, DM notifications, auto-close, transcripts, blacklists)
- **CategoryConfig model**: Ticket category configuration (name, description, emoji, button color, Discord category ID, staff roles, modal fields, naming scheme, greeting, max tickets per user)
- **UserStats model**: User statistics (tickets created/closed, response times)
- **StaffActions model**: Audit log for staff actions (claim, close, delete, transfer, add/remove user, rename)

### Utility Modules

**Logger** (`utils/logger.js`)
- Colored console logging with levels (debug, info, warn, error)
- Configurable via `LOG_LEVEL` environment variable

**Error Handler** (`utils/errorHandler.js`)
- Centralized error handling for commands and interactions
- Global unhandled rejection/exception handlers
- Graceful error messages to users

**License Manager** (`utils/LicenseManager.js`)
- Verifies license key with remote API
- Optional - bot starts without license verification if not configured
- Used for ticket system features

**Embed Builder** (`utils/embedBuilder.js`)
- Creates Discord component containers using raw API (type 17 containers)
- Functions for success, error, info, ticket, panel, stats, close, and log containers
- Uses `COMPONENT_FLAGS = 1 << 15` for suppressible embeds

**Ticket Utilities**:
- `buttonHandlers.js`: Handles ticket-related button interactions
- `modalHandlers.js`: Handles ticket modal submissions
- `selectMenuHandlers.js`: Handles user selection menus
- `ticketCreation.js`: Creates new tickets with permissions and database records
- `ticketClosure.js`: Closes and deletes tickets with transcripts
- `permissionManager.js`: Manages channel permissions for tickets
- `transcriptGenerator.js`: Generates HTML or text transcripts
- `rateLimiter.js`: Rate limits ticket creation per user
- `dmNotifier.js`: Sends DM notifications for ticket events
- `auditLogger.js`: Logs staff actions to database
- `formatters.js`: Formatting utilities for ticket names, durations, timestamps
- `validators.js`: Validation utilities

### Configuration
All configuration is done via `.env` file:

**Discord & MongoDB**:
- `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID`
- `MONGO_URI` (shared database for both systems)

**Whitelist System**:
- Channel IDs: `CONSOLE_CHANNEL_ID`, `FORMS_CHANNEL_ID`, `PUBLIC_RESULTS_CHANNEL_ID`, `WELCOME_CHANNEL_ID`
- Role IDs: `WHITELISTED_ROLE_ID`, `STAFF_ROLE_ID`
- DiscordSRV: `CONSOLE_COMMAND_PREFIX`, `WHITELIST_COMMAND_TEMPLATE`

**Ticket System** (Optional):
- `LICENSE_KEY`, `LICENSE_API_BASE_URL` (for license verification)
- `LOG_LEVEL` (debug, info, warn, error)
- `DEFAULT_COOLDOWN` (rate limit cooldown in milliseconds)

All ticket system settings (categories, staff roles, log channels, rate limits, DM notifications, etc.) are configured via slash commands rather than environment variables.

### Discord API Usage Notes
- Uses `flags: 64` for ephemeral replies (visible only to command user)
- Uses `MESSAGE_FLAGS = 1 << 15` for suppressible embeds
- Embeds created using raw component API (type 17 for container, type 10 for rich content, type 1 for action rows)
- Welcome cards use `pixel-cards` library to generate images
- Ticket buttons use Discord ButtonStyle enum (Primary, Secondary, Success, Danger)

### Integration with DiscordSRV
- Bot sends Minecraft commands to console channel as text messages prefixed with `CONSOLE_COMMAND_PREFIX`
- DiscordSRV must be configured to accept commands from the specified console channel
- Commands follow template: `{prefix}{template}` where template contains `{ign}` placeholder

### Module System
- **ES Modules** throughout (import/export syntax)
- All files use `.js` extension with `"type": "module"` in package.json
- Dynamic imports used for loading ticket commands in interaction handler

### Key Features

**Whitelist System**:
- Discord-based whitelist application workflow
- DiscordSRV integration for Minecraft command execution
- Staff review with accept/reject buttons
- Public results announcements
- Platform selection (Java/Bedrock)

**Ticket System**:
- Multi-category ticket support
- Custom modal fields per category
- Ticket claiming, transferring, and management
- User blacklisting
- Rate limiting with bypass roles
- DM notifications for ticket events
- Auto-close for inactive tickets
- HTML/text transcript generation
- Comprehensive audit logging
- User and ticket statistics tracking
- Permission-based access control
