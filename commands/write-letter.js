import { 
  SlashCommandBuilder, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  ActionRowBuilder 
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('write-letter')
  .setDescription('Viết thư gửi tương lai cho đối phương')
  .addUserOption(option =>
    option
      .setName('recipient')
      .setDescription('Người nhận thư')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('unlock_date')
      .setDescription('Ngày mở khóa (Nhập số ngày, ví dụ: 30 hoặc ngày cụ thể YYYY-MM-DD, ví dụ: 2026-12-25)')
      .setRequired(true)
  );

export async function execute(interaction) {
  const recipient = interaction.options.getUser('recipient');
  const unlockDateInput = interaction.options.getString('unlock_date');

  // Prevent sending letter to oneself
  if (recipient.id === interaction.user.id) {
    return interaction.reply({
      content: '❌ Bạn không thể tự gửi thư cho chính mình! Hãy gửi những lời yêu thương này cho đối phương nhé.',
      ephemeral: true
    });
  }

  // Prevent sending letter to bots
  if (recipient.bot) {
    return interaction.reply({
      content: '❌ Bạn không thể gửi thư cho bot!',
      ephemeral: true
    });
  }

  let targetDate;
  const daysOffset = parseInt(unlockDateInput, 10);
  
  if (!isNaN(daysOffset) && daysOffset > 0 && String(daysOffset) === unlockDateInput.trim()) {
    targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysOffset);
    // Set to end of the day or exact hours from now. Let's make it the same time on that day.
  } else {
    // Attempt YYYY-MM-DD parsing
    targetDate = new Date(unlockDateInput);
    // Set time to morning of target date (e.g. 00:00:00) in local timezone to feel natural
    targetDate.setHours(0, 0, 0, 0);
  }

  if (isNaN(targetDate.getTime())) {
    return interaction.reply({
      content: '❌ Định dạng ngày không hợp lệ. Vui lòng nhập số ngày tương lai (ví dụ: `30` để mở sau 30 ngày) hoặc ngày cụ thể `YYYY-MM-DD` (ví dụ: `2026-12-25`).',
      ephemeral: true
    });
  }

  const now = new Date();
  if (targetDate <= now) {
    return interaction.reply({
      content: '❌ Ngày mở khóa phải ở trong tương lai!',
      ephemeral: true
    });
  }

  // Build and show the Modal
  // Note: customId has encoded recipient and unlock date metadata
  const modal = new ModalBuilder()
    .setCustomId(`letter_write_modal:${recipient.id}:${targetDate.toISOString()}`)
    .setTitle('Thư gửi tương lai ✉️');

  const titleInput = new TextInputBuilder()
    .setCustomId('letter_title')
    .setLabel('Tiêu đề thư (Title)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ví dụ: Gửi công chúa của anh, Happy Anniversary...')
    .setRequired(true)
    .setMaxLength(100);

  const contentInput = new TextInputBuilder()
    .setCustomId('letter_content')
    .setLabel('Nội dung bức thư (Content)')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Nhập nội dung thư của bạn. Bức thư này sẽ được niêm phong cho đến ngày mở...')
    .setRequired(true)
    .setMaxLength(3000);

  const firstRow = new ActionRowBuilder().addComponents(titleInput);
  const secondRow = new ActionRowBuilder().addComponents(contentInput);
  modal.addComponents(firstRow, secondRow);

  await interaction.showModal(modal);
}
