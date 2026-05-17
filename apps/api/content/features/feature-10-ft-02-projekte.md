# FT (02): Projekte

## Metadaten

- Status: Abgeschlossen
- Typ: Feature

## Ziel / Zweck

Dieses Feature ermöglicht der Disposition, **Projekte als zentrale fachliche Einheit** anzulegen, zu pflegen und in ihrem Lebenszyklus zu steuern.

Ein Projekt bildet den fachlichen Rahmen für alle zugehörigen Termine und bündelt alle projektbezogenen Informationen wie Beschreibung, Tags, Notizen und Anhänge.

## Fachliche Beschreibung

Ein Projekt repräsentiert einen Auftrag oder Vorgang (z. B. Aufbau, Service, Nachbesserung).

Es ist immer genau **einem Kunden** zugeordnet. Projektbezogene fachliche Markierungen werden nicht mehr über einen eigenen Projektstatus gepflegt, sondern über das universelle Tagging-System abgebildet.

Alle fachlichen Informationen, die **nicht terminspezifisch** sind, werden am Projekt gepflegt:

- eine ausführliche Projektbeschreibung (formatierter Text, z. B. Markdown),
- optionale Notizen (als eigenständiges Domainobjekt),
- projektbezogene Anhänge (z. B. Auftrag, Auftragsbestätigung, Pläne, Fotos).

Ein Projekt kann **ohne Termine** existieren.

Termine können **innerhalb eines Projekts** angelegt werden. Termine Können auch im Kalender angelegt werden, wo dann die Projektzuordnung erfolgt.

Projekt-Details sind immer **projektweit gültig** und gelten automatisch für alle zugehörigen Termine. Aus Termin- oder Kalenderansichten können Projekt-Details eingesehen, jedoch nicht zwingend dort bearbeitet werden.

In der Projektliste wird standardmäßig nur die für die Disposition relevante Arbeitsmenge angezeigt. Unter „Aktuelle Projekte“ versteht das System Projekte, die mindestens einen Termin besitzen, dessen Startdatum heute oder in der Zukunft liegt. Projekte ohne Termine sind im Standardfall bewusst ausgeblendet, weil sie nicht disponierbar sind. Über eine explizite Umschaltoption kann die Liste stattdessen auf „Projekte ohne Termine“ umgestellt werden; in diesem Modus werden ausschließlich Projekte angezeigt, die keinen Termin besitzen. Zusätzliche Filter wie Titel- oder Tagfilter wirken immer nur auf die jeweils geladene Projektmenge und definieren nicht die Grundmenge.

Der Projektfilter enthält zusätzlich einen Artikellistenfilter. Er basiert auf den strukturierten Auftragspositionen (`project_order_items`) und ermöglicht das Filtern nach konkreten Sauna-Produkten sowie Komponenten aus den festen Artikellisten-Kategorien, zum Beispiel Ofen, Fenster, Dach oder Tür. Innerhalb einer Kategorie gilt ODER, zwischen mehreren Kategorien gilt UND. Der Filter ist lesend und verändert weder Projekt noch Stammdaten.

Die Projektliste zeigt den nächsten Termin direkt in der Projektkarte bzw. Tabellenzeile. Bei Projekten mit mehreren Terminen wird der nächste Termin ab heute verwendet. Die Tabellenspalte **Nächster Termin** ist sortierbar; Projekte ohne nächsten Termin bleiben bei dieser Sortierung am Ende.

Notizen sind zusätzliche, frei formulierte Texteinträge, die projektspezifische Informationen, Absprachen oder Besonderheiten dokumentieren. Jede Notiz besteht aus einem Titel und einem Inhalt und ist dauerhaft dem Projekt zugeordnet. Ein Projekt kann mehrere Notizen enthalten. Notizen sind unabhängig von Terminplanungen, Tag-Änderungen oder Kundenanpassungen – sie bleiben bestehen und können jederzeit ergänzt oder überarbeitet werden. Notizen sind für alle zum Projekt gehörenden Termine verfügbar und können optional in Druckausgaben oder Exportformaten mitgeführt werden.

## Benutzerführung über Dialoge und Meldungen

Projektbezogene Dialoge folgen dem gemeinsamen Dialogsystem aus dem Dialog-Rollout. Besonders relevant ist der Speichern-Review im Projektformular: Vor der eigentlichen Projektmutation sammelt das System alle fachlichen Hinweise und Entscheidungen, die zu diesem Speichervorgang gehören, in einem gemeinsamen Dialog. Dazu gehören nicht ausgewählte Einträge in der strukturierten Artikelliste, die Entscheidung zur Übernahme eines Sauna-Modellnamens oder eines aus dem Dokument erkannten ersten Projektblocks als Projekttitel, eine offene Reklamationsnotizentscheidung und eine mögliche Duplikatentscheidung für ein per Dokumentextraktion eingebrachtes PDF.

Der Speichern-Review ist nicht als Kette einzelner Browser-Bestätigungen zu verstehen. Der Akteur prüft die angezeigten Hinweise und Entscheidungen im Dialog, bestätigt danach den gesamten Speichervorgang oder bricht ihn ab. Bei Abbruch wird keine Projektmutation ausgeführt; bereits geprüfte Dialogschritte lösen keine Teilpersistenz aus. Falls nur eine einzelne fachliche Aktion nötig ist, zum Beispiel eine Reklamationsnotiz ohne weitere Speichern-Hinweise, darf der bestehende fachliche Editor verwendet werden. Sobald mehrere Entscheidungen denselben Speichervorgang betreffen, werden sie im gemeinsamen Review gebündelt.

Wenn ein Projekt aus der Dokumentextraktion entsteht, bleibt das eingelesene PDF im Projektformular als Draft-Dokument sichtbar, bis der Speichervorgang abgeschlossen oder verworfen wird. Der Akteur kann dieses Draft-Dokument gezielt in einem neuen Browser-Tab öffnen, um die extrahierten Daten gegen die Quelle zu prüfen. Die dauerhafte Verknüpfung als Projektanhang erfolgt erst im bestätigten Speichern- beziehungsweise Attachment-Flow. Eine nötige Duplikatentscheidung zum PDF wird im Speichern-Review getroffen und nicht zusätzlich als separater Browser-Dialog abgefragt.

Entscheidungen, die im Doc-Extract-Dialog bereits vollständig getroffen wurden, dürfen beim späteren Projektspeichern nicht erneut abgefragt werden. Das betrifft insbesondere die Entscheidung, ein Dokument als Reklamation zu behandeln, sowie die zugehörige Reklamationsnotizfrage, wenn sie im Dialog abgeschlossen wurde. Ändert der Akteur nach der Übernahme relevante Projektdaten, Artikelliste oder Projekttitel manuell, darf nur die dadurch erneut offene Speicherfrage wieder im Speichern-Review erscheinen.

Meldungen im Projektformular sollen den fachlichen Kontext nennen: Projekt, Kunde, Artikelliste, Reklamationsnotiz oder Dokument. Technische Rohcodes, HTTP-Status oder unformatierte Serverantworten dürfen nicht als Nutzertext erscheinen. Normale Lade-, Validierungs-, Versions- und Speicherfehler werden als verständliche Inline-Meldungen oder Dialogfehler angezeigt. Die Dialoge ersetzen keine Berechtigungsprüfung: Schreibende Projektmutationen bleiben serverseitig auf `ADMIN` und `DISPONENT` begrenzt; clientseitig entspricht dies den bestehenden schreibberechtigten Rollen. `READER` beziehungsweise `LESER` bleibt lesend.

## Regeln & Randbedingungen

- Ein Projekt ist immer genau **einem Kunden** zugeordnet.
- Ein Projekt kann projektbezogene Tags besitzen.
- Projektbezogene Markierungen werden über das universelle Tagging-System gepflegt.
    - System-Tags und fachlich geschützte Tags werden gemäß FT (28) verwaltet.
- Der Systemzustand **Reklamation** wird nicht über die generische Projekt-Tag-Pflege gesetzt oder entfernt, sondern über den Reklamationsworkflow aus FT (06). Dieser Workflow setzt bzw. entfernt das geschützte System-Tag **Reklamation** und kann optional eine Projektnotiz aus der Reklamationsvorlage vorschlagen.
- Wird im Projektformular das Artikellistenfeld **Sauna** auf ein anderes Modell geändert, kann das System anbieten, den Projektnamen auf den Namen des gewählten Sauna-Modells zu setzen. Bei Ablehnung bleibt der bestehende Projektname unverändert. Beim erneuten Auswählen desselben Modells erfolgt keine Rückfrage.
- Ein Projekt kann ohne Termine existieren.
- Projekt-Details (Beschreibung, Notizen, Anhänge) gehören **ausschließlich** zum Projekt, nicht zum Termin.
- Notizen sind optional und frei pflegbar.
- Anhänge sind optional; ein Projekt kann mehrere Anhänge besitzen.
- Anhänge sind dauerhaft dem Projekt zugeordnet.
- Das physische Löschen eines Projekts ist nur zulässig, wenn keine Termine existieren.

**Notizen an Projekten**

- Ein Projekt kann null, eine oder mehrere Notizen haben.
- Jede Notiz besitzt einen Titel und einen Inhalt (Body), beide sind Pflichtfelder.
- Notizen sind unabhängig vom Projekt; Änderungen am Projekt (Kundenänderung, Tag-Änderung, Anhänge) wirken sich nicht auf die Notizen aus.
- Notizen werden nicht automatisch gelöscht, wenn ein Projekt bearbeitet wird. Sie bleiben solange erhalten, bis sie explizit entfernt oder das gesamte Projekt gelöscht wird.
- Eine Reklamationsnotiz kann beim Setzen des Systemzustands **Reklamation** vorgeschlagen werden. Beim Aufheben der Reklamation entscheidet der Akteur ausdrücklich, ob eine vorhandene Reklamationsnotiz entfernt oder behalten wird.
- Wenn ein Projekt gelöscht wird, werden auch seine zugeordneten Notizen entfernt.
- Notizen sind für alle zugehörigen Termine sichtbar, sofern das Termindetail oder die Projektreferenz angezeigt wird.
- Notizen können optional in Druckausgaben, CSV-Exporten oder anderen Exportformaten mitgeführt werden, sofern das jeweilige Feature dies vorsieht.