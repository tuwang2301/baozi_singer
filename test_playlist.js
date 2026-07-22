import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isWindows = process.platform === 'win32';
const ytdlpPath = join(__dirname, isWindows ? 'yt-dlp.exe' : 'yt-dlp');

const testPlaylistUrl = 'https://www.youtube.com/playlist?list=PLw-VjHDlEOgs658kAHR_LAHy8tF-SLdLM';

(async () => {
  try {
    console.log('Fetching playlist with skip=authcheck...');
    const child = spawn(ytdlpPath, [
      testPlaylistUrl,
      '--flat-playlist',
      '--dump-json',
      '--extractor-args', 'youtubetab:skip=authcheck',
      '--quiet'
    ]);
    
    let stdoutData = '';
    let stderrData = '';
    
    child.stdout.on('data', chunk => {
      stdoutData += chunk.toString();
    });
    
    child.stderr.on('data', chunk => {
      stderrData += chunk.toString();
    });
    
    child.on('close', code => {
      if (code !== 0) {
        console.error(`Failed with code ${code}. Stderr: ${stderrData}`);
        process.exit(1);
      }
      
      const lines = stdoutData.split('\n').filter(line => line.trim());
      console.log(`Total songs found: ${lines.length}`);
      if (lines.length > 0) {
        const firstSong = JSON.parse(lines[0]);
        console.log('First song metadata:', firstSong);
      }
      process.exit(0);
    });
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
