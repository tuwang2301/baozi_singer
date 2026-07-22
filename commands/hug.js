import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import db from '../database.js';

const HUG_GIFS = [
  'https://media.tenor.com/y2hQD7N5exgAAAAM/cuddle-hug.gif',
  'https://media.tenor.com/gU8GoBVs5sIAAAAM/milk-and-mocha-hug.gif',
  'https://media.tenor.com/kdD5ZZ47EQgAAAAM/anime-hug.gif',
  'https://media.tenor.com/z4863gV1Z64AAAAM/hugs-hug.gif'
];

export const data = new SlashCommandBuilder()
  .setName('hug')
  .setDescription('Gửi một cái ôm ngọt ngào cho người thương')
  .addUserOption(option =>
    option
      .setName('who')
      .setDescription('Người bạn muốn ôm (tùy chọn)')
      .setRequired(false)
  );

export async function execute(interaction) {
  const target = interaction.options.getUser('who');
  const count = db.incrementStat('hug_count');

  const randomGif = HUG_GIFS[Math.floor(Math.random() * HUG_GIFS.length)];
  
  let description = `🤗 **${interaction.user.username}** đã gửi một cái ôm thật ấm áp và siết chặt! 💖`;
  if (target) {
    description = `🤗 **${interaction.user.username}** ôm **${target.username}** thật chặt! Hạnh phúc ngập tràn! 🥰`;
  }

  const embed = new EmbedBuilder()
    .setColor('#ff9f1c')
    .setTitle('🫂 Ôm một cái thật lâu...')
    .setDescription(description)
    .setImage(randomGif)
    .setFooter({ text: `Tổng số cái ôm: ${count} 🫂 | LDR Space` })
    .setTimestamp();

  return interaction.reply({ embeds: [embed] });
}
