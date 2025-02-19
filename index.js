// Główny plik aplikacji
const { Client, GatewayIntentBits, Collection, InteractionType } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Logi konfiguracji
console.log('🔧 [CONFIG] Zmienne środowiskowe:', {
    TOKEN: !!process.env.TOKEN,
    PRIVATE_CATEGORY_ID: process.env.PRIVATE_CATEGORY_ID,
    KANAL_RAPORTY_ID: process.env.KANAL_RAPORTY_ID
});

// Importy modułów
const { MIEJSCA_PRACY, POJAZDY } = require('./config/config');
const { pobierzCzlonkowSerwera } = require('./utils/timeValidation');
const raportStore = require('./utils/raportDataStore');
const { wyslijRaport } = require('./commands/raport');
const googleSheets = require('./utils/googleSheets');
const ChannelManager = require('./utils/channelManager');

// Inicjalizacja klienta Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers
    ]
});

// Inicjalizacja kolekcji komend
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    client.commands.set(command.data.name, command);
    console.log('Załadowano komendę:', command.data.name);
}

// Obsługa interakcji
client.on('interactionCreate', async interaction => {
    console.log(`Otrzymano interakcję: { type: ${interaction.type}, commandName: ${interaction.commandName}, user: '${interaction.user.username}' }`);

    try {
        // Obsługa komend slash
        if (interaction.type === InteractionType.ApplicationCommand) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            await command.execute(interaction);
            return;
        }

        // Obsługa interakcji z komponentami
        if (interaction.isStringSelectMenu() || interaction.isButton()) {
            const userData = raportStore.getReport(interaction.user.id);
            if (!userData) {
                await interaction.reply({
                    content: 'Sesja wygasła. Użyj komendy ponownie.',
                    ephemeral: true
                });
                return;
            }

            // Przekazujemy obsługę do wyslijRaport z raport.js
            await wyslijRaport(interaction, userData);
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

// Czyszczenie nieaktywnych formularzy
setInterval(() => {
    raportStore.cleanupStaleReports();
}, 5 * 60 * 1000);

// Obsługa zdarzeń
client.once('ready', () => {
    console.log(`Zalogowano jako ${client.user.tag}`);
    console.log('Załadowane komendy:', Array.from(client.commands.keys()));
});

client.on('error', (error) => {
    console.error('Discord client error:', error);
});

// Logowanie bota
client.login(process.env.TOKEN).catch(error => {
    console.error('Login error:', error);
});