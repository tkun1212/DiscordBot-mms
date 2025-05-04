const { MessageFlags } = require('discord.js');
const logger = require('../utils/logger.js');
const commandArgs = require('../data/commandArgs.json');
const path = require('path');
const fs = require('fs');

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
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (!interaction.isCommand()) return;

        const { commandName, user } = interaction;

        let command;
        try {
            const commandPath = findCommandFile(path.join(__dirname, '../commands'), commandName);
            if (!commandPath) {
                logger.warn(`Command module not found: ${commandName}`);
                return;
            }
            command = require(commandPath);
        } catch (err) {
            logger.warn(`Command module failed to load: ${commandName}`, err);
            return;
        }

        if (typeof command.executeSlash !== 'function') {
            logger.warn(`Command "${commandName}" does not export "executeSlash"`);
            return;
        }

        logger.info(`Command called: "${commandName}" by ${user.tag} (ID: ${user.id})`);

        const args = (commandArgs[commandName] || []).map(arg => {
            if (arg === 'client') return client;
            return undefined;
        });

        try {
            await command.executeSlash(interaction, ...args);
        } catch (error) {
            logger.error(`Error executing slash command "${commandName}":`, error);

            const errorMessage = 'コマンド実行中にエラーが発生しました。Bot管理者に連絡してください。';
            const shouldFollowUp = interaction.replied || interaction.deferred;

            try {
                await interaction[shouldFollowUp ? 'followUp' : 'reply']({
                    content: errorMessage,
                    flags: MessageFlags.Ephemeral
                });
            } catch (replyError) {
                logger.error('Error sending error response to user:', replyError);
            }
        }
    }
};
