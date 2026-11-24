#!/usr/bin/env bash
# Baut public/sfx/*.ogg aus der CC0-Auswahl der Sound-Bibliothek (auf der Kolonie: ffmpeg).
# Aufruf auf der Kolonie:  bash make-sfx.sh <Zielordner>
# Jeder Effekt: Ausschnitt, kurzes Ausblenden, mono, 44,1 kHz, auf -24 LUFS (integriert) gebracht,
# Ogg Vorbis. Kurze Dateien (< 1 s) werden für die Messung mit Stille auf 1 s aufgefüllt (ebur128
# braucht 400 ms Fenster); der Gain wird aus dieser Messung berechnet und auf die ungepolsterte Datei angewandt.
set -euo pipefail
LIB=/srv/data/files/sfx/quellen
OUT=${1:?Zielordner}
mkdir -p "$OUT"
U="$LIB/daedal-ui-sounds/DAEDAL UI Sounds"
W="$LIB/daedal-whoosh/DAEDAL Whoosh Library"
D="$LIB/daedal-transition-sfx/DAEDAL Transition SFX Pack/UI_Clicks_Pops"

# name | quelle | start | länge | ausblenden
make() {
  local name=$1 src=$2 ss=$3 t=$4 fo=$5
  local pre="atrim=start=$ss:duration=$t,asetpts=PTS-STARTPTS,aformat=channel_layouts=mono,aresample=44100,afade=t=out:st=$(python3 -c "print(max(0,$t-$fo))"):d=$fo"
  local meas
  meas=$(ffmpeg -nostdin -hide_banner -i "$src" -af "$pre,apad=whole_dur=1,ebur128" -f null - 2>&1 | awk '/I:/ {v=$2} END {print v}')
  local gain
  gain=$(python3 -c "print(round(-24-($meas),2))")
  # Spitze bei -3 dBFS begrenzen
  ffmpeg -nostdin -hide_banner -loglevel error -y -i "$src" -af "$pre,volume=${gain}dB,alimiter=limit=0.7:level=disabled" -c:a libvorbis -q:a 2 "$OUT/$name.ogg"
  echo "$name  gemessen ${meas} LUFS, Gain ${gain} dB, $(stat -c%s "$OUT/$name.ogg") Byte"
}

make klick       "$LIB/freesound-cc0/528561_Jummit.mp3"             0 0.30 0.08
make wisch       "$U/DAEDAL_UI_017_Swipe_Up.wav"                    0 0.62 0.20
make eintauchen  "$W/DAEDAL_Whoosh_036_Soft_1.3s_Center.wav"        0 1.30 0.50
make auftauchen  "$W/DAEDAL_Whoosh_087_Soft_1.3s_Center.wav"        0 1.20 0.50
make richtig     "$U/DAEDAL_UI_023_Notification.wav"                0 0.78 0.25
make hinweis     "$D/DAEDAL_Pop_02_Low.wav"                         0 0.38 0.12
