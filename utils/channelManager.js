// Moduł do zarządzania kanałami Discord
const { ChannelType, PermissionFlagsBits } = require('discord.js');

class ChannelManager {
    // Funkcja tworząca lub pobierająca prywatny kanał użytkownika
    static async getOrCreateUserChannel(guild, user) {
        const channelName = `raport-${user.username.toLowerCase()}`;
        let channel = guild.channels.cache.find(ch => 
            ch.name === channelName && ch.type === ChannelType.GuildText
        );

        if (!channel) {
            // Tworzenie nowego kanału z odpowiednimi uprawnieniami
            channel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    {
                        id: guild.id, // @everyone
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: user.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory]
                    },
                    {
                        // Uprawnienia dla roli administracji (ID roli należy dodać do .env)
                        id: process.env.ADMIN_ROLE_ID,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory]
                    }
                ]
            });
        }

        return channel;
    }
}

module.exports = ChannelManager; 