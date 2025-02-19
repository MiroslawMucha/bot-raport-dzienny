const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const googleSheets = require('../utils/googleSheets');
const { wyslijRaport, formatujRaport } = require('./raport');
const ChannelManager = require('../utils/channelManager');
const raportStore = require('../utils/raportDataStore');
const { createFormComponents } = require('../utils/formBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('edytuj_raport')
        .setDescription('Edytuj jeden z ostatnich raportów'),

    async execute(interaction) {
        // Pobranie ostatnich raportów użytkownika
        const raporty = await googleSheets.pobierzOstatnieRaportyUzytkownika(
            interaction.user.username
        );

        if (raporty.length === 0) {
            return interaction.reply({
                content: 'Nie znaleziono żadnych raportów do edycji!',
                ephemeral: true
            });
        }

        // Menu wyboru raportu
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('wybor_raportu')
            .setPlaceholder('Wybierz raport do edycji')
            .addOptions(
                raporty.map(raport => ({
                    label: `${raport.miejscePracy}`,
                    description: `ID: ${raport.id}`,
                    value: raport.id
                }))
            );

        await interaction.reply({
            content: 'Wybierz raport do edycji:',
            components: [new ActionRowBuilder().addComponents(selectMenu)],
            ephemeral: true
        });

        // Obsługa wyboru raportu
        const filter = i => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({
            filter,
            time: 60000
        });

        collector.on('collect', async i => {
            const wybranyRaport = raporty.find(r => r.id === i.values[0]);
            if (wybranyRaport) {
                collector.stop();
                
                // Inicjalizacja formularza edycji
                raportStore.initReport(interaction.user.id, interaction.user.username);
                const initialData = {
                    ...wybranyRaport,
                    isEdit: true, // Oznaczamy, że to edycja
                    originalId: wybranyRaport.id
                };
                raportStore.updateReport(interaction.user.id, initialData);

                // Tworzenie komponentów formularza
                const components = createFormComponents(interaction.guild);

                // Wysłanie formularza edycji
                await i.update({
                    content: `Edycja raportu z ID: ${wybranyRaport.id}\n\n**Stan formularza:**\n
📍 Miejsce pracy: ${wybranyRaport.miejscePracy}
🚗 Auto: ${wybranyRaport.auto}
👥 Osoby pracujące: ${wybranyRaport.osobyPracujace.join(', ')}
🧑‍✈️ Kierowca: ${wybranyRaport.kierowca}
💰 Dieta: ${wybranyRaport.dieta ? 'Tak' : 'Nie'}`,
                    components: [
                        new ActionRowBuilder().addComponents(components.miejscaPracySelect),
                        new ActionRowBuilder().addComponents(components.pojazdySelect),
                        new ActionRowBuilder().addComponents(components.osobyPracujaceSelect),
                        new ActionRowBuilder().addComponents(components.kierowcaSelect),
                        components.dietaButtons
                    ]
                });
            }
        });
    }
};
