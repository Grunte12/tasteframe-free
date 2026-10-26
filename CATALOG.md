# CATALOG

เปิดไฟล์นี้เมื่อ `.tasteframe-state.json` อยู่ในเฟสที่ต้องใช้พาธแล้ว เปิดแถวของเฟสนั้นแถวเดียว ห้ามเปิดระหว่าง `phase` เป็น `interview`

| เปิดเมื่อ phase | ไฟล์ |
|---|---|
| ทุกเฟส | `SKILL.md` |
| `interview` | `references/phases/phase-0-grill.md`, `templates/taste-profile.md` (ตัวตรวจเขียน `.tasteframe-state.json` เอง ห้ามแก้มือ) |
| `brief` | `references/phases/phase-1-brief.md`, `templates/brief.md`, `templates/scenes/` |
| `director` | `references/phases/phase-2-director.md`, `references/timing-and-cutting.md`, `templates/direction.json`, `templates/storyboard.json`, `templates/shotlist.md`, `templates/sound-design.json` |
| `director` และต้องออกแบบเสียง | `references/sound-design.md` |
| `director` และผู้ใช้เลือกสไตล์แล้ว | `references/styles-mg15/INDEX.md` แล้วเปิดไฟล์สไตล์ใบที่เลือกเพียงใบเดียว |
| `assets` หลัง `packageStatus: confirmed` | `references/phases/phase-3-assets.md`, `references/media-sources.md` เมื่อต้องตรวจแหล่งสื่อ |
| `build` หลัง `packageStatus: confirmed` | `references/styles-mg15/<id>.md` ทั้งไฟล์, `library/extra-styles/demos/<id>/` ทั้งโฟลเดอร์ของสไตล์ที่เลือก, `references/reference-shelf.md` เฉพาะลิงก์ของสไตล์นั้น, `references/phases/phase-4-build.md`, `references/thai-layer.md` |
| `build` และแผนมีช็อต 3D | `references/3d-scenes.md` คู่กับเดโมของสไตล์นั้น |
| `qa` หลัง `packageStatus: confirmed` | `references/phases/phase-5-qa.md`, `references/tells-registry.md`, `references/model-routing.md`, `scripts/extract-qa-frames.sh`, `scripts/contact-sheet.sh`, `scripts/verify.sh` |
| `render` หลัง `packageStatus: confirmed` | `references/phases/phase-6-render.md`, `references/sound-design.md`, `scripts/mix-vo.sh`, `scripts/mix-full.sh`, `scripts/verify.sh` |
| `render` และผู้ใช้ขอส่งงานไปตัดต่อต่อ | `modules/capcut-export/README.md` เท่านั้น ห้ามเปิดก่อนผู้ใช้ขอ |
| เมื่อต้องใช้กติกาการถาม หรือข้อยกเว้น | `references/governance.md` อ่านเฉพาะหัวข้อที่ต้องใช้ |
| เมื่อตรวจที่มาของวัสดุ | `NOTICE.md` |

`references/shot-recipes.md`, `references/techniques.md`, `references/reference-library.md` เปิดทีละรายการในเฟส `director` หลังผู้ใช้เลือกทิศทาง ห้ามอ่านทั้งไฟล์

`references/governance.md` ไม่ใช่ใบอนุญาตให้เริ่มสร้างภาพ การสร้างภาพเริ่มที่แถว `build`
