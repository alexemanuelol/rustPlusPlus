const fs = require('fs');

module.exports = (client, guild) => {
    /* If instances/ directory does not exist, create it */
    if (!fs.existsSync(`${__dirname}/../../instances`)) {
        fs.mkdirSync(`${__dirname}/../../instances`);
    }

    if (!fs.existsSync(`${__dirname}/../../instances/${guild.id}.json`)) {
        fs.writeFileSync(`${__dirname}/../../instances/${guild.id}.json`, JSON.stringify({
            firstTime: true,
            role: null,
            generalSettings: client.readGeneralSettingsTemplate(),
            notificationSettings: client.readNotificationSettingsTemplate(),
            channelId: {
                category: null,
                information: null,
                servers: null,
                settings: null,
                events: null,
                teamchat: null,
                switches: null,
                alarms: null,
                storageMonitors: null,
                activity: null,
                trackers: null
            },
            informationMessageId: {
                map: null,
                server: null,
                event: null,
                team: null
            },
            switches: {},
            alarms: {},
            storageMonitors: {},
            markers: {},
            serverList: {},
            trackers: {},
            marketSubscribeItemIds: []
        }, null, 2));
    }
    else {
        let inst = client.readInstanceFile(guild.id);

        if (!inst.hasOwnProperty('firstTime')) {
            inst.firstTime = true;
        }

        if (!inst.hasOwnProperty('role')) {
            inst.role = null;
        }

        if (!inst.hasOwnProperty('generalSettings')) {
            inst.generalSettings = client.readGeneralSettingsTemplate();
        }
        else {
            const generalSettings = client.readGeneralSettingsTemplate();

            for (const [key, value] of Object.entries(generalSettings)) {
                if (!inst.generalSettings.hasOwnProperty(key)) {
                    inst.generalSettings[key] = value;
                }
            }
        }

        if (!inst.hasOwnProperty('notificationSettings')) {
            inst.notificationSettings = client.readNotificationSettingsTemplate();
        }
        else {
            const notificationSettings = client.readNotificationSettingsTemplate();

            for (const [key, value] of Object.entries(notificationSettings)) {
                if (!inst.notificationSettings.hasOwnProperty(key)) {
                    inst.notificationSettings[key] = value;
                }
            }
        }

        if (!inst.hasOwnProperty('channelId')) {
            inst.channelId = {
                category: null,
                information: null,
                servers: null,
                settings: null,
                events: null,
                teamchat: null,
                switches: null,
                alarms: null,
                storageMonitors: null,
                activity: null,
                trackers: null
            }
        }
        else {
            if (!inst.channelId.hasOwnProperty('category')) inst.channelId.category = null;
            if (!inst.channelId.hasOwnProperty('information')) inst.channelId.information = null;
            if (!inst.channelId.hasOwnProperty('servers')) inst.channelId.servers = null;
            if (!inst.channelId.hasOwnProperty('settings')) inst.channelId.settings = null;
            if (!inst.channelId.hasOwnProperty('events')) inst.channelId.events = null;
            if (!inst.channelId.hasOwnProperty('teamchat')) inst.channelId.teamchat = null;
            if (!inst.channelId.hasOwnProperty('switches')) inst.channelId.switches = null;
            if (!inst.channelId.hasOwnProperty('alarms')) inst.channelId.alarms = null;
            if (!inst.channelId.hasOwnProperty('storageMonitors')) inst.channelId.storageMonitors = null;
            if (!inst.channelId.hasOwnProperty('activity')) inst.channelId.activity = null;
            if (!inst.channelId.hasOwnProperty('trackers')) inst.channelId.trackers = null;
        }

        if (!inst.hasOwnProperty('informationMessageId')) {
            inst.informationMessageId = {
                map: null,
                server: null,
                event: null,
                team: null
            }
        }
        else {
            if (!inst.informationMessageId.hasOwnProperty('map')) inst.informationMessageId.map = null;
            if (!inst.informationMessageId.hasOwnProperty('server')) inst.informationMessageId.server = null;
            if (!inst.informationMessageId.hasOwnProperty('event')) inst.informationMessageId.event = null;
            if (!inst.informationMessageId.hasOwnProperty('team')) inst.informationMessageId.team = null;
        }

        if (!inst.hasOwnProperty('switches')) inst.switches = {};
        if (!inst.hasOwnProperty('alarms')) inst.alarms = {};
        if (!inst.hasOwnProperty('storageMonitors')) inst.storageMonitors = {};
        if (!inst.hasOwnProperty('markers')) inst.markers = {};
        if (!inst.hasOwnProperty('serverList')) inst.serverList = {};
        if (!inst.hasOwnProperty('trackers')) inst.trackers = {};
        if (!inst.hasOwnProperty('marketSubscribeItemIds')) inst.marketSubscribeItemIds = [];

        client.writeInstanceFile(guild.id, inst);
    }
};
