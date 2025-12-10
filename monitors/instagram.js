const { runWithPage } = require('../utils/browser');
const createLogger = require('../utils/logger');
const logger = createLogger('Instagram');

async function checkInstagram(account) {
  return runWithPage(async (page) => {
    try {
      let url = account.url;
      // Normalize URL to point to reels if generic
      if (!url.includes('/reels/') && !url.endsWith('/')) url += '/reels/';
      else if (!url.includes('/reels/')) url += 'reels/';

      await page.goto(url, { waitUntil: 'networkidle' });
      
      const selector = 'a[href^="/reel/"], a[href^="/p/"]';
      try {
          await page.waitForSelector(selector, { timeout: 10000 });
      } catch (e) {
          logger.debug(`No reels found for ${account.url} (timeout).`);
          return null;
      }

      const links = await page.$$eval(selector, els => els.map(e => e.href));
      if (links.length === 0) return null;
      
      const latestLink = links[0];
      
      // Extract ID from URL
      const parts = latestLink.split('/').filter(p => p);
      const latestId = parts[parts.length - 1];

      // Use a consistent result object
      const result = {
        id: latestId,
        url: latestLink,
        title: 'New Instagram Reel',
        author: account.url.split('instagram.com/')[1]?.split('/')[0] || 'Unknown'
      };

      return [result];

    } catch (error) {
      logger.error(`Error checking ${account.url}: ${error.message}`);
      return null;
    }
  });
}

module.exports = { check: checkInstagram };