import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { safeReturnTo } from "@/lib/authReturnTo";
import { isAccountNotFoundError } from "@/lib/authErrors";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [accountNotFound, setAccountNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setAccountNotFound(false);
    setLoading(true);

    // Deterministic existence check first: the platform's login error text
    // can't tell a missing account from a wrong password. A check that itself
    // fails is ignored so a real customer is never blocked by it.
    let exists = null;
    try {
      const res = await base44.functions.invoke("checkAccountExists", { email });
      if (typeof res?.data?.exists === "boolean") exists = res.data.exists;
    } catch (err) {
      exists = null;
    }

    if (exists === false) {
      setAccountNotFound(true);
      setError("No account found for that email.");
      setLoading(false);
      return;
    }

    try {
      // Return the customer to wherever they were headed (?returnTo=), so signing
      // in from checkout lands back on checkout with the bag still full.
      const returnTo = safeReturnTo();
      await base44.auth.loginViaEmailPassword(email, password);
      window.location.href = returnTo;
    } catch (err) {
      // The check said the account is there, so the password is what failed.
      // Otherwise fall back to the platform error text (last resort only).
      if (exists === true) {
        setError("Incorrect password for that account.");
      } else if (isAccountNotFoundError(err)) {
        setAccountNotFound(true);
        setError("No account found for that email.");
      } else {
        setError(err.message || "Invalid email or password");
      }
    } finally {
      setLoading(false);
    }
  };

  const useDifferentEmail = () => {
    setEmail("");
    setPassword("");
    setError("");
    setAccountNotFound(false);
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", safeReturnTo());
  };

  return (
    <AuthLayout
      icon={LogIn}
      title="Welcome back"
      subtitle="Log in to your account"
      footer={
        <>
          Don't have an account?{" "}
          <Link to={`/register${window.location.search}`} className="text-primary font-medium hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <Button
        variant="outline"
        className="w-full h-12 text-sm font-medium mb-6"
        onClick={handleGoogle}
      >
        <GoogleIcon className="w-5 h-5 mr-2" />
        Continue with Google
      </Button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">or</span>
        </div>
      </div>

      {accountNotFound ? (
        <div className="mb-4 p-4 rounded-lg bg-muted text-sm">
          <p className="font-semibold text-foreground">No account found for that email.</p>
          <p className="mt-1 text-muted-foreground">
            All previous Flavor Isle accounts were deleted, so your old login no longer works.
            Create a new account and you're back in.
          </p>
          <Link
            to={`/register?email=${encodeURIComponent(email)}`}
            className="btn-cherry chrome-hover mt-4 flex w-full items-center justify-center py-3 text-sm"
          >
            Create a new account
          </Link>
          <button
            type="button"
            onClick={useDifferentEmail}
            className="mt-3 block text-xs text-muted-foreground underline hover:text-foreground"
          >
            Use a different email
          </button>
        </div>
      ) : (
        error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )
      )}

      <div className="mb-5 rounded-lg bg-muted px-4 py-3 text-xs text-muted-foreground">
        Heads up: all previous Flavor Isle accounts were deleted. Please create a new account
        to use Star Rewards online.
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Logging in...
            </>
          ) : (
            "Log in"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}