const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('./logger.js');

const dbPath = path.join(__dirname, '../data/economy.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        logger.error(`❌ SQLiteデータベースへの接続に失敗しました: ${err.message}`);
    } else {
        logger.info('✅ SQLiteデータベースに接続しました。');
    }
});

// 安全なシャットダウン処理
function closeDatabase() {
    db.close((err) => {
        if (err) {
            logger.error(`❌ SQLiteデータベースのクローズに失敗: ${err.message}`);
        } else {
            logger.info('🔒 SQLiteデータベースの接続を閉じました。');
        }
    });
}

// 終了シグナルにフック
process.on('exit', closeDatabase);
process.on('SIGINT', () => {
    closeDatabase();
    process.exit();
});
process.on('SIGTERM', () => {
    closeDatabase();
    process.exit();
});

module.exports = db;
