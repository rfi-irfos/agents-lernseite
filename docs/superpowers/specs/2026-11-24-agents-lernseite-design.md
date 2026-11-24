# agents.rfi-irfos.com: So arbeitet ein KI-Agent (Design)

Stand: 2026-11-24. Grundlage: Zabihs Seite „So arbeitet ein KI-Agent“ (`colony:/srv/warenlager/Warenlager/ki_agent_lernseite (1).html`, Kopie in `~/Downloads/zabih_H9nw/`) und sein zweiter Entwurf `ki_agent_aufbau_datenfluss.html`.

## 1. Absicht

Simeon will aus Zabihs Lernseite eine Web-App machen, die erklärt, wie ein KI-Agent arbeitet. Sie soll sich anfühlen wie ein animiertes Erklärvideo, das man anklicken kann. Die Zielgruppe ist breit: Schulklassen, Kinder, der Mann am Kiosk, der nie ChatGPT benutzt hat, und alle, die fragen: „Wie funktioniert so ein Agent eigentlich?“ Wer die App einmal durchgespielt hat, kann es jemand anderem erklären.

Zabihs Seite hat die richtigen Inhalte: Aufgabe, Weg der Daten, Kreislauf, „Wird der Agent besser?“. Sie ist aber eine lange Scroll-Seite mit vier Abschnitten untereinander. Die App macht daraus eine geführte Vorstellung auf genau einem Bildschirm.

## 2. Ziele

- **Ein Bildschirm, kein Scrollen.** Die App füllt immer 100 % der Höhe und Breite (`100dvh`). Inhalte ordnen sich je nach Format an: Hochformat (Handy), Querformat (Laptop, Beamer im Klassenzimmer), quadratnah (Tablet).
- **Start ganz leer.** Zu sehen ist nur „Deine Aufgabe“: unten ein Eingabefeld wie bei einem Chat, darüber drei bis vier Beispiel-Aufgaben als Karten und der Knopf „Ablauf starten“.
- **Eintauchen.** Nach dem Klick auf „Ablauf starten“ fliegt die Kamera in die Aufgabe hinein: Das Eingabefeld wird zum Tor, und dahinter liegt das Innere des Agenten.
- **Geführte Tour.** Danach läuft ein Ablauf Station für Station ab, wie in einem Erklärvideo. Jede Station hat ein eigenes Stilmittel (siehe 6.3). Man kann pausieren, zurückspulen und jede Station antippen, um tiefer zu graben.
- **Verschiedene Arten von Agenten.** Mehrere geskriptete Abläufe zeigen verschiedene Arbeitsweisen: suchen, programmieren, eine Reise planen, ein Foto verstehen. Gleiche Eingabe ergibt jedes Mal die gleiche Vorstellung.
- **Spielerisch.** Kleine Aufgaben zum Mitmachen, z. B. „Welches Werkzeug braucht der Agent jetzt?“, mit drei Karten zur Wahl. Fortschritt wird sichtbar (gesammelte Stationen). Punkte oder Ranglisten gibt es nicht.
- **Web und PWA.** Gehostet auf GitHub Pages unter `agents.rfi-irfos.com`. Installierbar als PWA und nach dem ersten Besuch auch ohne Netz nutzbar (wichtig für Schulen mit schlechtem WLAN).

## 3. Nicht-Ziele

- Ein echtes KI-Modell. Es gibt nichts Echtes im Hintergrund, keine API und keine Schlüssel. Alles ist geskriptet und deterministisch.
- Konten, Anmeldung, Tracking, Cookies, Analytics.
- Ein Werkzeug, mit dem Lehrer eigene Abläufe in einer Oberfläche bauen. Neue Abläufe sind Datendateien im Repo. Ein Editor kann später kommen.

## 4. Anti-Ziele (was es zum Misserfolg macht, auch wenn es technisch läuft)

- Fachchinesisch. Jedes Fachwort (LLM, API, Token) wird beim ersten Auftreten in Alltagssprache erklärt oder weggelassen. Prüfstein: Ein Kind mit zehn Jahren versteht den Satz.
- Etwas springt. Jeder Wechsel ist weich animiert, nichts poppt auf (BINDING, Hausregel vom 22.11.).
- Ein Panel spricht mit mehreren Stimmen. Pro Szene gibt es eine Aussage und einen Text, keine Kachel-Wüste (EIL-Design-Ethos, 21.11.).
- Der Bildschirm ist voll. Zuschauer sollen nie lesen und gleichzeitig eine Animation verfolgen müssen. Erst kommt der Text, dann die Handlung (Film-Regel vom 16.11.).
- Die App funktioniert nur mit Ton. Ton ist optional, alles muss stumm verständlich sein.
- Scrollen innerhalb der App, außer in einer bewusst aufgeklappten Detail-Ebene.

## 5. Rahmen

- **Hosting:** statische Dateien auf GitHub Pages, eigenes Repo unter der Organisation `rfi-irfos`, Domain `agents.rfi-irfos.com` per CNAME in Cloudflare (DNS liegt dort).
- **Keine Fremdquellen zur Laufzeit.** Schriften und Bibliotheken liegen im Build (Zabihs zweiter Entwurf lud Tailwind, Lucide und Google Fonts von CDNs, das entfällt). Gründe: DSGVO in Schulen und Offline-Betrieb.
- **Geräte:** Ein Schul-Chromebook und ein fünf Jahre altes Android-Handy müssen flüssig laufen (Ziel 60 fps, Untergrenze 30 fps). `prefers-reduced-motion` schaltet auf ruhige Überblendungen um.
- **Sprache:** Deutsch zuerst, alle Texte in einer Sprachdatei, damit Englisch später nur eine Übersetzung ist.
- **Barrierefreiheit:** Alle Texte als echter Text (vorlesbar, zoombar), Bedienung per Tastatur, Kontrast nach WCAG AA, kein graues Fließtext-Grau für wichtige Aussagen.

## 6. Ansatz

### 6.1 Abgewogene Wege

| Weg | Was es ist | Vorteil | Nachteil |
|---|---|---|---|
| **A. Eigene Szenen-Engine (gewählt)** | Vite + TypeScript, Zeitleisten mit GSAP. Text und Knöpfe als HTML/SVG, darunter eine Canvas-Ebene für Effekte. Abläufe sind Datendateien. | Gefühl eines Erklärvideos plus echte App. Scharfer, vorlesbarer Text. Neuer Ablauf = neue Datei. | Animationen werden von Hand getimt, das braucht Feinarbeit. |
| B. Vorgerenderte Filmstücke | Videos (z. B. Blender auf der Kolonie) mit Klickflächen darüber. | Am edelsten im Look. | Jede Bildschirmform braucht eigene Videos, jede Textänderung ein neues Rendering, großer Download, Tiefgraben nur über Kästen. |
| C. Reine Canvas-Spiele-Engine | PixiJS oder Phaser, alles im Canvas. | Die meisten Effekte. | Text wird Grafik: unscharf, nicht vorlesbar, schwer übersetzbar. |

Simeon hat A gewählt (24.11.).

### 6.2 Aufbau

```
Ebenen (von hinten nach vorne)
  1. FX-Canvas     Partikel, Datenströme, Tiefe beim Eintauchen (WebGL2, Rückfall Canvas 2D)
  2. Bühne (SVG)   Stationen, Verbindungen, Figuren, Werkzeug-Symbole
  3. Text (HTML)   Erzähltext, Beschriftungen, Knöpfe, Detail-Ebene
  4. Steuerung     Pause/Weiter, Zurück, Fortschrittsleiste, Ton an/aus
```

- **Engine:** spielt eine Szene ab. Eine Szene ist eine GSAP-Zeitleiste, die aus Daten gebaut wird. Die Engine kennt Pause, Weiter, Springen zu einer Station und Tempo. Sie hält an jedem „Haltepunkt“ an, bis man weitertippt oder (im Auto-Modus) die Lesezeit abgelaufen ist.
- **Lesezeit:** höchstens drei Wörter pro Sekunde, berechnet aus dem Text (Hausregel vom 13.11.). So passt sich der Auto-Modus jeder Textlänge an.
- **Layout:** Jede Szene beschreibt ihre Anordnung für die drei Formate (Hochformat, Querformat, quadratnah) über benannte Slots. Die Engine wechselt weich zwischen ihnen, wenn das Gerät gedreht wird.
- **Abstände:** Es gelten die gleichen Grundsätze wie in FluxPost (`~/projects/fluxpost/fluxpost/static/app.css`): ein festes Abstandsraster, großzügige Ränder und Glasflächen mit `--radius` 14 px. Alle Größen skalieren mit `clamp()` an der kürzeren Bildschirmseite, damit nichts überläuft und nichts verloren wirkt.
- **Look:** hell als Standard (Papier-Grund wie bei Zabih, gut lesbar am Beamer), dunkel nach FluxPost-Farben per Geräteeinstellung (`prefers-color-scheme`) oder Schalter. Beide Themen über dieselben CSS-Variablen, jede Szene wird in beiden geprüft. Jede Station behält ihre Farbe (wie bei Zabih), der Ablauf setzt den Akzent für Knöpfe und Fortschritt. Knöpfe aus Glas mit dem Highlight rechts, nie vollflächig gefüllt (BINDING, 22.11.). Der orangene Punkt aus dem Hausmotiv ist die „Daten-Kugel“, die durch den Agenten wandert (BINDING für Filme, 21.11., passt hier inhaltlich genau).

### 6.3 Ablauf einer Vorstellung

```
[Start]  Deine Aufgabe ─ Eingabefeld unten, Beispielkarten darüber
   │  „Ablauf starten“
   ▼
[Eintauchen]  Kamera fliegt durchs Eingabefeld ins Innere (Tiefenflug, Partikel)
   ▼
[Stationen]  Eingabe → Wahrnehmung → Denken (+ Gedächtnis) → Planung → Werkzeug → Handeln → Ergebnis
   │  jede Station: 1 Satz Erzähltext, 1 Animation, optional „Tiefer graben“
   │  Schleife: bei Bedarf zurück zu Denken (Kreislauf sichtbar)
   ▼
[Ergebnis]  Antwort erscheint unten wie im Chat, Kamera fliegt wieder heraus
   ▼
[Rückblick]  Kreislauf als Ganzes, „Wird der Agent besser?“, Wahl des nächsten Ablaufs
```

**Stilmittel je Station** (jede Station sieht anders aus, der Hausstil bleibt gleich):

| Station | Stilmittel | Was man sieht |
|---|---|---|
| Wahrnehmung | Zerlegen | Der Satz der Aufgabe fällt in Wortkarten auseinander, wichtige Wörter leuchten. |
| Denken | Gedankenwolke | Mögliche Wege tauchen als Linien auf, einer wird gewählt. |
| Gedächtnis | Schublade | Eine Schublade geht auf, eine alte Notiz fliegt heraus. |
| Planung | Karten legen | Schritte legen sich als Karten nebeneinander und werden nummeriert. |
| Werkzeug | Werkzeugkasten | Drei Werkzeuge stehen zur Wahl, der Agent greift eines. Mitmach-Moment: „Was würdest du nehmen?“ |
| Handeln | Je nach Ablauf | Suche: Ergebnisse fliegen herein. Code: Terminal tippt, Test wird grün. Reise: Karte mit Route. Foto: Bild wird abgetastet. |
| Prüfen | Haken | Das Ergebnis wird mit der Aufgabe verglichen. Fehlt etwas, geht es sichtbar zurück zu Denken. |
| Ergebnis | Chat-Blase | Die Antwort erscheint dort, wo die Frage stand. |

**Tiefer graben:** Ein Tipp auf eine Station öffnet eine Detail-Ebene, die die Bühne weich verkleinert, nicht verdeckt. Darin stehen zwei bis vier kurze Sätze und eine kleine eigene Animation, z. B. bei Denken: „Ein Sprachmodell rät das nächste Wort, sehr, sehr gut.“ Die Ebene schließt mit einem Tipp daneben oder mit Esc.

### 6.4 Abläufe (Szenarien) als Daten

Jeder Ablauf ist eine Datei, z. B. `scenarios/flugsuche.ts`, mit:

- `id`, `titel`, `aufgabe` (Text, der ins Eingabefeld getippt wird), `art` (suche | code | planung | bild)
- `stationen[]`: je Station `text`, optional `tiefer` (Detailtext), `werkzeug`, `gedaechtnis`, `daten` für die Handeln-Animation
- `schleifen`: an welcher Stelle der Agent zurück zu Denken geht und warum („Der billigste Flug hat zwei Umstiege, ich suche nochmal direkt.“)
- `ergebnis`: Antworttext

**Erste Abläufe (Vorschlag):**

1. **Flugsuche** (Suche): „Finde mir den günstigsten Flug von Graz nach Berlin am Freitag.“ Mit einer Schleife: erster Treffer hat Umstiege, Agent sucht nochmal.
2. **Wetter** (Werkzeug/API): „Brauche ich morgen in Graz einen Schirm?“ Kurzer Ablauf zum Einsteigen, ohne Schleife.
3. **Kleines Programm** (Code): „Schreib mir ein Programm, das meine Einkaufsliste sortiert.“ Mit einer Schleife: Test schlägt fehl, Agent bessert nach.
4. **Foto-Frage** (Bild): „Was für eine Pflanze ist das?“ mit einem Beispielbild.
5. **Ausflug planen** (Planung, mehrere Werkzeuge): „Plan einen Schulausflug nach Wien für 25 Kinder.“ Der längste Ablauf, zeigt Planung und Gedächtnis.

**Freie Eingabe:** Tippt jemand eine eigene Frage ein, ordnet ein einfacher Wort-Abgleich sie dem passendsten Ablauf zu. Der Erzähltext sagt ehrlich: „Das ist ein Beispiel. So ähnlich würde ein Agent deine Frage bearbeiten.“ Der Hinweis aus Zabihs Seite, dass kein echtes Modell läuft, bleibt sichtbar.

### 6.5 Rückblick-Module

- **Kreislauf:** die Stationen als Kreis, eine Schleife läuft sichtbar mehrmals durch (aus Zabihs Abschnitt 3).
- **Wird der Agent besser?** Drei Verläufe (besser, gleich, schlechter) als animierte Linie, mit Zabihs Merksatz: Ein Agent wird nur besser, wenn er Rückmeldung bekommt, sie speichert und beim nächsten Mal nutzt.

## 7. Was dem Bauer überlassen bleibt

- Wahl zwischen WebGL2 direkt und einer kleinen Hilfsbibliothek für die FX-Ebene, solange die Leistungsziele (5.) halten.
- Genaue Werte des Abstandsrasters, abgeleitet aus FluxPost.
- Format der Szenendateien (TypeScript mit Typen empfohlen, damit falsche Abläufe beim Bauen auffallen).
- Service-Worker-Strategie für die PWA (Vorab-Cache aller Dateien ist bei dieser Größe vernünftig).
- Tests: Engine-Logik (Zeitleiste, Haltepunkte, Layout-Wahl) mit Vitest. Für jedes Format und jeden Ablauf ein Satz Bildschirmfotos per Playwright als Abnahme-Kontaktblatt.

## 7a. Entscheidungen nach der Bauer-Prüfung (meine Festlegungen, von Simeon zu prüfen)

- **Stationen:** feste Reihenfolge Eingabe → Wahrnehmung → Denken → Planung → Werkzeug → Handeln → Prüfen → Ergebnis. Gedächtnis ist ein Seitenarm von Denken (Schublade neben der Station), keine eigene Station. Im Schema kann ein Ablauf Stationen als `kurz` markieren (nur ein Satz, keine eigene Animation). Wetter nutzt das für Planung und Prüfen. Die Fortschrittsleiste zeigt alle Stationen, kurze Stationen als kleinen Punkt.
- **Mitmach-Momente:** Pro Ablauf gibt es genau einen, an der Station Werkzeug, mit drei Karten und einer richtigen Antwort. Bei einer falschen Wahl erklärt ein Satz weich, warum das andere Werkzeug passt, dann geht es weiter. Es gibt keinen zweiten Versuch und keine Strafe. Im Auto-Modus wartet die App dort auf einen Tipp, nach 8 s wählt der Agent selbst.
- **Fortschritt:** Gesehene Abläufe werden nur in `localStorage` auf dem Gerät gespeichert. Es gibt keinen Server, keine Kennung und keinen Cookie-Banner, weil nichts übertragen wird.
- **Freie Eingabe:** Die eingetippten Wörter werden an der Station Wahrnehmung als Wortkarten gezeigt, ab Denken läuft der zugeordnete Ablauf. Passt nichts, läuft Wetter als Standard, mit dem Hinweis „Das ist ein Beispiel …“.
- **Grafiken:** Die Figuren, Werkzeug-Symbole, die Schublade und das Terminal zeichnet der Bauer als SVG im Hausstil (Glasbox, zweifarbig: Grundform hell, Akzente farbig). Das Pflanzenfoto kommt aus einer CC0-Quelle (mit Herkunft in `CREDITS.md`) oder ist ein eigenes Foto.
- **Formate:** Seitenverhältnis Breite/Höhe < 0,8 ergibt Hochformat, > 1,25 Querformat, dazwischen quadratnah. Ultrawide-Bildschirme bekommen das Querformat mit einer begrenzten Bühnenbreite.
- **Tempo:** Standard ist der Auto-Modus mit Lesezeit, dazu Pause, Zurück, Weiter und Tempo (0,75× / 1× / 1,5×). Am Ende stehen „Nochmal“ und „Nächster Ablauf“.
- **Repo und Deploy:** Das Repo heißt `rfi-irfos/agents-lernseite`. Gebaut wird per GitHub Actions auf Pages, mit der Datei `CNAME` im Build. Der CNAME-Eintrag in Cloudflare kommt zum Schluss.

## 7b. Entscheidungen von Simeon (24.11.)

- **Texte:** Claude schreibt alle Texte (Erzählsätze, Tiefer-graben-Texte, die fünf Abläufe, Mitmach-Fragen) im Ton für Zehnjährige. Ein Haiku-Subagent liest gegen, danach nimmt Zabih die Texte fachlich ab. Diese Abnahme ist eine eigene Stufe vor dem Livegang.
- **Look:** hell und dunkel umschaltbar, hell als Standard (siehe 6.2).
- **Ton:** leise, echte Effekte (Klick, Wischen, Eintauchen) aus der lizenzfreien Bibliothek, standardmäßig aus, keine Musik. Lizenzen in `CREDITS.md`.

## 8. Abnahme

- Alle fünf Abläufe laufen in allen drei Formaten durch, ohne Scrollen und ohne Überlauf, gemessen am gerenderten DOM.
- Weiche Übergänge überall, kein Springen, auch beim Drehen des Geräts.
- Lighthouse: PWA installierbar, offline lauffähig, Leistung ≥ 90 auf Mobil.
- Ein Testlauf mit jemandem ohne KI-Vorwissen: Die Person kann danach in eigenen Worten sagen, was ein Agent macht.
- HTML wird nach dem Bauen im Browser geöffnet und von Simeon durchgeklickt, bevor es live geht.
