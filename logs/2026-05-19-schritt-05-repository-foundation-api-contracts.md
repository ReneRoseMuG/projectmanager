# Log: Repository Foundation und API-Kontrakte

**Datum:** 19.05.26  
**Schritt:** 5 — Repository Foundation und API-Kontrakte  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Repository-Grundlage wurde unter `apps/api/src/repositories/` angelegt. `base.repository.ts` enthält `VersionConflictError` und `assertVersion` für Optimistic Locking. Der globale API-Error-Handler übersetzt `VersionConflictError` in das bestehende 409-Fehlerformat. In den Route-Schemas wurde ein wiederverwendbarer `expectedVersion`-Baustein ergänzt. Die Shared Types enthalten nun `VersionedUpdate` und `WithExpectedVersion<T>` als Grundlage für die späteren versionierten Update-Inputs.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/repositories/base.repository.ts` | neu | Basisfehler und Versionsprüfung für Repositories |
| `apps/api/src/repositories/base.repository.test.ts` | neu | Unit-Test für `assertVersion` und `VersionConflictError` |
| `apps/api/src/utils/errors.ts` | geändert | 409-Mapping für `VersionConflictError` ergänzt |
| `apps/api/src/utils/route-schemas.ts` | geändert | `expectedVersion`-Schema-Bausteine ergänzt |
| `packages/shared-types/src/index.ts` | geändert | Versionierungs-Hilfstypen ergänzt |
| `packages/shared-types/dist/` | geändert | Shared Types neu gebaut |
| `logs/2026-05-19-schritt-05-repository-foundation-api-contracts.md` | neu | Schritt-Log für Aufgabe 05 |
| `logs/README.md` | geändert | Log-Index um Aufgabe 05 ergänzt |

## Probleme und Abweichungen

Keine neuen Blocker. Die bereits offenen Testblocker aus Schritt 02 bis 04 bleiben unverändert bestehen.

## Offene Punkte / Folgeaufgaben

Die konkreten Entity-Repositories und die verpflichtende Nutzung von `expectedVersion` in Domain-Routen folgen in den nächsten Aufgaben.
