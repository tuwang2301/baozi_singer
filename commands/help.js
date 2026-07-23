import { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder,
  MessageFlags
} from 'discord.js';

const CATEGORIES = {
  music: {
    emoji: '🎵',
    label: 'Trình phát nhạc',
    description: 'Các lệnh điều khiển nhạc và playlist nâng cao',
    color: '#a0c4ff',
    commands: [
      { name: '/play [tên/link]', value: 'Phát nhạc từ YouTube (Hỗ trợ cả link playlist/video).' },
      { name: '/pause', value: 'Tạm dừng nhạc đang phát.' },
      { name: '/resume', value: 'Tiếp tục phát nhạc đang tạm dừng.' },
      { name: '/skip', value: 'Bỏ qua bài hát hiện tại.' },
      { name: '/stop', value: 'Dừng phát nhạc, xóa hàng chờ và bot rời phòng voice.' },
      { name: '/queue', value: 'Xem hàng chờ nhạc hiện tại, cho phép đẩy bài lên đầu.' },
      { name: '/replay', value: 'Mở danh sách playlist đã lưu để chọn chế độ phát lại.' },
      { name: '/history', value: 'Xem lịch sử 25 bài hát đã phát gần đây để phát nhanh.' },
      { name: '/favorites', value: 'Xem và chọn phát nhanh từ danh sách bài hát yêu thích chung.' }
    ]
  },
  diary: {
    emoji: '📖',
    label: 'Nhật ký kỷ niệm',
    description: 'Lưu trữ và xem nhật ký chung của hai bạn',
    color: '#ffc6ff',
    commands: [
      { name: '/diary', value: 'Mở không gian nhật ký chung. Hỗ trợ đọc chuyển trang và nút bấm "Viết nhật ký" để mở Modal nhập trực tiếp.' }
    ]
  },
  countdown: {
    emoji: '⏳',
    label: 'Đếm ngược ngày yêu',
    description: 'Theo dõi các cột mốc thời gian ý nghĩa',
    color: '#fdffb6',
    commands: [
      { name: '/countdown', value: 'Hiển thị số ngày bên nhau và đếm ngược đến ngày gặp lại.' },
      { name: '/set-start-date [YYYY-MM-DD]', value: 'Cài đặt hoặc cập nhật ngày bắt đầu yêu nhau.' },
      { name: '/set-meetup [YYYY-MM-DD]', value: 'Cài đặt ngày hẹn gặp mặt tiếp theo.' }
    ]
  },
  interactions: {
    emoji: '🫂',
    label: 'Tương tác & Thống kê',
    description: 'Bày tỏ tình cảm và xem bảng chỉ số tình yêu',
    color: '#ffadad',
    commands: [
      { name: '/hug [@user]', value: 'Gửi một cái ôm ấm áp kèm GIF dễ thương.' },
      { name: '/kiss [@user]', value: 'Gửi một nụ hôn ngọt ngào kèm GIF dễ thương.' },
      { name: '/miss [@user]', value: 'Gửi lời nhắn nhớ nhung da diết kèm GIF dễ thương.' },
      { name: '/stats', value: 'Bảng thống kê tổng hợp số lần ôm/hôn/nhớ, số trang nhật ký và các mốc thời gian của hai bạn.' }
    ]
  }
};

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Hướng dẫn sử dụng chi tiết tất cả các câu lệnh của LDR Space Bot');

function buildMainEmbed() {
  return new EmbedBuilder()
    .setColor('#ff75a0')
    .setTitle('💖 Bảng Hướng Dẫn Sử Dụng — LDR Space Bot 💖')
    .setDescription(
      `Chào mừng hai bạn đến với **Baozi Singer (Ca sĩ Bánh Bao)**!\n\n` +
      `Hãy chọn một danh mục bên dưới trình đơn để xem hướng dẫn chi tiết từng câu lệnh.`
    )
    .addFields(
      { name: '🎵 Trình phát nhạc', value: 'Phát nhạc chất lượng cao từ YouTube, quản lý hàng chờ và lưu playlist.', inline: true },
      { name: '📖 Nhật ký kỷ niệm', value: 'Ghi lại những câu chuyện ngọt ngào trực tiếp trên Discord.', inline: true },
      { name: '⏳ Đếm ngược & Kỷ niệm', value: 'Tính số ngày yêu nhau và đếm ngược đến ngày được ôm nhau.', inline: true },
      { name: '🫂 Tương tác & Thống kê', value: 'Bày tỏ tình thương qua ảnh GIF và xem bảng điểm chỉ số.', inline: true }
    )
    .setTimestamp()
    .setFooter({ text: 'LDR Space • Đồng hành cùng các cặp đôi yêu xa' });
}

function buildSelectRow() {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('help_category')
    .setPlaceholder('Chọn danh mục lệnh để xem chi tiết...')
    .addOptions(
      Object.entries(CATEGORIES).map(([key, cat]) => ({
        label: `${cat.emoji} ${cat.label}`,
        description: cat.description,
        value: key
      }))
    );

  return new ActionRowBuilder().addComponents(selectMenu);
}

export async function execute(interaction) {
  const embed = buildMainEmbed();
  const row = buildSelectRow();

  return interaction.reply({
    embeds: [embed],
    components: [row]
  });
}

export async function handleHelpSelect(interaction) {
  const categoryKey = interaction.values[0];
  const cat = CATEGORIES[categoryKey];

  if (!cat) {
    return interaction.reply({
      content: '❌ Danh mục không hợp lệ.',
      flags: MessageFlags.Ephemeral
    });
  }

  const embed = new EmbedBuilder()
    .setColor(cat.color)
    .setTitle(`${cat.emoji} Hướng dẫn: ${cat.label}`)
    .setDescription(cat.description)
    .addFields(
      cat.commands.map(cmd => ({
        name: `🔹 ${cmd.name}`,
        value: cmd.value,
        inline: false
      }))
    )
    .setTimestamp()
    .setFooter({ text: 'LDR Space • Chọn danh mục khác bên dưới để xem thêm' });

  const row = buildSelectRow();

  return interaction.update({
    embeds: [embed],
    components: [row]
  });
}
