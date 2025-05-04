const { SlashCommandBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const logger = require('../../utils/logger.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('指定したユーザーをBanします。')
        .addUserOption(option => option.setName('target').setDescription('Banするユーザーを指定してください。').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Banの理由を指定してください。').setRequired(false))
        .addBooleanOption(option => option.setName('del').setDescription('Banされたユーザーのメッセージをすべて削除します (true/false)').setRequired(false)),

    async execute(guild, targetId, reason, delMessages, replyMethod) {
        // ユーザーがサーバーにいない場合
        if (!targetId) {
            return replyMethod('指定されたユーザーはこのサーバーにいません。');
        }

        let target;
        try {
            target = await guild.members.fetch(targetId);
        } catch (error) {
            logger.error('Failed to fetch target member:', error);
            return replyMethod('指定されたユーザーを取得できませんでした。');
        }

        try {
            const messageContent = reason || '不適切な行動';
            // ユーザーにDMを送信
            await target.send({
                embeds: [{
                    color: 0xff0000,
                    title: 'Ban通知',
                    description: `あなたはサーバー「${guild.name}」からBanされました。`,
                    fields: [{ name: '理由', value: messageContent }],
                    timestamp: new Date(),
                }],
            }).catch(() => logger.warn('Failed to send DM to the user.'));

            // ユーザーをBan
            await guild.members.ban(target, {
                reason: messageContent,
                deleteMessageSeconds: delMessages ? 604800 : null, // 最大7日間メッセージ削除
            });

            logger.warn(`${target.user.tag} has been banned from the server.`); // 詳細ログ
            await replyMethod(`${target.user.tag} をBanしました。`);

        } catch (error) {
            logger.error('Failed to ban the user:', error);
            return replyMethod('Banの実行に失敗しました。');
        }
    },

    async handleCommand(context, getArgs, replyMethod) {
        // Ban権限がない場合のチェック
        if (!context.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return replyMethod('あなたにはこのコマンドを使用する権限がありません。', MessageFlags.Ephemeral);
        }

        const { guild, targetId, reason, delMessages } = getArgs();
        await this.execute(guild, targetId, reason, delMessages, replyMethod);
    },

    async executeSlash(interaction) {
        await this.handleCommand(interaction, () => ({
            guild: interaction.guild,
            targetId: interaction.options.getUser('target').id,
            reason: interaction.options.getString('reason'),
            delMessages: interaction.options.getBoolean('del') || false,
        }), (msg) => interaction.reply({ content: msg, flags: MessageFlags.Ephemeral }));
    },

    async executeMessage(message, args) {
        await this.handleCommand(message, () => ({
            guild: message.guild,
            targetId: args[0]?.replace(/\D/g, ''),
            reason: args[1],
            delMessages: args[2]?.toLowerCase() === 'true' || false,
        }), (msg) => message.reply(msg));
    },
};
