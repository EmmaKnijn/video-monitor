const { execFile } = require('child_process');
const createLogger = require('./logger');
const logger = createLogger('YouTubeResolver');

/**
 * Resolves a YouTube channel ID from a URL using yt-dlp.
 * 
 * @param {string} url - The YouTube URL.
 * @returns {Promise<string|null>} - The Channel ID or null.
 */
async function resolveChannelId(url) {
  // Optimization: If the URL already contains '/channel/', extract the ID directly.
  if (url.includes('/channel/')) {
    const parts = url.split('/');
    const index = parts.indexOf('channel');
    if (index !== -1 && parts[index + 1]) {
      // Return the segment immediately after 'channel'
      return parts[index + 1];
    }
  }

  // Use yt-dlp to resolve the channel ID securely.
  return new Promise((resolve) => {
    const args = ['--print', 'channel_id', '--playlist-end', '1', url];

    execFile('yt-dlp', args, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        logger.error(`Error resolving YouTube ID with yt-dlp for ${url}: ${error.message}`);
        return resolve(null);
      }
      
      const output = stdout.trim();
      if (!output) {
        logger.warn(`yt-dlp returned empty output for ${url}`);
        return resolve(null);
      }

      // Take the first line and trim it
      const channelId = output.split('\n')[0].trim();
      resolve(channelId || null);
    });
  });
}

module.exports = { resolveChannelId };