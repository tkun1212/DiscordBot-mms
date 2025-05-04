const { EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger.js');

const panelsFilePath = path.join(__dirname, '../data/rolePanels.json');

// パネルファイルの初期化（存在しない場合）
async function initializePanelsFile() {
    try {
        const exists = await fs.access(panelsFilePath).then(() => true).catch(() => false);
        if (!exists) {
            await fs.writeFile(panelsFilePath, JSON.stringify([], null, 2), 'utf-8');
        }
    } catch (error) {
        logger.error('Failed to initialize panels file:', error);
    }
}

async function handleRoleInteraction(interaction, roleId, member) {
    const role = interaction.guild.roles.cache.get(roleId);
    if (!role) {
        return interaction.reply({ content: '指定されたロールが見つかりませんでした。', ephemeral: true });
    }

    const embed = new EmbedBuilder().setColor('Green');
    try {
        if (member.roles.cache.has(roleId)) {
            await member.roles.remove(role);
            embed.setDescription(`<@&${roleId}> を剥奪しました。`);
        } else {
            await member.roles.add(role);
            embed.setDescription(`<@&${roleId}> を付与しました。`);
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
        logger.error('Error handling role interaction:', error);
        await interaction.reply({ content: 'ロール操作中にエラーが発生しました。', ephemeral: true });
    }
}

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isStringSelectMenu() || interaction.customId !== 'role-panel') return;

        const roleId = interaction.values[0];
        const member = interaction.member;

        await handleRoleInteraction(interaction, roleId, member);
    },

    async loadPanels(client) {
        await initializePanelsFile();

        try {
            const panelsData = await fs.readFile(panelsFilePath, 'utf-8');
            const panels = JSON.parse(panelsData);

            for (const panel of panels) {
                try {
                    const channel = await client.channels.fetch(panel.channelId);
                    if (!channel) continue;

                    const message = await channel.messages.fetch(panel.messageId);
                    if (!message) continue;

                    const collector = message.createMessageComponentCollector({ componentType: 'SELECT_MENU' });
                    collector.on('collect', async interaction => {
                        if (!interaction.isStringSelectMenu() || interaction.customId !== 'role-panel') return;
                        await handleRoleInteraction(interaction, interaction.values[0], interaction.member);
                    });
                } catch (error) {
                    logger.error('Error loading role panel:', error);
                }
            }
        } catch (error) {
            logger.error('Error reading panels file:', error);
        }
    }
};
