
# SeatRush – High-Concurrency Movie Ticket Booking System

SeatRush is a full-stack movie ticket booking application designed to address concurrency challenges in real-time seat reservation systems.

The project focuses on preventing double bookings, managing temporary seat reservations, handling duplicate booking requests, and maintaining consistent seat availability when multiple users attempt to reserve the same seat simultaneously.

Built using React, TypeScript, Node.js, Express, SQLite, and Socket.IO, with a planned migration towards Redis-based distributed locking.

## Project Overview

In a typical ticket booking system, multiple users may attempt to reserve the same seat simultaneously. Without proper concurrency control, this can result in race conditions, duplicate bookings, and inconsistent database records.

SeatRush addresses these challenges through atomic database transactions, temporary seat locks, idempotency keys, reservation timeouts, and real-time communication.

## Key Features

### Authentication and Authorization
- User registration and login.
- JWT-based authentication.
- Password hashing using bcrypt.
- Persistent authentication sessions.
- Logout functionality.

### Seat Reservation
- Interactive movie seat selection.
- Temporary seat locking.
- Reservation expiration after 60 seconds.
- Automatic cleanup of expired locks.
- Prevention of conflicting seat reservations.
- Real-time seat availability updates using Socket.IO.

### Booking Management
- Atomic booking transactions.
- Idempotency keys to prevent duplicate booking creation.
- Seat ownership verification.
- Booking confirmation.
- Booking history with reservation details and timestamps.

### Concurrency Control
- Atomic SQLite transactions for seat locking.
- Database uniqueness constraints.
- Conflict detection during simultaneous reservation requests.
- Transactional booking confirmation.
- Protection against duplicate booking submissions.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React 19, TypeScript |
| Styling | Tailwind CSS |
| Build Tool | Vite |
| Backend | Node.js, Express.js |
| Database | SQLite, better-sqlite3 |
| Authentication | JWT, bcryptjs |
| Real-Time Communication | Socket.IO |
| Concurrency Management | Atomic database transactions |
| Frontend Deployment | Vercel |
| Backend Deployment | Render |

## System Architecture

```text
              Client Applications
                       |
                       v
             React + TypeScript
                       |
                 HTTP / Socket.IO
                       |
                       v
                Express Server
                       |
              Authentication Layer
                    (JWT)
                       |
                       v
              Booking Management
                       |
              Seat Lock Management
                       |
                       v
              Atomic Transactions
                       |
                       v
                  SQLite DB
                 /          \
                v            v
           Seat Locks     Bookings
                       |
                       v
                 Socket.IO
                       |
                       v
             Real-Time Updates
```

## Core Engineering Challenge: Concurrent Seat Booking

Consider a scenario where 500 users attempt to reserve the same seat simultaneously.

The system must guarantee that only one user successfully acquires the reservation lock.

Without appropriate concurrency control, simultaneous requests can cause race conditions and duplicate reservations.

### Current Seat Locking Implementation

SeatRush currently uses SQLite transactions to manage concurrent seat reservations.

The reservation workflow is:

1. A user selects a seat.
2. The backend checks the current booking status.
3. Expired reservation locks are removed.
4. Existing lock ownership is verified.
5. An atomic database transaction attempts to acquire the lock.
6. A successful lock receives a 60-second expiration timestamp.
7. Other users are prevented from acquiring the same seat.
8. Socket.IO broadcasts seat availability changes.

The database uses a unique constraint on the show and seat combination to prevent multiple active lock records for the same seat.

### Idempotent Booking Requests

Booking requests use unique idempotency keys to prevent duplicate booking creation.

Each request includes:
- Selected seats.
- Reservation owner token.
- Idempotency key.
- Movie information.

Before creating a booking, the backend checks whether the same request has already been processed.

If an existing booking is found, the original booking response is returned instead of creating another booking.

This approach helps protect against duplicate submissions and retry-related failures.

## Planned Enhancement: Redis-Based Distributed Locking

A planned improvement is migrating seat locking from SQLite to Redis-based distributed locking.

Redis will provide centralized lock coordination across multiple backend instances.

### Proposed Architecture

```text
             500 Concurrent Users
                       |
                       v
                 Load Balancer
                       |
                       v
              Multiple API Servers
                       |
                       v
                     Redis
                       |
                Distributed Locks
                       |
                       v
                Booking Database
```

### Planned Improvements

- Redis-based distributed seat locks.
- Atomic lock acquisition.
- Unique lock ownership tokens.
- TTL-based reservation expiration.
- Ownership-verified lock release.
- Consistent idempotency across backend instances.
- Improved horizontal scalability.
- Concurrent load testing with 500 simulated users.

**Note:** Redis integration and the 500-user benchmark are planned enhancements and are not yet implemented in the current version.

## Project Structure

```text
SeatRush/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── MovieCard.tsx
│   │   │   ├── Navbar.tsx
│   │   │   ├── Seat.tsx
│   │   │   └── SeatLegend.tsx
│   │   │
│   │   ├── context/
│   │   │   └── AuthContext.tsx
│   │   │
│   │   ├── pages/
│   │   │   ├── BookingConfirmation.tsx
│   │   │   ├── BookingHistory.tsx
│   │   │   ├── Home.tsx
│   │   │   ├── Movies.tsx
│   │   │   ├── SeatSelection.tsx
│   │   │   ├── Login.tsx
│   │   │   └── Signup.tsx
│   │   │
│   │   ├── App.tsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.tsx
│   │
│   └── package.json
│
├── server/
│   ├── index.js
│   └── package.json
│
└── README.md
```

## Installation and Setup

### Prerequisites

- Node.js
- npm
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/rima48-bit/SeatRush.git
cd SeatRush
```

### 2. Install Backend Dependencies

```bash
cd server
npm install
```

### 3. Configure Environment Variables

Create a `.env` file inside the `server` directory.

```env
PORT=5000
JWT_SECRET=your_strong_random_secret
```

Do not commit environment variables or secrets to version control.

### 4. Start the Backend

```bash
node index.js
```

Backend URL:

```text
http://localhost:5000
```

### 5. Install Frontend Dependencies

Open another terminal:

```bash
cd client
npm install
```

### 6. Start the Frontend

```bash
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup` | Register a new user |
| POST | `/api/auth/login` | Authenticate a user |
| GET | `/api/health` | Check backend availability |
| GET | `/api/seats` | Retrieve seat availability |
| POST | `/api/locks` | Acquire a seat lock |
| DELETE | `/api/locks/:seat` | Release a seat lock |
| POST | `/api/bookings` | Create a booking |
| GET | `/api/bookings` | Retrieve booking history |

## Testing and Performance Goals

The project is designed to investigate concurrent reservation scenarios.

### Target Load Test Scenario

| Parameter | Target |
|---|---|
| Simulated concurrent users | 500 |
| Target seat | A1 |
| Reservation timeout | 60 seconds |
| Expected successful lock owners | 1 |
| Expected conflicting requests | 499 |

The load test will evaluate:

- Lock acquisition success rate.
- Concurrent request handling.
- Booking consistency.
- Duplicate booking prevention.
- API response latency.
- Throughput under concurrent load.

These values describe the intended test scenario, not measured performance results.

## Security Considerations

- Password hashing using bcrypt.
- JWT-based authentication.
- Backend request validation.
- Seat lock ownership verification.
- Database constraints.
- Idempotency protection.

Additional production hardening includes rate limiting, secure token management, authenticated ownership checks on every booking operation, and distributed lock management.

## Deployment

The intended deployment architecture separates frontend and backend services.

| Service | Platform |
|---|---|
| Frontend | Vercel |
| Backend | Render |
| Database | SQLite with persistent storage |

**Live Application:** [Add deployment URL.](https://seat-rush-beryl.vercel.app/)

**Backend Link** [https://seatrush-uwn0.onrender.com]

## Learning Outcomes

This project demonstrates practical implementation and understanding of:

- Full-stack application architecture.
- REST API development.
- JWT authentication.
- Database transactions.
- Race conditions and concurrency control.
- Idempotent API design.
- Reservation timeouts.
- Real-time communication.
- Distributed locking concepts.
- Scalability and system design fundamentals.

## Author

**Rima**

GitHub: https://github.com/rima48-bit

---

**SeatRush – A concurrency-focused movie ticket booking system designed to prevent double bookings and maintain reservation consistency.**
