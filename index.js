// Główny plik aplikacji
const { Client, GatewayIntentBits, Collection, InteractionType, ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
console.log('🔧 [CONFIG] Zmienne środowiskowe:', {
    TOKEN: !!process.env.TOKEN,
    PRIVATE_CATEGORY_ID: process.env.PRIVATE_CATEGORY_ID,
    KANAL_RAPORTY_ID: process.env.KANAL_RAPORTY_ID
});
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

// Dodajemy okresowe czyszczenie nieaktywnych formularzy
setInterval(() => {
    raportStore.cleanupStaleReports();
}, 5 * 60 * 1000); // Co 5 minut

// Obsługa interakcji (komendy slash)
client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isChatInputCommand()) {
            console.log(`👤 [BOT] ${interaction.user.username} użył /${interaction.commandName}`);
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            await command.execute(interaction);
        } 
        else if (interaction.type === InteractionType.MessageComponent) {
            const customId = interaction.customId;

            // Obsługa przycisku reset
            if (customId === 'reset_form') {
                // Wymuszamy reset
                raportStore.resetReport(interaction.user.id);

                await interaction.update({
                    content: 'Formularz został zresetowany. Możesz teraz użyć komendy /raport aby rozpocząć od nowa.',
                    components: [],
                    ephemeral: true
                });
                return;
            }

            const userData = raportStore.getReport(interaction.user.id);

            if (!userData) {
                await interaction.reply({
                    content: 'Sesja wygasła. Użyj komendy /raport ponownie.',
                    ephemeral: true
                });
                return;
            }

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
                await interaction.update({
                    content: `**Stan formularza:**\n
📍 Miejsce pracy: ${updatedData.miejscePracy || 'nie wybrano'}
🚗 Auto: ${updatedData.auto || 'nie wybrano'}
👥 Osoby pracujące: ${updatedData.osobyPracujace?.length ? updatedData.osobyPracujace.join(', ') : 'nie wybrano'}
🧑‍✈️ Kierowca: ${updatedData.kierowca || 'nie wybrano'}
💰 Dieta: ${updatedData.dieta === undefined ? 'nie wybrano' : updatedData.dieta ? 'Tak' : 'Nie'}`,
                    components: interaction.message.components.map(row => {
                        const component = row.components[0];
                        if (component.data.custom_id === customId) {
                            component.data.placeholder = `✅ Wybrano: ${interaction.values[0]}`;
                        }
                        return row;
                    })
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
💰 Dieta: ${updatedData.dieta === undefined ? 'nie wybrano' : updatedData.dieta ? 'Tak' : 'Nie'}`,
                    components: interaction.message.components.map(row => {
                        // Jeśli to rząd z przyciskami diety
                        if (row.components[0] instanceof ButtonBuilder || 
                            row.components[0].data.type === 2) { // 2 to typ dla przycisków
                            return new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId('dieta_tak')
                                        .setLabel(updatedData.dieta ? '✅ Dieta: Tak' : 'Dieta: Tak')
                                        .setStyle(updatedData.dieta ? ButtonStyle.Success : ButtonStyle.Secondary),
                                    new ButtonBuilder()
                                        .setCustomId('dieta_nie')
                                        .setLabel(!updatedData.dieta ? '✅ Dieta: Nie' : 'Dieta: Nie')
                                        .setStyle(!updatedData.dieta ? ButtonStyle.Danger : ButtonStyle.Secondary)
                                );
                        }
                        return row;
                    })
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
                    // Najpierw logujemy wybraną datę
                    console.log(`📝 [RAPORT] ${userData.username} aktualizuje: data: ${timeData.selectedDate}`);
                    
                    if (timeData.startHour && timeData.startMinute) {
                        timeData.czasRozpoczecia = `${timeData.selectedDate} ${timeData.startHour}:${timeData.startMinute}`;
                        console.log(`📝 [RAPORT] ${userData.username} aktualizuje: czas rozpoczęcia: ${timeData.startHour}:${timeData.startMinute}`);
                    }
                    if (timeData.endHour && timeData.endMinute) {
                        timeData.czasZakonczenia = `${timeData.selectedDate} ${timeData.endHour}:${timeData.endMinute}`;
                        console.log(`📝 [RAPORT] ${userData.username} aktualizuje: czas zakończenia: ${timeData.endHour}:${timeData.endMinute}`);
                    }
                }

                // Aktualizuj store używając istniejącej metody updateReport
                const updatedData = raportStore.updateReport(interaction.user.id, timeData);

                // Sprawdź czy formularz jest kompletny po aktualizacji czasu
                if (updatedData.miejscePracy && 
                    updatedData.auto && 
                    updatedData.osobyPracujace.length > 0 && 
                    updatedData.kierowca &&
                    typeof updatedData.dieta !== 'undefined' &&
                    updatedData.czasRozpoczecia && 
                    updatedData.czasZakonczenia) {
                    
                    // Sprawdź czy istnieje raport z tą samą datą
                    const istniejacyRaport = await googleSheets.znajdzRaportUzytkownika(
                        updatedData.username.toLowerCase().replace(/ /g, '_'),
                        updatedData.selectedDate
                    );

                    console.debug(`📥 [INDEX] Weryfikacja raportu: użytkownik ${updatedData.username}, data ${updatedData.selectedDate}, znaleziono: ${!!istniejacyRaport}`);

                    const buttons = [
                        new ButtonBuilder()
                            .setCustomId('wyslij_raport')
                            .setLabel('✅ Wyślij jako nowy')
                            .setStyle(ButtonStyle.Success)
                    ];

                    if (istniejacyRaport) {
                        console.log('Znaleziono istniejący raport, dodaję przycisk podmiany');
                        buttons.push(
                            new ButtonBuilder()
                                .setCustomId('podmien_raport')
                                .setLabel('🔄 Podmień istniejący')
                                .setStyle(ButtonStyle.Primary)
                        );
                    }

                    buttons.push(
                        new ButtonBuilder()
                            .setCustomId('anuluj_raport')
                            .setLabel('❌ Anuluj')
                            .setStyle(ButtonStyle.Danger)
                    );

                    const confirmationButtons = new ActionRowBuilder().addComponents(buttons);

                    await interaction.update({
                        content: `**Podsumowanie raportu:**\n
👷‍♂️ Pracownik: ${updatedData.username}
📍 Miejsce pracy: ${updatedData.miejscePracy}
⏰ Czas pracy: ${updatedData.czasRozpoczecia} - ${updatedData.czasZakonczenia}
💰 Dieta / Delegacja: ${updatedData.dieta ? 'Tak' : 'Nie'}
👥 Osoby pracujące: ${updatedData.osobyPracujace.join(', ')}
🚗 Auto: ${updatedData.auto}
🧑‍✈️ Kierowca: ${updatedData.kierowca}

Czy chcesz wysłać raport?`,
                        components: [confirmationButtons]
                    });
                } else {
                    // Pokaż tylko aktualizację czasu
                    await interaction.update({
                        content: `**Wybrane parametry czasu:**\n
📅 Data: ${updatedData.selectedDate || 'nie wybrano'}
⏰ Czas rozpoczęcia: ${updatedData.czasRozpoczecia ? updatedData.czasRozpoczecia.split(' ')[1] : 'nie wybrano'}
⏰ Czas zakończenia: ${updatedData.czasZakonczenia ? updatedData.czasZakonczenia.split(' ')[1] : 'nie wybrano'}`,
                        components: interaction.message.components.map(row => {
                            const component = row.components[0];
                            if (component.data.custom_id === customId) {
                                component.data.placeholder = `✅ Wybrano: ${interaction.values[0]}`;
                            }
                            return row;
                        })
                    });
                }
            }

            // Obsługa przycisków potwierdzenia
            else if (customId === 'wyslij_raport' || customId === 'podmien_raport' || customId === 'anuluj_raport') {
                if (customId === 'wyslij_raport') {
                    const currentData = raportStore.getReport(interaction.user.id);
                    currentData.pracownik = currentData.username;
                    
                    try {
                        // Najpierw odpowiedz na interakcję
                        await interaction.update({
                            content: 'Wysyłanie raportu...',
                            components: [] // Usuń przyciski
                        });

                        await wyslijRaport(interaction, currentData);
                        raportStore.deleteReport(interaction.user.id);
                        
                        // Teraz możemy użyć followUp
                        await interaction.followUp({
                            content: 'Raport został pomyślnie wysłany!',
                            ephemeral: true
                        });
                    } catch (error) {
                        console.error('Błąd podczas wysyłania raportu:', error);
                        await interaction.followUp({
                            content: 'Wystąpił błąd podczas wysyłania raportu.',
                            ephemeral: true
                        });
                    }
                } else if (customId === 'podmien_raport') {
                    const currentData = raportStore.getReport(interaction.user.id);
                    currentData.pracownik = currentData.username;
                    
                    try {
                        await interaction.update({
                            content: 'Aktualizowanie raportu...',
                            components: []
                        });

                        // Znajdź istniejący raport
                        const istniejacyRaport = await googleSheets.znajdzRaportUzytkownika(
                            currentData.username.toLowerCase().replace(/ /g, '_'),
                            currentData.selectedDate
                        );

                        if (istniejacyRaport) {
                            // Przenieś stary raport do historii
                            await googleSheets.przeniesDoHistorii(istniejacyRaport);
                            
                            // Wyślij nowy raport z flagą edycji i oryginalnym raportem
                            await wyslijRaport(interaction, currentData, true, istniejacyRaport);
                            raportStore.deleteReport(interaction.user.id);
                            
                            await interaction.followUp({
                                content: 'Raport został pomyślnie zaktualizowany!',
                                ephemeral: true
                            });
                        }
                    } catch (error) {
                        console.error(`❌ [INDEX] Błąd aktualizacji raportu: ${error.message}`);
                        await interaction.followUp({
                            content: 'Wystąpił błąd podczas aktualizacji raportu.',
                            ephemeral: true
                        });
                    }
                } else {
                    // Anuluj raport
                    raportStore.deleteReport(interaction.user.id);
                    
                    await interaction.update({
                        content: 'Raport anulowany. Użyj komendy /raport aby rozpocząć od nowa.',
                        components: [] // Usuń przyciski
                    });
                }
            }
        }
    } catch (error) {
        console.error(`❌ [BOT] Błąd: ${error.message}`);
        await interaction.reply({
            content: 'Wystąpił błąd podczas wykonywania tej komendy!',
            ephemeral: true
        });
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