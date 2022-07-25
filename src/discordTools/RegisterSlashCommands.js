const fs = require("fs");
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const Config = require('../../config');

module.exports = async (client, guild) => {
    const commands = [];
    const commandFiles = fs.readdirSync(`${__dirname}/../commands`).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const command = require(`../commands/${file}`);
        commands.push(command.data.toJSON());
    }

    const rest = new REST({ version: '9' }).setToken(Config.discord.token);

    try {
        await rest.put(Routes.applicationGuildCommands(Config.discord.clientId, guild.id), { body: commands });
    }
    catch (e) {
        client.log('ERROR',
            `Could not register Slash Commands for guild: ${guild.id}. ` +
            'Make sure applications.commands is checked when creating the invite URL.', 'error');
        process.exit(1);
    }
    client.log('INFO', `Successfully registered application commands for guild: ${guild.id}.`)
};
