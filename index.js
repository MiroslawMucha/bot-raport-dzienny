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

// Na początku pliku, dodaj import konfiguracji
const { MIEJSCA_PRACY, POJAZDY } = require('./config/config');

// Dodajmy brakujące importy na początku pliku
const { 
    pobierzCzlonkowSerwera 
} = require('./utils/timeValidation');

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

// Dodaj import funkcji z edytujRaport.js
const { 
    handleBasicEdit, 
    handleOsobyEdit, 
    handleCzasEdit, 
    validateAndSaveChanges 
} = require('./commands/edytujRaport');

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
        // Obsługa komend slash
        if (interaction.type === InteractionType.ApplicationCommand) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error('Błąd podczas wykonywania komendy:', error);
                const errorMessage = '❌ Wystąpił błąd podczas wykonywania komendy.';
                
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: errorMessage, ephemeral: true });
                } else {
                    await interaction.followUp({ content: errorMessage, ephemeral: true });
                }
            }
            return;
        }

        // Obsługa interakcji z komponentami (select menu, buttons)
        if (interaction.isStringSelectMenu() || interaction.isButton()) {
            const { customId } = interaction;
            
            // Obsługa wyboru raportu do edycji
            if (customId === 'select_raport_to_edit') {
                const selectedRowIndex = interaction.values[0];
                const editableReports = await googleSheets.getEditableReports(
                    interaction.user.username
                );
                
                const selectedReport = editableReports.find(
                    r => r.rowIndex.toString() === selectedRowIndex
                );

                if (selectedReport) {
                    // Inicjalizacja sesji edycji
                    raportStore.initEditSession(interaction.user.id, selectedReport);

                    // Pokaż pierwszy formularz edycji
                    const miejscaPracySelect = new StringSelectMenuBuilder()
                        .setCustomId('miejsce_pracy')
                        .setPlaceholder('Wybierz miejsce pracy')
                        .addOptions(MIEJSCA_PRACY.map(miejsce => ({
                            label: miejsce,
                            value: miejsce,
                            default: miejsce === selectedReport.miejscePracy
                        })));

                    const row = new ActionRowBuilder().addComponents(miejscaPracySelect);

                    await interaction.update({
                        content: `**Edycja raportu z ${selectedReport.data}**\n\nAktualne miejsce pracy: ${selectedReport.miejscePracy}\nWybierz nowe miejsce pracy lub pozostaw bez zmian:`,
                        components: [row],
                        ephemeral: true
                    });
                }
            }
            // Obsługa zmiany miejsca pracy
            else if (customId === 'miejsce_pracy') {
                const editSession = raportStore.getReport(interaction.user.id);
                if (!editSession?.isEditing) return;

                // Aktualizuj miejsce pracy
                const miejscePracy = interaction.values[0];
                raportStore.updateReport(interaction.user.id, { miejscePracy });

                // Pokaż wybór auta
                const autoSelect = new StringSelectMenuBuilder()
                    .setCustomId('auto')
                    .setPlaceholder('Wybierz auto')
                    .addOptions(POJAZDY.map(auto => ({
                        label: auto,
                        value: auto,
                        default: auto === editSession.auto
                    })));

                const row = new ActionRowBuilder().addComponents(autoSelect);

                await interaction.update({
                    content: `**Edycja raportu**\nMiejsce pracy: ${miejscePracy}\n\nWybierz auto:`,
                    components: [row],
                    ephemeral: true
                });
            }
        }
    } catch (error) {
        console.error('Błąd podczas obsługi interakcji:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ Wystąpił błąd podczas przetwarzania.',
                ephemeral: true
            });
        }
        raportStore.deleteReport(interaction.user.id);
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