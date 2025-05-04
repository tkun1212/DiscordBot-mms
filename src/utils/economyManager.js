const db = require('./database.js');
const logger = require('./logger.js');
const { promisify } = require('util');

const runAsync = promisify(db.run.bind(db));
const getAsync = promisify(db.get.bind(db));
const serializeAsync = (fn) => new Promise(resolve => db.serialize(() => fn(resolve)));

const TABLE_NAME = 'economy';
const MONEY_UNIT = 'M';
const MESSAGE_REWARD = 10;
const OMIKUJI_TABLE = 'omikuji_results';

class EconomyManager {
    constructor() {
        this.initializeTables();
    }

    initializeTables() {
        const query = `CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            userId TEXT PRIMARY KEY,
            balance INTEGER DEFAULT 0
        )`;

        db.run(query, (err) => {
            if (err) {
                logger.error(`経済テーブルの初期化に失敗: ${err.message}`);
            }
        });

        const omikujiQuery = `
            CREATE TABLE IF NOT EXISTS ${OMIKUJI_TABLE} (
                userId TEXT,
                date TEXT,
                result TEXT,
                PRIMARY KEY (userId, date)
            )
        `;
        db.run(omikujiQuery, (err) => {
            if (err) {
                logger.error(`おみくじテーブルの初期化に失敗: ${err.message}`);
            }
        });
    }

    async getBalance(userId) {
        try {
            const row = await getAsync(`SELECT balance FROM ${TABLE_NAME} WHERE userId = ?`, [userId]);
            return row ? row.balance : 0;
        } catch (err) {
            logger.error(`残高取得エラー: ${err.message}`);
            throw err;
        }
    }

    async addBalance(userId, amount) {
        if (!Number.isInteger(amount) || amount < 0) {
            throw new Error('金額は0以上の整数である必要があります。');
        }
        return serializeAsync(async (resolve) => {
            try {
                await runAsync('BEGIN IMMEDIATE');
                const query = `
                    INSERT INTO ${TABLE_NAME} (userId, balance)
                    VALUES (?, ?)
                    ON CONFLICT(userId) DO UPDATE SET balance = balance + ?
                `;
                await runAsync(query, [userId, amount, amount]);
                await runAsync('COMMIT');
                resolve();
            } catch (err) {
                await runAsync('ROLLBACK');
                logger.error(`addBalance 失敗: ${err.message}`);
                throw err;
            }
        });
    }

    async subtractBalance(userId, amount) {
        if (!Number.isInteger(amount) || amount < 0) {
            throw new Error('金額は0以上の整数である必要があります。');
        }
        const balance = await this.getBalance(userId);
        if (balance < amount) {
            throw new Error('残高が不足しています。');
        }
        return serializeAsync(async (resolve) => {
            try {
                await runAsync('BEGIN IMMEDIATE');
                const query = `UPDATE ${TABLE_NAME} SET balance = balance - ? WHERE userId = ?`;
                await runAsync(query, [amount, userId]);
                await runAsync('COMMIT');
                resolve();
            } catch (err) {
                await runAsync('ROLLBACK');
                logger.error(`subtractBalance 失敗: ${err.message}`);
                throw err;
            }
        });
    }

    async transfer(senderId, receiverId, amount) {
        if (!Number.isInteger(amount) || amount <= 0) {
            throw new Error('不正な金額です。');
        }
        if (senderId === receiverId) {
            throw new Error('自分自身に送金はできません。');
        }
        await this.subtractBalance(senderId, amount);
        await this.addBalance(receiverId, amount);
    }

    rewardForMessage(userId) {
        return this.addBalance(userId, MESSAGE_REWARD);
    }

    async getOmikujiResult(userId, date) {
        try {
            const row = await getAsync(`SELECT result FROM ${OMIKUJI_TABLE} WHERE userId = ? AND date = ?`, [userId, date]);
            return row ? JSON.parse(row.result) : null;
        } catch (err) {
            logger.error(`おみくじ結果取得エラー: ${err.message}`);
            throw err;
        }
    }

    async saveOmikujiResult(userId, date, result) {
        try {
            const resultString = JSON.stringify(result);
            const query = `
                INSERT INTO ${OMIKUJI_TABLE} (userId, date, result)
                VALUES (?, ?, ?)
                ON CONFLICT(userId, date) DO UPDATE SET result = excluded.result
            `;
            await runAsync(query, [userId, date, resultString]);
        } catch (err) {
            logger.error(`おみくじ結果保存エラー: ${err.message}`);
            throw err;
        }
    }
}

module.exports = new EconomyManager();
module.exports.MONEY_UNIT = MONEY_UNIT;
