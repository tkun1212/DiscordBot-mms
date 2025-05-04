// src/commands/top.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// データベースのパス
const dbPath = path.join(__dirname, '../data/economy.db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('サーバー内の所持金ランキングを表示します'),

    /**
     * スラッシュコマンドの処理
     * @param {import('discord.js').ChatInputCommandInteraction} interaction
     */
    async executeSlash(interaction) {
        const userId = interaction.user.id;
        const db = new sqlite3.Database(dbPath);

        db.all("SELECT userId, balance FROM economy ORDER BY balance DESC", [], async (err, rows) => {
            if (err) {
                console.error(err);
                await interaction.reply({ content: 'ランキング取得中にエラーが発生しました。', ephemeral: true });
                return;
            }

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
        });

        db.close();
    }
};
