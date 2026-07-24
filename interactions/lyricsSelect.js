import { lyricsCache, buildLyricsView } from '../commands/lyrics.js';

export async function handleLyricsButtons(interaction) {
  const { customId } = interaction;

  if (!customId.startsWith('lyrics:')) return;

  const parts = customId.split(':');
  const action = parts[1]; // 'page'
  const cacheId = parts[2];
  const pageIndexStr = parts[3];

  if (action === 'page') {
    const entry = lyricsCache.get(cacheId);
    if (!entry) {
      return interaction.reply({
        content: '❌ Phiên xem lời bài hát đã hết hạn (tối đa 30 phút). Vui lòng gõ lại lệnh `/lyrics` để tìm kiếm lại!',
        ephemeral: true
      });
    }

    const pageIndex = parseInt(pageIndexStr, 10);
    const view = buildLyricsView(entry.title, entry.artist, entry.pages, pageIndex, cacheId);
    
    // Update the message with the target lyrics page
    return interaction.update(view);
  }
}
