# Log: Admin Nav Kontrast

**Datum:** 25.05.26  
**Schritt:** Fix — Admin Nav Kontrast  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die innere Admin-Navigation wurde erneut geschärft, weil die vorherige Schattenklasse auf dem dunklen Hintergrund optisch zu schwach wirkte. Die Beschriftungen der Admin-Navigation sind nun dauerhaft weiß, auch bei inaktiven Einträgen. Der Icon-Effekt wurde in `theme.css` als Admin-spezifische Variante auf Basis der vorhandenen Sidebar-Farbvariablen umgesetzt: Badge-Fläche, Inset-Lichtkante, sichtbarer Glow und aktive Seitenmarke entsprechen damit stärker dem Effekt der Hauptnavigation. Die React-Komponente verwendet diese Klassen direkt, statt den Effekt nur über einzelne Tailwind-Klassen anzudeuten.

Für die Testprüfung wurde der Testentwurfs-Skill angewendet. Betroffen ist die Unit-Ebene; geprüft wird, dass aktive Einträge und Icon-Badges in der Admin-Sidebar die erwarteten Klassen tragen und inaktive Linktexte nicht mehr abgeschwächt werden. Die Isolation erfolgt über jsdom mit MemoryRouter ohne API-, Datenbank- oder Dateisystemzugriff.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/styles/theme.css` | geändert | Admin-Sidebar-Klassen für weiße Schrift, aktive Glow-Marke und sichtbaren Icon-Effekt ergänzt |
| `apps/web/src/components/layout/AdminSidebar.tsx` | geändert | Admin-Navigation auf neue Effektklassen und dauerhaft weiße Schrift umgestellt |
| `tests/unit/web/components/layout/AdminLayout.test.tsx` | geändert | Erwartungen für weiße Linkschrift und Admin-Icon-Klasse aktualisiert |
| `logs/2026-05-25-fix-admin-nav-kontrast.md` | neu | Schritt-Log für den Fix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
