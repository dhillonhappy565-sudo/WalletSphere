import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import API from '../../services/api';

/**
 * GoogleOAuthWindow
 *
 * Triggers the real Google account chooser popup (accounts.google.com)
 * via @react-oauth/google — works on any machine, any browser,
 * showing whatever Google accounts the user is logged in to.
 * Includes Gmail read-only scope for seamless bank transaction alert sync.
 */
function GoogleOAuthWindow({ onAuthSuccess, onClose, children }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const openGoogleLogin = useGoogleLogin({
    flow: 'implicit',
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    prompt: 'select_account',

    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError('');
      try {
        const profileRes = await fetch(
          `https://www.googleapis.com/oauth2/v3/userinfo`,
          { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } }
        );
        const profile = await profileRes.json();

        const res = await API.post('/auth/google', {
          googleAccessToken: tokenResponse.access_token,
          email: profile.email,
          fullName: profile.name,
          profilePicture: profile.picture || '',
          googleId: profile.sub,
        });

        const { token, ...userData } = res.data.data;
        localStorage.setItem('walletsphere_token', token);
        localStorage.setItem('walletsphere_user', JSON.stringify(userData));
        localStorage.setItem('walletsphere_google_access_token', tokenResponse.access_token);

        if (onAuthSuccess) onAuthSuccess(userData);
      } catch (err) {
        console.error('Google Auth Error:', err);
        setError(
          err.response?.data?.message ||
          'Google authentication failed. Please try again.'
        );
        setLoading(false);
      }
    },

    onError: (err) => {
      console.error('Google OAuth Error:', err);
      if (onClose) onClose();
    },

    onNonOAuthError: (err) => {
      if (err.type === 'popup_closed') {
        if (onClose) onClose();
      } else {
        setError('Popup was blocked. Please allow popups for this site.');
      }
    },
  });

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4 min-w-[260px]">
          <svg className="w-10 h-10 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <p className="text-sm font-semibold text-slate-700">Signing you in with Google…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl p-7 shadow-2xl max-w-sm w-full text-center">
          <p className="text-sm font-semibold text-rose-600 mb-4">{error}</p>
          <button
            onClick={() => { setError(''); if (onClose) onClose(); }}
            className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * useGoogleAuth — hook exposing Google Login trigger with Gmail scope & access token caching.
 */
export function useGoogleAuth({ onAuthSuccess, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const triggerGoogleLogin = useGoogleLogin({
    flow: 'implicit',
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    prompt: 'select_account',

    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError('');
      try {
        const profileRes = await fetch(
          'https://www.googleapis.com/oauth2/v3/userinfo',
          { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } }
        );
        const profile = await profileRes.json();

        const res = await API.post('/auth/google', {
          googleAccessToken: tokenResponse.access_token,
          email: profile.email,
          fullName: profile.name,
          profilePicture: profile.picture || '',
          googleId: profile.sub,
        });

        const { token, ...userData } = res.data.data;
        localStorage.setItem('walletsphere_token', token);
        localStorage.setItem('walletsphere_user', JSON.stringify(userData));
        localStorage.setItem('walletsphere_google_access_token', tokenResponse.access_token);

        setLoading(false);
        if (onAuthSuccess) onAuthSuccess(userData);
        window.location.href = '/dashboard';
      } catch (err) {
        console.error('Google Auth Error:', err);
        setError(
          err.response?.data?.message ||
          'Google authentication failed. Please try again.'
        );
        setLoading(false);
      }
    },

    onError: () => {
      if (onClose) onClose();
    },

    onNonOAuthError: (err) => {
      if (err.type !== 'popup_closed') {
        setError('Popup was blocked. Please allow popups for this site.');
      } else {
        if (onClose) onClose();
      }
    },
  });

  return { triggerGoogleLogin, loading, error, clearError: () => setError('') };
}

export default GoogleOAuthWindow;
