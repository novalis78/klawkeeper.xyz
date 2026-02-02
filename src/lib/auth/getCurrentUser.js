/**
 * Utility to get current user information from session
 * This is a simplified version for development - in production,
 * use a proper auth solution like NextAuth.js or Auth.js
 */

/**
 * Get the current authenticated user's ID
 * For now, we'll extract it from URL or cookies for demo purposes
 * In production, use a proper session management system
 * 
 * @returns {string|null} The current user ID or null if not logged in
 */
export function getCurrentUserId() {
  if (typeof window === 'undefined') {
    return null; // Server-side
  }
  
  // For demo purposes, we'll extract user ID from URL
  // Format: ?userId=123 or #userId=123
  try {
    const url = new URL(window.location.href);
    
    // Check URL parameters first
    const userId = url.searchParams.get('userId');
    if (userId) {
      return userId;
    }
    
    // Check hash parameters
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const hashUserId = hashParams.get('userId');
    if (hashUserId) {
      return hashUserId;
    }
    
    // If not found in URL, check localStorage (try both keys for compatibility)
    const savedUserId = localStorage.getItem('user_id') || localStorage.getItem('userId');
    if (savedUserId) {
      return savedUserId;
    }

    // No default - return null if not authenticated
    return null;
  } catch (error) {
    console.error('Error getting current user ID:', error);
    return null;
  }
}

/**
 * Get the current authenticated user's email
 * 
 * @returns {string|null} The current user's email or null if not available
 */
export function getCurrentUserEmail() {
  if (typeof window === 'undefined') {
    return null; // Server-side
  }
  
  try {
    // Check localStorage for user email
    const savedEmail = localStorage.getItem('userEmail');
    if (savedEmail) {
      return savedEmail;
    }
    
    // Default to a test email for development
    return null;
  } catch (error) {
    console.error('Error getting current user email:', error);
    return null;
  }
}

/**
 * Save the current user ID and email to localStorage
 * 
 * @param {string} userId The user ID to save
 * @param {string} email The user email to save
 */
export function saveCurrentUser(userId, email) {
  if (typeof window === 'undefined') {
    return; // Server-side
  }
  
  try {
    localStorage.setItem('userId', userId);
    localStorage.setItem('userEmail', email);
  } catch (error) {
    console.error('Error saving current user:', error);
  }
}

export default {
  getCurrentUserId,
  getCurrentUserEmail,
  saveCurrentUser
};