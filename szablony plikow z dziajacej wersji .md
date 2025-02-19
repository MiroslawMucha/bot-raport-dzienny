index.js:
// Główny plik aplikacji
const { Client, GatewayIntentBits, Collection, InteractionType, ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
console.log('Env variables loaded:', {
    tokenExists: !!process.env.TOKEN,
    tokenLength: process.env.TOKEN?.length,
    envPath: require('dotenv').config().parsed ? 'loaded' : 'not loaded'
});

// Inicjalizacja klienta Discord z odpowiednimi uprawnieniami
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers
    ]
});

// Kolekcja do przechowywania komend
client.commands = new Collection();

// Ładowanie komend z folderu commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Dodaj import store'a
const raportStore = require('./utils/raportDataStore');

// Dodaj import funkcji wyslijRaport
const { wyslijRaport, formatujRaport } = require('./commands/raport');
const googleSheets = require('./utils/googleSheets');
const ChannelManager = require('./utils/channelManager');

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

    // Przyciski diety
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

    return {
        miejscaPracySelect,
        pojazdySelect,
        dateSelect,
        startHourSelect,
        startMinuteSelect,
        endHourSelect,
        endMinuteSelect,
        dietaButtons
    };
}

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
    console.log('Załadowano komendę:', command.data.name);
}

// Obsługa eventu ready
client.once('ready', () => {
    console.log(`Zalogowano jako ${client.user.tag}`);
});

// Obsługa interakcji (komendy slash)
client.on('interactionCreate', async interaction => {
    console.log('Otrzymano interakcję:', {
        type: interaction.type,
        commandName: interaction.commandName,
        user: interaction.user.username
    });

    try {
        if (interaction.type === InteractionType.ApplicationCommand) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            if (interaction.commandName === 'raport') {
                raportStore.initReport(interaction.user.id, interaction.user.username);
            }

            await command.execute(interaction);
        } 
        else if (interaction.type === InteractionType.MessageComponent) {
            const userData = raportStore.getReport(interaction.user.id);
            console.log('Dane użytkownika:', userData);

            if (!userData) {
                await interaction.reply({
                    content: 'Sesja wygasła. Użyj komendy /raport ponownie.',
                    ephemeral: true
                });
                return;
            }

            const { customId } = interaction;
            let updateData = {};

            // Obsługa wyboru miejsca pracy, auta, osób i kierowcy
            if (customId === 'miejsce_pracy' || customId === 'auto' || 
                customId === 'osoby_pracujace' || customId === 'kierowca') {
                
                // Aktualizuj odpowiednie pole
                if (customId === 'miejsce_pracy') {
                    updateData.miejscePracy = interaction.values[0];
                } else if (customId === 'auto') {
                    updateData.auto = interaction.values[0];
                } else if (customId === 'osoby_pracujace') {
                    updateData.osobyPracujace = interaction.values;
                } else if (customId === 'kierowca') {
                    updateData.kierowca = interaction.values[0];
                }

                // Aktualizuj dane w store
                const updatedData = raportStore.updateReport(interaction.user.id, updateData);
                
                // Aktualizuj wiadomość pokazując cały stan formularza
                const components = createFormComponents(interaction.guild);
                await interaction.update({
                    content: `**Stan formularza:**\n
📍 Miejsce pracy: ${updatedData.miejscePracy || 'nie wybrano'}
[lista wyboru miejsca pracy]

🚗 Auto: ${updatedData.auto || 'nie wybrano'}
[lista wyboru auta]

👥 Osoby pracujące: ${updatedData.osobyPracujace?.length ? updatedData.osobyPracujace.join(', ') : 'nie wybrano'}
[lista wyboru osób]

🧑‍✈️ Kierowca: ${updatedData.kierowca || 'nie wybrano'}
[lista wyboru kierowcy]

💰 Dieta: ${updatedData.dieta === undefined ? 'nie wybrano' : updatedData.dieta ? 'Tak' : 'Nie'}`,
                    components: [
                        components.miejscaPracySelect,
                        components.pojazdySelect,
                        components.osobyPracujaceSelect,
                        components.kierowcaSelect,
                        components.dietaButtons
                    ]
                });
            }
            // Obsługa wyboru diety
            else if (customId.startsWith('dieta_')) {
                updateData.dieta = customId === 'dieta_tak';
                const updatedData = raportStore.updateReport(interaction.user.id, updateData);
                
                await interaction.update({
                    content: `**Stan formularza:**\n
📍 Miejsce pracy: ${updatedData.miejscePracy || 'nie wybrano'}
🚗 Auto: ${updatedData.auto || 'nie wybrano'}
👥 Osoby pracujące: ${updatedData.osobyPracujace?.length ? updatedData.osobyPracujace.join(', ') : 'nie wybrano'}
🧑‍✈️ Kierowca: ${updatedData.kierowca || 'nie wybrano'}
💰 Dieta: ${updatedData.dieta ? 'Tak' : 'Nie'}`,
                    components: interaction.message.components
                });
            }
            // Obsługa wyboru daty i czasu
            else if (customId === 'data_raportu' || 
                     customId === 'godzina_rozpoczecia' || 
                     customId === 'minuta_rozpoczecia' ||
                     customId === 'godzina_zakonczenia' || 
                     customId === 'minuta_zakonczenia') {
                
                const timeData = raportStore.getReport(interaction.user.id);
                const selectedValue = interaction.values[0];

                // Aktualizuj odpowiednie pola w zależności od typu wyboru
                if (customId === 'data_raportu') {
                    timeData.selectedDate = selectedValue;
                } 
                else if (customId === 'godzina_rozpoczecia') {
                    timeData.startHour = selectedValue;
                }
                else if (customId === 'minuta_rozpoczecia') {
                    timeData.startMinute = selectedValue;
                }
                else if (customId === 'godzina_zakonczenia') {
                    timeData.endHour = selectedValue;
                }
                else if (customId === 'minuta_zakonczenia') {
                    timeData.endMinute = selectedValue;
                }

                // Jeśli mamy wszystkie potrzebne dane, sformatuj czas
                if (timeData.selectedDate) {
                    if (timeData.startHour && timeData.startMinute) {
                        timeData.czasRozpoczecia = `${timeData.selectedDate} ${timeData.startHour}:${timeData.startMinute}`;
                    }
                    if (timeData.endHour && timeData.endMinute) {
                        timeData.czasZakonczenia = `${timeData.selectedDate} ${timeData.endHour}:${timeData.endMinute}`;
                    }
                }

                // Aktualizuj store i wiadomość
                const updatedData = raportStore.updateReport(interaction.user.id, timeData);

                // Aktualizuj wiadomość pokazując wybrany czas
                const components = createFormComponents(interaction.guild);
                await interaction.update({
                    content: `**Wybrane parametry czasu:**\n
📅 Data: ${updatedData.selectedDate || 'nie wybrano'}
⏰ Czas rozpoczęcia: ${updatedData.czasRozpoczecia ? updatedData.czasRozpoczecia.split(' ')[1] : 'nie wybrano'}
⏰ Czas zakończenia: ${updatedData.czasZakonczenia ? updatedData.czasZakonczenia.split(' ')[1] : 'nie wybrano'}`,
                    components: [
                        components.dateSelect,
                        components.startHourSelect,
                        components.startMinuteSelect,
                        components.endHourSelect,
                        components.endMinuteSelect
                    ]
                });
            }

            // Sprawdź czy formularz jest kompletny
            const currentData = raportStore.getReport(interaction.user.id);
            if (currentData.miejscePracy && 
                currentData.auto && 
                currentData.osobyPracujace.length > 0 && 
                currentData.kierowca &&
                typeof currentData.dieta !== 'undefined' &&
                currentData.czasRozpoczecia && 
                currentData.czasZakonczenia) {
                
                try {
                    await interaction.followUp({
                        content: 'Formularz wypełniony! Zapisuję raport...',
                        ephemeral: true
                    });

                    // Dodaj pole pracownik przed wysłaniem
                    currentData.pracownik = currentData.username;

                    await wyslijRaport(interaction, currentData);
                    raportStore.deleteReport(interaction.user.id);
                } catch (error) {
                    console.error('Błąd podczas wysyłania raportu:', error);
                    if (error.message === 'Brakuje wymaganych danych w raporcie!') {
                        await interaction.followUp({
                            content: 'Nie wszystkie pola są wypełnione. Upewnij się, że wprowadziłeś czas rozpoczęcia i zakończenia.',
                            ephemeral: true
                        });
                    } else {
                        await interaction.followUp({
                            content: 'Wystąpił błąd podczas wysyłania raportu.',
                            ephemeral: true
                        });
                    }
                }
            }
        }
    } catch (error) {
        console.error('Błąd wykonania komendy:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ 
                content: 'Wystąpił błąd podczas wykonywania komendy.', 
                ephemeral: true 
            });
        }
    }
});

// Dodaj więcej logów debugowania
client.on('ready', () => {
    console.log(`Zalogowano jako ${client.user.tag}`);
});

client.on('error', (error) => {
    console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

// Logowanie bota
console.log('Attempting to login with token...');
client.login(process.env.TOKEN).catch(error => {
    console.error('Login error:', error);
}); 

raport.js: 

// Komenda /raport do tworzenia nowych raportów
const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, TextInputBuilder, TextInputStyle } = require('discord.js');
const { MIEJSCA_PRACY, POJAZDY, CZAS } = require('../config/config');
const googleSheets = require('../utils/googleSheets');
const ChannelManager = require('../utils/channelManager');
const raportStore = require('../utils/raportDataStore');

module.exports = {
    // Definicja komendy
    data: new SlashCommandBuilder()
        .setName('raport')
        .setDescription('Utwórz nowy raport dzienny'),

    async execute(interaction) {
        // Inicjalizacja raportu w store
        raportStore.initReport(interaction.user.id, interaction.user.username);

        // Utworzenie formularza z wyborem miejsca pracy
        const miejscaPracySelect = new StringSelectMenuBuilder()
            .setCustomId('miejsce_pracy')
            .setPlaceholder('Wybierz miejsce pracy')
            .addOptions(
                MIEJSCA_PRACY.map(miejsce => ({
                    label: miejsce,
                    value: miejsce
                }))
            );

        // Utworzenie formularza z wyborem pojazdu
        const pojazdySelect = new StringSelectMenuBuilder()
            .setCustomId('auto')
            .setPlaceholder('Wybierz pojazd')
            .addOptions(
                POJAZDY.map(pojazd => ({
                    label: pojazd,
                    value: pojazd
                }))
            );

        // Pobierz członków serwera
        const czlonkowie = await pobierzCzlonkowSerwera(interaction.guild);

        // Dodajmy funkcję pomocniczą do uzupełniania opcji do minimum 5
        function uzupelnijOpcjeDoMinimum(opcje, prefix = 'Opcja') {
            const wynik = [...opcje];
            while (wynik.length < 5) {
                wynik.push({
                    label: `${prefix} ${wynik.length + 1}`,
                    value: `${prefix.toLowerCase()}_${wynik.length + 1}`,
                    default: false
                });
            }
            return wynik;
        }

        // Modyfikacja menu wyboru osób pracujących
        const osobyPracujaceSelect = new StringSelectMenuBuilder()
            .setCustomId('osoby_pracujace')
            .setPlaceholder('Wybierz osoby pracujące')
            .setMinValues(1)
            .setMaxValues(5)
            .addOptions(uzupelnijOpcjeDoMinimum(czlonkowie, 'Pracownik'));

        // Modyfikacja menu wyboru kierowcy
        const kierowcaSelect = new StringSelectMenuBuilder()
            .setCustomId('kierowca')
            .setPlaceholder('Wybierz kierowcę')
            .addOptions(uzupelnijOpcjeDoMinimum(czlonkowie, 'Kierowca'));

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

        // Tworzenie menu wyboru daty
        const dateSelect = new StringSelectMenuBuilder()
            .setCustomId('data_raportu')
            .setPlaceholder('Wybierz datę')
            .addOptions(CZAS.getDaty());

        // Tworzenie menu wyboru godziny rozpoczęcia
        const startHourSelect = new StringSelectMenuBuilder()
            .setCustomId('godzina_rozpoczecia')
            .setPlaceholder('Wybierz godzinę rozpoczęcia')
            .addOptions(CZAS.getGodziny());

        // Tworzenie menu wyboru minuty rozpoczęcia
        const startMinuteSelect = new StringSelectMenuBuilder()
            .setCustomId('minuta_rozpoczecia')
            .setPlaceholder('Wybierz minutę rozpoczęcia')
            .addOptions(CZAS.MINUTY);

        // Tworzenie menu wyboru godziny zakończenia
        const endHourSelect = new StringSelectMenuBuilder()
            .setCustomId('godzina_zakonczenia')
            .setPlaceholder('Wybierz godzinę zakończenia')
            .addOptions(CZAS.getGodziny());

        // Tworzenie menu wyboru minuty zakończenia
        const endMinuteSelect = new StringSelectMenuBuilder()
            .setCustomId('minuta_zakonczenia')
            .setPlaceholder('Wybierz minutę zakończenia')
            .addOptions(CZAS.MINUTY);

        try {
            // Modyfikacja wysyłania odpowiedzi
            await interaction.reply({
                content: 'Wypełnij formularz raportu:',
                components: [
                    new ActionRowBuilder().addComponents(miejscaPracySelect),
                    new ActionRowBuilder().addComponents(pojazdySelect),
                    new ActionRowBuilder().addComponents(osobyPracujaceSelect),
                    new ActionRowBuilder().addComponents(kierowcaSelect),
                    dietaButtons
                ],
                flags: ['Ephemeral'] // Zamiast ephemeral: true
            });

            // Wysyłamy dodatkową wiadomość z wyborem czasu
            await interaction.followUp({
                content: 'Wybierz czas pracy:',
                components: [
                    new ActionRowBuilder().addComponents(dateSelect),
                    new ActionRowBuilder().addComponents(startHourSelect),
                    new ActionRowBuilder().addComponents(startMinuteSelect),
                    new ActionRowBuilder().addComponents(endHourSelect),
                    new ActionRowBuilder().addComponents(endMinuteSelect)
                ],
                ephemeral: true
            });
        } catch (error) {
            console.error('Błąd podczas wysyłania formularza:', error);
            await interaction.reply({ 
                content: 'Wystąpił błąd podczas tworzenia formularza.', 
                flags: ['Ephemeral'] // Zamiast ephemeral: true
            });
        }
    },
    wyslijRaport,
    formatujRaport
};

// Funkcja pomocnicza do pobierania członków serwera
async function pobierzCzlonkowSerwera(guild) {
    const members = await guild.members.fetch();
    return members
        .filter(member => !member.user.bot)
        .map(member => ({
            label: member.displayName,
            value: member.displayName
        }));
}

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

raportdatastore.js

// Store do przechowywania danych raportów
const raportDataStore = new Map();

// Funkcje pomocnicze do zarządzania danymi
const store = {
    // Inicjalizacja nowego raportu
    initReport: (userId, username) => {
        const newReport = {
            userId,
            username,
            miejscePracy: '',
            czasRozpoczecia: '',
            czasZakonczenia: '',
            dieta: false,
            osobyPracujace: [],
            auto: '',
            kierowca: ''
        };
        raportDataStore.set(userId, newReport);
        return newReport;
    },

    // Pobranie danych raportu
    getReport: (userId) => {
        return raportDataStore.get(userId);
    },

    // Aktualizacja danych raportu
    updateReport: (userId, data) => {
        const currentReport = raportDataStore.get(userId);
        if (currentReport) {
            raportDataStore.set(userId, { ...currentReport, ...data });
        }
        return raportDataStore.get(userId);
    },

    // Usunięcie raportu
    deleteReport: (userId) => {
        raportDataStore.delete(userId);
    }
};

module.exports = store; 