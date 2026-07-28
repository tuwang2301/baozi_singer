# ldr-space-bot

## Overview
This is a Discord bot designed for long-distance relationship couples. It provides features for audio streaming, shared journals, countdowns, statistics tracking, and interactive letters.

## Features
* Music playback from YouTube links or queries.
* Paged lyrics search utilizing LRCLIB API with Genius scraping fallback.
* Shared love diary with page navigation and modal text entry.
* Anniversary and meetup countdown counters.
* Couple interaction count statistics.
* Future letters locked until a specified date with automatic background unlock notifications.

## Tech Stack
* Node.js (ES Modules)
* discord.js (v14)
* @discordjs/voice
* pg (PostgreSQL connection pooler client)
* cheerio (HTML scraping parser)
* ffmpeg-static

## Prerequisites
* Node.js version 18.0.0 or higher.
* A Discord bot token and application client ID from the Discord Developer Portal.
* A PostgreSQL database instance (such as Supabase).

## Installation
Run the following command to install dependencies:
```bash
npm install
```

## Configuration
Configure the application environment variables by creating a `.env` file in the root directory. Below is the configuration reference template:

| Environment Variable | Description | Required |
| --- | --- | --- |
| DISCORD_TOKEN | The authentication token for the Discord bot application. | Yes |
| CLIENT_ID | The client application ID of the bot. | Yes |
| GUILD_ID | The specific target Discord server ID for deploying commands. | Yes |
| YOUTUBE_COOKIE | Raw Netscape/JSON format cookie string to prevent YouTube streaming errors. | Yes |
| DATABASE_URL | PostgreSQL connection URI containing credentials and target host. | Yes |
| GENIUS_ACCESS_TOKEN | Client access token for the Genius API used to perform fallback lyrics searches. | No |

## Project Structure
* `commands/` - Slash command registration and execution logic.
* `interactions/` - Handlers for buttons, string select menus, and modal submissions.
* `music/` - Media streaming handlers, yt-dlp executors, and playback queue managers.
* `database.js` - Database initialization and PostgreSQL client helpers.
* `deploy-commands.js` - Script to register slash commands to the target guild.
* `index.js` - Main entry point, event routing, and background notifier jobs.

## Usage
Deploy the slash commands to your target guild:
```bash
npm run deploy
```

Start the bot service:
```bash
npm start
```

## Testing
No automated unit test suite is included in this repository. All verification is conducted manually via interactive execution on a Discord guild.

## License
Refer to the repository license configuration. No license file is currently present in the codebase.
