import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const commandsPath = join(__dirname, 'commands');
const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

const commands = [];

for (const file of commandFiles) {
  const filePath = join(commandsPath, file);
  const commandUrl = `file://${filePath.replace(/\\/g, '/')}`;
  try {
    const command = await import(commandUrl);
    if (command.data && command.execute) {
      commands.push(command.data.toJSON());
    } else {
      console.warn(`[WARNING] Lệnh tại ${filePath} thiếu thuộc tính "data" hoặc "execute".`);
    }
  } catch (error) {
    console.error(`Không thể nạp lệnh tại ${filePath}:`, error);
  }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    const clientId = process.env.CLIENT_ID;
    const guildId = process.env.GUILD_ID;

    if (!clientId) {
      console.error('❌ Thiếu CLIENT_ID trong file .env');
      return;
    }

    if (guildId && guildId !== 'your_guild_id_here') {
      console.log(`🚀 Bắt đầu đăng ký ${commands.length} lệnh gạch chéo cho SERVER (Guild ID: ${guildId})...`);
      
      const data = await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands }
      );
      
      console.log(`✅ Đăng ký thành công ${data.length} lệnh gạch chéo cho SERVER!`);
    } else {
      console.log(`🚀 Bắt đầu đăng ký ${commands.length} lệnh gạch chéo TOÀN CẦU (Global)...`);
      
      const data = await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands }
      );
      
      console.log(`✅ Đăng ký thành công ${data.length} lệnh gạch chéo TOÀN CẦU!`);
    }
  } catch (error) {
    console.error('❌ Lỗi khi đăng ký lệnh:', error);
  }
})();
