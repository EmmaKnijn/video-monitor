const { exec } = require('child_process');
const createLogger = require('../utils/logger');
const logger = createLogger('TikTok');

async function checkTikTok(account) {
  return new Promise((resolve) => {
    const command = `yt-dlp -j --playlist-end 1 "${account.url}"`;
    
    exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (error) {
        logger.error(`Error checking ${account.url} (yt-dlp): ${error.message}`);
        resolve(null);
        return;
      }

      try {
        // yt-dlp output might be one JSON object or multiple (one per line)
        // Since we used --playlist-end 1, we expect one, but let's be safe.
        const lines = stdout.trim().split('\n');
        if (lines.length === 0) {
            logger.info(`No videos found for ${account.url}`);
            resolve(null);
            return;
        }

        const latestVideoData = JSON.parse(lines[0]);
        
        // Extract ID (yt-dlp usually provides 'id' or 'display_id')
        const latestId = latestVideoData.id || latestVideoData.display_id;
        const latestUrl = latestVideoData.webpage_url || latestVideoData.url;
        const title = latestVideoData.title || 'New TikTok Video';
        const author = latestVideoData.uploader || account.url.split('@')[1] || 'Unknown';

        if (latestId && latestId !== account.last_video_id) {
          resolve({
            id: latestId,
            url: latestUrl,
            title: title,
            author: author
          });
        } else {
          resolve(null);
        }

      } catch (e) {
        logger.error(`Error parsing yt-dlp output for ${account.url}: ${e.message}`);
        resolve(null);
      }
    });
  });
}

module.exports = { check: checkTikTok };
