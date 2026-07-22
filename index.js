import ffmpeg from 'ffmpeg-static';
import { dirname } from 'path';

if (ffmpeg) {
  const ffmpegDir = dirname(ffmpeg);
  if (process.platform === 'win32') {
    process.env.PATH = `${ffmpegDir};${process.env.PATH}`;
  } else {
    process.env.PATH = `${ffmpegDir}:${process.env.PATH}`;
  }
}

import { 
  Client, 
  GatewayIntentBits, 
  Collection, 
  ActivityType 
} from 'discord.js';
import { readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import play from 'play-dl';

// Load YouTube cookies for play-dl to bypass 403 Forbidden errors
if (process.env.YOUTUBE_COOKIE && process.env.YOUTUBE_COOKIE !== 'your_youtube_cookie_here') {
  try {
    play.setToken({
      youtube: {
        cookie: process.env.YOUTUBE_COOKIE
      }
    });
    console.log('🔑 Đã nạp YouTube Cookie để phát nhạc ổn định (tránh lỗi 403/Chặn bot).');
  } catch (err) {
    console.error('❌ Lỗi nạp YouTube Cookie từ .env:', err);
  }
}

// Interaction Handlers
import { handlePlayerButtons } from './interactions/playerButtons.js';
import { handleMusicSelect } from './interactions/musicSelect.js';
import { handleDiaryButtons, handleDiaryModalSubmit } from './interactions/diaryButtons.js';
import { handleQueuePromote, handleQueueRefresh } from './interactions/queueSelect.js';

// Setup client intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages
  ]
});

// Load commands
client.commands = new Collection();

const __dirname = dirname(fileURLToPath(import.meta.url));
const commandsPath = join(__dirname, 'commands');
const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = join(commandsPath, file);
  const commandUrl = `file://${filePath.replace(/\\/g, '/')}`;
  try {
    const command = await import(commandUrl);
    if (command.data && command.execute) {
      client.commands.set(command.data.name, command);
    }
  } catch (error) {
    console.error(`Không thể nạp lệnh tại ${filePath}:`, error);
  }
}

// Bot ready event
client.once('ready', () => {
  console.log(`✅ LDR Space Bot đã sẵn sàng hoạt động! Đăng nhập dưới tên: ${client.user.tag}`);
  
  // Set presence activity
  client.user.setPresence({
    activities: [{ name: 'nhạc tình yêu cùng bạn 💕', type: ActivityType.Playing }],
    status: 'online'
  });
});

// Interaction handler event
client.on('interactionCreate', async interaction => {
  console.log(`[Interaction] Nhận tương tác type: ${interaction.type} từ user: ${interaction.user.username}`);
  if (interaction.isChatInputCommand()) {
    console.log(`[Interaction] Lệnh gạch chéo: /${interaction.commandName}`);
  }

  try {
    // 1. Handle Slash Commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      
      await command.execute(interaction);
      return;
    }

    // 2. Handle Button Interactions
    if (interaction.isButton()) {
      const { customId } = interaction;
      
      if (customId.startsWith('player_')) {
        await handlePlayerButtons(interaction);
      } else if (customId === 'diary_write' || customId.startsWith('diary_prev_') || customId.startsWith('diary_next_')) {
        await handleDiaryButtons(interaction);
      } else if (customId === 'queue_refresh') {
        await handleQueueRefresh(interaction);
      }
      return;
    }

    // 3. Handle Select Menu Interactions
    if (interaction.isStringSelectMenu()) {
      const { customId } = interaction;
      
      if (
        customId === 'history_select' ||
        customId === 'favorite_select' ||
        customId === 'replay_pick_playlist' ||
        customId === 'replay_pick_mode' ||
        customId === 'replay_pick_song'
      ) {
        await handleMusicSelect(interaction);
      } else if (customId === 'queue_promote_select') {
        await handleQueuePromote(interaction);
      }
      return;
    }

    // 4. Handle Modal Submissions
    if (interaction.isModalSubmit()) {
      const { customId } = interaction;
      
      if (customId === 'diary_write_modal') {
        await handleDiaryModalSubmit(interaction);
      }
      return;
    }

  } catch (error) {
    console.error('Interaction handling error:', error);
    
    // Attempt to respond to the user if the interaction fails and hasn't been acknowledged yet
    const errorMsg = '❌ Đã xảy ra lỗi khi thực hiện thao tác này.';
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: errorMsg, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMsg, ephemeral: true });
      }
    } catch (e) {
      // ignore nested exceptions if interaction cannot be replied to anymore
    }
  }
});

// Start the bot
const token = process.env.DISCORD_TOKEN;
if (!token || token === 'your_bot_token_here') {
  console.error('❌ DISCORD_TOKEN chưa được cấu hình hợp lệ trong file .env! Hãy điền token của bạn và chạy lại.');
  process.exit(1);
}

client.login(token);
