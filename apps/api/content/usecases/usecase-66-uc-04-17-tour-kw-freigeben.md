<h1>UC 04/17: Tour-KW freigeben</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-04-tourenplanung.md">FT (04): Tourenplanung</a></li><li>Vorheriger Ablauf: <a href="uc-04-16-tour-kw-blockieren-und-termine-parken.md">UC 04/16: Tour-KW blockieren und Termine parken</a></li></ul>
<h2>Akteur</h2>
<p>Administrator, Disponent</p>
<h2>Ziel</h2>
<p>Eine blockierte Tour-KW wieder für reguläre Wochenplanungsaktionen öffnen, ohne zuvor geparkte Termine oder entfernte Mitarbeiterzuordnungen automatisch wiederherzustellen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Administrator- oder Disponentenrechte.</li><li>Die Tour ist eine regulär planbare Tour.</li><li>Die Tour-KW liegt in einer für den Akteur editierbaren Kalenderwoche.</li><li>Für die Tour-KW existiert ein blockierter Sperrstatus.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet eine blockierte Tour-KW-Karte im Wochenkalender, im Tourformular oder in der Tour-KW-Wochenplanung.<br>2. Der Akteur wählt die Aktion <strong>Wochenplanung freigeben</strong>.<br>3. Das System prüft Rolle, Tour, Kalenderwoche und vorhandenen Sperrstatus.<br>4. Das System setzt den Sperrstatus der Tour-KW auf freigegeben.<br>5. Das System aktualisiert Wochenkalender, Tourformular, Tour-KW-Wochenplanung und betroffene Kalenderprojektionen.</p>
<h2>Alternativen</h2>
<ul><li>Leser löst die Aktion direkt aus: Das System lehnt die Mutation ab.</li><li>Vergangene Tour-KW: Das System lehnt die Mutation als schreibgeschützt ab.</li><li>Nicht vorhandene Tour-KW: Das System meldet, dass die Wochenplanung nicht gefunden wurde.</li><li>Parkplatz- oder Abwesenheiten-Tour: Das System bietet keine reguläre Tour-KW-Planung an und lehnt direkte Mutationsaufrufe ab.</li><li>Die Tour-KW ist bereits freigegeben: Das System lässt den Zustand unverändert oder meldet den aktuellen Zustand ohne Terminänderung.</li></ul>
<h2>Ergebnis</h2>
<p>Die Tour-KW ist nicht mehr blockiert. Mitarbeiterplanung und Anwenden-Aktionen können wieder über die regulären Tour-KW-Funktionen genutzt werden, sofern Rolle, Kalenderwoche und Konfliktregeln dies erlauben. Beim Freigeben werden keine Termine vom <strong>Parkplatz</strong> zurückverschoben, kein Zustand <strong>Geparkt</strong> entfernt und keine zuvor entfernten Termin- oder Tour-KW-Mitarbeiterzuordnungen automatisch rekonstruiert.</p>