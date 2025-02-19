// Skrypt do rejestracji komend slash
const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

// Funkcja do wdrożenia komend
(async () => {
    try {
        console.log('Rozpoczęto odświeżanie komend slash (/)...');

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log('Pomyślnie odświeżono komendy slash (/)!');
    } catch (error) {
        console.error(error);
    }
})(); 