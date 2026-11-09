# Wavelength — ภาพสำหรับ Portfolio / Playground

ถ่ายวันที่ **9 พฤศจิกายน 2026** (Asia/Bangkok, UTC+7) ด้วย **Playwright MCP / Chromium** จาก UI และ CSS ของโปรเจกต์ปัจจุบัน ไม่ได้แก้ source code, business logic, การสุ่ม หรือการคิดคะแนน

## ไฟล์ภาพ

ทุกภาพเป็น PNG จาก viewport โดยตรง ไม่ใช่ full-page และไม่ได้ย่อหรือแต่งภาพหลังถ่าย

| ไฟล์ | ความละเอียด | เวลาถ่าย (UTC+7) | ฝั่ง / บทบาท | Phase และขั้นตอน |
| --- | --- | --- | --- | --- |
| [round-result.png](round-result.png) | 1440 × 1000 | 22:09:27 | โฮสต์ Player A / คนใบ้ | `revealed` รอบ 1/4 หลังล็อกคำตอบและบันทึกคะแนนแล้ว: Player B ได้ 3 คะแนน, คะแนนรวม A=0 / B=3 |
| [lobby.png](lobby.png) | 1440 × 1000 | 22:08:09 | โฮสต์ Player A / ยังไม่เริ่มบทบาท | `lobby` ผู้เล่นสองคนเชื่อมต่อแล้ว เลือก 4 รอบ ปุ่มเริ่มเกมพร้อมใช้งาน |
| [guessing.png](guessing.png) | 1440 × 1000 | 22:08:52 | แขก Player B / คนทาย | `guessing` รอบ 1/4 รับคำใบ้ “เขียนเว็บไซต์” แล้ว ลากเข็มจาก 0.5 ไปประมาณ 0.72 เป้าหมายยังซ่อน |
| [game-result.png](game-result.png) | 1440 × 1000 | 22:11:11 | โฮสต์ Player A / คนทายในรอบสุดท้าย | `ended` หลังเล่นครบ 4 รอบและกดดูผลลัพธ์: Player A ชนะ 5–3 มีปุ่มเล่นอีกครั้ง |
| [clue-giver.png](clue-giver.png) | 1440 × 1000 | 22:08:49 | โฮสต์ Player A / คนใบ้ | `setup` รอบ 1/4 หมุนและเปิดฝาเสร็จ เห็นเป้าหมาย พร้อมคำใบ้ “เขียนเว็บไซต์” ที่พิมพ์ไว้ก่อนส่ง |
| [home.png](home.png) | 1440 × 1120 | 22:01:50 | Player A / ยังไม่มีห้องหรือบทบาท | หน้าแรก กรอกชื่อ เลือกอวตารสุนัขจิ้งจอกและ 4 รอบ เห็นปุ่มสร้าง/เข้าห้อง |
| [mobile-gameplay.png](mobile-gameplay.png) | 390 × 844 | 22:09:03 | แขก Player B / คนทาย | `guessing` รอบ 1/4 เดียวกับภาพ desktop แสดงผล responsive โดยเปลี่ยน viewport ของ context แขก |

Browser zoom 100%, devicePixelRatio=1 และ visualViewport.scale=1 ขณะถ่ายภาพ โค้ดเดิมมี `#root { zoom: 1.25 }` สำหรับ desktop ตั้งแต่ 1024px จึงคงไว้ตามข้อกำหนดใช้ CSS เดิม หน้าแรกเพิ่มความสูงเป็น 1120px เพื่อไม่ตัดปุ่มด้านล่าง

## แหล่งข้อมูลและหลักฐานของรอบนี้

- ใช้ **Firebase Auth Emulator และ Realtime Database Emulator** ของโปรเจกต์จำลอง `demo-wavelength` เท่านั้น ข้อมูลทุกชื่อและคำใบ้เป็นข้อมูลสาธิต
- ตรวจจาก Firebase SDK ของทั้งสอง context **ก่อนสร้าง/เข้าห้อง**: Auth ใช้ `127.0.0.1:9099`, Database repo ใช้ `127.0.0.1:9000`, namespace `demo-wavelength-default-rtdb`
- ตรวจซอร์ส `src/lib/firebase.ts`: emulator mode เลือก config จำลองและเรียก connect emulator ก่อน sign-in ไม่ใช้ config production จาก `.env`
- Playwright MCP สร้าง context แยกชื่อ `wavelength-player-a` และ `wavelength-player-b` ไม่ใช่สองแท็บที่แชร์ storage เดียวกัน ตรวจ shared state แบบอ่านอย่างเดียวแล้วว่า host UID และ guest UID ต่างกัน โดยไม่บันทึก UID หรือ token ในเอกสารนี้
- ห้องสาธิตที่เล่นจริงคือ `4ETR`: Player A 🦊 เป็นโฮสต์, Player B 🐸 เป็นแขก เลือก 4 รอบ ทั้งสอง presence ออนไลน์และปุ่มเริ่มเกมใช้งานได้ก่อนถ่าย lobby
- สร้างห้อง เข้าห้อง เริ่มเกม หมุน เปิดฝา พิมพ์/ส่งคำใบ้ ลากเข็ม เฉลย เปลี่ยนรอบ และดูผลลัพธ์ **ผ่าน UI ทั้งหมด** การอ่าน SDK/state ใช้ตรวจปลายทางและผลที่บันทึกแล้วเท่านั้น ไม่ได้เรียก action หรือเขียนสถานะข้าม UI
- ฝั่งคนทายในภาพ guessing มี target polygons 0 ชิ้น และ label บนฝาเป็น `?` เป้าหมายยังไม่แสดงตามเงื่อนไขจริงของเกม

ผลที่อ่านจาก state หลังเฉลยและบันทึกคะแนนในแต่ละรอบ (ค่า needle/target ปัดทศนิยมเพื่ออ่านง่าย):

| รอบ | คนใบ้ → คนทาย | หัวข้อ | คำใบ้ | Needle | Target | คะแนนรอบ | รวม A / B |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | A → B | ทักษะไร้ค่า / ทักษะมีค่า | เขียนเว็บไซต์ | 0.720000 | 0.664248 | 3 | 0 / 3 |
| 2 | B → A | โชคร้าย / โชคดี | จับสลากได้รางวัลใหญ่ | 0.850000 | 0.810512 | 3 | 3 / 3 |
| 3 | A → B | เผ็ดน้อย / เผ็ดจัด | ต้มยำกุ้ง | 0.620000 | 0.480181 | 0 | 3 / 3 |
| 4 | B → A | น่าไว้ใจ / น่าสงสัย | คนแปลกหน้าชวนคุย | 0.570000 | 0.450079 | 2 | 5 / 3 |

หลังรอบ 4 โฮสต์กด “ดูผลลัพธ์” แล้วตรวจพบ `phase=ended`, `round=4`, `totalRounds=4`, คะแนน A=5 / B=3 ก่อนส่งมอบ ไม่บังคับคะแนนสูงสุด ไม่เปลี่ยนค่า random และไม่ได้เขียนผลทดแทนการเล่น

## วิธีรันและถ่ายซ้ำ

ใช้ Node.js 22+ และ Java 21+ ตาม README หลัก ติดตั้ง dependencies ด้วย `npm.cmd ci` หากยังไม่มี จาก root ของโปรเจกต์ เปิด PowerShell สอง terminal:

Terminal 1:

```powershell
npm.cmd run emulators
```

คำสั่งปัจจุบันเปิดเฉพาะ Auth/Database ด้วย `--project demo-wavelength` รอข้อความ All emulators ready และตรวจพอร์ต 9099/9000 ว่าเป็นบริการนี้ก่อนดำเนินการ

Terminal 2:

```powershell
$env:VITE_USE_EMULATORS='true'
npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

ไม่ต้องใส่ credentials สำหรับ emulator mode ไม่ต้อง deploy Rules และอย่าใช้ dev server เดิมที่ยังไม่ได้ยืนยันโหมด emulator ถ้าพอร์ตถูกใช้ ให้ตรวจเจ้าของบริการก่อน ไม่หยุดบริการอื่นโดยอัตโนมัติ

1. ใช้ Playwright MCP `browser_tabs` สร้างแท็บใหม่โดยระบุ `isolatedContext: "wavelength-player-a"` และ `"wavelength-player-b"` ไปที่ `http://127.0.0.1:5173` ตั้ง viewport 1440 × 1000
2. ตรวจปลายทางก่อนสร้างห้อง ใช้ `browser_run_code_unsafe` เพื่ออ่านค่าจากแอปเท่านั้น ตัวอย่าง:

   ```javascript
   async (page) => page.evaluate(async () => {
     const { getFirebase, ensureAnonAuth } = await import('/src/lib/firebase.ts');
     await ensureAnonAuth();
     const { auth, db } = getFirebase();
     return {
       project: db.app.options.projectId,
       authHost: auth.emulatorConfig?.host,
       authPort: auth.emulatorConfig?.port,
       databaseHost: db._repo.repoInfo_.host,
       devicePixelRatio,
       scale: visualViewport.scale,
     };
   })
   ```

   `db._repo` เป็น internal SDK property สำหรับการตรวจครั้งนี้ อาจเปลี่ยนใน SDK รุ่นอื่น ต้องได้ localhost ตามข้างต้นก่อนเล่น

3. ฝั่ง A ตั้งชื่อ Player A เลือก 🦊 และ 4 รอบ ถ่าย home โดยเพิ่มความสูงเป็น 1120px แล้วสร้างห้อง ฝั่ง B ตั้งชื่อ Player B เลือก 🐸 เข้าห้องด้วยรหัสใหม่ที่ปรากฏ ห้ามยึดรหัส `4ETR` ว่าจะยังมีอยู่หลัง restart emulator
4. กลับฝั่ง A รอผู้เล่นสองคนออนไลน์และปุ่มเริ่มเกม enabled ถ่าย lobby **ก่อนกดเริ่มเกม**
5. รอบแรก A แตะ SVG วงล้อเพื่อหมุน รอ 1600ms จนแสดงข้อความให้เปิดฝา แตะอีกครั้ง รอเปิดฝา 1200ms จนช่องคำใบ้พร้อม พิมพ์คำใบ้ให้สอดคล้องกับหัวข้อและเป้าหมายจริง ถ่าย clue-giver ก่อนส่ง
6. ส่งคำใบ้ กลับฝั่ง B รอปุ่มเฉลย ลากเข็มด้วย mouse/pointer บน SVG ออกจากกึ่งกลาง รอ shared state บันทึกและแอนิเมชันนิ่ง ถ่าย guessing **ก่อนกดเฉลย** ต้องเห็นฝาปิดและ `?` แทนโซนเป้าหมาย
7. เปลี่ยน viewport B เป็น 390 × 844 รอ responsive layout และถ่าย mobile-gameplay แล้วคืน desktop viewport
8. B กดเฉลย รอคะแนนและปุ่มรอบต่อไปพร้อมใช้งาน รออย่างน้อย 4 วินาทีให้แอนิเมชันและ confetti จบ กลับฝั่ง A ถ่าย round-result แล้วกดรอบต่อไป
9. ทำซ้ำผ่าน UI จนครบ 4 รอบ บทบาทสลับ A/B ทุกรอบ คนทายเป็นผู้ลากเข็มและกดเฉลย โฮสต์เป็นผู้กดรอบต่อไป
10. หลังรอบ 4 บันทึกคะแนนเสร็จ โฮสต์กดดูผลลัพธ์ รออย่างน้อย 5 วินาที ถ่าย game-result ให้เห็นผล ผู้เล่นสองคน คะแนนรวม จำนวนรอบ และปุ่มเล่นอีกครั้ง
11. บันทึก screenshot ด้วย `scale: "css"`, `fullPage: false` และ path ใต้ `portfolio-screenshots/` เปิดตรวจ PNG ทุกไฟล์ แก้ viewport หากขอบถูกตัด ไม่ใส่ CSS override หรือแต่งภาพ

หัวข้อ เป้าหมาย รหัสห้อง และคะแนนเกิดจากการสุ่ม/การเล่นจริง การถ่ายซ้ำจึงไม่จำเป็นต้องได้ผลเหมือนภาพชุดนี้

## ขอบเขตที่ตรวจจริงและข้อจำกัด

- ได้ครบภาพหลัก 4 ภาพและภาพเสริม 3 ภาพ เปิดตรวจไฟล์ PNG ที่ส่งมอบทั้งหมดและตรวจความละเอียดจาก PNG header แล้ว ไม่มีภาพที่ยังขาด
- ตรวจ UI flow ของเกมจริงหนึ่งเกมครบ 4 รอบใน Chromium สอง isolated contexts รวมการสลับบทบาท การซ่อนเป้าหมายของคนทาย การบันทึกคะแนนและผลจบเกม ปุ่มเล่นอีกครั้งแสดงและ enabled แต่ไม่ได้กดเล่นเกมใหม่
- รอการหมุน เปิดฝา เฉลย คะแนน และ confetti ก่อนถ่าย ไม่มี loading, connection notice, error overlay หรือ DevTools ในภาพ สถานะหน้าจบเกมตรวจพบ alert/connection notice/error overlay 0 รายการ
- `round-result.png` ใช้ UI เดิมที่มีป้าย “เยี่ยม +3” วางทับขอบบนของวงล้อและบางส่วนของ label โซนคะแนน ป้ายนี้คงอยู่หลังแอนิเมชันจบ จึงไม่ได้ซ่อนหรือย้ายเพื่อแต่งภาพ เป้าหมาย เข็ม คะแนนรอบและคะแนนผู้เล่นยังแสดง
- บนมือถือ ชื่อผู้เล่นบางส่วนถูกย่อด้วย ellipsis และ role pill ตัดบรรทัดตาม CSS เดิม กระดาน คำใบ้ หัวข้อ เข็ม รอบ คะแนน และปุ่มเฉลยอยู่ครบใน 390 × 844 โดยไม่มี horizontal overflow ภาพนี้เป็น viewport emulation ไม่ใช่การทดสอบโทรศัพท์จริง
- หน้าแรกมีวงล้อ/หัวข้อสลับอัตโนมัติ และมี decorative animation ที่วนต่อเนื่องตามการทำงานเดิม
- การเปิด Firebase CLI ครั้งแรกติดสิทธิ์อ่าน config จึงรันคำสั่ง emulator เดิมอีกครั้งหลังได้รับอนุญาต จากนั้น Auth/Database ทำงานได้ การเปิดหน้าครั้งแรกก่อน emulator พร้อมมี connection failure แต่ reload หลัง emulator พร้อมและตรวจ routing ใหม่ก่อนสร้างห้อง
- ไม่ใช้ `VERIFICATION.md` หรือผลทดสอบเก่าเป็นหลักฐานของรอบนี้ ไม่ได้รัน unit/rules suite หรือ build ซ้ำ งานนี้ตรวจผ่าน browser flow ข้างต้น ไม่ครอบคลุม security regression, disconnect/reconnect, cross-browser หรือ production
- ไม่แก้ source/CSS/Rules, ไม่ใช้ mock UI, ไม่เขียนสถานะหรือคะแนนข้ามขั้นตอน, ไม่เขียนข้อมูล production, ไม่ deploy Rules, ไม่ commit/push/deploy และยังไม่ได้เผยแพร่ภาพขึ้นเว็บไซต์ Portfolio
- ไม่ export Auth storage, token, credentials, `.env` หรือฐานข้อมูลดิบ บริการ emulator เป็นข้อมูลชั่วคราว ไม่มีการ export/import เพื่อคงห้องนี้
