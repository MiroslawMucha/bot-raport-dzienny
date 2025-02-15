// Główny plik aplikacji
const { Client, GatewayIntentBits, Collection, InteractionType, ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle } = require('discord.js');
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
const { wyslijRaport } = require('./commands/raport');

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
                const modal = new ModalBuilder()
                    .setCustomId(`modal_${customId}`)
                    .setTitle(customId === 'czas_rozpoczecia' ? 'Czas rozpoczęcia' : 'Czas zakończenia');

                // Pole na datę
                const dateInput = new TextInputBuilder()
                    .setCustomId('date_input')
                    .setLabel('Data (format: DD.MM.YYYY)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('np. 15.02.2024')
                    .setRequired(true);

                // Pole na godzinę
                const timeInput = new TextInputBuilder()
                    .setCustomId('time_input')
                    .setLabel('Godzina (format: HH:MM)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('np. 07:30')
                    .setRequired(true);

                const dateRow = new ActionRowBuilder().addComponents(dateInput);
                const timeRow = new ActionRowBuilder().addComponents(timeInput);

                modal.addComponents(dateRow, timeRow);
                await interaction.showModal(modal);
            }
            // Obsługa modalu z czasem
            else if (customId.startsWith('modal_czas_')) {
                const date = interaction.fields.getTextInputValue('date_input');
                const time = interaction.fields.getTextInputValue('time_input');
                const fullDateTime = `${date} ${time}`;

                if (customId.includes('rozpoczecia')) {
                    updateData.czasRozpoczecia = fullDateTime;
                } else {
                    updateData.czasZakonczenia = fullDateTime;
                }

                // Walidacja formatu daty i czasu
                const dateTimeRegex = /^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/;
                if (!dateTimeRegex.test(fullDateTime)) {
                    await interaction.reply({
                        content: 'Nieprawidłowy format daty lub czasu. Użyj formatów: DD.MM.YYYY i HH:MM',
                        ephemeral: true
                    });
                    return;
                }
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
                typeof currentData.dieta !== 'undefined') {
                
                try {
                    await interaction.followUp({
                        content: 'Formularz wypełniony! Zapisuję raport...',
                        ephemeral: true
                    });

                    await wyslijRaport(interaction, currentData);
                    raportStore.deleteReport(interaction.user.id);
                } catch (error) {
                    console.error('Błąd podczas wysyłania raportu:', error);
                    await interaction.followUp({
                        content: 'Wystąpił błąd podczas wysyłania raportu.',
                        ephemeral: true
                    });
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

// Dodajmy funkcję wyslijRaport
async function wyslijRaport(interaction, raportData) {
    // Zapisanie do Google Sheets
    const zapisano = await googleSheets.dodajRaport(raportData);

    if (zapisano) {
        // Formatowanie wiadomości raportu
        const raportMessage = formatujRaport(raportData, false);

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