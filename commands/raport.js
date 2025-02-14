// Komenda /raport do tworzenia nowych raportów
const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { MIEJSCA_PRACY, POJAZDY } = require('../config/config');
const googleSheets = require('../utils/googleSheets');
const ChannelManager = require('../utils/channelManager');

module.exports = {
    // Definicja komendy
    data: new SlashCommandBuilder()
        .setName('raport')
        .setDescription('Utwórz nowy raport dzienny'),

    async execute(interaction) {
        // Utworzenie formularza z wyborem miejsca pracy
        const miejscaPracySelect = new StringSelectMenuBuilder()
            .setCustomId('miejsce_pracy')
            .setPlaceholder('Wybierz miejsce pracy')
            .addOptions(
                MIEJSCA_PRACY.map(miejsce => ({
                    label: miejsce,
                    value: miejsce
                }))
            );

        // Utworzenie formularza z wyborem pojazdu
        const pojazdySelect = new StringSelectMenuBuilder()
            .setCustomId('pojazd')
            .setPlaceholder('Wybierz pojazd')
            .addOptions(
                POJAZDY.map(pojazd => ({
                    label: pojazd,
                    value: pojazd
                }))
            );

        // Przyciski do wyboru diety
        const dietaButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('dieta_tak')
                    .setLabel('Dieta: Tak')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('dieta_nie')
                    .setLabel('Dieta: Nie')
                    .setStyle(ButtonStyle.Danger)
            );

        // Dodaj nową funkcję do pobierania członków serwera
        async function pobierzCzlonkowSerwera(guild) {
            const members = await guild.members.fetch();
            return members
                .filter(member => !member.user.bot)
                .map(member => ({
                    label: member.displayName,
                    value: member.id
                }));
        }

        // W funkcji execute dodaj nowe pola formularza:
        const czlonkowie = await pobierzCzlonkowSerwera(interaction.guild);

        const osobyPracujaceSelect = new StringSelectMenuBuilder()
            .setCustomId('osoby_pracujace')
            .setPlaceholder('Wybierz osoby pracujące')
            .setMinValues(1)
            .setMaxValues(Math.min(czlonkowie.length, 25))
            .addOptions(czlonkowie);

        const kierowcaSelect = new StringSelectMenuBuilder()
            .setCustomId('kierowca')
            .setPlaceholder('Wybierz kierowcę')
            .addOptions(czlonkowie);

        // Wysłanie formularza
        await interaction.reply({
            content: 'Wypełnij formularz raportu:',
            components: [
                new ActionRowBuilder().addComponents(miejscaPracySelect),
                new ActionRowBuilder().addComponents(pojazdySelect),
                new ActionRowBuilder().addComponents(osobyPracujaceSelect),
                new ActionRowBuilder().addComponents(kierowcaSelect),
                dietaButtons
            ],
            ephemeral: true
        });

        // Kolektor do zbierania odpowiedzi
        const filter = i => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({
            filter,
            time: 300000 // 5 minut na wypełnienie
        });

        // Obiekt do przechowywania danych raportu
        const raportData = {
            pracownik: interaction.user.tag,
            czasRozpoczecia: '',
            czasZakonczenia: '',
            dieta: false,
            osobyPracujace: [],
            auto: '',
            kierowca: ''
        };

        // Obsługa odpowiedzi
        collector.on('collect', async i => {
            switch (i.customId) {
                case 'miejsce_pracy':
                    raportData.miejscePracy = i.values[0];
                    break;
                case 'pojazd':
                    raportData.auto = i.values[0];
                    break;
                case 'dieta_tak':
                    raportData.dieta = true;
                    break;
                case 'dieta_nie':
                    raportData.dieta = false;
                    break;
                case 'osoby_pracujace':
                    raportData.osobyPracujace = i.values.map(value => czlonkowie.find(c => c.value === value).label);
                    break;
                case 'kierowca':
                    raportData.kierowca = i.values[0];
                    break;
            }

            await i.update({ content: 'Zapisano wybór!' });

            // Sprawdzenie czy wszystkie dane są wypełnione
            if (raportData.miejscePracy && raportData.auto && typeof raportData.dieta !== 'undefined' && raportData.osobyPracujace.length > 0 && raportData.kierowca) {
                collector.stop();
                await wyslijRaport(interaction, raportData);
            }
        });
    }
};

// Funkcja wysyłająca raport
async function wyslijRaport(interaction, raportData) {
    // Zapisanie do Google Sheets
    const zapisano = await googleSheets.dodajRaport(raportData);

    if (zapisano) {
        // Formatowanie wiadomości raportu
        const raportMessage = formatujRaport(raportData, false); // false = nie jest edycją

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

// Funkcja formatująca raport do wiadomości Discord
function formatujRaport(raportData, isEdit = false, originalDate = null) {
    const header = isEdit ? 
        `🛠 **RAPORT DZIENNY – EDYCJA** (Oryginalny wpis: ${originalDate})` :
        `📌 **RAPORT DZIENNY – ORYGINAŁ**`;

    return `
${header}
👷‍♂️ Pracownik: ${raportData.pracownik}
📍 Miejsce pracy: ${raportData.miejscePracy}
⏳ Czas pracy: ${raportData.czasRozpoczecia} - ${raportData.czasZakonczenia}
💰 Dieta / Delegacja: ${raportData.dieta ? 'Tak' : 'Nie'}
👥 Osoby pracujące: ${raportData.osobyPracujace.join(', ')}
🚗 Auto: ${raportData.auto}
🧑‍✈️ Kierowca: ${raportData.kierowca}
    `.trim();
} 