# 🚗 RouteMate

> **Full-vehicle ride-sharing platform** — Drivers traveling on planned routes offer their empty vehicle to nearby passengers heading the same way. No seat pooling. One booking, one vehicle, one journey.

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Application Routes](#-application-routes)
- [Database Schema](#-database-schema)
- [Ride Lifecycle](#-ride-lifecycle)
- [Payment System](#-payment-system)
- [Security](#-security)

---

## 🌟 Overview

RouteMate is a **full-stack ride-sharing web application** where drivers publish their planned routes and passengers book the entire vehicle for trips along that route. The platform handles end-to-end ride management — from discovery and booking to OTP-verified ride starts, live GPS tracking, and automated payment settlement.

**Key principles:**
- ✅ Full-vehicle bookings only — no seat sharing or pooling
- ✅ Structured fare engine with base fare + distance + time + surge multiplier
- ✅ Platform commission model with driver earnings auto-calculated
- ✅ Trust score system for both drivers and passengers
- ✅ Admin-controlled pricing via live system config

---

## ✨ Features

### 👤 Authentication & Onboarding
- Email/password registration with OTP email verification
- OAuth sign-in via **Google** and **Facebook**
- JWT-based authentication with refresh token rotation
- Forced profile completion flow (mobile number required)
- Forgot password with OTP recovery

### 🧑‍✈️ Passenger Features
- Search available rides by pickup and drop-off location (map-based)
- View fare breakdown before booking (base + distance + time + surge)
- Real-time driver live location tracking during ride
- OTP handshake to verify ride start
- In-app wallet, UPI (Razorpay), and cash payment options
- Trip history with PDF export (jsPDF)
- Post-ride reviews and ratings
- Saved places (Home, Work, Favourites)
- SOS emergency trigger during active ride
- Referral program
- Notifications (in-app + Firebase push)
- FAQ and Contact Us support pages
- Multi-language settings

### 🚗 Driver Features
- KYC document submission (licence, Aadhaar, vehicle RC, insurance)
- Admin approval gate before going online
- Publish routes with OSRM-calculated road paths
- Accept / reject incoming booking requests
- Navigate to passenger pickup with live map (Leaflet + OSRM)
- OTP entry to start ride
- Complete ride and trigger automated payment
- Weekly schedule / availability shifts
- Earnings dashboard & payout requests
- Wallet with immutable transaction ledger
- Rate card viewer per vehicle type
- Ratings and trust score tracking

### 🛡️ Admin Panel
- User management (block/unblock accounts)
- Driver KYC approvals with document review
- Fleet overview (live driver positions)
- Analytics dashboard
- Revenue analytics
- System config — live pricing rules per vehicle type (baseFare, costPerKm, perMinRate, surgeCap, etc.)
- SOS alert management
- Review moderation & flag dashboard
- Platform security settings
- Full ride history across all users

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 19** | UI framework |
| **Vite 7** | Build tool & dev server |
| **React Router DOM v7** | Client-side routing |
| **Tailwind CSS v4** | Styling |
| **Leaflet + React Leaflet** | Interactive maps |
| **Socket.io Client** | Real-time live tracking |
| **Firebase SDK** | Push notifications (FCM) |
| **Axios** | HTTP client |
| **Razorpay** (via backend) | UPI payment gateway |
| **jsPDF + html2canvas** | PDF receipt export |
| **Lucide React + React Icons** | Icon library |
| **jwt-decode** | JWT parsing on client |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js + Express 5** | REST API server |
| **MongoDB + Mongoose** | Database & ODM |
| **Socket.io** | Real-time driver location broadcast |
| **Firebase Admin SDK** | Server-side push notifications |
| **Passport.js** | Google & Facebook OAuth |
| **JWT + bcryptjs** | Auth & password hashing |
| **Nodemailer** | Transactional email (OTP, verification) |
| **Cloudinary + Multer** | KYC document image uploads |
| **Razorpay** | Payment gateway integration |
| **Redis (ioredis)** | Caching & rate-limit store |
| **Helmet + CSRF + express-rate-limit** | Security middleware |
| **node-cron** | Scheduled background jobs |
| **OSRM** | Open-source route calculation |

---

## 📁 Project Structure

```
Routemate-MAIN/
├── backend/
│   ├── server.js               # Express app entry point
│   └── src/
│       ├── models/             # Mongoose schemas (User, Trip, Payment, etc.)
│       ├── controllers/        # Route handlers
│       ├── routes/             # API route definitions
│       ├── middleware/         # Auth, rate-limit, upload middleware
│       └── services/           # Business logic (fare engine, notifications, etc.)
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── App.jsx             # Root router with role-based protected routes
        ├── pages/
        │   ├── auth/           # SignIn, Signup, ForgotPassword, CompleteProfile
        │   ├── admin/          # Admin panel pages
        │   ├── driver/         # Driver dashboard pages
        │   ├── passenger/      # Passenger dashboard pages
        │   └── ...             # Shared pages (History, Notifications, Reviews, etc.)
        ├── components/         # Reusable UI components
        ├── context/            # React contexts (Auth, Notification, Language, Toast, Dialog)
        ├── services/           # API service wrappers (axios)
        └── firebase.js         # Firebase FCM setup
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- MongoDB instance (local or Atlas)
- Redis instance
- Cloudinary account
- Firebase project (for push notifications)
- Razorpay account (for UPI payments)

### Installation

```bash
# Clone the repository
git clone https://github.com/Dhruv0626/RouteMate.git
cd RouteMate
```

#### Backend

```bash
cd backend
npm install
cp .env.example .env   # Fill in your environment variables
npm run dev            # Starts with nodemon
```

#### Frontend

```bash
cd frontend
npm install
cp .env.example .env   # Fill in your environment variables
npm run dev            # Starts Vite dev server
```

#### Run Both Concurrently (from `frontend/`)

```bash
cd frontend
npm start   # Runs backend + frontend together via concurrently
```

---

## 🗺️ Application Routes

### Public
| Route | Page |
|---|---|
| `/home` | Landing page |
| `/signin` | User sign in |
| `/signup` | User registration |
| `/forgot-password` | Password recovery |
| `/emergency/:token` | Public SOS emergency page |
| `/admin/signin` | Admin sign in |

### Passenger (Protected)
| Route | Page |
|---|---|
| `/passenger/dashboard` | Passenger dashboard |
| `/passenger/dashboard/find-rides` | Search & book available rides |
| `/passenger/dashboard/my-rides` | Booking requests |
| `/passenger/live-tracking/:rideId` | Live driver tracking |
| `/passenger/dashboard/history` | Trip history |
| `/passenger/dashboard/payments` | Payment history |
| `/passenger/dashboard/places` | Saved places |
| `/passenger/dashboard/reviews` | My reviews |
| `/passenger/dashboard/referral` | Referral program |
| `/passenger/dashboard/notifications` | Notifications |
| `/passenger/dashboard/settings` | App settings |

### Driver (Protected + KYC Approved)
| Route | Page |
|---|---|
| `/driver/dashboard` | Driver dashboard |
| `/driver/dashboard/go-online` | Publish route & go online |
| `/driver/dashboard/bookings` | Incoming booking requests |
| `/driver/dashboard/manage-rides` | Manage published rides |
| `/driver/dashboard/active-rides` | Active rides in progress |
| `/driver/dashboard/earnings` | Earnings summary |
| `/driver/dashboard/wallet` | Wallet & transactions |
| `/driver/dashboard/payouts` | Payout history |
| `/driver/dashboard/payout-request` | Request a payout |
| `/driver/dashboard/schedule` | Weekly availability schedule |
| `/driver/dashboard/rating` | My ratings & trust score |
| `/driver/dashboard/rate-card` | Fare rate card viewer |

### Admin (Protected)
| Route | Page |
|---|---|
| `/admin/dashboard` | Admin dashboard |
| `/admin/dashboard/manage-users` | User management |
| `/admin/dashboard/analytics` | Platform analytics |
| `/admin/dashboard/revenue` | Revenue analytics |
| `/admin/dashboard/driver-approvals` | KYC driver approvals |
| `/admin/dashboard/fleet` | Live fleet overview |
| `/admin/dashboard/settings` | System config & pricing |
| `/admin/dashboard/security` | Security settings |
| `/admin/dashboard/sos` | SOS alerts |
| `/admin/dashboard/history` | Full platform ride history |
| `/admin/reviews` | Review moderation |
| `/admin/flags` | Flagged content dashboard |

---

## 🗄️ Database Schema

RouteMate uses **MongoDB** with the following collections:

| Collection | Role |
|---|---|
| `User` | Identity & auth for all actors (passenger, driver, admin) |
| `DriverProfile` | KYC documents, vehicle info, live location & stats |
| `PublishedRide` | Driver's route offering with embedded booking slot |
| `Trip` | Passenger's journey — source of truth for OTP, phases & payment |
| `Payment` | Financial transaction record per trip |
| `WalletTransaction` | Immutable ledger entry per wallet event |
| `Notification` | In-app & Firebase push alerts |
| `Review` | Post-trip ratings (bidirectional) |
| `SOS` | Safety emergency records |
| `SavedPlace` | User's favourite/frequent addresses |
| `SystemConfig` | Admin-controlled fare & platform configuration |

---

## 🔄 Ride Lifecycle

```
Driver posts route          →  PublishedRide: open
Passenger books             →  PublishedRide: booked
Driver rejects              →  PublishedRide: open  (back to available)
Driver accepts              →  PublishedRide: active  |  Trip: matched  (OTP generated)
Driver arrives at pickup    →  PublishedRide: arrived  |  Trip: arrived
Passenger shares OTP        →  PublishedRide: in_progress  |  Trip: ongoing
Driver completes ride       →  PublishedRide: completed  |  Trip: completed  →  Payment created
```

---

## 💳 Payment System

RouteMate supports three payment methods, all handled through the `Payment` and `WalletTransaction` collections:

| Method | Flow |
|---|---|
| **Cash** | Payment recorded as completed. No wallet touched. |
| **Wallet** | Passenger wallet debited + driver wallet credited atomically in a single MongoDB session. Immutable `WalletTransaction` entries created for both. |
| **UPI** | Processed via Razorpay gateway. `upiTransactionId` stored for reconciliation. |

**Platform commission** is auto-deducted from each payment. `driverEarnings = totalFare − platformFee`.

---

## 🔒 Security

- **JWT** access + refresh token rotation (refresh tokens are bcrypt-hashed in DB)
- **CSRF** protection via `csrf` middleware
- **Helmet** HTTP security headers
- **express-rate-limit** + **Redis** for API rate limiting
- **bcryptjs** for all password hashing
- **Cloudinary** for secure KYC document storage (never stored on server disk)
- **Admin approval gate** — drivers cannot go online without KYC sign-off
- **Account suspension** — instant lock with global 403 interceptor on frontend
- **OTP expiry** — time-limited verification codes for email and ride start



(user?.passengerStats?.totalTrips || 0) === 0