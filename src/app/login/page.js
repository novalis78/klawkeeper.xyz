'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Mail, Eye, EyeOff, ArrowRight } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get('expired') === 'true';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const totpInputRef = useRef(null);

  // Autofocus 2FA input when shown
  useEffect(() => {
    if (requires2FA && totpInputRef.current) {
      totpInputRef.current.focus();
    }
  }, [requires2FA]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          totpCode: requires2FA ? totpCode : undefined
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (data.requires2FA) {
          setRequires2FA(true);
          return;
        }
        throw new Error(data.error || 'Login failed');
      }
      
      console.log('Login successful:', data);
      
      // Store authentication token
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        console.log('JWT token stored in localStorage');
      }
      
      // Store user info for mail credential management
      if (data.user?.email) {
        localStorage.setItem('user_email', data.user.email);
        localStorage.setItem('user_id', data.user.id);
        if (data.user.name) {
          localStorage.setItem('user_name', data.user.name);
        }
        if (data.user.fingerprint) {
          localStorage.setItem('user_fingerprint', data.user.fingerprint);
        }
        if (data.user.keyId) {
          localStorage.setItem('user_key_id', data.user.keyId);
        }
      }
      
      // Store mail credentials if provided
      if (data.mailPassword && data.user?.email) {
        try {
          const accountId = `account_${data.user.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
          const mailServer = process.env.NEXT_PUBLIC_MAIL_HOST || 'mail.keykeeper.world';
          
          const credentials = {
            email: data.user.email,
            password: data.mailPassword,
            imapServer: mailServer,
            imapPort: parseInt(process.env.NEXT_PUBLIC_MAIL_IMAP_PORT || '993'),
            imapSecure: process.env.NEXT_PUBLIC_MAIL_IMAP_SECURE !== 'false',
            smtpServer: mailServer,
            smtpPort: parseInt(process.env.NEXT_PUBLIC_MAIL_SMTP_PORT || '587'),
            smtpSecure: process.env.NEXT_PUBLIC_MAIL_SMTP_SECURE === 'true',
            timestamp: Date.now()
          };
          
          // Store credentials directly for now (can be enhanced later)
          localStorage.setItem(`kk_mail_${accountId}_direct`, JSON.stringify(credentials));
          console.log('Mail credentials stored locally');
        } catch (credError) {
          console.error('Failed to store mail credentials:', credError);
          // Non-fatal - continue with login
        }
      }
      
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleBackToPassword = () => {
    setRequires2FA(false);
    setTotpCode('');
    setError('');
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-6 py-12 overflow-hidden">
      {/* Premium Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#111827] to-[#0f172a]"></div>

      {/* Noise Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.015] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=')]"></div>

      <div className="w-full max-w-md relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-block mb-6 group">
              <div className="flex items-center justify-center gap-2">
                <div className="relative">
                  <img
                    src="/logo-small.png"
                    alt="KeyKeeper"
                    className="w-10 h-10 object-contain transition-all duration-300 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-teal-400/0 group-hover:bg-teal-400/30 rounded-lg blur-xl transition-all duration-300 -z-10"></div>
                </div>
                <span className="text-xl font-semibold text-white group-hover:text-primary-300 transition-colors">KeyKeeper</span>
              </div>
            </Link>
            <h1 className="text-[44px] font-semibold mb-3 text-white leading-[1.2] tracking-[-0.02em]">
              {requires2FA ? 'Two-factor code' : 'Welcome back'}
            </h1>
            <p className="text-[15px] text-white/50 leading-[1.6]">
              {requires2FA ? 'Enter your 6-digit authentication code' : 'Sign in to your account'}
            </p>
          </div>

          {/* Form */}
          <form id="login-form" onSubmit={handleSubmit} className="space-y-6 bg-white/[0.05] border border-white/10 rounded-2xl p-8 backdrop-blur-2xl shadow-2xl shadow-black/50 relative before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-white/[0.08] before:to-transparent before:pointer-events-none">
            {sessionExpired && !error && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <p className="text-sm text-amber-300">Your session has expired. Please sign in again.</p>
              </div>
            )}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {!requires2FA ? (
              <>
                {/* Email field */}
                <div>
                  <label htmlFor="email" className="block text-[13px] font-medium text-white/80 mb-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-white text-[15px] placeholder:text-white/30 focus:outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 focus:bg-white/[0.08] transition-all backdrop-blur-xl shadow-inner"
                    placeholder="you@keykeeper.world"
                  />
                </div>

                {/* Password field */}
                <div>
                  <label htmlFor="password" className="block text-[13px] font-medium text-white/80 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-12 bg-white/[0.05] border border-white/10 rounded-xl text-white text-[15px] placeholder:text-white/30 focus:outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 focus:bg-white/[0.08] transition-all backdrop-blur-xl shadow-inner"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Remember me & Forgot password */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-white/20 text-primary-600 focus:ring-primary-500 bg-white/[0.03]"
                    />
                    <label htmlFor="remember-me" className="ml-2 text-[13px] text-white/60">
                      Remember me
                    </label>
                  </div>
                  <Link href="/forgot-password" className="text-[13px] text-primary-400 hover:text-primary-300 transition-colors">
                    Forgot password?
                  </Link>
                </div>
              </>
            ) : (
              /* 2FA Code Input */
              <div>
                <label htmlFor="totp-code" className="block text-[13px] font-medium text-white/80 mb-2">
                  Two-Factor Code
                </label>
                <input
                  ref={totpInputRef}
                  id="totp-code"
                  name="totp-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  autoComplete="one-time-code"
                  required
                  value={totpCode}
                  onChange={(e) => {
                    const newCode = e.target.value.replace(/\D/g, '');
                    setTotpCode(newCode);
                    // Auto-submit when 6 digits are entered
                    if (newCode.length === 6 && !loading) {
                      // Small delay to show the last digit before submitting
                      setTimeout(() => {
                        document.getElementById('login-form').requestSubmit();
                      }, 100);
                    }
                  }}
                  className="w-full px-4 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-white text-[24px] placeholder:text-white/30 focus:outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 focus:bg-white/[0.08] transition-all text-center tracking-widest backdrop-blur-xl shadow-inner"
                  placeholder="000000"
                />
                <p className="mt-2 text-[13px] text-white/50">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading || (!requires2FA && (!email || !password)) || (requires2FA && !totpCode)}
              className="relative w-full py-3 bg-gradient-to-r from-primary-600 to-teal-500 hover:from-primary-700 hover:to-teal-600 text-white text-[15px] rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 hover:scale-[1.02] active:scale-[0.98] overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
              <span className="relative z-10 flex items-center gap-2">
                {loading ? (requires2FA ? 'Verifying...' : 'Signing in...') : (requires2FA ? 'Verify code' : 'Sign in')}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </span>
            </button>

            {/* Back button for 2FA */}
            {requires2FA && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleBackToPassword}
                  className="text-[13px] text-primary-400 hover:text-primary-300 transition-colors"
                >
                  ← Back to password
                </button>
              </div>
            )}
          </form>

          {/* Footer */}
          <div className="mt-8 text-center text-[13px] text-white/50">
            Don't have an account?{' '}
            <Link href="/signup" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
              Create account
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#111827] to-[#0f172a]"></div>
        <div className="relative z-10 text-white/50">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}