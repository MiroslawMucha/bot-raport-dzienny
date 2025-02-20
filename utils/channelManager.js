// Moduł do zarządzania kanałami Discord
const { ChannelType, PermissionFlagsBits } = require('discord.js');

class ChannelManager {
    constructor() {
        this.rateLimitDelay = 1000; // 1 sekunda między tworzeniem kanałów
        this.lastChannelCreation = 0;
    }

    // Funkcja tworząca lub pobierająca prywatny kanał użytkownika
    async getOrCreateUserChannel(guild, user) {
        try {
            console.log(`
🔍 [CHANNEL] Sprawdzanie kanału:
├─ Użytkownik: ${user.username}
├─ Kategoria:  ${process.env.PRIVATE_CATEGORY_ID}
└─ Nazwa:      raport-${user.username.toLowerCase()}
`);

            // Sprawdzamy rate limit
            const now = Date.now();
            if (now - this.lastChannelCreation < this.rateLimitDelay) {
                await new Promise(resolve => 
                    setTimeout(resolve, this.rateLimitDelay - (now - this.lastChannelCreation))
                );
            }

            const category = guild.channels.cache.get(process.env.PRIVATE_CATEGORY_ID);
            if (!category) {
                console.warn(`⚠️ [CHANNEL] Nie znaleziono kategorii ${process.env.PRIVATE_CATEGORY_ID}`);
            }

            // Próba znalezienia istniejącego kanału w kategorii RAPORTY
            const channelName = `raport-${user.username.toLowerCase()}`;
            let channel = guild.channels.cache.find(ch => 
                ch.name === channelName && 
                ch.type === ChannelType.GuildText &&
                ch.parentId === category.id // Sprawdzamy czy kanał jest w odpowiedniej kategorii
            );

            // Jeśli kanał nie istnieje lub bot nie ma do niego dostępu, tworzymy nowy
            if (!channel || !channel.permissionsFor(guild.members.me).has('SendMessages')) {
                // Usuń stary kanał, jeśli istnieje
                if (channel) {
                    try {
                        await channel.delete();
                        console.log(`Usunięto stary kanał dla użytkownika ${user.username}`);
                    } catch (error) {
                        console.log(`Nie można usunąć starego kanału: ${error.message}`);
                    }
                }

                // Tworzenie nowego kanału w kategorii RAPORTY
                this.lastChannelCreation = Date.now();
                channel = await guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildText,
                    parent: category.id, // Ustawiamy kategorię nadrzędną
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
                console.log(`Utworzono nowy kanał dla użytkownika ${user.username} w kategorii RAPORTY`);
            }

            return channel;
        } catch (error) {
            console.error(`❌ [CHANNEL] Błąd przy tworzeniu/pobieraniu kanału dla użytkownika ${user.username}: ${error.message}`);

            if (error.code === 50013) {
                throw new Error('Bot nie ma wymaganych uprawnień do zarządzania kanałami');
            } else if (error.code === 50001) {
                throw new Error('Bot nie ma dostępu do serwera lub kategorii');
            } else if (error.code === 50035) {
                throw new Error('Nieprawidłowa nazwa kanału');
            }
            throw error;
        }
    }
}

// Eksportujemy instancję klasy zamiast samej klasy
module.exports = new ChannelManager(); 