module.exports = {
    "general": {
        "pollingIntervalMs": process.env.POLLING_INTERVAL || 10000,
        "showCallStackError": process.env.LOG_CALL_STACK || false
    },
    "discord": {
        "clientId": process.env.DISCORD_CLIENT_ID || "",
        "token": process.env.DISCORD_TOKEN || ""
    }
};