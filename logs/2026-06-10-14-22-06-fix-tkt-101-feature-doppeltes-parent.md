# Log: TKT-101 Feature-Details doppeltes Parent

**Datum:** 10.06.26  
**Uhrzeit:** 14:22:06  
**Schritt:** Fix — TKT-101 „Feature Details Übergeordnetes Element und zugehöriges Projekt sind doppelt"  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

In der Feature-Detail-Sidebar (`FeatureForm`) standen zwei sich überschneidende
Angaben: das read-only Panel „Übergeordnetes Element" (`ParentContextField`) und
der editierbare „Projekt"-Picker (`SelectParent`). Beide zeigten dieselbe
Projektzuordnung. Das veraltete, read-only „Übergeordnetes Element" wurde aus dem
Feature-Formular entfernt; der editierbare Projekt-Picker bleibt als maßgebliche
Steuerung. Die nun ungenutzte `showParentContexts`-Konstante und der
`ParentContextField`-Import wurden entfernt. Andere Formulare (Task, Ticket,
Use Case, Backlog) bleiben unverändert — dort ist `ParentContextField` die
primäre Parent-Anzeige.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/features/FeatureForm.tsx` | geändert | `ParentContextField` + `showParentContexts` + Import entfernt |

## Probleme und Abweichungen

Falls ein Feature zusätzlich einem Meilenstein zugeordnet ist, wird dieser Kontext
in der Sidebar nicht mehr separat angezeigt. Bewusst akzeptiert, da TKT-101 das
„Übergeordnete Element" ausdrücklich als veraltet/doppelt benennt.

## Offene Punkte / Folgeaufgaben

Keine.
