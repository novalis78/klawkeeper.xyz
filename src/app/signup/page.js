'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, Eye, EyeOff, ArrowRight, Lock } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    domain: 'keykeeper.world',
    name: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Domain options
  const domainOptions = [
    { value: 'keykeeper.world', label: 'keykeeper.world' },
    { value: 'phoneshield.ai', label: 'phoneshield.ai' }
  ];

  // Check username availability with debouncing
  useEffect(() => {
    if (formData.username.length > 2) {
      const timeoutId = setTimeout(() => {
        checkUsernameAvailability(formData.username, formData.domain);
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setIsAvailable(null);
    }
  }, [formData.username, formData.domain]);

  const checkUsernameAvailability = async (username, domain) => {
    if (username.length < 3) return;

    setIsChecking(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      // Mock check - certain usernames are "taken"
      const takenUsernames = ['admin', 'info', 'test', 'user', 'support', 'hello'];
      const isTaken = takenUsernames.includes(username.toLowerCase());

      setIsAvailable(!isTaken);
    } catch (err) {
      console.error('Error checking username:', err);
    } finally {
      setIsChecking(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.username || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (!isAvailable) {
      setError('Please choose an available username');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!agreedToTerms) {
      setError('Please agree to the terms of service');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const email = `${formData.username}@${formData.domain}`;

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password: formData.password,
          name: formData.name || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Clear any old user data first
      localStorage.removeItem('user_email');
      localStorage.removeItem('user_id');
      localStorage.removeItem('user_fingerprint');
      localStorage.removeItem('user_key_id');

      // Store new token
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
      }

      // Store user information
      if (data.user) {
        localStorage.setItem('user_email', data.user.email);
        localStorage.setItem('user_id', data.user.id);
        if (data.user.name) {
          localStorage.setItem('user_name', data.user.name);
        }
      }

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
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
            <h1 className="text-[44px] font-semibold mb-3 text-white leading-[1.2] tracking-[-0.02em]">Create your account</h1>
            <p className="text-[15px] text-white/50 leading-[1.6]">Get your secure email address</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6 bg-white/[0.03] border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {/* Username Picker */}
            <div>
              <label htmlFor="username" className="block text-[13px] font-medium text-white/80 mb-2">
                Choose your email address
              </label>
              <div className="flex rounded-xl overflow-hidden border border-white/10 focus-within:border-primary-500/50 focus-within:ring-2 focus-within:ring-primary-500/20 transition-all bg-white/[0.03]">
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="flex-1 px-4 py-3 bg-transparent text-white placeholder:text-white/30 focus:outline-none text-[15px]"
                  placeholder="username"
                  autoComplete="off"
                  required
                />
                <div className="flex items-center px-4 bg-white/[0.03] border-l border-white/10">
                  <span className="text-white/40 text-sm mr-1">@</span>
                  <select
                    name="domain"
                    value={formData.domain}
                    onChange={handleChange}
                    className="bg-transparent text-sm text-white/70 focus:outline-none cursor-pointer"
                  >
                    {domainOptions.map(domain => (
                      <option key={domain.value} value={domain.value} className="bg-[#050505]">
                        {domain.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Availability indicator */}
              {formData.username.length > 2 && (
                <div className="mt-2 flex items-center text-sm">
                  {isChecking ? (
                    <div className="flex items-center text-white/40">
                      <div className="w-4 h-4 border-2 border-white/20 border-t-primary-500 rounded-full animate-spin mr-2" />
                      Checking availability...
                    </div>
                  ) : isAvailable ? (
                    <div className="flex items-center text-primary-400">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Available!
                    </div>
                  ) : isAvailable === false ? (
                    <div className="flex items-center text-red-400">
                      <XCircle className="w-4 h-4 mr-2" />
                      Not available
                    </div>
                  ) : null}
                </div>
              )}

              {formData.username.length > 0 && formData.username.length < 3 && (
                <p className="mt-2 text-xs text-amber-400">
                  Username must be at least 3 characters
                </p>
              )}
            </div>

            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-[13px] font-medium text-white/80 mb-2">
                Display name (optional)
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white text-[15px] placeholder:text-white/30 focus:outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 transition-all"
                placeholder="Your name"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-[13px] font-medium text-white/80 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white text-[15px] placeholder:text-white/30 focus:outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 transition-all"
                  placeholder="At least 8 characters"
                  required
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

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-[13px] font-medium text-white/80 mb-2">
                Confirm password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white text-[15px] placeholder:text-white/30 focus:outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 transition-all"
                  placeholder="Confirm your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Terms checkbox */}
            <div className="flex items-start">
              <input
                type="checkbox"
                id="terms"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-white/20 text-primary-600 focus:ring-primary-500 bg-white/[0.03]"
              />
              <label htmlFor="terms" className="ml-3 text-[13px] text-white/60 leading-relaxed">
                I agree to the{' '}
                <Link href="/terms" className="text-primary-400 hover:text-primary-300 underline">
                  terms of service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-primary-400 hover:text-primary-300 underline">
                  privacy policy
                </Link>
              </label>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading || (formData.username.length > 0 && !isAvailable)}
              className="w-full py-3 bg-gradient-to-r from-primary-600 to-teal-500 hover:from-primary-700 hover:to-teal-600 text-white text-[15px] rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40"
            >
              {loading ? 'Creating account...' : 'Create account'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center text-[13px] text-white/50">
            Already have an account?{' '}
            <Link href="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
              Sign in
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
