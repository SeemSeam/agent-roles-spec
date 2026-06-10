# Agent Roles

> Agent Roles là một đặc tả trung lập với host để đóng gói các AI agent chuyên biệt thành những Role có thể di chuyển và có thể mount.

Một Role gom mọi thứ mà một agent chuyên biệt cần — skills, memory, phụ thuộc công cụ, plugin content và host adapter metadata — vào một đơn vị portable duy nhất. Role có thể được mount vào agent của một dự án đích, rồi được unmount sạch sẽ khi không còn cần nữa, mà không ảnh hưởng đến môi trường chính, cấu hình toàn cục của người dùng hoặc các agent khác.

Đặc tả này được thiết kế để đưa cộng tác multi-agent đến một cấu trúc rõ ràng hơn:

| Đối tượng | Chuyển dịch |
|-----------|-------------|
| **Nhà phát triển** | Từ xây dựng các skill rời rạc sang phát hành các Role hoàn chỉnh |
| **Người dùng** | Từ quản lý skills/plugins phân tán sang quản lý roles |

> Bản dịch này theo `README.md`. Nếu có khác biệt, phiên bản tiếng Anh là nguồn có thẩm quyền.

---

## Vì sao cần Agent Roles

Nội dung của một agent chuyên biệt thường nằm rải rác trong nhiều thư mục, tệp cấu hình và runtime:

- System prompts
- Skills được lấy theo nhu cầu
- Project memory và long-term memory
- Phụ thuộc công cụ
- Cấu hình adapter riêng cho từng host environment

Việc di chuyển thường đòi hỏi sao chép, cài đặt và gỡ lỗi thủ công. Khi unmount, cũng khó xác định nội dung nào thuộc về agent, nội dung nào thuộc môi trường chính hoặc các agent khác.

Agent Roles tổ chức tất cả những phần này thành một định dạng Role chuẩn hóa, để agent chuyên biệt có thể được định nghĩa, phân phối, mount và unmount như một đơn vị độc lập.

---

## Khái niệm cốt lõi

### Role

Role là đối tượng cốt lõi trong Agent Roles — một định nghĩa agent chuyên biệt hoàn chỉnh. Nó không chỉ là prompt và cũng không chỉ là một tập hợp skill; nó là một đơn vị đóng gói mang theo năng lực, ngữ cảnh và thông tin adapter của chính nó.

### Role Definition

Role Definition là tệp manifest của một Role. Nó mô tả trách nhiệm của Role, các skills cần có, phụ thuộc công cụ, plugin content, cấu hình Host Adapter và các quy tắc khi mount và unmount.

### Host Adapter

Host Adapter mô tả cách một Role đi vào một host environment cụ thể. Cùng một Role có thể được nhiều host đọc và mount. Host Adapter ghi nhận khác biệt về cấu trúc thư mục, định dạng cấu hình, điểm vào của công cụ và cách project plugin cho từng host.

### Mount / Unmount

| Thao tác | Mô tả |
|----------|------|
| **Mount** | Gắn Role vào dự án đích bằng cách tải động nội dung qua index, thiết lập kết nối giữa Role, dự án đích và host environment |
| **Unmount** | Tách Role khỏi dự án đích; session files được giữ lại khi cần, mọi nội dung khác được xóa ngay, không ảnh hưởng đến môi trường chính, cấu hình toàn cục của người dùng hoặc các agent khác |

---

## Role có thể mang theo gì

| Nội dung | Mô tả |
|----------|------|
| `role instructions` | Trách nhiệm của role, ranh giới hành vi và phong cách làm việc |
| `skills` | Các module năng lực mà role sử dụng |
| `memory` | Memory hoặc project context do role mang theo |
| `tools` | Lệnh, script hoặc công cụ bên ngoài mà role phụ thuộc |
| `plugins` | Plugin content mà role project vào host environment |
| `host adapters` | Adapter metadata cho các host environment khác nhau |
| `lifecycle rules` | Quy tắc xử lý mount, update và unmount |

---

## Mục tiêu thiết kế

- Các specialist agent roles có thể được định nghĩa rõ ràng và phân phối độc lập
- Roles có thể di chuyển giữa các dự án, được mount theo nhu cầu và được unmount sạch sẽ
- Ranh giới nội dung của Role là rõ ràng và không can thiệp vào môi trường chính hoặc các agent khác
- Cung cấp một đặc tả thống nhất cho CLI, role manager và mount runtime

---

## Roles đã phát hành

Đây là các Roles hiện đã được phát hành trong catalog. Mỗi mục có thể được cài
đặt bằng `agent-roles` và có thể cung cấp adapters riêng cho host.

<details>
<summary><strong>agentroles.archi</strong> - Architecture Reviewer</summary>

- **Phiên bản**: `0.2.3`
- **Cấp độ**: `stable`
- **Mục đích**: Review architecture drift, ranh giới, coupling, maintainability và rủi ro cấu trúc.
- **Phù hợp cho**: review kiến trúc, kiểm tra ranh giới phụ thuộc, phân tích coupling và sắp xếp các bước tiếp theo thực tế.
- **Nội dung**: Role instructions, architecture review skills, prompt tái sử dụng, tài liệu tool, plugin content và host adapters.
- **Adapters**: CCB, Claude Code, Codex, HIVE.
- **Cài đặt**: `agent-roles install archi`
- **Cập nhật**: `agent-roles update archi`
- **Nguồn**: [`roles/archi`](../../roles/archi/)

</details>

<details>
<summary><strong>agentroles.mother</strong> - Role Mother</summary>

- **Phiên bản**: `0.2.0`
- **Cấp độ**: `preview`
- **Mục đích**: Tạo và audit Agent Roles đúng spec, bao gồm nghiên cứu web-backed về xây dựng skill khi hữu ích.
- **Phù hợp cho**: phác thảo Roles mới, audit Role source, tinh chỉnh memory, skills và prompts, kiểm tra catalog readiness, và nghiên cứu tools/techniques xây dựng skill.
- **Nghiên cứu skill**: dùng nghiên cứu web công khai có giới hạn cho tools và techniques xây dựng skill hiện tại, ưu tiên docs chính thức và ví dụ được duy trì.
- **Nội dung**: Role authoring memory, skill tạo/audit Role, creation/audit prompts tái sử dụng, skill construction research reference, validation notes và host adapter display metadata.
- **Adapters**: CCB, Claude Code, Codex, HIVE.
- **Cài đặt**: `agent-roles install mother`
- **Cập nhật**: `agent-roles update mother`
- **Nguồn**: [`roles/mother`](../../roles/mother/)

</details>

---

## Trạng thái hiện tại

> Đặc tả đang ở giai đoạn thiết kế ban đầu.

Trọng tâm hiện tại:

- Ranh giới khái niệm Role và cấu trúc Role Definition
- Cách tổ chức skills, memory, tools và plugins
- Cách biểu diễn Host Adapters
- Ràng buộc hành vi tối thiểu cho mount / unmount

Sắp tới: schema, examples, CLI prototype, role manager và mount runtime.

---

## Lộ trình adapter

Việc phát triển Host Adapter sẽ bắt đầu với các dự án multi-agent sau:

- [CCB (claude_codex_bridge)](https://github.com/SeemSeam/claude_codex_bridge)
- [HIVE](https://github.com/tt-a1i/hive)

Adapters cho Claude Code, Codex và các host lớn khác cũng đã được lên kế hoạch. Chúng tôi sẽ tích cực thúc đẩy hỗ trợ native cho định dạng Role trên nhiều nền tảng.
