const { exec } = require('child_process');
const createLogger = require('../utils/logger');
const logger = createLogger('TikTok');

function fetchLatest(url) {
  return new Promise((resolve) => {
    const command = `yt-dlp -j --playlist-end 1 "${url}"`;
    
    exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (error) {
        logger.error(`Error checking ${url} (yt-dlp): ${error.message}`);
        resolve(null);
        return;
      }

      try {
        const lines = stdout.trim().split('\n').filter(line => line.trim() !== '');
        if (lines.length === 0) {
            logger.info(`No videos found for ${url}`);
            resolve(null);
            return;
        }

        const data = JSON.parse(lines[0]);
        return resolve({
            id: data.id || data.display_id,
            url: data.webpage_url || data.url,
            title: data.title || 'New TikTok Video',
            author: data.uploader || url.split('@')[1] || 'Unknown',
            timestamp: data.timestamp || 0
        });
        

      } catch (e) {
        logger.error(`Error parsing yt-dlp output for ${url}: ${e.message}`);
        resolve(null);
      }
    });
  });
}

async function checkTikTok(account) {
  const latestVideo = await fetchLatest(account.url);

  if (latestVideo) {
    return [latestVideo]; // Return as an array for scheduler consistency
  }
  return null;
}

module.exports = { check: checkTikTok };
