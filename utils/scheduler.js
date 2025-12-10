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

function startScheduler(client) {
  // Run immediately on start? Maybe wait 10s.
  setTimeout(() => runCycle(client), 10 * 1000);
  
  // Schedule every 2 minutes
  setInterval(() => runCycle(client), 2 * 10 * 1000);
}

async function runCycle(client) {
  logger.info('Starting check cycle...');
  const accounts = db.getAllAccounts();
  if (accounts.length === 0) logger.info('No accounts to monitor.');

  // Spread checks across 60 seconds
  // If fewer accounts than 60s, we just spread them easily.
  // If more, we might overlap or need to condense.
  // Requirement: "Spread across a minute"
  
  const duration = 60 * 1000; // 1 minute window
  const delayPerAccount = Math.floor(duration / Math.max(accounts.length, 1));

  accounts.forEach((account, index) => {
    setTimeout(async () => {
      await checkAccount(client, account);
    }, index * delayPerAccount);
  });
}

async function checkAccount(client, account) {
  if (ongoingChecks.has(account.id)) {
    logger.info(`Check for account ${account.id} is already in progress. Skipping.`);
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

    if (Array.isArray(results) && results.length > 0) {
      for (const result of results) {
        if (!db.hasSeenVideo(result.id)) {
          logger.info(`New video found for ${account.url}: ${result.url}`);
          await sendNotification(client, account, result);
          db.addSeenVideo(result.id);
        }
      }
    } else if (results && !Array.isArray(results)) {
      // Backward compatibility for monitors that don't return an array
      if (!db.hasSeenVideo(results.id)) {
        logger.info(`New video found for ${account.url}: ${results.url}`);
        await sendNotification(client, account, results);
        db.addSeenVideo(results.id);
      }
    }
  } catch (error) {
    logger.error(`Error checking account ${account.id}: ${error.message}`);
  } finally {
    ongoingChecks.delete(account.id);
  }
}

async function sendNotification(client, account, result) {
  const channel = await client.channels.fetch(account.discord_channel_id).catch(() => null);
  if (channel) {
    await channel.send({
      content: `**New Upload!** 🎥\n**Author:** ${result.author}\n**Title:** ${result.title || 'No Title'}\n**Link:** ${result.url}`
    });
  } else {
    logger.error(`Could not find Discord channel ${account.discord_channel_id}`);
  }
}

module.exports = { startScheduler };
