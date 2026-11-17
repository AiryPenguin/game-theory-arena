# ♟️ Game Theory Arena

Browser-Spiel zur Klausurvorbereitung in Spieltheorie (VWL, ca. 5. Semester): klassische Spiele gegen
Computer-Persönlichkeiten oder Freunde (Hot-Seat) spielen – und nach jeder Runde sehen, ob ihr im
Nash-Gleichgewicht bzw. teilspielperfekten Gleichgewicht gelandet seid, **mit Rechenweg wie in der Klausur**.

Alle Gleichgewichte werden aus den Parametern berechnet, nichts ist hart codiert.

## Starten

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Unit-Tests (Lehrbuchwerte)
npm run build      # statische Dateien in dist/ (läuft ohne Backend, auch per file://)
```

## Stand (V1)

| Spiel | Status |
|---|---|
| Gefangenendilemma (one-shot, endlich wiederholt, unbekanntes Ende mit δ) | ✅ spielbar |
| Ultimatum, Stag Hunt/Chicken/BoS, Cournot, Bertrand, Auktionen, Beauty Contest | geplant (gleiches Modulmuster) |

**Gefangenendilemma enthält:**
- Frei wählbare Auszahlungen T, R, P, S mit Validierung (T > R > P > S, Warnung bei 2R ≤ T + S)
- 8 Computer-Gegner: Ökonom (spielt immer ein SPE), Tit-for-Tat, Grim Trigger, Pavlov, Der Faire,
  Der Lernende (Fictitious Play), Chaos, Der Gutmütige – optional geheim mit „Hättest du sie erkannt?“
  (beobachtungsäquivalente Strategien zählen als richtig)
- Hot-Seat mit Vorhang beim Gerätewechsel, Computer-vs-Computer zum Zuschauen
- Analyse jeder Runde: Matrix mit Unterstreichungsmethode, Ampel, Abweichungsgewinne, Pareto-Vergleich,
  Rückwärtsinduktion bzw. Folk-Theorem-Check δ ≥ (T−R)/(T−P) mit eingesetzten Werten, Tit-for-Tat-Bedingung
- Lernmodus „Erst tippen, dann sehen“, Klausurmodus mit Zeitlimit (9 Aufgabentypen), Fehlerstatistik mit
  Spaced Repetition (localStorage), Glossar-Tooltips (DE/EN), Achievements, Bestenliste

Architektur und Erweiterung um weitere Spiele: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
