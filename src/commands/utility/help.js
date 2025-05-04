const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger.js'); // ログを記録するために logger を使用

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('ヘルプを表示します。'),
    async execute(replyMethod) {
        const commandsPath = path.join(__dirname, './');
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('ヘルプ')
            .setDescription('以下のコマンドを使用できます。')
            .setTimestamp();

        // コマンドファイルごとにフィールドを追加
        for (const file of commandFiles) {
            try {
                const command = require(`./${file}`);
                embed.addFields({
                    name: `/${command.data.name}`,
                    value: command.data.description || '説明がありません。',
                });
            } catch (error) {
                // エラーをログに記録し、ユーザーには「読み込みに失敗しました」とだけ表示
                logger.error(`Error loading command from ${file}:`, error);
                embed.addFields({
                    name: `/${file}`,
                    value: 'コマンドの読み込みに失敗しました。',
                });
            }
        }

        await replyMethod({ embeds: [embed] });
    },

    // スラッシュコマンド用の実行
    async executeSlash(interaction) {
        await this.execute((msg) => interaction.reply(msg));
    },

    // メッセージコマンド用の実行
    async executeMessage(message) {
        await this.execute((msg) => message.reply(msg));
    }
};
