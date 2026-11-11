

import { useAuth } from "../context/AuthContext";

function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="flex items-center justify-between border-b border-zinc-800 bg-black px-5 py-5 sm:px-8">

      <div>
        <h1 className="text-2xl font-black text-red-500">
          SeatRush.
        </h1>

        <span className="text-xs text-zinc-500">
          Your movie. Your seat.
        </span>
      </div>

      <div className="flex items-center gap-3 sm:gap-5">

        {user && (
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-white">
              {user.name}
            </p>

            <p className="text-xs text-zinc-500">
              {user.email}
            </p>
          </div>
        )}

        <button
          onClick={logout}
          className="rounded-lg border border-red-600 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-600 hover:text-white"
        >
          Logout
        </button>

      </div>
    </nav>
  );
}

export default Navbar;
