import { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  MessageFlags 
} from 'discord.js';
import crypto from 'crypto';
import * as cheerio from 'cheerio';
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

// Genius API Search Helper
async function searchGenius(query, accessToken) {
  try {
    const response = await fetch(`https://api.genius.com/search?q=${encodeURIComponent(query)}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'BaoziSingerBot/1.0 (https://github.com/tuwang2301/baozi_singer)'
      }
    });

    if (!response.ok) {
      throw new Error(`Genius API returned status ${response.status}`);
    }

    const data = await response.json();
    const hits = data.response.hits;
    if (!hits || hits.length === 0) return null;

    const song = hits[0].result;
    return {
      title: song.title,
      artist: song.primary_artist.name,
      url: song.url
    };
  } catch (err) {
    console.error('[Lyrics] Genius search error:', err);
    return null;
  }
}

// Genius Web Scraper Helper
async function scrapeGeniusLyrics(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Genius page fetch returned status ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove exclude-from-selection elements to strip headers, metadata, description
    $('[data-exclude-from-selection="true"]').remove();

    // Replace <br> tags with newlines
    $('br').replaceWith('\n');

    let lyrics = '';

    // Modern selector
    const containers = $('div[data-lyrics-container="true"]');
    if (containers.length > 0) {
      containers.each((_, el) => {
        const text = $(el).text();
        lyrics += text + '\n\n';
      });
    } else {
      // Legacy selector
      const legacyContainer = $('div.lyrics');
      if (legacyContainer.length > 0) {
        lyrics = legacyContainer.text();
      }
    }

    return lyrics.trim();
  } catch (err) {
    console.error('[Lyrics] Genius scraping error:', err);
    return null;
  }
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
    // 1. First attempt: Search using LRCLIB API
    let title = '';
    let artist = '';
    let pages = [];
    let method = '';

    const response = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(cleanQuery)}`, {
      headers: {
        'User-Agent': 'BaoziSingerBot/1.0 (https://github.com/tuwang2301/baozi_singer)'
      }
    });

    if (response.ok) {
      const results = await response.json();
      const match = results.find(r => r.plainLyrics && r.plainLyrics.trim().length > 0);
      if (match) {
        title = match.trackName;
        artist = match.artistName;
        pages = splitLyrics(match.plainLyrics);
        method = 'LRCLIB';
      }
    }

    // 2. Second attempt (Fallback): Search and scrape Genius if token is provided
    const geniusToken = process.env.GENIUS_ACCESS_TOKEN;
    const hasGeniusToken = geniusToken && geniusToken !== 'your_genius_access_token_here' && geniusToken.trim().length > 0;

    if (pages.length === 0 && hasGeniusToken) {
      console.log(`[Lyrics] Không tìm thấy trên LRCLIB. Tiến hành tìm kiếm dự phòng trên Genius...`);
      const geniusSong = await searchGenius(cleanQuery, geniusToken);
      if (geniusSong) {
        console.log(`[Lyrics] Tìm thấy bài hát trên Genius: "${geniusSong.title}" - "${geniusSong.artist}". Bắt đầu bóc tách...`);
        const geniusLyrics = await scrapeGeniusLyrics(geniusSong.url);
        if (geniusLyrics) {
          title = geniusSong.title;
          artist = geniusSong.artist;
          pages = splitLyrics(geniusLyrics);
          method = 'Genius';
        }
      }
    }

    // 3. Handle results
    if (pages.length === 0) {
      let errorMsg = `❌ Không tìm thấy lời bài hát cho: **${cleanQuery}** trên thư viện LRCLIB.`;
      if (!hasGeniusToken) {
        errorMsg += '\n💡 *Bạn có thể cấu hình biến `GENIUS_ACCESS_TOKEN` trong file `.env` để kích hoạt tìm kiếm dự phòng từ kho dữ liệu khổng lồ của Genius.*';
      }
      return interaction.editReply({ content: errorMsg });
    }

    console.log(`[Lyrics] Đã nạp thành công lời bài hát từ nguồn ${method}. Số trang: ${pages.length}`);

    const cacheId = crypto.randomBytes(4).toString('hex');
    lyricsCache.set(cacheId, {
      title,
      artist,
      pages,
      createdAt: Date.now()
    });

    const view = buildLyricsView(title, artist, pages, 0, cacheId);
    return interaction.editReply(view);

  } catch (err) {
    console.error('Lyrics search error:', err);
    return interaction.editReply({
      content: '❌ Đã xảy ra lỗi khi tìm kiếm lời bài hát. Vui lòng thử lại sau!'
    });
  }
}
