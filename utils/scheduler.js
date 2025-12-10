const db = require('../db');
const youtube = require('../monitors/youtube');
const tiktok = require('../monitors/tiktok');
const instagram = require('../monitors/instagram');
const facebook = require('../monitors/facebook');
const createLogger = require('./logger');

const logger = createLogger('Scheduler');

const monitors = {
  youtube,
  tiktok,
  instagram,
  facebook
};

const ongoingChecks = new Set();
// Check every 20 seconds
const CHECK_INTERVAL = 1 * 20 * 1000; 

function startScheduler(client) {
  logger.info(`Scheduler started. Interval: ${CHECK_INTERVAL / 1000}s`);

  // Run immediately after a short delay
  setTimeout(() => runCycle(client), 5000);
  
  // Schedule periodic checks
  setInterval(() => runCycle(client), CHECK_INTERVAL);
}

async function runCycle(client) {
  logger.info('Starting check cycle...');
  const accounts = db.getAllAccounts();
  
  if (accounts.length === 0) {
    logger.info('No accounts to monitor.');
    return;
  }

  // Spread checks across a portion of the interval to avoid spikes
  // We'll spread them across 1 minute (60s) to be gentle
  const spreadDuration = 60 * 1000; 
  const delayPerAccount = Math.floor(spreadDuration / Math.max(accounts.length, 1));

  accounts.forEach((account, index) => {
    setTimeout(async () => {
      await checkAccount(client, account);
    }, index * delayPerAccount);
  });
}

async function checkAccount(client, account) {
  if (ongoingChecks.has(account.id)) {
    logger.warn(`Check for account ${account.id} is already in progress. Skipping.`);
    return;
  }

  ongoingChecks.add(account.id);

  try {
    const monitor = monitors[account.platform];
    if (!monitor) {
      logger.error(`No monitor found for platform: ${account.platform}`);
      return;
    }

    const results = await monitor.check(account);
    const newVideos = Array.isArray(results) ? results : (results ? [results] : []);

    for (const video of newVideos) {
      if (!db.hasSeenVideo(video.id)) {
        logger.info(`New video found for ${account.url}: ${video.url}`);
        await sendNotification(client, account, video);
        db.addSeenVideo(video.id);
      }
    }

  } catch (error) {
    logger.error(`Error checking account ${account.id} (${account.platform}): ${error.message}`);
  } finally {
    ongoingChecks.delete(account.id);
  }
}

async function sendNotification(client, account, video) {
  try {
    const channel = await client.channels.fetch(account.discord_channel_id);
    if (channel) {
      await channel.send({
        content: `**New Upload!** 🎥\n**Author:** ${video.author}\n**Title:** ${video.title || 'No Title'}\n**Link:** ${video.url}`
      });
    } else {
      logger.error(`Could not find Discord channel ${account.discord_channel_id}`);
    }
  } catch (error) {
    logger.error(`Failed to send notification for ${account.id}: ${error.message}`);
  }
}

module.exports = { startScheduler };