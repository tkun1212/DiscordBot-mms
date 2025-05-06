// src/index.js
require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger.js');

let client = null;

function registerEventHandlers(client) {
    const eventsPath = path.join(__dirname, 'events');

    if (!fs.existsSync(eventsPath)) {
        logger.warn('⚠️ events ディレクトリが見つかりません。');
        return;
    }

    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
        const event = require(path.join(eventsPath, file));
        const handler = (...args) => event.execute(...args, client);

        if (event.once) {
            client.once(event.name, handler);
        } else {
            client.on(event.name, handler);
        }
    }

    logger.info(`📦 ${eventFiles.length} 件のイベントを読み込みました。`);
}

async function startClient() {
    if (client) {
        logger.warn('⚠️ Bot はすでに起動しています。');
        return client;
    }

    const token = process.env.TOKEN;
    if (!token) {
        logger.error('❌ TOKEN が .env に設定されていません。');
        process.exit(1);
    }

    client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildVoiceStates,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildMessageReactions
        ],
        partials: [
            Partials.Message,
            Partials.Channel,
            Partials.Reaction
        ]
    });

    try {
        registerEventHandlers(client);
        await client.login(token);
        logger.info(`✅ Bot にログインしました: ${client.user?.tag ?? '(不明なユーザー)'}`);
        return client;
    } catch (error) {
        logger.error('❌ Bot 起動時にエラーが発生しました:', error.message);
        client = null;
        return null; // プロセスを落とさない
    }
}

async function stopClient() {
    if (!client) {
        logger.warn('⚠️ Bot はまだ起動していません。');
        return;
    }

    try {
        await client.destroy();
        logger.info('🛑 Bot を停止しました。');
    } catch (error) {
        logger.error('❌ Bot 停止時にエラーが発生しました:', error.message);
    } finally {
        client = null;
    }
}

function getClient() {
    return client;
}

function isClientConnected() {
    return client !== null && client.isReady();
}

module.exports = {
    startClient,
    stopClient,
    getClient,
    isClientConnected
};
