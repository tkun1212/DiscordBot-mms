const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const economy = require('../../utils/economyManager.js');
const { MONEY_UNIT } = require('../../utils/economyManager.js');
const logger = require('../../utils/logger.js'); // ロガーを追加

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-coins') // コマンド名を修正
        .setDescription('指定したユーザーにお金を渡します (管理者専用)。')
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
        const ownerId = process.env.OWNER_ID;
        const senderId = interaction.user.id;

        // 管理者専用の確認
        if (senderId !== ownerId) {
            return interaction.reply({ content: 'このコマンドを使用する権限がありません。', flags: MessageFlags.Ephemeral });
        }

        const recipient = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');

        // 金額が正であるか確認
        if (amount <= 0) {
            return interaction.reply({ content: '金額は正の数で指定してください。', flags: MessageFlags.Ephemeral });
        }

        try {
            // 金額を追加
            await economy.addBalance(recipient.id, amount);
            await interaction.reply({ content: `${recipient.tag} に **${amount}${MONEY_UNIT}** を渡しました！`, flags: MessageFlags.Ephemeral });
        } catch (error) {
            // エラーが発生した場合
            logger.error('Error adding money to user:', error);
            await interaction.reply({ content: '金額付与中にエラーが発生しました。', flags: MessageFlags.Ephemeral });
        }
    }
};
