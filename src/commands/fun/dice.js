const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

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

        const embed = new EmbedBuilder()
            .setColor('#0099ff') // 青
            .setTitle('🎲 サイコロの結果')
            .setTimestamp();

        if (count >= 15) {
            const resultChunks = [];
            for (let i = 0; i < result.length; i += 15) {
                resultChunks.push(result.slice(i, i + 15).join(', '));
            }

            embed.setDescription(`サイコロの結果の合計は **${total}** です！`)
                .addFields({ name: '詳細', value: resultChunks.join('\n') });
        } else {
            embed.setDescription(`サイコロの結果は以下の通りです。`)
                .addFields(
                    { name: '結果', value: result.join(', '), inline: false },
                    { name: '合計', value: `**${total}**`, inline: false }
                );
        }

        await replyMethod({ embeds: [embed] });
    },
    async executeSlash(interaction) {
        await this.execute(
            interaction.options.getInteger('sides'),
            interaction.options.getInteger('count'),
            (msg) => interaction.reply(msg)
        );
    },
    async executeMessage(message, args) {
        await this.execute(
            parseInt(args[0]),
            parseInt(args[1]),
            (msg) => message.reply(msg)
        );
    }
};
