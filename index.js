// Główny plik aplikacji
const { Client, GatewayIntentBits, Collection, InteractionType } = require('discord.js');
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
            else if (customId.startsWith('pojazd_')) {
                updateData.auto = interaction.values[0];
            }
            else if (customId === 'osoby_pracujace') {
                updateData.osobyPracujace = interaction.values;
            }
            else if (customId === 'kierowca') {
                updateData.kierowca = interaction.values[0];
            }
            else if (customId.startsWith('dieta_')) {
                updateData.dieta = customId === 'dieta_tak';
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
                
                await interaction.followUp({
                    content: 'Formularz wypełniony! Zapisuję raport...',
                    ephemeral: true
                });

                await wyslijRaport(interaction, currentData);
                raportStore.deleteReport(interaction.user.id);
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