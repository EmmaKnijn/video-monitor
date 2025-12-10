const { execFile } = require('child_process');
const createLogger = require('../utils/logger');
const logger = createLogger('YouTube');

/**
 * Fetches the latest video data from a given URL using yt-dlp.
 * Uses execFile for safer execution (avoids shell injection).
 * 
 * @param {string} url - The URL to check.
 * @returns {Promise<Object|null>} - The latest video object or null if not found/error.
 */
function fetchLatest(url) {
  return new Promise((resolve) => {
    // Arguments for yt-dlp
    const args = ['-j', '--playlist-end', '1', url];

    execFile('yt-dlp', args, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        // Log only if it's not just a "no video" error (which can happen on empty channels)
        // yt-dlp might exit with non-zero if playlist is empty or private
        logger.debug(`yt-dlp error for ${url}: ${error.message}`); 
        return resolve(null);
      }

      try {
        const lines = stdout.trim().split('\n').filter(line => line.trim() !== '');
        if (lines.length === 0) {
          return resolve(null);
        }

        // Parse the first line (should be the latest video JSON)
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
        return resolve(null);
      }
    });
  });
}

/**
 * Checks a YouTube channel for new videos.
 * Checks both the main video feed and the shorts feed.
 * 
 * @param {Object} account - The account object from the database.
 * @returns {Promise<Array|null>} - An array containing the latest video if found, or null.
 */
async function checkYouTube(account) {
  let mainUrl = account.url;
  let shortsUrl = null;

  // Construct URLs based on account info
  if (account.account_id) {
    mainUrl = `https://www.youtube.com/channel/${account.account_id}`;
    shortsUrl = `https://www.youtube.com/channel/${account.account_id}/shorts`;
  } else {
    // Fallback if no account_id (e.g. user provided a custom URL)
    const base = account.url.endsWith('/') ? account.url.slice(0, -1) : account.url;
    shortsUrl = `${base}/shorts`;
  }

  // Fetch both feeds in parallel
  const [mainVideo, shortVideo] = await Promise.all([
    fetchLatest(mainUrl),
    fetchLatest(shortsUrl)
  ]);

  let latest = null;

  // Compare timestamps to find the absolute latest
  if (mainVideo && shortVideo) {
    latest = (mainVideo.timestamp > shortVideo.timestamp) ? mainVideo : shortVideo;
  } else {
    latest = mainVideo || shortVideo;
  }

  // Return as an array to maintain interface consistency with other monitors
  return latest ? [latest] : null;
}

module.exports = { check: checkYouTube };
