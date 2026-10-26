"""Post-process en-th.json / en-vi.json: glossary + brand/placeholder fixes."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "lib/i18n/web-ui/cache"

BRANDS = [
    "Hydroodo",
    "Growlog",
    "Cornell",
    "Hoagland",
    "TUYA",
    "SmartLife",
    "Supabase",
    "OpenAI",
    "Next.js",
    "MetaMask",
    "Phantom",
    "Grover",
    "Whisper",
    "WebM",
    "Ethereum",
    "Solana",
    "Zigbee",
    "Google",
    "OG Lab",
    "Tuya",
    "OPENAI_API_KEY",
    "TUYA_ACCESS_ID",
    "TUYA_ACCESS_SECRET",
]

TH_GLOSS = {
    "A grow journal that remembers the": "สมุดบันทึกการปลูกที่จดจำ",
    "ADR-001 stage 2: Whisper → structure → you edit → save to journal (no auto-persisted facts).": "ADR-001 ขั้นที่ 2: Whisper → จัดโครงสร้าง → คุณแก้ไข → บันทึกลงสมุด (ไม่บันทึกข้อเท็จจริงอัตโนมัติ).",
    "AI focus": "โฟกัส AI",
    "Active cycle": "รอบการปลูกที่ใช้งาน",
    "Active tasks (run)": "งานที่เปิดอยู่ (รัน)",
    "Already have an account? Sign in": "มีบัญชีแล้ว? เข้าสู่ระบบ",
    "An active cycle and scope are required.": "ต้องมีรอบการปลูกและขอบเขตที่ใช้งานอยู่",
    "Ask about history →": "ถามเกี่ยวกับประวัติ →",
    "Audience": "กลุ่มผู้ชม",
    "Capture → timeline → derived summaries → AI with guardrails. One source of truth—the event database, not chat.": "บันทึก → ไทม์ไลน์ → สรุปที่คำนวณ → AI พร้อม guardrails แหล่งความจริงเดียวคือฐานข้อมูลเหตุการณ์ ไม่ใช่แชท",
    "Clone": "ก็อก",
    "Context for journal, sensors, and AI.": "บริบทสำหรับสมุดบันทึก เซนเซอร์ และ AI",
    "Create a grow cycle in settings or via support—a cycle and scope are required for the journal.": "สร้างรอบการปลูกในการตั้งค่าหรือติดต่อฝ่ายสนับสนุน — ต้องมีรอบและขอบเขตสำหรับสมุดบันทึก",
    "Cycle-aware AI": "AI ที่เข้าใจรอบการปลูก",
    "Event-centric grow journal + retrieval-first AI": "สมุดบันทึกการปลูกแบบเหตุการณ์เป็นศูนย์ + AI ดึงข้อมูลก่อนตอบ",
    "Everything a grower needs every day": "ทุกอย่างที่ชาวสวนต้องใช้ทุกวัน",
    "Grow cycle": "รอบการปลูก",
    "Grow zone": "โซนปลูก",
    "Growlog AI is a PWA for growers: daily voice notes, sensors, photos, and an AI advisor grounded in your farm data—not generic model knowledge.": "Growlog AI เป็น PWA สำหรับชาวสวน: บันทึกเสียงรายวัน เซนเซอร์ รูปภาพ และที่ปรึกษา AI จากข้อมูลฟาร์มของคุณ ไม่ใช่ความรู้ทั่วไปของโมเดล",
    "Grover captures the day by voice—Whisper transcribes, AI structures, you confirm before saving.": "Grover บันทึกวันด้วยเสียง — Whisper ถอดความ AI จัดโครงสร้าง คุณยืนยันก่อนบันทึก",
    "History is empty—make your first entry with “Log” or add a photo.": "ยังไม่มีประวัติ — เริ่มด้วยปุ่ม «Log» หรือเพิ่มรูปภาพ",
    "Home": "หน้าแรก",
    "Journal text": "ข้อความในสมุดบันทึก",
    "Log the first event with the “Log” button at the bottom, or use voice / photo.": "บันทึกเหตุการณ์แรกด้วยปุ่ม «Log» ด้านล่าง หรือใช้เสียง/รูปภาพ",
    "No account? Create one": "ยังไม่มีบัญชี? สร้างบัญชี",
    "Open log": "เปิดบันทึก",
    "Open procedures—the main grower workflow.": "เปิดขั้นตอน — workflow หลักของชาวสวน",
    "Ready to journal like a pro?": "พร้อมบันทึกแบบมืออาชีพแล้วหรือยัง?",
    "Save to journal": "บันทึกลงสมุด",
    "Sign in to journal": "เข้าสู่ระบบเพื่อใช้สมุดบันทึก",
    "Timeline": "ไทม์ไลน์",
    "Voice log": "บันทึกเสียง",
    "What happened → timeline": "สิ่งที่เกิดขึ้น → ไทม์ไลน์",
    "and": "และ",
    "due {date}": "ครบ {date}",
    "full cycle": "ทั้งรอบ",
    "no due date": "ไม่มีวันครบกำหนด",
    "not specified": "ไม่ได้ระบุ",
    "window {start} — {end}": "ช่วง {start} — {end}",
    "{days} days in stage": "{days} วันในสเตจ",
    "{stage}: day {day}": "{stage}: วันที่ {day}",
    "· overdue": "· เลยกำหนด",
    "— source of facts for the assistant and reports.": "— แหล่งข้อเท็จจริงสำหรับผู้ช่วยและรายงาน",
}

VI_GLOSS = {
    "A grow journal that remembers the": "Nhật ký trồng ghi nhớ",
    "ADR-001 stage 2: Whisper → structure → you edit → save to journal (no auto-persisted facts).": "ADR-001 giai đoạn 2: Whisper → cấu trúc → bạn sửa → lưu vào nhật ký (không tự lưu sự thật).",
    "AI focus": "Trọng tâm AI",
    "Active cycle": "Chu kỳ trồng đang hoạt động",
    "Active tasks (run)": "Tác vụ đang mở (lần chạy)",
    "Already have an account? Sign in": "Đã có tài khoản? Đăng nhập",
    "An active cycle and scope are required.": "Cần chu kỳ trồng và phạm vi đang hoạt động.",
    "Ask about history →": "Hỏi về lịch sử →",
    "Audience": "Đối tượng",
    "Capture → timeline → derived summaries → AI with guardrails. One source of truth—the event database, not chat.": "Ghi nhận → dòng thời gian → tóm tắt suy ra → AI có guardrails. Một nguồn sự thật — cơ sở dữ liệu sự kiện, không phải chat.",
    "Clone": "Giống cây",
    "Context for journal, sensors, and AI.": "Ngữ cảnh cho nhật ký, cảm biến và AI.",
    "Create a grow cycle in settings or via support—a cycle and scope are required for the journal.": "Tạo chu kỳ trồng trong cài đặt hoặc liên hệ hỗ trợ — cần chu kỳ và phạm vi cho nhật ký.",
    "Cycle-aware AI": "AI theo chu kỳ trồng",
    "Event-centric grow journal + retrieval-first AI": "Nhật ký trồng theo sự kiện + AI ưu tiên truy xuất",
    "Everything a grower needs every day": "Mọi thứ người trồng cần mỗi ngày",
    "Grow cycle": "Chu kỳ trồng",
    "Grow zone": "Khu trồng",
    "Growlog AI is a PWA for growers: daily voice notes, sensors, photos, and an AI advisor grounded in your farm data—not generic model knowledge.": "Growlog AI là PWA cho người trồng: ghi chú giọng nói hàng ngày, cảm biến, ảnh và cố vấn AI dựa trên dữ liệu trang trại — không phải kiến thức chung của mô hình.",
    "Grover captures the day by voice—Whisper transcribes, AI structures, you confirm before saving.": "Grover ghi ngày bằng giọng nói — Whisper phiên âm, AI cấu trúc, bạn xác nhận trước khi lưu.",
    "History is empty—make your first entry with “Log” or add a photo.": "Lịch sử trống — tạo mục đầu bằng «Log» hoặc thêm ảnh.",
    "Home": "Trang chủ",
    "Journal text": "Văn bản nhật ký",
    "Log the first event with the “Log” button at the bottom, or use voice / photo.": "Ghi sự kiện đầu bằng nút «Log» phía dưới, hoặc dùng giọng nói/ảnh.",
    "No account? Create one": "Chưa có tài khoản? Tạo mới",
    "Open log": "Mở ghi chép",
    "Open procedures—the main grower workflow.": "Mở quy trình — luồng chính của người trồng.",
    "Ready to journal like a pro?": "Sẵn sàng ghi nhật ký như pro?",
    "Save to journal": "Lưu vào nhật ký",
    "Sign in to journal": "Đăng nhập để dùng nhật ký",
    "Timeline": "Dòng thời gian",
    "Voice log": "Ghi giọng nói",
    "What happened → timeline": "Chuyện gì xảy ra → dòng thời gian",
    "and": "và",
    "due {date}": "đến hạn {date}",
    "full cycle": "cả chu kỳ",
    "no due date": "không có hạn",
    "not specified": "chưa chỉ định",
    "window {start} — {end}": "cửa sổ {start} — {end}",
    "{days} days in stage": "{days} ngày ở giai đoạn",
    "{stage}: day {day}": "{stage}: ngày {day}",
    "· overdue": "· quá hạn",
    "— source of facts for the assistant and reports.": "— nguồn sự thật cho trợ lý và báo cáo.",
}


def fix_brands(s: str) -> str:
    for b in BRANDS:
        s = re.sub(re.escape(b), b, s, flags=re.IGNORECASE)
    s = s.replace("Growlog • OG Lab", "Growlog • OG Lab")
    s = s.replace("ADR -001", "ADR-001")
    return s


def apply_gloss(mapping: dict[str, str], gloss: dict[str, str]) -> dict[str, str]:
    out = {}
    for en, val in mapping.items():
        out[en] = fix_brands(gloss.get(en, val))
    return out


def main() -> None:
    unique = json.loads((CACHE / "en-unique-web.json").read_text(encoding="utf-8"))
    for loc, gloss in (("th", TH_GLOSS), ("vi", VI_GLOSS)):
        path = CACHE / f"en-{loc}.json"
        if not path.exists():
            print("skip missing", path)
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        data = apply_gloss(data, gloss)
        for k in unique:
            if k not in data:
                data[k] = k
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print("polished", path)


if __name__ == "__main__":
    main()
