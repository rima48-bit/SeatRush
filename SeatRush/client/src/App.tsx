import { useState, useEffect } from "react";

import Movies from "./pages/Movies";
import SeatSelection from "./pages/SeatSelection";
import BookingHistory from "./pages/BookingHistory";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

import { useAuth } from "./context/AuthContext";

type Page = "movies" | "seats" | "history";
type AuthPage = "login" | "signup";

function App() {
  const { user, loading } = useAuth();

  const [selectedMovie, setSelectedMovie] = useState<string | null>(null);
  const [page, setPage] = useState<Page>("movies");
  const [authPage, setAuthPage] = useState<AuthPage>("login");
  const [previousPage, setPreviousPage] = useState<Page>("movies");

  // Reset navigation after login or logout.
  useEffect(() => {
    if (user) {
      setPage("movies");
      setSelectedMovie(null);
    } else {
      setPage("movies");
      setSelectedMovie(null);
    }
  }, [user]);

  const chooseMovie = (movie: string) => {
    setSelectedMovie(movie);
    setPage("seats");
  };

  const openHistory = () => {
    setPreviousPage(page);
    setPage("history");
  };

  const goBack = () => {
    setPage(previousPage);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <h1 className="text-4xl font-black text-red-500">
            SeatRush.
          </h1>
          <p className="mt-3 text-zinc-400">
            Loading your experience...
          </p>
        </div>
      </div>
    );
  }

  // Authentication screens
  if (!user) {
    return (
      <div className="min-h-screen bg-black">
        {authPage === "login" ? (
          <Login
            onSwitchToSignup={() => setAuthPage("signup")}
          />
        ) : (
          <Signup
            onSwitchToLogin={() => setAuthPage("login")}
          />
        )}
      </div>
    );
  }

  // Main application
  return (
    <div className="min-h-screen bg-black text-white">

      {page === "movies" && (
        <Movies onChooseMovie={chooseMovie} />
      )}

      {page === "seats" && selectedMovie && (
        <SeatSelection
          movie={selectedMovie}
          onViewBookings={openHistory}
        />
      )}

      {page === "history" && (
        <BookingHistory onBack={goBack} />
      )}

      {page !== "history" && (
        <button
          onClick={openHistory}
          className="fixed bottom-5 right-5 z-50 rounded-full bg-red-600 px-5 py-3 font-bold text-white shadow-xl transition hover:bg-red-700"
        >
          My Bookings
        </button>
      )}
    </div>
  );
}

export default App;