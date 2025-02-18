// Komenda /edytuj_raport do edycji istniejących raportów
const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { MIEJSCA_PRACY, POJAZDY } = require('../config/config');
const googleSheets = require('../utils/googleSheets');
const ChannelManager = require('../utils/channelManager');
const { pobierzCzlonkowSerwera } = require('../utils/timeValidation');
const raportStore = require('../utils/raportDataStore');
const { wyslijRaport, formatujRaport } = require('./raport'); // Importujemy funkcje z raport.js

// Stałe dla etapów edycji
const EDIT_STAGES = {
    BASIC: 'podstawowe',
    PEOPLE: 'osoby',
    TIME: 'czas',
    CONFIRM: 'potwierdzenie'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('edytuj_raport')
        .setDescription('Edytuj swój raport z ostatnich 7 dni'),

    async execute(interaction) {
        try {
            if (raportStore.hasActiveReport(interaction.user.id)) {
                await interaction.reply({
                    content: '⚠️ Masz już aktywny formularz! Zakończ go przed rozpoczęciem edycji.',
                    ephemeral: true
                });
                return;
            }

            const editableReports = await googleSheets.getEditableReports(
                interaction.user.username
            );

            if (editableReports.length === 0) {
                await interaction.reply({
                    content: '❌ Nie znaleziono raportów do edycji.',
                    ephemeral: true
                });
                return;
            }

            // Lista raportów do wyboru
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('select_raport_to_edit')
                .setPlaceholder('Wybierz raport do edycji')
                .addOptions(editableReports.map(raport => ({
                    label: `${raport.data} - ${raport.miejscePracy}`,
                    description: `${raport.czasRozpoczecia} - ${raport.czasZakonczenia}`,
                    value: raport.rowIndex.toString(),
                    data: {
                        ...raport,
                        rowIndex: raport.rowIndex.toString()
                    }
                })));

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.reply({
                content: '📝 Wybierz raport do edycji:',
                components: [row],
                ephemeral: true
            });

        } catch (error) {
            console.error('❌ Błąd podczas inicjowania edycji:', error);
            await interaction.reply({
                content: '❌ Wystąpił błąd podczas inicjowania edycji.',
                ephemeral: true
            });
        }
    }
};

// Funkcje pomocnicze do obsługi etapów edycji
async function handleBasicEdit(interaction, editSession) {
    const components = [];

    // Max 5 komponentów na wiadomość w Discord
    components.push(new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('miejsce_pracy')
            .setPlaceholder('Zmień miejsce pracy')
            .addOptions(MIEJSCA_PRACY.map(miejsce => ({
                label: miejsce,
                value: miejsce,
                default: miejsce === editSession.miejscePracy
            })))
    ));

    components.push(new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('auto')
            .setPlaceholder('Zmień auto')
            .addOptions(POJAZDY.map(auto => ({
                label: auto,
                value: auto,
                default: auto === editSession.auto
            })))
    ));

    // Przyciski dieta i nawigacja
    components.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('dieta_tak')
            .setLabel('Dieta: Tak')
            .setStyle(editSession.dieta ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('dieta_nie')
            .setLabel('Dieta: Nie')
            .setStyle(!editSession.dieta ? ButtonStyle.Danger : ButtonStyle.Secondary)
    ));

    // Przyciski nawigacji
    components.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('edit_osoby')
            .setLabel('➡️ Osoby')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('edit_czas')
            .setLabel('⏰ Czas')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('cancel_edit')
            .setLabel('❌ Anuluj')
            .setStyle(ButtonStyle.Danger)
    ));

    await interaction.update({
        content: formatujStanEdycji(editSession, EDIT_STAGES.BASIC),
        components: components,
        ephemeral: true
    });
}

// Eksportujemy funkcje do użycia w index.js
module.exports.handleBasicEdit = handleBasicEdit;
module.exports.handleOsobyEdit = handleOsobyEdit;
module.exports.handleCzasEdit = handleCzasEdit;
module.exports.validateAndSaveChanges = validateAndSaveChanges;

// Funkcja rozpoczynająca proces edycji raportu
async function rozpocznijEdycje(interaction, raport) {
    // Sprawdzenie czy raport nie jest starszy niż 7 dni
    const raportDate = new Date(raport.data);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    if (raportDate < sevenDaysAgo) {
        return interaction.followUp({
            content: 'Ten raport jest starszy niż 7 dni i nie może być edytowany.',
            ephemeral: true
        });
    }

    // Formularze dla wszystkich pól
    const miejscaPracySelect = new StringSelectMenuBuilder()
        .setCustomId('miejsce_pracy_edit')
        .setPlaceholder('Zmień miejsce pracy')
        .addOptions(
            MIEJSCA_PRACY.map(miejsce => ({
                label: miejsce,
                value: miejsce,
                default: miejsce === raport.miejscePracy
            }))
        );

    const pojazdySelect = new StringSelectMenuBuilder()
        .setCustomId('pojazd_edit')
        .setPlaceholder('Zmień pojazd')
        .addOptions(
            POJAZDY.map(pojazd => ({
                label: pojazd,
                value: pojazd,
                default: pojazd === raport.auto
            }))
        );

    const dietaButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('dieta_tak_edit')
                .setLabel('Dieta: Tak')
                .setStyle(raport.dieta ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('dieta_nie_edit')
                .setLabel('Dieta: Nie')
                .setStyle(!raport.dieta ? ButtonStyle.Danger : ButtonStyle.Secondary)
        );

    // Dodajemy pola do wyboru godzin
    const czasButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('zmien_czas_rozpoczecia')
                .setLabel('Zmień czas rozpoczęcia')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('zmien_czas_zakonczenia')
                .setLabel('Zmień czas zakończenia')
                .setStyle(ButtonStyle.Primary)
        );

    const czlonkowie = await pobierzCzlonkowSerwera(interaction.guild);

    const osobyPracujaceSelect = new StringSelectMenuBuilder()
        .setCustomId('osoby_pracujace_edit')
        .setPlaceholder('Zmień osoby pracujące')
        .setMinValues(1)
        .setMaxValues(Math.min(czlonkowie.length, 25))
        .addOptions(czlonkowie.map(czlonek => ({
            ...czlonek,
            default: raport.osobyPracujace.includes(czlonek.value)
        })));

    const kierowcaSelect = new StringSelectMenuBuilder()
        .setCustomId('kierowca_edit')
        .setPlaceholder('Zmień kierowcę')
        .addOptions(czlonkowie.map(czlonek => ({
            ...czlonek,
            default: raport.kierowca === czlonek.value
        })));

    await interaction.followUp({
        content: 'Wypełnij formularz raportu:',
        components: [
            new ActionRowBuilder().addComponents(miejscaPracySelect),
            new ActionRowBuilder().addComponents(pojazdySelect),
            new ActionRowBuilder().addComponents(osobyPracujaceSelect),
            new ActionRowBuilder().addComponents(kierowcaSelect),
            dietaButtons,
            czasButtons
        ],
        ephemeral: true
    });

    // Kolektor do zbierania zmian
    const filter = i => i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({
        filter,
        time: 300000 // 5 minut na edycję
    });

    const editedData = { ...raport };
    let czasEdycjiAktywny = false;

    collector.on('collect', async i => {
        try {
            switch (i.customId) {
                case 'miejsce_pracy_edit':
                    editedData.miejscePracy = i.values[0];
                    await i.update({ content: `Zmieniono miejsce pracy na: ${i.values[0]}` });
                    break;

                case 'pojazd_edit':
                    editedData.auto = i.values[0];
                    await i.update({ content: `Zmieniono pojazd na: ${i.values[0]}` });
                    break;

                case 'dieta_tak_edit':
                    editedData.dieta = true;
                    await i.update({ content: 'Włączono dietę' });
                    break;

                case 'dieta_nie_edit':
                    editedData.dieta = false;
                    await i.update({ content: 'Wyłączono dietę' });
                    break;

                case 'zmien_czas_rozpoczecia':
                case 'zmien_czas_zakonczenia':
                    czasEdycjiAktywny = true;
                    const czasType = i.customId === 'zmien_czas_rozpoczecia' ? 'rozpoczęcia' : 'zakończenia';
                    await i.reply({
                        content: `Wpisz nowy czas ${czasType} w formacie HH:MM (np. 07:30):`,
                        ephemeral: true
                    });
                    break;

                case 'osoby_pracujace_edit':
                    editedData.osobyPracujace = i.values;
                    const osobyNazwy = i.values.map(id => 
                        interaction.guild.members.cache.get(id)?.displayName || id
                    );
                    await i.update({ content: `Zmieniono osoby pracujące na: ${osobyNazwy.join(', ')}` });
                    break;

                case 'kierowca_edit':
                    editedData.kierowca = i.values[0];
                    const kierowcaNazwa = interaction.guild.members.cache.get(i.values[0])?.displayName || i.values[0];
                    await i.update({ content: `Zmieniono kierowcę na: ${kierowcaNazwa}` });
                    break;
            }

            // Jeśli edytujemy czas, czekamy na odpowiedź tekstową
            if (czasEdycjiAktywny) {
                const messageCollector = i.channel.createMessageCollector({
                    filter: m => m.author.id === interaction.user.id && /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(m.content),
                    max: 1,
                    time: 30000
                });

                messageCollector.on('collect', async m => {
                    const nowyCzas = m.content;
                    if (i.customId === 'zmien_czas_rozpoczecia') {
                        editedData.czasRozpoczecia = nowyCzas;
                    } else {
                        editedData.czasZakonczenia = nowyCzas;
                    }
                    await m.reply({ content: `Zaktualizowano czas ${i.customId === 'zmien_czas_rozpoczecia' ? 'rozpoczęcia' : 'zakończenia'} na ${nowyCzas}`, ephemeral: true });
                });
            }

            // Po każdej zmianie aktualizujemy raport
            const zaktualizowano = await googleSheets.aktualizujRaport(raport.rowIndex, editedData);
            
            if (zaktualizowano) {
                // Wysłanie zaktualizowanego raportu na kanał główny
                const kanalRaporty = interaction.guild.channels.cache.get(process.env.KANAL_RAPORTY_ID);
                await kanalRaporty.send(formatujRaport(editedData, true, raport.data));

                // Aktualizacja w prywatnym kanale użytkownika
                const kanalPrywatny = await ChannelManager.getOrCreateUserChannel(
                    interaction.guild,
                    interaction.user
                );

                // Wysyłamy nowy raport i oznaczamy stary jako nieaktualny
                await kanalPrywatny.send('⚠️ Poprzedni raport został zaktualizowany ⚠️');
                await kanalPrywatny.send(formatujRaport(editedData, true, raport.data));
            }
        } catch (error) {
            console.error('Błąd podczas edycji raportu:', error);
            await interaction.followUp({
                content: 'Wystąpił błąd podczas edycji raportu!',
                ephemeral: true
            });
        }
    });

    collector.on('end', () => {
        interaction.followUp({
            content: 'Zakończono sesję edycji raportu.',
            ephemeral: true
        });
    });
}

// Funkcja walidacji zmian przed zapisem
async function validateAndSaveChanges(interaction, editSession) {
    try {
        // 1. Walidacja czasu
        if (editSession.czasRozpoczecia && editSession.czasZakonczenia) {
            const [startH, startM] = editSession.czasRozpoczecia.split(':').map(Number);
            const [endH, endM] = editSession.czasZakonczenia.split(':').map(Number);
            
            if (endH * 60 + endM <= startH * 60 + startM) {
                throw new Error('Czas zakończenia musi być późniejszy niż czas rozpoczęcia!');
            }
        }

        // 2. Walidacja wymaganych pól
        const requiredFields = ['miejscePracy', 'auto', 'kierowca', 'osobyPracujace'];
        const missingFields = requiredFields.filter(field => !editSession[field]);
        
        if (missingFields.length > 0) {
            throw new Error(`Brakujące pola: ${missingFields.join(', ')}`);
        }

        // 3. Zapisz zmiany
        const saved = await googleSheets.updateReport(
            editSession.rowIndex,
            editSession,
            interaction.user.username
        );

        if (saved) {
            await interaction.update({
                content: '✅ Zmiany zostały zapisane pomyślnie!',
                components: [],
                ephemeral: true
            });
            
            // Wyślij zaktualizowany raport na kanał
            const channel = interaction.guild.channels.cache.get(process.env.KANAL_RAPORTY_ID);
            if (channel) {
                await channel.send(formatujRaport(editSession, true, editSession.data));
            }
        } else {
            throw new Error('Nie udało się zapisać zmian');
        }

    } catch (error) {
        await interaction.reply({
            content: `❌ Błąd: ${error.message}`,
            ephemeral: true
        });
    }
}

// Funkcja do obsługi drugiego etapu - wybór osób
async function handleOsobyEdit(interaction, editSession) {
    try {
        const components = [];
        const czlonkowie = await pobierzCzlonkowSerwera(interaction.guild);

        if (czlonkowie.length === 0) {
            await interaction.reply({
                content: '❌ Nie udało się pobrać listy członków serwera.',
                ephemeral: true
            });
            return;
        }

        // 1. Osoby pracujące
        const osobySelect = new StringSelectMenuBuilder()
            .setCustomId('osoby_pracujace')
            .setPlaceholder('Zmień osoby pracujące')
            .setMinValues(1)
            .setMaxValues(Math.min(czlonkowie.length, 25))
            .addOptions(czlonkowie.map(czlonek => ({
                ...czlonek,
                default: editSession.osobyPracujace.includes(czlonek.value)
            })));
        components.push(new ActionRowBuilder().addComponents(osobySelect));

        // 2. Kierowca
        const kierowcaSelect = new StringSelectMenuBuilder()
            .setCustomId('kierowca')
            .setPlaceholder('Zmień kierowcę')
            .addOptions(czlonkowie.map(czlonek => ({
                ...czlonek,
                default: editSession.kierowca === czlonek.value
            })));
        components.push(new ActionRowBuilder().addComponents(kierowcaSelect));

        // 3. Przyciski nawigacji
        const navigationButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('edit_podstawowe')
                    .setLabel('⬅️ Wróć')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('save_edit')
                    .setLabel('💾 Zapisz zmiany')
                    .setStyle(ButtonStyle.Success)
            );
        components.push(navigationButtons);

        await interaction.update({
            content: formatujStanEdycji(editSession, 'osoby'),
            components: components,
            ephemeral: true
        });
    } catch (error) {
        console.error('Błąd podczas edycji osób:', error);
        await interaction.reply({
            content: '❌ Wystąpił błąd podczas edycji osób.',
            ephemeral: true
        });
    }
}

// Funkcja do obsługi etapu edycji czasu
async function handleCzasEdit(interaction, editSession) {
    const components = [];

    // 1. Wybór godziny rozpoczęcia
    const godzinaRozpoczeciaSelect = new StringSelectMenuBuilder()
        .setCustomId('godzina_rozpoczecia')
        .setPlaceholder('Godzina rozpoczęcia')
        .addOptions(Array.from({ length: 24 }, (_, i) => ({
            label: `${i.toString().padStart(2, '0')}:00`,
            value: i.toString().padStart(2, '0'),
            default: editSession.czasRozpoczecia?.split(':')[0] === i.toString().padStart(2, '0')
        })));
    components.push(new ActionRowBuilder().addComponents(godzinaRozpoczeciaSelect));

    // 2. Wybór minuty rozpoczęcia
    const minutaRozpoczeciaSelect = new StringSelectMenuBuilder()
        .setCustomId('minuta_rozpoczecia')
        .setPlaceholder('Minuta rozpoczęcia')
        .addOptions(['00', '15', '30', '45'].map(min => ({
            label: min,
            value: min,
            default: editSession.czasRozpoczecia?.split(':')[1] === min
        })));
    components.push(new ActionRowBuilder().addComponents(minutaRozpoczeciaSelect));

    // 3. Wybór godziny zakończenia
    const godzinaZakonczeniaSelect = new StringSelectMenuBuilder()
        .setCustomId('godzina_zakonczenia')
        .setPlaceholder('Godzina zakończenia')
        .addOptions(Array.from({ length: 24 }, (_, i) => ({
            label: `${i.toString().padStart(2, '0')}:00`,
            value: i.toString().padStart(2, '0'),
            default: editSession.czasZakonczenia?.split(':')[0] === i.toString().padStart(2, '0')
        })));
    components.push(new ActionRowBuilder().addComponents(godzinaZakonczeniaSelect));

    // 4. Przyciski nawigacji
    const navigationButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('edit_podstawowe')
                .setLabel('⬅️ Wróć')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('save_edit')
                .setLabel('💾 Zapisz zmiany')
                .setStyle(ButtonStyle.Success)
        );
    components.push(navigationButtons);

    await interaction.update({
        content: formatujStanEdycji(editSession, 'czas'),
        components: components,
        ephemeral: true
    });
}

// Rozszerzamy funkcję formatującą stan o różne etapy
function formatujStanEdycji(editSession, stage) {
    const baseInfo = `**Edycja raportu z ${editSession.data}**\n\n`;
    
    let stageInfo = '';
    switch(stage) {
        case 'podstawowe':
            stageInfo = '📝 Edycja podstawowych informacji:\n';
            break;
        case 'osoby':
            stageInfo = '👥 Edycja osób pracujących:\n';
            break;
        case 'czas':
            stageInfo = '⏰ Edycja czasu pracy:\n';
            break;
    }

    const currentState = `
🏢 Miejsce pracy: \`${editSession.miejscePracy}\`
🚗 Auto: \`${editSession.auto}\`
👥 Osoby pracujące: \`${editSession.osobyPracujace.join(', ')}\`
🧑‍✈️ Kierowca: \`${editSession.kierowca}\`
💰 Dieta: \`${editSession.dieta ? 'Tak' : 'Nie'}\`
⏰ Czas pracy: \`${editSession.czasRozpoczecia} - ${editSession.czasZakonczenia}\``;

    return `${baseInfo}${stageInfo}${currentState}`.trim();
} 