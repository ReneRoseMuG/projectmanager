#!/usr/bin/env bash
# SessionStart-Hook-Vorlage: stellt sicher, dass die Plugins aus der Skill Library
# installiert sind, bevor die Sitzung beginnt. Idempotent — mehrfacher Aufruf ist
# unschaedlich. In jedem Repo unter .claude/hooks/ensure-plugins.sh ablegen und in
# .claude/settings.json als SessionStart-Hook eintragen (siehe settings-snippet.md).
set -e
claude plugin marketplace add ReneRoseMuG/Skill-Library >/dev/null 2>&1 || true
claude plugin install pm-workflow-skills@skill-library >/dev/null 2>&1 || true
claude plugin install dev-testing-skills@skill-library >/dev/null 2>&1 || true
exit 0
