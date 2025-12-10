const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

const db = new Database(path.join(dataDir, 'monitors.db'));

// Initialize Database Schema
function init() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      url TEXT NOT NULL,
      account_id TEXT,
      guild_id TEXT NOT NULL,
      discord_channel_id TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS seen_videos (
      video_id TEXT PRIMARY KEY
    );
  `);
}

init();

module.exports = {
  /**
   * Add a new account to monitor.
   */
  addAccount: (platform, url, accountId, guildId, discordChannelId) => {
    const stmt = db.prepare(`
      INSERT INTO accounts (platform, url, account_id, guild_id, discord_channel_id) 
      VALUES (?, ?, ?, ?, ?)
    `);
    return stmt.run(platform, url, accountId, guildId, discordChannelId);
  },

  /**
   * Remove an account by ID.
   */
  removeAccount: (id) => {
    const stmt = db.prepare('DELETE FROM accounts WHERE id = ?');
    return stmt.run(id);
  },

  /**
   * Get all monitored accounts.
   */
  getAllAccounts: () => {
    return db.prepare('SELECT * FROM accounts').all();
  },

  /**
   * Get accounts filtered by platform.
   */
  getAccountsByPlatform: (platform) => {
    return db.prepare('SELECT * FROM accounts WHERE platform = ?').all();
  },

  /**
   * Mark a video as seen.
   */
  addSeenVideo: (videoId) => {
    const stmt = db.prepare('INSERT OR IGNORE INTO seen_videos (video_id) VALUES (?)');
    return stmt.run(videoId);
  },

  /**
   * Check if a video has already been seen.
   */
  hasSeenVideo: (videoId) => {
    const stmt = db.prepare('SELECT video_id FROM seen_videos WHERE video_id = ?');
    const result = stmt.get(videoId);
    return !!result;
  }
};