// src/commands/top.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../utils/database.js');
const logger = require('../../utils/logger.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('サーバー内の所持金ランキングを表示します'),

    async executeSlash(interaction) {
        const userId = interaction.user.id;

        try {
            const rows = await new Promise((resolve, reject) => {
                db.all("SELECT userId, balance FROM economy ORDER BY balance DESC", [], (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows);
                });
            });

            // ランキング上位5名
            const topList = rows.slice(0, 5);
            const userIndex = rows.findIndex(row => row.userId === userId);

            const embed = new EmbedBuilder()
                .setTitle('🏆 所持金ランキング TOP 5')
                .setColor(0xFFD700) // ゴールド色
                .setTimestamp()
                .setFooter({ text: `実行者: ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

            for (let i = 0; i < topList.length; i++) {
                const row = topList[i];
                const user = await interaction.client.users.fetch(row.userId).catch(() => null);
                const name = user ? user.username : `不明なユーザー(${row.userId})`;
                embed.addFields({
                    name: `#${i + 1} ${name}`,
                    value: `💰 ${row.balance.toLocaleString()}M`,
                    inline: false
                });
            }

            // ランキングに自分がいない場合、自分の順位を下部に表示
            if (userIndex >= 5) {
                const userRow = rows[userIndex];
                embed.addFields({
                    name: `🔽 あなたの順位: #${userIndex + 1}`,
                    value: `💰 ${userRow.balance.toLocaleString()}M`,
                    inline: false
                });
            }

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            logger.error('リーダーボード取得中にエラーが発生しました:', error);
            await interaction.reply({ content: 'ランキング取得中にエラーが発生しました。', ephemeral: true });
        }
    }
};
