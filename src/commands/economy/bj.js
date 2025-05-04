const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const { MONEY_UNIT } = require('../../utils/economyManager.js');
const economy = require('../../utils/economyManager.js');
const logger = require('../../utils/logger.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bj')
        .setDescription('ブラックジャックをプレイします。')
        .addStringOption(option =>
            option.setName('bet')
                .setDescription('賭け金を指定してください。数値、"all"、"half"が使用可能です。')
                .setRequired(true)
        ),

    async executeSlash(interaction) {
        const userId = interaction.user.id;
        const rawBet = interaction.options.getString('bet').toLowerCase();
        let balance = await economy.getBalance(userId);
        let bet;

        // 賭け金の解釈
        if (rawBet === 'all') {
            bet = balance;
        } else if (rawBet === 'half') {
            bet = Math.floor(balance / 2);
        } else if (!isNaN(rawBet)) {
            bet = parseInt(rawBet);
        } else {
            return interaction.reply({ content: '賭け金は数値または "all"、"half" のいずれかを指定してください。', ephemeral: true });
        }

        if (bet <= 0) {
            return interaction.reply({ content: '賭け金は1以上である必要があります。', ephemeral: true });
        }

        if (balance < bet) {
            return interaction.reply({ content: `残高が不足しています。現在の残高は ${balance}${MONEY_UNIT} です。`, ephemeral: true });
        }

        await economy.subtractBalance(userId, bet);

        // 初期デッキと手札
        const deck = createDeck();
        const playerHand = [drawCard(deck), drawCard(deck)];
        const dealerHand = [drawCard(deck), drawCard(deck)];

        const embed = createGameEmbed(playerHand, dealerHand, false, bet);
        const row = createActionRow();

        const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

        const collector = message.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async (buttonInteraction) => {
            if (buttonInteraction.user.id !== interaction.user.id) {
                return buttonInteraction.reply({ content: 'このゲームに参加しているのはあなたではありません。', ephemeral: true });
            }

            if (buttonInteraction.customId === 'hit') {
                playerHand.push(drawCard(deck));
                if (calculateHandValue(playerHand) > 21) {
                    collector.stop('bust');
                }
            } else if (buttonInteraction.customId === 'stand') {
                collector.stop('stand');
            }

            const updatedEmbed = createGameEmbed(playerHand, dealerHand, false, bet);
            await buttonInteraction.update({ embeds: [updatedEmbed], components: [row] });
        });

        collector.on('end', async (_, reason) => {
            try {
                const playerValue = calculateHandValue(playerHand);
                let dealerValue = calculateHandValue(dealerHand);
                let result;

                if (reason === 'bust') {
                    result = 'あなたはバーストしました！負けです。';
                } else {
                    // ディーラーは 17 以上になるまで引く
                    while (dealerValue < 17) {
                        dealerHand.push(drawCard(deck));
                        dealerValue = calculateHandValue(dealerHand);
                    }

                    if (dealerValue > 21 || playerValue > dealerValue) {
                        result = 'おめでとうございます！あなたの勝ちです！';
                        await economy.addBalance(userId, bet * 2);
                    } else if (playerValue === dealerValue) {
                        result = '引き分けです！賭け金が返却されます。';
                        await economy.addBalance(userId, bet);
                    } else {
                        result = '残念！あなたの負けです。';
                    }
                }

                const finalEmbed = createGameEmbed(playerHand, dealerHand, true, bet);
                finalEmbed.setFooter({ text: result });
                await interaction.editReply({ embeds: [finalEmbed], components: [] });
            } catch (error) {
                logger.error('BJゲーム終了時のエラー:', error);
            }
        });
    }
};

// ===== 補助関数 =====

function createDeck() {
    const suits = ['♠', '♥', '♦', '♣'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    return suits.flatMap(suit => values.map(value => ({ suit, value }))).sort(() => Math.random() - 0.5);
}

function drawCard(deck) {
    return deck.pop();
}

function calculateHandValue(hand) {
    let value = 0;
    let aces = 0;

    for (const card of hand) {
        if (['J', 'Q', 'K'].includes(card.value)) value += 10;
        else if (card.value === 'A') {
            value += 11;
            aces++;
        } else value += parseInt(card.value);
    }

    while (value > 21 && aces > 0) {
        value -= 10;
        aces--;
    }

    return value;
}

function createGameEmbed(playerHand, dealerHand, revealDealer, bet) {
    const playerValue = calculateHandValue(playerHand);
    const dealerValue = revealDealer ? calculateHandValue(dealerHand) : '???';

    return new EmbedBuilder()
        .setTitle('ブラックジャック')
        .setDescription(`賭け金: **${bet}${MONEY_UNIT}**`)
        .addFields(
            { name: 'あなたの手札', value: formatHand(playerHand), inline: true },
            { name: 'ディーラーの手札', value: formatHand(dealerHand, !revealDealer), inline: true }
        )
        .setFooter({ text: `あなたの合計: ${playerValue} | ディーラーの合計: ${dealerValue}` });
}

function formatHand(hand, hideSecondCard = false) {
    if (hideSecondCard) {
        return `${hand[0].value}${hand[0].suit} ??`;
    }
    return hand.map(card => `${card.value}${card.suit}`).join(', ');
}

function createActionRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('hit').setLabel('ヒット').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('stand').setLabel('スタンド').setStyle(ButtonStyle.Secondary)
    );
}
