# FT (01): Kalendertermine

## Metadaten

- Status: Abgeschlossen
- Typ: Feature

## Ziel / Zweck

Dieses Feature bildet die **zentrale fachliche Grundlage der Terminplanung**.

Es ermöglicht der Disposition, Termine als zeitliche Planungseinheiten **anzulegen, zu ändern, zu verschieben, zuzuweisen und zu überwachen**, immer mit fachlichem Kundenkontext. Dieser Kundenkontext kann direkt über einen Kunden oder indirekt über ein Projekt entstehen.

FT (01) ist die **fachliche Quelle der Wahrheit für alle Termindaten**. Alle weiteren Features, die Termine anzeigen, auswerten, überwachen oder ausgeben, leiten ihre Informationen **ausschließlich** aus den hier verwalteten Terminen ab.

Die Mitarbeiterzuweisung an Termine unterliegt der Überschneidungsprüfung, die sicherstellt, dass kein Mitarbeiter im selben Zeitraum mehreren Terminen zugewiesen ist.

## Fachliche Beschreibung

Ein Termin ist eine zeitliche Planungseinheit mit einem Startzeitpunkt und einem optionalen Endzeitpunkt. Jeder Termin ist einem Kunden direkt zugeordnet. Ein Termin kann optional einem Projekt zugeordnet sein. Wenn ein Termin einem Projekt zugeordnet ist, muss der Kundenwert des Termins identisch mit dem Kundenwert des Projekts sein – dies ist eine Konsistenzregel ohne Ausnahme. Die Kunde-Termin-Beziehung ist die fachlich relevante und stabile Zuordnung; das Projekt ist eine optionale Spezialisierung.

Termine sind Mitarbeitern zugeordnet. Die Zuordnungen entstehen durch Zuweisung von Mitarbeitern über ein Team oder individuell. Gespeichert wird am Termin stets die konkrete Mitarbeiterliste, nicht die Vorlage.

Zeitangaben werden technisch als echte Zeitpunkte geführt, damit spätere Anforderungen an „echte Uhrzeiten“ ohne erneute Modellmigration möglich sind. In der UI bleiben Uhrzeiten zunächst optional, weil der aktuelle Arbeitsmodus weiterhin primär tagesbasiert ist.

Ein Termin kann optional Notizen enthalten. Notizen sind freie Texteinträge (Titel und Inhalt), die direkt am Termin hängen und für die Dokumentation von Besonderheiten, Absprachen oder Hinweisen dienen. Notizen bleiben bei Terminen bestehen, unabhängig davon, ob der Termin bearbeitet, das Projekt gewechselt, die Tour verändert oder Mitarbeiter zugewiesen oder entfernt werden. Notizen können unabhängig vom Termin gelöscht werden.

Ein Termin kann storniert werden, solange er nicht in der Vergangenheit liegt — **außer durch einen Administrator, der auch historische Termine stornieren darf.** Der Storno-Workflow ist ein expliziter, nicht umkehrbarer Vorgang: Er zieht alle zugeordneten Mitarbeiter vom Termin ab, setzt den Auftragswert des zugeordneten Projekts auf 0 und markiert den Termin mit dem Tag „Storniert“. Damit wird der Termin dauerhaft gesperrt und verhält sich wie ein historischer Termin: read-only, nicht editierbar, nicht löschbar, nicht verschiebbar. Ein stornierter Termin bleibt in allen Sichten sichtbar, geht aber nicht in Umsatzkalkulationen und Reports ein, die auf dem Auftragswert basieren.

Ein Termin kann:

- unabhängig von einer Tour existieren,
- null, einen oder mehrere Mitarbeiter zugewiesen bekommen,
- über Teams mit Mitarbeitern belegt werden,
- Mitarbeiter können nur einmal im Termin existieren, keine Dupletten durch Team-Zuweisung,
- Mitarbeiter dürfen nur zugewiesen werden, wenn sich dadurch keine Überschneidungen mit anderen Terminen des Mitarbeiters ergeben.
- in verschiedenen Kalender- und Übersichtsansichten dargestellt werden,
- ohne Uhrzeit als Ganztagstermin gelten,
- optional eine Startuhrzeit besitzen, um einen Termin innerhalb eines Tages zeitlich zu verorten.

Termine können auf zwei fachlich gleichwertige Arten entstehen:

- durch Anlegen eines Termins **innerhalb eines Projekts**, oder
- durch Anlegen eines Termins **im Kalender** mit anschließender Projektzuweisung.

Unabhängig vom Einstiegspunkt gilt:

**Ein Termin ist erst fachlich gültig, wenn ihm ein Projekt oder ein Kunde zugeordnet ist.**

## Benutzerführung über Dialoge und Meldungen

Terminbezogene Speicherentscheidungen laufen über den Termin-Speichern-Review. Dieser Review bündelt Entscheidungen, die fachlich zum Speichern eines Termins gehören, und ersetzt einzelne Alert-Dialoge, sofern die Entscheidung logisch bis zum Speichern warten kann.

Der Termin-Speichern-Review kann insbesondere folgende Schritte enthalten:

- Speichern ohne Mitarbeiter: Wenn einem Termin keine Mitarbeiter zugeordnet sind, verlangt das System eine bewusste Bestätigung.
- Ressourcen- oder Wochenplanprüfung: Wenn eine Tour- oder Wochenplanänderung save-relevante Mitarbeiterfolgen hat, werden Vorschau, Konflikte und resultierende Mitarbeiterliste im Review behandelt.
- Terminnotizen prüfen: Wenn Startdatum, Enddatum oder Startzeit eines bestehenden Termins geändert werden und der Termin eigene Terminnotizen besitzt, verlangt das System eine bewusste Bestätigung, dass diese Notizen geprüft wurden.

Terminnotizen werden durch eine Terminverschiebung nicht automatisch geändert oder gelöscht. Der Review weist nur darauf hin, dass datum- oder uhrzeitbezogene Inhalte in den Notizen fachlich veraltet sein könnten.

Sofortaktionen bleiben möglich, wenn der Akteur direkt eine fachliche Reaktion erwartet. Dazu gehören insbesondere direkte Touränderungen mit unmittelbarer Wochenplanvorschau und der Reklamationsbutton im Terminformular.

## Regeln & Randbedingungen

**Abgrenzung zu Kalendermarkern**

Kalendermarker aus FT (34) sind keine Termine. Feiertage, Betriebsfeiertage und Betriebsferien erzeugen keine Terminobjekte, keine Kunden- oder Projektzuordnung, keine Mitarbeiterzuweisung, keine Überschneidungsprüfung und keine Reportwirkung.

**Grundlegende Terminregeln**

- Ein Termin ist immer einem Kunden direkt zugeordnet (customer_id, NOT NULL).
- Ein Termin ist optional einem Projekt zugeordnet (project_id, NULLABLE).
- Wenn ein Termin einem Projekt zugeordnet ist, muss gelten: appointment.customer_id == project.customer_id. Dies ist eine Invariante ohne Ausnahme.
- Ein Termin ohne Kundenzuordnung ist nicht zulässig.
- Termine enthalten keine eigenen Kunden- oder Projektdatenkopien.
- Kunden- und Projektinformationen werden stets referenziert, nicht gespeichert.

**Zeitliche Regeln**

- Ein Termin besitzt ein Startdatum und optional ein Enddatum.
- Mehrtägige Termine gelten für **alle Tage ihres Zeitraums**.
- Vergangene Termine sind für **Disponenten read-only** und dürfen von ihnen nicht verändert werden.
- **Administratoren dürfen historische Termine unbegrenzt bearbeiten**, verschieben, löschen, stornieren sowie Tags setzen und entfernen. Diese Ausnahme gilt für alle Schreiboperationen auf Terminen.
- Das `isLocked`-Flag im API-Response spiegelt diese Rollenlogik wider: Es ist `true` für Disponenten bei historischen Terminen, `false` für Administratoren.
- Wird keine Uhrzeit erfasst, gilt der Termin als Ganztagstermin.
- Wird eine Startuhrzeit erfasst, wird der Termin als Zeittermin behandelt.
- Wird ein Termin auf ein neues Datum verschoben, prüft das System die Verfügbarkeit aller bestehenden Mitarbeiter des Termins über alle Tage des neuen Zeitraums. Sind Mitarbeiter nicht verfügbar, zeigt das System eine Meldung mit den betroffenen Mitarbeitern. Nach expliziter Bestätigung durch den Disponenten werden diese Mitarbeiter vom Termin entfernt. Ohne Bestätigung wird der Termin nicht gespeichert.

**Mitarbeiterzuweisung**

- Einem Termin können **null, ein oder mehrere Mitarbeiter** zugewiesen werden.
- **Harte Regel (blockierend):**
    
    Ein Mitarbeiter darf im Zeitraum eines Termins **nicht zeitlich überschneidend** mehreren Terminen zugewiesen sein. Das gilt bei Mehrtagesterminen für die gesamte Termindauern
    
- Wird ein Mitarbeiter vor Durchführung eines Termins ersetzt, darf der Termin **nicht mehr** in der Historie des abgelösten Mitarbeiters erscheinen.

**Zuweisung einer Tour**

- Das Zuweisen oder Wechseln einer Tour an einem Termin löst eine Prüfung aus, ob für die Kalenderwoche des Terminstartdatums in der (neuen) Tour eine Wochenplanung (tour_week_employees) hinterlegt ist. Wenn ja, wird dem Disponenten sofort ein Vorschau-Dialog angezeigt: welche Mitarbeiter hinzugefügt würden, welche Konflikte bestehen (Typ-2: Termin-Überschneidung), welche Mitarbeiter wegen manueller oder Team-Zuweisung unverändert bleiben. Erst nach expliziter Bestätigung werden die ausgewählten Mitarbeiter in die Mitarbeiterliste des Termins übernommen. Bei Abbruch bleibt die Tour-Auswahl gesetzt, die Mitarbeiterliste bleibt unverändert. Ist keine Wochenplanung hinterlegt, ändert sich die Mitarbeiterliste nicht.
- Das Entfernen einer Tour am Termin hat keine Auswirkungen auf die Mitarbeiterliste des Termins.
- Mitarbeiter, die manuell oder über ein Team dem Termin zugewiesen wurden, werden durch Tour-Änderungen nicht automatisch entfernt. Sie erscheinen im Vorschau-Dialog als „bleibt unverändert“ mit Angabe des Herkunftsgrunds.
- Ein Termin ohne Tour wird in einer **Standardfarbe** dargestellt.
- Touren dienen der organisatorischen Gruppierung und visuellen Orientierung im Kalender.

**Zuweisung eines Team**

- Team sind **reine Eingabehilfen**.
- Gespeichert wird am Termin **immer die konkrete Mitarbeiterliste**, niemals die Vorlage.
- Änderungen an Teams wirken **nicht rückwirkend**.
- Der Termin übernimmt die Mitarbeiter des Teams

**Notizen an Terminen**

- Ein Termin kann null, eine oder mehrere Notizen haben.
- Jede Notiz besitzt einen Titel und einen Inhalt (Body), beide sind Pflichtfelder.
- Notizen sind unabhängig vom Termin; Änderungen am Termin (Datum, Projekt, Tour, Mitarbeiter) wirken sich nicht auf die Notizen aus.
- Werden Startdatum, Enddatum oder Startzeit eines Termins geändert und besitzt der Termin eigene Terminnotizen, fordert der Termin-Speichern-Review eine bewusste Prüfung dieser Notizen.
- Notizen werden nicht automatisch gelöscht, wenn ein Termin bearbeitet wird. Sie bleiben solange erhalten, bis sie explizit entfernt oder der gesamte Termin gelöscht wird.
- Eine Reklamationsnotiz kann beim Setzen des Systemzustands **Reklamation** vorgeschlagen werden. Beim Aufheben der Reklamation entscheidet der Akteur ausdrücklich, ob eine vorhandene Reklamationsnotiz entfernt oder behalten wird.
- Wenn ein Termin gelöscht wird, werden auch seine zugeordneten Notizen entfernt.

**Storno-Regeln**

- Storno ist für **Disponenten** nur für aktuelle und zukünftige Termine zulässig. Historische Termine (Startdatum in der Vergangenheit) können von Disponenten nicht storniert werden.
- **Administratoren dürfen auch historische Termine stornieren.**
- Ein stornierter Termin kann nicht erneut storniert werden.
- Der Storno-Workflow ist atomar: Mitarbeiterabzug, Setzen des Auftragswerts auf 0 am Projekt und Setzen des Tags „Storniert“ erfolgen in einer einzigen, nicht teilbaren Operation. Entweder alle Schritte werden ausgeführt oder keiner.
- Nach dem Storno ist der Termin dauerhaft gesperrt (read-only). Er kann weder bearbeitet noch gelöscht noch verschoben noch reaktiviert werden.
- Ein stornierter Termin ist in allen Sichten weiterhin sichtbar, jedoch optisch als storniert gekennzeichnet.
- Der Auftragswert des zugeordneten Projekts wird auf 0 gesetzt, damit stornierte Termine nicht in Umsatzkalkulationen und Reports eingehen.
- Hat der Termin kein Projekt (project_id = NULL), entfällt der Schritt „Auftragswert auf 0“; die übrigen Schritte bleiben unverändert.
- Die freigegebenen Mitarbeiter sind nach dem Storno für andere Termine im selben Zeitraum wieder verfügbar (Überschneidungsprüfung greift neu).