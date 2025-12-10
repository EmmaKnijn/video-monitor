const { exec } = require('child_process');
const createLogger = require('../utils/logger');
const logger = createLogger('YouTube');

/**
 * Fetches the latest video data from a given URL using yt-dlp.
 * @param {string} url - The URL to check.
 * @returns {Promise<Object|null>} - The latest video object or null if not found/error.
 */
function fetchLatest(url) {
  return new Promise((resolve) => {
    const command = `yt-dlp -j --playlist-end 1 "${url}"`;
    
    exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (error) {
        resolve(null);
        return;
      }

      try {
        const lines = stdout.trim().split('\n').filter(line => line.trim() !== '');
        if (lines.length === 0) {
          resolve(null);
          return;
        }

        const data = JSON.parse(lines[0]);
        return resolve({
            id: data.id,
            url: data.webpage_url || `https://www.youtube.com/watch?v=${data.id}`,
            title: data.title,
            author: data.uploader,
            timestamp: data.timestamp || 0
        });

      } catch (e) {
        logger.error(`Error parsing yt-dlp output for ${url}: ${e.message}`);
        resolve(null);
      }
    });
  });
}

async function checkYouTube(account) {
  let mainUrl = account.url;
  let shortsUrl = null;

  if (account.account_id) {
    mainUrl = `https://www.youtube.com/channel/${account.account_id}`;
    shortsUrl = `https://www.youtube.com/channel/${account.account_id}/shorts`;
  } else {
    const base = account.url.endsWith('/') ? account.url.slice(0, -1) : account.url;
    shortsUrl = `${base}/shorts`;
  }

  const [mainVideo, shortVideo] = await Promise.all([
    fetchLatest(mainUrl),
    fetchLatest(shortsUrl)
  ]);

  let latest = null;

  if (mainVideo && shortVideo) {
    latest = (mainVideo.timestamp > shortVideo.timestamp) ? mainVideo : shortVideo;
  } else {
    latest = mainVideo || shortVideo;
  }

  if (latest) {
    return [latest]; // Return as an array for scheduler consistency
  }
  return null;
}

module.exports = { check: checkYouTube };