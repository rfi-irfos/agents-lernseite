# Quellen und Lizenzen

Die App lädt zur Laufzeit nichts von fremden Servern. Alles liegt im Build.

## Schriften

Systemschriften (`"Inter", "Segoe UI", system-ui, …`), keine Schriftdateien im Build.

## Bibliotheken

- GSAP (gsap) von GreenSock, Standardlizenz für kostenlose Nutzung, https://gsap.com/standard-license
- Vite, Vitest, TypeScript, vite-plugin-pwa und Playwright (nur Entwicklung und Tests), jeweils MIT beziehungsweise Apache-2.0

## Zeichnungen

Alle Figuren, Werkzeuge und die Pflanze der Foto-Frage (`src/svg/*.svg`) sind selbst gezeichnet, im zweifarbigen Glasbox-Stil. Es gibt kein heruntergeladenes Foto.

## Klänge

Sechs leise Effekte in `public/sfx/`, standardmäßig aus. Alle Quellen stehen unter CC0 1.0 (Public Domain Dedication, https://creativecommons.org/publicdomain/zero/1.0/), Namensnennung ist nicht nötig. Die Dateien sind zugeschnitten, mono, mit kurzem Ausblenden auf −24 LUFS gebracht und als Ogg Vorbis gespeichert (`scripts/make-sfx.sh`). Quellen: interne Sound-Bibliothek, nur CC0-Einträge.

| Datei | Quelle | Originaldatei | Urheber | Lizenz | Quell-URL |
|---|---|---|---|---|---|
| `klick.ogg` | Freesound „Soft UI Button Click“ (Aufnahme, als hq-Vorschau-MP3 geladen) | `528561_Jummit.mp3` | Jummit | CC0 1.0 | https://freesound.org/people/Jummit/sounds/528561/ |
| `wisch.ogg` | DAEDAL UI Sounds (synthetisch) | `DAEDAL_UI_017_Swipe_Up.wav` | DAEDAL (daedal.art) | CC0 1.0 | https://daedal.art/resources/ui-sounds/ |
| `eintauchen.ogg` | DAEDAL Whoosh Library (synthetisch) | `DAEDAL_Whoosh_036_Soft_1.3s_Center.wav` | DAEDAL (daedal.art) | CC0 1.0 | https://daedal.art/resources/whoosh-library/ |
| `auftauchen.ogg` | DAEDAL Whoosh Library (synthetisch) | `DAEDAL_Whoosh_087_Soft_1.3s_Center.wav` | DAEDAL (daedal.art) | CC0 1.0 | https://daedal.art/resources/whoosh-library/ |
| `richtig.ogg` | DAEDAL UI Sounds (synthetisch) | `DAEDAL_UI_023_Notification.wav` | DAEDAL (daedal.art) | CC0 1.0 | https://daedal.art/resources/ui-sounds/ |
| `hinweis.ogg` | DAEDAL Transition SFX Pack (synthetisch) | `DAEDAL_Pop_02_Low.wav` | DAEDAL (daedal.art) | CC0 1.0 | https://daedal.art/resources/transition-sfx-pack/ |
