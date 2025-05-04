const { GuildMember, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const logger = require('../../utils/logger.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('user-i')
        .setDescription('指定したユーザーの情報を表示します。')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('情報を表示するユーザーを指定してください。')
                .setRequired(true)
        ),

    // 共通の処理
    async execute(user, replyMethod) {
        try {
            // ユーザーオブジェクトを判別
            const targetUser = user instanceof GuildMember ? user.user : user;
            const member = user instanceof GuildMember ? user : null;

            // フィールド情報を準備
            const fields = [
                { name: 'ユーザー名', value: targetUser.username, inline: true },
                { name: 'ユーザーID', value: targetUser.id, inline: true },
                { name: 'アカウント作成日', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:F>`, inline: false }
            ];

            if (member) {
                fields.push(
                    { name: 'ニックネーム', value: member.nickname || 'なし', inline: true },
                    { name: 'サーバー参加日', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: false },
                    {
                        name: 'ロール',
                        value: member.roles.cache
                            .filter(role => role.name !== '@everyone')
                            .map(role => role.name)
                            .join(', ') || 'なし',
                        inline: false
                    }
                );
            }

            // エンベッドの作成
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`${targetUser.tag} の情報`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .addFields(fields)
                .setTimestamp();

            logger.info(`User information for ${targetUser.tag} successfully retrieved.`);

            await replyMethod({ embeds: [embed] });
        } catch (error) {
            console.error('Error in /user_i command:', error); // 詳細なエラー情報をコンソールに出力
            logger.error('Error executing /user_i command:', error);

            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('⚠️ エラー発生')
                .setDescription('コマンドの実行中にエラーが発生しました。')
                .addFields({ name: '詳細', value: `\`${error.message}\`\n\`\`\`${error.stack}\`\`\`` })
                .setTimestamp();

            await replyMethod({ embeds: [embed] });
        }
    },

    // スラッシュコマンド用の実行
    async executeSlash(interaction) {
        const user = interaction.options.getMember('target') || interaction.options.getUser('target');
        await this.execute(user, (msg) => interaction.reply(msg));
    },

    // メッセージコマンド用の実行
    async executeMessage(message, args) {
        const userId = args[0]?.replace(/\D/g, ''); // ID 部分だけを抽出
        if (!userId) return message.reply('ユーザーIDを指定してください。');

        let user = await message.guild.members.fetch(userId).catch(() => null) ||
                   await message.client.users.fetch(userId).catch(() => null);

        if (!user) {
            return message.reply('指定されたユーザーが見つかりませんでした。');
        }

        await this.execute(user, (msg) => message.reply(msg));
    },
};
