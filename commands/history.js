import { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder 
} from 'discord.js';
import db from '../database.js';

export const data = new SlashCommandBuilder()
  .setName('history')
  .setDescription('Hiển thị 25 bài hát đã nghe gần đây');

export async function execute(interaction) {
  const history = db.getMusicHistory(25);

  if (history.length === 0) {
    return interaction.reply({
      content: '📭 Lịch sử phát nhạc trống. Hãy dùng lệnh `/play` để nghe nhạc nhé!',
      ephemeral: true
    });
  }

  const embed = new EmbedBuilder()
    .setColor('#a0c4ff')
    .setTitle('⏳ Lịch sử phát nhạc gần đây')
    .setDescription(
      history
        .map((song, i) => `**${i + 1}.** [${song.title}](${song.url})`)
        .join('\n')
    )
    .setTimestamp()
    .setFooter({ text: 'LDR Space • Chọn bài hát bên dưới để phát lại nhanh' });

  // Create Select Menu Dropdown
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('history_select')
    .setPlaceholder('Chọn bài hát để phát lại...')
    .addOptions(
      history.slice(0, 25).map((song, idx) => {
        // Truncate title for Discord label (max 100 chars)
        const label = song.title.length > 95 ? song.title.substring(0, 92) + '...' : song.title;
        // Format relative time or basic string
        const playedTime = new Date(song.played_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        
        return {
          label: label,
          description: `Đã phát lúc ${playedTime}`,
          value: song.url.substring(0, 100) // Discord value max 100 chars
        };
      })
    );

  const row = new ActionRowBuilder().addComponents(selectMenu);

  return interaction.reply({
    embeds: [embed],
    components: [row]
  });
}
