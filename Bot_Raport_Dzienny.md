# **Dokumentacja projektu – Bot Raport Dzienny (Discord)**

## **1. Opis projektu**

Bot **Raport Dzienny** to narzędzie do raportowania godzin pracy pracowników na Discordzie. Użytkownicy wypełniają formularz poprzez komendę `/raport`, a dane są zapisywane w Google Sheets i publikowane na dedykowanych kanałach.

## **2. Struktura kanałów**

### 📌 **Kanały prywatne dla użytkowników**

Każdy pracownik ma swój prywatny kanał `#raport-imie-nazwisko`, dostępny tylko dla niego i administracji.  
➡ **Cel:** Użytkownik widzi swój aktualny raport i może go edytować.

### 📌 **Kanał ogólny dla raportów – `#📋raporty-dzienne`**

➡ **Cel:** Archiwum wszystkich raportów – zarówno oryginalnych, jak i edytowanych. Dzięki temu można prześledzić zmiany.

### 📌 **Kanały administracyjne**

- `#📢ogłoszenia` – tylko dla kierownictwa, ważne informacje
- `#🆘discord-help` – wsparcie techniczne

## **3. Formularz zgłoszenia raportu `/raport`**

Formularz zgłoszenia uruchamiany jest przez komendę `/raport` i zawiera następujące pola:

🔹 **Miejsce pracy** (lista wyboru):

- SERWIS
- Nurzec-Stacja BUDOWA
- Gorlice BUDOWA
- Ludwin BUDOWA
- Wadowice BUDOWA
- Praca Na Bazie
- Biuro
- Inne (możliwość wpisania własnej nazwy)

🔹 **Czas pracy** (date & time picker)

- **Godzina rozpoczęcia**
- **Godzina zakończenia**

🔹 **Dieta / Delegacja** (Tak/Nie)  
🔹 **Osoby pracujące** (wybór spośród członków serwera)  
🔹 **Jakim autem?** (lista wyboru)

- Renault Master
- Opel Vivaro
- Citroen Jumpy Artur
- Citroen Jumpy Dariusz Lublin
- Fiat Scudo
- Citroen Berlingo
- WV Caddy
- WV Amarok
- Inne (możliwość wpisania własnej nazwy)

🔹 **Kto był kierowcą?** (wybór spośród członków serwera)

## **4. Proces zapisu i wysyłki raportu**

1. Użytkownik wpisuje `/raport`, wypełnia formularz i wysyła.
2. Bot:
   ✅ **Zapisuje raport do Google Sheets** (nowy wiersz w arkuszu)  
   ✅ **Publikuje raport w `#📋raporty-dzienne`**  
   ✅ **Wysyła raport na prywatny kanał użytkownika**

📩 **Przykładowa wiadomość w kanale użytkownika (`#raport-imie-nazwisko`):**

```
📋 RAPORT DZIENNY  
👷‍♂️ Pracownik: @Mirek  
📍 Miejsce pracy: Gorlice BUDOWA  
⏳ Czas pracy: 07:30 - 16:00  
💰 Dieta / Delegacja: Tak  
👥 Osoby pracujące: @Janek, @Piotrek  
🚗 Auto: Citroen Jumpy Artur  
🧑‍✈️ Kierowca: @Janek  
```

📩 **Przykładowa wiadomość w `#📋raporty-dzienne` (archiwum):**

```
📌 **RAPORT DZIENNY – ORYGINAŁ**  
👷‍♂️ Pracownik: @Mirek  
📍 Miejsce pracy: Gorlice BUDOWA  
⏳ Czas pracy: 07:30 - 16:00  
💰 Dieta / Delegacja: Tak  
👥 Osoby pracujące: @Janek, @Piotrek  
🚗 Auto: Citroen Jumpy Artur  
🧑‍✈️ Kierowca: @Janek  
```

## **5. Zasady edycji raportu `/edytuj_raport`**

- Pracownik może edytować **tylko 3 ostatnie raporty**.
- Edycja dostępna **do 7 dni wstecz**.
- Po edycji:
  ✅ **Nowy raport zastępuje poprzedni w prywatnym kanale użytkownika**.  
  ✅ **W `#📋raporty-dzienne` dodawany jest nowy wpis z oznaczeniem `🛠 EDYTOWANO`**.

📩 **Przykład edytowanego raportu w `#📋raporty-dzienne`**:

```
🛠 **RAPORT DZIENNY – EDYCJA** (Oryginalny wpis: 10.02.2025, godz. 16:05)  
👷‍♂️ Pracownik: @Mirek  
📍 Miejsce pracy: Gorlice BUDOWA  
⏳ Czas pracy: 07:30 - 17:00 *(zmiana godziny zakończenia)*  
💰 Dieta / Delegacja: Nie *(zmiana na Nie)*  
👥 Osoby pracujące: @Janek, @Piotrek  
🚗 Auto: Citroen Jumpy Artur  
🧑‍✈️ Kierowca: @Janek  
```

## **6. Automatyzacja przypomnień**

🚀 **Opcja do wdrożenia w przyszłości** – funkcja przypomnień została przesunięta do przyszłych aktualizacji, ponieważ wymaga przewidywania harmonogramów pracy i uwzględniania weekendów.

## **7. Integracja z Google Sheets**

- Każdy raport zapisuje się w Google Sheets z kolumnami:

  | Data | Pracownik | Miejsce pracy | Czas rozpoczęcia | Czas zakończenia | Dieta | Osoby pracujące | Auto | Kierowca | Status |
  | ---- | --------- | ------------- | ---------------- | ---------------- | ----- | --------------- | ---- | -------- | ------ |

---

## **8. Przyszłe funkcje (nie wdrażamy na start, ale zapisujemy)**

🔹 **Status dnia**: L4, Urlop (UW), Urlop bezpłatny (UB), Weekend  
🔹 **Brak raportowania w weekendy** – bot domyślnie zakłada, że to wolne dni  
🔹 **Możliwość oznaczenia delegacji jako kilkudniowej**  
🔹 **Automatyczne przypomnienia o raporcie (przesunięte do przyszłych funkcji)**

---

🔥 **Plan gotowy!** Teraz przechodzimy do pisania skryptów! 🚀
