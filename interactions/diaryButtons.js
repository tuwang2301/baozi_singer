import { 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  ActionRowBuilder 
} from 'discord.js';
import db from '../database.js';
import { createDiaryView } from '../commands/diary.js';

export async function handleDiaryButtons(interaction) {
  const { customId } = interaction;

  // 1. Handle write diary button click
  if (customId === 'diary_write') {
    const modal = new ModalBuilder()
      .setCustomId('diary_write_modal')
      .setTitle('Viết Nhật Ký Tình Yêu 💖');

    const titleInput = new TextInputBuilder()
      .setCustomId('diary_title_input')
      .setLabel('Tiêu đề nhật ký')
      .setPlaceholder('Nhập tiêu đề ngắn gọn (ví dụ: Ngày kỷ niệm...)')
      .setStyle(TextInputStyle.Short)
      .setMaxLength(100)
      .setRequired(true);

    const contentInput = new TextInputBuilder()
      .setCustomId('diary_content_input')
      .setLabel('Nội dung kỷ niệm')
      .setPlaceholder('Nhớ ghi chi tiết cảm xúc và kỷ niệm của hai bạn hôm nay nhé...')
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(3000)
      .setRequired(true);

    const firstRow = new ActionRowBuilder().addComponents(titleInput);
    const secondRow = new ActionRowBuilder().addComponents(contentInput);

    modal.addComponents(firstRow, secondRow);

    return interaction.showModal(modal);
  }

  // 2. Handle prev / next page buttons
  if (customId.startsWith('diary_prev_') || customId.startsWith('diary_next_')) {
    const parts = customId.split('_');
    const action = parts[1]; // 'prev' or 'next'
    const currentPage = parseInt(parts[2], 10);
    
    let targetPage = currentPage;
    if (action === 'prev') {
      targetPage = Math.max(1, currentPage - 1);
    } else if (action === 'next') {
      const totalPages = await db.getDiaryTotalPages();
      targetPage = Math.min(totalPages, currentPage + 1);
    }

    const diaryView = await createDiaryView(targetPage);
    return interaction.update(diaryView);
  }
}

export async function handleDiaryModalSubmit(interaction) {
  if (interaction.customId !== 'diary_write_modal') return;

  const title = interaction.fields.getTextInputValue('diary_title_input');
  const content = interaction.fields.getTextInputValue('diary_content_input');
  const author = interaction.user.username;

  try {
    await db.addDiaryEntry(title, content, author);
    const totalPages = await db.getDiaryTotalPages();

    // Re-render the diary view and show the newly created page (which will be the last page)
    const diaryView = await createDiaryView(totalPages);
    
    // Update the message that triggered the modal
    if (interaction.message) {
      await interaction.message.edit(diaryView);
    }

    return interaction.reply({
      content: '🎉 Ghi lại nhật ký thành công! Trang kỷ niệm mới đã được thêm vào nhật ký của hai bạn. 💕',
      ephemeral: true
    });
  } catch (err) {
    console.error('Modal submission error:', err);
    return interaction.reply({
      content: '❌ Đã xảy ra lỗi khi lưu nhật ký. Vui lòng thử lại!',
      ephemeral: true
    });
  }
}
