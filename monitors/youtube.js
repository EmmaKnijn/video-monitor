const { exec } = require('child_process');
const createLogger = require('../utils/logger');
const logger = createLogger('YouTube');

/**
 * Fetches the latest video data from a given URL using yt-dlp.
 * @param {string} url - The URL to check (channel or shorts feed).
 * @returns {Promise<Object|null>} - The latest video object or null if not found/error.
 */
function fetchLatest(url) {
  return new Promise((resolve) => {
    // --flat-playlist might be faster but provides less info. 
    // -j provides full info for the first item.
    const command = `yt-dlp -j --playlist-end 1 "${url}"`;
    
    exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (error) {
        // This is expected if the channel has no shorts, or url is invalid.
        // We log only on verbose or if strictly necessary, to avoid noise.
        // logger.debug(`yt-dlp error for ${url}: ${error.message}`);
        resolve(null);
        return;
      }

      try {
        const lines = stdout.trim().split('\n');
        if (lines.length === 0) {
          resolve(null);
          return;
        }

        // Parse the first JSON object
        const latestVideoData = JSON.parse(lines[0]);
        
        resolve({
          id: latestVideoData.id,
          url: latestVideoData.webpage_url || `https://www.youtube.com/watch?v=${latestVideoData.id}`,
          title: latestVideoData.title,
          author: latestVideoData.uploader,
          timestamp: latestVideoData.timestamp || 0 // Use 0 if missing to allow safe comparison
        });

      } catch (e) {
        logger.error(`Error parsing yt-dlp output for ${url}: ${e.message}`);
        resolve(null);
      }
    });
  });
}

async function checkYouTube(account) {
  // Use account_id to construct canonical URLs if available, otherwise fallback to stored URL
  let mainUrl = account.url;
  let shortsUrl = null;

  if (account.account_id) {
    mainUrl = `https://www.youtube.com/channel/${account.account_id}`;
    shortsUrl = `https://www.youtube.com/channel/${account.account_id}/shorts`;
  } else {
    // Fallback logic: Try to append /shorts to the user URL
    // Strip trailing slash
    const base = account.url.endsWith('/') ? account.url.slice(0, -1) : account.url;
    shortsUrl = `${base}/shorts`;
  }

  // Fetch both concurrently
  const [video, short] = await Promise.all([
    fetchLatest(mainUrl),
    fetchLatest(shortsUrl)
  ]);

  // Determine the absolute latest content
  let latest = null;

  if (video && short) {
    // Compare timestamps to find the newest
    latest = (video.timestamp > short.timestamp) ? video : short;
  } else {
    latest = video || short;
  }

  if (latest && latest.id !== account.last_video_id) {
    return {
      id: latest.id,
      url: latest.url,
      title: latest.title,
      author: latest.author
    };
  } else {
    return null;
  }
}

module.exports = { check: checkYouTube };