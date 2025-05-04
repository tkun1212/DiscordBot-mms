const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economy = require('../../utils/economyManager.js');
const { MONEY_UNIT } = require('../../utils/economyManager.js');
const db = require('../../utils/database.js');
const logger = require('../../utils/logger.js');

const WORK_TABLE = 'work_log';
const WORK_COOLDOWN = 60 * 60 * 1000; // 1時間
const WORK_REWARD_MIN = 100;
const WORK_REWARD_MAX = 400;

initializeDatabase();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('1時間に1回だけ実行できる仕事コマンドです。報酬がもらえます。'),

    async execute(replyMethod, userId) {
        const now = Date.now();

        try {
            const lastWorkTime = await getLastWorkTime(userId);

            if (lastWorkTime && now - lastWorkTime < WORK_COOLDOWN) {
                const remainingMs = WORK_COOLDOWN - (now - lastWorkTime);
                const remainingMin = Math.floor(remainingMs / 1000 / 60);
                const remainingSec = Math.floor((remainingMs / 1000) % 60);

                const embed = new EmbedBuilder()
                    .setTitle('⏳ クールダウン中')
                    .setDescription(`あと **${remainingMin}分${remainingSec}秒** 待ってから再度お試しください。`)
                    .setColor(0xFFA500)
                    .setFooter({ text: `ユーザーID: ${userId}` })
                    .setTimestamp();

                return await replyMethod({ embeds: [embed] });
            }

            const reward = getRandomReward();
            await economy.addBalance(userId, reward);
            await upsertWorkLog(userId, now);

            logger.info(`Work command success for user ${userId}, reward: ${reward}`);

            const embed = new EmbedBuilder()
                .setTitle('💼 仕事完了！')
                .setDescription(`お疲れ様です！報酬として **${reward}${MONEY_UNIT}** を獲得しました！`)
                .setColor(0x00C853)
                .setFooter({ text: `ユーザーID: ${userId}` })
                .setTimestamp();

            return await replyMethod({ embeds: [embed] });
        } catch (err) {
            logger.error('Error in /work command:', err);

            const embed = new EmbedBuilder()
                .setTitle('⚠️ エラー発生')
                .setDescription(`コマンドの実行中にエラーが発生しました。`)
                .addFields({ name: '詳細', value: `\`${err.message}\`` })
                .setColor(0xFF0000)
                .setTimestamp();

            return await replyMethod({ embeds: [embed] });
        }
    },

    async executeSlash(interaction) {
        return this.execute((msg) => interaction.reply({ ...msg, ephemeral: true }), interaction.user.id);
    },

    async executeMessage(message) {
        return this.execute((msg) => message.reply(msg), message.author.id);
    }
};

// --- DB初期化 ---
function initializeDatabase() {
    const query = `
        CREATE TABLE IF NOT EXISTS ${WORK_TABLE} (
            userId TEXT PRIMARY KEY,
            lastWorkTime INTEGER
        )
    `;
    db.run(query, (err) => {
        if (err) {
            logger.error('Failed to initialize work_log table:', err);
        } else {
            logger.info('work_log table is ready.');
        }
    });
}

// --- ユーティリティ関数 ---
function getRandomReward() {
    return Math.floor(Math.random() * (WORK_REWARD_MAX - WORK_REWARD_MIN + 1)) + WORK_REWARD_MIN;
}

function getLastWorkTime(userId) {
    return new Promise((resolve, reject) => {
        const query = `SELECT lastWorkTime FROM ${WORK_TABLE} WHERE userId = ?`;
        db.get(query, [userId], (err, row) => {
            if (err) {
                logger.error('Database error in getLastWorkTime:', err);
                return reject(err);
            }
            resolve(row ? row.lastWorkTime : null);
        });
    });
}

function upsertWorkLog(userId, timestamp) {
    return new Promise((resolve, reject) => {
        const query = `
            INSERT INTO ${WORK_TABLE} (userId, lastWorkTime)
            VALUES (?, ?)
            ON CONFLICT(userId) DO UPDATE SET lastWorkTime = ?
        `;
        db.run(query, [userId, timestamp, timestamp], (err) => {
            if (err) {
                logger.error('Database error in upsertWorkLog:', err);
                return reject(err);
            }
            resolve();
        });
    });
}
