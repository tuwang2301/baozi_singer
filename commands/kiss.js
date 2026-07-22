import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import db from '../database.js';

const KISS_GIFS = [
  'https://media.tenor.com/dn_2nn4whzoAAAAM/milk-and-mocha-kiss.gif',
  'https://media.tenor.com/wDYUiK59D4AAAAAM/kiss-anime.gif',
  'https://media.tenor.com/Id7N9Ww4e34AAAAM/chu-kiss.gif',
  'https://media.tenor.com/v4OJDT54b80AAAAM/love-kiss.gif'
];

export const data = new SlashCommandBuilder()
  .setName('kiss')
  .setDescription('Gửi một nụ hôn ngọt ngào')
  .addUserOption(option =>
    option
      .setName('who')
      .setDescription('Người bạn muốn hôn (tùy chọn)')
      .setRequired(false)
  );

export async function execute(interaction) {
  const target = interaction.options.getUser('who');
  const count = db.incrementStat('kiss_count');

  const randomGif = KISS_GIFS[Math.floor(Math.random() * KISS_GIFS.length)];
  
  let description = `💋 **${interaction.user.username}** gửi một nụ hôn gió ngọt ngào tràn ngập tình yêu! 💖`;
  if (target) {
    description = `💋 **${interaction.user.username}** hôn **${target.username}** thật nhẹ nhàng lên má! Má đỏ ửng luôn kìa! 🥰`;
  }

  const embed = new EmbedBuilder()
    .setColor('#ff5d8f')
    .setTitle('😘 Chuuu~ Nụ hôn tình yêu')
    .setDescription(description)
    .setImage(randomGif)
    .setFooter({ text: `Tổng số nụ hôn: ${count} 💋 | LDR Space` })
    .setTimestamp();

  return interaction.reply({ embeds: [embed] });
}
