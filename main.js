// main.js
const { Status } = require('discord.js');
const inquirer = require('inquirer');
const {
    startClient,
    stopClient,
    getClient,
    isClientConnected
} = require('./src/index.js');
const {
    deployGuildCommands,
    deployGlobalCommands,
    deleteGuildCommands,
    deleteGlobalCommands
} = require('./commands-manager.js');

let isRunning = true;

const MAIN_MENU_CHOICES = [
    'help',
    'start',
    'stop',
    'status',
    'manage-commands',
    'exit'
];

const MANAGE_COMMAND_CHOICES = [
    { name: 'Guild: Deploy', value: 'guild:deploy' },
    { name: 'Guild: Delete', value: 'guild:delete' },
    { name: 'Global: Deploy', value: 'global:deploy' },
    { name: 'Global: Delete', value: 'global:delete' }
];

// メインループ
async function runCli() {
    while (isRunning) {
        try {
            const { command } = await inquirer.prompt([{
                type: 'list',
                name: 'command',
                message: '実行したいコマンドを選択してください:',
                choices: MAIN_MENU_CHOICES
            }]);

            await handleCommand(command);
            console.log('\n--- コマンド完了 ---\n');
        } catch (error) {
            console.error('❌ コマンド処理中にエラー:', error.message);
        }
    }
}

// コマンド処理
async function handleCommand(command) {
    switch (command) {
        case 'help':
            showHelp();
            break;
        case 'start':
            await handleStart();
            break;
        case 'stop':
            await handleStop();
            break;
        case 'status':
            showStatus();
            break;
        case 'manage-commands':
            await handleManageCommands();
            break;
        case 'exit':
            await handleExit();
            break;
        default:
            console.log(`⚠️ 未知のコマンドです: ${command}`);
            break;
    }
}

// ヘルプ表示
function showHelp() {
    console.log(`
利用可能なコマンド一覧:
  help             - このヘルプを表示
  start            - Bot を起動
  stop             - Bot を停止
  status           - Bot の状態を表示
  manage-commands  - スラッシュコマンド管理
  exit             - CLI を終了
    `);
}

// Bot 起動処理
async function handleStart() {
    if (isClientConnected()) {
        console.log('⚠️ Bot は既に起動しています。');
        return;
    }
    await startClient();
    console.log('✅ Bot を起動しました。');
}

// Bot 停止処理
async function handleStop() {
    if (!isClientConnected()) {
        console.log('⚠️ Bot はまだ起動していません。');
        return;
    }
    await stopClient();
    console.log('🛑 Bot を停止しました。');
}

// 状態表示処理
function showStatus() {
    try {
        const client = getClient();

        if (isClientConnected()) {
            console.log(`✅ Bot は起動中: ${client.user.tag}`);
            console.log(`Status : ${Status[client.ws.status]?.toLowerCase() ?? 'unknown'}`);
            console.log(`Ping   : ${client.ws.ping}ms`);
            console.log(`Uptime : ${formatTime(client.uptime)}`);
        } else {
            console.log('🛑 Bot は起動していません。');
        }
    } catch (error) {
        console.error('❌ ステータス取得エラー:', error.message);
    }
}

// ミリ秒を hh:mm:ss.fff に変換
function formatTime(ms) {
    const hh = String(Math.floor(ms / 3600000)).padStart(2, '0');
    const mm = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
    const ss = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
    const fff = String(ms % 1000).padStart(3, '0');
    return `${hh}:${mm}:${ss}.${fff}`;
}

// スラッシュコマンド管理
async function handleManageCommands() {
    try {
        const { type } = await inquirer.prompt([{
            type: 'list',
            name: 'type',
            message: 'どの操作を実行しますか？',
            choices: MANAGE_COMMAND_CHOICES
        }]);

        const actions = {
            'guild:deploy': deployGuildCommands,
            'guild:delete': deleteGuildCommands,
            'global:deploy': deployGlobalCommands,
            'global:delete': deleteGlobalCommands
        };

        const action = actions[type];
        if (action) {
            await action();
            console.log(`✅ ${type} を実行しました。`);
        } else {
            console.log(`⚠️ 未知の操作です: ${type}`);
        }
    } catch (error) {
        console.error('❌ コマンド管理中にエラー:', error.message);
    }
}

// CLI 終了処理
async function handleExit() {
    try {
        if (isClientConnected()) {
            const { exitOption } = await inquirer.prompt([{
                type: 'list',
                name: 'exitOption',
                message: 'Bot が起動中です。どのように終了しますか？',
                choices: ['Stop + Exit', 'Yes (強制終了)', 'No']
            }]);

            if (exitOption === 'Stop + Exit') {
                await stopClient();
                console.log('🛑 Bot を停止しました。');
                shutdown();
            } else if (exitOption === 'Yes (強制終了)') {
                shutdown();
            }
            // 'No' の場合は何もしない
        } else {
            shutdown();
        }
    } catch (error) {
        console.error('❌ 終了処理中にエラー:', error.message);
    }
}

// プロセス終了
function shutdown() {
    console.log('👋 CLI を終了します。');
    isRunning = false;
    process.exit(0);
}

// Ctrl+C ハンドリング
process.on('SIGINT', async () => {
    console.log('\n Ctrl+C を検出しました。');
    if (isClientConnected()) {
        await stopClient();
        console.log('🛑 Bot を安全に停止しました。');
    }
    process.exit(0);
});

// 起動
runCli();
