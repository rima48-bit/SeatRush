
import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

import Navbar from "../components/Navbar";

const API_URL = "http://localhost:5000/api";
const SOCKET_URL = "http://localhost:5000";

const rows = ["A", "B", "C", "D", "E", "F", "G", "H"];
const TICKET_PRICE = 250;

type Seat = {
  seat_number: string;
  status: "available" | "booked" | "locked";
  lockedByMe: number;
  expires_at: number | null;
};

type Props = {
  movie: string;
  onViewBookings: () => void;
};

function SeatSelection({ movie, onViewBookings }: Props) {
  const [ownerToken] = useState(() => {
    let token = sessionStorage.getItem("seatrush-owner");

    if (!token) {
      token = crypto.randomUUID();
      sessionStorage.setItem("seatrush-owner", token);
    }

    return token;
  });

  // Keep the same key when retrying an uncertain request
  const idempotencyKey = useRef<string | null>(null);

  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [lockingSeat, setLockingSeat] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
  const [now, setNow] = useState(Date.now());

  const fetchSeats = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_URL}/seats?ownerToken=${encodeURIComponent(ownerToken)}`
      );

      if (!response.ok) {
        throw new Error("Could not fetch seats.");
      }

      const data = await response.json();

      setSeats(data.seats);

      const mySeats = data.seats
        .filter(
          (seat: Seat) =>
            seat.status === "locked" &&
            Boolean(seat.lockedByMe) &&
            seat.expires_at !== null &&
            seat.expires_at > Date.now()
        )
        .map((seat: Seat) => seat.seat_number);

      setSelectedSeats(mySeats);
      setError("");

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not connect to backend."
      );
    } finally {
      setLoading(false);
    }
  }, [ownerToken]);

  // Real-time updates
  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on("connect", () => {
      setSocketConnected(true);
      fetchSeats();
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
    });

    socket.on("connect_error", (err) => {
      console.error("Socket error:", err.message);
      setSocketConnected(false);
    });

    socket.on("seats:changed", (data) => {
      if (data.showId === "show-1") {
        fetchSeats();
      }
    });

    fetchSeats();

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("seats:changed");
      socket.disconnect();
    };
  }, [fetchSeats]);

  // Countdown clock
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Acquire lock
  const acquireLock = async (seatNumber: string) => {
    try {
      setLockingSeat(seatNumber);
      setError("");
      setConfirmation("");

      const response = await fetch(`${API_URL}/locks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          seat: seatNumber,
          ownerToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not lock seat.");
      }

      await fetchSeats();

    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Lock failed."
      );

      await fetchSeats();

    } finally {
      setLockingSeat(null);
    }
  };

  // Release lock
  const releaseLock = async (seatNumber: string) => {
    try {
      setLockingSeat(seatNumber);

      const response = await fetch(
        `${API_URL}/locks/${seatNumber}?ownerToken=${encodeURIComponent(ownerToken)}`,
        { method: "DELETE" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not release seat.");
      }

      await fetchSeats();

    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Release failed."
      );

      await fetchSeats();

    } finally {
      setLockingSeat(null);
    }
  };

  // Seat selection
  const toggleSeat = async (seatNumber: string) => {
    if (booking || lockingSeat) return;

    const seat = seats.find(
      (item) => item.seat_number === seatNumber
    );

    if (!seat || seat.status === "booked") return;

    if (seat.lockedByMe) {
      await releaseLock(seatNumber);
      return;
    }

    if (seat.status === "locked") {
      setError("This seat is reserved by another user.");
      return;
    }

    if (selectedSeats.length >= 8) {
      setError("Maximum 8 seats allowed.");
      return;
    }

    await acquireLock(seatNumber);
  };

  // Booking confirmation with idempotency protection
  const handleBooking = async () => {
    if (
      selectedSeats.length === 0 ||
      booking ||
      lockingSeat
    ) {
      return;
    }

    const seatsToBook = [...selectedSeats];

    if (!idempotencyKey.current) {
      idempotencyKey.current = crypto.randomUUID();
    }

    try {
      setBooking(true);
      setError("");
      setConfirmation("");

      const response = await fetch(`${API_URL}/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          seats: seatsToBook,
          ownerToken,
          idempotencyKey: idempotencyKey.current,
          movie,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // A definitive rejection needs a fresh request key
        idempotencyKey.current = null;

        throw new Error(data.message || "Booking failed.");
      }

      idempotencyKey.current = null;

      setConfirmation(
        `Booking #${data.bookingId} confirmed! Total: ₹${data.totalPrice}`
      );

      await fetchSeats();

    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Booking failed."
      );

      await fetchSeats();

    } finally {
      setBooking(false);
    }
  };

  // Countdown
  const ownLocks = seats.filter(
    (seat) =>
      seat.status === "locked" &&
      Boolean(seat.lockedByMe) &&
      seat.expires_at !== null
  );

  const earliestExpiry = ownLocks.length
    ? Math.min(...ownLocks.map((seat) => seat.expires_at!))
    : null;

  const secondsRemaining = earliestExpiry
    ? Math.max(0, Math.ceil((earliestExpiry - now) / 1000))
    : 0;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;

  const totalPrice = selectedSeats.length * TICKET_PRICE;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <main className="mx-auto max-w-5xl px-6 py-12">

        <div className="mb-10 text-center">
          <p className="text-sm uppercase tracking-widest text-red-500">
            Seat selection
          </p>

          <h2 className="mt-3 text-3xl font-bold">
            Choose your seats
          </h2>

          <p className="mt-2 text-zinc-400">
            {movie} • Today • 7:30 PM
          </p>

          <p className="mt-4 text-xs text-zinc-400">
            {socketConnected
              ? "🟢 Live updates connected"
              : "🔴 Connecting to live updates..."}
          </p>
        </div>

        {/* Cinema screen */}
        <div className="mb-16">
          <div className="mx-auto h-2 max-w-2xl rounded-full bg-red-500 shadow-lg shadow-red-500/30" />

          <p className="mt-4 text-center text-xs tracking-widest text-zinc-500">
            SCREEN THIS WAY
          </p>
        </div>

        {/* Seat grid */}
        {loading ? (
          <p className="py-10 text-center text-zinc-400">
            Loading seats...
          </p>
        ) : (
          <div className="mx-auto max-w-xl">
            {rows.map((row) => (
              <div
                key={row}
                className="mb-3 flex justify-center gap-3"
              >
                <span className="w-5 text-sm text-zinc-500">
                  {row}
                </span>

                <div className="grid grid-cols-8 gap-2">
                  {Array.from({ length: 8 }, (_, index) => {
                    const seatNumber = `${row}${index + 1}`;

                    const seat = seats.find(
                      (item) => item.seat_number === seatNumber
                    );

                    const booked = seat?.status === "booked";
                    const locked = seat?.status === "locked";
                    const mine = Boolean(seat?.lockedByMe);
                    const busy = lockingSeat === seatNumber;

                    let seatClass =
                      "bg-emerald-700 hover:bg-emerald-500";

                    if (booked) {
                      seatClass =
                        "cursor-not-allowed bg-zinc-700 text-zinc-500";
                    } else if (mine) {
                      seatClass = "bg-red-500 text-white";
                    } else if (locked) {
                      seatClass =
                        "cursor-not-allowed bg-yellow-700 text-white";
                    } else if (busy) {
                      seatClass = "bg-blue-600";
                    }

                    return (
                      <button
                        key={seatNumber}
                        disabled={
                          !seat ||
                          booked ||
                          (locked && !mine) ||
                          Boolean(lockingSeat) ||
                          booking
                        }
                        onClick={() => toggleSeat(seatNumber)}
                        className={`h-9 w-9 rounded-lg text-xs transition sm:h-11 sm:w-11 ${seatClass}`}
                      >
                        {busy ? "..." : index + 1}
                      </button>
                    );
                  })}
                </div>

                <span className="w-5 text-sm text-zinc-500">
                  {row}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="mt-12 flex flex-wrap justify-center gap-5 text-sm text-zinc-400">
          <span>🟩 Available</span>
          <span>🟥 Your seats</span>
          <span>🟨 Other user's lock</span>
          <span>⬛ Booked</span>
        </div>

        {/* Countdown */}
        {selectedSeats.length > 0 && (
          <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-red-500/40 bg-red-950/30 p-5 text-center">
            <p className="text-sm text-zinc-300">
              Complete your booking before your reservation expires
            </p>

            <h3 className="mt-2 text-4xl font-bold text-red-400 tabular-nums">
              {String(minutes).padStart(2, "0")}:
              {String(seconds).padStart(2, "0")}
            </h3>
          </div>
        )}

        {/* Booking summary */}
        <div className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h3 className="text-xl font-bold">
            Booking Summary
          </h3>

          <p className="mt-4 text-zinc-400">
            Seats: {selectedSeats.join(", ") || "None selected"}
          </p>

          <p className="mt-3 text-zinc-400">
            Tickets: {selectedSeats.length}
          </p>

          <div className="mt-5 flex justify-between border-t border-zinc-800 pt-5">
            <span className="font-bold">Total</span>

            <span className="text-2xl font-bold text-red-500">
              ₹{totalPrice}
            </span>
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-red-950/40 p-3 text-sm text-red-400">
              {error}
            </p>
          )}

          {confirmation && (
            <div className="mt-4 rounded-lg bg-emerald-900/30 p-4 text-sm text-emerald-400">
              <p>{confirmation}</p>

              <button
                onClick={onViewBookings}
                className="mt-3 font-bold underline"
              >
                View my booking →
              </button>
            </div>
          )}

          <button
            disabled={
              selectedSeats.length === 0 ||
              booking ||
              Boolean(lockingSeat) ||
              loading ||
              secondsRemaining === 0
            }
            onClick={handleBooking}
            className="mt-7 w-full rounded-xl bg-red-600 py-4 font-bold hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-zinc-700"
          >
            {booking
              ? "Processing booking..."
              : "Confirm booking →"}
          </button>

          <button
            onClick={fetchSeats}
            disabled={loading || booking}
            className="mt-3 w-full rounded-xl border border-zinc-700 py-3 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            Refresh seat availability
          </button>

          <button
            onClick={onViewBookings}
            className="mt-3 w-full rounded-xl border border-red-500/40 py-3 text-sm text-red-400 hover:bg-red-950/30"
          >
            View booking history
          </button>
        </div>
      </main>
    </div>
  );
}

export default SeatSelection;
