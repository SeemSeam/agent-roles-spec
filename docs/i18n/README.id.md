# Agent Roles

> Agent Roles adalah spesifikasi yang netral terhadap host untuk mengemas AI agent spesialis sebagai Role yang portable dan dapat di-mount.

Sebuah Role menggabungkan semua yang dibutuhkan agent spesialis — skills, memory, dependensi tool, plugin content, dan host adapter metadata — ke dalam satu unit portable. Role dapat di-mount ke agent pada proyek target, lalu di-unmount dengan bersih saat tidak lagi dibutuhkan, tanpa memengaruhi lingkungan utama, konfigurasi global pengguna, atau agent lain.

Spesifikasi ini dirancang untuk mendorong kolaborasi multi-agent menuju struktur yang lebih jelas:

| Audiens | Pergeseran |
|---------|------------|
| **Developer** | Dari membangun skill terpisah menjadi mengirimkan Role lengkap |
| **Pengguna** | Dari mengelola skills/plugins yang tersebar menjadi mengelola roles |

> Terjemahan ini mengikuti `README.md`. Jika ada perbedaan, versi bahasa Inggris menjadi acuan.

---

## Mengapa Agent Roles

Konten agent spesialis biasanya tersebar di beberapa direktori, file konfigurasi, dan runtime:

- System prompts
- Skills yang diambil sesuai kebutuhan
- Project memory dan long-term memory
- Dependensi tool
- Konfigurasi adapter khusus host

Migrasi berarti menyalin, memasang, dan melakukan debugging secara manual. Saat unmount, sulit menebak file mana yang milik agent dan mana yang milik lingkungan utama atau agent lain.

Agent Roles mengatur semua ini ke dalam format Role yang terstandardisasi, sehingga agent spesialis dapat didefinisikan, didistribusikan, di-mount, dan di-unmount sebagai satu unit independen.

---

## Konsep Inti

### Role

Role adalah objek inti dalam Agent Roles — definisi agent spesialis yang lengkap. Role bukan sekadar prompt dan bukan sekadar kumpulan skill; Role adalah unit enkapsulasi yang membawa capability, context, dan informasi adapter miliknya sendiri.

### Role Definition

Role Definition adalah file manifest untuk sebuah Role. File ini menjelaskan tanggung jawab Role, skills yang dibutuhkan, dependensi tool, plugin content, konfigurasi Host Adapter, serta aturan untuk mount dan unmount.

### Host Adapter

Host Adapter menjelaskan bagaimana sebuah Role masuk ke lingkungan host tertentu. Role yang sama dapat dibaca dan di-mount oleh beberapa host. Host Adapter menangkap perbedaan layout direktori, format konfigurasi, entry point tool, dan proyeksi plugin untuk setiap host.

### Mount / Unmount

| Operasi | Deskripsi |
|---------|-----------|
| **Mount** | Melampirkan Role ke proyek target dengan memuat kontennya secara dinamis melalui index, membangun koneksi antara Role, proyek target, dan lingkungan host |
| **Unmount** | Melepas Role dari proyek target; session files dipertahankan sesuai kebutuhan, semua konten lain segera dibersihkan, tanpa memengaruhi lingkungan utama, konfigurasi global pengguna, atau agent lain |

---

## Apa yang Bisa Dibawa Role

| Konten | Deskripsi |
|--------|-----------|
| `role instructions` | Tanggung jawab role, batas perilaku, dan gaya kerja |
| `skills` | Modul capability yang digunakan role |
| `memory` | Memory atau project context yang dibawa role |
| `tools` | Command, script, atau tool eksternal yang menjadi dependensi role |
| `plugins` | Plugin content yang diproyeksikan role ke lingkungan host |
| `host adapters` | Adapter metadata untuk berbagai lingkungan host |
| `lifecycle rules` | Aturan untuk menangani mount, update, dan unmount |

---

## Tujuan Desain

- Specialist agent roles dapat didefinisikan dengan jelas dan didistribusikan secara independen
- Roles dapat berpindah antar proyek, di-mount sesuai kebutuhan, dan di-unmount dengan bersih
- Batas konten Role eksplisit dan tidak mengganggu lingkungan utama atau agent lain
- Menyediakan spesifikasi terpadu untuk CLI, role manager, dan mount runtime

---

## Roles yang Dipublikasikan

Berikut Roles catalog yang saat ini sudah dipublikasikan. Setiap entri dapat
diinstal melalui `agent-roles` dan dapat menyediakan adapter khusus host.

<details>
<summary><strong>agentroles.archi</strong> - Architecture Reviewer</summary>

- **Versi**: `0.2.3`
- **Level**: `stable`
- **Tujuan**: Meninjau drift arsitektur, batas, coupling, maintainability, dan risiko struktural.
- **Cocok untuk**: review arsitektur, pemeriksaan batas dependensi, analisis coupling, dan urutan langkah berikutnya yang praktis.
- **Isi**: instruksi Role, skills review arsitektur, prompt reusable, dokumentasi tool, konten plugin, dan host adapters.
- **Adapters**: CCB, Claude Code, Codex, HIVE.
- **Instal**: `agent-roles install archi`
- **Update**: `agent-roles update archi`
- **Sumber**: [`roles/archi`](../../roles/archi/)

</details>

<details>
<summary><strong>agentroles.mother</strong> - Role Mother</summary>

- **Versi**: `0.2.2`
- **Level**: `preview`
- **Tujuan**: Membuat, meneliti, membuat blueprint, mengingest, dan mengaudit Agent Roles yang sesuai spec dengan gate berbasis evidence.
- **Cocok untuk**: menyusun Roles baru, mengaudit Role source, research briefs, candidate scorecards, blueprint gates, memeriksa catalog readiness, serta meneliti tools dan teknik konstruksi skill.
- **Riset skill**: menggunakan riset web publik terbatas untuk tools dan teknik konstruksi skill terbaru, dengan prioritas pada docs resmi dan contoh yang dipelihara.
- **Isi**: Role authoring memory, skill pembuatan/audit, source-ingest, research, candidate-score, dan blueprint, prompt reusable, referensi riset skill construction, artifact templates, preview schemas, skrip inventory lokal, catatan validasi, dan metadata tampilan host adapter.
- **Adapters**: CCB, Claude Code, Codex, HIVE.
- **Instal**: `agent-roles install mother`
- **Update**: `agent-roles update mother`
- **Sumber**: [`roles/mother`](../../roles/mother/)

</details>

---

## Status Saat Ini

> Spesifikasi masih berada pada tahap desain awal.

Fokus saat ini:

- Batas konsep Role dan struktur Role Definition
- Cara mengatur skills, memory, tools, dan plugins
- Cara mengekspresikan Host Adapters
- Batasan perilaku minimum untuk mount / unmount

Berikutnya: schema, examples, CLI prototype, role manager, dan mount runtime.

---

## Roadmap Adapter

Pengembangan Host Adapter akan dimulai dari proyek multi-agent berikut:

- [CCB (claude_codex_bridge)](https://github.com/SeemSeam/claude_codex_bridge)
- [HIVE](https://github.com/tt-a1i/hive)

Adapter untuk Claude Code, Codex, dan host besar lainnya juga direncanakan. Kami akan aktif mendorong dukungan native untuk format Role di berbagai platform.
