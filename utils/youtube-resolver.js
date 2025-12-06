const { exec } = require('child_process');
const createLogger = require('./logger');
const logger = createLogger('YouTubeResolver');

async function resolveChannelId(url) {
  // If it already contains 'channel/', extract it. This is a quick path.
  if (url.includes('/channel/')) {
    const parts = url.split('/');
    const index = parts.indexOf('channel');
    if (index !== -1 && parts[index + 1]) {
      return parts[index + 1];
    }
  }

  // Otherwise, use yt-dlp to resolve the channel ID.
  return new Promise((resolve) => {
    // --playlist-end 1 ensures we don't process too much if it's treated as a feed
    const command = `yt-dlp --print channel_id --playlist-end 1 "${url}"`;

    exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (error) {
        logger.error(`Error resolving YouTube ID with yt-dlp for ${url}: ${error.message}`);
        resolve(null);
        return;
      }
      
      // Take the first line and trim it
      const channelId = stdout.trim().split('\n')[0].trim();
      if (channelId) {
        resolve(channelId);
      } else {
        logger.error(`yt-dlp did not return a channel ID for ${url}.`);
        resolve(null);
      }
    });
  });
}

module.exports = { resolveChannelId };
