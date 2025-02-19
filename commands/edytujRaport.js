const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const googleSheets = require('../utils/googleSheets');
const { wyslijRaport, formatujRaport } = require('./raport');
const ChannelManager = require('../utils/channelManager');

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
                // Używamy istniejącej logiki formularza z raport.js
                await wyslijRaport(interaction, wybranyRaport, true);
            }
        });
    }
};
