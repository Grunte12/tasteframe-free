---
name: tasteframe
description: >-
  Make a Thai motion-graphics video from the user's own taste. Use when the
  user says /tasteframe or asks for a Reel, TikTok, Shorts, promo, or motion
  graphic. First command is scripts/guard.mjs. Read only the file it prints
  as REQUIRED_READ.
---

# TASTEFRAME

รันตัวตรวจก่อน แล้วอ่านเฉพาะไฟล์ที่มันพิมพ์ `REQUIRED_READ` ห้ามเปิดไฟล์อื่นในเฟสนั้น รอบตัวตนเป็นคำถามปลายเปิดที่พิมพ์ในแชต รอบลุคกับรอบปรับใช้ป๊อปอัปตัวเลือกของโฮสต์ ถ้าโฮสต์มีเครื่องมือนั้น

```bash
node scripts/guard.mjs init --project <พาธเต็มของโฟลเดอร์งาน>
node scripts/guard.mjs enter --project <พาธเต็มของโฟลเดอร์งาน> --phase interview
```

คำสั่งทุกข้อใส่ `--project` เป็นพาธเต็มของโฟลเดอร์ที่ผู้ใช้เปิดทำงาน ห้ามอยู่ในโฟลเดอร์สกิล ดูคำสั่งทั้งหมดด้วย `node scripts/guard.mjs help` ไม่ต้องเปิดโค้ดตัวตรวจ ถ้าได้ `GUARD DENY` ให้หยุดทำอย่างที่ถูกปฏิเสธ

ตัวตรวจพิมพ์ `EDITION` เป็น `elite` `pro` หรือ `free` ตามไฟล์ที่มีในสกิล ถามเฉพาะคีย์ใน `ASK` ถ้าเป็น `free` ไม่มีคลังสไตล์ ลุคมาจาก TASTE.md กับเทมเพลตฉาก และข้าม `set-direction` กับ `attest-demo`

## เฟส เดินทีละขั้น

| phase | ทำ | บันทึกด้วย |
|---|---|---|
| interview | `init` พิมพ์ `KEEP` กับ `ASK` ถามเฉพาะที่ยังว่าง ลุคเลือกจาก `scripts/choice-menu.mjs` งานถัดไปถามแค่จะใช้ลุคเดิมไหม | `answer` แล้ว `summary --stage interview` ลุคเดิมใช้ `reuse-look` |
| brief | เขียนบรีฟ | `summary --stage brief` |
| director | ใช้รหัสใน `LOCKED_LOOK` เปิดเฉพาะหัวสูตรกับเทคนิคนั้น | `choice-menu.mjs examples <style> <recipe>` แล้ว `set-direction --style <id> --shelf <SHELF>` |
| confirm | ทวนแพ็กเกจทั้งชุดให้ผู้ใช้ | `summary --stage package` |
| assets | ตรวจหลักฐาน | `enter --phase build` ได้เมื่อต้นฉบับสไตล์ถูก attest แล้ว |
| build | `elite` ใช้โค้ดในเดโมของสไตล์นั้น ห้ามเขียนฉากจากศูนย์ `pro` ทำตามไฟล์สไตล์ทั้งไฟล์ | `elite`: `attest-demo --file <ไฟล์ในเดโม>` · `pro`: `attest-demo --file <styleId>.md` ก่อน `enter --phase build` |
| qa | ตรวจลายเซ็นของสไตล์ ไม่ใช่แค่ไฟล์เปิดได้ | `enter --phase render` |
| render | เรนเดอร์ | `scripts/verify.sh` เรียก `check-deliver` เอง |

เข้าเฟสถัดไปด้วย `enter --phase <ชื่อ>` เท่านั้น ห้ามกระโดด

## เมื่อข้อมูลขัดกัน

ยึดตามลำดับนี้: (1) ข้อเท็จจริงและสิทธิ์ (2) TASTE.md (3) บรีฟของคลิปนี้ (4) ทิศทางที่ล็อกไว้ (5) สูตรช็อตและเทมเพลต เรื่องรสนิยมที่ยังไม่มีใครตัดสิน ห้ามเติมด้วยค่าเริ่มต้นของโมเดล

## ด่านยืนยัน

ด่านยืนยันมีสามด่าน คือ interview, brief และ package ทุกด่านทำแบบเดียวกัน:

1. แสดงสรุปให้ผู้ใช้อ่าน แล้วรัน `summary --stage <ด่าน>`
2. จบเทิร์น แล้วรอผู้ใช้ตอบ
3. ถ้าผู้ใช้ตอบว่าใช่ ให้รัน `confirm-<ด่าน> --user-said "<คำตอบของผู้ใช้ คัดลอกตรงๆ>"`
4. ถ้าผู้ใช้ขอแก้ ให้แก้ แสดงสรุปใหม่ แล้วรอคำตอบอีกครั้ง

คำว่า "ทำเลย" หรือ "ไม่ต้องถามเยอะ" ไม่ใช่การยืนยัน มันแปลว่าให้ถามสั้นลง ห้ามยืนยันแทนผู้ใช้ทุกกรณี

ลุคที่บันทึกคือรหัสฉาก สไตล์ สูตรช็อต เทคนิค และการจัดหน้า ความจำระยะยาวอยู่ที่ `portfolio/dna.md` ผ่านคำสั่ง recall เท่านั้น สี น้ำหนักตัวอักษร และตัวเลขจังหวะให้หยิบจากไฟล์สไตล์ เดโม และหัวสูตรนั้น
