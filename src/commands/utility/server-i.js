const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server-i')
        .setDescription('このサーバーの情報を表示します。'),
    async execute(guild, replyMethod) {
        if (!guild) {
            return replyMethod('サーバー情報を取得できませんでした。');
        }

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`${guild.name} の情報`)
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .addFields(
                { name: 'サーバー名', value: guild.name, inline: true },
                { name: 'サーバーID', value: guild.id, inline: true },
                { name: 'メンバー数', value: `${guild.memberCount.toLocaleString()}`, inline: true },
                { name: '作成日', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: false },
                { name: 'オーナー', value: `<@${guild.ownerId}>`, inline: true },
                { name: 'ロール数', value: `${guild.roles.cache.size}`, inline: true },
                { name: 'チャンネル数', value: `${guild.channels.cache.size}`, inline: true },
                { name: 'サーバーブーストレベル', value: `${guild.premiumTier || 'None'}`, inline: true },
                { name: '絵文字の数', value: `${guild.emojis.cache.size}`, inline: true },
                { name: '地域', value: guild.preferredLocale, inline: true },
                //{ name: 'サーバーバナー', value: guild.bannerURL() ? `[バナー画像](https://cdn.discordapp.com/banners/${guild.id}/${guild.banner}.png)` : 'なし', inline: false }
            )
            .setTimestamp();

        await replyMethod({ embeds: [embed] });
    },
    async executeSlash(interaction) {
        const guild = interaction.guild;
        await this.execute(guild, (msg) => interaction.reply(msg));
    },
    async executeMessage(message) {
        const guild = message.guild;
        await this.execute(guild, (msg) => message.reply(msg));
    },
};
