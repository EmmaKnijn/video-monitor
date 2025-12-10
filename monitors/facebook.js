const { runWithPage } = require('../utils/browser');
const createLogger = require('../utils/logger');
const logger = createLogger('Facebook');

async function checkFacebook(account) {
  return runWithPage(async (page) => {
    try {
      // Facebook structure is complex. We assume the URL points to a page where reels are visible.
      await page.goto(account.url, { waitUntil: 'networkidle' });
      
      const selector = 'a[href*="/reel/"]';
      try {
          await page.waitForSelector(selector, { timeout: 10000 });
      } catch (e) {
          logger.debug(`No reels found for ${account.url} (timeout).`);
          return null;
      }

      const links = await page.$$eval(selector, els => els.map(e => e.href));
      if (links.length === 0) return null;

      const latestLink = links[0];
      
      // Extract numeric ID if possible
      const match = latestLink.match(/\/reel\/(\d+)/);
      const latestId = match ? match[1] : latestLink;

      const result = {
        id: latestId,
        url: latestLink,
        title: 'New Facebook Reel',
        author: 'Unknown' 
      };
      
      return [result];

    } catch (error) {
      logger.error(`Error checking ${account.url}: ${error.message}`);
      return null;
    }
  });
}

module.exports = { check: checkFacebook };