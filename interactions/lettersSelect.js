import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { createFutureLetter, getLetterById } from '../database.js';
import { execute as showMailbox } from '../commands/letters.js';

function formatDateShort(dateInput) {
  const d = new Date(dateInput);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export async function handleLetterModalSubmit(interaction) {
  const { customId } = interaction;
  if (!customId.startsWith('letter_write_modal:')) return;

  const parts = customId.split(':');
  const recipientId = parts[1];
  const unlockDateMs = parseInt(parts[2], 10);

  const title = interaction.fields.getTextInputValue('letter_title');
  const content = interaction.fields.getTextInputValue('letter_content');

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const recipient = await interaction.client.users.fetch(recipientId);

    await createFutureLetter({
      title,
      content,
      senderId: interaction.user.id,
      senderName: interaction.user.username,
      recipientId,
      recipientName: recipient.username,
      unlockDate: new Date(unlockDateMs),
      channelId: interaction.channelId
    });

    const unlockDateFormatted = formatDateShort(unlockDateMs);
    
    return interaction.editReply({
      content: `✅ **Thư tay gửi tương lai đã được niêm phong thành công!**\nBức thư này sẽ được gửi và mở khóa cho **@${recipient.username}** vào ngày **${unlockDateFormatted}**. ✉️💕`
    });

  } catch (err) {
    console.error('Failed to save future letter from modal:', err);
    return interaction.editReply({
      content: '❌ Đã xảy ra lỗi khi niêm phong bức thư. Vui lòng thử lại!'
    });
  }
}

export async function handleLetterReadSelect(interaction) {
  const { customId, values } = interaction;

  if (customId === 'letter_read_select') {
    await interaction.deferUpdate();
    const selectedValue = values[0]; // 'letter_read:id'
    const parts = selectedValue.split(':');
    const letterId = parseInt(parts[1], 10);

    try {
      const letter = await getLetterById(letterId, interaction.user.id);
      if (!letter) {
        return interaction.followUp({
          content: '❌ Không thể đọc bức thư này. Thư không tồn tại, hoặc thư chưa đến ngày mở khóa!',
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setColor('#f8ad9d')
        .setTitle(`✉️ Thư tay từ quá khứ: ${letter.title}`)
        .setDescription(letter.content)
        .addFields(
          { name: '👤 Người viết', value: letter.sender_name, inline: true },
          { name: '📅 Ngày gửi', value: formatDateShort(letter.created_at), inline: true },
          { name: '🔓 Ngày mở khóa', value: formatDateShort(letter.unlock_date), inline: true }
        )
        .setFooter({ text: 'LDR Space Bot • Thư gửi tương lai 💕' })
        .setTimestamp();

      const backButton = new ButtonBuilder()
        .setCustomId('letter_back_to_mailbox')
        .setLabel('Quay lại hòm thư')
        .setEmoji('📫')
        .setStyle(ButtonStyle.Secondary);

      const row = new ActionRowBuilder().addComponents(backButton);

      return interaction.editReply({ embeds: [embed], components: [row] });

    } catch (err) {
      console.error('Failed to read future letter:', err);
      return interaction.followUp({
        content: '❌ Đã xảy ra lỗi khi đọc nội dung thư.',
        ephemeral: true
      });
    }
  }

  if (customId === 'letter_back_to_mailbox') {
    // Re-trigger the mailbox display
    await showMailbox(interaction);
  }
}
