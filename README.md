<div align="center">
  
# 🌊 Wavelength Web Boardgame

**โปรเจคเว็บแอปพลิเคชันสำหรับเล่นบอร์ดเกม Wavelength กับเพื่อนๆ แบบออนไลน์ (Real-time)** <br>
มาประชันความรู้ใจกันว่า คุณจะเดาใจเพื่อนถูกหรือไม่จากคำใบ้เพียงคำเดียว!

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)
![Firebase](https://img.shields.io/badge/firebase-ffca28?style=for-the-badge&logo=firebase&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)

</div>

<br>

## ✨ จุดเด่นของโปรเจค (Features)
- 🎮 **Real-time Multiplayer:** ซิงค์ข้อมูลผู้เล่นแบบเรียลไทม์ผ่าน Firebase Realtime Database
- 🎨 **Beautiful 3D UI:** อินเทอร์เฟซสไตล์การ์ตูน สีสันสดใส พร้อมเอฟเฟกต์ 3D Token ที่ให้ความรู้สึกเหมือนจับอุปกรณ์จริง
- 🦋 **Custom Avatars:** เลือกร่างอวตารของคุณก่อนเข้าเกม มีให้เลือกทั้ง Emoji และรูปภาพ (เช่น น้องผีเสื้อสุดคิวท์)
- 📱 **Responsive Design:** รองรับการเล่นทั้งบนมือถือ (Mobile) และหน้าจอคอมพิวเตอร์ (Desktop)
- 🎲 **Card Concepts:** การ์ดคำถาม/คำใบ้ภาษาไทยที่หลากหลายกว่า 30+ ชุด (และอัปเดตเพิ่มได้ตลอด)

<br>

## 🎯 วิธีการเล่นเบื้องต้น (How to Play)
1. **สร้างห้อง / เข้าร่วมห้อง:** ผู้เล่นคนแรกสร้างห้องและส่ง "รหัสห้อง" (Room Code) ให้เพื่อนๆ เข้ามาจอย
2. **คนใบ้ (Psychic):** ระบบจะสุ่ม 1 คนเป็น "คนใบ้" 
   - คนใบ้จะเห็นเป้าหมาย (Target) บนหน้าปัด
   - คนใบ้จะได้รับการ์ดหัวข้อ (เช่น **"ร้อน"** ฝั่งซ้าย และ **"เย็น"** ฝั่งขวา)
   - คนใบ้จะต้องพิมพ์ "คำใบ้" 1 คำ/ประโยค เพื่อให้เพื่อนๆ ทายว่าเป้าหมายอยู่ตรงไหนระหว่างร้อนและเย็น
3. **คนทาย (Guessers):** เพื่อนในทีมจะเห็นแค่หน้าปัดว่างเปล่าและคำใบ้ จากนั้นต้องช่วยกันหมุนเข็มไปที่ตำแหน่งที่คิดว่าถูกต้องที่สุด
4. **เฉลย (Reveal):** ระบบจะเปิดเผยตำแหน่งเป้าหมาย พร้อมคำนวณคะแนนตามความแม่นยำ!

<br>

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)
- **Frontend:** React.js + TypeScript
- **Bundler:** Vite (เร็ว แรง ทะลุจอ)
- **Styling:** Vanilla CSS (ไม่พึ่ง Framework เน้นความ Custom ระดับ Pixel-perfect และ Animation สุดสมูท)
- **Backend / State:** Firebase Realtime Database

<br>

## 🚀 วิธีการรันโปรเจคในเครื่อง (Local Setup)

หากคุณต้องการนำโค้ดไปรันเพื่อพัฒนาต่อ สามารถทำได้ตามขั้นตอนด้านล่างนี้เลยครับ:

### 1. ติดตั้ง Dependencies
```bash
npm install
# หรือ yarn install
```

### 2. ตั้งค่า Firebase
สร้างไฟล์ `.env` ที่โฟลเดอร์หลัก (Root) ของโปรเจค และใส่ค่า Firebase Config ของคุณลงไป:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_DATABASE_URL=your_database_url
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 3. รัน Development Server
```bash
npm run dev
# หรือ yarn dev
```
เปิดเบราว์เซอร์ไปที่ `http://localhost:5173` เพื่อดูผลลัพธ์ได้เลย!

<br>

---

<div align="center">
  <i>สร้างสรรค์และพัฒนาเพื่อความสนุกในวงเพื่อน 🧩</i>
</div>
