const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { MIEJSCA_PRACY, POJAZDY, CZAS } = require('../config/config');

function createFormComponents(guild) {
    // Miejsce pracy
    const miejscaPracySelect = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('miejsce_pracy')
            .setPlaceholder('Wybierz miejsce pracy')
            .addOptions(
                MIEJSCA_PRACY.map(miejsce => ({
                    label: miejsce,
                    value: miejsce
                }))
            )
    );

    // Pojazdy
    const pojazdySelect = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('auto')
            .setPlaceholder('Wybierz pojazd')
            .addOptions(
                POJAZDY.map(pojazd => ({
                    label: pojazd,
                    value: pojazd
                }))
            )
    );

    // ... (pozostałe komponenty)

    return {
        miejscaPracySelect,
        pojazdySelect,
        // ... (pozostałe komponenty)
    };
}

module.exports = { createFormComponents }; 