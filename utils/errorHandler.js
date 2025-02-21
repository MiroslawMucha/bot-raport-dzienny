const discordErrorMessages = {
    'Invalid Form Body': {
        'components[BASE_TYPE_MAX_LENGTH]': {
            message: '❌ Przekroczono maksymalną liczbę komponentów (limit: 5)',
            emoji: '📑'
        },
        'components[BUTTON_LABEL_MAX_LENGTH]': {
            message: '❌ Tekst przycisku jest zbyt długi',
            emoji: '📝'
        },
        // Dodaj więcej mapowań błędów Discord API
    }
};

function formatDiscordError(error) {
    // Wyciągnij główny komunikat błędu
    const mainError = error.message.split(':')[0].trim();
    
    // Wyciągnij szczegóły błędu
    const details = error.message.split(':')[1]?.split('.')[0]?.trim();

    if (discordErrorMessages[mainError]?.[details]) {
        const { message, emoji } = discordErrorMessages[mainError][details];
        return `${emoji} ${message}`;
    }

    // Domyślny format dla nieznanych błędów
    return `❌ Wystąpił nieoczekiwany błąd: ${error.message}`;
}

module.exports = {
    formatDiscordError
}; 