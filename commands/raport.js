// Komenda /raport do tworzenia nowych raportów
const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, TextInputBuilder, TextInputStyle } = require('discord.js');
const { MIEJSCA_PRACY, POJAZDY, CZAS } = require('../config/config');
const googleSheets = require('../utils/googleSheets');
const channelManager = require('../utils/channelManager');
const raportStore = require('../utils/raportDataStore');

module.exports = {
    // Definicja komendy
    data: new SlashCommandBuilder()
        .setName('raport')
        .setDescription('Utwórz nowy raport dzienny'),

    async execute(interaction) {
        try {
            // Inicjalizacja nowego formularza (zawiera reset)
            try {
                raportStore.initReport(interaction.user.id, {
                    username: interaction.user.username,
                    displayName: interaction.member.displayName,
                    globalName: interaction.user.globalName,
                    fullName: interaction.user.globalName || interaction.member.displayName
                });
            } catch (error) {
                if (error.message.includes('Zbyt wiele aktywnych formularzy')) {
                    await interaction.reply({
                        content: error.message,
                        ephemeral: true
                    });
                    return;
                }
                throw error;
            }

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
                .setCustomId('auto')
                .setPlaceholder('Wybierz pojazd')
                .addOptions(
                    POJAZDY.map(pojazd => ({
                        label: pojazd,
                        value: pojazd
                    }))
                );

            // Pobierz członków serwera
            const czlonkowie = await pobierzCzlonkowSerwera(interaction.guild);

            // Dodajmy funkcję pomocniczą do uzupełniania opcji do minimum 5
            function uzupelnijOpcjeDoMinimum(opcje, prefix = 'Opcja') {
                const wynik = [...opcje];
                while (wynik.length < 5) {
                    wynik.push({
                        label: `${prefix} ${wynik.length + 1}`,
                        value: `${prefix.toLowerCase()}_${wynik.length + 1}`,
                        default: false
                    });
                }
                return wynik;
            }

            // Modyfikacja menu wyboru osób pracujących
            const osobyPracujaceSelect = new StringSelectMenuBuilder()
                .setCustomId('osoby_pracujace')
                .setPlaceholder('Wybierz osoby pracujące')
                .setMinValues(1)
                .setMaxValues(5)
                .addOptions(uzupelnijOpcjeDoMinimum(czlonkowie, 'Pracownik'));

            // Modyfikacja menu wyboru kierowcy
            const kierowcaSelect = new StringSelectMenuBuilder()
                .setCustomId('kierowca')
                .setPlaceholder('Wybierz kierowcę')
                .addOptions(uzupelnijOpcjeDoMinimum(czlonkowie, 'Kierowca'));

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

            // Tworzenie menu wyboru daty
            const dateSelect = new StringSelectMenuBuilder()
                .setCustomId('data_raportu')
                .setPlaceholder('Wybierz datę')
                .addOptions(CZAS.getDaty());

            // Tworzenie menu wyboru godziny rozpoczęcia
            const startHourSelect = new StringSelectMenuBuilder()
                .setCustomId('godzina_rozpoczecia')
                .setPlaceholder('Wybierz godzinę rozpoczęcia')
                .addOptions(CZAS.getGodzinyRozpoczecia());

            // Tworzenie menu wyboru minuty rozpoczęcia
            const startMinuteSelect = new StringSelectMenuBuilder()
                .setCustomId('minuta_rozpoczecia')
                .setPlaceholder('Wybierz minutę rozpoczęcia')
                .addOptions(CZAS.MINUTY);

            // Tworzenie menu wyboru godziny zakończenia
            const endHourSelect = new StringSelectMenuBuilder()
                .setCustomId('godzina_zakonczenia')
                .setPlaceholder('Wybierz godzinę zakończenia')
                .addOptions(CZAS.getGodzinyZakonczenia());

            // Tworzenie menu wyboru minuty zakończenia
            const endMinuteSelect = new StringSelectMenuBuilder()
                .setCustomId('minuta_zakonczenia')
                .setPlaceholder('Wybierz minutę zakończenia')
                .addOptions(CZAS.MINUTY);

            // Modyfikacja wysyłania odpowiedzi
            await interaction.reply({
                content: 'Wypełnij formularz raportu (masz 5 minut na uzupełnienie):',
                components: [
                    new ActionRowBuilder().addComponents(miejscaPracySelect),
                    new ActionRowBuilder().addComponents(pojazdySelect),
                    new ActionRowBuilder().addComponents(osobyPracujaceSelect),
                    new ActionRowBuilder().addComponents(kierowcaSelect),
                    dietaButtons
                ],
                flags: ['Ephemeral']
            });

            // Wysyłamy dodatkową wiadomość z wyborem czasu
            await interaction.followUp({
                content: 'Wybierz czas pracy (formularz wygaśnie za 5 minut):',
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
            console.error('Błąd podczas wykonywania komendy raport:', error);
            raportStore.resetReport(interaction.user.id);
            await interaction.reply({
                content: 'Wystąpił błąd. Spróbuj ponownie za chwilę.',
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
            label: `${member.displayName} (${member.user.globalName || member.user.username})`,
            value: member.displayName,
            // Dodajemy dodatkowe informacje o użytkowniku
            userData: {
                displayName: member.displayName,         // Nick na serwerze
                globalName: member.user.globalName,      // Globalna nazwa wyświetlana
                username: member.user.username,          // Nazwa użytkownika
                fullName: member.user.globalName || member.displayName // Używamy globalName jako pełnej nazwy
            }
        }));
}

// Funkcja wysyłająca raport
async function wyslijRaport(interaction, raportData, isEdit = false, originalRaport = null) {
    try {
        const startTime = Date.now();
        const dataToSend = {
            ...raportData,
            username: raportData.username.toLowerCase().replace(/ /g, '_')
        };

        const raportMessage = formatujRaport(dataToSend, isEdit, originalRaport);
        const zapisano = await googleSheets.dodajRaport(dataToSend, isEdit);

        if (zapisano) {
            const kanalRaporty = interaction.guild.channels.cache.get(process.env.KANAL_RAPORTY_ID);
            await kanalRaporty.send(raportMessage);
            console.log(`📨 [DISCORD] Wysłano raport na kanał #${kanalRaporty.name}`);
            
            const kanalPrywatny = await channelManager.getOrCreateUserChannel(interaction.guild, interaction.user);
            await kanalPrywatny.send(raportMessage);
            console.log(`📨 [DISCORD] Wysłano raport na kanał prywatny #${kanalPrywatny.name}`);

            await interaction.followUp({
                content: 'Raport został pomyślnie zapisany i wysłany na odpowiednie kanały!',
                ephemeral: true
            });
            console.log(`✅ [DISCORD] Wysłano potwierdzenie do użytkownika ${interaction.user.username}`);
        } else {
            await interaction.followUp({
                content: 'Wystąpił błąd podczas zapisywania raportu!',
                ephemeral: true
            });
            console.log(`❌ [DISCORD] Błąd zapisu - wysłano informację do ${interaction.user.username}`);
        }

        const endTime = Date.now();
        console.log(`
⚡ [PERFORMANCE] Podsumowanie operacji:
├─ Typ:        ${isEdit ? 'Edycja' : 'Nowy'} raport
├─ Użytkownik: ${interaction.user.username}
└─ Czas:       ${endTime - startTime}ms
`);
    } catch (error) {
        // Zawsze zwalniamy blokadę w przypadku błędu
        raportStore.deleteReport(interaction.user.id);
        console.error(`❌ [DISCORD] Błąd wysyłania: ${error.message}`);
        await interaction.followUp({
            content: 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie później.',
            ephemeral: true
        });
    }
}

// Funkcja formatująca raport do wiadomości Discord
function formatujRaport(raportData, isEdit = false, originalRaport = null) {
    let header;
    if (isEdit) {
        const originalDate = originalRaport ? originalRaport[0] : raportData.czasRozpoczecia.split(' ')[0];
        header = `🛠 **RAPORT DZIENNY – EDYCJA**\n(Oryginalny wpis: ${originalDate})`;
    } else {
        header = `📌 **RAPORT DZIENNY – ORYGINAŁ**`;
    }

    const displayName = raportData.globalName || raportData.displayName || raportData.username;
    
    // Dodajemy datę z raportu
    const dataRaportu = raportData.selectedDate || 
                       (raportData.czasRozpoczecia ? raportData.czasRozpoczecia.split(' ')[0] : '');

    return `
━━━━
${header}
━━━━━━━━━━━━━━━━
👷‍♂️ **Pracownik:** \`${displayName}\`
📅 **${dataRaportu}**     
⏳ **Czas pracy:**
\`${raportData.czasRozpoczecia} - ${raportData.czasZakonczenia}\`

🏢 **Miejsce pracy:** \`${raportData.miejscePracy}\`
💰 **Dieta / Delegacja:** \`${raportData.dieta ? 'Tak' : 'Nie'}\`
👥 **Osoby pracujące:** \`${raportData.osobyPracujace.join(', ')}\`
🚗 **Auto:** \`${raportData.auto}\`
🧑‍✈️ **Kierowca:** \`${raportData.kierowca}\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`.trim();
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