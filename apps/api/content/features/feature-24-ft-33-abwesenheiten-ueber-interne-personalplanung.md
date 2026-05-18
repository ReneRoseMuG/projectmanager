<h1>FT (33): Abwesenheiten über interne Personalplanung</h1>
<h2>Metadaten</h2>
<ul><li>Status: Abgeschlossen</li><li>Typ: Feature</li></ul>
<h2>Ziel / Zweck</h2>
<p>Dieses Feature ermöglicht die Erfassung und Berücksichtigung von Mitarbeiter-Abwesenheiten, ohne das stillgelegte alte Abwesenheitsmodul zu reaktivieren und ohne eine allgemeine Einführung von Termintypen vorzunehmen. Abwesenheiten werden als kontrollierter Sonderfall bestehender Termine abgebildet:</p>
<ul><li>bestehender Seed-Kunde <strong>Meisel &amp; Gerken</strong> mit Kundennummer <code>001</code></li><li>Systemtour <strong>Abwesenheiten</strong></li><li>regulärer Termin mit Startdatum und optionalem Enddatum</li><li>genau eine Mitarbeiterzuweisung am Termin</li><li>genau ein fachlicher Abwesenheits-Tag: <strong>Urlaub</strong>, <strong>Krankheit</strong> oder <strong>Abwesend</strong></li></ul>
<p>Die App nutzt weiterhin Termine als zentrale Quelle der Wahrheit. Abwesenheiten werden nicht über ein neues <code>appointment_type</code>-Konzept modelliert, sondern über einen dedizierten Mitarbeiter-Abwesenheiten-Flow.</p>
<h2>Fachliche Beschreibung</h2>
<p><strong>Kerndefinition</strong></p>
<p>Eine Abwesenheit liegt vor, wenn ein Termin folgende Merkmale kumulativ erfüllt:</p>
<ul><li>Kunde ist der bestehende Seed-Kunde <strong>Meisel &amp; Gerken</strong> mit Kundennummer <code>001</code></li><li>Tour ist <strong>Abwesenheiten</strong></li><li>Genau ein Mitarbeiter ist zugewiesen</li><li>Der Termin besitzt ein gültiges Startdatum und optional ein Enddatum</li><li>Genau ein Abwesenheits-Tag ist gesetzt: <strong>Urlaub</strong>, <strong>Krankheit</strong> oder <strong>Abwesend</strong></li></ul>
<p>Der Abwesenheits-Tag ist nicht optional. Er klassifiziert die Art der Abwesenheit und wird ausschließlich über dedizierte Abwesenheitsfunktionen gesetzt oder geändert. Abwesenheits-Tags sind System-Tags (<code>isDefault = true</code>) und erscheinen nicht im normalen User-Tag-Picker.</p>
<p>Abwesenheiten besitzen kein Projekt und fallen dadurch strukturell aus allen projektbasierten Reports heraus – ohne expliziten Filter.</p>
<p><strong>Erfassung und Pflege</strong></p>
<p>Abwesenheiten werden ausschließlich über das Mitarbeiterformular im Tab <strong>Abwesenheiten</strong> angelegt, bearbeitet und gelöscht. Die technischen Endpunkte liegen unter <code>/api/employees/:id/absence-appointments</code>. Der Server setzt beim Anlegen und Bearbeiten automatisch Kunde, Tour, Mitarbeiter und Tag.</p>
<p>Außerhalb dieses dedizierten Mitarbeiterpfads bleiben Abwesenheiten zwar lesbar, generische Terminmutationen sind dort aber gesperrt. Dadurch werden Abwesenheiten nicht versehentlich über fachlich unpassende Terminaktionen verändert.</p>
<p><strong>Systemdaten</strong></p>
<p>Folgende Systemdaten werden benötigt und zweistufig sichergestellt – über den System-Seed und zusätzlich über Lazy Ensure im Abwesenheiten-Service:</p>
<ul><li>bestehender Seed-Kunde <strong>Meisel &amp; Gerken</strong> mit Kundennummer <code>001</code></li><li>Systemtour <strong>Abwesenheiten</strong> mit Farbe <code>#64748B</code></li><li>Systemtags <strong>Urlaub</strong>, <strong>Krankheit</strong>, <strong>Abwesend</strong> (<code>isDefault = true</code>)</li></ul>
<p><strong>Darstellung im Kalender</strong></p>
<p>*Wochenkalender:* Die Tour <strong>Abwesenheiten</strong> wird ganz unten als passive Lane eingeblendet. Sie bietet keine Action-Elemente: kein +‑Button, kein Drag &amp; Drop, keine Tag-Bearbeitung, keine Blockier-Aktionen, keine Notizen.</p>
<p>*Monatskalender:* Im Standardmodus <strong>Terminplanung</strong> werden Abwesenheiten ausgeblendet. Ein Toggle im Kopfbereich schaltet zwischen <strong>Terminplanung</strong> und <strong>Abwesenheiten</strong> um. Im Modus <strong>Abwesenheiten</strong> werden ausschließlich Abwesenheitstermine angezeigt, reguläre Termine ausgeblendet. Die kompakte Monatsdarstellung zeigt dabei den betroffenen Mitarbeiter statt des internen Systemkunden. Der Toggle-Zustand wird nicht persistiert.</p>
<p>*Auslastungsübersicht im Mitarbeiterformular:* Abwesenheiten werden gemeinsam mit regulären Terminen angezeigt (<code>absenceVisibility=&quot;include&quot;</code>).</p>
<h2>Regeln &amp; Randbedingungen</h2>
<p><strong>R-01 Dedizierter Flow</strong></p>
<p>Abwesenheiten werden über <code>/api/employees/:id/absence-appointments</code> erzeugt und gepflegt. Der normale Termin-Flow ist nicht der primäre Erfassungsweg.</p>
<p><strong>R-02 Systemkontext automatisch setzen</strong></p>
<p>Beim Anlegen und Bearbeiten setzt der Server automatisch den bestehenden Seed-Kunden <strong>Meisel &amp; Gerken</strong> mit Kundennummer <code>001</code>, die Tour <strong>Abwesenheiten</strong>, genau einen Mitarbeiter und genau einen Abwesenheits-Tag.</p>
<p><strong>R-03 Mitarbeiter blockieren</strong></p>
<p>Der einem Abwesenheitstermin zugewiesene Mitarbeiter gilt im Terminzeitraum als nicht verfügbar. Die bestehende Termin-Überschneidungsprüfung prüft reguläre Termine gegen Abwesenheitstermine.</p>
<p>Disponenten dürfen Abwesenheiten auch dann erfassen oder bearbeiten, wenn der Zeitraum bereits vor dem aktuellen Tag beginnt, solange die Abwesenheit am aktuellen Tag noch läuft oder in die Zukunft reicht. Vollständig vergangene Abwesenheiten bleiben für Disponenten schreibgeschützt. Administratoren behalten die bestehende historische Ausnahme.</p>
<p>Wenn beim Anlegen oder Bearbeiten einer Abwesenheit bereits reguläre Termine desselben Mitarbeiters im Zeitraum liegen, liefert der Server die betroffenen Termine zur Bestätigung zurück. Nach ausdrücklicher Bestätigung wird nur der betroffene Mitarbeiter aus diesen regulären Terminen entfernt und die Abwesenheit anschließend gespeichert. Die Termine selbst bleiben in ihrer bisherigen Tour, werden nicht auf den Parkplatz verschoben und erhalten keinen Parken-Tag. Ohne Bestätigung bleibt der Bestand unverändert.</p>
<p>Wenn der Mitarbeiter in einer vom Abwesenheitszeitraum betroffenen Tour-KW-Planung eingetragen ist, liefert der Server diese KW-Planungen ebenfalls zur Bestätigung zurück. Nach ausdrücklicher Bestätigung wird nur die Tour-KW-Mitarbeiterzuordnung entfernt. Ohne Bestätigung bleiben Terminzuweisungen, Tour-KW-Planungen und Abwesenheit unverändert.</p>
<p><strong>R-04 Keine Wochenplanungsübernahme</strong></p>
<p>Für die Systemtour <strong>Abwesenheiten</strong> darf keine automatische Mitarbeiterübernahme aus der Tour- oder Kalenderwochenplanung ausgeführt werden.</p>
<p>Im Tourformular wird für die Systemtour <strong>Abwesenheiten</strong> kein Tab <strong>Wochenplanung</strong> angeboten. Im Wochenkalender erhält die Abwesenheiten-Lane keine Tour-KW-Personalkarte in der Personalspalte. Abwesenheiten werden über den dedizierten Abwesenheitsflow und die passive Abwesenheitsanzeige sichtbar, nicht über reguläre Tour-KW-Mitarbeiterplanung.</p>
<p>Tour-KW-Sperren der Systemtour <strong>Abwesenheiten</strong> blockieren den dedizierten Abwesenheitsflow nicht. Abwesenheiten sind keine reguläre Tourenplanung und dürfen deshalb nicht durch Wochenplanungssperren dieser Systemtour verhindert werden.</p>
<p><strong>R-05 Tag-Wechsel kontrolliert</strong></p>
<p>Beim Wechsel der Abwesenheitsart entfernt der Server alle anderen Abwesenheits-Tags und setzt genau den neuen Tag.</p>
<p><strong>R-06 Generische Terminmutationen blockieren</strong></p>
<p>Abwesenheiten bleiben außerhalb des Mitarbeiterformulars lesbar, dürfen dort aber nicht über generische Terminpfade bearbeitet, storniert, gelöscht, umgetaggt oder anderweitig mutiert werden.</p>