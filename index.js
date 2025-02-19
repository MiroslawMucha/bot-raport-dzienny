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

// Dodajmy na początku pliku potrzebne importy
const { InteractionType } = require('discord.js');
const { Collection } = require('discord.js');

// Inicjalizacja klienta Discord z odpowiednimi uprawnieniami
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers
    ]
});

// Inicjalizacja kolekcji komend
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

// Załaduj komendy
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
    console.log(`Załadowano komendę: ${command.data.name}`);
}

// Obsługa eventu ready
client.once('ready', () => {
    console.log(`Zalogowano jako ${client.user.tag}`);
    console.log('Załadowane komendy:', Array.from(client.commands.keys()));
});

// Dodajemy okresowe czyszczenie nieaktywnych formularzy
setInterval(() => {
    raportStore.cleanupStaleReports();
}, 5 * 60 * 1000); // Co 5 minut

// Obsługa interakcji
client.on('interactionCreate', async interaction => {
    console.log(`Otrzymano interakcję: { type: ${interaction.type}, commandName: ${interaction.commandName}, user: '${interaction.user.username}' }`);

    try {
        // Obsługa komend slash
        if (interaction.type === InteractionType.ApplicationCommand) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error('❌ Błąd podczas wykonywania komendy:', error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ 
                        content: '❌ Wystąpił błąd podczas wykonywania komendy.',
                        ephemeral: true 
                    });
                }
            }
            return;
        }

        // Obsługa interakcji z komponentami (tak jak w raport.js)
        if (interaction.isStringSelectMenu() || interaction.isButton()) {
            const { customId } = interaction;
            
            const userData = raportStore.getReport(interaction.user.id);
            console.log('Dane użytkownika:', userData);

            if (!userData) {
                await interaction.reply({
                    content: 'Sesja wygasła. Użyj komendy ponownie.',
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
                
                // Kontynuuj formularz
                await wyslijRaport(interaction, updatedData);
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
    }
});

// Dodaj więcej logów debugowania
client.on('ready', () => {
    console.log(`Zalogowano jako ${client.user.tag}`);
    console.log('Załadowane komendy:', Array.from(client.commands.keys()));
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