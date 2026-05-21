# Log: StatusPill Farben

**Datum:** 21.05.26  
**Schritt:** 6 — StatusPill-Farben differenzieren  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Für Status-Farben wurde eine domänenspezifische Utility eingeführt, statt eine flache Key-Map zu verwenden. `StatusPill` nutzt jetzt `statusToneForKey`; geschlossene Katalogeinträge bleiben immer grau. Die bestehenden Domain-Tone-Exports wurden auf dieselbe Quelle ausgerichtet, und pending Relation-Pills in Feature-, Task- und UseCase-Formularen nutzen dieselbe Logik. Dadurch werden Arbeitsstatus wie `in_progress` und `in_review` sichtbar differenziert, ohne Katalogdaten oder Backend zu ändern.

## Geänderte / angelegte Dateien

| Datei                                              | Art      | Kurzbeschreibung                                       |
| -------------------------------------------------- | -------- | ------------------------------------------------------ |
| `apps/web/src/utils/statusTones.ts`                | neu      | domänenspezifische Status-Farbzuordnung                |
| `apps/web/src/components/ui/StatusPill.tsx`        | geändert | nutzt `statusToneForKey`                               |
| `apps/web/src/utils/domainLabels.ts`               | geändert | Tone-Exports auf zentrale Quelle ausgerichtet          |
| `apps/web/src/components/features/FeatureForm.tsx` | geändert | Pending-Pills an zentrale Logik angepasst              |
| `apps/web/src/components/tasks/TaskForm.tsx`       | geändert | Pending-Pills an zentrale Logik angepasst              |
| `apps/web/src/components/usecases/UseCaseForm.tsx` | geändert | Pending-Pills an zentrale Logik angepasst              |
| `tests/unit/web/components/ui/StatusPill.test.tsx` | neu      | Status-Farben, Closed-Vorrang und Fallback abgesichert |

## Probleme und Abweichungen

Die vorgeschlagene flache Map wurde bewusst nicht verwendet, weil gleiche Keys je nach Katalog verschiedene Bedeutungen haben können. Die vollständige E2E-Abnahme bleibt wegen Kalender-Specs blockiert.

## Offene Punkte / Folgeaufgaben

Keine offenen Punkte für StatusPill. Kalender-E2E separat prüfen.
