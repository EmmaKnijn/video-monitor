const { REST, Routes } = require('discord.js');
require('dotenv').config();
const createLogger = require('./utils/logger');
const logger = createLogger('Deploy');
const monitorCommand = require('./commands/monitor');

// List of commands to deploy
const commands = [
  monitorCommand.data.toJSON()
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    logger.info(`Started refreshing ${commands.length} application (/) commands.`);

    // Refresh globally
    const data = await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands },
    );

    logger.info(`Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    logger.error(`Error deploying commands: ${error}`);
  }
})();