const Database = require('better-sqlite3');
const db = new Database('monitors.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,
    url TEXT NOT NULL,
    account_id TEXT,
    guild_id TEXT NOT NULL,
    discord_channel_id TEXT NOT NULL,
    last_video_id TEXT
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
  updateLastVideo: (id, videoId) => {
    const stmt = db.prepare('UPDATE accounts SET last_video_id = ? WHERE id = ?');
    stmt.run(videoId, id);
  }
};
