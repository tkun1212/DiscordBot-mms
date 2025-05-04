const logger = require('../utils/logger.js');
const { ActivityType } = require('discord.js');

const { GUILD_ID } = process.env;

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        if (!client.user) {
            logger.error('❌ client.user が初期化されていません。');
            return;
        }

        if (!GUILD_ID) {
            logger.warn('⚠️ .env に GUILD_ID が設定されていません。メンバー数の表示はスキップされます。');
        }

        logger.info(`✅ ログイン成功: ${client.user.tag} (ID: ${client.user.id})`);

        let showHelp = true;
        let guild = null;

        if (GUILD_ID) {
            try {
                guild = await client.guilds.fetch(GUILD_ID);
            } catch (error) {
                logger.error(`❌ GUILD_ID (${GUILD_ID}) の取得に失敗しました:`, error);
            }
        }

        const updatePresence = async () => {
            try {
                if (showHelp) {
                    await client.user.setPresence({
                        activities: [{ type: ActivityType.Custom, name: '/help - ヘルプを表示' }],
                        status: 'online',
                    });
                } else if (guild) {
                    try {
                        const memberCount = guild.memberCount;
                        await client.user.setPresence({
                            activities: [{
                                type: ActivityType.Custom,
                                name: `${memberCount}人がめめ鯖に参戦中`,
                            }],
                            status: 'online',
                        });
                    } catch (err) {
                        logger.error('❌ メンバー数の取得に失敗しました:', err);
                    }
                }

                showHelp = !showHelp; // 次回は逆の表示に
            } catch (err) {
                logger.error('❌ ステータス更新中にエラーが発生しました:', err);
            }
        };

        // 初回実行
        updatePresence();

        // 10秒ごとに表示を交互に切り替え
        setInterval(async () => {
            try {
                if (guild) {
                    guild = await client.guilds.fetch(GUILD_ID); // 最新の情報を取得
                }
                await updatePresence();
            } catch (err) {
                logger.error('❌ ギルド情報の更新中にエラーが発生しました:', err);
            }
        }, 10_000);
    },
};
