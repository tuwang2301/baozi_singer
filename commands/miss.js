import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import db from '../database.js';

const MISS_GIFS = [
  'https://media.tenor.com/83p1_071E5oAAAAM/peach-goma.gif',
  'https://media.tenor.com/A6j5b_d4sSMAAAAM/milk-mocha.gif',
  'https://media.tenor.com/XU6vSgHshsEAAAAM/goma-sad.gif',
  'https://media.tenor.com/e13m5C8dY8AAAAAM/sad-goma.gif'
];

export const data = new SlashCommandBuilder()
  .setName('miss')
  .setDescription('Bày tỏ nỗi nhớ nhung người thương')
  .addUserOption(option =>
    option
      .setName('who')
      .setDescription('Người bạn đang nhớ (tùy chọn)')
      .setRequired(false)
  );

export async function execute(interaction) {
  const target = interaction.options.getUser('who');
  const count = db.incrementStat('miss_count');

  const randomGif = MISS_GIFS[Math.floor(Math.random() * MISS_GIFS.length)];
  
  let description = `🥺 **${interaction.user.username}** đang nhớ người yêu da diết! Khoảng cách hãy mau biến mất đi... 💔`;
  if (target) {
    description = `🥺 **${interaction.user.username}** đang nhớ **${target.username}** phát điên lên được rồi này! Mau gặp nhau đi mà... 😭❤️`;
  }

  const embed = new EmbedBuilder()
    .setColor('#a2d2ff')
    .setTitle('🥺 Nhớ người ấy rất nhiều...')
    .setDescription(description)
    .setImage(randomGif)
    .setFooter({ text: `Tổng số lần nhớ nhung: ${count} 🥺 | LDR Space` })
    .setTimestamp();

  return interaction.reply({ embeds: [embed] });
}
