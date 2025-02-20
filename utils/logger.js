// Moduł do zarządzania logami aplikacji
const path = require('path');

class Logger {
    constructor() {
        this.startTime = Date.now();
    }

    // Logi startowe
    drawStartupBanner(version) {
        console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Bot Raport Dzienny v${version}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
    }

    // Logi konfiguracji
    logConfig(env) {
        const configStatus = {
            token: !!env.TOKEN ? '✅' : '❌',
            categoryId: !!env.PRIVATE_CATEGORY_ID ? '✅' : '❌',
            channelId: !!env.KANAL_RAPORTY_ID ? '✅' : '❌',
            googleCreds: !!env.GOOGLE_SHEET_ID ? '✅' : '❌'
        };

        console.log(`
🔧 Konfiguracja:
├─ Token Discord     ${configStatus.token}
├─ ID Kategorii      ${configStatus.categoryId} ${env.PRIVATE_CATEGORY_ID || ''}
├─ ID Kanału         ${configStatus.channelId} ${env.KANAL_RAPORTY_ID || ''}
└─ Google Sheets     ${configStatus.googleCreds}
`);
    }

    // Logi raportów
    logRaportAction(type, data) {
        switch(type) {
            case 'start':
                console.log(`👤 [BOT] ${data.username} użył /raport`);
                console.log(`🔄 [RAPORT] Użytkownik ${data.username} rozpoczął tworzenie raportu`);
                break;
            case 'update':
                console.log(`📝 [RAPORT] ${data.username} aktualizuje: ${data.field}: ${data.value}`);
                break;
            case 'summary':
                console.log(`
🔄 [RAPORT] ${data.isEdit ? 'Edytowano' : 'Utworzono'} raport:
├─ Autor:     ${data.username}
├─ Data:      ${data.date}
├─ Godziny:   ${data.hours}
├─ Miejsce:   ${data.place}
├─ Auto:      ${data.car}
├─ Kierowca:  ${data.driver}
├─ Osoby:     ${data.people}
└─ Dieta:     ${data.diet}
`);
                break;
        }
    }

    // Logi kanałów Discord
    logChannelAction(type, data) {
        switch(type) {
            case 'check':
                console.log(`
🔍 [CHANNEL] Sprawdzanie kanału:
├─ Użytkownik: ${data.username}
├─ Kategoria:  ${data.categoryId}
└─ Nazwa:      ${data.channelName}
`);
                break;
            case 'send':
                console.log(`📨 [DISCORD] Wysłano raport na kanał #${data.channelName}`);
                break;
        }
    }

    // Logi Google Sheets
    logSheetsAction(type, data) {
        switch(type) {
            case 'archive':
                console.log(`
📦 [SHEETS] Archiwizacja raportu:
├─ Autor:     ${data.author}
├─ Data:      ${data.date}
├─ Godziny:   ${data.hours}
└─ Status:    ${data.status}
`);
                break;
            case 'save':
                console.log(`✅ [SHEETS] Zapisano raport: ${data.filename}`);
                break;
        }
    }

    // Logi błędów
    logError(module, error) {
        console.error(`❌ [${module}] Błąd: ${error.message}`);
    }
}

module.exports = new Logger(); 