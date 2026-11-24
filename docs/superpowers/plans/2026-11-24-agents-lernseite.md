# agents.rfi-irfos.com Lern-App: Bauplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine Ein-Bildschirm-Web-App (PWA), die mit fünf geskripteten Abläufen wie ein interaktives Erklärvideo zeigt, wie ein KI-Agent arbeitet.

**Architecture:** Vite + TypeScript ohne UI-Framework. Ein `Player` als reine Zustandsmaschine (testbar ohne DOM) schreitet durch Schritte, die aus Szenario-Datendateien gebaut werden. Je Station baut ein Szenen-Modul eine GSAP-Zeitleiste auf vier Ebenen (FX-Canvas, SVG-Bühne, HTML-Text, Steuerung). Das Layout wechselt über `data-format` am Wurzelelement, Morphs zwischen den Formaten laufen mit GSAP Flip.

**Tech Stack:** Vite 7, TypeScript 5 (strict), GSAP 3 (inkl. Flip), vite-plugin-pwa (generateSW), Vitest, Playwright, GitHub Actions → GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-11-24-agents-lernseite-design.md` (lies sie vor jeder Aufgabe, besonders 6.2–6.5, 7a, 7b).

## Global Constraints

- App füllt `100dvh` × `100vw`, `html, body { overflow: hidden }`. Scrollen gibt es nur in der Detail-Ebene.
- Zur Laufzeit lädt die App nichts von fremden Servern. Sie nutzt Systemschriften (`"Inter", "Segoe UI", system-ui, …` wie FluxPost), alle Bibliotheken und Assets liegen im Build.
- Formate: `w/h < 0.8` ist `hoch`, `w/h > 1.25` ist `quer`, sonst `quadrat`.
- Lesezeit: höchstens 3 Wörter/s, also `ceil(wörter / 3 * 1000 / tempo)` ms. Tempo ∈ {0.75, 1, 1.5}, Standard 1, Auto-Modus an.
- Stationsreihenfolge: `eingabe → wahrnehmung → denken → planung → werkzeug → handeln → pruefen → ergebnis`. Gedächtnis ist ein Seitenarm von `denken` (Feld `gedaechtnis`), keine eigene Station.
- Mitmach-Frage: genau eine pro Ablauf, an `werkzeug`, drei Karten, eine richtig. Bei einer falschen Wahl folgt ein Erklärsatz, dann geht es weiter. Im Auto-Modus wählt der Agent nach 8000 ms selbst die richtige Karte.
- Freie Eingabe ohne Treffer: Es läuft `wetter`, mit dem Hinweis „Das ist ein Beispiel. So ähnlich würde ein Agent deine Frage bearbeiten.“ Der Satz „Im Hintergrund läuft kein echtes KI-Modell.“ ist auf dem Startbildschirm immer sichtbar.
- Thema: hell als Standard (Zabih: `--paper #F4F6FA`, `--ink #1B2433`, `--muted #4B5563`, `--line #D5DCE8`, `--card #FFFFFF`, `--focus #0060B8`), dunkel mit den FluxPost-Werten aus `~/projects/fluxpost/fluxpost/static/app.css` (`--bg #070c19`, `--card #0e1628`, `--text #f2f5ff`, `--line #1d2b49`, `--focus #8fa2ff`). Umschalten per `prefers-color-scheme` oder Schalter, gespeichert in `localStorage`. Die Stationsfarben übernimmst du aus Zabihs Datei (`--c` je Station: `#2F6FB0`, `#6B3FC0`, `#B86A0E`, `#C93B52`, `#0B6B4C` u. a.). Prüfe in beiden Themen Kontrast nach WCAG AA, wichtige Aussagen stehen nie in `--muted`.
- Abstände: Einheit `--u: clamp(4px, 0.9vmin, 8px)`, Stufen `--s1…--s7` = 1, 2, 3, 4, 6, 8, 12 × `--u`, `--radius: 14px`. Andere Abstandswerte gibt es nicht.
- Knöpfe: Glas, Highlight rechts, nie vollflächig gefüllt. Die Daten-Kugel ist ein orangener Punkt (`#F04D20`).
- Bewegung: Nichts springt. Jeder Ein-, Aus- und Layoutwechsel ist animiert (Standard 350–600 ms, `power2.inOut`). Bei `prefers-reduced-motion: reduce` gibt es nur Überblendungen ≤ 200 ms, kein Flug, keine Partikel.
- Ton: standardmäßig aus, nur leise Effekte, keine Musik. Alles muss stumm verständlich sein.
- Texte: Deutsch mit echten Umlauten. Alle UI-Texte stehen in `src/content/de.ts`, alle Ablauftexte in `src/scenarios/*.ts`. Kein Fachwort (LLM, API, Token, Prompt) im Stationstext. In `tiefer` ist es nur mit Alltagserklärung im selben Satz erlaubt.
- Kein Tracking, keine Cookies, keine Analytics. `localStorage` nur für: gesehene Abläufe, Thema, Ton.
- Commits: Stagen (`git add`) und committen in getrennten Bash-Aufrufen (LLB-Hook). Playwright und Lighthouse laufen per `colony-run` auf der Kolonie (schwere Last), Vitest darf lokal laufen.

## Review Focus

1. **Gerät drehen oder Fenstergröße ändern mitten in einer Animation:** Das Layout morpht weich ins neue Format, der Player bleibt auf seinem Schritt, nichts läuft über. Test in Task 5.
2. **Seltsame freie Eingabe** (500 Zeichen, nur Leerzeichen, Emoji, ein Wort mit 60 Buchstaben): Es entstehen höchstens 8 Wortkarten plus „…“, lange Wörter werden umbrochen, nichts läuft über, ein leeres Feld startet nichts. Tests in Task 3 und 7.
3. **`localStorage` nicht verfügbar** (Safari privat, Schul-Richtlinie): Die App läuft mit Speicher im Arbeitsspeicher weiter, ohne Fehler. Test in Task 3.
4. **Doppelklick auf „Ablauf starten“ oder Klicks während des Eintauchens:** Es gibt genau eine Vorstellung, und Steuerung während eines Übergangs wird nach dem Übergang angewendet statt verloren. Tests in Task 2 und 6.
5. **Kleinste und Beamer-Bildschirme** (320×568, 1024×768, 1920×1080) sowie reine Tastaturbedienung: Es gibt keinen Scroll, jeder Knopf ist per Tab erreichbar und hat einen sichtbaren Fokusrahmen, Esc schließt die Detail-Ebene, Leertaste pausiert. Tests in Task 5 und 9.

---

## Dateistruktur

```
agents-lernseite/
  index.html  vite.config.ts  tsconfig.json  package.json  playwright.config.ts
  public/CNAME  public/icons/*.png  public/sfx/*.ogg  CREDITS.md
  .github/workflows/pages.yml
  src/main.ts                    Start, Verdrahtung Player ↔ UI ↔ Szenen
  src/engine/types.ts            Szenario- und Schritt-Typen
  src/engine/reading-time.ts     readingMs
  src/engine/format.ts           formatFor, watchFormat
  src/engine/validate.ts         validateScenario
  src/engine/steps.ts            buildSteps
  src/engine/player.ts           Player (Zustandsmaschine, zeitgesteuert per tick)
  src/engine/matcher.ts          matchScenario, wordCards
  src/engine/store.ts            safeStore (localStorage mit Rückfall)
  src/engine/sound.ts            Sound
  src/theme/tokens.css  src/theme/layout.css  src/theme/glass.css
  src/ui/start.ts  src/ui/controls.ts  src/ui/detail.ts  src/ui/quiz.ts  src/ui/progress-bar.ts
  src/fx/field.ts                FX-Canvas (WebGL2, Rückfall 2D)
  src/scenes/registry.ts         sceneFor(station, art) → SceneBuilder
  src/scenes/{dive,wahrnehmung,denken,planung,werkzeug,pruefen,ergebnis}.ts
  src/scenes/handeln/{suche,api,code,bild,planung}.ts
  src/scenes/rueckblick/{kreislauf,besser}.ts
  src/svg/*.svg                  Figuren, Werkzeuge, Schublade, Terminal (Glasbox, zweifarbig)
  src/content/de.ts
  src/scenarios/{index,wetter,flugsuche,programm,foto,ausflug}.ts
  scripts/check-copy.ts  scripts/copy-sheet.ts  scripts/contact-sheet.ts
  tests/unit/*.test.ts  tests/e2e/*.spec.ts
```

---

### Task 1: Projekt, Typen, Lesezeit, Format

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/engine/types.ts`, `src/engine/reading-time.ts`, `src/engine/format.ts`
- Test: `tests/unit/reading-time.test.ts`, `tests/unit/format.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type StationId = 'eingabe'|'wahrnehmung'|'denken'|'planung'|'werkzeug'|'handeln'|'pruefen'|'ergebnis'
  type Art = 'suche'|'api'|'code'|'bild'|'planung'
  type Format = 'hoch'|'quadrat'|'quer'
  type Tempo = 0.75|1|1.5
  interface Karte { icon: string; label: string }
  interface Werkzeugwahl { frage: string; karten: [Karte,Karte,Karte]; richtig: 0|1|2; erklaerung: string }
  interface StationScript { id: StationId; text: string; tiefer?: string[]; kurz?: boolean;
    gedaechtnis?: string; werkzeug?: Werkzeugwahl; daten?: Record<string, unknown> }
  interface Schleife { grund: string; zweiterDurchlauf: StationScript[] }   // denken … pruefen
  interface Scenario { id: string; titel: string; aufgabe: string; art: Art; stichwoerter: string[];
    stationen: StationScript[]; schleife?: Schleife; ergebnis: string }
  readingMs(text: string, tempo?: Tempo): number
  formatFor(w: number, h: number): Format
  watchFormat(cb: (f: Format) => void): () => void   // resize + orientationchange, entprellt 120 ms
  ```

- [ ] **Step 1:** `git init` in `~/projects/agents-lernseite`, Vite-Vanilla-TS-Gerüst, `npm i gsap`, `npm i -D vitest @playwright/test vite-plugin-pwa typescript`. `tsconfig` mit `strict: true`.
- [ ] **Step 2: Failing tests**
  ```ts
  expect(readingMs('eins zwei drei')).toBe(1000)
  expect(readingMs('eins zwei drei', 1.5)).toBe(667)
  expect(readingMs('  ')).toBe(0)
  expect(formatFor(360, 740)).toBe('hoch'); expect(formatFor(800, 1000)).toBe('quadrat')
  expect(formatFor(1000, 800)).toBe('quadrat'); expect(formatFor(1250, 1000)).toBe('quadrat')
  expect(formatFor(1366, 768)).toBe('quer'); expect(formatFor(799, 1000)).toBe('hoch')
  ```
- [ ] **Step 3:** `npx vitest run`. Erwartet: FAIL (Funktionen fehlen).
- [ ] **Step 4:** Implementiere beide Funktionen. Wörter = Split an Leerraum, leere Teile verworfen.
- [ ] **Step 5:** `npx vitest run`. Erwartet: PASS.
- [ ] **Step 6:** Commit `chore: Projektgerüst, Typen, Lesezeit, Format`.

### Task 2: Schritte und Player

**Files:**
- Create: `src/engine/steps.ts`, `src/engine/player.ts`
- Test: `tests/unit/steps.test.ts`, `tests/unit/player.test.ts`

**Interfaces:**
- Consumes: Typen und `readingMs` aus Task 1.
- Produces:
  ```ts
  interface Step { station: StationId; script: StationScript; pass: 1|2; loopStart?: boolean }
  buildSteps(s: Scenario): Step[]
  type PlayerState = 'idle'|'playing'|'paused'|'quiz'|'transition'|'done'
  class Player {
    constructor(steps: Step[], opts?: { auto?: boolean; tempo?: Tempo })
    readonly state: PlayerState; readonly index: number; readonly step: Step
    start(): void; play(): void; pause(): void; next(): void; prev(): void; goTo(i: number): void
    setTempo(t: Tempo): void; setAuto(a: boolean): void
    answerQuiz(i: 0|1|2): { richtig: boolean; erklaerung?: string }
    beginTransition(): void; endTransition(): void      // Szenen melden Animationen
    tick(ms: number): void                               // einzige Zeitquelle
    on(ev: 'step'|'quiz'|'done'|'state', cb: (p: Player) => void): () => void
  }
  ```

- [ ] **Step 1: Failing tests**, Szenario-Fixture mit Schleife in `tests/unit/fixtures.ts`.
  - `buildSteps` ohne Schleife ergibt 8 Schritte in der Reihenfolge der Global Constraints.
  - Mit Schleife (zweiter Durchlauf denken…pruefen, 5 Stationen): 13 Schritte. Schritt 7 (Index) ist `denken`, `pass: 2`, `loopStart: true`. Letzter Schritt ist `ergebnis`.
  - Auto-Modus: Nach `start()` und `tick(readingMs(step.text))` ist `index` 1. Bei `kurz: true` liegt die Haltezeit bei `min(readingMs, 2000)`.
  - Bei `werkzeug` wechselt `state` zu `'quiz'`, `tick(7999)` lässt den Schritt stehen, `tick(1)` beantwortet richtig und geht weiter.
  - `answerQuiz(falsch)` gibt `{ richtig: false, erklaerung }` zurück, der Player geht danach weiter.
  - `start()` zweimal hintereinander erzeugt genau ein `step`-Ereignis für Index 0 (Review Focus 4).
  - `next()` während `'transition'` wird gemerkt und nach `endTransition()` genau einmal ausgeführt.
  - `pause()` friert `tick` ein. `prev()` bei Index 0 bleibt 0. `goTo(99)` wird auf den letzten Schritt begrenzt. Nach dem letzten Schritt ist `state` `'done'`.
  - `setTempo(1.5)` verkürzt die laufende Haltezeit anteilig.
- [ ] **Step 2:** `npx vitest run tests/unit/player.test.ts tests/unit/steps.test.ts`. Erwartet: FAIL.
- [ ] **Step 3:** Implementiere die Zustandsmaschine. Keine Timer im Player, nur `tick`. `main.ts` treibt `tick` später per `gsap.ticker`.
- [ ] **Step 4:** Tests laufen. Erwartet: PASS.
- [ ] **Step 5:** Commit `feat: Schritte und Player`.

### Task 3: Validator, Matcher, Speicher, Ton, Wetter-Ablauf

**Files:**
- Create: `src/engine/validate.ts`, `src/engine/matcher.ts`, `src/engine/store.ts`, `src/engine/sound.ts`, `src/scenarios/wetter.ts`, `src/scenarios/index.ts`
- Test: `tests/unit/validate.test.ts`, `tests/unit/matcher.test.ts`, `tests/unit/store.test.ts`, `tests/unit/sound.test.ts`, `tests/unit/scenarios.test.ts`

**Interfaces:**
- Produces:
  ```ts
  validateScenario(s: Scenario): string[]          // leere Liste = gültig, sonst deutsche Fehlermeldungen
  matchScenario(text: string, all: Scenario[]): { scenario: Scenario; beispiel: boolean }
  wordCards(text: string, max?: number /* 8 */): string[]
  safeStore: { get(k: string): string|null; set(k: string, v: string): void }
  seenScenarios(): string[]; markSeen(id: string): void
  class Sound { on: boolean /* Standard false */; toggle(): boolean; play(name: SfxName): void }
  type SfxName = 'klick'|'wisch'|'eintauchen'|'auftauchen'|'richtig'|'hinweis'
  scenarios: Scenario[]                             // Reihenfolge: wetter, flugsuche, programm, foto, ausflug
  ```

- [ ] **Step 1: Failing tests**
  - `validateScenario` meldet einen Fehler bei: falscher Stationsreihenfolge, fehlender Station, keiner oder zwei `werkzeug`-Fragen, `richtig` außerhalb von 0–2, mehr als einem Satz in `text` (mehr als ein `[.!?]` vor dem Ende), mehr als 18 Wörtern in `text`, `tiefer` mit weniger als 2 oder mehr als 4 Einträgen, einem zweiten Durchlauf, der nicht mit `denken` beginnt oder nicht mit `pruefen` endet, und einem Fachwort aus `['LLM','API','Token','Prompt']` in `text`.
  - Bei `matchScenario` gilt: „Flug nach Berlin“ ergibt `flugsuche`, „PROGRAMM schreiben“ ergibt `programm`, „Schulausflug nach Wien“ ergibt `ausflug`, „“ und „Wie spät ist es?“ ergeben `wetter` mit `beispiel: true`. Umlaute werden normalisiert („für“ = „fuer“). Bei Gleichstand gewinnt der erste in der Reihenfolge.
  - Bei `wordCards` gilt:
    - 500 Zeichen ergeben genau 9 Einträge, der letzte ist „…“.
    - Text nur aus Leerzeichen ergibt `[]`.
    - Emoji bleiben erhalten.
    - Satzzeichen am Wortrand werden entfernt.
  - Wirft `localStorage` bei jedem Zugriff (Stub), funktionieren `markSeen` und `seenScenarios` trotzdem innerhalb der Sitzung (Review Focus 3).
  - Bei `Sound` ist `on` am Anfang `false`. `play` wirft nie, auch wenn `Audio.play()` ablehnt.
  - In `scenarios.test.ts` liefert `validateScenario` für jedes Szenario in `scenarios` die Liste `[]`.
- [ ] **Step 2:** Tests laufen. Erwartet: FAIL.
- [ ] **Step 3:** Implementiere alles. Matcher: kleinschreiben, Umlaute normalisieren, Treffer der `stichwoerter` als Teilwort zählen. Schreibe `wetter.ts` vollständig nach Spec 6.4 (kurzer Ablauf, ohne Schleife, `planung` und `pruefen` als `kurz`). Die anderen vier kommen in Task 11. Bis dahin enthält `index.ts` nur `wetter`.
- [ ] **Step 4:** Tests laufen. Erwartet: PASS.
- [ ] **Step 5:** Commit `feat: Validator, Matcher, Speicher, Ton, Wetter`.

### Task 4: Thema, Abstände, Glas

**Files:**
- Create: `src/theme/tokens.css`, `src/theme/glass.css`
- Test: `tests/e2e/theme.spec.ts`

- [ ] **Step 1: Failing e2e-Test.** Mit `colorScheme: 'light'` ist `getComputedStyle(body).backgroundColor` gleich `rgb(244, 246, 250)`, mit `'dark'` gleich `rgb(7, 12, 25)`. Der Schalter `[data-action=theme]` kippt das Thema und überlebt ein Neuladen. Für jedes Element mit `[data-contrast-check]` liegt der Kontrast in beiden Themen bei ≥ 4.5 (Rechenhilfe im Test).
- [ ] **Step 2:** Per `colony-run` laufen lassen. Erwartet: FAIL.
- [ ] **Step 3:** Tokens nach den Global Constraints. Thema über `[data-theme=light|dark]` am `<html>`, Startwert aus `safeStore` oder `prefers-color-scheme`. `.glass`-Knopf: halbtransparente Fläche, 1 px Rand, Highlight-Verlauf rechts, Fokusrahmen `--focus` 2 px.
- [ ] **Step 4:** Erwartet: PASS.
- [ ] **Step 5:** Commit `feat: Thema hell/dunkel, Abstandsraster, Glas`.

### Task 5: Layout-Hülle mit drei Formaten

**Files:**
- Create: `src/theme/layout.css`, Grundgerüst in `src/main.ts`
- Test: `tests/e2e/layout.spec.ts`

**Interfaces:**
- Produces: DOM-Slots `[data-slot=fx|buehne|text|steuerung|eingabe]` unter `#app[data-format]` sowie `applyFormat(f: Format): void`. Der Wechsel morpht per `Flip.getState` / `Flip.from` in 500 ms.

- [ ] **Step 1: Failing e2e-Test** für die Viewports 320×568, 360×740, 820×1000, 1024×768, 1366×768 und 1920×1080:
  - `#app[data-format]` hat jeweils den erwarteten Wert.
  - `scrollingElement.scrollHeight <= innerHeight` und `scrollWidth <= innerWidth`.
  - Kein Slot ragt aus dem Viewport.
  - Nach `page.setViewportSize` von 360×740 auf 740×360 wechselt das Format nach höchstens 700 ms. Zwischenbilder bei 100 ms und 300 ms zeigen Slot-Rechtecke zwischen Start- und Endlage, also ein Morph und kein Sprung (Review Focus 1).
- [ ] **Step 2:** Läuft. Erwartet: FAIL.
- [ ] **Step 3:** CSS-Grid mit `grid-template-areas` je `[data-format]`:
  - `hoch`: Bühne oben, Text in der Mitte, Eingabe/Steuerung unten.
  - `quer`: Bühne links (≈ 62 %), Text rechts, Steuerung unten über die volle Breite, Bühnenbreite höchstens `min(100vw, 2.2 × 100dvh)`.
  - `quadrat`: wie `hoch` mit breiterer Bühne.
  
  `watchFormat` ruft `applyFormat` auf.
- [ ] **Step 4:** Erwartet: PASS.
- [ ] **Step 5:** Commit `feat: Layout-Hülle mit drei Formaten`.

### Task 6: Startbildschirm und Eintauchen

**Files:**
- Create: `src/ui/start.ts`, `src/fx/field.ts`, `src/scenes/dive.ts`, `src/content/de.ts`
- Test: `tests/e2e/start.spec.ts`, `tests/unit/field.test.ts`

**Interfaces:**
- Produces:
  ```ts
  mountStart(root: HTMLElement, scenarios: Scenario[], onStart: (r: { scenario: Scenario; eingabe: string; beispiel: boolean }) => void): () => void
  class Field { constructor(c: HTMLCanvasElement); mode: 'webgl2'|'2d'|'off'; setDensity(n: number): void; dive(ms: number): Promise<void>; surface(ms: number): Promise<void>; stream(from: DOMPoint, to: DOMPoint, ms: number): Promise<void>; destroy(): void }
  type SceneBuilder = (ctx: SceneCtx) => gsap.core.Timeline
  interface SceneCtx { slots: Record<'buehne'|'text'|'eingabe', HTMLElement>; field: Field; step: Step; scenario: Scenario; eingabe: string; format: Format; reduced: boolean; sound: Sound }
  ```

- [ ] **Step 1: Failing tests**
  - Unit: `Field` setzt `mode` auf `'2d'`, wenn `getContext('webgl2')` `null` liefert, und auf `'off'` bei `reduced`.
  - E2E: Der Start zeigt nur die Überschrift „Deine Aufgabe“, 4 bis 5 Beispielkarten, das Eingabefeld unten, „Ablauf starten“ und den Satz „Im Hintergrund läuft kein echtes KI-Modell.“
  - E2E: Bei leerem Feld ohne gewählte Karte ist der Knopf deaktiviert.
  - E2E: Ein Klick auf eine Karte tippt deren `aufgabe` sichtbar ins Feld (Tipp-Animation).
  - E2E: Ein Doppelklick auf „Ablauf starten“ ergibt genau ein `step`-Ereignis, das per `window.__events` im Testmodus `?test=1` sichtbar ist (Review Focus 4).
  - E2E: Bei `reducedMotion: 'reduce'` ist der Wechsel eine Überblendung von höchstens 200 ms, ohne `transform: scale` am Eingabefeld.
- [ ] **Step 2:** Läuft. Erwartet: FAIL.
- [ ] **Step 3:** Baue das Eintauchen in `dive.ts` als Zeitleiste von ca. 1,6 s:
  1. Das Eingabefeld wächst zum Rahmen und wird zum Tor.
  2. Die Kamera fliegt hinein: Die Bühne skaliert von 0.6 auf 1 und blendet ein, `field.dive`.
  3. Die orange Daten-Kugel löst sich aus dem Text.

  Der Testmodus `?test=1` setzt alle Dauern auf 0 und stellt `window.__events` bereit.
- [ ] **Step 4:** Erwartet: PASS.
- [ ] **Step 5:** Commit `feat: Startbildschirm und Eintauchen`.

### Task 7: Stationsszenen Wahrnehmung, Denken (+ Gedächtnis), Planung, Werkzeug mit Mitmach-Frage

**Files:**
- Create: `src/scenes/registry.ts`, `src/scenes/{wahrnehmung,denken,planung,werkzeug}.ts`, `src/ui/quiz.ts`, `src/svg/{schublade,notiz,werkzeug-*.svg}`
- Test: `tests/e2e/stations-a.spec.ts`

**Interfaces:**
- Produces: `sceneFor(station: StationId, art: Art): SceneBuilder`, `mountQuiz(slot: HTMLElement, w: Werkzeugwahl, onPick: (i: 0|1|2) => void): () => void`

- [ ] **Step 1: Failing e2e** im Ablauf `wetter` mit `?test=1`:
  - Bei `wahrnehmung` gibt es so viele `.wortkarte`, wie `wordCards(eingabe)` liefert.
  - Eingabe mit 500 Zeichen: 9 Karten, kein Überlauf (Review Focus 2).
  - Bei `denken` mit `gedaechtnis` ist `.schublade[data-open=true]` sichtbar.
  - Bei `planung` gibt es nummerierte `.plankarte`.
  - Bei `werkzeug` gibt es drei `.quizkarte`, die per Tab erreichbar sind und per Enter gewählt werden können.
  - Eine falsche Wahl zeigt den `erklaerung`-Text, danach geht es weiter.
  - In jeder Station steht genau ein Erzählsatz in `[data-slot=text]`.
- [ ] **Step 2:** Läuft. Erwartet: FAIL.
- [ ] **Step 3:** Setze die Stilmittel nach Spec 6.3 um. Der Text kommt zuerst, die Handlung beginnt erst, wenn der Text steht (Film-Regel). Die Stationsfarbe kommt aus der Variable `--c`. Kurze Stationen (`kurz`) zeigen nur Text und einen kleinen Kugel-Hüpfer.
- [ ] **Step 4:** Erwartet: PASS.
- [ ] **Step 5:** Commit `feat: Stationen Wahrnehmung bis Werkzeug`.

### Task 8: Handeln-Varianten, Prüfen mit Schleife, Ergebnis

**Files:**
- Create: `src/scenes/handeln/{suche,api,code,bild,planung}.ts`, `src/scenes/{pruefen,ergebnis}.ts`, `src/svg/{terminal,karte,lupe}.svg`
- Test: `tests/e2e/stations-b.spec.ts`

**Interfaces:**
- Consumes: Die `daten`-Formen je `art`, die du hier festlegst und in `types.ts` als Union `HandelnDaten` ergänzt:
  - `suche`: `{ treffer: {titel; detail}[] }`
  - `api`: `{ anfrage: string; antwort: string }`
  - `code`: `{ zeilen: string[]; test: { name; ok: boolean } }`
  - `bild`: `{ src: string; markierungen: {x;y;label}[] }`
  - `planung`: `{ punkte: {ort; zeit}[] }`

- [ ] **Step 1: Failing e2e** mit Fixture-Szenarien je `art`:
  - Jede Handeln-Variante rendert ihr Kernelement:
    - `suche`: `.treffer`
    - `api`: `.antwortkarte`
    - `code`: `.terminal` und `.testlauf`
    - `bild`: `.abtastlinie`
    - `planung`: `.routenpunkt`
  - Bei `pruefen` im ersten Durchlauf eines Szenarios mit Schleife steht `schleife.grund` im Text. Die Kugel fliegt sichtbar zurück zu `denken`, und das Ereignis `step` mit `pass: 2` folgt.
  - Bei `ergebnis` erscheint `.chatblase` an der Position des früheren Eingabefelds (Abweichung ≤ 24 px), danach folgt das Auftauchen (`field.surface`).
- [ ] **Step 2:** Läuft. Erwartet: FAIL.
- [ ] **Step 3:** Implementiere die Szenen. Das Terminal tippt zeichenweise (`steps()` in GSAP), der fehlgeschlagene Test wird rot und erst im zweiten Durchlauf grün.
- [ ] **Step 4:** Erwartet: PASS.
- [ ] **Step 5:** Commit `feat: Handeln, Prüfen mit Schleife, Ergebnis`.

### Task 9: Steuerung, Fortschrittsleiste, Detail-Ebene, Tastatur

**Files:**
- Create: `src/ui/controls.ts`, `src/ui/progress-bar.ts`, `src/ui/detail.ts`
- Test: `tests/e2e/controls.spec.ts`

**Interfaces:**
- Produces:
  ```ts
  mountControls(slot: HTMLElement, p: Player, s: Sound): () => void
  mountProgress(slot: HTMLElement, steps: Step[], p: Player): () => void
  openDetail(station: StationScript, ctx: SceneCtx): Promise<void>
  closeDetail(): Promise<void>
  ```
  Knöpfe: Pause/Weiter, Zurück, Vor, Tempo-Umschalter (0,75×/1×/1,5×), Ton, Thema, „Nochmal“ und „Nächster Ablauf“ (nur bei `done`).

- [ ] **Step 1: Failing e2e**
  - Tastatur: Leertaste pausiert und setzt fort, ← und → wechseln den Schritt, Esc schließt die Detail-Ebene. Jeder Knopf ist per Tab erreichbar und hat einen sichtbaren Fokusrahmen (Review Focus 5).
  - Die Fortschrittsleiste zeigt einen Punkt pro Schritt, kurze Schritte sind kleiner. Ein Klick auf einen Punkt ruft `goTo` auf.
  - „Tiefer graben“ öffnet die Detail-Ebene: Die Bühne skaliert auf ≤ 0.7 und bleibt sichtbar, der Player pausiert. Nach dem Schließen läuft er weiter.
  - Die Detail-Ebene darf intern scrollen, die Seite nicht.
  - Ein Klick neben die Detail-Ebene schließt sie.
- [ ] **Step 2:** Läuft. Erwartet: FAIL.
- [ ] **Step 3:** Implementiere die Steuerung. `aria-label` auf Deutsch aus `de.ts`, `aria-live="polite"` am Text-Slot.
- [ ] **Step 4:** Erwartet: PASS.
- [ ] **Step 5:** Commit `feat: Steuerung, Fortschritt, Tiefer graben, Tastatur`.

### Task 10: Rückblick-Module

**Files:**
- Create: `src/scenes/rueckblick/{kreislauf,besser}.ts`
- Test: `tests/e2e/rueckblick.spec.ts`

- [ ] **Step 1: Failing e2e.** Nach `done` folgt der Kreislauf mit 8 Stationen im Kreis. Die Kugel umrundet ihn sichtbar zweimal, beim Klick auf eine Station erscheint ihr Text. „Wird der Agent besser?“ hat drei Knöpfe (besser, gleich, schlechter). Jeder Knopf morpht die Linie weich, die Pfaddaten interpolieren. Zabihs Merksatz steht wörtlich da. Danach gibt es die Auswahl des nächsten Ablaufs, gesehene sind mit Haken markiert (`seenScenarios`).
- [ ] **Step 2:** Läuft. Erwartet: FAIL.
- [ ] **Step 3:** Implementiere die Module. Die Verlaufsdaten sind fest: 8 Runden, Werte für besser, gleich und schlechter wie in Zabihs Abschnitt 4.
- [ ] **Step 4:** Erwartet: PASS.
- [ ] **Step 5:** Commit `feat: Rückblick Kreislauf und Lernkurve`.

### Task 11: Inhalte der vier weiteren Abläufe, Textprüfung, Prüfblatt

**Files:**
- Create: `src/scenarios/{flugsuche,programm,foto,ausflug}.ts`, `public/img/pflanze.webp`, `scripts/check-copy.ts`, `scripts/copy-sheet.ts`, `CREDITS.md`
- Modify: `src/scenarios/index.ts`, `src/content/de.ts`

- [ ] **Step 1:** Schreibe die vier Abläufe nach Spec 6.4 mit den Aufgaben von dort. Schleifen haben `flugsuche` (Umstiege), `programm` (Test schlägt fehl) und `ausflug` (Budget für 25 Kinder überschritten, ein zweiter Plan folgt). `foto` läuft ohne Schleife. Das Foto ist eine CC0-Pflanze mit Herkunft in `CREDITS.md`, ≤ 120 KB WebP. Ton: Prüfstein ist, dass ein Kind mit 10 Jahren den Satz versteht.
- [ ] **Step 2:** `npx vitest run tests/unit/scenarios.test.ts`. Erwartet: PASS für alle fünf.
- [ ] **Step 3:** `scripts/check-copy.ts` (über `npm run check-copy`) läuft über alle Texte. Es prüft:
  - Satzlänge ≤ 18 Wörter.
  - Wiederholung derselben Wortfolge (3 Wörter) innerhalb eines Ablaufs.
  - ASCII-Ersatz für Umlaute („ae“, „oe“, „ue“ in deutschen Wörtern aus einer Liste, z. B. „fuer“, „ueber“, „koennen“).
  - Verneinungskonstruktionen („nicht nur … sondern“).

  Erwartet: 0 Funde.
- [ ] **Step 4:** Ein Haiku-Subagent liest alle Texte mit `laura_rules.md` gegen. Bessere die Funde ein und lass `check-copy` erneut laufen.
- [ ] **Step 5:** `npm run copy-sheet` erzeugt `test-out/texte.html` mit allen Texten je Ablauf und Station, zum Lesen für Zabih. Öffne es per `xdg-open`.
- [ ] **Step 6:** Commit `content: fünf Abläufe, Textprüfung`.

### Task 12: Ton

**Files:**
- Create: `public/sfx/{klick,wisch,eintauchen,auftauchen,richtig,hinweis}.ogg`
- Modify: `src/engine/sound.ts`, Aufrufe in den Szenen, `CREDITS.md`

- [ ] **Step 1: Failing e2e.**
  - Ohne Klick auf den Ton-Schalter entsteht kein `Audio`-Objekt (Spion im Testmodus).
  - Nach dem Einschalten spielt beim Eintauchen `eintauchen`.
  - Der Zustand überlebt ein Neuladen.
- [ ] **Step 2:** Läuft. Erwartet: FAIL.
- [ ] **Step 3:** Nimm leise, echte Foley-Effekte aus unserer lizenzfreien Bibliothek (siehe Skill promo-video, Musik- und SFX-Ordner), normalisiert auf −24 LUFS, jeweils ≤ 30 KB Ogg. Die Lizenzen kommen in `CREDITS.md`.
- [ ] **Step 4:** Erwartet: PASS.
- [ ] **Step 5:** Commit `feat: leise Effekte, standardmäßig aus`.

### Task 13: PWA, offline, Icons

**Files:**
- Modify: `vite.config.ts`, `index.html`
- Create: `public/icons/{192,512,maskable-512}.png`, `public/icons/apple-touch-icon.png`
- Test: `tests/e2e/pwa.spec.ts`

- [ ] **Step 1: Failing e2e.**
  - Nach dem ersten Laden ist der Service Worker aktiv.
  - Mit `context.setOffline(true)` und Neuladen startet die App, alle fünf Abläufe sind wählbar und `wetter` läuft durch.
  - `manifest.webmanifest` hat `display: standalone`, `lang: de` und Icons 192/512/maskable.
  - Im Netzwerk-Log gibt es keine Anfrage an einen fremden Host.
- [ ] **Step 2:** Läuft. Erwartet: FAIL.
- [ ] **Step 3:** `VitePWA({ registerType: 'autoUpdate', workbox: { globPatterns: ['**/*.{js,css,html,svg,webp,png,ogg}'] } })`. Das Icon ist die orange Daten-Kugel im Glasbox-Stil.
- [ ] **Step 4:** Erwartet: PASS.
- [ ] **Step 5:** Commit `feat: PWA offline`.

### Task 14: Gesamtdurchlauf, Kontaktblatt, Deploy

**Files:**
- Create: `tests/e2e/full-run.spec.ts`, `scripts/contact-sheet.ts`, `.github/workflows/pages.yml`, `public/CNAME` (Inhalt: `agents.rfi-irfos.com`)

- [ ] **Step 1: E2E-Gesamtlauf.** Jeder der fünf Abläufe läuft in den sechs Viewports aus Task 5 und in beiden Themen durch. Bei jedem Schritt gilt:
  - Kein Scroll.
  - Kein Slot-Überlauf.
  - Keine Konsolenfehler.
  
  Erwartet: PASS.
- [ ] **Step 2:** `npm run contact-sheet` erstellt je Ablauf, Format und Station ein Bild sowie `test-out/contact/index.html`. Öffne die Seite per `xdg-open` und prüfe sie selbst, bevor Simeon sie sieht.
- [ ] **Step 3:** Lighthouse (mobil) per `colony-run`. Erwartet: Leistung ≥ 90, Barrierefreiheit ≥ 95, PWA installierbar.
- [ ] **Step 4:** Workflow `pages.yml`:
  1. Bei einem Push auf `main` laufen `npm ci`, `npm run check-copy`, `npx vitest run` und `npm run build`.
  2. Danach folgen `actions/upload-pages-artifact` und `actions/deploy-pages`.
- [ ] **Step 5:** Commit `ci: GitHub Pages`.
- [ ] **Step 6: Freigaben (blockierend).** Simeon klickt die App lokal (`npm run preview`, `xdg-open`) durch. Zabih nimmt `test-out/texte.html` fachlich ab, der Weg zu ihm geht über das Warenlager, aber erst nach Simeons OK. Seine Korrekturen kommen in die Szenario-Dateien, danach laufen Step 1 und Task 11 Step 3 erneut.
- [ ] **Step 7: Live (erst nach beiden Freigaben).**
  1. Lege das Repo `rfi-irfos/agents-lernseite` an, öffentlich, weil die Seite selbst öffentlich ist. Push.
  2. Stelle Pages auf „GitHub Actions“.
  3. Lege in Cloudflare den CNAME `agents` → `rfi-irfos.github.io` an, nur DNS (graue Wolke, damit GitHub das Zertifikat ausstellt).
  4. Schalte „Enforce HTTPS“ ein, sobald das Zertifikat da ist.
  5. Prüfe `curl -sI https://agents.rfi-irfos.com`: Erwartet `200`, dann öffne die Seite im Browser.
