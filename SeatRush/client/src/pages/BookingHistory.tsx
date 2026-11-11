
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";

const API_URL = "http://localhost:5000/api";

type Booking = {
  bookingId: number;
  movie: string;
  seats: string[];
  totalPrice: number;
  createdAt: string;
};

type Props = {
  onBack: () => void;
};

function BookingHistory({ onBack }: Props) {
  const [ownerToken] = useState(() => {
    let token = sessionStorage.getItem("seatrush-owner");

    if (!token) {
      token = crypto.randomUUID();
      sessionStorage.setItem("seatrush-owner", token);
    }

    return token;
  });

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await fetch(
          `${API_URL}/bookings?ownerToken=${encodeURIComponent(ownerToken)}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Could not load booking history."
          );
        }

        setBookings(data.bookings);

      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [ownerToken]);

  const formatDate = (date: string) => {
    const parsed = new Date(date.replace(" ", "T") + "Z");

    if (Number.isNaN(parsed.getTime())) {
      return date;
    }

    return parsed.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <main className="mx-auto max-w-4xl px-6 py-12">

        <button
          onClick={onBack}
          className="mb-8 text-sm text-zinc-400 hover:text-white"
        >
          ← Back
        </button>

        <div className="mb-10">
          <p className="text-sm uppercase tracking-widest text-red-500">
            Your account
          </p>

          <h1 className="mt-3 text-3xl font-bold">
            My Bookings
          </h1>

          <p className="mt-2 text-zinc-400">
            All your previous SeatRush reservations.
          </p>
        </div>

        {loading && (
          <p className="py-10 text-center text-zinc-400">
            Loading your bookings...
          </p>
        )}

        {error && (
          <div className="rounded-xl bg-red-950/40 p-4 text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && bookings.length === 0 && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-10 text-center">
            <div className="text-5xl">🎬</div>

            <h2 className="mt-5 text-xl font-bold">
              No bookings yet
            </h2>

            <p className="mt-2 text-zinc-400">
              Your movie tickets will appear here after booking.
            </p>

            <button
              onClick={onBack}
              className="mt-6 rounded-xl bg-red-600 px-6 py-3 font-bold hover:bg-red-700"
            >
              Browse movies
            </button>
          </div>
        )}

        <div className="space-y-5">
          {bookings.map((booking) => (
            <div
              key={booking.bookingId}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-bold text-red-400">
                  Booking #{booking.bookingId}
                </span>

                <span className="rounded-full bg-emerald-900/40 px-3 py-1 text-xs font-semibold text-emerald-400">
                  Confirmed
                </span>
              </div>

              <h2 className="mt-5 text-2xl font-bold">
                {booking.movie}
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                {formatDate(booking.createdAt)}
              </p>

              <div className="mt-5 border-t border-zinc-800 pt-5">
                <div className="flex justify-between gap-3">
                  <span className="text-zinc-400">
                    Seats
                  </span>

                  <span className="font-semibold">
                    {booking.seats.join(", ")}
                  </span>
                </div>

                <div className="mt-4 flex justify-between gap-3">
                  <span className="text-zinc-400">
                    Tickets
                  </span>

                  <span>
                    {booking.seats.length}
                  </span>
                </div>

                <div className="mt-5 flex justify-between border-t border-zinc-800 pt-5">
                  <span className="font-bold">
                    Total
                  </span>

                  <span className="text-xl font-bold text-red-500">
                    ₹{booking.totalPrice}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {!loading && bookings.length > 0 && (
          <button
            onClick={onBack}
            className="mt-8 w-full rounded-xl bg-red-600 py-4 font-bold hover:bg-red-700"
          >
            Back to SeatRush
          </button>
        )}

      </main>
    </div>
  );
}

export default BookingHistory;
