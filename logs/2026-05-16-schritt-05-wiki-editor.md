# Log: WikiEditor

**Datum:** 16.05.26  
**Schritt:** 5 — WikiEditor-Modal  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Das bestehende WikiPageForm wurde als WikiEditor-Äquivalent auf den Teal-Form-Chrome umgestellt. Es besitzt nun Header-Actions für Vorschau und Versionen, eine Meta-Card mit Titel, Kategorie, Slug-Prefix-Pattern und Toggle-Rows. Der MarkdownEditor bleibt der bestehende Eingabepunkt. Zusätzlich existiert eine `WikiEditor.tsx`-Exportdatei als Kompatibilitätsalias.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/wiki/WikiPageForm.tsx` | geändert | Wiki-Formular auf Studie-2-Editor-Chrome umgestellt |
| `apps/web/src/components/wiki/WikiEditor.tsx` | neu | Alias auf das bestehende WikiPageForm als WikiEditor |

## Probleme und Abweichungen

Es gab keine vorhandene Datei `WikiEditor.tsx`; die bestehende funktionale Komponente heißt `WikiPageForm`. Die Umsetzung bleibt deshalb auf der vorhandenen Komponente und ergänzt nur einen Alias.

## Offene Punkte / Folgeaufgaben

Echte Wiki-Versionen benötigen ein Backend-/Schema-Folgefeature.
