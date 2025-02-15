// Główny plik aplikacji
const { Client, GatewayIntentBits, Collection, InteractionType, ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, StringSelectMenuBuilder } = require('discord.js');
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

            const customId = interaction.customId;
            let updateData = {};

            if (customId.startsWith('miejsce_')) {
                updateData.miejscePracy = interaction.values[0];
            } 
            else if (customId === 'auto') {
                updateData.auto = interaction.values[0];
                console.log('Wybrane auto:', updateData.auto);
            }
            else if (customId === 'osoby_pracujace') {
                updateData.osobyPracujace = interaction.values;
                console.log('Wybrane osoby:', updateData.osobyPracujace);
            }
            else if (customId === 'kierowca') {
                updateData.kierowca = interaction.values[0];
                console.log('Wybrany kierowca:', updateData.kierowca);
            }
            else if (customId.startsWith('dieta_')) {
                updateData.dieta = customId === 'dieta_tak';
            }
            else if (customId === 'czas_rozpoczecia' || customId === 'czas_zakonczenia') {
                // Pobierz dzisiejszą datę
                const today = new Date();
                const dd = String(today.getDate()).padStart(2, '0');
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const yyyy = today.getFullYear();

                // Utwórz listę dat (dzisiaj i 6 dni wstecz)
                const dates = [];
                for (let i = 0; i < 7; i++) {
                    const date = new Date();
                    date.setDate(today.getDate() - i);
                    const formattedDate = `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
                    dates.push({
                        label: i === 0 ? `Dzisiaj (${formattedDate})` : formattedDate,
                        value: formattedDate
                    });
                }

                // Utwórz listę godzin (od 6:00 do 22:00)
                const hours = [];
                for (let i = 6; i <= 22; i++) {
                    const hour = String(i).padStart(2, '0');
                    hours.push({
                        label: `${hour}:00`,
                        value: `${hour}:00`
                    });
                    hours.push({
                        label: `${hour}:30`,
                        value: `${hour}:30`
                    });
                }

                const dateSelect = new StringSelectMenuBuilder()
                    .setCustomId(`date_${customId}`)
                    .setPlaceholder('Wybierz datę')
                    .addOptions(dates);

                const timeSelect = new StringSelectMenuBuilder()
                    .setCustomId(`time_${customId}`)
                    .setPlaceholder('Wybierz godzinę')
                    .addOptions(hours);

                const components = [
                    new ActionRowBuilder().addComponents(dateSelect),
                    new ActionRowBuilder().addComponents(timeSelect)
                ];

                await interaction.reply({
                    content: customId === 'czas_rozpoczecia' ? 
                        'Wybierz datę i godzinę rozpoczęcia:' : 
                        'Wybierz datę i godzinę zakończenia:',
                    components: components,
                    ephemeral: true
                });
            }
            // Obsługa wyboru daty
            else if (customId.startsWith('date_czas_')) {
                const selectedDate = interaction.values[0];
                const timeData = raportStore.getReport(interaction.user.id);
                const isStartTime = customId.includes('rozpoczecia');
                
                if (isStartTime) {
                    timeData.tempStartDate = selectedDate;
                } else {
                    timeData.tempEndDate = selectedDate;
                }
                
                raportStore.updateReport(interaction.user.id, timeData);
                await interaction.deferUpdate();
            }
            // Obsługa wyboru godziny
            else if (customId.startsWith('time_czas_')) {
                const selectedTime = interaction.values[0];
                const timeData = raportStore.getReport(interaction.user.id);
                const isStartTime = customId.includes('rozpoczecia');
                
                if (isStartTime) {
                    if (timeData.tempStartDate) {
                        updateData.czasRozpoczecia = `${timeData.tempStartDate} ${selectedTime}`;
                        delete timeData.tempStartDate;
                    }
                } else {
                    if (timeData.tempEndDate) {
                        updateData.czasZakonczenia = `${timeData.tempEndDate} ${selectedTime}`;
                        delete timeData.tempEndDate;
                    }
                }

                const updatedData = raportStore.updateReport(interaction.user.id, updateData);
                await interaction.reply({
                    content: `Zapisano ${isStartTime ? 'czas rozpoczęcia' : 'czas zakończenia'}: ${isStartTime ? updatedData.czasRozpoczecia : updatedData.czasZakonczenia}`,
                    ephemeral: true
                });
            }

            if (Object.keys(updateData).length > 0) {
                const updatedData = raportStore.updateReport(interaction.user.id, updateData);
                console.log('Zaktualizowane dane:', updatedData);
                
                try {
                    await interaction.deferUpdate();
                    await interaction.editReply({
                        content: `Zapisano wybór: ${JSON.stringify(updateData)}`,
                        components: interaction.message.components
                    });
                } catch (error) {
                    console.error('Błąd aktualizacji interakcji:', error);
                }
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