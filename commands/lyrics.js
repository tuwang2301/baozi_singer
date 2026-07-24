import { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  MessageFlags 
} from 'discord.js';
import crypto from 'crypto';
import { queues } from '../music/player.js';

export const lyricsCache = new Map();

// Automatic cache cleanup (TTL: 30 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of lyricsCache.entries()) {
    if (now - value.createdAt > 30 * 60 * 1000) {
      lyricsCache.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Helper to sanitize YouTube titles for better lyrics matches
export function cleanSongTitle(title) {
  if (!title) return '';
  let clean = title;
  
  // 1. Remove bracketed [ ... ] or parenthetical ( ... ) content
  clean = clean.replace(/\[[^\]]*\]/g, '');
  clean = clean.replace(/\([^)]*\)/g, '');
  
  // 2. Remove common noisy video terms
  const noisePatterns = [
    /\bofficial\b/gi,
    /\bmusic\b/gi,
    /\bvideo\b/gi,
    /\baudio\b/gi,
    /\blyrics?\b/gi,
    /\blyric\b/gi,
    /\bmv\b/gi,
    /\bvietsub\b/gi,
    /\bkaraoke\b/gi,
    /\bperformance\b/gi,
    /\blive\b/gi,
    /\bhd\b/gi,
    /\b4k\b/gi
  ];
  
  noisePatterns.forEach(pattern => {
    clean = clean.replace(pattern, '');
  });
  
  // 3. Replace separators with spaces, preserve internal hyphens like M-TP
  clean = clean.replace(/[|•–]/g, ' ');
  clean = clean.replace(/\s+-\s+/g, ' ');
  
  // 4. Normalize whitespace
  clean = clean.replace(/\s+/g, ' ').trim();
  
  return clean;
}

// Split lyrics into paragraphs of ~800-1000 characters
function splitLyrics(text, maxLength = 1000) {
  if (!text) return [];
  const paragraphs = text.split('\n\n');
  const pages = [];
  let currentPage = '';

  for (const paragraph of paragraphs) {
    if ((currentPage + '\n\n' + paragraph).length > maxLength) {
      if (currentPage) {
        pages.push(currentPage.trim());
      }
      currentPage = paragraph;
    } else {
      currentPage = currentPage ? currentPage + '\n\n' + paragraph : paragraph;
    }
  }

  if (currentPage) {
    pages.push(currentPage.trim());
  }

  // Safety fallback for extremely long paragraphs
  const finalPages = [];
  for (const page of pages) {
    if (page.length > 2000) {
      let chunk = '';
      const lines = page.split('\n');
      for (const line of lines) {
        if ((chunk + '\n' + line).length > maxLength) {
          finalPages.push(chunk.trim());
          chunk = line;
        } else {
          chunk = chunk ? chunk + '\n' + line : line;
        }
      }
      if (chunk) finalPages.push(chunk.trim());
    } else {
      finalPages.push(page);
    }
  }

  return finalPages;
}

// Build the message payload for a specific page of lyrics
export function buildLyricsView(title, artist, pages, currentPageIndex, cacheId) {
  const totalPages = pages.length;
  const pageContent = pages[currentPageIndex];

  const embed = new EmbedBuilder()
    .setColor('#a0c4ff')
    .setTitle(`🎤 Lời bài hát: ${title}`)
    .setAuthor({ name: artist || 'Không rõ nghệ sĩ' })
    .setDescription(pageContent)
    .setFooter({ text: `Trang ${currentPageIndex + 1} / ${totalPages} • LDR Space` })
    .setTimestamp();

  if (totalPages <= 1) {
    return { embeds: [embed], components: [] };
  }

  const prevButton = new ButtonBuilder()
    .setCustomId(`lyrics:page:${cacheId}:${currentPageIndex - 1}`)
    .setLabel('Trang trước')
    .setEmoji('◀️')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(currentPageIndex === 0);

  const nextButton = new ButtonBuilder()
    .setCustomId(`lyrics:page:${cacheId}:${currentPageIndex + 1}`)
    .setLabel('Trang sau')
    .setEmoji('▶️')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(currentPageIndex === totalPages - 1);

  const row = new ActionRowBuilder().addComponents(prevButton, nextButton);
  return { embeds: [embed], components: [row] };
}

export const data = new SlashCommandBuilder()
  .setName('lyrics')
  .setDescription('Tìm kiếm và hiển thị lời bài hát')
  .addStringOption(option =>
    option
      .setName('song')
      .setDescription('Tên bài hát muốn tìm lời (Tùy chọn, mặc định lấy bài đang phát)')
      .setRequired(false)
  );

export async function execute(interaction) {
  await interaction.deferReply();

  let query = interaction.options.getString('song');

  // If no song is provided, try to detect the currently playing song
  if (!query) {
    const queue = queues.get(interaction.guild.id);
    if (queue && queue.currentSong) {
      query = queue.currentSong.title;
    }
  }

  if (!query) {
    return interaction.editReply({
      content: '❌ Không có bài hát nào đang phát. Vui lòng nhập tên bài hát: `/lyrics song: [tên bài]`'
    });
  }

  const cleanQuery = cleanSongTitle(query);
  console.log(`[Lyrics] Đang tìm kiếm lời bài hát cho: "${cleanQuery}" (Từ gốc: "${query}")`);

  try {
    const response = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(cleanQuery)}`, {
      headers: {
        'User-Agent': 'BaoziSingerBot/1.0 (https://github.com/tuwang2301/baozi_singer)'
      }
    });

    if (!response.ok) {
      throw new Error(`LRCLIB API returned status ${response.statusCode}`);
    }

    const results = await response.json();
    
    // Find the first result that has plain lyrics
    const match = results.find(r => r.plainLyrics && r.plainLyrics.trim().length > 0);

    if (!match) {
      return interaction.editReply({
        content: `❌ Không tìm thấy lời bài hát cho: **${cleanQuery}**`
      });
    }

    const pages = splitLyrics(match.plainLyrics);
    if (pages.length === 0) {
      return interaction.editReply({
        content: `❌ Không tìm thấy lời bài hát cho: **${cleanQuery}**`
      });
    }

    const cacheId = crypto.randomBytes(4).toString('hex');
    lyricsCache.set(cacheId, {
      title: match.trackName,
      artist: match.artistName,
      pages,
      createdAt: Date.now()
    });

    const view = buildLyricsView(match.trackName, match.artistName, pages, 0, cacheId);
    return interaction.editReply(view);

  } catch (err) {
    console.error('Lyrics search error:', err);
    return interaction.editReply({
      content: '❌ Đã xảy ra lỗi khi tìm kiếm lời bài hát. Vui lòng thử lại sau!'
    });
  }
}
