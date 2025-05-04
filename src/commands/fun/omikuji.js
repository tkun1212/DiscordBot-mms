const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economyManager = require('../../utils/economyManager.js'); // データ保存用に再利用

const omikujiResults = {
    overall: [
        { type: '大吉', message: '今日は最高の一日になるでしょう！' },
        { type: '中吉', message: '良いことが起こる予感！' },
        { type: '小吉', message: '小さな幸せが訪れるかも。' },
        { type: '末吉', message: '少しずつ運気が上がっていくでしょう。' },
        { type: '吉', message: '平穏な一日が過ごせそうです。' },
        { type: '凶', message: '注意が必要な一日です。' },
        { type: '大凶', message: '今日は辛抱の時。' }
    ],
    love: ['たぶん叶う', '慎重に進めるべき', '新しい出会いがあるかも', '過去を振り返らないで'],
    work: ['急がば回れ', '新しい挑戦が吉', '周囲と協力すると良い結果に', '計画を見直すべき'],
    money: ['臨時収入の予感', '無駄遣いに注意', '貯金を始めるチャンス', '大きな買い物は控えるべき'],
    study: ['集中力が高まる日', '復習が鍵', '新しい知識を吸収できる', '計画的に進めるべき'],
    health: ['体調は良好', '無理をしないで', '運動を取り入れると良い', '休息が必要']
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('omikuji')
        .setDescription('おみくじを引いて運勢を占います！'),

    async executeSlash(interaction) {
        const userId = interaction.user.id;
        const todayKey = new Date().toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' });

        // データベースから今日の結果を取得
        const existingResult = await economyManager.getOmikujiResult(userId, todayKey);
        if (existingResult) {
            return interaction.reply({ content: '🎋 今日のおみくじ結果は既に引いています！以下が結果です。', embeds: [createOmikujiEmbed(existingResult, interaction.user)] });
        }

        // 新しい結果を生成
        const result = generateOmikujiResult();
        await economyManager.saveOmikujiResult(userId, todayKey, result);

        // 結果を返信
        await interaction.reply({ embeds: [createOmikujiEmbed(result, interaction.user)] });
    }
};

function generateOmikujiResult() {
    const overall = randomPick(omikujiResults.overall);
    return {
        overall,
        love: randomPick(omikujiResults.love),
        work: randomPick(omikujiResults.work),
        money: randomPick(omikujiResults.money),
        study: randomPick(omikujiResults.study),
        health: randomPick(omikujiResults.health)
    };
}

function randomPick(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function createOmikujiEmbed(result, user) {
    return new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle(`🎋 ${user.tag} さんのおみくじ結果`)
        .addFields(
            { name: '全体運', value: `${result.overall.type}: ${result.overall.message}`, inline: false },
            { name: '恋愛運', value: result.love, inline: true },
            { name: '仕事運', value: result.work, inline: true },
            { name: '金運', value: result.money, inline: true },
            { name: '学業運', value: result.study, inline: true },
            { name: '健康運', value: result.health, inline: true }
        )
        .setFooter({ text: '次回は明日`00:00`以降に引けます！' })
        .setTimestamp();
}
