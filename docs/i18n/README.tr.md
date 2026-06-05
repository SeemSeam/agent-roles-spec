# Agent Roles

> Agent Roles, uzman AI agent'ları portable ve mount edilebilir Role'ler olarak paketlemek için host-neutral bir spesifikasyondur.

Bir Role, uzman bir agent'ın ihtiyaç duyduğu her şeyi — skills, memory, tool bağımlılıkları, plugin content ve host adapter metadata — tek bir portable birimde toplar. Hedef projenin agent'ına mount edilebilir ve artık gerekmediğinde ana ortamı, kullanıcının global config'ini veya diğer agent'ları etkilemeden temiz biçimde unmount edilebilir.

Bu spesifikasyon, multi-agent iş birliğini daha net bir yapıya taşımak için tasarlanmıştır:

| Hedef kitle | Geçiş |
|-------------|-------|
| **Geliştiriciler** | Ayrık skill geliştirmekten eksiksiz Role'ler yayınlamaya |
| **Kullanıcılar** | Dağınık skills/plugins yönetiminden roles yönetimine |

> Bu çeviri `README.md` dosyasını izler. Fark olması durumunda İngilizce sürüm yetkilidir.

---

## Neden Agent Roles

Uzman bir agent'ın içeriği genellikle birden fazla dizine, config dosyasına ve runtime'a dağılmıştır:

- System prompts
- İhtiyaç anında çekilen skills
- Project memory ve long-term memory
- Tool bağımlılıkları
- Host'a özgü adapter config'leri

Taşıma işlemi elle kopyalama, kurulum ve hata ayıklama gerektirir. Unmount sırasında hangi dosyaların agent'a, hangilerinin ana ortama veya diğer agent'lara ait olduğunu ayırt etmek zordur.

Agent Roles tüm bunları standartlaştırılmış bir Role formatında düzenler; böylece uzman agent'lar tekil bağımsız birimler olarak tanımlanabilir, dağıtılabilir, mount edilebilir ve unmount edilebilir.

---

## Temel Kavramlar

### Role

Role, Agent Roles içindeki temel nesnedir — eksiksiz bir uzman agent tanımıdır. Yalnızca bir prompt veya yalnızca bir skill koleksiyonu değildir; kendi yeteneklerini, bağlamını ve adapter bilgisini taşıyan bir kapsülleme birimidir.

### Role Definition

Role Definition, bir Role için manifest dosyasıdır. Role'ün sorumluluklarını, gereken skills'i, tool bağımlılıklarını, plugin content'i, Host Adapter config'ini ve mount/unmount kurallarını açıklar.

### Host Adapter

Host Adapter, bir Role'ün belirli bir host environment'a nasıl girdiğini açıklar. Aynı Role birden fazla host tarafından okunup mount edilebilir. Host Adapter, her host için dizin yapısı, config formatı, tool entry point'leri ve plugin projection farklarını yakalar.

### Mount / Unmount

| İşlem | Açıklama |
|-------|----------|
| **Mount** | Role'ü hedef projeye bağlar; içerikleri index üzerinden dinamik biçimde yükler ve Role, hedef proje ile host environment arasında bağlantılar kurar |
| **Unmount** | Role'ü hedef projeden ayırır; session files gerektiğinde korunur, diğer tüm içerikler hemen temizlenir ve ana ortam, kullanıcının global config'i veya diğer agent'lar etkilenmez |

---

## Bir Role Neleri Taşıyabilir

| İçerik | Açıklama |
|--------|----------|
| `role instructions` | Role sorumlulukları, davranış sınırları ve çalışma tarzı |
| `skills` | Role'ün kullandığı capability modules |
| `memory` | Role tarafından taşınan memory veya project context |
| `tools` | Role'ün bağımlı olduğu command, script veya external tools |
| `plugins` | Role'ün host environment'a project ettiği plugin content |
| `host adapters` | Farklı host environment'lar için adapter metadata |
| `lifecycle rules` | Mount, update ve unmount işlemlerini ele alan kurallar |

---

## Tasarım Hedefleri

- Specialist agent roles net biçimde tanımlanabilir ve bağımsız olarak dağıtılabilir
- Roles projeler arasında taşınabilir, ihtiyaç anında mount edilebilir ve temiz biçimde unmount edilebilir
- Role içerik sınırları açıktır ve ana ortama veya diğer agent'lara karışmaz
- CLI, role manager ve mount runtime için birleşik bir spesifikasyon sağlamak

---

## Yayınlanmış Roles

Bunlar catalog içinde şu anda yayınlanmış Roles kayıtlarıdır. Her kayıt
`agent-roles` ile kurulabilir ve host'a özel adapter'lar sağlayabilir.

<details>
<summary><strong>agentroles.archi</strong> - Architecture Reviewer</summary>

- **Sürüm**: `0.2.1`
- **Amaç**: Mimari drift, sınırlar, coupling, maintainability ve yapısal riski inceler.
- **En uygun kullanım**: mimari incelemeler, dependency boundary kontrolleri, coupling analizi ve pratik sonraki adım sıralaması.
- **İçerik**: Role talimatları, mimari inceleme skills, yeniden kullanılabilir prompt, tool dokümantasyonu, plugin content ve host adapters.
- **Adapters**: CCB, Claude Code, Codex, HIVE.
- **Kurulum**: `agent-roles install agentroles.archi`
- **Güncelleme**: `agent-roles update agentroles.archi`
- **Kaynak**: [`roles/archi`](../../roles/archi/)

</details>

---

## Mevcut Durum

> Spesifikasyon erken tasarım aşamasındadır.

Mevcut odak:

- Role kavram sınırları ve Role Definition yapısı
- Skills, memory, tools ve plugins'in nasıl düzenleneceği
- Host Adapters'ın nasıl ifade edileceği
- Mount / unmount için minimum davranış kısıtları

Sırada: schema, examples, CLI prototype, role manager ve mount runtime.

---

## Adapter Yol Haritası

Host Adapter geliştirmesi şu multi-agent projelerle başlayacak:

- [CCB (claude_codex_bridge)](https://github.com/SeemSeam/claude_codex_bridge)
- [HIVE](https://github.com/tt-a1i/hive)

Claude Code, Codex ve diğer büyük host'lar için adapter'lar da planlanıyor. Platformlar genelinde Role formatı için native support'u aktif biçimde ilerleteceğiz.
