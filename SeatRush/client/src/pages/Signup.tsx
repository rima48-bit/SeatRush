
import { useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";

interface SignupProps {
  onSwitchToLogin: () => void;
}

function Signup({ onSwitchToLogin }: SignupProps) {
  const { signup } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (name.trim().length < 2) {
      setError("Name must contain at least 2 characters.");
      return;
    }

    if (password.length < 8 || password.length > 72) {
      setError("Password must contain 8-72 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      await signup(name.trim(), email.trim(), password);
      // App automatically displays Movies after successful signup.
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Signup failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-5 py-10 text-white">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-8 shadow-2xl">
        <div className="mb-7 text-center">
          <h1 className="text-4xl font-black text-red-500">
            SeatRush.
          </h1>

          <p className="mt-3 text-zinc-400">
            Create your account. Never miss a show.
          </p>
        </div>

        <h2 className="mb-6 text-2xl font-bold">
          Create an account
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm text-zinc-300">
              Full name
            </label>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={60}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-red-500"
            />
          </div>

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
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-300">
              Password
            </label>

            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={72}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-300">
              Confirm password
            </label>

            <div className="flex rounded-lg border border-zinc-700 bg-zinc-900 focus-within:border-red-500">
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                required
                className="min-w-0 flex-1 bg-transparent px-4 py-3 outline-none"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="px-4 text-sm text-red-400"
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
            className="w-full rounded-lg bg-red-600 py-3 font-bold transition hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-400">
          Already have an account?{" "}
          <button
            onClick={onSwitchToLogin}
            className="font-semibold text-red-400 hover:text-red-300"
          >
            Login
          </button>
        </p>
      </div>
    </div>
  );
}

export default Signup;