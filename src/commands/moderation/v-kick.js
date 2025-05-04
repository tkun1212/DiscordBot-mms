const { SlashCommandBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const logger = require('../../utils/logger.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('v-kick')
        .setDescription('指定したユーザーをボイスチャットから強制的に切断します。')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('切断するユーザーを指定してください。')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('切断の理由を指定してください。')
                .setRequired(false)
        ),

    async execute(interaction) {
        logger.warn('Voice kick command executed.');

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.MoveMembers)) {
            return interaction.reply({ content: 'このコマンドを使用する権限がありません。', flags: MessageFlags.Ephemeral });
        }

        const target = interaction.options.getMember('target');
        const reason = interaction.options.getString('reason') || '管理者による強制切断';

        if (!target || !target.voice.channel) {
            return interaction.reply({ content: '指定されたユーザーはボイスチャットに参加していません。', flags: MessageFlags.Ephemeral });
        }

        try {
            // DMを送信
            await target.send({
                embeds: [
                    {
                        color: 0xffa500,
                        title: 'ボイスチャット切断通知',
                        description: `あなたはサーバー「${interaction.guild.name}」のボイスチャットから切断されました。`,
                        fields: [
                            { name: '理由', value: reason }
                        ],
                        timestamp: new Date(),
                    },
                ],
            }).catch(() => logger.warn('Failed to send DM to the user.')); // DM送信失敗時はログに記録

            // ボイスチャットから切断
            await target.voice.disconnect();
            await interaction.reply({ content: `${target.user.tag} をボイスチャットから切断しました。\n理由: ${reason}`, flags: MessageFlags.Ephemeral });
        } catch (error) {
            logger.error('Error disconnecting user from voice chat:', error);
            await interaction.reply({ content: 'ボイスチャットからの切断中にエラーが発生しました。', flags: MessageFlags.Ephemeral });
        }
    },
};
