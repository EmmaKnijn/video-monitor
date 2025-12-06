const { exec } = require('child_process');
const createLogger = require('../utils/logger');
const logger = createLogger('YouTube');

async function checkYouTube(account) {
  return new Promise((resolve) => {
    // yt-dlp can handle various YouTube URLs (channel, user, custom URL, etc.)
    // We use --playlist-end 1 to get only the latest video from the channel/user feed.
    const command = `yt-dlp -j --playlist-end 1 "${account.url}"`; 
    
    exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (error) {
        logger.error(`Error checking ${account.url} (yt-dlp): ${error.message}`);
        resolve(null);
        return;
      }

      try {
        const lines = stdout.trim().split('\n');
        if (lines.length === 0) {
            logger.info(`No videos found for ${account.url}`);
            resolve(null);
            return;
        }

        // Parse the first (and only) JSON object
        const latestVideoData = JSON.parse(lines[0]);
        
        const latestId = latestVideoData.id;
        const latestUrl = latestVideoData.webpage_url || `https://www.youtube.com/watch?v=${latestId}`;
        const title = latestVideoData.title;
        const author = latestVideoData.uploader;

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

module.exports = { check: checkYouTube };
