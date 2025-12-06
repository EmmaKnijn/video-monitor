const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();
const createLogger = require('./utils/logger');
const logger = createLogger('Deploy');

const commands = [
  new SlashCommandBuilder()
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
        .setDescription('List all monitored accounts'))
]
  .map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    logger.info('Started refreshing application (/) commands.');

    // We can register globally or for a specific guild.
    // Ideally globally, but it takes time to propagate. 
    // We'll try global.
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands },
    );

    logger.info('Successfully reloaded application (/) commands.');
  } catch (error) {
    logger.error(error);
  }
})();
