import API from '../services/api';

/**
 * Real Native Google OAuth 2.0 Popup Handler
 * Opens a real browser popup window to accounts.google.com
 * Works across all browsers (Edge, Chrome, Firefox, Safari) on any computer.
 */
export const launchGoogleOAuthPopup = () => {
  return new Promise((resolve, reject) => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'sample-google-client-id';
    const redirectUri = window.location.origin + '/login';
    const scope = encodeURIComponent('email profile');

    // Google OAuth 2.0 Official URL
    const googleOAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=token&scope=${scope}&prompt=select_account`;

    // Center Popup Dimensions
    const width = 500;
    const height = 620;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      googleOAuthUrl,
      'Sign in - Google Accounts',
      `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,status=1`
    );

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      alert('Popup blocker prevented Google Sign-In window. Please allow popups for this site.');
      reject(new Error('Popup blocked'));
      return;
    }

    // Monitor for popup response or manual email selection in popup
    const checkPopupClosed = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(checkPopupClosed);
      }
    }, 1000);

    // Provide a fallback window event listener or direct Google Profile auth
    window.addEventListener(
      'message',
      async (event) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === 'GOOGLE_AUTH_SUCCESS' && event.data?.payload) {
          clearInterval(checkPopupClosed);
          popup.close();
          try {
            const res = await API.post('/auth/google', event.data.payload);
            resolve(res.data.data);
          } catch (err) {
            reject(err);
          }
        }
      },
      { once: true }
    );
  });
};
