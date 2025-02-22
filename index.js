// Główny plik aplikacji
const { Client, GatewayIntentBits, Collection, InteractionType, ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { MAX_CONCURRENT_FORMS } = require('./utils/raportDataStore');
const logger = require('./utils/logger');
const { validateTime } = require('./utils/timeValidation');
const { formatDiscordError } = require('./utils/errorHandler');
const { getDisplayName } = require('./utils/helpers');

const VERSION = '1.0.0';

// Wywołanie bannera startowego na początku
logger.drawStartupBanner(VERSION);
logger.logConfig(process.env);

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
console.log('\n📚 Ładowanie komend:');
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
    console.log(`├─ ${command.data.name} ✅`);
}
console.log('└─ Załadowano wszystkie komendy\n');

// Obsługa eventu ready
client.once('ready', () => {
    console.log(`
🤖 Bot gotowy do pracy:
├─ Nazwa:    ${client.user.tag}
├─ ID:       ${client.user.id}
├─ Serwery:  ${client.guilds.cache.size}
└─ Status:   Online
`);

    // Pokaż początkowe statystyki
    console.log(`
📊 Statystyki początkowe:
├─ Uptime:             0d 0h 0m
├─ Użyto komend:       0
├─ Utworzono raportów: 0
└─ Aktywne formularze: 0/${MAX_CONCURRENT_FORMS}
`);
});

// Dodajemy okresowe czyszczenie nieaktywnych formularzy
setInterval(() => {
    raportStore.cleanupStaleReports();
}, 5 * 60 * 1000); // Co 5 minut

// Statystyki
const stats = {
    commandsUsed: 0,
    reportsCreated: 0,
    startTime: Date.now()
};

// Funkcja do formatowania uptime
function getUptime() {
    const uptime = Date.now() - stats.startTime;
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    return `${days}d ${hours}h ${minutes}m`;
}

// Wyświetlanie statystyk co godzinę
setInterval(() => {
    console.log(`
📊 Statystyki:
├─ Uptime:           ${getUptime()}
├─ Użyto komend:     ${stats.commandsUsed}
├─ Utworzono raportów: ${stats.reportsCreated}
└─ Aktywne formularze: ${raportStore.size}/${MAX_CONCURRENT_FORMS}
`);
}, 60 * 60 * 1000);

// Obsługa interakcji (komendy slash)
client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isChatInputCommand()) {
            console.log(`👤 [BOT] ${interaction.user.username} użył /${interaction.commandName}`);
            stats.commandsUsed++;
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            const displayName = getDisplayName(interaction.user);
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
                    flags: [MessageFlags.Ephemeral]
                });
                return;
            }

            const userData = raportStore.getReport(interaction.user.id);

            if (!userData) {
                await interaction.reply({
                    content: 'Sesja wygasła. Użyj komendy /raport ponownie.',
                    flags: [MessageFlags.Ephemeral]
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
                    }),
                    flags: [MessageFlags.Ephemeral]
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
                    }),
                    flags: [MessageFlags.Ephemeral]
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
                    // Logujemy datę tylko jeśli się zmieniła
                    if (timeData.selectedDate !== userData.selectedDate) {
                        console.log(`📝 [RAPORT] ${userData.username} aktualizuje: data: ${timeData.selectedDate}`);
                    }
                    
                    if (timeData.startHour && timeData.startMinute) {
                        timeData.czasRozpoczecia = `${timeData.selectedDate} ${timeData.startHour}:${timeData.startMinute}`;
                        // Logujemy tylko jeśli czas się zmienił
                        if (timeData.czasRozpoczecia !== userData.czasRozpoczecia) {
                            console.log(`📝 [RAPORT] ${userData.username} aktualizuje: czas rozpoczęcia: ${timeData.startHour}:${timeData.startMinute}`);
                        }
                    }
                    if (timeData.endHour && timeData.endMinute) {
                        timeData.czasZakonczenia = `${timeData.selectedDate} ${timeData.endHour}:${timeData.endMinute}`;
                        console.log(`📝 [RAPORT] ${userData.username} aktualizuje: czas zakończenia: ${timeData.endHour}:${timeData.endMinute}`);
                    }
                }

                // Dodać walidację gdy mamy kompletne czasy
                if (timeData.startHour && timeData.startMinute && 
                    timeData.endHour && timeData.endMinute) {
                    
                    const timeValidation = validateTime(
                        `${timeData.startHour}:${timeData.startMinute}`,
                        `${timeData.endHour}:${timeData.endMinute}`
                    );

                    if (!timeValidation.valid) {
                        await interaction.update({
                            content: `
⚠️ **BŁĄD WALIDACJI CZASU!** ⚠️
━━━━━━━━━━━━━━━━━━━━━━━━━
❌ ${timeValidation.message}
━━━━━━━━━━━━━━━━━━━━━━━━━`,
                            components: interaction.message.components,
                            flags: [MessageFlags.Ephemeral]
                        });
                        return;
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

                    if (istniejacyRaport) {
                        console.log(`📝 [RAPORT] Znaleziono istniejący raport dla ${updatedData.username} z dnia ${updatedData.selectedDate}`);
                    }

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
                        components: [confirmationButtons],
                        flags: [MessageFlags.Ephemeral]
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
                        }),
                        flags: [MessageFlags.Ephemeral]
                    });
                }
            }

            // Obsługa przycisków potwierdzenia
            else if (customId === 'wyslij_raport' || customId === 'podmien_raport' || customId === 'anuluj_raport') {
                if (customId === 'wyslij_raport') {
                    const currentData = raportStore.getReport(interaction.user.id);
                    const timeSpent = Math.round((Date.now() - currentData.startTime) / 1000);
                    console.log(`⏱️ [RAPORT] Czas wypełniania: ${timeSpent}s`);
                    
                    currentData.pracownik = currentData.username;
                    
                    try {
                        // Najpierw odpowiedz na interakcję
                        await interaction.update({
                            content: 'Wysyłanie raportu...',
                            components: [], // Usuń przyciski
                            flags: [MessageFlags.Ephemeral]
                        });

                        const displayName = getDisplayName(interaction.user);
                        await wyslijRaport(interaction, currentData);
                        stats.reportsCreated++;
                        raportStore.deleteReport(interaction.user.id);
                        
                        // Podsumowanie wysłanego raportu
                        console.log(`
✨ [RAPORT] Wysłano raport:
├─ Autor:     ${currentData.username}
├─ Data:      ${currentData.selectedDate}
├─ Godziny:   ${currentData.czasRozpoczecia.split(' ')[1]} - ${currentData.czasZakonczenia.split(' ')[1]}
├─ Miejsce:   ${currentData.miejscePracy}
├─ Auto:      ${currentData.auto}
├─ Kierowca:  ${currentData.kierowca}
├─ Osoby:     ${currentData.osobyPracujace.join(', ')}
└─ Dieta:     ${currentData.dieta ? 'Tak' : 'Nie'}
`);

                        // Teraz możemy użyć followUp
                        await interaction.followUp({
                            content: 'Raport został pomyślnie wysłany!',
                            flags: [MessageFlags.Ephemeral]
                        });
                    } catch (error) {
                        console.error('Błąd podczas wysyłania raportu:', error);
                        await interaction.followUp({
                            content: `
⚠️ **BŁĄD!** ⚠️
━━━━━━━━━━━━━━━━━━━━━━━━━
${formatDiscordError(error)}
━━━━━━━━━━━━━━━━━━━━━━━━━`,
                            flags: [MessageFlags.Ephemeral]
                        });
                    }
                } else if (customId === 'podmien_raport') {
                    try {
                        const currentData = raportStore.getReport(interaction.user.id);
                        const timeSpent = Math.round((Date.now() - currentData.startTime) / 1000);
                        console.log(`⏱️ [RAPORT] Czas wypełniania: ${timeSpent}s`);
                        
                        currentData.pracownik = currentData.username;

                        // Najpierw odpowiadamy na interakcję, żeby Discord nie zgłaszał błędu
                        await interaction.deferUpdate();
                        
                        // Znajdź istniejące raporty
                        const istniejaceRaporty = await googleSheets.znajdzRaportyUzytkownika(
                            currentData.username.toLowerCase().replace(/ /g, '_'),
                            currentData.selectedDate
                        );

                        if (istniejaceRaporty.length > 1) {
                            console.log(`
📝 [RAPORT] Znaleziono wiele raportów:
├─ Użytkownik: ${currentData.username}
├─ Data: ${currentData.selectedDate}
└─ Liczba: ${istniejaceRaporty.length} raportów`);
                            
                            // Tworzymy przyciski wyboru dla każdego raportu
                            const buttons = istniejaceRaporty.map((raport, index) => {
                                const czasStart = raport[3].split(' ')[1];
                                const czasKoniec = raport[4].split(' ')[1];
                                const miejscePracy = raport[2];
                                return new ButtonBuilder()
                                    .setCustomId(`wybierz_raport_${index}`)
                                    .setLabel(`${index + 1}. ${miejscePracy} (${czasStart}-${czasKoniec})`)
                                    .setStyle(ButtonStyle.Primary);
                            });

                            // Dodajemy przycisk anulowania
                            buttons.push(
                                new ButtonBuilder()
                                    .setCustomId('anuluj_wybor_raportu')
                                    .setLabel('0. ❌ Anuluj wybór')
                                    .setStyle(ButtonStyle.Danger)
                            );

                            // Dzielimy przyciski na rzędy (max 5 przycisków na rząd)
                            const rows = [];
                            for (let i = 0; i < buttons.length; i += 5) {
                                rows.push(
                                    new ActionRowBuilder().addComponents(buttons.slice(i, i + 5))
                                );
                            }

                            // Aktualizujemy oryginalną wiadomość
                            await interaction.editReply({
                                content: `
📝 **Znaleziono ${istniejaceRaporty.length} raporty z dnia ${currentData.selectedDate}**

Wybierz, który raport chcesz zaktualizować:

${istniejaceRaporty.map((raport, index) => {
    const czasStart = raport[3].split(' ')[1];
    const czasKoniec = raport[4].split(' ')[1];
    const miejscePracy = raport[2];
    return `**${index + 1}. ${miejscePracy}**
⏰ ${czasStart}-${czasKoniec}`;
}).join('\n\n')}

⚠️ Wybrany raport zostanie przeniesiony do historii i zastąpiony nowym.
❌ Wybierz "0. Anuluj wybór" aby przerwać edycję.`,
                                components: rows,
                                flags: [MessageFlags.Ephemeral]
                            });

                        } else if (istniejaceRaporty.length === 1) {
                            // Istniejąca logika dla pojedynczego raportu
                            await googleSheets.przeniesDoHistorii(istniejaceRaporty[0]);
                            await wyslijRaport(interaction, currentData, true, istniejaceRaporty[0]);
                            raportStore.deleteReport(interaction.user.id);
                            
                            // Podsumowanie edytowanego raportu
                            console.log(`
🔄 [RAPORT] Edytowano raport:
├─ Autor:     ${currentData.username}
├─ Data:      ${currentData.selectedDate}
├─ Godziny:   ${currentData.czasRozpoczecia.split(' ')[1]} - ${currentData.czasZakonczenia.split(' ')[1]}
├─ Miejsce:   ${currentData.miejscePracy}
├─ Auto:      ${currentData.auto}
├─ Kierowca:  ${currentData.kierowca}
├─ Osoby:     ${currentData.osobyPracujace.join(', ')}
└─ Dieta:     ${currentData.dieta ? 'Tak' : 'Nie'}
`);
                            
                            await interaction.editReply({
                                content: 'Raport został pomyślnie zaktualizowany!',
                                components: [],
                                flags: [MessageFlags.Ephemeral]
                            });
                        } else {
                            console.log(`❌ [RAPORT] Nie znaleziono raportu do aktualizacji dla ${currentData.username}`);
                            await interaction.editReply({
                                content: 'Nie znaleziono raportu do aktualizacji.',
                                components: [],
                                flags: [MessageFlags.Ephemeral]
                            });
                        }
                    } catch (error) {
                        console.error(`❌ [INDEX] ${formatDiscordError(error)}`);
                        if (!interaction.deferred) {
                            await interaction.deferUpdate();
                        }
                        await interaction.followUp({
                            content: formatDiscordError(error),
                            flags: [MessageFlags.Ephemeral]
                        });
                    }
                } else {
                    // Anuluj raport
                    raportStore.deleteReport(interaction.user.id);
                    console.log(`❌ [RAPORT] ${interaction.user.username} anulował raport`);
                    
                    await interaction.update({
                        content: 'Raport anulowany. Użyj komendy /raport aby rozpocząć od nowa.',
                        components: [], // Usuń przyciski
                        flags: [MessageFlags.Ephemeral]
                    });
                }
            } else if (customId.startsWith('wybierz_raport_')) {
                const index = parseInt(customId.split('_').pop());
                const currentData = raportStore.getReport(interaction.user.id);
                const istniejaceRaporty = await googleSheets.znajdzRaportyUzytkownika(
                    currentData.username.toLowerCase().replace(/ /g, '_'),
                    currentData.selectedDate
                );

                if (istniejaceRaporty[index]) {
                    try {
                        await interaction.update({
                            content: 'Aktualizowanie wybranego raportu...',
                            components: [],
                            flags: [MessageFlags.Ephemeral]
                        });

                        await googleSheets.przeniesDoHistorii(istniejaceRaporty[index]);
                        await wyslijRaport(interaction, currentData, true, istniejaceRaporty[index]);
                        raportStore.deleteReport(interaction.user.id);

                        await interaction.followUp({
                            content: 'Raport został pomyślnie zaktualizowany!',
                            flags: [MessageFlags.Ephemeral]
                        });
                    } catch (error) {
                        console.error('❌ Błąd podczas aktualizacji raportu:', error);
                        await interaction.followUp({
                            content: `
⚠️ **BŁĄD!** ⚠️
━━━━━━━━━━━━━━━━━━━━━━━━━
${formatDiscordError(error)}
━━━━━━━━━━━━━━━━━━━━━━━━━`,
                            flags: [MessageFlags.Ephemeral]
                        });
                    }
                }
            } else if (customId === 'anuluj_wybor_raportu') {
                raportStore.deleteReport(interaction.user.id);
                await interaction.update({
                    content: 'Anulowano wybór raportu. Użyj komendy /raport aby rozpocząć od nowa.',
                    components: [],
                    flags: [MessageFlags.Ephemeral]
                });
            }
        }
    } catch (error) {
        console.error(`❌ [BOT] Błąd: ${error.message}`);
        await interaction.reply({
            content: 'Wystąpił błąd podczas wykonywania tej komendy!',
            flags: [MessageFlags.Ephemeral]
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
console.log('🔑 Logowanie do Discord...');
client.login(process.env.TOKEN).catch(error => {
    console.error('❌ Błąd logowania:', error.message);
});

// Obsługa graceful shutdown
process.on('SIGINT', () => {
    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛑 Bot kończy pracę...
├─ Uptime:             ${getUptime()}
├─ Użyto komend:       ${stats.commandsUsed}
├─ Utworzono raportów: ${stats.reportsCreated}
└─ Aktywne formularze: ${raportStore.size}/${MAX_CONCURRENT_FORMS}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
    process.exit(0);
}); 