const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { MIEJSCA_PRACY, POJAZDY, CZAS } = require('../config/config');

function createFormComponents(guild) {
    // Miejsce pracy
    const miejscaPracySelect = new StringSelectMenuBuilder()
        .setCustomId('miejsce_pracy')
        .setPlaceholder('Wybierz miejsce pracy')
        .addOptions(
            MIEJSCA_PRACY.map(miejsce => ({
                label: miejsce,
                value: miejsce
            }))
        );

    // Pojazdy
    const pojazdySelect = new StringSelectMenuBuilder()
        .setCustomId('auto')
        .setPlaceholder('Wybierz pojazd')
        .addOptions(
            POJAZDY.map(pojazd => ({
                label: pojazd,
                value: pojazd
            }))
        );

    // Osoby pracujące
    const osobyPracujaceSelect = new StringSelectMenuBuilder()
        .setCustomId('osoby_pracujace')
        .setPlaceholder('Wybierz osoby pracujące')
        .setMinValues(1)
        .setMaxValues(5);

    // Kierowca
    const kierowcaSelect = new StringSelectMenuBuilder()
        .setCustomId('kierowca')
        .setPlaceholder('Wybierz kierowcę');

    // Przyciski diety
    const dietaButtons = [
        new ButtonBuilder()
            .setCustomId('dieta_tak')
            .setLabel('Dieta: Tak')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('dieta_nie')
            .setLabel('Dieta: Nie')
            .setStyle(ButtonStyle.Danger)
    ];

    // Czas
    const dateSelect = new StringSelectMenuBuilder()
        .setCustomId('data_raportu')
        .setPlaceholder('Wybierz datę')
        .addOptions(CZAS.getDaty());

    const startHourSelect = new StringSelectMenuBuilder()
        .setCustomId('godzina_rozpoczecia')
        .setPlaceholder('Wybierz godzinę rozpoczęcia')
        .addOptions(CZAS.getGodziny());

    const startMinuteSelect = new StringSelectMenuBuilder()
        .setCustomId('minuta_rozpoczecia')
        .setPlaceholder('Wybierz minutę rozpoczęcia')
        .addOptions(CZAS.MINUTY);

    const endHourSelect = new StringSelectMenuBuilder()
        .setCustomId('godzina_zakonczenia')
        .setPlaceholder('Wybierz godzinę zakończenia')
        .addOptions(CZAS.getGodziny());

    const endMinuteSelect = new StringSelectMenuBuilder()
        .setCustomId('minuta_zakonczenia')
        .setPlaceholder('Wybierz minutę zakończenia')
        .addOptions(CZAS.MINUTY);

    // Zwracamy komponenty opakowane w ActionRowBuilder
    return {
        miejscaPracySelect: new ActionRowBuilder().addComponents(miejscaPracySelect),
        pojazdySelect: new ActionRowBuilder().addComponents(pojazdySelect),
        osobyPracujaceSelect: new ActionRowBuilder().addComponents(osobyPracujaceSelect),
        kierowcaSelect: new ActionRowBuilder().addComponents(kierowcaSelect),
        dietaButtons: new ActionRowBuilder().addComponents(dietaButtons),
        dateSelect: new ActionRowBuilder().addComponents(dateSelect),
        startHourSelect: new ActionRowBuilder().addComponents(startHourSelect),
        startMinuteSelect: new ActionRowBuilder().addComponents(startMinuteSelect),
        endHourSelect: new ActionRowBuilder().addComponents(endHourSelect),
        endMinuteSelect: new ActionRowBuilder().addComponents(endMinuteSelect)
    };
}

module.exports = { createFormComponents }; 