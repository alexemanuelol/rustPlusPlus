const fs = require('fs');
const { Collection, Client } = require('discord.js');
const Config = require('../../config');
const RustPlus = require('../structures/RustPlus');
const Logger = require('./Logger.js');
const path = require('path');
const Items = require('./Items');
const DiscordTools = require('../discordTools/discordTools');
const { MessageEmbed } = require('discord.js');

class DiscordBot extends Client {
    constructor(props) {
        super(props);

        this.logger = new Logger(path.join(__dirname, '..', '..', 'logs/discordBot.log'), 'default');

        this.commands = new Collection();
        this.rustplusInstances = new Object();
        this.currentFcmListeners = new Object();
        this.switchesMessages = new Object();
        this.storageMonitorsMessages = new Object();

        this.items = new Items();

        this.pollingIntervalMs = Config.general.pollingIntervalMs;

        this.battlemetricsOnlinePlayers = new Object();
        this.battlemetricsIntervalId = null;
        this.battlemetricsIntervalCounter = 0;

        this.loadCommands();
        this.loadEvents();
    }

    loadCommands() {
        const commandFiles = fs.readdirSync(`${__dirname}/../commands`).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const command = require(`../commands/${file}`);
            this.commands.set(command.data.name, command);
        }
    }

    loadEvents() {
        const discordEventFiles = fs.readdirSync(`${__dirname}/../discordEvents`).filter(file => file.endsWith('.js'));
        for (const file of discordEventFiles) {
            const event = require(`../discordEvents/${file}`);
            if (event.once) {
                this.once(event.name, (...args) => event.execute(...args));
            } else {
                this.on(event.name, (...args) => event.execute(this, ...args));
            }
        }
    }

    build() {
        this.login(Config.discord.token).catch(error => {
            switch (error.code) {
                case 502: {
                    this.log('ERROR', `Bad Gateway: ${JSON.stringify(error)}`, 'error');
                } break;

                case 503: {
                    this.log('ERROR', `Service Unavailable: ${JSON.stringify(error)}`, 'error');
                } break;

                default: {
                    this.log('ERROR', `${JSON.stringify(error)}`, 'error');
                } break;
            }
        });
    }

    log(title, text, level = 'info') {
        this.logger.log(title, text, level);
    }

    async setupGuild(guild) {
        require('../util/CreateInstanceFile')(this, guild);
        require('../util/CreateCredentialsFile')(this, guild);

        /* If maps/ directory does not exist, create it */
        if (!fs.existsSync(`${__dirname}/../resources/images/maps`)) {
            fs.mkdirSync(`${__dirname}/../resources/images/maps`);
        }

        await require('../discordTools/RegisterSlashCommands')(this, guild);

        let category = await require('../discordTools/SetupGuildCategory')(this, guild);
        await require('../discordTools/SetupGuildChannels')(this, guild, category);

        require('../util/FcmListener')(this, guild);
        await require('../discordTools/SetupSettingsMenu')(this, guild);
    }

    readInstanceFile(guildId) {
        return JSON.parse(fs.readFileSync(`${__dirname}/../../instances/${guildId}.json`, 'utf8'));
    }

    writeInstanceFile(guildId, instance) {
        fs.writeFileSync(`${__dirname}/../../instances/${guildId}.json`, JSON.stringify(instance, null, 2));
    }

    readCredentialsFile(guildId) {
        return JSON.parse(fs.readFileSync(`${__dirname}/../credentials/${guildId}.json`, 'utf8'));
    }

    writeCredentialsFile(guildId, credentials) {
        fs.writeFileSync(`${__dirname}/../credentials/${guildId}.json`, JSON.stringify(credentials, null, 2));
    }

    readNotificationSettingsTemplate() {
        return JSON.parse(fs.readFileSync(`${__dirname}/../templates/notificationSettingsTemplate.json`, 'utf8'));
    }

    readGeneralSettingsTemplate() {
        return JSON.parse(fs.readFileSync(`${__dirname}/../templates/generalSettingsTemplate.json`, 'utf8'));
    }

    createRustplusInstance(guildId, serverIp, appPort, steamId, playerToken) {
        let rustplus = new RustPlus(guildId, serverIp, appPort, steamId, playerToken);

        /* Add rustplus instance to Object */
        this.rustplusInstances[guildId] = rustplus;

        rustplus.build();

        return rustplus;
    }

    createRustplusInstancesFromConfig() {
        /* If instances/ directory does not exist, create it */
        if (!fs.existsSync(`${__dirname}/../../instances`)) {
            fs.mkdirSync(`${__dirname}/../../instances`);
        }

        let files = fs.readdirSync(`${__dirname}/../../instances`);

        files.forEach(file => {
            if (file.endsWith('.json')) {
                let guildId = file.replace('.json', '');
                let instance = this.readInstanceFile(guildId);

                for (const [key, value] of Object.entries(instance.serverList)) {
                    if (value.active) {
                        this.createRustplusInstance(
                            guildId,
                            value.serverIp,
                            value.appPort,
                            value.steamId,
                            value.playerToken);
                        break;
                    }
                }
            }
        });
    }

    findAvailableTrackerName(guildId) {
        let instance = this.readInstanceFile(guildId);
        let baseName = 'Tracker';

        let index = 0;
        while (true) {
            let testName = `${baseName}${(index === 0) ? '' : index}`;
            let exist = false;
            if (Object.keys(instance.trackers).includes(testName)) {
                exist = true;
            }

            if (exist) {
                index += 1;
                continue;
            }
            return testName;
        }
    }

    async interactionReply(interaction, content) {
        try {
            return await interaction.reply(content);
        }
        catch (e) {
            this.log('ERROR', `Interaction reply failed: ${e}`, 'error');
        }

        return undefined;
    }

    async interactionEditReply(interaction, content) {
        try {
            return await interaction.editReply(content);
        }
        catch (e) {
            this.log('ERROR', `Interaction edit reply failed: ${e}`, 'error');
        }

        return undefined;
    }

    async interactionUpdate(interaction, content) {
        try {
            return await interaction.update(content);
        }
        catch (e) {
            this.log('ERROR', `Interaction update failed: ${e}`, 'error');
        }

        return undefined;
    }

    async messageEdit(message, content) {
        try {
            return await message.edit(content);
        }
        catch (e) {
            this.log('ERROR', `Message edit failed: ${e}`, 'error');
        }

        return undefined;
    }

    async messageSend(channel, content) {
        try {
            return await channel.send(content);
        }
        catch (e) {
            this.log('ERROR', `Message send failed: ${e}`, 'error');
        }

        return undefined;
    }

    async validatePermissions(interaction) {
        let instance = this.readInstanceFile(interaction.guildId);

        /* If role isn't setup yet, validate as true */
        if (instance.role === null) return true;

        if (!interaction.member.permissions.has('ADMINISTRATOR') &&
            !interaction.member.roles.cache.has(instance.role)) {
            let role = DiscordTools.getRole(interaction.guildId, instance.role);
            let str = `You are not part of the '${role.name}' role, therefore you can't run bot commands.`;
            await this.interactionReply(interaction, {
                embeds: [new MessageEmbed()
                    .setColor('#ff0040')
                    .setDescription(`\`\`\`diff\n- ${str}\n\`\`\``)],
                ephemeral: true
            });

            this.log('WARNING', str);
            return false;
        }
        return true;
    }
}

module.exports = DiscordBot;
