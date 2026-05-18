<h1>UC 02/16: Projekt-Referenz-Konsistenz (Projekt ↔ Kunde)</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-02-projekte.md">FT (02): Projekte</a></li></ul>
<h2>Akteur</h2>
<p>Administrator</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass der Kundenwert eines Projekts stabil bleibt, sobald Termine existieren, und dass Konsistenz zwischen Projekt-Kunde und Termin-Kunden garantiert ist.</p>
<h2>Vorbedingungen</h2>
<ul><li>Projekt existiert.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Administratorrechte.</li><li>Projekt ist einem Kunden zugeordnet.</li><li>Optional: Dem Projekt sind Termine zugeordnet.</li></ul>
<h2>Ablauf</h2>
<h3><strong>Invarianten</strong></h3>
<p>1. <strong>Readonly-Regel:</strong> Wenn ein Projekt mindestens einen Termin hat, ist der Kundenwert des Projekts <strong>readonly</strong>. Ein Kundenwechsel ist nicht zulässig.<br>2. <strong>Konsistenzregel:</strong> Alle Termine eines Projekts müssen denselben Kundenwert haben wie das Projekt. Dies ist eine Invariante ohne Ausnahme.<br>3. <strong>Lösch-Blockade:</strong> Ein Projekt kann nur gelöscht werden, wenn es keine Termine besitzt (analog zur Readonly-Regel).</p>
<h3><strong>Ablauf – Beispiel 1: Projekt mit Terminen hat readonly Kunden</strong></h3>
<p>1. Projekt P existiert mit Kunde K.<br>2. Termin T wird Projekt P zugewiesen (Kundenwert von T muss K sein, siehe UC 01/02).<br>3. Administrator versucht, den Kunden von Projekt P zu wechseln.<br>4. System erkennt: Projekt hat Termin → readonly.<br>5. System blockiert Kundenwechsel mit Fehlermeldung.</p>
<h3><strong>Ablauf – Beispiel 2: Projekt ohne Termine erlaubt Kundenwechsel</strong></h3>
<p>1. Projekt P existiert mit Kunde K.<br>2. Projekt P hat keine Termine.<br>3. Administrator wechselt Kunde zu K'.<br>4. System prüft: Keine Termine vorhanden → Wechsel ist zulässig.<br>5. System speichert neue Kundenreferenz.</p>
<h3><strong>Ablauf – Beispiel 3: Termin-Anlage mit Projekt erzwingt Kundenwert</strong></h3>
<p>1. Administrator legt Termin an, wählt Kunde K und Projekt P.<br>2. System prüft: Ist K == P.customer_id?<br>3. Falls nein: System blockiert mit Fehlermeldung (siehe UC 01/02).<br>4. Falls ja: System speichert Termin mit konsistenten Werten.<br>5. Nach Speicherung: Projekt P wird readonly für Kundenwechsel.</p>
<h2>Alternativen</h2>
<ul><li>Projekt besitzt bereits Termine → Der Kundenwechsel wird blockiert; der bestehende Kundenwert bleibt unverändert.</li><li>Termin soll mit abweichendem Kundenwert einem Projekt zugeordnet werden → Die Termin-Anlage oder Projektzuordnung wird blockiert, bis Kunde und Projekt konsistent sind.</li><li>Projekt besitzt keine Termine → Ein Kundenwechsel ist zulässig, sofern der neue Kunde existiert und die übrigen Projektregeln erfüllt sind.</li><li>Projekt oder Kunde existiert nicht → Das System blockiert die Operation mit einem Fehlerstatus; es entsteht keine inkonsistente Referenz.</li><li>Technischer Fehler oder parallele Änderung → Das System speichert keine Teiländerung und fordert den Akteur zum erneuten Laden des aktuellen Stands auf.</li></ul>
<h2>Ergebnis</h2>
<ul><li>Projekt-Kundenwerte sind stabil und unveränderbar, sobald Termine existieren.</li><li>Alle Termine eines Projekts haben garantiert denselben Kundenwert wie das Projekt.</li><li>Keine verwaisten oder inkonsistenten Projekt-Termin-Kunde-Beziehungen entstehen.</li><li>Administratoren wissen eindeutig: Wer ein Projekt bearbeiten will, muss zuerst prüfen, ob Termine existieren.</li></ul>