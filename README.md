# 🎶 Baozi Singer (LDR Space Bot)

**Baozi Singer** (Ca sĩ Bánh Bao) is a dedicated Discord Bot customized for Long-Distance Relationship (LDR) couples. It enhances your voice calling experience on Discord by offering a smart music player alongside direct couple interactions, memories journal, and countdown widgets.

---

## ✨ Key Features

### 🎵 1. Smart Music Player
*   **High Performance Streaming:** Stream music from YouTube links or search terms using a custom **`yt-dlp`** backend integrated with **`@discordjs/voice`**. Completely resolves the notorious "403 Forbidden" streaming blocks and uses the latest GCM encryption standard.
*   **Intuitive Control Interface (Player UI):** Posts a clean Embed message showing the thumbnail, uploader channel, duration, requester, and a text-based progress bar (`▬●▬▬▬▬▬▬▬▬▬ [0:30 / 3:15]`).
*   **Interactive Control Buttons:**
    *   `⏸️ Pause` / `▶️ Resume` playback dynamically.
    *   `⏭️ Skip` the current track.
    *   `⏹️ Stop` playing and disconnect the bot.
    *   `⭐ Favorite` to bookmark the active song to the shared favorites library.
*   **History & Bookmarks Dropdowns:**
    *   `/history` displays the 25 most recently played songs.
    *   `/favorites` lists all shared favorites.
    *   Both commands feature a **String Select Menu** allowing couples to select and replay tracks instantly.

### 📖 2. Love Diary
*   Type `/diary` to open your shared memories space.
*   Read diary pages chronologically using navigation buttons (`◀️ Prev Page`, `▶️ Next Page`).
*   Click the `✍️ Write Diary` button to open a native **Discord Modal Popup** to submit new memories. Author name and creation timestamps are persisted automatically.

### ⏳ 3. Anniversary & Meetup Countdowns
*   `/set-start-date [YYYY-MM-DD]` sets your relationship anniversary date.
*   `/set-meetup [YYYY-MM-DD]` sets the date of your next flight/meetup.
*   `/countdown` calculates the total number of days you've spent together and displays a live countdown to your next reunion.

### 🫂 4. Couple Interactions
*   Banish the distance with `/hug`, `/kiss`, and `/miss` commands which respond with cute, randomized anime GIFs.
*   Keeps a running tally of your total interactions.
*   Type `/stats` to view all couple milestones, diary pages, and interaction totals in one elegant card.

---

## 🛠️ Technology Stack
*   **Environment:** Node.js (ES Modules).
*   **Discord Library:** `discord.js` v14.
*   **Audio Engine:** `@discordjs/voice` v0.19.2 (AES-256-GCM encryption), `ffmpeg-static`, and `yt-dlp` executable.
*   **Persistence:** SQLite via `better-sqlite3` for local, production-ready storage.

---

## 🚀 Getting Started

### 1. Prerequisites
*   [Node.js](https://nodejs.org/) installed (LTS version >= 18 recommended).
*   A Discord Bot application created on the [Discord Developer Portal](https://discord.com/developers/applications) with all Gateway Intents enabled.

### 2. Install Dependencies
Initialize libraries and download required node packages:
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file from the `.env.example` template:
```ini
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_bot_application_id
GUILD_ID=your_testing_server_id
```

### 4. Deploy Slash Commands
Before running the bot, register all application slash commands to Discord:
```bash
npm run deploy
```

### 5. Run the Bot
Start the application locally:
```bash
npm start
```

---

## 🔒 Security & Data
*   Your couple data is saved in a local SQLite file named `ldr_space.db`. Back this file up to migrate your bot data between servers.
*   **Important:** Never upload your `.env` file or commit your Discord tokens to public GitHub repositories.
