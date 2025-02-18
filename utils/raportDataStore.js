// Store do przechowywania danych raportów
const raportDataStore = new Map();
const locks = new Map();

// Stała określająca czas ważności formularza (5 minut)
const FORM_TIMEOUT = 5 * 60 * 1000;
// Interwał czyszczenia (2 minuty)
const CLEANUP_INTERVAL = 2 * 60 * 1000;

// Funkcje pomocnicze do zarządzania danymi
const store = {
    // Inicjalizacja nowego raportu
    initReport: (userId, userData) => {
        // Najpierw bezwarunkowo czyścimy wszystkie dane użytkownika
        store.resetReport(userId);

        console.log('Stan po resecie:', {
            hasReport: raportDataStore.has(userId),
            hasLock: locks.has(userId),
            userData: userData
        });

        // Teraz tworzymy nowy raport
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
        
        // Najpierw ustawiamy dane, potem blokadę
        raportDataStore.set(userId, newReport);
        locks.set(userId, true);

        console.log('Stan po inicjalizacji:', {
            hasReport: raportDataStore.has(userId),
            hasLock: locks.has(userId),
            report: newReport
        });

        return newReport;
    },

    // Pobranie danych raportu
    getReport: (userId) => {
        return raportDataStore.get(userId);
    },

    // Aktualizacja danych raportu
    updateReport: (userId, data) => {
        const currentReport = raportDataStore.get(userId);
        if (currentReport) {
            raportDataStore.set(userId, { ...currentReport, ...data });
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
        const now = Date.now();
        let cleaned = 0;
        
        for (const [userId, report] of raportDataStore.entries()) {
            if (now - report.startTime > FORM_TIMEOUT) {
                console.log(`Czyszczenie: Usuwanie przeterminowanego formularza użytkownika ${report.username}`);
                store.resetReport(userId);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            console.log(`Czyszczenie zakończone: Usunięto ${cleaned} nieaktywnych formularzy`);
        }
    },

    // Sprawdzenie czy użytkownik ma aktywny formularz
    hasActiveReport: (userId) => {
        const report = raportDataStore.get(userId);
        const lock = locks.get(userId);
        
        console.log('Sprawdzanie aktywnego formularza:', {
            userId,
            hasReport: !!report,
            hasLock: !!lock,
            reportTime: report?.startTime
        });

        // Jeśli nie ma raportu LUB nie ma blokady
        if (!report || !lock) {
            store.resetReport(userId);
            return false;
        }

        // Sprawdź czy formularz nie wygasł
        const now = Date.now();
        if (now - report.startTime > FORM_TIMEOUT) {
            store.resetReport(userId);
            return false;
        }

        return true;
    },

    // Wymuszony reset formularza
    resetReport: (userId) => {
        console.log('Rozpoczynam reset formularza:', {
            userId,
            beforeReset: {
                hasReport: raportDataStore.has(userId),
                hasLock: locks.has(userId)
            }
        });

        raportDataStore.delete(userId);
        locks.delete(userId);

        console.log('Zakończono reset formularza:', {
            userId,
            afterReset: {
                hasReport: raportDataStore.has(userId),
                hasLock: locks.has(userId)
            }
        });
    }
};

// Uruchamiamy czyszczenie co 2 minuty
setInterval(store.cleanupStaleReports, CLEANUP_INTERVAL);

module.exports = store; 