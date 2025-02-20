// Store do przechowywania danych raportów
const raportDataStore = new Map();
const locks = new Map();

// Dodajemy stałą dla maksymalnej liczby jednoczesnych formularzy
const MAX_CONCURRENT_FORMS = 10;

// Stała określająca czas ważności formularza (5 minut)
const FORM_TIMEOUT = 5 * 60 * 1000;
// Interwał czyszczenia (10 minut)
const CLEANUP_INTERVAL = 10 * 60 * 1000;

// Dodajemy stałe na początku pliku, poza obiektem store
const SIX_HOURS = 6 * 60 * 60 * 1000;
let aggregatedCleanup = {
    count: 0,
    details: [],
    lastTimestamp: Date.now()
};

// Funkcje pomocnicze do zarządzania danymi
const store = {
    // Inicjalizacja nowego raportu
    initReport: (userId, userData) => {
        // Sprawdzamy aktualną liczbę aktywnych formularzy
        if (raportDataStore.size >= MAX_CONCURRENT_FORMS) {
            console.log('⚠️ [RAPORT] Przekroczono limit jednoczesnych formularzy:', {
                aktualnaLiczba: raportDataStore.size,
                maksymalnaLiczba: MAX_CONCURRENT_FORMS,
                aktywniUzytkownicy: Array.from(raportDataStore.values()).map(r => r.username)
            });
            throw new Error(`Zbyt wiele aktywnych formularzy (${raportDataStore.size}/${MAX_CONCURRENT_FORMS}). Spróbuj ponownie za chwilę.`);
        }

        console.log('🔄 [RAPORT] Inicjalizacja nowego raportu:', {
            krok: 'rozpoczęcie',
            userId,
            userData
        });

        store.resetReport(userId);

        const newReport = {
            userId,
            username: userData.username,
            displayName: userData.displayName,
            globalName: userData.globalName,
            fullName: userData.fullName,
            miejscePracy: '',
            czasRozpoczecia: '',
            czasZakonczenia: '',
            dieta: false,
            osobyPracujace: [],
            auto: '',
            kierowca: '',
            startTime: Date.now()
        };
        
        raportDataStore.set(userId, newReport);
        locks.set(userId, true);

        console.log('✅ [RAPORT] Raport zainicjalizowany:', {
            krok: 'zakończenie',
            userId,
            username: userData.username,
            czasUtworzeniaRaportu: new Date(newReport.startTime).toLocaleString(),
            czasWygasnieciaRaportu: new Date(newReport.startTime + FORM_TIMEOUT).toLocaleString()
        });

        return newReport;
    },

    // Pobranie danych raportu
    getReport: (userId) => {
        return raportDataStore.get(userId);
    },

    // Aktualizacja danych raportu
    updateReport: (userId, data) => {
        console.log('📝 [RAPORT] Aktualizacja raportu:', {
            krok: 'rozpoczęcie',
            userId,
            aktualizowanePola: Object.keys(data),
            noweWartosci: data
        });

        const currentReport = raportDataStore.get(userId);
        if (currentReport) {
            const updatedReport = { ...currentReport, ...data };
            raportDataStore.set(userId, updatedReport);
            
            console.log('✅ [RAPORT] Raport zaktualizowany:', {
                krok: 'zakończenie',
                userId,
                username: currentReport.username,
                poprzednieWartosci: Object.keys(data).reduce((acc, key) => {
                    acc[key] = currentReport[key];
                    return acc;
                }, {}),
                noweWartosci: data,
                pozostalyCzas: Math.round((FORM_TIMEOUT - (Date.now() - currentReport.startTime)) / 1000) + 's'
            });
        }
        return raportDataStore.get(userId);
    },

    // Usunięcie raportu
    deleteReport: (userId) => {
        raportDataStore.delete(userId);
        locks.delete(userId); // Zwalniamy blokadę
    },

    // Dodajemy timeout dla nieukończonych formularzy
    cleanupStaleReports: () => {
        // Wypisujemy skróconą informację (np. tylko liczba formularzy przed czyszczeniem)
        console.debug(`🧹 [CLEANUP] Uruchomienie czyszczenia - formularze: ${raportDataStore.size}, blokady: ${locks.size}`);

        const now = Date.now();
        let cleaned = 0;
        const details = [];
        
        for (const [userId, report] of raportDataStore.entries()) {
            const timeElapsed = now - report.startTime;
            if (timeElapsed > FORM_TIMEOUT) {
                details.push({
                    userId,
                    username: report.username,
                    czasAktywnosci: Math.round(timeElapsed / 1000) + 's',
                    przekroczenieCzasu: Math.round((timeElapsed - FORM_TIMEOUT) / 1000) + 's'
                });
                store.resetReport(userId);
                cleaned++;
            }
        }
        
        // Agregujemy wyniki cleanupu
        aggregatedCleanup.count += cleaned;
        aggregatedCleanup.details = aggregatedCleanup.details.concat(details);
        
        // Wypisujemy krótką informację o tym wywołaniu (na poziomie debug)
        console.debug(`🚮 [CLEANUP] Przebieg: wyczyszczono ${cleaned} formularzy.`);

        // Sprawdzamy, czy minęło 6 godzin od ostatniego podsumowania
        if (now - aggregatedCleanup.lastTimestamp >= SIX_HOURS) {
            console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚮 [CLEANUP] Podsumowanie 6-godzinne:
  - Łączna liczba wyczyszczonych formularzy: ${aggregatedCleanup.count}
  - Szczegóły: ${JSON.stringify(aggregatedCleanup.details, null, 2)}
  - Pozostałe formularze: ${raportDataStore.size}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            `);
            // Resetujemy agregator
            aggregatedCleanup = {
                count: 0,
                details: [],
                lastTimestamp: now
            };
        }
    },

    // Sprawdzenie czy użytkownik ma aktywny formularz
    hasActiveReport: (userId) => {
        const report = raportDataStore.get(userId);
        const lock = locks.get(userId);
        
        console.log('🔍 [RAPORT] Sprawdzanie aktywności:', {
            userId,
            maRaport: !!report,
            maBlokade: !!lock,
            czasAktywnosci: report ? Math.round((Date.now() - report.startTime) / 1000) + 's' : 'brak',
            pozostalyCzas: report ? Math.round((FORM_TIMEOUT - (Date.now() - report.startTime)) / 1000) + 's' : 'brak'
        });

        if (!report || !lock) {
            return false;
        }

        const now = Date.now();
        if (now - report.startTime > FORM_TIMEOUT) {
            store.resetReport(userId);
            return false;
        }

        return true;
    },

    // Wymuszony reset formularza
    resetReport: (userId) => {
        const hadReport = raportDataStore.has(userId);
        raportDataStore.delete(userId);
        locks.delete(userId);

        if (hadReport) {
            console.log(`Reset formularza dla użytkownika ${userId}`);
        }
    }
};

// Uruchamiamy czyszczenie co 10 minut
setInterval(store.cleanupStaleReports, CLEANUP_INTERVAL);

module.exports = store; 