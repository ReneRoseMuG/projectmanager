# Log: Attachment-Trennungs-Preflight

**Datum:** 27.08.26  
**Uhrzeit:** 10:20:35  
**Schritt:** 1 — Bestandsdaten- und Working-Tree-Preflight  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Für die geplante Trennung von DMS-Dokumenten und Parent-Anhängen wurde ein ausschließlich lesender Preflight ergänzt und gegen die konfigurierte Datenbank ausgeführt. Der Bestand enthält 1.609 globale Dokumente, 57 nicht globale Anhänge mit jeweils genau einem Parent sowie 133 bestehende Dokument-zu-Parent-Beziehungen. Es gibt keine ownerlosen oder mehrfach zugeordneten nicht globalen Anhänge und keine nicht globalen Anhänge in DMS-Sammlungen. Die 18 globalen Sammlungen und 1.602 Sammlungszuordnungen können deshalb unverändert erhalten bleiben. Der vorhandene Dirty Worktree wurde geprüft; die bestehenden Attachment-, Thumbnail-, Design- und Teständerungen werden bei der weiteren Umsetzung bewahrt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `scripts/audit-attachment-separation.mjs` | neu | Read-only Bestandsprüfung für die Attachment-/DMS-Trennung |
| `logs/2026-08-27-10-20-35-schritt-01-attachment-trennungs-preflight.md` | neu | Ergebnis des Preflight-Schritts |
| `logs/README.md` | geändert | Neuer chronologischer Log-Eintrag |

## Probleme und Abweichungen

Keine. Der Bestand enthält keine mehrdeutigen Parent-Anhänge, sodass das geplante Migrations-Gate passiert ist.

## Offene Punkte / Folgeaufgaben

Schema, Migration, Services, API, Web-Oberfläche und die geplanten Tests sind in den folgenden Schritten umzusetzen.
