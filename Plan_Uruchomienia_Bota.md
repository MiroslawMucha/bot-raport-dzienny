# **Plan działania krok po kroku – Tworzenie i uruchomienie Bota Raport Dzienny na Discordzie**

## **1. Przygotowanie środowiska**
### **1.1 Wybór technologii**
Bot zostanie stworzony przy użyciu:
- **Node.js** – środowisko do uruchamiania JavaScript
- **discord.js** – biblioteka do obsługi Discord API
- **Google Sheets API** – do zapisywania raportów w arkuszu Google
- **MongoDB / SQLite (opcjonalnie)** – do przechowywania danych lokalnie
- **Heroku / Railway / VPS** – do hostowania bota

### **1.2 Instalacja wymaganych narzędzi**
1. **Zainstalowanie Node.js** – pobierz i zainstaluj [Node.js](https://nodejs.org/)
2. **Zainstalowanie menedżera pakietów npm lub yarn**
3. **Utworzenie katalogu projektu**
   ```bash
   mkdir raport-dzienny-bot && cd raport-dzienny-bot
   ```
4. **Zainicjalizowanie projektu**
   ```bash
   npm init -y
   ```
5. **Instalacja bibliotek**
   ```bash
   npm install discord.js dotenv googleapis mongoose
   ```

---
## **2. Konfiguracja Discord Bota**
### **2.1 Utworzenie bota na stronie Discord Developer**
1. Przejdź na [Discord Developer Portal](https://discord.com/developers/applications)
2. Kliknij **„New Application”**, podaj nazwę bota
3. W zakładce **„Bot”**:
   - Kliknij **„Add Bot”**
   - Włącz **„Privileged Gateway Intents”** dla **MESSAGE CONTENT, SERVER MEMBERS**
   - Skopiuj **Token Bota** i zapisz w `.env`

### **2.2 Nadanie uprawnień i zaproszenie bota**
1. Przejdź do zakładki **OAuth2 → URL Generator**
2. Wybierz **bot** oraz uprawnienia:
   - Read Messages, Send Messages
   - Manage Messages
   - Use Slash Commands
3. Skopiuj wygenerowany link i zaproś bota na serwer

### **2.3 Konfiguracja pliku `.env`**
W katalogu projektu utwórz `.env`:
   ```env
   TOKEN=twoj-token-bota
   GOOGLE_SHEET_ID=id-twojego-arkusza
   ```

---
## **3. Implementacja funkcjonalności bota**
### **3.1 Obsługa komend**
1. Tworzenie głównego pliku `index.js` i rejestrowanie komend
   ```javascript
   const { Client, GatewayIntentBits } = require('discord.js');
   require('dotenv').config();
   const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

   client.once('ready', () => {
       console.log(`Zalogowano jako ${client.user.tag}`);
   });

   client.login(process.env.TOKEN);
   ```

### **3.2 Obsługa `/raport`**
1. Utworzenie formularza wyboru miejsca pracy, godzin, auta itp.
2. Walidacja danych użytkownika
3. Zapis raportu do **Google Sheets API**

### **3.3 Wysyłanie raportu na prywatny kanał i do `#📋raporty-dzienne`**
1. Formatowanie danych
2. Wysłanie wiadomości do użytkownika i na kanał ogólny

### **3.4 Edycja raportu `/edytuj_raport`**
1. Pobranie ostatnich 3 raportów użytkownika
2. Modyfikacja danych
3. Aktualizacja wpisu w **Google Sheets** i kanale użytkownika

---
## **4. Integracja z Google Sheets**
### **4.1 Utworzenie arkusza i uzyskanie API**
1. Przejdź do [Google Cloud Console](https://console.cloud.google.com/)
2. Utwórz projekt i włącz **Google Sheets API**
3. Utwórz klucz JSON do autoryzacji
4. Udostępnij arkusz dla konta API i skopiuj jego ID

### **4.2 Implementacja zapisu do arkusza**
1. Połączenie z API Google Sheets
2. Wstawienie nowego wiersza z danymi raportu

---
## **5. Hostowanie bota**
### **5.1 Wybór metody hostowania**
- **Lokalnie** (podczas testów)
- **VPS (np. Ubuntu, DigitalOcean, Hetzner)**
- **Railway / Heroku (automatyczny restart i zarządzanie)**

### **5.2 Uruchomienie bota**
1. Uruchomienie bota lokalnie:
   ```bash
   node index.js
   ```
2. Automatyczne restartowanie bota na VPS:
   ```bash
   pm2 start index.js --name raport-dzienny-bot
   ```

---
## **6. Przyszłe rozszerzenia**
🔹 **Dodanie statusu dnia (L4, UW, UB, Weekend)**  
🔹 **Automatyczne przypomnienia o raportach**  
🔹 **Panel webowy do zarządzania danymi**  

---
🔥 **Bot gotowy do wdrożenia!** 🚀
