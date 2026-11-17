# Architektur – Game Theory Arena

## 1. Technische Entscheidungen

| Thema | Entscheidung | Begründung |
|---|---|---|
| UI | React 19 + TypeScript | Komponenten für Matrix, Graphen, Formulare; TS-Typen (discriminated unions) machen Aktionen/Zustände formal prüfbar. |
| Styling | Tailwind CSS 4 | Schnell, mobile-first, kein eigenes CSS-System nötig. |
| Build | Vite 6 | Läuft komplett lokal, `npm run build` erzeugt statische Dateien (kein Backend). |
| Tests | Vitest | Gleiche TS-Pipeline wie die App, schnelle Unit-Tests der reinen Logik. |
| Formeln | KaTeX | Rechenwege sehen aus wie in der Klausur (`\frac{T-R}{T-P}`), offline gebündelt. |
| Routing | Hash-Routing (eigener Mini-Hook) | Funktioniert auch per `file://` und auf statischem Hosting. |
| Persistenz | `localStorage` über einen Wrapper mit `try/catch` + In-Memory-Fallback | Private Tabs/gesperrter Speicher brechen die App nicht. |

## 2. Schichten und Abhängigkeitsregel

```
            ┌──────────────────────────────────────────────┐
            │ features/   (Bildschirme: Setup, Match, …)   │  React
            │ ui/         (Matrix, Ampel, Rechenweg, …)    │
            │ state/      (ArenaContext: Profil, Toasts)   │
            └───────────────▲──────────────────────────────┘
                            │ importiert
            ┌───────────────┴──────────────────────────────┐
            │ net/        Transport (lokal | V2: online)   │  dünn
            ├──────────────────────────────────────────────┤
            │ games/<id>/ params · engine · analysis ·     │  rein
            │             explain · bots · exercises       │
            │ games/registry.ts  Aufgaben-Generatoren      │
            ├──────────────────────────────────────────────┤
            │ learning/   Aufgabenformat, Konzepte, SRS,   │  rein
            │             Achievements, Glossar, Storage   │  (außer storage.ts)
            ├──────────────────────────────────────────────┤
            │ core/       Normalform-Spiele, RNG, Zahlen   │  rein
            └──────────────────────────────────────────────┘
```

**Regel:** Jede Schicht importiert nur von Schichten darunter. `core`, `learning` und `games` importieren niemals React, DOM oder Netzwerk.
Alles dort ist eine reine Funktion und damit ohne Browser testbar.
Die einzige Ausnahme ist `learning/storage.ts` (gekapselter `localStorage`-Zugriff).

## 3. Vertrag eines Spielmoduls

Jedes Spiel liegt in `src/games/<id>/` und besteht aus denselben Bausteinen:

| Datei | Inhalt |
|---|---|
| `params.ts` | Parametertyp, Defaults, Presets, `validate…()` (Fehler blockieren, Warnungen informieren) |
| `engine.ts` | `GameDefinition`: `init(params, seed)`, `reduce(state, action) → state`, `isFinished`, `viewFor(state, player)` |
| `analysis.ts` | **berechnet** Gleichgewichte aus den Parametern (nichts hart codiert) |
| `explain.ts` | erzeugt Kurztext + Klausur-Rechenweg (Strings mit `$TeX$`) aus der Analyse |
| `bots.ts` | Computer-Gegner: `decide(ctx) → action`, deterministisch über Seed |
| `exercises.ts` | Aufgaben-Generatoren je Konzept (für „Erst tippen“ und Klausurmodus) |
| `*.test.ts` | Lehrbuchwerte als Testfälle |

```ts
interface GameDefinition<P, S, A> {
  id: string;
  init(params: P, seed: number): S;
  reduce(state: S, action: A): S;   // rein, ungültige Aktionen ⇒ gleicher State
  isFinished(state: S): boolean;
}
```

### Determinismus
* Zufall (Spielende bei unbekanntem Horizont, Bot „Chaos“, Aufgaben) läuft über
  `randomFor(seed, ...keys)` – ein Hash aus Match-Seed + Runde + Zweck.
  Kein versteckter RNG-Zustand ⇒ dieselbe Aktionsfolge erzeugt immer denselben Spielverlauf.
* Bots sehen nur die **öffentliche Historie**, nie den verdeckten Zug des Gegners.

## 4. Datenfluss (V1: Hot-Seat)

```
 Mensch/Bot ──Action──► Transport.send ──► (Loopback) ──► reduce(state, action) ──► neuer State
                                                                   │
                         UI-Phase (Zug / Auswertung / Ende) ◄──────┘
                         analysis(params, history) ─► explain() ─► Analysebildschirm
```

* `net/transport.ts` definiert `Transport<A>` mit `send` und `subscribe`.
  V1 nutzt `createLocalTransport()` (synchroner Loopback).
* UI-Phasen (Vorhang beim Gerätewechsel, „Erst tippen“, Analyse) sind **UI-Zustand**,
  nicht Spielzustand – so bleibt die Spiellogik netzwerkfähig.

## 5. Vorbereitung auf V2 (Online-Multiplayer)

* Ein Match = `params + seed + Aktionsliste`. Online müssen nur Aktionen synchronisiert werden;
  jeder Client rechnet denselben State aus (Lockstep / Event-Sourcing).
* Verdeckte simultane Züge: entweder **Host-autoritativ** (Host sammelt Züge und sendet erst nach
  beiden Commits) oder **Commit–Reveal** (`hash(zug + salt)` senden, danach aufdecken).
  `viewFor(state, player)` blendet den Zug des Gegners bereits heute aus.
* Ein `SupabaseTransport`/`WebRTCTransport` implementiert nur `Transport<A>` – Engine,
  Analyse und UI bleiben unverändert. Raum-Code = Kanalname.

## 6. Lernsystem

* **Aufgabe** (`learning/tasks.ts`): `{ concept, prompt, answer: AnswerSpec, solution }`.
  `AnswerSpec` = Zahl (mit Toleranz, akzeptiert `0,5`, `0.5`, `1/2`), Einfachauswahl, Mehrfachauswahl.
* **Konzepte** (`learning/concepts.ts`): Feingranulare IDs wie `pd.grimThreshold`; jede Antwort
  (Spiel-Vorhersage oder Klausur) wird einem Konzept zugeordnet.
* **Spaced Repetition** (`learning/srs.ts`): Leitner-System mit 6 Fächern
  (Intervalle 0 / 1 / 2 / 4 / 8 / 16 Tage). Falsch ⇒ Fach 1, sofort wieder fällig.
* **Achievements** (`learning/achievements.ts`): reine Funktion `Event × Zähler → neu freigeschaltet`.
* **Bestenliste** (`learning/leaderboard.ts`): Punkte = Spielauszahlung + Bonus für richtige
  Vorhersagen / erkannte Gegner.

## 7. Verzeichnisstruktur

```
src/
  core/
    numbers.ts          Formatierung (de-DE), Brüche, Eingabe-Parser, Toleranzvergleich
    rng.ts              deterministischer Hash-RNG
    normalForm.ts       Bimatrix: Best Responses, reine/gemischte NE, Dominanz, Pareto
    types.ts            GameDefinition, Player
  games/
    pd/                 Gefangenendilemma (vertikaler Prototyp)
      params.ts engine.ts analysis.ts explain.ts bots.ts exercises.ts *.test.ts
    registry.ts         Konzept → Aufgaben-Generator (für Klausurmodus)
    (ultimatum/ auctions/ cournot/ bertrand/ beauty/ coordination/ – nach demselben Muster)
  learning/
    tasks.ts concepts.ts srs.ts achievements.ts leaderboard.ts glossary.ts storage.ts
  net/
    transport.ts
  state/
    ArenaContext.tsx    Profil (SRS, Zähler, Achievements, Bestenliste) + Toasts
  ui/
    RichText.tsx Term.tsx PayoffMatrix.tsx Verdict.tsx Derivation.tsx Curtain.tsx
    AnswerInput.tsx Button.tsx …
  features/
    home/ pd/ exam/ stats/ glossary/ achievements/ leaderboard/
  App.tsx main.tsx router.ts index.css
```

## 8. Roadmap

1. ✅ Architektur
2. ✅ Gefangenendilemma: Spiel, Bots, Analyse, Lernmodus, Klausurmodus, Statistik
3. Ultimatum → Koordinationsspiele (Stag Hunt/Chicken/BoS, nutzt `mixedNash2x2`) → Cournot →
   Bertrand → Auktionen → Beauty Contest
4. V2: Online-Transport
