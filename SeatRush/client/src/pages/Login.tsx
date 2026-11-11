
import { useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";

interface LoginProps {
  onSwitchToSignup: () => void;
}

function Login({ onSwitchToSignup }: LoginProps) {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);
      await login(email, password);
      // App automatically displays Movies after successful login.
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Login failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-5 py-10 text-white">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-black text-red-500">
            SeatRush.
          </h1>

          <p className="mt-3 text-zinc-400">
            Welcome back! Your next movie awaits.
          </p>
        </div>

        <h2 className="mb-6 text-2xl font-bold">
          Login to your account
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm text-zinc-300">
              Email address
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none transition focus:border-red-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-300">
              Password
            </label>

            <div className="flex rounded-lg border border-zinc-700 bg-zinc-900 focus-within:border-red-500">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                className="min-w-0 flex-1 bg-transparent px-4 py-3 outline-none"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="px-4 text-sm text-red-400 hover:text-red-300"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-950 p-3 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-red-600 py-3 font-bold transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="mt-7 text-center text-sm text-zinc-400">
          Don't have an account?{" "}
          <button
            onClick={onSwitchToSignup}
            className="font-semibold text-red-400 hover:text-red-300"
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;