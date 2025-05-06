const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('コインを投げて表か裏をランダムに表示します。'),

    async executeSlash(interaction) {
        const result = Math.random() < 0.5 ? '表 (Heads)' : '裏 (Tails)';
        await interaction.reply(`🪙 コイントスの結果: **${result}**`);
    }
};
