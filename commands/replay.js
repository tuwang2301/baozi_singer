import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  MessageFlags
} from 'discord.js';
import db from '../database.js';
import { PLAYLIST_MAX } from '../music/player.js';

function truncateLabel(text, max = 95) {
  if (!text) return 'Playlist';
  return text.length > max ? `${text.substring(0, max - 3)}...` : text;
}

export const data = new SlashCommandBuilder()
  .setName('replay')
  .setDescription('Phát lại playlist đã lưu: từ đầu, tiếp tục, hoặc nhảy tới bài');

export async function execute(interaction) {
  const snapshots = db.getRecentPlaylistSnapshots(50);
  const deduped = [];
  const seenUrls = new Set();
  for (const snapshot of snapshots) {
    if (!snapshot.source_url || seenUrls.has(snapshot.source_url)) continue;
    seenUrls.add(snapshot.source_url);
    deduped.push(snapshot);
    if (deduped.length >= 10) break;
  }

  if (deduped.length === 0) {
    return interaction.reply({
      content: '📭 Chưa có playlist nào được lưu. Hãy `/play` một link playlist YouTube trước nhé!',
      flags: MessageFlags.Ephemeral
    });
  }

  const embed = new EmbedBuilder()
    .setColor('#fdffb6')
    .setTitle('🔁 Replay playlist đã lưu')
    .setDescription(
      deduped
        .map((snapshot, index) => {
          const progress = Math.min(snapshot.resume_index + 1, snapshot.song_count);
          return `**${index + 1}.** ${truncateLabel(snapshot.label, 80)} — ${snapshot.song_count} bài *(đang dừng ở bài ${progress})*`;
        })
        .join('\n')
    )
    .setFooter({ text: `Lưu tối đa 10 playlist • Mỗi playlist tối đa ${PLAYLIST_MAX} bài` })
    .setTimestamp();

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('replay_pick_playlist')
    .setPlaceholder('Chọn playlist để mở tùy chọn replay...')
    .addOptions(
      deduped.map((snapshot) => {
        const progress = Math.min(snapshot.resume_index + 1, snapshot.song_count);
        return {
          label: truncateLabel(snapshot.label),
          description: `${snapshot.song_count} bài • dừng ở bài ${progress}`,
          value: String(snapshot.id)
        };
      })
    );

  const row = new ActionRowBuilder().addComponents(selectMenu);

  return interaction.reply({
    embeds: [embed],
    components: [row]
  });
}
