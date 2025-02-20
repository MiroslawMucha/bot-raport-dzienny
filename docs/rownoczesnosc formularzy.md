Poniżej przedstawię szczegółową analizę całego systemu pod kątem obsługi wielu równoczesnych użytkowników (np. 5 jednocześnie) – krok po kroku przeanalizuję każdy moduł, opiszę zależności oraz rozważę potencjalne ryzyka, jakie mogą się pojawić przy równoczesnym wypełnianiu formularzy lub zapisie raportów.

---

## 1. Przegląd ogólny środowiska

- **Node.js** operuje w pojedynczym wątku – co oznacza, że operacje synchroniczne (np. modyfikacje struktur typu `Map`) są bezpieczne, bo nie będzie jednoczesnego dostępu z wielu wątków.
- Operacje asynchroniczne (np. żądania HTTP do Google Sheets, interakcje z Discord API) są jednak wykonywane równolegle w ramach event loop. Dzięki temu kilka żądań może być „w toku” jednocześnie.
- W kodzie zastosowano mechanizmy blokad (np. globalny `writeLock` w module Google Sheets oraz `locks` w store raportów) – choć są to proste mechanizmy, przy natężeniu ok. 5 użytkowników nie powinny spowodować zatkanego cache’u ani pomieszania danych.

---

## 2. Szczegółowa analiza modułów

### A. **raportDataStore.js**

- **Struktura danych:**  
  - Używana jest instancja `Map` (klucz: `userId`) do przechowywania danych formularza raportu. Każdy użytkownik ma oddzielny wpis, więc dane dla różnych użytkowników nie będą mieszane.
  
- **Blokady i synchronizacja:**  
  - Używana jest dodatkowa mapa `locks`, która przechowuje flagę mówiącą, czy dany użytkownik ma aktywny formularz.  
  - Sprawdzanie czy formularz jest aktywny (funkcja `hasActiveReport`) jest wykonywane synchronicznie. Z racji pojedynczego wątku oznacza to, że operacje te są uporządkowane.
  
- **Timeouty i czyszczenie:**  
  - Funkcja `cleanupStaleReports` jest wywoływana co 10 minut. Ponieważ operuje synchronicznie na Map, dla 5 formularzy i niewielkiej liczby operacji nie wpłynie to negatywnie na wydajność.
  
- **Wnioski:**  
  - Przy 5 równoczesnych użytkownikach każdy użytkownik operuje na odrębnym kluczu – nie powinno dojść do konfliktu ani mieszania danych.  
  - Przy większej liczbie użytkowników warto rozważyć bardziej zaawansowany mechanizm blokad, ale dla 5 równoległych operacji to wystarczające.

---

### B. **googleSheets.js**

- **Asynchroniczne wywołania API:**  
  - Wszystkie operacje komunikacji z Google Sheets (np. `dodajRaport`, `znajdzRaportUzytkownika`, `przeniesDoHistorii`) są asynchroniczne, wykorzystując API Google.  
  - Przy 5 równoczesnych żądaniach – obciążenie będzie niskie, o ile Google nie narzuci limitów (co przy niewielkiej liczbie zapytań jest mało prawdopodobne).

- **Globalny writeLock:**  
  - `dodajRaport` korzysta z globalnej zmiennej `writeLock` aby zapobiec kolizjom przy jednoczesnym zapisie.  
  - Jeśli jedna operacja zapisu trwa dłużej, kolejne wywołania muszą czekać, co realizowane jest przez rekurencyjne wywołanie funkcji po krótkim opóźnieniu.
  - Dla 5 użytkowników – taka sekwencja opóźnień (głównie gdy pisze się raport) nie powinna stanowić problemu. Jeśli jednak liczba operacji wzrośnie znacząco, może dojść do pewnych opóźnień, ale nie będzie to powodować błędów.
  
- **Operacje na arkuszu:**  
  - Odczytywanie, zapisywanie i usuwanie w arkuszu odbywa się przy użyciu metod API Google Sheets.  
  - Kolejka zapisów (metoda `processWriteQueue` opisana w kodzie) dodatkowo chroni przed „zatkaniem” zapisu, choć dla 5 operacji jest to wystarczające.

- **Wnioski:**  
  - Kod jest zoptymalizowany dla niskiego natężenia – 5 równoczesnych użytkowników generuje niewiele zapytań, więc nie powinno dojść do pomieszania danych ani zatkania.
  - Globalny lock zapewnia, że jeden zapis zakończy się przed rozpoczęciem kolejnego, co eliminuje potencjalne kolizje w Google Sheets.

---

### C. **channelManager.js**

- **Tworzenie kanałów:**  
  - `getOrCreateUserChannel` sprawdza, czy istnieje już kanał dla użytkownika, opierając się na kluczu `raport-<username>`.
  - Mechanizm rate limiting (zmienna `lastChannelCreation` oraz `rateLimitDelay`) gwarantuje, że nawet przy równoczesnych żądaniach nie zostanie uruchomiona zbyt duża liczba operacji tworzenia kanałów.
  - Jeśli dwa żądania pojawią się jednocześnie, jedno z nich będzie czekać do upłynięcia minimalnego odstępu (1 sekunda).
  
- **Uprawnienia i usuwanie starych kanałów:**  
  - Jeśli kanał istnieje, a bot nie ma odpowiednich uprawnień, stary kanał zostanie usunięty, a nowy utworzony.
  
- **Wnioski:**  
  - Przy 5 równoczesnych użytkownikach system tworzenia kanałów działa niezależnie dla każdego użytkownika.
  - Rate limit (1 sekunda) jest bardziej niż wystarczający dla niewielkiej liczby żądań – nie powinien doprowadzić do zapchania ani konfliktów w Discord API.

---

### D. **index.js**

- **Obsługa interakcji:**  
  - Główny plik jest odpowiedzialny za odbiór interakcji od użytkowników.
  - Każda interakcja (np. wysłanie formularza, kliknięcie przycisku) jest przetwarzana asynchronicznie.
  - Dane raportu są pobierane z `raportDataStore` na podstawie unikalnego `userId`, więc dane różnych użytkowników nie są mieszane.
  
- **Przepływ Logiki:**  
  - Po zebraniu kompletnych danych formularza, kod wywołuje funkcję wyszukiwania istniejącego raportu w Google Sheets oraz decyduje, czy wysłać nowy raport, czy dokonać podmiany.
  - Operacje związane ze współbieżnością (np. wysyłka raportu, aktualizacja statusu) obsługiwane są przez oddzielne asynchroniczne wywołania.
  
- **Wnioski:**  
  - Przy równoczesnym wypełnianiu raportów przez kilku użytkowników (każdy ma unikalny klucz) system nie miesza danych.
  - Możliwość “przeklejenia” danych w pamięci (cache) jest zminimalizowana, ponieważ każde wywołanie korzysta z zapisanej w `Map` wartości przypisanej do konkretnego `userId`.

---

## 3. Potencjalne ryzyka oraz wnioski

1. **Kwestia globalnego writeLock w googleSheets.js:**  
   - W sytuacji, gdy wielu użytkowników równocześnie rozpocznie zapis (np. więcej niż 5 użytkowników), może dojść do opóźnień, ponieważ tylko jeden zapis będzie realizowany na raz.  
   - Dla 5 użytkowników nie powinno to powodować błędów, ale przy większym obciążeniu warto rozważyć bardziej rozbudowany mechanizm kolejkowania lub rozdzielenie blokady na poziomie użytkownika.

2. **Kolidujące operacje od tego samego użytkownika:**  
   - Jeśli ten sam użytkownik przypadkowo rozpocznie dwa równoczesne formularze, istnieje ryzyko, że dane będą nadpisywane.  
   - Obecnie system stosuje blokadę na poziomie `userId`, co powinno zapobiec takim sytuacjom. Zaleca się jednak upewnić, że interfejs użytkownika nie pozwala na wielokrotne rozpoczęcie formularza.

3. **Google Sheets API Rate Limiting:**  
   - Google Sheets API ma własne limity żądań. Przy 5 użytkownikach liczba żądań (odczyty, zapisy, aktualizacje) jest bardzo niska, więc nie powinno dojść do przekroczenia limitów – chyba że każdy użytkownik będzie wykonywał bardzo częste aktualizacje.

4. **Rate limiting w channelManager:**  
   - Mechanizm ograniczeń (rateLimitDelay) zapewnia, że nawet jeśli kilkoro użytkowników jednocześnie wywoła funkcję tworzenia kanału, to każde wywołanie zostanie opóźnione – co nie stanowi problemu przy niskim obciążeniu, ale przy dużej liczbie użytkowników mogłoby powodować opóźnienia.

5. **Ogólny load i przepływ asynchroniczny:**  
   - Dzięki pojedynczemu wątkowi Node.js i użyciu asynchronicznych funkcji żadne operacje nie powinny się „przeintersować”. Każdy użytkownik pracuje na osobnych danych (kluczach `userId`), więc ryzyko pomieszania danych jest bardzo niskie.
   - Procesy asynchroniczne (wywołania API do Discorda i Google Sheets) są dobrze rozdzielone, więc przy 5 jednoczesnych użytkownikach aplikacja nie powinna się zapchać ani generować wielkich opóźnień.

---

## Podsumowanie

- **Dla 5 jednoczesnych użytkowników** kod:
  - **Nie powinien generować konfliktów** w pamięci, ponieważ dane raportów są przechowywane w osobnych wpisach w Map opartych na `userId`.
  - **Globalny writeLock** w module Google Sheets zapewnia, że przy zapisie raportu jeden zapis jest wykonywany na raz – przy takiej małej liczbie użytkowników jest to akceptowalne.
  - **Rate limiting w tworzeniu kanałów** w module channelManager zapewnia, że nie tworzy się zbyt wiele kanałów jednocześnie.
  - **Asynchroniczne operacje** w index.js zapewniają, że interakcje użytkowników są obsługiwane niezależnie, a kolejność żądań jest kontrolowana.
  
- **Rekomendacje dodatkowe:**
  - Monitorować czasy odpowiedzi Google Sheets przy większej liczbie użytkowników – choć przy 5 użytkownikach nie powinno być problemów.
  - Rozważyć zabezpieczenie UI, aby ten sam użytkownik nie mógł rozpocząć dwóch formularzy równolegle.
  - Przy większym obciążeniu można rozważyć oparty na kolejce system (np. z użyciem biblioteki kolejkowej) dla operacji zapisu do Google Sheets, jednak dla aktualnego zakresu 5 użytkowników obecny mechanizm jest wystarczający.
  
**Wnioski:**  
Po szczegółowej analizie kodu w modułach: **raport.js**, **channelManager.js**, **googleSheets.js**, **raportDataStore.js** oraz **index.js** można stwierdzić, że system jest dobrze zoptymalizowany pod kątem równoczesnego użycia przez do 5 użytkowników. Mechanizmy blokad, oddzielne przechowywanie danych dla każdego użytkownika i stosowanie asynchronicznych wywołań API sprawiają, że operacje nie będą się mieszały ani powodować „zatkania” aplikacji czy Google Sheets. Oczywiście, przy większym obciążeniu należałoby rozważyć bardziej wyrafinowane rozwiązania, ale dla przewidzianego zakresu użytkowników kod powinien działać stabilnie i bez błędów.

Mam nadzieję, że powyższa analiza jest wystarczająco szczegółowa i rozwiewa wszelkie wątpliwości dotyczące skalowalności i bezpieczeństwa systemu dla kilku równoczesnych użytkowników.
