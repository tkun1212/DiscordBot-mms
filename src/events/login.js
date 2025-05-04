// src/events/loginStreak.js
const db = require('../utils/database.js');
const logger = require('../utils/logger.js');
const { EmbedBuilder } = require('discord.js');

const LOGIN_TABLE = 'login_streaks';

function formatDate(date) {
    const japanTime = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    return japanTime.toISOString().split('T')[0]; // YYYY-MM-DD
}

module.exports = {
    name: 'messageCreate',

    async execute(message) {
        if (message.author.bot) return;

        const userId = message.author.id;
        const todayStr = formatDate(new Date());

        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS ${LOGIN_TABLE} (
                userId TEXT PRIMARY KEY,
                lastLogin TEXT,
                streak INTEGER
            )
        `;

        db.run(createTableQuery, (tableErr) => {
            if (tableErr) {
                return logger.error('LoginStreak テーブル作成エラー:', tableErr);
            }

            const selectQuery = `SELECT lastLogin, streak FROM ${LOGIN_TABLE} WHERE userId = ?`;
            db.get(selectQuery, [userId], (err, row) => {
                if (err) {
                    return logger.error('LoginStreak DB 読み込みエラー:', err);
                }

                const lastLoginStr = row?.lastLogin || null;
                if (lastLoginStr === todayStr) return;

                let newStreak = 1;

                if (lastLoginStr) {
                    const lastDate = new Date(lastLoginStr);
                    const diffDays = Math.floor((new Date(todayStr) - lastDate) / (1000 * 60 * 60 * 24));
                    newStreak = diffDays === 1 ? row.streak + 1 : 1;
                }

                const upsertQuery = `
                    INSERT INTO ${LOGIN_TABLE} (userId, lastLogin, streak)
                    VALUES (?, ?, ?)
                    ON CONFLICT(userId) DO UPDATE SET lastLogin = excluded.lastLogin, streak = excluded.streak
                `;
                db.run(upsertQuery, [userId, todayStr, newStreak], async (updateErr) => {
                    if (updateErr) {
                        return logger.error('LoginStreak 更新エラー:', updateErr);
                    }

                    const embed = new EmbedBuilder()
                        .setTitle('📅 ログイン記録更新')
                        .setDescription(`**${message.author.tag}** がログインしました！`)
                        .addFields(
                            { name: 'ユーザーID', value: userId, inline: true },
                            { name: '連続ログイン日数', value: `${newStreak} 日`, inline: true },
                        )
                        .setColor(0x00BFFF)
                        .setTimestamp();

                    logger.info(`✅ ${message.author.tag} のログイン記録を更新: ${newStreak}日目`);

                    try {
                        const sentMsg = await message.channel.send({ embeds: [embed] });
                        await sentMsg.react('🗑️');
                    } catch (e) {
                        logger.warn('ログイン通知送信エラー:', e);
                    }
                });
            });
        });
    }
};
