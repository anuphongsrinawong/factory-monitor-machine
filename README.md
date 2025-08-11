# Factory Control & Monitoring System

ระบบควบคุมและมอนิเตอร์เครื่องจักร (KUKA Robot, Mitsubishi PLC และอื่นๆ) แบบเรียลไทม์ พร้อม Dashboard, Control Panel, Data Mapping, Alarm History และสิทธิ์ผู้ใช้งาน (Role-Based). โครงนี้พร้อมใช้งานในงาน production โดยมี Mock Connector ให้รันทันที และออกแบบให้ต่อยอดเชื่อม PLC จริงได้ง่าย

## คุณสมบัติหลัก
- Realtime Dashboard: สถานะ, Tag Values, Alarm แบบสดผ่าน Socket.IO
- Control & Parameters: ตัวอย่าง endpoint สำหรับเขียนค่าไปยัง PLC ผ่าน Data Mapping
- Data Mapping: เพิ่ม/ลบ/แก้ไข Tag, Address, Data Type, Access (Read/Write/Read-Write)
- Alarm History: เก็บประวัติ, รับแจ้งเตือนใหม่แบบเรียลไทม์
- User Permission: ADMIN/ENGINEER/VIEWER (JWT)
- โครงต่อ PLC จริงแบบ Plug-in (KUKA: KRL/XML, OPC UA; Mitsubishi: MC Protocol, OPC UA, MQTT)

## โครงสร้างโปรเจกต์
- `server/` Backend REST + WebSocket + Prisma (SQLite)
- `web/` Frontend React + Vite + Tailwind

## เทคโนโลยี
- Backend: Node.js, Express, Prisma, SQLite (เปลี่ยนเป็น PostgreSQL/MSSQL ได้), Socket.IO, Zod, JWT
- Frontend: React 18, Vite, TailwindCSS, axios, react-router, socket.io-client

## ความต้องการระบบ
- Node.js >= 18, npm >= 9
- Git

## การติดตั้งและเริ่มใช้งาน (Development)
1) ติดตั้ง dependency
```powershell
cd server; npm i; cd ..
cd web; npm i; cd ..
```

2) ตั้งค่า Environment (ฝั่ง server)
- สร้างไฟล์ `server/.env` (ถ้าไม่มี) และกำหนดค่าอย่างน้อย:
```
JWT_SECRET=change-me
PORT=3001
```
หมายเหตุ: ในตัวอย่างนี้ datasource ของ Prisma ตั้งเป็น SQLite ในไฟล์ `schema.prisma` แล้ว จึงไม่จำเป็นต้องตั้ง `DATABASE_URL` (ค่า default คือ `file:./dev.db`).

3) สร้างฐานข้อมูลและ seed ข้อมูลตัวอย่าง
```powershell
cd server
npx prisma generate
npm run db:push
npm run db:seed
```

4) รันระบบ
- Backend: `cd server && npm run dev` จะขึ้นที่ `http://localhost:3001`
- Frontend: `cd web && npm run dev` จะขึ้นที่ `http://localhost:3000`

5) บัญชีตัวอย่างสำหรับทดสอบ
- ADMIN: `admin@example.com` / `Admin@123`
- ENGINEER: `engineer@example.com` / `Engineer@123`

## การใช้งานโดยสรุป
- เปิดเว็บที่ `http://localhost:3000` แล้วเข้าสู่ระบบด้วยบัญชีตัวอย่าง
- Dashboard จะแสดงรายการเครื่องและสถานะ (Mock Connector จะอัปเดตค่าทุก 2 วินาทีและสุ่มแจ้งเตือน)
- Data Mapping: เลือกเครื่องเพื่อดู/จัดการแท็ก
- Alarm History: ดูประวัติและรับ alarm ใหม่แบบเรียลไทม์

## REST API สำคัญ (สรุป)
Base URL: `http://localhost:3001/api`

- Auth
  - `POST /auth/login` → { email, password } → { token, user }

- Devices
  - `GET /devices`
  - `POST /devices` (ADMIN/ENGINEER)
  - `PATCH /devices/:id` (ADMIN/ENGINEER)
  - `DELETE /devices/:id` (ADMIN)

- Tags
  - `GET /tags?deviceId=...`
  - `POST /tags` (ADMIN/ENGINEER)
  - `PATCH /tags/:id` (ADMIN/ENGINEER)
  - `DELETE /tags/:id` (ADMIN/ENGINEER)
  - `GET /tags/:id/value` → อ่านค่าปัจจุบัน (จาก history ล่าสุดหรือ cache)
  - `POST /tags/:id/write` (ADMIN/ENGINEER) → เขียนค่าไปยัง PLC (เดโม: เก็บ history และ broadcast)

- Alarms
  - `GET /alarms?deviceId=...`
  - `POST /alarms/ack/:id` → เคลียร์เวลา clearedAt

การยืนยันตัวตน: ใส่ Header `Authorization: Bearer <token>` สำหรับ endpoint ที่ต้องใช้สิทธิ์

## WebSocket Events
- `tag:update` → `{ tagId: number, value: string }`
- `alarm:new` → อ็อบเจ็กต์ Alarm เต็ม ๆ
เชื่อมต่อที่: `ws://localhost:3001` (Socket.IO)

## Roles & Permissions
- `ADMIN`: จัดการทั้งหมด รวมถึงลบอุปกรณ์/แท็ก
- `ENGINEER`: เพิ่ม/แก้ไขอุปกรณ์/แท็ก, เขียนค่า Tag ได้
- `VIEWER`: อ่านอย่างเดียว

## Data Mapping ออกแบบอย่างไร
ตาราง `Tag` มีฟิลด์หลัก:
- `name`: ชื่อแท็กในระบบ
- `address`: ที่อยู่/พาธบน PLC (เช่น `$OV_PRO`, `D100`, `$PRO_STATE.C_STEP`)
- `dataType`: `BOOL | INT | REAL | STRING`
- `access`: `READ | WRITE | READ_WRITE`

ฝั่ง Connector ต้องตีความ `address` ให้ตรงกับโปรโตคอลของ PLC แต่ละยี่ห้อ

## ต่อกับ PLC จริง (สำคัญ)
แก้ไฟล์: `server/src/services/connectors/index.ts`
1) สร้าง Connector จริง (OPC UA, MC Protocol, KRL/XML ฯลฯ) ให้มีเมธอด `read`, `write`, `start`, `stop`
2) ใน `initConnectors(...)` ทำการเชื่อมต่อ/สมัครสมาชิกแท็กที่ต้องการ
3) เมื่ออ่านค่าได้ ให้บันทึกลง `TagValueHistory` และ `io.emit('tag:update', { tagId, value })`
4) เมื่อเกิด alarm ให้สร้าง `Alarm` และ `io.emit('alarm:new', alarm)`
5) ใน REST `/api/tags/:id/write` ให้เรียก `connector.write(tag.address, value)` แทน mock

ตัวอย่างโปรโตคอล
- KUKA: KRL/XML, KUKA.Ethernet KRL, OPC UA
- Mitsubishi: MC Protocol, OPC UA, หรือผ่าน MQTT Gateway

ข้อควรคำนึง (Production)
- ใส่ Safety Interlock/Whitelist สำหรับแท็กที่อนุญาตเขียนได้เท่านั้น
- ตรวจสอบ data type/ช่วงค่าก่อน write เพื่อความปลอดภัย

## Deploy/Production Checklist
- เปลี่ยน DB จาก SQLite → PostgreSQL/MSSQL (แก้ `schema.prisma` และ `DATABASE_URL`)
- ตั้งค่า HTTPS, Reverse Proxy, CORS ที่เหมาะสม
- ใช้ PM2/Docker จัดการ process + healthcheck `/api/health`
- ตั้ง `JWT_SECRET` เป็นค่า strong secret ในแต่ละ environment
- Log/Monitoring, Backup DB, นโยบายเก็บ `TagValueHistory` (TTL/Archive)

## สคริปต์ที่ใช้บ่อย
Backend (`server/package.json`):
- `npm run dev` รันเซิร์ฟเวอร์แบบ hot-reload
- `npm run build` คอมไพล์ TypeScript ไปที่ `dist/`
- `npm start` รันโค้ดที่คอมไพล์แล้ว
- `npm run db:push` sync schema กับ DB
- `npm run db:seed` ใส่ข้อมูลตัวอย่าง (user/devices/tags)

Frontend (`web/package.json`):
- `npm run dev` รันเว็บ dev server (Vite)
- `npm run build` build production
- `npm run preview` เสิร์ฟ build เพื่อตรวจสอบ

## ลิงก์รีโป
`https://github.com/anuphongsrinawong/factory-monitor-machine`

## License
โปรดกำหนดสัญญาอนุญาตให้เหมาะสมกับการใช้งานของคุณ (เช่น MIT)

Factory Control & Monitoring System (Production-ready Starter)

Monorepo ที่มี Backend (Node/Express/Prisma/Socket.IO) และ Frontend (React/Vite/Tailwind) พร้อม Mock Connector จำลองข้อมูลแบบเรียลไทม์ และโครงต่อ PLC จริง (KUKA/Mitsubishi/OPC UA/MC Protocol) ได้ภายหลัง

โครงสร้าง
- `server/` Backend REST + WebSocket + Prisma (SQLite)
- `web/` Frontend React + Vite

เริ่มต้นใช้งาน
1) ติดตั้ง dependency
```
cd server && npm i && cd ..
cd web && npm i && cd ..
```
2) ตั้งค่า environment (server)
คัดลอก .env จากตัวอย่างและแก้ไขค่า
```
cd server
Copy-Item .env.example .env  # Windows PowerShell
```
แก้ไข JWT_SECRET ให้เป็นค่า strong secret

3) เตรียมฐานข้อมูล และ seed ข้อมูลเริ่มต้น
```
cd server
npx prisma generate
npm run db:push
npm run db:seed
```

4) รันระบบ
- Backend: `cd server && npm run dev` (http://localhost:3001)
- Frontend: `cd web && npm run dev` (http://localhost:3000)

บัญชีตัวอย่าง
- admin@example.com / Admin@123 (ADMIN)
- engineer@example.com / Engineer@123 (ENGINEER)

การต่ออุปกรณ์จริง
- เพิ่มคอนเนคเตอร์ใน `server/src/services/connectors/` และเรียกใช้งานจาก `initConnectors`
- ส่งค่าผ่าน Socket.IO ด้วย event `tag:update`, แจ้งเตือนด้วย `alarm:new`

Deploy/Production
- เปลี่ยน SQLite เป็น PostgreSQL/MSSQL ใน Prisma
- ตั้งค่า CORS/HTTPS/Reverse Proxy
- ใช้ PM2/Docker และ Healthcheck `/api/health`

อัปโหลดขึ้น GitHub
```
git init
git add .
git commit -m "feat: initial production-ready starter for factory monitor"
git branch -M main
git remote add origin https://github.com/anuphongsrinawong/factory-monitor-machine.git
git push -u origin main
```

#   f a c t o r y - m o n i t o r - m a c h i n e 
 

 
