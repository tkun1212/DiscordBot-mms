const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Botの応答速度を確認します'),
    
    async executeSlash(interaction, client) {
        const ping = client.ws.ping === -1 ? "接続エラー" : `${client.ws.ping}ms`;
        await interaction.reply(`🏓 Pong!\nWebSocket Ping: ${ping}`);
    },

    async executeMessage(message, client) {
        const ping = client.ws.ping === -1 ? "接続エラー" : `${client.ws.ping}ms`;
        await message.reply(`🏓 Pong!\nWebSocket Ping: ${ping}`);
    }
};
