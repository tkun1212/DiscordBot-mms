const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dice')
        .setDescription('サイコロを振ります')
        .addIntegerOption(option =>
            option.setName('sides')
                .setDescription('サイコロの面数を指定します (2~1000)')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('count')
                .setDescription('サイコロの個数を指定します (1~100)')
                .setRequired(true)
        ),
    async execute(sidesInput, countInput, replyMethod) {
        const [sidesMin, sidesMax] = [2, 1000];
        const [countMin, countMax] = [1, 100];

        const sides = Math.max(sidesMin, Math.min(sidesInput, sidesMax));
        const count = Math.max(countMin, Math.min(countInput, countMax));

        function roll(diceSides) {
            return Math.floor(Math.random() * diceSides) + 1;
        }

        const result = Array.from({ length: count }, () => roll(sides));
        const total = result.reduce((sum, value) => sum + value, 0);

        if (count >= 15) {
            const resultChunks = [];
            for (let i = 0; i < result.length; i += 15) {
                resultChunks.push(result.slice(i, i + 15).join(', '));
            }

            await replyMethod({
                content: `🎲 サイコロの結果の合計は **${total}** です！\n詳細:\n${resultChunks.join('\n')}`
            });
        } else {
            await replyMethod({
                content: `🎲 サイコロの結果は\n${result.join(', ')}\n合計: **${total}**\nです！`
            });
        }
    },
    async executeSlash(interaction) {
        const sides = interaction.options.getInteger('sides');
        const count = interaction.options.getInteger('count');

        await this.execute(sides, count, (msg) => interaction.reply(msg));
    },
    async executeMessage(message, args) {
        const sides = parseInt(args[0]);
        const count = parseInt(args[1]);

        await this.execute(sides, count, (msg) => message.reply(msg));
    }
};
