# Log: Backup Varianten Container

**Datum:** 27.05.26  
**Schritt:** Fix — Backup Varianten Container  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Backup-Adminseite fasst die beiden Backup-Varianten jetzt in einem gemeinsamen Aktionscontainer zusammen. Der Abschnitt `Vollsicherung` zeigt eine kompakte Zeile `Letzte Sicherung` und den Button `Sichern`. Der Abschnitt `Sync` zeigt eine kompakte Zeile `Letzte Synchronisation` sowie die Buttons `Sync` und `Sync importieren`. Die Ordnerpfad-Informationen wurden aus diesem Aktionscontainer entfernt, damit nicht mehr der Eindruck entsteht, die Vollsicherung sei nur lokal. Die Tabelle `Remote-Vollsicherungen` bleibt als Import- und Dateiliste darunter erhalten.

Für die Teständerung wurden die Testentwurfsleitplanken angewendet. Testebene: Unit/jsdom. Abgedeckt wird das beobachtbare Rendering des gemeinsamen Aktionscontainers, der Statuszeilen und der verbleibenden Aktionen; die bestehenden Hook-Doubles isolieren die Seite ohne echte API-, Datenbank- oder Dateisystemzugriffe.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/pages/SettingsBackupPage.tsx` | geändert | Vollsicherung und Sync in einem gemeinsamen Aktionscontainer zusammengeführt |
| `tests/unit/web/pages/SettingsBackupPage.test.tsx` | geändert | Container-Struktur, Statuszeilen und entfernte Ordnerzeilen abgesichert |
| `logs/2026-05-27-fix-backup-varianten-container.md` | neu | Schritt-Log für den UI-Nachschnitt |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine. `npm run typecheck -w apps/web`, der gezielte Seitentest, gezieltes ESLint für die geänderten Dateien und `npm run build -w apps/web` liefen erfolgreich. Der Build meldet weiterhin nur den bestehenden Vite-Hinweis zu großen Chunks.

## Offene Punkte / Folgeaufgaben

Keine.
