const logger = require('../utils/logger.js');
const commandArgs = require('../data/commandArgs.json');
const aliases = require('../data/commandAliases.json');
const path = require('path');
const fs = require('fs');

const prefix = '.';
const commandCache = new Map();

/**
 * コマンド名またはエイリアスから実際のコマンド名を解決する
 * @param {string} inputName
 * @returns {string}
 */
function resolveCommandName(inputName) {
    return Object.keys(aliases).find(cmd =>
        cmd === inputName || (Array.isArray(aliases[cmd]) && aliases[cmd].includes(inputName))
    ) || inputName;
}

/**
 * サブフォルダを含めてコマンドファイルを探索する
 * @param {string} baseDir
 * @param {string} commandName
 * @returns {string|null} コマンドファイルのパス
 */
function findCommandFile(baseDir, commandName) {
    const entries = fs.readdirSync(baseDir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(baseDir, entry.name);
        if (entry.isDirectory()) {
            const result = findCommandFile(fullPath, commandName);
            if (result) return result;
        } else if (entry.isFile() && entry.name === `${commandName}.js`) {
            return fullPath;
        }
    }
    return null;
}

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        if (!message.content.startsWith(prefix) || message.author.bot || !message.guild) return;

        /** 入力された引数
         * @type {string[]}
         */
        const inputArgs = message.content.slice(prefix.length).trim().split(/\s+/);
        /** コマンド名
         * @type {string}
         */
        const commandName = inputArgs.shift().toLowerCase();
        /** 実際のコマンド名
         * @type {string}
         * @description resolveCommandNameでエイリアスなどを解決されたコマンド名
         */
        const resolvedCommandName = resolveCommandName(commandName);

        if (!resolvedCommandName) {
            logger.warn(`Command not found or invalid alias: ${commandName}`);
            return;
        }

        /** コマンドのファイル */
        let command = commandCache.get(resolvedCommandName);

        if (!command) {
            try {
                const commandPath = findCommandFile(path.join(__dirname, '../commands'), resolvedCommandName);
                if (!commandPath) {
                    logger.warn(`Command module not found: ${resolvedCommandName}`);
                    return;
                }
                command = require(commandPath);
                commandCache.set(resolvedCommandName, command);
            } catch (err) {
                logger.warn(`Command module failed to load: ${resolvedCommandName}`, err);
                return;
            }
        }

        /*if (typeof command.executeMessage !== 'function') {
            logger.warn(`Command "${resolvedName}" does not export "executeMessage"`);
            return;
        }*/

        logger.info(`Command called: "${resolvedCommandName}" by ${message.author.tag} (ID: ${message.author.id})`);

        const args = (commandArgs[resolvedCommandName] || []).map(arg => {
            switch (arg) {
                case 'client': return client;
                case 'args': return inputArgs;
                default: return undefined;
            }
        });

        try {
            await command.executeMessage(message, ...args);
        } catch (error) {
            logger.error(`Error executing command "${resolvedCommandName}":`, error);
            try {
                await message.reply({
                    content: 'コマンド実行中にエラーが発生しました。Bot管理者に連絡してください。',
                });
            } catch (replyError) {
                logger.error('Error sending error message to user:', replyError);
            }
        }
    }
};
