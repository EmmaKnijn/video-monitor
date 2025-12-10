const Database = require('better-sqlite3');
const fs = require('node:fs');
if (fs.existsSync('data') === false) {
  fs.mkdirSync('data');
}

const db = new Database('data/monitors.db');

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

module.exports = {
  addAccount: (platform, url, accountId, guildId, discordChannelId) => {
    const stmt = db.prepare('INSERT INTO accounts (platform, url, account_id, guild_id, discord_channel_id) VALUES (?, ?, ?, ?, ?)');
    return stmt.run(platform, url, accountId, guildId, discordChannelId);
  },
  removeAccount: (id) => {
    const stmt = db.prepare('DELETE FROM accounts WHERE id = ?');
    return stmt.run(id);
  },
  getAllAccounts: () => {
    return db.prepare('SELECT * FROM accounts').all();
  },
  getAccountsByPlatform: (platform) => {
    return db.prepare('SELECT * FROM accounts WHERE platform = ?').all();
  },
  addSeenVideo: (videoId) => {
    const stmt = db.prepare('INSERT OR IGNORE INTO seen_videos (video_id) VALUES (?)');
    return stmt.run(videoId);
  },
  hasSeenVideo: (videoId) => {
    const stmt = db.prepare('SELECT video_id FROM seen_videos WHERE video_id = ?');
    const result = stmt.get(videoId);
    return !!result;
  }
};
