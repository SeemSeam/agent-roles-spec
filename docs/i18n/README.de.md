# Agent Roles

> Agent Roles ist eine host-neutrale Spezifikation zur Paketierung von spezialisierten KI-Agenten als portable, mountbare Roles.

Eine Role bündelt alles, was ein spezialisierter Agent benötigt — skills, memory, Tool-Abhängigkeiten, plugin content und host adapter metadata — in einer einzigen portablen Einheit. Sie kann in einen Agenten eines Zielprojekts eingehängt und nach Gebrauch sauber ausgehängt werden, ohne die Hauptumgebung, globale Benutzerkonfigurationen oder andere Agenten zu beeinflussen.

Die Spezifikation zielt darauf ab, die Multi-Agent-Zusammenarbeit zu klarer strukturieren:

| Zielgruppe | Wandel |
|------------|--------|
| **Entwickler** | Von der Entwicklung einzelner Skills zur Entwicklung vollständiger Roles |
| **Nutzer** | Von verteilter skills/plugins-Verwaltung zur einheitlichen Roles-Verwaltung |

> Diese Übersetzung folgt `README.md`. Bei Abweichungen gilt die englische Version.

---

## Warum Agent Roles

Die Inhalte eines spezialisierten Agenten sind typischerweise auf mehrere Verzeichnisse, Konfigurationsdateien und Runtimes verteilt:

- Systemprompts
- Bedarfsweise abgerufene Skills
- Projekt-Memory und Langzeit-Memory
- Tool-Abhängigkeiten
- Adapterkonfigurationen für verschiedene Host-Umgebungen

Migration erfordert manuelles Kopieren, Installieren und Debuggen. Beim Unmounten ist es schwer zu erkennen, welche Inhalte zum Agenten gehören und welche zur Hauptumgebung oder anderen Agenten.

Agent Roles organisiert all dies in einem standardisierten Role-Format, sodass spezialisierte Agenten als unabhängige Einheiten definiert, verteilt, gemountet und ausgehängt werden können.

---

## Kernkonzepte

### Role

Eine Role ist das zentrale Objekt in Agent Roles — ein vollständiger spezialisierter Agent. Sie ist weder nur ein Prompt noch nur eine Skill-Sammlung, sondern eine Kapselungseinheit mit eigenen Fähigkeiten, Kontext und Adapterinformationen.

### Role Definition

Eine Role Definition ist die Manifestdatei einer Role. Sie beschreibt die Verantwortlichkeiten der Role, benötigte Skills, Tool-Abhängigkeiten, plugin content, Host-Adapterkonfiguration sowie die Regeln für Mount und Unmount.

### Host Adapter

Ein Host Adapter beschreibt, wie eine Role in eine bestimmte Host-Umgebung eingebunden wird. Dieselbe Role kann von mehreren Hosts gelesen und gemountet werden. Der Host Adapter erfasst Unterschiede in Verzeichnisstruktur, Konfigurationsformat, Tool-Einstiegspunkten und Plugin-Projektion.

### Mount / Unmount

| Operation | Beschreibung |
|-----------|-------------|
| **Mount** | Eine Role in das Zielprojekt einbinden, Inhalte über einen Index dynamisch laden und Verbindungen zwischen Role, Zielprojekt und Host-Umgebung herstellen |
| **Unmount** | Eine Role aus dem Zielprojekt aushängen; Session-Dateien werden bei Bedarf behalten, alle anderen Inhalte werden sofort gelöscht, ohne die Hauptumgebung, globale Konfigurationen oder andere Agenten zu beeinflussen |

---

## Was eine Role tragen kann

| Inhalt | Beschreibung |
|--------|-------------|
| `role instructions` | Rollenverantwortlichkeiten, Verhaltensgrenzen und Arbeitsstil |
| `skills` | Fähigkeitsmodule, die die Role verwendet |
| `memory` | Memory oder Projektkontext der Role |
| `tools` | Befehle, Skripte oder externe Tools, von denen die Role abhängt |
| `plugins` | Plugin-Inhalte, die die Role in die Host-Umgebung projiziert |
| `host adapters` | Adapter-Metadaten für verschiedene Host-Umgebungen |
| `lifecycle rules` | Regeln für Mount, Update und Unmount |

---

## Designziele

- Spezialisierte Agenten-Roles können klar definiert und unabhängig verteilt werden
- Roles können zwischen Projekten migrieren, bedarfsweise gemountet und sauber ausgehängt werden
- Role-Inhaltsgrenzen sind explizit und stören weder die Hauptumgebung noch andere Agenten
- Einheitliche Spezifikation für CLI, Role Manager und Mount Runtime bereitstellen

---

## Veröffentlichte Roles

Dies sind die derzeit veröffentlichten Catalog Roles. Jeder Eintrag kann über
`agent-roles` installiert werden und host-spezifische Adapter bereitstellen.

<details>
<summary><strong>agentroles.archi</strong> - Architecture Reviewer</summary>

- **Version**: `0.2.2`
- **Zweck**: Prüft Architekturdrift, Grenzen, Kopplung, Wartbarkeit und strukturelle Risiken.
- **Geeignet für**: Architekturreviews, Prüfungen von Abhängigkeitsgrenzen, Kopplungsanalyse und praktische nächste Schritte.
- **Inhalte**: Role-Anweisungen, Architekturreview-Skills, wiederverwendbarer Prompt, Tool-Dokumentation, Plugin-Inhalte und Host-Adapter.
- **Adapter**: CCB, Claude Code, Codex, HIVE.
- **Installation**: `agent-roles install archi`
- **Aktualisierung**: `agent-roles update archi`
- **Quelle**: [`roles/archi`](../../roles/archi/)

</details>

---

## Aktueller Stand

> Die Spezifikation befindet sich noch in einem frühen Designstadium.

Aktueller Schwerpunkt:

- Role-Konzeptgrenzen und Role Definition-Struktur
- Organisation von skills, memory, tools und plugins
- Ausdrucksweise von Host Adapters
- Minimale Verhaltenseinschränkungen für mount / unmount

Geplant: schema, examples, CLI-Prototyp, role manager und mount runtime.

---

## Adapter-Roadmap

Die Entwicklung von Host Adaptern beginnt vorrangig mit diesen Multi-Agent-Projekten:

- [CCB (claude_codex_bridge)](https://github.com/SeemSeam/claude_codex_bridge)
- [HIVE](https://github.com/tt-a1i/hive)

Adapter für Claude Code, Codex und andere wichtige Hosts sind ebenfalls geplant. Wir werden uns aktiv dafür einsetzen, dass Plattformen das Role-Format nativ unterstützen.
