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
        // Inicjalizacja raportu w store
        raportStore.initReport(interaction.user.id, interaction.user.username);

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

        try {
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
                flags: ['Ephemeral'] // Zamiast ephemeral: true
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
                flags: ['Ephemeral'] // Zamiast ephemeral: true
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
━━━━━━━━━━━━━━━━━━━━━━━━━━━
${header}
━━━━━━━━━━━━━━━━━━━━━━━━━━━

👷‍♂️ **Pracownik:**
\`${raportData.pracownik}\`

📍 **Miejsce pracy:**
\`${raportData.miejscePracy}\`

⏳ **Czas pracy:**
\`${raportData.czasRozpoczecia} - ${raportData.czasZakonczenia}\`

💰 **Dieta / Delegacja:**
\`${raportData.dieta ? 'Tak' : 'Nie'}\`

👥 **Osoby pracujące:**
\`${raportData.osobyPracujace.join(', ')}\`

🚗 **Auto:**
\`${raportData.auto}\`

🧑‍✈️ **Kierowca:**
\`${raportData.kierowca}\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━`.trim();
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

// Funkcja pomocnicza do aktualizacji placeholderów
function updateSelectMenu(menu, selectedValue, prefix = '') {
    if (selectedValue) {
        menu.setPlaceholder(`✅ Wybrano: ${selectedValue}`)
            .setStyle('SUCCESS'); // Zmiana stylu na zielony
    } else {
        menu.setPlaceholder(`❌ ${prefix}Nie wybrano`)
            .setStyle('DANGER'); // Zmiana stylu na czerwony
    }
    return menu;
}

// W sekcji obsługi czasu:
await interaction.update({
    content: `**Wybrane parametry czasu:**\n...`,
    components: [
        new ActionRowBuilder().addComponents(
            updateSelectMenu(dateSelect, updatedData.selectedDate, 'Data: ')
        ),
        new ActionRowBuilder().addComponents(
            updateSelectMenu(startHourSelect, 
                updatedData.startHour ? `${updatedData.startHour}:00` : null,
                'Godzina rozpoczęcia: '
            )
        ),
        new ActionRowBuilder().addComponents(
            updateSelectMenu(startMinuteSelect, 
                updatedData.startMinute ? `:${updatedData.startMinute}` : null,
                'Minuta rozpoczęcia: '
            )
        ),
        // ... analogicznie dla godziny i minuty zakończenia
    ]
}); 