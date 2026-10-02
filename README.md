# CountMe — Geo-QR Attendance System

A secure, web-based attendance management system that combines **dynamic QR verification**, **geolocation proximity checks**, **device binding**, and **academic performance analytics** to reduce attendance fraud in tertiary institutions.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Laravel 11 (PHP) |
| Frontend | React + TypeScript + Vite |
| Database | MySQL |
| Auth | Laravel Sanctum |
| API | RESTful JSON API |

---

## 📁 Project Structure

```
CountMe/
├── backend/          # Laravel API
│   ├── app/
│   │   ├── Http/Controllers/Api/
│   │   ├── Models/
│   │   └── ...
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   └── routes/api.php
│
└── frontend/         # React + Vite SPA
    ├── src/
    │   ├── pages/
    │   │   ├── admin/
    │   │   └── ...
    │   └── lib/api.ts
    └── index.html
```

---

## ✨ Key Features

- 🔐 **Dynamic QR Codes** — Short-lived, cryptographically protected tokens per session
- 📍 **Geolocation Verification** — Validates student proximity to lecture venue
- 📱 **Device Binding** — Application-level device fingerprinting as a fraud signal
- 🚫 **Duplicate Prevention** — Database-level constraints block double submissions
- 📊 **Analytics Dashboard** — Attendance trends and at-risk student identification
- 👥 **Role-Based Access** — Students, Lecturers, Admins, Super Admins, Parents/Guardians
- 📝 **Audit Logging** — Records both successful and suspicious/failed attempts

---

## 🚀 Getting Started

### Backend (Laravel)

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

### Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

---

## 🔑 Default Seeded Accounts

After running `php artisan migrate --seed`, the following test accounts are created:

| Role | Email | Password |
|---|---|---|
| Super Admin | admin@countme.com | password |
| Lecturer | lecturer@countme.com | password |
| Student | student@countme.com | password |

---

## 📄 License

This project is for academic/prototype purposes.
