#!/usr/bin/env bash
# Leitfaden-Aktualitaet (Stop-Hook): prueft am Ende einer Antwort, ob geaenderte
# Dateien Bereiche beruehren, die in den Leitfaeden beschrieben sind, und erinnert
# daran, eine Aktualisierung zu PRUEFEN — nicht den Leitfaden still umzuschreiben.
#
# Reines Bash, keine jq/python-Abhaengigkeit (gleiche Linie wie graphify-hint.sh).
# Die Pfad-Trigger unten spiegeln docs/leitfaden-scope.json. Bei Aenderung dort
# hier nachziehen. In case-Pattern matcht "*" auch "/", deckt also jede Tiefe ab.

INPUT=$(cat)

# 1) Endlosschleife vermeiden: wenn wir bereits aus einem Stop-Hook fortsetzen, nichts tun.
case "$INPUT" in *'"stop_hook_active":true'*) exit 0 ;; esac

# 2) Ohne Git keine Aenderungserkennung moeglich.
command -v git >/dev/null 2>&1 || exit 0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

# 3) Geaenderte Dateien seit letztem Commit (tracked + untracked), Status-Praefix + Rename entfernen.
CHANGED=$(git status --porcelain 2>/dev/null | sed 's/^...//' | sed 's/^.* -> //')
[ -z "$CHANGED" ] && exit 0

design_hit=0; arch_hit=0
design_changed=0; arch_changed=0

while IFS= read -r f; do
  [ -z "$f" ] && continue
  case "$f" in
    docs/design-leitfaden.md)      design_changed=1 ;;
    docs/architektur-leitfaden.md) arch_changed=1 ;;
  esac
  # Design-Leitfaden: Frontend-Quellen (case-"*" matcht auch "/", also jede Tiefe)
  case "$f" in
    apps/web/src/*.tsx|apps/web/src/*.css|apps/web/src/*.scss) design_hit=1 ;;
  esac
  # Architektur-Leitfaden: Datenmodell & Schichten
  case "$f" in
    packages/shared-types/src/*|apps/api/src/*) arch_hit=1 ;;
  esac
done <<INNER_EOF
$CHANGED
INNER_EOF

# 4) Nur erinnern, wenn betroffen UND der jeweilige Leitfaden nicht ohnehin schon mit-geaendert wurde.
[ "$design_changed" = "1" ] && design_hit=0
[ "$arch_changed" = "1" ] && arch_hit=0
[ "$design_hit" = "0" ] && [ "$arch_hit" = "0" ] && exit 0

# 5) Once-Guard pro Session und Leitfaden: nicht in jedem Turn erneut erinnern.
SID=$(printf '%s' "$INPUT" | sed -n 's/.*"session_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
[ -z "$SID" ] && SID="nosession"
MARK_DIR=".git/leitfaden-hook"
mkdir -p "$MARK_DIR" 2>/dev/null

flagged=""
if [ "$design_hit" = "1" ] && [ ! -f "$MARK_DIR/$SID-design" ]; then
  : > "$MARK_DIR/$SID-design"
  flagged="$flagged\n- docs/design-leitfaden.md (Frontend apps/web geaendert)"
fi
if [ "$arch_hit" = "1" ] && [ ! -f "$MARK_DIR/$SID-arch" ]; then
  : > "$MARK_DIR/$SID-arch"
  flagged="$flagged\n- docs/architektur-leitfaden.md (Datenmodell/Schichten geaendert)"
fi

# Beide Leitfaeden in dieser Session schon gemeldet -> still bleiben.
[ -z "$flagged" ] && exit 0

# 6) Hinweis an das Modell. exit 2 -> stderr wird Claude gezeigt, der Turn setzt fort.
{
  printf 'Leitfaden-Check: Geaenderte Dateien beruehren Bereiche, die in folgenden Leitfaeden beschrieben sind:'
  printf '%b' "$flagged"
  printf '\n\nPruefe, ob eine Ergaenzung noetig ist (Skill: leitfaden-pflege; Zuordnung: docs/leitfaden-scope.json).'
  printf '\nNur HINWEISEN und einen Formulierungsvorschlag liefern — den Leitfaden NICHT ungefragt aendern.'
  printf '\nWenn keine Aktualisierung noetig ist, kurz begruenden und abschliessen.\n'
} 1>&2
exit 2
