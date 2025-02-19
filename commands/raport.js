// Komenda /raport do tworzenia nowych raportów
const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, TextInputBuilder, TextInputStyle } = require('discord.js');
const { MIEJSCA_PRACY, POJAZDY, CZAS } = require('../config/config');
const googleSheets = require('../utils/googleSheets');
const ChannelManager = require('../utils/channelManager');
const raportStore = require('../utils/raportDataStore');

module.exports = {
    // Definicja komendy
    data: new SlashCommandBuilder()
        .setName('raport')
        .setDescription('Utwórz nowy raport dzienny'),

    async execute(interaction) {
        try {
            // Miejsce pracy
            const miejscaPracySelect = new StringSelectMenuBuilder()
                .setCustomId('miejsce_pracy')
                .setPlaceholder('Wybierz miejsce pracy')
                .addOptions(
                    MIEJSCA_PRACY.map(miejsce => ({
                        label: miejsce,
                        value: miejsce
                    }))
                );

            // Pojazdy
            const pojazdySelect = new StringSelectMenuBuilder()
                .setCustomId('auto')
                .setPlaceholder('Wybierz pojazd')
                .addOptions(
                    POJAZDY.map(pojazd => ({
                        label: pojazd,
                        value: pojazd
                    }))
                );

            // Osoby pracujące
            const osobyPracujaceSelect = new StringSelectMenuBuilder()
                .setCustomId('osoby_pracujace')
                .setPlaceholder('Wybierz osoby pracujące')
                .setMinValues(1)
                .setMaxValues(5);

            // Kierowca
            const kierowcaSelect = new StringSelectMenuBuilder()
                .setCustomId('kierowca')
                .setPlaceholder('Wybierz kierowcę');

            // Przyciski diety
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

            // Czas
            const dateSelect = new StringSelectMenuBuilder()
                .setCustomId('data_raportu')
                .setPlaceholder('Wybierz datę')
                .addOptions(CZAS.getDaty());

            const startHourSelect = new StringSelectMenuBuilder()
                .setCustomId('godzina_rozpoczecia')
                .setPlaceholder('Wybierz godzinę rozpoczęcia')
                .addOptions(CZAS.getGodziny());

            const startMinuteSelect = new StringSelectMenuBuilder()
                .setCustomId('minuta_rozpoczecia')
                .setPlaceholder('Wybierz minutę rozpoczęcia')
                .addOptions(CZAS.MINUTY);

            const endHourSelect = new StringSelectMenuBuilder()
                .setCustomId('godzina_zakonczenia')
                .setPlaceholder('Wybierz godzinę zakończenia')
                .addOptions(CZAS.getGodziny());

            const endMinuteSelect = new StringSelectMenuBuilder()
                .setCustomId('minuta_zakonczenia')
                .setPlaceholder('Wybierz minutę zakończenia')
                .addOptions(CZAS.MINUTY);

            // Pobierz członków serwera dla listy osób pracujących i kierowców
            const members = await pobierzCzlonkowSerwera(interaction.guild);
            osobyPracujaceSelect.addOptions(members);
            kierowcaSelect.addOptions(members);

            // Modyfikacja wysyłania odpowiedzi
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

            // Wysyłamy dodatkową wiadomość z wyborem czasu
            await interaction.followUp({
                content: 'Wybierz czas pracy:',
                components: [
                    new ActionRowBuilder().addComponents(dateSelect),
                    new ActionRowBuilder().addComponents(startHourSelect),
                    new ActionRowBuilder().addComponents(startMinuteSelect),
                    new ActionRowBuilder().addComponents(endHourSelect),
                    new ActionRowBuilder().addComponents(endMinuteSelect)
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
    },
    wyslijRaport,
    formatujRaport
};

// Funkcja pomocnicza do pobierania członków serwera
async function pobierzCzlonkowSerwera(guild) {
    const members = await guild.members.fetch();
    return members
        .filter(member => !member.user.bot)
        .map(member => ({
            label: member.displayName,
            value: member.displayName
        }));
}

// Modyfikacja funkcji wyslijRaport aby obsługiwała tryb edycji
async function wyslijRaport(interaction, raportData, isEdit = false) {
    let zapisano;
    
    if (isEdit) {
        // Jeśli to edycja, używamy aktualizujRaportZHistoria
        const result = await googleSheets.aktualizujRaportZHistoria(raportData.id, raportData);
        zapisano = result.success;
        if (zapisano) {
            raportData.id = result.newId; // Aktualizujemy ID o nowy numer edycji
        }
    } else {
        // Jeśli to nowy raport, używamy standardowego dodajRaport
        zapisano = await googleSheets.dodajRaport(raportData);
    }

    if (zapisano) {
        // Formatowanie wiadomości raportu
        const raportMessage = formatujRaport(raportData, isEdit);

        // Wysłanie na główny kanał raportów
        const kanalRaporty = interaction.guild.channels.cache.get(process.env.KANAL_RAPORTY_ID);
        await kanalRaporty.send(raportMessage);

        // Pobranie lub utworzenie prywatnego kanału użytkownika
        const kanalPrywatny = await ChannelManager.getOrCreateUserChannel(
            interaction.guild,
            interaction.user
        );

        if (isEdit) {
            // Jeśli to edycja, dodaj informację o aktualizacji
            await kanalPrywatny.send('⚠️ Poprzedni raport został zaktualizowany ⚠️');
        }

        // Wysłanie na prywatny kanał użytkownika
        await kanalPrywatny.send(raportMessage);

        // Wysłanie potwierdzenia
        await interaction.followUp({
            content: isEdit ? 
                'Raport został pomyślnie zaktualizowany!' : 
                'Raport został pomyślnie zapisany!',
            ephemeral: true
        });
    } else {
        await interaction.followUp({
            content: isEdit ?
                'Wystąpił błąd podczas aktualizacji raportu!' :
                'Wystąpił błąd podczas zapisywania raportu!',
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

// Funkcja pomocnicza do formatowania stanu formularza
function formatujStanFormularza(state) {
    return `
📍 Miejsce pracy: ${state.miejscePracy || 'nie wybrano'}
🚗 Auto: ${state.auto || 'nie wybrano'}
👥 Osoby pracujące: ${state.osobyPracujace.length > 0 ? state.osobyPracujace.join(', ') : 'nie wybrano'}
🧑‍✈️ Kierowca: ${state.kierowca || 'nie wybrano'}
💰 Dieta: ${state.dieta === null ? 'nie wybrano' : state.dieta ? 'Tak' : 'Nie'}
    `.trim();
} 