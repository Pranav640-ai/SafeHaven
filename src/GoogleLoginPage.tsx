import { useState } from "react";
import { signInWithPopup, type User } from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import { ShieldCheck, Compass, Sparkles, ArrowRight } from "lucide-react";

interface GoogleLoginPageProps {
  onLoginSuccess?: (user: User) => void;
  onGuestContinue?: () => void;
}

export default function GoogleLoginPage({
  onLoginSuccess,
  onGuestContinue,
}: GoogleLoginPageProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGoogleLogin() {
    setError("");
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      onLoginSuccess?.(result.user);
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };

      if (firebaseError.code === "auth/popup-closed-by-user") {
        setError("Sign-in was cancelled. Please try again.");
      } else if (firebaseError.code === "auth/unauthorized-domain") {
        setError("This website domain is not authorized in Firebase yet.");
      } else {
        setError("Google sign-in failed. Please try again.");
      }

      console.error("Google sign-in error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-art">
        <div className="login-top">
          <div className="brand">
            <span className="brand-symbol">
              <ShieldCheck size={21} />
            </span>
            <span>
              Safe<span className="brand-ai">Haven</span>
            </span>
          </div>

          <button
            className="login-skip"
            type="button"
            onClick={onGuestContinue}
          >
            Explore
          </button>
        </div>

        <div className="login-visual" aria-hidden="true">
          <div className="orbit" />
          <div className="orbit orbit-two" />
          <div className="login-point main-point">
            <ShieldCheck size={54} />
          </div>
          <div className="login-point side-point">
            <Compass size={25} />
          </div>
          <div className="login-point left-point">
            <Sparkles size={22} />
          </div>
        </div>

        <div className="login-art-copy">
          <span>YOUR JOURNEY, WITH CONFIDENCE</span>
          <h1>
            Explore freely.<br />
            <em>Feel safer.</em>
          </h1>
        </div>
      </section>

      <section className="login-panel">
        <h2>Welcome to SafeHaven</h2>
        <p>Sign in to access your personalized safety companion.</p>

        <button
          className="guest-button"
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{ marginTop: 26, minHeight: 55 }}
        >
          <svg width="19" height="19" viewBox="0 0 48 48" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
            />
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.42 37.95 46.98 31.84 46.98 24.55Z"
            />
            <path
              fill="#FBBC05"
              d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.54 2.56 10.78l7.97-6.19Z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.14 1.44-4.89 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
            />
          </svg>

          <span>{loading ? "Signing in..." : "Continue with Google"}</span>
          {!loading && <ArrowRight size={17} />}
        </button>

        {error && (
          <p role="alert" style={{ color: "#a14746", marginTop: 13, lineHeight: 1.5 }}>
            {error}
          </p>
        )}

        <div className="or-divider">
          <span />
          or
          <span />
        </div>

        <button
          className="primary-button login-cta"
          type="button"
          onClick={onGuestContinue}
        >
          Continue as guest <ArrowRight size={17} />
        </button>

        <p className="login-legal">
          By continuing, you agree to use SafeHaven responsibly. Your Google account
          is used to authenticate your sign-in.
        </p>
      </section>
    </main>
  );
}
