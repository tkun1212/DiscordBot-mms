const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const economy = require('../../utils/economyManager.js');
const { MONEY_UNIT } = require('../../utils/economyManager.js');
const logger = require('../../utils/logger.js'); // ロガーを追加

module.exports = {
    data: new SlashCommandBuilder()
        .setName('subtract-coins')
        .setDescription('指定したユーザーの指定した金額を没収します (管理者専用)。')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('金額を消滅させる対象のユーザーを指定してください。')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('没収する金額を指定してください。')
                .setRequired(true)
        ),
    async executeSlash(interaction) {
        const ownerId = process.env.OWNER_ID;
        const senderId = interaction.user.id;

        // 管理者専用コマンドの確認
        if (senderId !== ownerId) {
            return interaction.reply({ content: 'このコマンドを使用する権限がありません。', flags: MessageFlags.Ephemeral });
        }

        const targetUser = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');

        // 金額が正であるか確認
        if (amount <= 0) {
            return interaction.reply({ content: '金額は正の数で指定してください。', flags: MessageFlags.Ephemeral });
        }

        try {
            // ユーザーの残高を取得
            const targetBalance = await economy.getBalance(targetUser.id);

            // 残高が足りていない場合
            if (targetBalance < amount) {
                return interaction.reply({ content: `指定された金額はユーザーの残高を超えています。現在の残高は ${targetBalance}${MONEY_UNIT} です。`, flags: MessageFlags.Ephemeral });
            }

            // 残高から金額を引く
            await economy.subtractBalance(targetUser.id, amount);
            await interaction.reply({ content: `${targetUser.tag} の残高から **${amount}${MONEY_UNIT}** を消滅させました。`, flags: MessageFlags.Ephemeral });
        } catch (error) {
            logger.error('Error confiscating money:', error);
            await interaction.reply({ content: '金額没収中にエラーが発生しました。', flags: MessageFlags.Ephemeral });
        }
    }
};
