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
            // Dodajmy logi na początku
            console.log('🔍 [CHANNEL] Rozpoczynam tworzenie/pobieranie kanału:', {
                username: user.username,
                categoryId: process.env.PRIVATE_CATEGORY_ID,
                envVars: {
                    hasCategoryId: !!process.env.PRIVATE_CATEGORY_ID,
                    categoryIdLength: process.env.PRIVATE_CATEGORY_ID?.length
                }
            });

            // Sprawdzamy rate limit
            const now = Date.now();
            if (now - this.lastChannelCreation < this.rateLimitDelay) {
                await new Promise(resolve => 
                    setTimeout(resolve, this.rateLimitDelay - (now - this.lastChannelCreation))
                );
            }

            // Pobieramy kategorię RAPORTY
            const category = guild.channels.cache.get(process.env.PRIVATE_CATEGORY_ID);
            console.log('🔍 [CHANNEL] Próba pobrania kategorii:', {
                znalezionoKategorie: !!category,
                categoryId: process.env.PRIVATE_CATEGORY_ID,
                dostepneKategorie: Array.from(guild.channels.cache.filter(ch => ch.type === ChannelType.GuildCategory).map(ch => ({
                    id: ch.id,
                    name: ch.name
                })))
            });

            if (!category) {
                throw new Error('Nie znaleziono kategorii RAPORTY. Sprawdź PRIVATE_CATEGORY_ID w .env');
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
            console.error('❌ [CHANNEL] Błąd podczas tworzenia/pobierania kanału:', {
                error: error.message,
                userId: user.id,
                username: user.username,
                categoryId: process.env.PRIVATE_CATEGORY_ID,
                stack: error.stack
            });

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