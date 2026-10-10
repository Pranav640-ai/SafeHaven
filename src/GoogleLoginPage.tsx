import { useState } from 'react';
import { type User } from 'firebase/auth';
import { signInWithGoogle } from './services/googleAuth';
import { ArrowRight, Compass, ShieldCheck, Sparkles } from 'lucide-react';
import './GoogleLoginPage.css';

interface GoogleLoginPageProps {
  onLoginSuccess?: (user: User) => void;
  onGuestContinue?: () => void;
}

export default function GoogleLoginPage({ onLoginSuccess, onGuestContinue }: GoogleLoginPageProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const firebaseMessage = (code?: string) => {
    switch (code) {
      case 'auth/popup-blocked': return 'Allow pop-ups in your browser, then try again.';
      case 'auth/unauthorized-domain': return 'This website is not on Firebase’s authorized domain list.';
      case 'auth/operation-not-allowed': return 'Google sign-in must be enabled in Firebase Authentication.';
      case 'auth/android-not-configured': return 'Google sign-in is being set up for Android. You can continue as guest.';
      case 'auth/native-sign-in-failed': return 'Could not sign in. Check internet, Google Play services and the app’s Android registration.';
      case 'auth/network-request-failed': return 'Unable to connect. Check your internet and try again.';
      default: return 'Google sign-in failed. Please try again.';
    }
  };

  async function handleGoogleLogin() {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      onLoginSuccess?.(result.user);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setError(firebaseMessage(code));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="preview-stage sh-login-stage">
      <main className="phone-shell sh-login-phone" aria-busy={loading}>
        <section className="sh-login-hero" aria-label="Meridian welcome">
          <div className="sh-login-brand"><span className="sh-brand-icon"><ShieldCheck size={23} strokeWidth={2}/></span><span>Meridian</span></div>
          <div className="sh-hero-art" aria-hidden="true">
            <div className="sh-orbit sh-orbit-one"/><div className="sh-orbit sh-orbit-two"/>
            <div className="sh-orbit-chip sh-chip-left"><Sparkles size={22}/></div>
            <div className="sh-hero-shield"><ShieldCheck size={66} strokeWidth={1.6}/></div>
            <div className="sh-orbit-chip sh-chip-right"><Compass size={24}/></div>
          </div>
          <div className="sh-hero-copy"><span>YOUR JOURNEY, WITH CONFIDENCE</span><h1>Explore freely.<br/><em>Feel safer.</em></h1></div>
        </section>
        <section className="sh-login-panel">
          <div className="sh-login-intro"><h2>Welcome to Meridian</h2><p>Your safety companion, wherever you go.</p></div>
          <div className="sh-login-actions">
            <button className="sh-google-button" type="button" onClick={handleGoogleLogin} disabled={loading}>
              <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6C44.4 38.03 46.98 31.88 46.98 24.55z"/><path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.6.27-3.14.76-4.59l-7.98-6.2A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
              <span>{loading ? 'Signing in…' : 'Continue with Google'}</span><ArrowRight size={18}/>
            </button>
            <div className="sh-divider"><span/>or<span/></div>
            <button className="sh-guest-button" type="button" onClick={onGuestContinue} disabled={loading}>Continue as guest <ArrowRight size={18}/></button>
            {error && <p className="sh-login-error" role="alert">{error}</p>}
          </div>
          <p className="sh-login-note">Plan smarter. Stay connected. Travel confidently.</p>
        </section>
      </main>
    </div>
  );
}
