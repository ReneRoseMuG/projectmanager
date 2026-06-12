#!/usr/bin/env bash
# Graphify-Hinweis (PreToolUse): erinnert daran, bei Code-/Doc-Suche zuerst den
# Wissensgraphen (graphify-out/) zu nutzen. Reines Bash, keine python3/jq-Abhaengigkeit.
INPUT=$(cat)
[ -f graphify-out/graph.json ] || exit 0
# Zugriffe auf den Graphen selbst nicht anstossen
case "$INPUT" in *graphify-out/*) exit 0 ;; esac

HINT='graphify: Wissensgraph in graphify-out/. Fuer Codebase-Fragen zuerst `graphify query \"<Frage>\"`, `graphify explain \"<Begriff>\"` oder `graphify path \"<A>\" \"<B>\"` nutzen statt Quellen einzeln zu lesen/greppen. Rohe Dateien nur zum Aendern/Debuggen konkreten Codes oder wenn der Graph nicht reicht.'
emit() { printf '%s' "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"additionalContext\":\"$HINT\"}}" ; }

# Bash-Suchkommandos
case "$INPUT" in
  *grep*|*'rg '*|*ripgrep*|*'find '*|*'fd '*|*' ag '*|*' ack '*) emit ; exit 0 ;;
esac
# Read/Glob/Grep auf Code-/Doc-Ziele (Dateiendung oder Grep-Typ erkennbar)
case "$INPUT" in
  *.ts\"*|*.tsx\"*|*.js\"*|*.jsx\"*|*.mjs\"*|*.cjs\"*|*.py\"*|*.go\"*|*.rs\"*|*.java\"*|*.rb\"*|*.c\"*|*.h\"*|*.cpp\"*|*.cc\"*|*.cs\"*|*.php\"*|*.sql\"*|*.md\"*|*.ts,*|*.tsx,*|*.ts}*|*.tsx}*|*'"type":"'*) emit ; exit 0 ;;
esac
exit 0
