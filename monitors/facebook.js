const { runWithPage } = require('../utils/browser');

async function checkFacebook(account) {
  return runWithPage(async (page) => {
    try {
      let url = account.url;
      // Ensure we are on the reels tab if possible, though /reels might not work for all page types (e.g. profiles vs pages)
      // Safest is to just visit the provided URL and look for reels if the user provided a reels link, 
      // or try to find the reels tab. 
      // For simplicity, we assume the user provides the link to the Reels section or the main page.
      
      await page.goto(url, { waitUntil: 'networkidle' });
      
      // Look for reel links.
      const selector = 'a[href*="/reel/"]';
      try {
          await page.waitForSelector(selector, { timeout: 10000 });
      } catch (e) {
          return null;
      }

      const links = await page.$$eval(selector, els => els.map(e => e.href));
      if (links.length === 0) return null;

      const latestLink = links[0];
      
      // Extract ID. FB IDs are usually numeric or complex strings.
      // We'll use the whole link as ID if we can't parse, or a hash of it.
      // But usually the link is unique enough.
      // https://www.facebook.com/reel/123456...
      const match = latestLink.match(/\/reel\/(\d+)/);
      const latestId = match ? match[1] : latestLink;

      if (latestId !== account.last_video_id) {
         return {
          id: latestId,
          url: latestLink,
          title: 'New Facebook Reel',
          author: 'Unknown' 
        };
      }

    } catch (error) {
      console.error(`[Facebook] Error checking ${account.url}:`, error.message);
    }
    return null;
  });
}

module.exports = { check: checkFacebook };
