const Timer = require('../util/timer');
const StringSimilarity = require('../util/stringSimilarity.js');

module.exports = {
    inGameCommandHandler: function (rustplus, client, message) {
        let command = message.broadcast.teamMessage.message.message;

        if (command === `${rustplus.generalSettings.prefix}bradley`) {
            module.exports.commandBradley(rustplus);
        }
        else if (command === `${rustplus.generalSettings.prefix}cargo`) {
            module.exports.commandCargo(rustplus);
        }
        else if (command.startsWith(`${rustplus.generalSettings.prefix}leader`)) {
            module.exports.commandLeader(rustplus, message);
        }
        else if (command === `${rustplus.generalSettings.prefix}pop`) {
            module.exports.commandPop(rustplus);
        }
        else if (command === `${rustplus.generalSettings.prefix}time`) {
            module.exports.commandTime(rustplus, client);
        }
        else if (command.startsWith(`${rustplus.generalSettings.prefix}timer `)) {
            module.exports.commandTimer(rustplus, command);
        }
        else if (command === `${rustplus.generalSettings.prefix}wipe`) {
            module.exports.commandWipe(rustplus);
        }
    },

    commandBradley: function (rustplus) {
        let strings = [];

        let timerCounter = 0;
        for (const [id, timer] of Object.entries(rustplus.bradleyRespawnTimers)) {
            timerCounter += 1;
            let time = rustplus.getTimeLeftOfTimer(timer);

            if (time !== null) {
                strings.push(`Approximately ${time} before Bradley APC respawns.`);
            }
        }

        if (timerCounter === 0) {
            if (rustplus.timeSinceBradleyWasDestroyed === null) {
                strings.push('Bradley APC is probably roaming around at Launch Site.');
            }
            else {
                let secondsSince = (new Date() - rustplus.timeSinceBradleyWasDestroyed) / 1000;
                let timeSince = Timer.secondsToFullScale(secondsSince);
                strings.push(`It was ${timeSince} since Bradley APC last got destroyed.`)
            }
        }

        for (let str of strings) {
            rustplus.sendTeamMessage(str);
            rustplus.log(str);
        }
    },

    commandCargo: function (rustplus) {
        let strings = [];
        let unhandled = Object.keys(rustplus.activeCargoShips);
        let numOfShips = unhandled.length;

        for (const [id, timer] of Object.entries(rustplus.cargoShipEgressTimers)) {
            unhandled = unhandled.filter(e => e != parseInt(id));
            let time = rustplus.getTimeLeftOfTimer(timer);
            let pos = rustplus.activeCargoShips[parseInt(id)].location;

            if (time !== null) {
                strings.push(`Approximately ${time} before Cargo Ship at ${pos} enters egress stage.`);
            }
        }

        if (unhandled !== []) {
            for (let cargoShip of unhandled) {
                let pos = rustplus.activeCargoShips[cargoShip].location;
                strings.push(`Cargo Ship is located at ${pos}.`);
            }
        }

        if (numOfShips === 0) {
            if (rustplus.timeSinceCargoWasOut === null) {
                strings.push('Cargo Ship is currently not on the map.');
            }
            else {
                let secondsSince = (new Date() - rustplus.timeSinceCargoWasOut) / 1000;
                let timeSince = Timer.secondsToFullScale(secondsSince);
                strings.push(`It was ${timeSince} since the last Cargo Ship left.`)
            }
        }

        for (let str of strings) {
            rustplus.sendTeamMessage(str);
            rustplus.log(str);
        }
    },

    commandLeader: function (rustplus, message) {
        let command = message.broadcast.teamMessage.message.message;
        let callerId = message.broadcast.teamMessage.message.steamId;
        let callerName = message.broadcast.teamMessage.message.name;

        rustplus.getTeamInfo((msg) => {
            if (msg.response.hasOwnProperty('teamInfo')) {
                if (command === `${rustplus.generalSettings.prefix}leader`) {
                    promoteToLeader(rustplus, callerId).then((result) => {
                        rustplus.log(`Team Leadership was transferred to ${callerName}:${callerId}.`);
                    }).catch((error) => {
                        rustplus.log(JSON.stringify(error));
                    });
                }
                else {
                    let name = command.replace(`${rustplus.generalSettings.prefix}leader `, '');

                    /* Look if the value provided is a steamId */
                    for (let member of msg.response.teamInfo.members) {
                        if (name == member.steamId) {
                            promoteToLeader(rustplus, member.steamId).then((result) => {
                                rustplus.log(`Team Leadership was transferred to ${member.name}:${name}.`);
                            }).catch((error) => {
                                rustplus.log(JSON.stringify(error));
                            });
                            return;
                        }
                    }

                    /* Find the closest name */
                    for (let member of msg.response.teamInfo.members) {
                        if (StringSimilarity.similarity(name, member.name) >= 0.9) {
                            promoteToLeader(rustplus, member.steamId).then((result) => {
                                rustplus.log(`Team Leadership was transferred to ${name}:` +
                                    `${member.steamId}.`);
                            }).catch((error) => {
                                rustplus.log(JSON.stringify(error));
                            });
                            return;
                        }
                    }
                }
            }
        });
    },

    commandPop: function (rustplus) {
        rustplus.getInfo((msg) => {
            if (msg.response.hasOwnProperty('info')) {
                const now = msg.response.info.players;
                const max = msg.response.info.maxPlayers;
                const queue = msg.response.info.queuedPlayers;

                let str = `Population: (${now}/${max}) players`;

                if (queue !== 0) {
                    str += ` and ${queue} players in queue.`;
                }

                rustplus.sendTeamMessage(str);
                rustplus.log(str);
            }
        });
    },

    commandTime: function (rustplus, client) {
        rustplus.getTime((msg) => {
            if (msg.response.hasOwnProperty('time')) {
                const rawTime = parseFloat(msg.response.time.time.toFixed(2));
                const sunrise = parseFloat(msg.response.time.sunrise.toFixed(2));
                const sunset = parseFloat(msg.response.time.sunset.toFixed(2));
                const time = Timer.convertToHoursMinutes(msg.response.time.time);
                let str = `In-Game time: ${time}.`;

                let instance = client.readInstanceFile(rustplus.guildId);
                let server = `${rustplus.server}-${rustplus.port}`;

                if (instance.serverList[server].timeTillDay !== null &&
                    instance.serverList[server].timeTillNight !== null) {
                    if (rawTime >= sunrise && rawTime < sunset) {
                        /* It's Day */
                        let closestTime = getValueOfClosestInObject(rawTime, instance.serverList[server].timeTillNight);
                        let timeLeft = Timer.secondsToFullScale(closestTime);

                        str += ` Approximately ${timeLeft} before nightfall.`;
                    }
                    else {
                        /* It's Night */
                        let closestTime = getValueOfClosestInObject(rawTime, instance.serverList[server].timeTillDay);
                        let timeLeft = Timer.secondsToFullScale(closestTime);

                        str += ` Approximately ${timeLeft} before daybreak.`;
                    }
                }

                rustplus.sendTeamMessage(str);
                rustplus.log(str);
            }
        });
    },

    commandTimer: function (rustplus, command) {
        if (!command.startsWith('!timer ')) {
            return;
        }

        command = command.replace('!timer ', '');
        let subcommand = command.replace(/ .*/, '');
        command = command.slice(subcommand.length + 1);

        if (subcommand !== 'remain' && command === '') {
            return;
        }

        let id;
        switch (subcommand) {
            case 'add':
                let time = command.replace(/ .*/, '');
                let timeSeconds = Timer.getSecondsFromStringTime(time);
                if (timeSeconds === null) {
                    return;
                }

                id = 0;
                while (Object.keys(rustplus.timers).map(Number).includes(id)) {
                    id += 1;
                }

                let message = command.slice(time.length + 1);
                if (message === "") {
                    return;
                }

                rustplus.timers[id] = {
                    timer: new Timer.timer(
                        () => {
                            rustplus.sendTeamMessage(`Timer: ${message}`);
                            rustplus.log(`Timer: ${message}`);
                            delete rustplus.timers[id]
                        },
                        timeSeconds * 1000),
                    message: message
                };
                rustplus.timers[id].timer.start();

                rustplus.sendTeamMessage(`Timer set for ${time}.`);
                rustplus.log(`Timer set for ${time}.`);
                break;

            case 'remove':
                id = parseInt(command.replace(/ .*/, ''));
                if (id === 'NaN') {
                    return;
                }

                if (!Object.keys(rustplus.timers).map(Number).includes(id)) {
                    return;
                }

                rustplus.timers[id].timer.stop();
                delete rustplus.timers[id];

                rustplus.sendTeamMessage(`Timer with ID: ${id} was removed.`);
                rustplus.log(`Timer with ID: ${id} was removed.`);

                break;

            case 'remain':
                if (Object.keys(rustplus.timers).length === 0) {
                    rustplus.sendTeamMessage('No active timers.');
                    rustplus.log('No active timers');
                }
                else {
                    rustplus.sendTeamMessage('Active timers:');
                    rustplus.log('Active timers:');
                }
                for (const [id, content] of Object.entries(rustplus.timers)) {
                    let timeLeft = rustplus.getTimeLeftOfTimer(content.timer);
                    let str = `- ID: ${parseInt(id)}, Time left: ${timeLeft}, Message: ${content.message}`;
                    rustplus.sendTeamMessage(str);
                    rustplus.log(str);
                }
                break;

            default:
                break;
        }
    },

    commandWipe: function (rustplus) {
        rustplus.getInfo((msg) => {
            if (msg.response.hasOwnProperty('info')) {
                const wipe = new Date(msg.response.info.wipeTime * 1000);
                const now = new Date();

                const sinceWipe = Timer.secondsToFullScale((now - wipe) / 1000);

                let str = `${sinceWipe} since wipe.`;

                rustplus.sendTeamMessage(str);
                rustplus.log(str);
            }
        });
    },
};

function promoteToLeader(rustplus, steamId) {
    return rustplus.sendRequestAsync({
        promoteToLeader: {
            steamId: steamId
        },
    }, 2000);
}

function getValueOfClosestInObject(time, object) {
    let distance = 24;
    let closestTime = 0;

    for (const [id, value] of Object.entries(object)) {
        if (parseFloat(id) < time) {
            if ((time - parseFloat(id)) < distance) {
                distance = time - parseFloat(id);
                closestTime = value;
            }
        }
        else {
            if ((parseFloat(id) - time) < distance) {
                distance = parseFloat(id) - time;
                closestTime = value;
            }
        }
    }

    return closestTime;
}
