const { promises: fs } = require('fs');
const path = require('path');
const winston = require('winston');

// ログファイルの格納ディレクトリ
const logsDir = path.join(__dirname, '../../logs');

// ログファイルのパス
const logFilePaths = {
    all: path.join(logsDir, 'all.log'),
    error: path.join(logsDir, 'error.log'),
    debug: path.join(logsDir, 'debug.log')
};

// 使用可能なログレベル
const validLevels = ['info', 'warn', 'error', 'debug'];

// winston ログフォーマットの共通化
const fileFormat = winston.format.combine(
    // タイムスタンプを日本時間に設定
    winston.format.timestamp({
        format: () => new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
    }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack }) => {
        const base = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        return stack ? `${base}\n${stack}` : base;
    })
);

// winston ロガー設定
const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.json(),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),
        new winston.transports.File({
            filename: logFilePaths.all,
            level: 'info',
            format: fileFormat
        }),
        new winston.transports.File({
            filename: logFilePaths.error,
            level: 'error',
            format: fileFormat
        }),
        new winston.transports.File({
            filename: logFilePaths.debug,
            level: 'debug',
            format: fileFormat
        })
    ]
});

// ログ出力処理
function log(level, message) {
    if (!validLevels.includes(level)) {
        console.warn(`⚠️ 無効なログレベル: "${level}"`);
        return;
    }

    const caller = getCallerInfo();
    const logMessage = `[${caller}] ${message}`;

    // ANSI エスケープコードを使ったコンソールカラー表示
    const colorMap = {
        info: '\x1b[34m',   // 青
        warn: '\x1b[33m',   // 黄
        error: '\x1b[31m',  // 赤
        debug: '\x1b[32m'   // 緑
    };

    // リセットコードを使って、色を元に戻す
    const resetColor = '\x1b[0m';
    
    console.log(`${colorMap[level] || '\x1b[37m'}[${level.toUpperCase()}] [${caller}] ${message}${resetColor}`);

    // winston ログ記録
    logger.log({ level, message: logMessage });
}

// 呼び出し元ファイルと行番号を取得
function getCallerInfo() {
    const stack = new Error().stack.split('\n');
    const callerLine = stack[3] || '';
    const match = callerLine.match(/\((.*?):(\d+):(\d+)\)/);
    if (match) {
        return `${path.basename(match[1])}:${match[2]}`;
    }
    return 'unknown';
}

// ログディレクトリの初期化（必要に応じて呼び出す）
async function ensureLogDirectory() {
    try {
        await fs.mkdir(logsDir, { recursive: true });
    } catch (err) {
        console.error('❌ ログディレクトリの作成に失敗しました:', err);
    }
}

// エクスポート
module.exports = {
    info: (msg) => log('info', msg),
    warn: (msg) => log('warn', msg),
    error: (msg) => log('error', msg),
    debug: (msg) => log('debug', msg),
    log: (level, msg) => log(level, msg),
    ensureLogDirectory
};
