const logger = require('../utils/logger.js');

module.exports = {
    name: 'messageReactionAdd',

    async execute(reaction, user) {
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (err) {
                return logger.warn('リアクションのフェッチに失敗:', err);
            }
        }

        const { message, emoji } = reaction;

        if (user.bot) return;
        if (emoji.name !== '🗑️') return;

        if (message.author?.bot) {
            try {
                await message.delete().catch(() => {});
                logger.info(`🗑️ ${user.tag} がメッセージを削除しました`);
            } catch (err) {
                logger.error('メッセージ削除エラー:', err);
            }
        }
    }
};
