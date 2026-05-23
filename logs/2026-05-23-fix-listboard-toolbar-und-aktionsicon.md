# Log: ListBoard-Toolbar und Aktionsicon

**Datum:** 23.05.26  
**Schritt:** Fix — ListBoard-Toolbar und Aktionsicon  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Add-Button in der ListBoard-Toolbar verwendet jetzt ein großes simples `Plus` statt `CirclePlus`. Die Buttonfläche bleibt unverändert, nur das Symbol wurde auf `26` Pixel mit stärkerem Strich gesetzt. Das Karten-Aktionsmenü verwendet nicht mehr das Drei-Punkt-Icon, sondern `Settings2` als klareres Optionen-/Aktionssymbol. Die vorhandene Menüfunktionalität, Position und Klickfläche bleiben erhalten. API, Rollen, Berechtigungen, Datenmodell, Migrationen und Query-State wurden nicht verändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/ListBoardView.tsx` | geändert | Toolbar-Add-Icon auf größeres `Plus` umgestellt |
| `apps/web/src/components/ui/ActionMenu.tsx` | geändert | Aktionsmenü-Icon von Drei-Punkt auf `Settings2` gewechselt |
| `logs/2026-05-23-fix-listboard-toolbar-und-aktionsicon.md` | neu | Schritt-Log für den Fix |
| `logs/README.md` | geändert | Log-Index um den neuen Fix ergänzt |

## Probleme und Abweichungen

Keine. Der Web-Build war erfolgreich; Vite meldete nur die bestehende Chunkgrößen-Warnung.

## Offene Punkte / Folgeaufgaben

Keine.
