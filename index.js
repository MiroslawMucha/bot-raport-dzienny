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

// Dodaj import konfiguracji na początku pliku
const { MIEJSCA_PRACY, POJAZDY, CZAS } = require('./config/config');

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
            
            if (!userData) {
                await interaction.reply({
                    content: 'Sesja wygasła. Użyj komendy ponownie.',
                    ephemeral: true
                });
                return;
            }

            // Dodaj sprawdzenie czy to edycja
            const isEdit = userData.isEdit;
            
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
🚗 Auto: ${updatedData.auto || 'nie wybrano'}
👥 Osoby pracujące: ${updatedData.osobyPracujace?.length ? updatedData.osobyPracujace.join(', ') : 'nie wybrano'}
🧑‍✈️ Kierowca: ${updatedData.kierowca || 'nie wybrano'}
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

                    await wyslijRaport(interaction, currentData, isEdit);
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