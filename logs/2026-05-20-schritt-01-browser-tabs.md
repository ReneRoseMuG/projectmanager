# Log: Browser-Tabs

**Datum:** 20.05.26  
**Schritt:** 1 — Browser-Tab-Navigation und Detailformulare  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die Hauptnavigation rendert für die fünf Sidebar-Hauptansichten einen `ExternalLink`-Button, der die jeweilige Route in einem neuen Browser-Tab öffnet und die aktuelle Router-Navigation verhindert. `FormModal` und die acht Entity-Formulare unterstützen nun optional `onOpenInTab`; `WikiPageForm` erhielt dieselbe Option in seiner bestehenden eigenen Modal-Hülle. Alle acht Detail-Pages berechnen `openInTab` nur im Edit-Modus mit gültiger ID und öffnen saubere Entity-URLs ohne `returnTo`, bevor der aktuelle Tab zur Rücksprungroute navigiert. Für Sidebar, Detail-Pages und Form-Props wurden fokussierte Tests ergänzt. `agents.md` wurde um die Browser-Tab-Konvention für neue Views und Detailformulare erweitert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/FormModal.tsx` | geändert | Optionales `onOpenInTab`-Prop und Header-Button ergänzt |
| `apps/web/src/components/layout/Sidebar.tsx` | geändert | Hover-Button für fünf Hauptnavigationseinträge ergänzt |
| `apps/web/src/components/*/*Form.tsx` | geändert | `onOpenInTab` in acht Entity-Formularen durchgereicht |
| `apps/web/src/pages/*DetailPage.tsx` und `apps/web/src/pages/WikiPage.tsx` | geändert | `openInTab` im Edit-Modus verdrahtet |
| `apps/web/src/components/**/__tests__/*Form.test.tsx` | geändert | Form-Button-Tests ergänzt und betroffene Hook-Mocks vervollständigt |
| `apps/web/src/components/layout/__tests__/Sidebar.test.tsx` | neu | Sidebar-Button-Tests ergänzt |
| `apps/web/src/pages/__tests__/*.test.tsx` | neu | Detail-Page-Verdrahtung für acht Entitäten getestet |
| `agents.md` | geändert | Abschnitt 15.8 zur Browser-Tab-Konvention ergänzt |

## Probleme und Abweichungen

Der volle Web-Testlauf `npm run test -w apps/web` ist nicht grün. Nach der Umsetzung laufen 236 Tests grün und 38 Tests rot; alle verbleibenden roten Tests scheitern am bestehenden Infrastrukturproblem `No QueryClient set, use QueryClientProvider to set one` in älteren Board-/Detail-Komponententests. Die neu angelegten Sidebar-/Page-Tests sind grün: 9 Testdateien, 28 Tests. Die neuen Form-Button-Tests sind grün: 8 Testdateien, 16 relevante Tests. `npm run typecheck -w apps/web` ist grün.

## Offene Punkte / Folgeaufgaben

Die bestehenden Board-/Detail-Komponententests benötigen einen einheitlichen QueryClient-Test-Provider oder passende Hook-Mocks, damit der vollständige Web-Testlauf wieder grün werden kann.
