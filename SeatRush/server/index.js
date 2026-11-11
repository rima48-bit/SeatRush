
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const Database = require("better-sqlite3");
require("dotenv").config();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is missing from .env");
}
const SHOW_ID = "show-1";
const TICKET_PRICE = 250;
const LOCK_DURATION = 60_000;

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174"
];

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "DELETE"]
  }
});

// Database
const db = new Database("seatrush.db");

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS seats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    show_id TEXT NOT NULL,
    seat_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'available',
    UNIQUE(show_id, seat_number)
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    show_id TEXT NOT NULL,
    seats TEXT NOT NULL,
    total_price INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS seat_locks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    show_id TEXT NOT NULL,
    seat_number TEXT NOT NULL,
    owner_token TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    UNIQUE(show_id, seat_number)
  );
`);

// Safe database migrations
function addColumnIfMissing(table, column, definition) {
  const columns = db.prepare(
    `PRAGMA table_info(${table})`
  ).all();

  const exists = columns.some(
    (item) => item.name === column
  );

  if (!exists) {
    db.exec(
      `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`
    );
  }
}

addColumnIfMissing("bookings", "owner_token", "TEXT");
addColumnIfMissing("bookings", "idempotency_key", "TEXT");
addColumnIfMissing("bookings", "movie", "TEXT DEFAULT 'Movie'");
// Users table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log("Users database ready!");

// One request key can create only one booking per owner
db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS
  unique_booking_request
  ON bookings(owner_token, idempotency_key)
  WHERE owner_token IS NOT NULL
  AND idempotency_key IS NOT NULL;
`);

// Seed seats without deleting existing data
const insertSeat = db.prepare(`
  INSERT OR IGNORE INTO seats
    (show_id, seat_number, status)
  VALUES (?, ?, ?)
`);

const seedSeats = db.transaction(() => {
  const bookedSeats = [
    "A3", "A4", "B5", "C2",
    "D6", "E3", "F7", "G4"
  ];

  for (const row of "ABCDEFGH") {
    for (let number = 1; number <= 8; number++) {
      const seat = `${row}${number}`;

      insertSeat.run(
        SHOW_ID,
        seat,
        bookedSeats.includes(seat) ? "booked" : "available"
      );
    }
  }
});

seedSeats();

// Socket.IO
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

function notifySeatsChanged(seats) {
  if (!seats.length) return;

  io.emit("seats:changed", {
    showId: SHOW_ID,
    seats,
    timestamp: Date.now()
  });
}
// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Please log in first."
    });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: "Invalid or expired token."
      });
    }

    req.user = decoded;
    next();
  });
}
// Helpers
function validOwnerToken(token) {
  return (
    typeof token === "string" &&
    token.length >= 10 &&
    token.length <= 100
  );
}

function formatBooking(booking) {
  return {
    bookingId: booking.id,
    movie: booking.movie || "Movie",
    seats: JSON.parse(booking.seats),
    totalPrice: booking.total_price,
    createdAt: booking.created_at
  };
}

// USER SIGNUP
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid signup details."
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanName.length < 2 || cleanName.length > 60) {
      return res.status(400).json({
        success: false,
        message: "Name must be between 2 and 60 characters."
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email."
      });
    }

    if (password.length < 8 || password.length > 72) {
      return res.status(400).json({
        success: false,
        message: "Password must be 8-72 characters."
      });
    }

    const existingUser = db.prepare(`
      SELECT id FROM users WHERE email = ?
    `).get(cleanEmail);

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = db.prepare(`
      INSERT INTO users (name, email, password)
      VALUES (?, ?, ?)
    `).run(cleanName, cleanEmail, hashedPassword);

    const token = jwt.sign(
      { userId: Number(result.lastInsertRowid) },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      success: true,
      message: "Account created successfully!",
      token,
      user: {
        id: Number(result.lastInsertRowid),
        name: cleanName,
        email: cleanEmail
      }
    });

  } catch (error) {
    console.error("Signup error:", error);

    res.status(500).json({
      success: false,
      message: "Could not create account."
    });
  }
});
// Homepage
app.get("/", (req, res) => {
  res.send("Welcome to SeatRush Backend 🚀");
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "SeatRush backend is running!",
    realtime: true
  });
});

// Get seats
app.get("/api/seats", (req, res) => {
  try {
    const ownerToken =
      typeof req.query.ownerToken === "string"
        ? req.query.ownerToken
        : "";

    const seats = db.prepare(`
      SELECT
        s.seat_number,
        CASE
          WHEN s.status = 'booked' THEN 'booked'
          WHEN l.seat_number IS NOT NULL THEN 'locked'
          ELSE 'available'
        END AS status,
        CASE
          WHEN l.owner_token = ? THEN 1
          ELSE 0
        END AS lockedByMe,
        l.expires_at
      FROM seats s
      LEFT JOIN seat_locks l
        ON s.show_id = l.show_id
        AND s.seat_number = l.seat_number
        AND l.expires_at > ?
      WHERE s.show_id = ?
      ORDER BY s.seat_number
    `).all(ownerToken, Date.now(), SHOW_ID);

    res.json({ success: true, seats });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Could not fetch seats."
    });
  }
});

// Acquire seat lock
app.post("/api/locks", (req, res) => {
  const { seat, ownerToken } = req.body;

  if (
    typeof seat !== "string" ||
    !/^[A-H][1-8]$/.test(seat) ||
    !validOwnerToken(ownerToken)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid seat or owner token."
    });
  }

  try {
    const acquireLock = db.transaction(() => {
      const now = Date.now();

      db.prepare(`
        DELETE FROM seat_locks
        WHERE show_id = ?
        AND seat_number = ?
        AND expires_at <= ?
      `).run(SHOW_ID, seat, now);

      const seatData = db.prepare(`
        SELECT status FROM seats
        WHERE show_id = ? AND seat_number = ?
      `).get(SHOW_ID, seat);

      if (!seatData || seatData.status === "booked") {
        return {
          success: false,
          message: "Seat is already booked."
        };
      }

      const existingLock = db.prepare(`
        SELECT owner_token
        FROM seat_locks
        WHERE show_id = ?
        AND seat_number = ?
      `).get(SHOW_ID, seat);

      if (
        existingLock &&
        existingLock.owner_token !== ownerToken
      ) {
        return {
          success: false,
          message: "Seat is locked by another user."
        };
      }

      const expiresAt = now + LOCK_DURATION;

      db.prepare(`
        INSERT INTO seat_locks
          (show_id, seat_number, owner_token, expires_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(show_id, seat_number)
        DO UPDATE SET
          owner_token = excluded.owner_token,
          expires_at = excluded.expires_at
      `).run(SHOW_ID, seat, ownerToken, expiresAt);

      return { success: true, expiresAt };
    });

    const result = acquireLock.immediate();

    if (!result.success) {
      return res.status(409).json(result);
    }

    notifySeatsChanged([seat]);
    res.json(result);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Could not lock seat."
    });
  }
});

// Release seat lock
app.delete("/api/locks/:seat", (req, res) => {
  const seat = req.params.seat;
  const ownerToken = req.query.ownerToken;

  if (
    !/^[A-H][1-8]$/.test(seat) ||
    !validOwnerToken(ownerToken)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid request."
    });
  }

  try {
    const result = db.prepare(`
      DELETE FROM seat_locks
      WHERE show_id = ?
      AND seat_number = ?
      AND owner_token = ?
    `).run(SHOW_ID, seat, ownerToken);

    if (result.changes === 1) {
      notifySeatsChanged([seat]);
    }

    res.json({
      success: true,
      released: result.changes === 1
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Could not release seat."
    });
  }
});

// Create booking with idempotency protection
app.post("/api/bookings", (req, res) => {
  const { seats, ownerToken, idempotencyKey, movie } = req.body;

  if (
    !Array.isArray(seats) ||
    !validOwnerToken(ownerToken) ||
    typeof idempotencyKey !== "string" ||
    idempotencyKey.length < 10 ||
    idempotencyKey.length > 100 ||
    seats.length === 0 ||
    seats.length > 8 ||
    !seats.every(
      (seat) =>
        typeof seat === "string" &&
        /^[A-H][1-8]$/.test(seat)
    ) ||
    new Set(seats).size !== seats.length ||
    (movie !== undefined &&
      (typeof movie !== "string" || movie.length > 150))
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid booking details."
    });
  }

  try {
    const bookSeats = db.transaction(() => {
      // Check if this exact request was already completed
      const previousBooking = db.prepare(`
        SELECT *
        FROM bookings
        WHERE owner_token = ?
        AND idempotency_key = ?
      `).get(ownerToken, idempotencyKey);

      if (previousBooking) {
        return {
          success: true,
          duplicate: true,
          ...formatBooking(previousBooking)
        };
      }

      const now = Date.now();

      // Remove expired locks
      db.prepare(`
        DELETE FROM seat_locks
        WHERE expires_at <= ?
      `).run(now);

      const placeholders = seats.map(() => "?").join(",");

      const existingSeats = db.prepare(`
        SELECT seat_number, status
        FROM seats
        WHERE show_id = ?
        AND seat_number IN (${placeholders})
      `).all(SHOW_ID, ...seats);

      if (
        existingSeats.length !== seats.length ||
        existingSeats.some(
          (seat) => seat.status !== "available"
        )
      ) {
        return {
          success: false,
          message: "One or more seats are unavailable."
        };
      }

      // Verify that this user owns every seat lock
      const ownedLocks = db.prepare(`
        SELECT seat_number
        FROM seat_locks
        WHERE show_id = ?
        AND owner_token = ?
        AND expires_at > ?
      `).all(SHOW_ID, ownerToken, now);

      if (
        seats.some(
          (seat) => !ownedLocks.some(
            (lock) => lock.seat_number === seat
          )
        )
      ) {
        return {
          success: false,
          message: "Your seat lock expired. Please select again."
        };
      }

      // Mark seats as booked
      const update = db.prepare(`
        UPDATE seats
        SET status = 'booked'
        WHERE show_id = ?
        AND seat_number = ?
        AND status = 'available'
      `);

      for (const seat of seats) {
        const result = update.run(SHOW_ID, seat);

        if (result.changes !== 1) {
          throw new Error("Booking conflict.");
        }
      }

      const totalPrice = seats.length * TICKET_PRICE;

      const booking = db.prepare(`
        INSERT INTO bookings (
          show_id,
          seats,
          total_price,
          owner_token,
          idempotency_key,
          movie
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        SHOW_ID,
        JSON.stringify(seats),
        totalPrice,
        ownerToken,
        idempotencyKey,
        movie || "Movie"
      );

      // Release the locks used in this booking
      const release = db.prepare(`
        DELETE FROM seat_locks
        WHERE show_id = ?
        AND seat_number = ?
        AND owner_token = ?
      `);

      for (const seat of seats) {
        release.run(SHOW_ID, seat, ownerToken);
      }

      const savedBooking = db.prepare(`
        SELECT * FROM bookings WHERE id = ?
      `).get(booking.lastInsertRowid);

      return {
        success: true,
        duplicate: false,
        ...formatBooking(savedBooking)
      };
    });

    const result = bookSeats.immediate();

    if (!result.success) {
      return res.status(409).json(result);
    }

    if (!result.duplicate) {
      notifySeatsChanged(seats);
    }

    return res.status(result.duplicate ? 200 : 201).json(result);

  } catch (error) {
    console.error("Booking error:", error);

    res.status(500).json({
      success: false,
      message: "Could not complete booking."
    });
  }
});

// Get booking history for one browser owner
app.get("/api/bookings", (req, res) => {
  const ownerToken = req.query.ownerToken;

  if (!validOwnerToken(ownerToken)) {
    return res.status(400).json({
      success: false,
      message: "Valid owner token is required."
    });
  }

  try {
    const bookings = db.prepare(`
      SELECT *
      FROM bookings
      WHERE owner_token = ?
      ORDER BY id DESC
    `).all(ownerToken);

    res.json({
      success: true,
      bookings: bookings.map(formatBooking)
    });

  } catch (error) {
    console.error("History error:", error);

    res.status(500).json({
      success: false,
      message: "Could not fetch booking history."
    });
  }
});

// Release expired locks and broadcast changes
const expiryInterval = setInterval(() => {
  try {
    const now = Date.now();

    const expired = db.prepare(`
      SELECT seat_number
      FROM seat_locks
      WHERE show_id = ?
      AND expires_at <= ?
    `).all(SHOW_ID, now);

    if (!expired.length) return;

    db.prepare(`
      DELETE FROM seat_locks
      WHERE show_id = ?
      AND expires_at <= ?
    `).run(SHOW_ID, now);

    notifySeatsChanged(
      expired.map((item) => item.seat_number)
    );

  } catch (error) {
    console.error("Expiry error:", error);
  }
}, 1000);

// Start server
server.listen(PORT, () => {
  console.log("----------------------------------");
  console.log("SeatRush backend running!");
  console.log(`http://localhost:${PORT}`);
  console.log("Socket.IO ready!");
  console.log("Booking history API ready!");
  console.log("----------------------------------");
});

// Graceful shutdown
function shutdown() {
  clearInterval(expiryInterval);

  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
