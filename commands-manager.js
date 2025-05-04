// commands-manager.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const logger = require('./src/utils/logger.js');

const { TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
    logger.error('TOKEN, CLIENT_ID, GUILD_ID のいずれかが未設定です。`.env` を確認してください。');
    process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

/**
 * 再帰的にコマンドファイルを読み込み、JSON形式で返す
 * @returns {Array} JSON形式のコマンド配列
 */
function loadCommands() {
    const commands = [];
    const commandsPath = path.join(__dirname, 'src', 'commands');

    function walkSync(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walkSync(fullPath); // サブフォルダを再帰的に探索
            } else if (entry.isFile() && fullPath.endsWith('.js')) {
                try {
                    const command = require(fullPath);
                    if ('data' in command && typeof command.data.toJSON === 'function') {
                        commands.push(command.data.toJSON());
                    } else {
                        logger.warn(`${fullPath} は 'data' プロパティを持っていません。`);
                    }
                } catch (err) {
                    logger.error(`${fullPath} の読み込み中にエラーが発生しました:`, err);
                }
            }
        }
    }

    walkSync(commandsPath);
    return commands;
}

/**
 * コマンド登録または削除の共通処理
 * @param {string} route - "guild" または "global"
 * @param {Array} commands - コマンドデータ
 * @param {boolean} isDelete - 削除かどうか
 */
async function handleCommandAction(route, commands, isDelete = false) {
    try {
        const body = isDelete ? [] : commands;
        const url = route === 'guild'
            ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
            : Routes.applicationCommands(CLIENT_ID);

        await rest.put(url, { body });
        const action = isDelete ? '削除' : '登録';
        logger.info(`✅ ${route.charAt(0).toUpperCase() + route.slice(1)} コマンドを${action}しました。`, {
            route,
            action,
            commands: isDelete ? [] : commands.map(c => c.name)
        });
    } catch (error) {
        logger.error(`❌ ${route} コマンドの${isDelete ? '削除' : '登録'}に失敗: ${error.message}`, {
            stack: error.stack,
            status: error.status,
            response: error.response?.data || 'No response data',
            url: error.response?.config?.url || 'No URL'
        });
    }
}

/**
 * CLI 実行用処理
 */
if (require.main === module) {
    const actionMap = {
        'deploy:guild': () => handleCommandAction('guild', loadCommands()),
        'deploy:global': () => handleCommandAction('global', loadCommands()),
        'delete:guild': () => handleCommandAction('guild', loadCommands(), true),
        'delete:global': () => handleCommandAction('global', loadCommands(), true)
    };

    const action = process.argv[2];

    if (actionMap[action]) {
        actionMap[action]().catch(err => logger.error(err));
    } else {
        console.log('Usage: node commands-manager.js <action>');
        console.log('Actions:');
        Object.keys(actionMap).forEach(key => console.log(`  ${key}`));
    }
}

module.exports = {
    deployGuildCommands: () => handleCommandAction('guild', loadCommands()),
    deployGlobalCommands: () => handleCommandAction('global', loadCommands()),
    deleteGuildCommands: () => handleCommandAction('guild', loadCommands(), true),
    deleteGlobalCommands: () => handleCommandAction('global', loadCommands(), true)
};