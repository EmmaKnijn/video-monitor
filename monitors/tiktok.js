const { execFile } = require('child_process');
const createLogger = require('../utils/logger');
const logger = createLogger('TikTok');

/**
 * Fetches the latest TikTok video using yt-dlp.
 * @param {string} url 
 * @returns {Promise<Object|null>}
 */
function fetchLatest(url) {
  return new Promise((resolve) => {
    // yt-dlp arguments
    const args = ['-j', '--playlist-end', '1', url];
    
    execFile('yt-dlp', args, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        // TikTok scraping often fails or returns non-zero on some conditions.
        logger.debug(`yt-dlp error for ${url}: ${error.message}`);
        return resolve(null);
      }

      try {
        const lines = stdout.trim().split('\n').filter(line => line.trim() !== '');
        if (lines.length === 0) {
            return resolve(null);
        }

        const data = JSON.parse(lines[0]);
        
        // Extract relevant data
        return resolve({
            id: data.id || data.display_id,
            url: data.webpage_url || data.url,
            title: data.title || 'New TikTok Video',
            author: data.uploader || (url.includes('@') ? url.split('@')[1].split('/')[0] : 'Unknown'),
            timestamp: data.timestamp || 0
        });

      } catch (e) {
        logger.error(`Error parsing yt-dlp output for ${url}: ${e.message}`);
        return resolve(null);
      }
    });
  });
}

async function checkTikTok(account) {
  const latestVideo = await fetchLatest(account.url);
  return latestVideo ? [latestVideo] : null;
}

module.exports = { check: checkTikTok };