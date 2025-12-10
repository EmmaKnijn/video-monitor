const { SlashCommandBuilder } = require('discord.js');
const db = require('../db');
const { resolveChannelId } = require('../utils/youtube-resolver');
const createLogger = require('../utils/logger');

const logger = createLogger('Command:Monitor');

/**
 * Helper to safely reply/edit the interaction.
 * @param {import('discord.js').ChatInputCommandInteraction} interaction 
 * @param {string|import('discord.js').InteractionReplyOptions} content 
 */
async function sendResponse(interaction, content) {
  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(content);
    } else {
      await interaction.reply(content);
    }
  } catch (error) {
    logger.error(`Failed to send response: ${error.message}`);
  }
}

async function handleAdd(interaction) {
  // Always defer first for operations that might take time (resolving IDs)
  await interaction.deferReply();

  const platform = interaction.options.getString('platform');
  const url = interaction.options.getString('url');
  const channel = interaction.options.getChannel('channel') || interaction.channel;
  let accountId = null;

  try {
    if (platform === 'youtube') {
      accountId = await resolveChannelId(url);
      if (!accountId) {
        return sendResponse(interaction, `Could not resolve YouTube Channel ID from ${url}. Please try using the full /channel/ ID URL.`);
      }
    } else {
      if (url.includes('@')) {
        accountId = url.split('@')[1].split('/')[0];
      }
    }

    db.addAccount(platform, url, accountId, interaction.guildId, channel.id);
    logger.info(`Added monitor: ${platform} - ${url} - ${channel.id}`);
    
    await sendResponse(interaction, `Successfully added **${platform}** monitor for <${url}> in ${channel}.`);
  } catch (error) {
    logger.error(`Failed to add monitor: ${error.message}`);
    await sendResponse(interaction, 'Failed to add monitor. Database error or invalid input.');
  }
}

async function handleRemove(interaction) {
  await interaction.deferReply();
  
  const id = interaction.options.getInteger('id');
  
  try {
    const result = db.removeAccount(id);
    if (result.changes > 0) {
      logger.info(`Removed monitor ID: ${id}`);
      await sendResponse(interaction, `Removed monitor ID: ${id}`);
    } else {
      await sendResponse(interaction, `Monitor ID ${id} not found.`);
    }
  } catch (error) {
    logger.error(`Failed to remove monitor: ${error.message}`);
    await sendResponse(interaction, 'Failed to remove monitor due to an error.');
  }
}

async function handleList(interaction) {
  await interaction.deferReply();

  try {
    const accounts = db.getAllAccounts();
    
    if (accounts.length === 0) {
      return sendResponse(interaction, 'No accounts are being monitored.');
    }

    const list = accounts
      .map(a => `**ID: ${a.id}** | ${a.platform} | <${a.url}> | <#${a.discord_channel_id}>`)
      .join('\n');

    if (list.length > 1900) {
      await sendResponse(interaction, list.substring(0, 1900) + '... (truncated)');
    } else {
      await sendResponse(interaction, list);
    }
  } catch (error) {
    logger.error(`Failed to list monitors: ${error.message}`);
    await sendResponse(interaction, 'Failed to retrieve monitor list.');
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('monitor')
    .setDescription('Manage video monitoring')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a new account to monitor')
        .addStringOption(option =>
          option.setName('platform')
            .setDescription('The platform to monitor')
            .setRequired(true)
            .addChoices(
              { name: 'YouTube', value: 'youtube' },
              { name: 'TikTok', value: 'tiktok' },
              { name: 'Instagram', value: 'instagram' },
              { name: 'Facebook', value: 'facebook' },
            ))
        .addStringOption(option =>
          option.setName('url')
            .setDescription('The URL of the account/channel')
            .setRequired(true))
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('The Discord channel to post notifications in (default: current channel)')))
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Stop monitoring an account')
        .addIntegerOption(option =>
          option.setName('id')
            .setDescription('The ID of the monitor to remove (use /monitor list to find IDs)')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all monitored accounts')),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    try {
      switch (subcommand) {
        case 'add':
          await handleAdd(interaction);
          break;
        case 'remove':
          await handleRemove(interaction);
          break;
        case 'list':
          await handleList(interaction);
          break;
        default:
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'Unknown subcommand', ephemeral: true });
          }
      }
    } catch (error) {
      logger.error(`Error in monitor command execution: ${error.message}`);
      await sendResponse(interaction, 'An unexpected error occurred.');
    }
  }
};
