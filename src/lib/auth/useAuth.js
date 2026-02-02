'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { initializeSessionKey, clearAllCredentials } from '@/lib/mail/mailCredentialManager';

// Create context for authentication
const AuthContext = createContext();

/**
 * Authentication provider component
 * 
 * Manages the authentication state and provides auth methods to child components
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        
        if (!token) {
          setLoading(false);
          return;
        }
        
        // Verify token with the server
        const response = await fetch('/api/auth/verify', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        const data = await response.json();
        
        if (response.ok && data.authenticated) {
          // Make sure fingerprint is included
          // If response doesn't have fingerprint but we have it stored, add it
          if (!data.user?.fingerprint) {
            console.log('Fingerprint missing from user data, looking in storage');
            const storedFingerprint = localStorage.getItem('user_fingerprint');
            if (storedFingerprint) {
              console.log(`Adding stored fingerprint to user data: ${storedFingerprint}`);
              data.user.fingerprint = storedFingerprint;
            } else {
              console.warn('No fingerprint found in localStorage');
              // Try to extract from token payload directly
              try {
                const token = localStorage.getItem('auth_token');
                if (token) {
                  // Parse JWT without verification
                  const base64Url = token.split('.')[1];
                  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                  const payload = JSON.parse(atob(base64));
                  if (payload.fingerprint) {
                    console.log(`Extracted fingerprint from token: ${payload.fingerprint}`);
                    data.user.fingerprint = payload.fingerprint;
                    localStorage.setItem('user_fingerprint', payload.fingerprint);
                  }
                }
              } catch (tokenError) {
                console.error('Error extracting fingerprint from token:', tokenError);
              }
            }
          }
          
          setUser(data.user);
          
          // Initialize session key for secure credential storage
          if (data.user && data.user.fingerprint) {
            try {
              await initializeSessionKey(token, data.user.fingerprint);
              console.log('Session key initialized successfully');
            } catch (sessionError) {
              console.error('Failed to initialize session key:', sessionError);
            }
          } else {
            console.warn('Missing user fingerprint - mail credentials may not work');
          }
        } else {
          // Token is invalid, remove it
          console.log('Token is invalid or expired, logging out user');
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_email');
          localStorage.removeItem('user_id');
          localStorage.removeItem('user_fingerprint');
          localStorage.removeItem('user_key_id');
          clearAllCredentials();
          // Redirect to login page
          router.push('/login?expired=true');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_email');
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_fingerprint');
        localStorage.removeItem('user_key_id');
        clearAllCredentials();
        // Redirect to login page on error
        router.push('/login?expired=true');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  /**
   * Log out the current user
   */
  const logout = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      
      if (token) {
        // Call logout API
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        // Remove token from localStorage
        localStorage.removeItem('auth_token');
      }
      
      // Clear all stored credentials
      clearAllCredentials();
      
      // Clear user state
      setUser(null);
      
      // Redirect to home page
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  
  /**
   * Get authentication token
   * @returns {string|null} The authentication token or null if not logged in
   */
  const getToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  };
  
  // Provide auth context to child components
  return (
    <AuthContext.Provider value={{ user, loading, logout, getToken, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook to use authentication context
 * @returns {Object} Auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

/**
 * Custom hook to protect routes that require authentication
 * @param {string} redirectTo - Page to redirect to if not authenticated
 */
export function useRequireAuth(redirectTo = '/login') {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!loading && !user) {
      router.push(redirectTo);
    }
  }, [user, loading, router, redirectTo]);
  
  return { user, loading };
}

export default { AuthProvider, useAuth, useRequireAuth };