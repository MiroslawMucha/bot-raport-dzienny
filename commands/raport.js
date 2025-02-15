// Komenda /raport do tworzenia nowych raportów
const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, TextInputBuilder, TextInputStyle } = require('discord.js');
const { MIEJSCA_PRACY, POJAZDY } = require('../config/config');
const googleSheets = require('../utils/googleSheets');
const ChannelManager = require('../utils/channelManager');
const raportDataStore = require('../utils/raportDataStore');

module.exports = {
    // Definicja komendy
    data: new SlashCommandBuilder()
        .setName('raport')
        .setDescription('Utwórz nowy raport dzienny'),

    async execute(interaction) {
        const raportData = raportDataStore.get(interaction.user.id);

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

        // Dodaj timeInputs do listy komponentów w interaction.reply
        const timeInputs = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('czas_rozpoczecia')
                    .setLabel('Ustaw czas rozpoczęcia')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('czas_zakonczenia')
                    .setLabel('Ustaw czas zakończenia')
                    .setStyle(ButtonStyle.Primary)
            );

        try {
            await interaction.reply({
                content: 'Wypełnij formularz raportu (Krok 1/2):',
                components: [
                    new ActionRowBuilder().addComponents(miejscaPracySelect),
                    new ActionRowBuilder().addComponents(pojazdySelect),
                    new ActionRowBuilder().addComponents(osobyPracujaceSelect),
                    new ActionRowBuilder().addComponents(kierowcaSelect),
                    new ActionRowBuilder().addComponents(timeInputs)
                ],
                ephemeral: true
            });
        } catch (error) {
            console.error('Błąd podczas wysyłania formularza:', error);
            await interaction.reply({ 
                content: 'Wystąpił błąd podczas tworzenia formularza.', 
                ephemeral: true 
            });
        }

        // Po wybraniu pierwszych opcji, wyślij drugi etap
        if (raportData.miejscePracy && raportData.auto && raportData.osobyPracujace.length > 0 && raportData.kierowca) {
            await interaction.followUp({
                content: 'Krok 2/2 - Wybierz dietę:',
                components: [dietaButtons],
                ephemeral: true
            });
        }

        // Kolektor do zbierania odpowiedzi
        const filter = i => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({
            filter,
            time: 300000 // 5 minut na wypełnienie
        });

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
                case 'czas_rozpoczecia':
                case 'czas_zakonczenia':
                    await i.reply({
                        content: `Wpisz ${i.customId === 'czas_rozpoczecia' ? 'czas rozpoczęcia' : 'czas zakończenia'} w formacie HH:mm (np. 08:30):`,
                        ephemeral: true
                    });
                
                const filter = m => {
                    return m.author.id === interaction.user.id && 
                           /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(m.content);
                };
                
                try {
                    const collected = await interaction.channel.awaitMessages({
                        filter,
                        max: 1,
                        time: 30000,
                        errors: ['time']
                    });
                    
                    const czas = collected.first().content;
                    if (i.customId === 'czas_rozpoczecia') {
                        raportData.czasRozpoczecia = czas;
                    } else {
                        raportData.czasZakonczenia = czas;
                    }
                    
                    await collected.first().reply({
                        content: `Ustawiono ${i.customId === 'czas_rozpoczecia' ? 'czas rozpoczęcia' : 'czas zakończenia'} na ${czas}`,
                        ephemeral: true
                    });
                } catch (error) {
                    await interaction.followUp({
                        content: 'Nie podano czasu w wymaganym formacie lub upłynął czas na odpowiedź.',
                        ephemeral: true
                    });
                }
            }

            await i.update({ content: 'Zapisano wybór!' });

            // Sprawdzenie czy wszystkie dane są wypełnione
            if (raportData.miejscePracy && 
                raportData.auto && 
                typeof raportData.dieta !== 'undefined' && 
                raportData.osobyPracujace.length > 0 && 
                raportData.kierowca &&
                raportData.czasRozpoczecia &&
                raportData.czasZakonczenia) {
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