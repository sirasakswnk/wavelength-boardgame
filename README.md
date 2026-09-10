# WaveLengthBoardGame

เว็บเกม Wavelength ภาษาไทยแบบออนไลน์ 2 คนแข่งกัน ใช้ React 18, TypeScript, Vite และ Firebase Anonymous Auth + Realtime Database ไม่มี Cloud Functions

## การเล่น

1. ตั้งชื่อและเลือกอวตาร สร้างห้องรหัส 4 ตัว หรือกรอกรหัสเพื่อเข้าห้อง
2. เลือกเล่น 4/6/8/10 รอบ โฮสต์เริ่มเมื่อผู้เล่นทั้งสองเชื่อมต่อแล้ว รอบแรกโฮสต์เป็นคนใบ้
3. คนใบ้แตะวงล้อเพื่อสุ่มเป้าหมาย แตะอีกครั้งเพื่อเปิดดู แล้วส่งคำใบ้
4. คนทายลากเข็มแล้วกดเฉลย ได้ 4/3/2/0 คะแนนตามระยะห่างจากเป้าหมาย
5. หลังคะแนนบันทึก โฮสต์กดรอบต่อไปเพื่อสลับบทบาท เมื่อครบจำนวนรอบแสดงผู้ชนะหรือเสมอ และโฮสต์เริ่มเล่นใหม่ได้

มีหัวข้อภาษาไทย 23 คู่ใน `src/data/cards.ts` และธีม responsive ที่วาดวงล้อด้วย SVG

## รันในเครื่องกับ Firebase จริง

ใช้ Node.js 22 ขึ้นไป ติดตั้ง dependencies ด้วย `npm ci` แล้วคัดลอก `.env.example` เป็น `.env` และเติมค่าจาก Firebase project ของคุณ เปิด Anonymous Authentication และตั้ง Realtime Database Rules ตามหัวข้อ deployment ด้านล่าง

```sh
npm run dev
npm run typecheck
npm run build
```

`npm run build` สร้าง `dist/` สำหรับ static hosting มี `netlify.toml` และ SPA redirect เตรียมไว้ ไม่มีการ deploy อัตโนมัติจากคำสั่ง build

## ทดสอบโดยไม่ใช้ข้อมูลจริง

ติดตั้ง Java 21 ขึ้นไปสำหรับ Database Emulator และ Node.js 22 ขึ้นไปสำหรับ Firebase CLI การเริ่มครั้งแรกต้องใช้อินเทอร์เน็ตเพื่อดาวน์โหลด Emulator

```sh
npm test
npm run test:rules
```

`npm test` ตรวจการคิดคะแนน การสลับรอบ การเล่นใหม่ และสมาชิกห้อง ส่วน `npm run test:rules` สร้าง Rules แล้วเปิด Database Emulator ชั่วคราวเพื่อตรวจคำสั่งที่อนุญาต/ปฏิเสธ รวมถึง transaction พร้อมกัน โดยใช้ project จำลอง `demo-wavelength`

สำหรับทดสอบผ่านเบราว์เซอร์ เปิด terminal แรก:

```sh
npm run emulators
```

เปิด terminal ที่สอง (PowerShell):

```powershell
$env:VITE_USE_EMULATORS='true'
npm run dev -- --host 127.0.0.1
```

เปิด `http://127.0.0.1:5173` ด้วย browser profile แยกกันหรือโหมดไม่ระบุตัวตนเพื่อเล่นสองคน ไม่ใช้เพียงสองแท็บใน profile เดียวกัน เพราะ Firebase Auth ใช้ผู้เล่นคนเดียวกันใน profile นั้น

Emulator mode ใช้ config จำลองทั้งหมดแทนค่าจริงใน `.env` และทำงานเฉพาะ dev build พอร์ต Auth คือ 9099 และ Database คือ 9000 หากมี Emulator เปิดอยู่แล้ว ให้รันทดสอบ Rules ด้วย `npx vitest run tests/rules.test.ts` แทนการเปิดซ้ำ

## โครงสร้างและกติกาข้อมูล v2

```text
roomsV2/{code}/
  state/
    pub/                  เฟส รอบ roundId บทบาท คำใบ้ เข็ม ผลเฉลย
    players/host/         uid ชื่อ อวตาร คะแนน slot
    players/guest/
  secret/{roundId}         เป้าหมายคงที่ต่อรอบ
  presence/{uid}/{connectionId}
```

- `src/lib/game.ts`: กติกาที่ไม่ผูกกับ Firebase เช่นเข้าห้อง เปลี่ยนรอบ คิดคะแนนและเล่นใหม่
- `src/lib/rooms.ts`: transaction, subscription, secret และ presence
- `src/hooks/useRoom.ts`: โหลดห้อง/ข้อผิดพลาด/การเชื่อมต่อ
- `src/components/OnlineGame.tsx`: ปฏิสัมพันธ์ในรอบนั้น ถูกสร้างใหม่เมื่อ roundId เปลี่ยน
- `scripts/build-rules.mjs`: แหล่งแก้ไข Rules ที่สร้าง `firebase/database.rules.json` พร้อมใช้งาน

การเปลี่ยนสมาชิก สถานะรอบ ผลเฉลย และคะแนนใช้ transaction ที่ `state` เดียวกัน Rules จำกัดแต่ละการเปลี่ยนแปลงตามสมาชิกและบทบาท ตรวจค่าต่าง ๆ และห้ามแก้ฟิลด์อื่นแฝงมา

ผู้ล็อกอินที่รู้รหัสห้องอ่าน shared state ได้เพื่อเข้าห้องด้วย transaction แต่ไม่สามารถ list ห้องทั้งหมด อ่าน parent ของห้อง หรืออ่านเป้าหมายลับก่อนเฉลยได้ เป้าหมายเขียนได้ครั้งเดียวโดยคนใบ้ เมื่อคนทายล็อกคำตอบแล้ว สมาชิกทั้งสองอ่านเป้าหมายและ finalize คะแนนได้ Rules ตรวจคะแนนกับเป้าหมายที่บันทึกไว้ และบันทึกผลพร้อมคะแนนสะสมเพียงครั้งเดียว

โมเดลนี้ยังเชื่อใจคนใบ้ในการสุ่มเป้าหมายและให้คำใบ้ตามปกติ ไม่ใช่ระบบแข่งขันที่สุ่มและตัดสินทุกอย่างบน server รหัส 4 ตัวเป็นรหัสเข้าห้องสำหรับเล่นกับเพื่อน ไม่ใช่รหัสผ่านสำหรับข้อมูลส่วนตัว

อ้างอิงพฤติกรรม transaction และการกำหนดสิทธิ์จาก [Firebase Database API](https://firebase.google.com/docs/reference/js/database) และ [Security Rules conditions](https://firebase.google.com/docs/database/security/rules-conditions)

## รีเฟรช การหลุด และการออกจากห้อง

- รหัสห้องเก็บใน `sessionStorage` ของแต่ละแท็บ รีเฟรชแล้วกลับห้องเดิมได้ ถ้า storage ถูกปิด ยังเข้าห้องใหม่ด้วยรหัสเดิมได้
- เป้าหมายเดิมกู้จาก secret และเข็มกู้จาก shared state แต่คำใบ้ที่ยังไม่ได้ส่งไม่ได้บันทึก
- แต่ละการเชื่อมต่อมี presence แยกกัน แท็บหนึ่งปิดไม่ลบสถานะอีกแท็บ ใช้ `onDisconnect` และลงทะเบียนใหม่เมื่อ reconnect การตรวจว่าหลุดอาจล่าช้าตามการตรวจ connection ของ Firebase
- หลุดชั่วคราวเก็บที่นั่งและคะแนนไว้ UI รอให้ทั้งสองคนกลับมาก่อนเล่นต่อ ผลของรอบที่ล็อกคำตอบแล้วสามารถบันทึกโดยสมาชิกที่ยังเชื่อมต่ออยู่ได้
- แขกออกจาก lobby จะคืนที่นั่ง โฮสต์ออกจาก lobby หรือผู้เล่นคนใดกดออกระหว่างเกมจะปิดห้องนั้น ไม่มีการแทนผู้เล่นกลางเกม
- ห้องเก่าและ secret ยังอยู่ในฐานข้อมูล ไม่มี scheduled cleanup ในโปรเจค ผู้ดูแลสามารถลบห้องที่เลิกใช้แล้วจาก Firebase Console

## นำเวอร์ชันนี้ขึ้นระบบ

**ต้องใช้ Rules v2 และ frontend v2 คู่กัน** รอให้เกมเก่าจบและแจ้งให้ผู้เล่นโหลดเว็บใหม่ก่อน rollout เพราะ Rules ใหม่นี้ปฏิเสธ path `rooms/*` เดิม ไม่มีการแปลงห้องที่กำลังเล่นอัตโนมัติ

1. รัน `npm run rules:build`, `npm test`, `npm run test:rules`, `npm run build`
2. ตรวจ project ปลายทางและ environment variables ให้ถูกต้อง
3. Deploy `firebase/database.rules.json` ผ่าน Firebase Console หรือ `firebase deploy --only database --project YOUR_PROJECT_ID`
4. Deploy `dist/` บน static hosting แล้วตรวจการสร้างห้อง/เข้าห้อง/เล่นครบเกมสอง browser profiles

เมื่อแก้ `game.ts`, scoring หรือชุดการ์ด ต้องตรวจ Rules และรัน tests อีกครั้ง โดยเฉพาะการเพิ่ม ID การ์ดต้องสร้าง Rules ใหม่ก่อนใช้งานจริง
