const { runWithPage } = require('../utils/browser');

async function checkInstagram(account) {
  return runWithPage(async (page) => {
    try {
      let url = account.url;
      if (!url.includes('/reels/') && !url.endsWith('/')) url += '/reels/';
      else if (!url.includes('/reels/')) url += 'reels/';

      await page.goto(url, { waitUntil: 'networkidle' });
      
      // Instagram often shows a login wall.
      // We look for any anchor that links to a reel.
      // The grid usually has links like /p/ID/ or /reel/ID/
      
      const selector = 'a[href^="/reel/"], a[href^="/p/"]';
      try {
          await page.waitForSelector(selector, { timeout: 10000 });
      } catch (e) {
          return null;
      }

      // Get the first few links and pick the first one that seems to be a post
      const links = await page.$$eval(selector, els => els.map(e => e.href));
      
      if (links.length === 0) return null;
      
      const latestLink = links[0]; // Assuming top-left is newest
      
      // Extract ID
      // https://www.instagram.com/reel/C12345/
      const parts = latestLink.split('/').filter(p => p);
      const latestId = parts[parts.length - 1]; // The ID is usually the last segment

      if (latestId !== account.last_video_id) {
        return {
          id: latestId,
          url: latestLink,
          title: 'New Instagram Reel',
          author: account.url.split('instagram.com/')[1]?.split('/')[0] || 'Unknown'
        };
      }
    } catch (error) {
      console.error(`[Instagram] Error checking ${account.url}:`, error.message);
    }
    return null;
  });
}

module.exports = { check: checkInstagram };
