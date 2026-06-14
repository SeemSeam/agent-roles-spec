# Agent Roles

> Agent Roles هي مواصفة host-neutral لتغليف AI agents المتخصصة على شكل Roles قابلة للنقل وقابلة للـ mount.

يجمع Role كل ما يحتاجه agent متخصص — skills وmemory واعتماديات الأدوات وplugin content وhost adapter metadata — في وحدة portable واحدة. يمكن mount هذه الوحدة داخل agent في مشروع هدف، ثم unmount بشكل نظيف عندما لا تعود مطلوبة، من دون التأثير في البيئة الرئيسية أو إعدادات المستخدم العامة أو agents أخرى.

تهدف هذه المواصفة إلى دفع تعاون multi-agent نحو بنية أوضح:

| الجمهور | التحول |
|---------|--------|
| **المطورون** | من بناء skills منفصلة إلى شحن Roles كاملة |
| **المستخدمون** | من إدارة skills/plugins المتناثرة إلى إدارة roles |

> تتبع هذه الترجمة `README.md`. إذا وُجد اختلاف، فالنسخة الإنجليزية هي المرجع المعتمد.

---

## لماذا Agent Roles

عادة ما يكون محتوى agent متخصص موزعا عبر عدة مجلدات وملفات إعداد وruntimes:

- System prompts
- Skills يتم جلبها عند الحاجة
- Project memory وlong-term memory
- اعتماديات الأدوات
- إعدادات adapter خاصة بكل host environment

تتطلب الهجرة نسخا وتثبيتا وتصحيحا يدويا. وعند unmount، يصعب معرفة أي الملفات تخص ذلك agent وأيها يخص البيئة الرئيسية أو agents أخرى.

ينظم Agent Roles كل ذلك في صيغة Role قياسية، بحيث يمكن تعريف agent متخصص وتوزيعه وmount وunmount له كوحدة مستقلة واحدة.

---

## المفاهيم الأساسية

### Role

Role هو الكائن الأساسي في Agent Roles — تعريف كامل لـ agent متخصص. ليس مجرد prompt وليس مجرد مجموعة skills؛ بل هو وحدة تغليف تحمل قدراتها وسياقها ومعلومات adapter الخاصة بها.

### Role Definition

Role Definition هو ملف manifest الخاص بـ Role. يصف مسؤوليات Role، والـ skills المطلوبة، واعتماديات الأدوات، وplugin content، وإعدادات Host Adapter، وقواعد mount وunmount.

### Host Adapter

يصف Host Adapter كيف يدخل Role إلى host environment محددة. يمكن قراءة Role نفسه وmount له بواسطة عدة hosts. يلتقط Host Adapter الفروق في بنية المجلدات، وصيغة الإعدادات، ونقاط دخول الأدوات، وطريقة إسقاط plugins لكل host.

### Mount / Unmount

| العملية | الوصف |
|---------|-------|
| **Mount** | إرفاق Role بمشروع هدف عن طريق تحميل محتوياته ديناميكيا عبر index، وإنشاء وصلات بين Role والمشروع الهدف وhost environment |
| **Unmount** | فصل Role عن المشروع الهدف؛ يتم الاحتفاظ بـ session files عند الحاجة، وتتم إزالة كل المحتويات الأخرى فورا، من دون التأثير في البيئة الرئيسية أو إعدادات المستخدم العامة أو agents أخرى |

---

## ما الذي يمكن أن يحمله Role

| المحتوى | الوصف |
|---------|-------|
| `role instructions` | مسؤوليات role وحدود السلوك وأسلوب العمل |
| `skills` | وحدات capability التي يستخدمها role |
| `memory` | Memory أو project context يحمله role |
| `tools` | أوامر أو scripts أو أدوات خارجية يعتمد عليها role |
| `plugins` | Plugin content يقوم role بإسقاطه داخل host environment |
| `host adapters` | Adapter metadata لبيئات host مختلفة |
| `lifecycle rules` | قواعد التعامل مع mount وupdate وunmount |

---

## أهداف التصميم

- يمكن تعريف specialist agent roles بوضوح وتوزيعها بشكل مستقل
- يمكن نقل Roles بين المشاريع وmount لها عند الطلب وunmount لها بشكل نظيف
- حدود محتوى Role صريحة ولا تتداخل مع البيئة الرئيسية أو agents أخرى
- توفير مواصفة موحدة لـ CLI وrole manager وmount runtime

---

## Roles المنشورة

هذه هي Roles المنشورة حالياً في catalog. يمكن تثبيت كل Role عبر
`agent-roles`، ويمكن أن يوفّر adapters خاصة بالـ host.

<details>
<summary><strong>agentroles.archi</strong> - Architecture Reviewer</summary>

- **الإصدار**: `0.2.3`
- **المستوى**: `stable`
- **الغرض**: يراجع انحراف البنية، والحدود، والاقتران، وقابلية الصيانة، والمخاطر الهيكلية.
- **مناسب لـ**: مراجعات البنية، فحص حدود الاعتماديات، تحليل الاقتران، وتسلسل الخطوات العملية التالية.
- **المحتويات**: تعليمات Role، skills لمراجعة البنية، prompt قابل لإعادة الاستخدام، توثيق الأدوات، plugin content، وhost adapters.
- **Adapters**: CCB, Claude Code, Codex, HIVE.
- **التثبيت**: `agent-roles install archi`
- **التحديث**: `agent-roles update archi`
- **المصدر**: [`roles/archi`](../../roles/archi/)

</details>

<details>
<summary><strong>agentroles.mother</strong> - Role Mother</summary>

- **الإصدار**: `0.2.2`
- **المستوى**: `preview`
- **الغرض**: ينشئ ويبحث ويصمم blueprints ويستوعب ويدقق Agent Roles المتوافقة مع spec باستخدام gates مبنية على evidence.
- **مناسب لـ**: صياغة Roles جديدة، تدقيق Role source، research briefs، candidate scorecards، blueprint gates، وفحص catalog readiness، وبحث أدوات وتقنيات skill construction.
- **بحث المهارات**: يستخدم بحثاً عاماً ومحدوداً على الويب لأدوات وتقنيات skill construction الحالية، مع تفضيل الوثائق الرسمية والأمثلة التي تتم صيانتها.
- **المحتويات**: Role authoring memory، skills لإنشاء/تدقيق Role وsource-ingest وresearch وcandidate-score وblueprint، prompts قابلة لإعادة الاستخدام، skill construction research reference، artifact templates، preview schemas، local inventory script، validation notes، وhost adapter display metadata.
- **Adapters**: CCB, Claude Code, Codex, HIVE.
- **التثبيت**: `agent-roles install mother`
- **التحديث**: `agent-roles update mother`
- **المصدر**: [`roles/mother`](../../roles/mother/)

</details>

---

## الحالة الحالية

> المواصفة في مرحلة تصميم مبكرة.

التركيز الحالي:

- حدود مفهوم Role وبنية Role Definition
- كيفية تنظيم skills وmemory وtools وplugins
- كيفية التعبير عن Host Adapters
- القيود السلوكية الدنيا لـ mount / unmount

القادم: schema وexamples ونموذج CLI أولي وrole manager وmount runtime.

---

## خارطة طريق Adapter

سيبدأ تطوير Host Adapter بهذه المشاريع multi-agent:

- [CCB (claude_codex_bridge)](https://github.com/SeemSeam/claude_codex_bridge)
- [HIVE](https://github.com/tt-a1i/hive)

كما توجد خطط لـ adapters لكل من Claude Code وCodex وhosts رئيسية أخرى. سنعمل بفاعلية نحو دعم native لصيغة Role عبر المنصات.
