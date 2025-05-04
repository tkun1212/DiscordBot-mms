const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economy = require('../../utils/economyManager.js');
const { MONEY_UNIT } = require('../../utils/economyManager.js');
const logger = require('../../utils/logger.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('money')
        .setDescription('あなたの残高を確認します。')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('残高を確認するユーザーを指定します。')
                .setRequired(false)
        ),

    // スラッシュコマンド対応
    async executeSlash(interaction) {
        const user = interaction.options.getUser('user') || interaction.user;

        try {
            const balance = await economy.getBalance(user.id);
            logger.info(`/balance executed for ${user.tag} (${user.id})`);

            const embed = new EmbedBuilder()
                .setTitle('💰 残高確認')
                .setDescription(`**${user.tag}** の現在の残高`)
                .addFields({ name: '所持金', value: `${balance}${MONEY_UNIT}`, inline: true })
                .setColor(0x00BFFF)
                .setFooter({ text: `ユーザーID: ${user.id}` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            logger.error('Error fetching balance (slash):', error);
            await interaction.reply({ content: '残高の取得中にエラーが発生しました。', ephemeral: true });
        }
    },

    // メッセージコマンド対応
    async executeMessage(message, argUser) {
        const rawId = argUser || message.author.id;
        const userId = rawId.replace(/\D/g, '');

        if (!/^\d{17,19}$/.test(userId)) {
            return message.reply('❌ 正しいユーザーIDを指定してください。');
        }

        try {
            const member = await message.guild.members.fetch(userId).catch(() => null);
            if (!member) return message.reply('❌ 指定されたユーザーが見つかりませんでした。');

            const balance = await economy.getBalance(member.id);
            logger.info(`!balance executed for ${member.user.tag} (${member.id})`);

            const embed = new EmbedBuilder()
                .setTitle('💰 残高確認')
                .setDescription(`**${member.user.tag}** の現在の残高`)
                .addFields({ name: '所持金', value: `${balance}${MONEY_UNIT}`, inline: true })
                .setColor(0x00BFFF)
                .setFooter({ text: `ユーザーID: ${member.id}` })
                .setTimestamp();

            await message.reply({ embeds: [embed] });
        } catch (error) {
            logger.error('Error fetching balance (message):', error);
            await message.reply('💥 残高の取得中にエラーが発生しました。');
        }
    },
};
