// Moduł do zarządzania kanałami Discord
const { ChannelType, PermissionFlagsBits } = require('discord.js');

class ChannelManager {
    // Funkcja tworząca lub pobierająca prywatny kanał użytkownika
    async getOrCreateUserChannel(guild, user) {
        try {
            // Próba znalezienia istniejącego kanału
            const channelName = `raport-${user.username.toLowerCase()}`;
            let channel = guild.channels.cache.find(ch => 
                ch.name === channelName && ch.type === ChannelType.GuildText
            );

            // Jeśli kanał nie istnieje lub bot nie ma do niego dostępu, tworzymy nowy
            if (!channel || !channel.permissionsFor(guild.members.me).has('SendMessages')) {
                // Usuń stary kanał, jeśli istnieje ale bot nie ma do niego dostępu
                if (channel) {
                    try {
                        await channel.delete();
                    } catch (error) {
                        console.log(`Nie można usunąć starego kanału: ${error.message}`);
                    }
                }

                // Tworzenie nowego kanału z odpowiednimi uprawnieniami
                channel = await guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildText,
                    permissionOverwrites: [
                        {
                            id: guild.id, // @everyone
                            deny: ['ViewChannel']
                        },
                        {
                            id: user.id, // użytkownik
                            allow: ['ViewChannel', 'ReadMessageHistory']
                        },
                        {
                            id: guild.members.me.id, // bot
                            allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
                        }
                    ]
                });
                console.log(`Utworzono nowy kanał dla użytkownika ${user.username}`);
            }

            return channel;
        } catch (error) {
            console.error('Błąd podczas tworzenia/pobierania kanału:', error);
            throw error;
        }
    }
}

// Eksportujemy instancję klasy zamiast samej klasy
module.exports = new ChannelManager(); 