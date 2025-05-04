const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const economy = require('../../utils/economyManager.js');
const { MONEY_UNIT } = require('../../utils/economyManager.js');
const logger = require('../../utils/logger.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('give')
        .setDescription('他のユーザーにお金を渡します。')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('お金を渡す相手のユーザーを指定してください。')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('渡す金額を指定してください。')
                .setRequired(true)
        ),
    async executeSlash(interaction) {
        const senderId = interaction.user.id;
        const targetUser = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');

        // 自分自身に送金しようとした場合
        if (senderId === targetUser.id) {
            return interaction.reply({ content: '自分自身にお金を渡すことはできません。', flags: MessageFlags.Ephemeral });
        }

        // 金額が正であるか確認
        if (amount <= 0) {
            return interaction.reply({ content: '金額は正の数で指定してください。', flags: MessageFlags.Ephemeral });
        }

        try {
            // 送金者の残高を確認
            const senderBalance = await economy.getBalance(senderId);
            if (senderBalance < amount) {
                return interaction.reply({ content: `残高が不足しています。現在の残高は ${senderBalance}${MONEY_UNIT} です。`, flags: MessageFlags.Ephemeral });
            }

            // 送金処理
            await economy.subtractBalance(senderId, amount);
            await economy.addBalance(targetUser.id, amount);

            await interaction.reply({ content: `${targetUser.tag} に **${amount}${MONEY_UNIT}** を渡しました！`, flags: MessageFlags.Ephemeral });
        } catch (error) {
            logger.error('Error in /give command:', error);
            await interaction.reply({ content: '送金中にエラーが発生しました。', flags: MessageFlags.Ephemeral });
        }
    }
};
