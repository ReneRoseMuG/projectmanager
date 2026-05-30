# Log: StatusPill Fallback

**Datum:** 24.05.26  
**Schritt:** Fix — StatusPill-Fallback  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Für gefüllte Badges ohne Katalogfarbe wurde ein neutraler Standardton ergänzt. Dadurch erhält `StatusPill` bei unbekannten Statuswerten wieder eine solide, gut lesbare Fallback-Darstellung mit `bg-steel-500` und weißem Text. Die Lösung bleibt bewusst klein und zentral in `Badge`, weil `StatusPill` bereits dieselbe Badge-Grundform nutzt. Produktionslogik, Datenmodell, API, Auth und Berechtigungen wurden nicht verändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/Badge.tsx` | geändert | Neutralen Fallback für `filled` ohne Katalogfarbe ergänzt |
| `logs/2026-05-24-fix-statuspill-fallback.md` | neu | Schritt-Log für den StatusPill-Fix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine. Die Lösung folgt den visuellen Leitplanken für Badge/Pill-Grundform und solide Statusdarstellung.

Testleitplanken: angewendet wurde der Repo-Skill `projekt-manager-test-entwurfsleitplanken`. Testebene ist Web-Unit mit jsdom; keine DB- oder Dateisystemdaten; bestehende Unit-Mocks isolieren nur den Katalog-Hook.

## Offene Punkte / Folgeaufgaben

- Die Rücksprung-Erwartungen in `create-child-elements.spec.ts` sind separat testseitig zu bereinigen.
- Die vorgemerkten Kindobjekte aus Meilenstein-Kartenmenüs benötigen eine gesonderte Umsetzung.
- Der Ticket-DnD-Fehler war im Einzellauf nicht reproduzierbar und sollte bei Bedarf im vollständigen E2E-Lauf erneut beobachtet werden.
