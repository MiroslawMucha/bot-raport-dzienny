// Komenda /raport do tworzenia nowych raportów
const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, TextInputBuilder, TextInputStyle } = require('discord.js');
const { MIEJSCA_PRACY, POJAZDY } = require('../config/config');
const googleSheets = require('../utils/googleSheets');
const ChannelManager = require('../utils/channelManager');
const raportStore = require('../utils/raportDataStore');

module.exports = {
    // Definicja komendy
    data: new SlashCommandBuilder()
        .setName('raport')
        .setDescription('Utwórz nowy raport dzienny'),

    async execute(interaction) {
        const raportData = raportStore.getReport(interaction.user.id);

        // Utworzenie formularza z wyborem miejsca pracy
        const miejscaPracySelect = new StringSelectMenuBuilder()
            .setCustomId('miejsce_pracy')
            .setPlaceholder('Wybierz miejsce pracy')
            .addOptions(
                MIEJSCA_PRACY.length >= 5 ? 
                MIEJSCA_PRACY.map(miejsce => ({
                    label: miejsce,
                    value: miejsce
                })) :
                [
                    ...MIEJSCA_PRACY.map(miejsce => ({
                        label: miejsce,
                        value: miejsce
                    })),
                    ...Array(5 - MIEJSCA_PRACY.length).fill(0).map((_, i) => ({
                        label: `Miejsce ${MIEJSCA_PRACY.length + i + 1}`,
                        value: `placeholder_${i}`,
                        default: false
                    }))
                ]
            );

        // Utworzenie formularza z wyborem pojazdu
        const pojazdySelect = new StringSelectMenuBuilder()
            .setCustomId('auto')
            .setPlaceholder('Wybierz pojazd')
            .addOptions(
                POJAZDY.length >= 5 ?
                POJAZDY.map(pojazd => ({
                    label: pojazd,
                    value: pojazd
                })) :
                [
                    ...POJAZDY.map(pojazd => ({
                        label: pojazd,
                        value: pojazd
                    })),
                    ...Array(5 - POJAZDY.length).fill(0).map((_, i) => ({
                        label: `Pojazd ${i + 1}`,
                        value: `Pojazd ${i + 1}`
                    }))
                ]
            );

        // Dodaj nową funkcję do pobierania członków serwera
        async function pobierzCzlonkowSerwera(guild) {
            const members = await guild.members.fetch();
            let options = members
                .filter(member => !member.user.bot)
                .map(member => ({
                    label: member.displayName,
                    value: member.displayName
                }));

            // Dodaj placeholdery tylko jeśli nie ma wystarczającej liczby członków
            if (options.length < 5) {
                console.log('Za mało członków, dodaję placeholdery...');
                while (options.length < 5) {
                    options.push({
                        label: `Pracownik ${options.length + 1}`,
                        value: `Pracownik ${options.length + 1}`,
                        default: false
                    });
                }
            }

            console.log('Dostępne opcje:', options);
            return options;
        }

        // W funkcji execute dodaj nowe pola formularza:
        const czlonkowie = await pobierzCzlonkowSerwera(interaction.guild);

        const osobyPracujaceSelect = new StringSelectMenuBuilder()
            .setCustomId('osoby_pracujace')
            .setPlaceholder('Wybierz osoby pracujące')
            .setMinValues(1)
            .setMaxValues(5)
            .addOptions(czlonkowie);

        const kierowcaSelect = new StringSelectMenuBuilder()
            .setCustomId('kierowca')
            .setPlaceholder('Wybierz kierowcę')
            .addOptions(czlonkowie);

        // Przyciski do wyboru diety
        const dietaButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('dieta_tak')
                    .setLabel('Dieta: Tak')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('dieta_nie')
                    .setLabel('Dieta: Nie')
                    .setStyle(ButtonStyle.Danger)
            );

        // Dodaj przyciski czasu po dietaButtons
        const timeButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('czas_rozpoczecia')
                    .setLabel('⏰ Ustaw czas rozpoczęcia')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('czas_zakonczenia')
                    .setLabel('⏰ Ustaw czas zakończenia')
                    .setStyle(ButtonStyle.Primary)
            );

        try {
            const response = await interaction.reply({
                content: 'Wypełnij formularz raportu:',
                components: [
                    new ActionRowBuilder().addComponents(miejscaPracySelect),
                    new ActionRowBuilder().addComponents(pojazdySelect),
                    new ActionRowBuilder().addComponents(osobyPracujaceSelect),
                    new ActionRowBuilder().addComponents(kierowcaSelect),
                    dietaButtons
                ],
                ephemeral: true
            });

            // Dodajemy kolektor do zbierania odpowiedzi
            const collector = response.createMessageComponentCollector({ 
                time: 180000 // 3 minuty na wypełnienie
            });

            // Stan formularza
            let formState = {
                miejscePracy: '',
                auto: '',
                osobyPracujace: [],
                kierowca: '',
                dieta: null
            };

            collector.on('collect', async i => {
                // Sprawdzamy typ interakcji
                switch(i.customId) {
                    case 'miejsce_pracy':
                        formState.miejscePracy = i.values[0];
                        break;
                    case 'auto':
                        formState.auto = i.values[0];
                        break;
                    case 'osoby_pracujace':
                        formState.osobyPracujace = i.values;
                        break;
                    case 'kierowca':
                        formState.kierowca = i.values[0];
                        break;
                    case 'dieta_tak':
                        formState.dieta = true;
                        break;
                    case 'dieta_nie':
                        formState.dieta = false;
                        break;
                }

                // Aktualizujemy wiadomość z aktualnym stanem
                await i.update({
                    content: `**Formularz raportu:**\n${formatujStanFormularza(formState)}`,
                    components: [
                        new ActionRowBuilder().addComponents(miejscaPracySelect),
                        new ActionRowBuilder().addComponents(pojazdySelect),
                        new ActionRowBuilder().addComponents(osobyPracujaceSelect),
                        new ActionRowBuilder().addComponents(kierowcaSelect),
                        dietaButtons
                    ]
                });
            });

            // Wysyłamy dodatkową wiadomość z wyborem czasu
            await interaction.followUp({
                content: 'Ustaw czas pracy:',
                components: [timeButtons],
                ephemeral: true
            });

        } catch (error) {
            console.error('Błąd podczas wysyłania formularza:', error);
            await interaction.reply({ 
                content: 'Wystąpił błąd podczas tworzenia formularza.', 
                ephemeral: true 
            });
        }
    },
    wyslijRaport,
    formatujRaport
};

// Funkcja wysyłająca raport
async function wyslijRaport(interaction, raportData) {
    // Zapisanie do Google Sheets
    const zapisano = await googleSheets.dodajRaport(raportData);

    if (zapisano) {
        // Formatowanie wiadomości raportu
        const raportMessage = formatujRaport(raportData, false); // false = nie jest edycją

        // Wysłanie na główny kanał raportów
        const kanalRaporty = interaction.guild.channels.cache.get(process.env.KANAL_RAPORTY_ID);
        await kanalRaporty.send(raportMessage);

        // Pobranie lub utworzenie prywatnego kanału użytkownika
        const kanalPrywatny = await ChannelManager.getOrCreateUserChannel(
            interaction.guild,
            interaction.user
        );

        // Wysłanie na prywatny kanał użytkownika
        await kanalPrywatny.send(raportMessage);

        // Wysłanie potwierdzenia
        await interaction.followUp({
            content: 'Raport został pomyślnie zapisany i wysłany na odpowiednie kanały!',
            ephemeral: true
        });
    } else {
        await interaction.followUp({
            content: 'Wystąpił błąd podczas zapisywania raportu!',
            ephemeral: true
        });
    }
}

// Funkcja formatująca raport do wiadomości Discord
function formatujRaport(raportData, isEdit = false, originalDate = null) {
    const header = isEdit ? 
        `🛠 **RAPORT DZIENNY – EDYCJA** (Oryginalny wpis: ${originalDate})` :
        `📌 **RAPORT DZIENNY – ORYGINAŁ**`;

    return `
${header}
👷‍♂️ Pracownik: ${raportData.pracownik}
📍 Miejsce pracy: ${raportData.miejscePracy}
⏳ Czas pracy: ${raportData.czasRozpoczecia} - ${raportData.czasZakonczenia}
💰 Dieta / Delegacja: ${raportData.dieta ? 'Tak' : 'Nie'}
👥 Osoby pracujące: ${raportData.osobyPracujace.join(', ')}
🚗 Auto: ${raportData.auto}
🧑‍✈️ Kierowca: ${raportData.kierowca}
    `.trim();
}

// Funkcja pomocnicza do formatowania stanu formularza
function formatujStanFormularza(state) {
    return `
📍 Miejsce pracy: ${state.miejscePracy || 'nie wybrano'}
🚗 Auto: ${state.auto || 'nie wybrano'}
👥 Osoby pracujące: ${state.osobyPracujace.length > 0 ? state.osobyPracujace.join(', ') : 'nie wybrano'}
🧑‍✈️ Kierowca: ${state.kierowca || 'nie wybrano'}
💰 Dieta: ${state.dieta === null ? 'nie wybrano' : state.dieta ? 'Tak' : 'Nie'}
    `.trim();
} 