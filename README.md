# 🎶 Baozi Singer (LDR Space Bot)

**Baozi Singer** (Ca sĩ Bánh Bao) is a dedicated Discord Bot customized for Long-Distance Relationship (LDR) couples. It enhances your voice calling experience on Discord by offering a smart music player alongside direct couple interactions, memories journal, and countdown widgets.

---

## ✨ Key Features

### 🎵 1. Smart Music Player
*   **High Performance Streaming:** Stream music from YouTube links or search terms using a custom **`yt-dlp`** backend integrated with **`@discordjs/voice`**. Completely resolves the notorious "403 Forbidden" streaming blocks and uses the latest GCM encryption standard.
*   **Intuitive Control Interface (Player UI):** Posts a clean Embed message showing the thumbnail, uploader channel, duration, and requester.
*   **Interactive Control Buttons:**
    *   `⏸️ Pause` / `▶️ Resume` playback dynamically.
    *   `⏭️ Skip` the current track.
    *   `⏹️ Stop` playing and disconnect the bot.
    *   `⭐ Favorite` to bookmark the active song to the shared favorites library.
*   **History & Bookmarks Dropdowns:**
    *   `/history` displays the 25 most recently played songs.
    *   `/favorites` lists all shared favorites.
    *   Both commands feature a **String Select Menu** allowing couples to select and replay tracks instantly.

### 🎤 2. Song Lyrics (/lyrics)
*   **Auto-Queue Detection:** Automatically detects and retrieves the lyrics of the currently playing song in the server.
*   **Search Query Support:** Look up lyrics for any song manually using `/lyrics song: [song name]`.
*   **Clean Title Parser:** Sanitizes video titles (removes "Official Music Video", "Vietsub", bracketed details, etc.) to optimize search accuracy.
*   **Smart Fallback System:** Searches the open-source **LRCLIB** database first (for synced and plain lyrics) and automatically falls back to scraping **Genius.com** if needed.
*   **Interactive Pagination:** Large lyrics are split into pages of ~1000 characters and displayed inside an Embed with `◀️ Trang trước` and `Trang sau ▶️` pagination buttons.

### 📖 3. Love Diary
*   Type `/diary` to open your shared memories space.
*   Read diary pages chronologically using navigation buttons (`◀️ Prev Page`, `▶️ Next Page`).
*   Click the `✍️ Write Diary` button to open a native **Discord Modal Popup** to submit new memories. Author name and creation timestamps are persisted automatically.

### ⏳ 4. Anniversary & Meetup Countdowns
*   `/set-start-date [YYYY-MM-DD]` sets your relationship anniversary date.
*   `/set-meetup [YYYY-MM-DD]` sets the date of your next flight/meetup.
*   `/countdown` calculates the total number of days you've spent together and displays a live countdown to your next reunion.

### 🫂 5. Couple Interactions
*   Banish the distance with `/hug`, `/kiss`, and `/miss` commands which respond with cute, randomized anime GIFs.
*   Keeps a running tally of your total interactions.
*   Type `/stats` to view all couple milestones, diary pages, and interaction totals in one elegant card.

---

## 🛠️ Technology Stack
*   **Environment:** Node.js (ES Modules).
*   **Discord Library:** `discord.js` v14.
*   **Audio Engine:** `@discordjs/voice` v0.19.2 (AES-256-GCM encryption), `ffmpeg-static`, and `yt-dlp` executable.
*   **Persistence:** PostgreSQL (Supabase) using `pg` connection pools.
*   **Lyrics Parser:** `cheerio` for HTML parsing.

---

## 🚀 Getting Started

### 1. Prerequisites
*   [Node.js](https://nodejs.org/) installed (LTS version >= 18 recommended).
*   A Discord Bot application created on the [Discord Developer Portal](https://discord.com/developers/applications) with all Gateway Intents enabled.
*   A Supabase project (Free tier) to connect to PostgreSQL.

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
YOUTUBE_COOKIE=your_youtube_cookie_here
DATABASE_URL=your_supabase_postgresql_connection_string
GENIUS_ACCESS_TOKEN=your_optional_genius_token_here
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
*   Your couple data is saved in a cloud PostgreSQL database hosted on Supabase, preventing data loss even when host containers are rebuilt or redeployed.
*   **Important:** Never upload your `.env` file or commit your Discord tokens to public GitHub repositories.
