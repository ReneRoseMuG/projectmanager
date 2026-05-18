<h1>UC 09/10: Parallelkonflikt bei Statuswechsel (Deaktivieren vs. Reaktivieren)</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-09-kundenverwaltung.md">FT (09): Kundenverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Administrator</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass bei parallelen Statusänderungen eines Kunden keine inkonsistenten Aktiv-Zustände entstehen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Ein Kunde existiert.</li><li>Zwei Administratoren sind gleichzeitig authentifiziert.</li><li>Beide Administratoren laden denselben Kunden mit identischer Versionskennung.</li><li>Der Kunde befindet sich in einem definierten Ausgangszustand (<code>is_active = true</code> oder <code>false</code>).</li></ul>
<p>---</p>
<h2>Ablauf</h2>
<h3>Ablauf – Beispiel: paralleles Deaktivieren</h3>
<p>1. Administrator A öffnet die Detailansicht eines aktiven Kunden.<br>2. Administrator B öffnet denselben Kunden.<br>3. Administrator A löst „Deaktivieren“ aus.<br>4. Das System prüft Berechtigung und Versionskennung.<br>5. Das System setzt <code>is_active = false</code>, persistiert und erhöht die Versionskennung.<br>6. Administrator B löst ebenfalls „Deaktivieren“ aus.<br>7. Das System prüft die Versionskennung.<br>8. Das System erkennt die veraltete Version.<br>9. Das System antwortet mit 409 (Konflikt).</p>
<p>---</p>
<h3>Ablauf – Beispiel: Deaktivieren vs. Reaktivieren</h3>
<p>1. Administrator A öffnet einen aktiven Kunden.<br>2. Administrator B öffnet denselben Kunden.<br>3. Administrator A deaktiviert den Kunden.<br>4. Das System persistiert <code>is_active = false</code> und erhöht die Versionskennung.<br>5. Administrator B versucht, den Kunden zu reaktivieren (auf Basis veralteter Version).<br>6. Das System prüft die Versionskennung.<br>7. Das System erkennt den Konflikt.<br>8. Das System blockiert mit 409.</p>
<p>---</p>
<h2>Alternativen</h2>
<ul><li>Einer der Administratoren lädt vor dem Statuswechsel neu → kein Konflikt.</li><li>Ein Statuswechsel wird vor dem parallelen Zugriff vollständig abgeschlossen → der zweite Vorgang wird mit aktuellem Status geprüft und ggf. als „keine Zustandsänderung“ behandelt.</li><li>Technischer Fehler → System antwortet mit 500.</li></ul>
<p>---</p>
<h2>Ergebnis</h2>
<ul><li>Der Aktiv-Status eines Kunden ist jederzeit eindeutig und konsistent.</li><li>Es existiert kein Zustand, in dem zwei widersprüchliche Statusänderungen gleichzeitig persistiert werden.</li><li>Optimistic Locking gilt auch für reine Statusoperationen.</li></ul>