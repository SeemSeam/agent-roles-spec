# Agent Roles

> Agent Roles est une spécification host-neutre pour empaqueter des agents IA spécialisés sous forme de Roles portables et montables.

Un Role regroupe tout ce dont un agent spécialisé a besoin — skills, memory, dépendances d'outils, plugin content et host adapter metadata — en une seule unité portable. Il peut être monté dans un agent d'un projet cible et démonté proprement après utilisation, sans affecter l'environnement principal, la configuration utilisateur globale ou les autres agents.

Cette spécification vise à faire évoluer la collaboration multi-agent vers une structure plus claire :

| Public | Évolution |
|--------|-----------|
| **Développeurs** | Du développement de skills isolés au développement de Roles complets |
| **Utilisateurs** | De la gestion dispersée des skills/plugins à la gestion unifiée des roles |

> Cette traduction suit `README.md`. En cas de divergence, la version anglaise fait foi.

---

## Pourquoi Agent Roles

Le contenu d'un agent spécialisé est généralement dispersé dans plusieurs répertoires, fichiers de configuration et runtimes :

- Prompts système
- Skills récupérés à la demande
- Memory de projet et mémoire à long terme
- Dépendances d'outils
- Configurations d'adaptateurs pour différents environnements host

La migration nécessite une copie, une installation et un débogage manuels. Lors du démontage, il est difficile de distinguer les contenus appartenant à l'agent de ceux appartenant à l'environnement principal ou aux autres agents.

Agent Roles organise tout cela dans un format Role standardisé, permettant aux agents spécialisés d'être définis, distribués, montés et démontés comme des unités indépendantes.

---

## Concepts fondamentaux

### Role

Un Role est l'objet central d'Agent Roles — un agent spécialisé complet. Ce n'est ni un simple prompt ni une collection de skills, mais une unité d'encapsulation qui porte ses propres capacités, contexte et informations d'adaptation.

### Role Definition

Une Role Definition est le fichier manifeste d'un Role. Elle décrit les responsabilités du Role, les skills requis, les dépendances d'outils, le plugin content, la configuration des adaptateurs host, ainsi que les règles de montage et démontage.

### Host Adapter

Un Host Adapter décrit comment un Role entre dans un environnement host spécifique. Le même Role peut être lu et monté par plusieurs hosts. Le Host Adapter capture les différences de structure de répertoires, de format de configuration, de points d'entrée des outils et de projection des plugins.

### Mount / Unmount

| Opération | Description |
|-----------|-------------|
| **Mount** | Monter un Role dans le projet cible en chargeant dynamiquement les contenus via un index, établissant les connexions entre le Role, le projet cible et l'environnement host |
| **Unmount** | Démonter un Role du projet cible ; les fichiers de session sont conservés si nécessaire, les autres contenus sont effacés immédiatement, sans affecter l'environnement principal, la configuration globale ou les autres agents |

---

## Ce qu'un Role peut contenir

| Contenu | Description |
|---------|-------------|
| `role instructions` | Responsabilités du rôle, limites comportementales et style de travail |
| `skills` | Modules de capacités utilisés par le role |
| `memory` | Memory ou contexte de projet du role |
| `tools` | Commandes, scripts ou outils externes dont dépend le role |
| `plugins` | Contenu plugin que le role projette dans l'environnement host |
| `host adapters` | Métadonnées d'adaptateur pour différents environnements host |
| `lifecycle rules` | Règles de traitement pour mount, mise à jour et unmount |

---

## Objectifs de conception

- Les roles d'agents spécialisés peuvent être clairement définis et distribués indépendamment
- Les Roles peuvent migrer entre projets, être montés à la demande et démontés proprement
- Les frontières de contenu des Roles sont explicites et n'interfèrent pas avec l'environnement principal ou les autres agents
- Fournir une spécification unifiée pour CLI, role manager et mount runtime

---

## Roles publiés

Voici les Roles actuellement publiés dans le catalog. Chaque entrée peut être
installée avec `agent-roles` et peut exposer des adaptateurs propres aux hosts.

<details>
<summary><strong>agentroles.archi</strong> - Architecture Reviewer</summary>

- **Version** : `0.2.1`
- **Objectif** : Examine la dérive d'architecture, les frontières, le couplage, la maintenabilité et les risques structurels.
- **Idéal pour** : revues d'architecture, contrôles de frontières de dépendances, analyse du couplage et ordonnancement pratique des prochaines étapes.
- **Contenu** : instructions de Role, skills de revue d'architecture, prompt réutilisable, documentation d'outils, contenu de plugins et adaptateurs de host.
- **Adaptateurs** : CCB, Claude Code, Codex, HIVE.
- **Installer** : `agent-roles install archi`
- **Mettre à jour** : `agent-roles update archi`
- **Source** : [`roles/archi`](../../roles/archi/)

</details>

---

## État actuel

> La spécification est encore en phase de conception initiale.

Axes de travail actuels :

- Limites conceptuelles des Roles et structure de Role Definition
- Organisation des skills, memory, tools et plugins
- Expression des Host Adapters
- Contraintes comportementales minimales pour mount / unmount

À venir : schema, exemples, prototype CLI, role manager et mount runtime.

---

## Feuille de route des adaptateurs

Le développement des Host Adapters commencera en priorité avec ces projets multi-agents :

- [CCB (claude_codex_bridge)](https://github.com/SeemSeam/claude_codex_bridge)
- [HIVE](https://github.com/tt-a1i/hive)

Des adaptateurs pour Claude Code, Codex et d'autres hosts majeurs sont également prévus. Nous travaillerons activement à promouvoir le support natif du format Role sur toutes les plateformes.
