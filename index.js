const { Client, GatewayIntentBits, Events } = require('discord.js');
require('dotenv').config();
const db = require('./db');
const { startScheduler } = require('./utils/scheduler');
const { resolveChannelId } = require('./utils/youtube-resolver');
const createLogger = require('./utils/logger');

const logger = createLogger('Main');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, c => {
  logger.info(`Ready! Logged in as ${c.user.tag}`);
  startScheduler(client);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'monitor') {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'add') {
      await interaction.deferReply(); // Resolving IDs might take a moment

      const platform = interaction.options.getString('platform');
      const url = interaction.options.getString('url');
      const channel = interaction.options.getChannel('channel') || interaction.channel;

      let accountId = null;

      if (platform === 'youtube') {
        accountId = await resolveChannelId(url);
        if (!accountId) {
          return interaction.editReply(`Could not resolve YouTube Channel ID from ${url}. Please try using the full /channel/ ID URL.`);
        }
      } else {
        // For others, we might extract the username as ID or just leave it null and rely on URL
        // monitors typically extract the 'last_video_id' dynamically. 
        // We'll store the username as accountId for reference if possible.
        // e.g. tiktok.com/@user -> user
        if (url.includes('@')) {
           accountId = url.split('@')[1].split('/')[0];
        }
      }

      try {
        db.addAccount(platform, url, accountId, interaction.guildId, channel.id);
        logger.info(`Added monitor: ${platform} - ${url} - ${channel.id}`);
        await interaction.editReply(`Successfully added **${platform}** monitor for <${url}> in ${channel}.`);
      } catch (e) {
        logger.error(`Failed to add monitor: ${e.message}`);
        await interaction.editReply('Failed to add monitor. Database error.');
      }
    } else if (subcommand === 'remove') {
      const id = interaction.options.getInteger('id');
      const result = db.removeAccount(id);
      if (result.changes > 0) {
        logger.info(`Removed monitor ID: ${id}`);
        await interaction.reply(`Removed monitor ID: ${id}`);
      } else {
        await interaction.reply(`Monitor ID ${id} not found.`);
      }
    } else if (subcommand === 'list') {
      const accounts = db.getAllAccounts();
      if (accounts.length === 0) {
        return interaction.reply('No accounts are being monitored.');
      }
      
      const list = accounts.map(a => `**ID: ${a.id}** | ${a.platform} | <${a.url}> | <#${a.discord_channel_id}>`).join('\n');
      // Split if too long (Discord 2000 char limit) - Basic handling
      if (list.length > 1900) {
          // Truncate or split. For now, just truncate.
          await interaction.reply(list.substring(0, 1900) + '...');
      } else {
          await interaction.reply(list);
      }
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
