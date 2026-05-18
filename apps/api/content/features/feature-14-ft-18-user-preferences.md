<h1>FT (18): User Preferences</h1>
<h2>Metadaten</h2>
<ul><li>Status: Abgeschlossen</li><li>Typ: Feature</li></ul>
<h2>Ziel / Zweck</h2>
<h2>Fachliche Beschreibung</h2>
<p>Die Anwendung bietet eine zentrale Oberfläche, in der berechtigte Nutzer Einstellungen anzeigen und ändern können. Jede Einstellung ist durch einen eindeutigen Schlüssel identifiziert und besitzt einen fest definierten Datentyp sowie einen Standardwert. Der wirksame Wert ergibt sich aus einem gespeicherten Wert; sofern kein Wert gespeichert ist, gilt der Standardwert.</p>
<p>Die Eingabe und Darstellung in der UI erfolgt generisch anhand des Einstellungstyps. Bool-Einstellungen werden als Schalter bedient, Zahlen als numerische Eingabe und Farben über eine Farbauswahl. Das System ist so gestaltet, dass weitere Typen und neue Einstellungen ergänzt werden können, ohne dass dafür für jede Einstellung eine eigene Persistenzlogik oder ein eigener Screen erforderlich wird.</p>
<h2>Regeln &amp; Randbedingungen</h2>
<p>Eine Einstellung darf nur gespeichert werden, wenn der Wert zum definierten Typ passt und die fachlich vorgesehenen Constraints erfüllt. Ungültige Eingaben werden abgelehnt und mit einer verständlichen Fehlermeldung zurückgemeldet.</p>
<p>Jede Einstellung besitzt einen Standardwert. Wenn kein Wert gespeichert ist, wird ausschließlich der Standardwert verwendet. Der aktuell wirksame Wert muss in der UI transparent angezeigt werden.</p>
<p>Berechtigungen müssen eindeutig greifen. Normale Nutzer dürfen ausschließlich ihre benutzerspezifischen Einstellungen bearbeiten. Administratoren dürfen zusätzlich Einstellungen bearbeiten, die in einem übergeordneten Kontext gelten, sofern solche Kontexte im Produkt genutzt werden.</p>
<p>Zu Beginn müssen mindestens die Typen Zahl, Bool (Aktivität) und Farbe unterstützt werden. Weitere Typen wie Text, Auswahlwerte (Enum) oder Wertebereiche (Min/Max/Step) sollen später ohne Bruch ergänzt werden können.</p>