# Agent Roles

> Agent Roles es una especificación host-neutral para empaquetar agentes de IA especializados como Roles portables y montables.

Un Role agrupa todo lo que un agente especializado necesita — skills, memory, dependencias de herramientas, plugin content y host adapter metadata — en una única unidad portable. Puede montarse en un agente de un proyecto objetivo y desmontarse limpiamente cuando ya no se necesite, sin afectar el entorno principal, la configuración global del usuario ni otros agentes.

Esta especificación busca impulsar la colaboración multi-agente hacia una estructura más clara:

| Audiencia | Cambio |
|-----------|--------|
| **Desarrolladores** | Del desarrollo de skills aislados al desarrollo de Roles completos |
| **Usuarios** | De la gestión dispersa de skills/plugins a la gestión unificada de roles |

> Esta traducción sigue `README.md`. En caso de divergencia, prevalece la versión en inglés.

---

## Por qué Agent Roles

El contenido de un agente especializado suele estar disperso en múltiples directorios, archivos de configuración y runtimes:

- Prompts del sistema
- Skills recuperados bajo demanda
- Memory de proyecto y memoria a largo plazo
- Dependencias de herramientas
- Configuraciones de adaptadores para distintos entornos host

La migración requiere copiar, instalar y depurar manualmente. Al desmontar, es difícil distinguir qué contenido pertenece al agente y qué al entorno principal u otros agentes.

Agent Roles organiza todo esto en un formato Role estandarizado, para que los agentes especializados puedan definirse, distribuirse, montarse y desmontarse como unidades independientes.

---

## Conceptos fundamentales

### Role

Un Role es el objeto central de Agent Roles — un agente especializado completo. No es solo un prompt ni una colección de skills, sino una unidad de encapsulación que lleva sus propias capacidades, contexto e información de adaptación.

### Role Definition

Una Role Definition es el archivo de manifiesto de un Role. Describe las responsabilidades del Role, los skills requeridos, las dependencias de herramientas, el plugin content, la configuración de adaptadores host y las reglas de montaje y desmontaje.

### Host Adapter

Un Host Adapter describe cómo un Role entra en un entorno host específico. El mismo Role puede ser leído y montado por múltiples hosts. El Host Adapter captura las diferencias en estructura de directorios, formato de configuración, puntos de entrada de herramientas y proyección de plugins.

### Mount / Unmount

| Operación | Descripción |
|-----------|-------------|
| **Mount** | Montar un Role en el proyecto objetivo cargando dinámicamente los contenidos mediante un índice, estableciendo conexiones entre el Role, el proyecto objetivo y el entorno host |
| **Unmount** | Desmontar un Role del proyecto objetivo; los archivos de sesión se conservan si es necesario, el resto del contenido se borra inmediatamente, sin afectar el entorno principal, la configuración global ni otros agentes |

---

## Qué puede llevar un Role

| Contenido | Descripción |
|-----------|-------------|
| `role instructions` | Responsabilidades del rol, límites de comportamiento y estilo de trabajo |
| `skills` | Módulos de capacidad que usa el role |
| `memory` | Memory o contexto de proyecto del role |
| `tools` | Comandos, scripts o herramientas externas de las que depende el role |
| `plugins` | Contenido plugin que el role proyecta en el entorno host |
| `host adapters` | Metadatos de adaptador para diferentes entornos host |
| `lifecycle rules` | Reglas de procesamiento para mount, actualización y unmount |

---

## Objetivos de diseño

- Los roles de agentes especializados pueden definirse claramente y distribuirse de forma independiente
- Los Roles pueden migrar entre proyectos, montarse bajo demanda y desmontarse limpiamente
- Los límites de contenido de los Roles son explícitos y no interfieren con el entorno principal ni con otros agentes
- Proporcionar una especificación unificada para CLI, role manager y mount runtime

---

## Roles publicados

Estos son los Roles publicados actualmente en el catalog. Cada entrada se puede
instalar con `agent-roles` y puede exponer adaptadores específicos para hosts.

<details>
<summary><strong>agentroles.archi</strong> - Architecture Reviewer</summary>

- **Versión**: `0.2.1`
- **Propósito**: Revisa desviaciones de arquitectura, límites, acoplamiento, mantenibilidad y riesgo estructural.
- **Ideal para**: revisiones de arquitectura, comprobaciones de límites de dependencias, análisis de acoplamiento y secuenciación práctica de próximos pasos.
- **Contenido**: instrucciones de Role, skills de revisión arquitectónica, prompt reutilizable, documentación de herramientas, contenido de plugins y adaptadores de host.
- **Adaptadores**: CCB, Claude Code, Codex, HIVE.
- **Instalar**: `agent-roles install archi`
- **Actualizar**: `agent-roles update archi`
- **Fuente**: [`roles/archi`](../../roles/archi/)

</details>

---

## Estado actual

> La especificación aún está en fase de diseño inicial.

Enfoque actual:

- Límites conceptuales de los Roles y estructura de Role Definition
- Organización de skills, memory, tools y plugins
- Expresión de los Host Adapters
- Restricciones de comportamiento mínimas para mount / unmount

Próximamente: schema, ejemplos, prototipo CLI, role manager y mount runtime.

---

## Hoja de ruta de adaptadores

El desarrollo de Host Adapters comenzará prioritariamente con estos proyectos multi-agente:

- [CCB (claude_codex_bridge)](https://github.com/SeemSeam/claude_codex_bridge)
- [HIVE](https://github.com/tt-a1i/hive)

También están previstos adaptadores para Claude Code, Codex y otros hosts principales. Trabajaremos activamente para promover el soporte nativo del formato Role en todas las plataformas.
