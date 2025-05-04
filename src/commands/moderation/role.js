const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

const panelsFilePath = path.join(__dirname, '../data/rolePanels.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('role')
        .setDescription('ロールパネルを作成します。')
        .addRoleOption(option =>
            option.setName('role1')
                .setDescription('ロール1を指定してください。')
                .setRequired(true)
        )
        .addRoleOption(option =>
            option.setName('role2')
                .setDescription('ロール2を指定してください。')
                .setRequired(false)
        )
        .addRoleOption(option =>
            option.setName('role3')
                .setDescription('ロール3を指定してください。')
                .setRequired(false)
        )
        .addRoleOption(option =>
            option.setName('role4')
                .setDescription('ロール4を指定してください。')
                .setRequired(false)
        )
        .addRoleOption(option =>
            option.setName('role5')
                .setDescription('ロール5を指定してください。')
                .setRequired(false)
        ),
    async executeSlash(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return interaction.reply({ content: 'このコマンドを使用する権限がありません。', ephemeral: true });
        }

        const roles = [];
        for (let i = 1; i <= 5; i++) {
            const role = interaction.options.getRole(`role${i}`);
            if (role) roles.push(role);
        }

        if (!roles.length) {
            return interaction.reply({ content: 'ロールが指定されていません。', ephemeral: true });
        }

        // 最大25ロールまで対応
        if (roles.length > 25) {
            return interaction.reply({ content: 'ロールは最大25個まで指定できます。', ephemeral: true });
        }

        const options = roles.map((role, index) => ({
            label: role.name,
            value: role.id,
            description: `ロールID: ${role.id}`
        }));

        const menu = new StringSelectMenuBuilder()
            .setCustomId('role-panel')
            .setPlaceholder('ロールを選択してください')
            .addOptions(options);

        const row = new ActionRowBuilder().addComponents(menu);

        const embed = new EmbedBuilder()
            .setTitle('ロールパネル')
            .setDescription(roles.map(role => `<@&${role.id}>`).join('\n'))
            .setColor('Green');

        await interaction.deferReply({ ephemeral: true });

        const panelData = {
            channelId: interaction.channel.id,
            messageId: null, // 後で設定
            roles: roles.map(role => ({ id: role.id, name: role.name }))
        };

        try {
            const sentMessage = await interaction.channel.send({ embeds: [embed], components: [row] });
            panelData.messageId = sentMessage.id;

            // panels.json の読み込み
            let panels = [];
            try {
                const data = await fs.readFile(panelsFilePath, 'utf-8');
                panels = JSON.parse(data);
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    throw error; // ファイル読み込みエラー
                }
            }

            // 重複チェック (同じチャンネルとメッセージID)
            if (panels.some(panel => panel.channelId === panelData.channelId && panel.messageId === panelData.messageId)) {
                return interaction.editReply({ content: 'このチャンネルにはすでにロールパネルが存在します。' });
            }

            panels.push(panelData);
            await fs.writeFile(panelsFilePath, JSON.stringify(panels, null, 2), 'utf-8');

            await interaction.editReply({ content: 'ロールパネルを作成しました。' });
        } catch (error) {
            console.error('Error creating role panel:', error);
            await interaction.editReply({ content: 'ロールパネルの作成中にエラーが発生しました。' });
        }
    }
};
