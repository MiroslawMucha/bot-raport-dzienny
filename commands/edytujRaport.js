// Komenda /edytuj_raport do edycji istniejących raportów
const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { MIEJSCA_PRACY, POJAZDY } = require('../config/config');
const googleSheets = require('../utils/googleSheets');
const ChannelManager = require('../utils/channelManager');
const { pobierzCzlonkowSerwera } = require('../utils/timeValidation');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('edytuj_raport')
        .setDescription('Edytuj jeden z ostatnich raportów'),

    async execute(interaction) {
        // Pobranie ostatnich raportów użytkownika
        const raporty = await googleSheets.pobierzOstatnieRaporty(interaction.user.tag);

        if (raporty.length === 0) {
            return interaction.reply({
                content: 'Nie znaleziono żadnych raportów do edycji!',
                ephemeral: true
            });
        }

        // Utworzenie menu wyboru raportu do edycji
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('wybor_raportu')
            .setPlaceholder('Wybierz raport do edycji')
            .addOptions(
                raporty.map((raport, index) => ({
                    label: `Raport z ${raport.data}`,
                    description: `${raport.miejscePracy} (${raport.czasRozpoczecia} - ${raport.czasZakonczenia})`,
                    value: raport.rowIndex.toString()
                }))
            );

        await interaction.reply({
            content: 'Wybierz raport do edycji:',
            components: [new ActionRowBuilder().addComponents(selectMenu)],
            ephemeral: true
        });

        // Kolektor do obsługi wyboru raportu
        const filter = i => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({
            filter,
            time: 60000 // 1 minuta na wybór
        });

        collector.on('collect', async i => {
            const wybranyRaport = raporty.find(r => r.rowIndex.toString() === i.values[0]);
            if (wybranyRaport) {
                collector.stop();
                await rozpocznijEdycje(interaction, wybranyRaport);
            }
        });
    }
};

// Funkcja rozpoczynająca proces edycji raportu
async function rozpocznijEdycje(interaction, raport) {
    // Sprawdzenie czy raport nie jest starszy niż 7 dni
    const raportDate = new Date(raport.data);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    if (raportDate < sevenDaysAgo) {
        return interaction.followUp({
            content: 'Ten raport jest starszy niż 7 dni i nie może być edytowany.',
            ephemeral: true
        });
    }

    // Formularze dla wszystkich pól
    const miejscaPracySelect = new StringSelectMenuBuilder()
        .setCustomId('miejsce_pracy_edit')
        .setPlaceholder('Zmień miejsce pracy')
        .addOptions(
            MIEJSCA_PRACY.map(miejsce => ({
                label: miejsce,
                value: miejsce,
                default: miejsce === raport.miejscePracy
            }))
        );

    const pojazdySelect = new StringSelectMenuBuilder()
        .setCustomId('pojazd_edit')
        .setPlaceholder('Zmień pojazd')
        .addOptions(
            POJAZDY.map(pojazd => ({
                label: pojazd,
                value: pojazd,
                default: pojazd === raport.auto
            }))
        );

    const dietaButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('dieta_tak_edit')
                .setLabel('Dieta: Tak')
                .setStyle(raport.dieta ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('dieta_nie_edit')
                .setLabel('Dieta: Nie')
                .setStyle(!raport.dieta ? ButtonStyle.Danger : ButtonStyle.Secondary)
        );

    // Dodajemy pola do wyboru godzin
    const czasButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('zmien_czas_rozpoczecia')
                .setLabel('Zmień czas rozpoczęcia')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('zmien_czas_zakonczenia')
                .setLabel('Zmień czas zakończenia')
                .setStyle(ButtonStyle.Primary)
        );

    const czlonkowie = await pobierzCzlonkowSerwera(interaction.guild);

    const osobyPracujaceSelect = new StringSelectMenuBuilder()
        .setCustomId('osoby_pracujace_edit')
        .setPlaceholder('Zmień osoby pracujące')
        .setMinValues(1)
        .setMaxValues(Math.min(czlonkowie.length, 25))
        .addOptions(czlonkowie.map(czlonek => ({
            ...czlonek,
            default: raport.osobyPracujace.includes(czlonek.value)
        })));

    const kierowcaSelect = new StringSelectMenuBuilder()
        .setCustomId('kierowca_edit')
        .setPlaceholder('Zmień kierowcę')
        .addOptions(czlonkowie.map(czlonek => ({
            ...czlonek,
            default: raport.kierowca === czlonek.value
        })));

    await interaction.followUp({
        content: 'Wypełnij formularz raportu:',
        components: [
            new ActionRowBuilder().addComponents(miejscaPracySelect),
            new ActionRowBuilder().addComponents(pojazdySelect),
            new ActionRowBuilder().addComponents(osobyPracujaceSelect),
            new ActionRowBuilder().addComponents(kierowcaSelect),
            dietaButtons,
            czasButtons
        ],
        ephemeral: true
    });

    // Kolektor do zbierania zmian
    const filter = i => i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({
        filter,
        time: 300000 // 5 minut na edycję
    });

    const editedData = { ...raport };
    let czasEdycjiAktywny = false;

    collector.on('collect', async i => {
        try {
            switch (i.customId) {
                case 'miejsce_pracy_edit':
                    editedData.miejscePracy = i.values[0];
                    await i.update({ content: `Zmieniono miejsce pracy na: ${i.values[0]}` });
                    break;

                case 'pojazd_edit':
                    editedData.auto = i.values[0];
                    await i.update({ content: `Zmieniono pojazd na: ${i.values[0]}` });
                    break;

                case 'dieta_tak_edit':
                    editedData.dieta = true;
                    await i.update({ content: 'Włączono dietę' });
                    break;

                case 'dieta_nie_edit':
                    editedData.dieta = false;
                    await i.update({ content: 'Wyłączono dietę' });
                    break;

                case 'zmien_czas_rozpoczecia':
                case 'zmien_czas_zakonczenia':
                    czasEdycjiAktywny = true;
                    const czasType = i.customId === 'zmien_czas_rozpoczecia' ? 'rozpoczęcia' : 'zakończenia';
                    await i.reply({
                        content: `Wpisz nowy czas ${czasType} w formacie HH:MM (np. 07:30):`,
                        ephemeral: true
                    });
                    break;

                case 'osoby_pracujace_edit':
                    editedData.osobyPracujace = i.values;
                    const osobyNazwy = i.values.map(id => 
                        interaction.guild.members.cache.get(id)?.displayName || id
                    );
                    await i.update({ content: `Zmieniono osoby pracujące na: ${osobyNazwy.join(', ')}` });
                    break;

                case 'kierowca_edit':
                    editedData.kierowca = i.values[0];
                    const kierowcaNazwa = interaction.guild.members.cache.get(i.values[0])?.displayName || i.values[0];
                    await i.update({ content: `Zmieniono kierowcę na: ${kierowcaNazwa}` });
                    break;
            }

            // Jeśli edytujemy czas, czekamy na odpowiedź tekstową
            if (czasEdycjiAktywny) {
                const messageCollector = i.channel.createMessageCollector({
                    filter: m => m.author.id === interaction.user.id && /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(m.content),
                    max: 1,
                    time: 30000
                });

                messageCollector.on('collect', async m => {
                    const nowyCzas = m.content;
                    if (i.customId === 'zmien_czas_rozpoczecia') {
                        editedData.czasRozpoczecia = nowyCzas;
                    } else {
                        editedData.czasZakonczenia = nowyCzas;
                    }
                    await m.reply({ content: `Zaktualizowano czas ${i.customId === 'zmien_czas_rozpoczecia' ? 'rozpoczęcia' : 'zakończenia'} na ${nowyCzas}`, ephemeral: true });
                });
            }

            // Po każdej zmianie aktualizujemy raport
            const zaktualizowano = await googleSheets.aktualizujRaport(raport.rowIndex, editedData);
            
            if (zaktualizowano) {
                // Wysłanie zaktualizowanego raportu na kanał główny
                const kanalRaporty = interaction.guild.channels.cache.get(process.env.KANAL_RAPORTY_ID);
                await kanalRaporty.send(formatujRaport(editedData, true, raport.data));

                // Aktualizacja w prywatnym kanale użytkownika
                const kanalPrywatny = await ChannelManager.getOrCreateUserChannel(
                    interaction.guild,
                    interaction.user
                );

                // Wysyłamy nowy raport i oznaczamy stary jako nieaktualny
                await kanalPrywatny.send('⚠️ Poprzedni raport został zaktualizowany ⚠️');
                await kanalPrywatny.send(formatujRaport(editedData, true, raport.data));
            }
        } catch (error) {
            console.error('Błąd podczas edycji raportu:', error);
            await interaction.followUp({
                content: 'Wystąpił błąd podczas edycji raportu!',
                ephemeral: true
            });
        }
    });

    collector.on('end', () => {
        interaction.followUp({
            content: 'Zakończono sesję edycji raportu.',
            ephemeral: true
        });
    });
}

// Funkcja formatująca raport
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