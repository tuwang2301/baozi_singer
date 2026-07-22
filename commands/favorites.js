import { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder 
} from 'discord.js';
import db from '../database.js';

export const data = new SlashCommandBuilder()
  .setName('favorites')
  .setDescription('Hiển thị danh sách các bài hát yêu thích chung');

export async function execute(interaction) {
  const favorites = db.getFavorites(25);

  if (favorites.length === 0) {
    return interaction.reply({
      content: '💖 Danh sách yêu thích hiện đang trống. Hãy nhấn nút ⭐ Yêu thích trên trình phát nhạc để thêm bài hát!',
      ephemeral: true
    });
  }

  const embed = new EmbedBuilder()
    .setColor('#ffc6ff')
    .setTitle('💖 Danh sách bài hát yêu thích chung')
    .setDescription(
      favorites
        .map((song, i) => `**${i + 1}.** [${song.title}](${song.url}) - *thêm bởi ${song.added_by}*`)
        .join('\n')
    )
    .setTimestamp()
    .setFooter({ text: 'LDR Space • Chọn bài hát bên dưới để phát nhanh' });

  // Create Select Menu Dropdown
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('favorite_select')
    .setPlaceholder('Chọn bài hát yêu thích để phát...')
    .addOptions(
      favorites.slice(0, 25).map((song) => {
        // Truncate title for Discord label (max 100 chars)
        const label = song.title.length > 95 ? song.title.substring(0, 92) + '...' : song.title;
        
        return {
          label: label,
          description: `Thêm bởi: ${song.added_by}`,
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
