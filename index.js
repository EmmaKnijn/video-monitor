const { Client, GatewayIntentBits, Events } = require('discord.js');
require('dotenv').config();

const { startScheduler } = require('./utils/scheduler');
const createLogger = require('./utils/logger');
const monitorCommand = require('./commands/monitor');

const logger = createLogger('Main');

// Initialize Discord Client
const client = new Client({ 
  intents: [GatewayIntentBits.Guilds] 
});

// Event: Client Ready
client.once(Events.ClientReady, c => {
  logger.info(`Ready! Logged in as ${c.user.tag}`);
  startScheduler(client);
});

// Event: Interaction Create
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  // Command Routing
  if (commandName === 'monitor') {
    try {
      await monitorCommand.execute(interaction);
    } catch (error) {
      logger.error(`Error executing command ${commandName}: ${error}`);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
      } else {
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
      }
    }
  }
});

client.login(process.env.DISCORD_TOKEN);