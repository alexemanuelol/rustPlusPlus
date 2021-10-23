const Main = require('./../index.js');
const MapCalc = require('./../utils/mapCalculations.js');
const RustPlusTypes = require('../utils/rustplusTypes.js');
const Timer = require('../utils/timer.js');

const OIL_RIG_CHINOOK_47_MAX_DISTANCE = 550;

/* Locked crate is locked for 15 minutes */
const OIL_RIG_LOCKED_CRATE_UNLOCK_TIME_MIN = 15;
const OIL_RIG_LOCKED_CRATE_UNLOCK_TIME_MS = OIL_RIG_LOCKED_CRATE_UNLOCK_TIME_MIN * 60 * 1000;

var currentChinook47sId = [];
var lockedCrateSmallOilRigTimer = new Timer.timer(notifyLockedCrateSmallOpen, OIL_RIG_LOCKED_CRATE_UNLOCK_TIME_MS);
var lockedCrateLargeOilRigTimer = new Timer.timer(notifyLockedCrateLargeOpen, OIL_RIG_LOCKED_CRATE_UNLOCK_TIME_MS);

function notifyLockedCrateSmallOpen() {
    console.log('Locked Crate at Small Oil Rig has been unlocked');
    lockedCrateSmallOilRigTimer.stop();
}

function notifyLockedCrateLargeOpen() {
    console.log('Locked Crate at Large Oil Rig has been unlocked');
    lockedCrateLargeOilRigTimer.stop();
}

module.exports = {
    checkEvent: function (discord, rustplus, info, mapMarkers, teamInfo, time) {
        /* Check if a Chinook 47 have been detected near any of the oil rigs */
        module.exports.checkNewChinook47Detected(mapMarkers, info);

        /* Check to see if a Chinook 47 have disappeared from the map */
        module.exports.checkChinook47Left(mapMarkers);
    },

    checkNewChinook47Detected: function (mapMarkers, info) {
        for (let marker of mapMarkers.response.mapMarkers.markers) {
            if (marker.type === RustPlusTypes.MarkerType.Chinook47) {
                if (!currentChinook47sId.includes(marker.id)) {
                    currentChinook47sId.push(marker.id);

                    let smallX, smallY, largeX, largeY;
                    for (let monument of Main.mapMonuments) {
                        if (monument.token === 'oil_rig_small') {
                            smallX = monument.x; smallY = monument.y;
                        }
                        else if (monument.token === 'large_oil_rig') {
                            largeX = monument.x; largeY = monument.y;
                        }
                    }

                    if (MapCalc.getDistance(marker.x, marker.y, smallX, smallY) <=
                        OIL_RIG_CHINOOK_47_MAX_DISTANCE) {
                        /* Chinook 47 detected near Small Oil Rig */
                        console.log('Heavy Scientists got called to the Small Oil Rig');
                        lockedCrateSmallOilRigTimer.restart();
                    }
                    else if (MapCalc.getDistance(marker.x, marker.y, largeX, largeY) <=
                        OIL_RIG_CHINOOK_47_MAX_DISTANCE) {
                        /* Chinook 47 detected near Large Oil Rig */
                        console.log('Heavy Scientists got called to the Large Oil Rig');
                        lockedCrateLargeOilRigTimer.restart();
                    }
                    else {
                        let mapSize = info.response.info.mapSize;
                        let spawnLocation = MapCalc.getCoordinatesOrientation(marker.x, marker.y, mapSize);

                        /* Offset that is used to determine if coordinates is outside grid system */
                        let offset = 4 * MapCalc.gridDiameter;

                        /* If coordinates of the marker is located outside the grid system + the offset */
                        if (marker.x < -offset || marker.x > (mapSize + offset) ||
                            marker.y < -offset || marker.y > (mapSize + offset)) {
                            console.log(`Chinook 47 enters the map from ${spawnLocation} to drop off Locked Crate`);
                        }
                        else {
                            console.log(`Chinook 47 located at ${spawnLocation}`);
                        }
                    }
                }
            }
        }
    },

    checkChinook47Left: function (mapMarkers) {
        let tempArray = [];
        for (let id of currentChinook47sId) {
            for (let marker of mapMarkers.response.mapMarkers.markers) {
                if (marker.type === RustPlusTypes.MarkerType.Chinook47) {
                    if (marker.id === id) {
                        /* Chinook 47 marker is still visable on the map */
                        tempArray.push(id);
                        break;
                    }
                }
            }
        }
        currentChinook47sId = JSON.parse(JSON.stringify(tempArray));
    }
}

// TODO: Add discord notifications for the events