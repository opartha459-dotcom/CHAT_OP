/**
 * Robust cross-platform sharing utility for PulseChat.
 * Supports Web Share API (native mobile sheets), file sharing with canShare checks,
 * silent cancellation handling (AbortError), and secure clipboard fallback.
 */

/**
 * Copies plain text to clipboard safely.
 * @param {string} text
 * @returns {Promise<boolean>} True if copied successfully
 */
export async function copyToClipboard(text) {
  if (!text) return false;

  // Modern Clipboard API
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('[Share] Clipboard API write failed, trying fallback:', err);
    }
  }

  // Fallback for older browsers or restricted iframe contexts
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (fallbackErr) {
    console.error('[Share] Fallback copy failed:', fallbackErr);
    return false;
  }
}

/**
 * Shares data (title, text, url, files) using Web Share API when possible,
 * or falls back to copying the URL or text to the clipboard.
 * 
 * @param {Object} options
 * @param {string} [options.title]
 * @param {string} [options.text]
 * @param {string} [options.url]
 * @param {File[]} [options.files]
 * @returns {Promise<{ success: boolean, method: 'native' | 'clipboard' | 'none', cancelled?: boolean, message?: string }>}
 */
export async function shareContent({ title, text, url, files }) {
  const shareData = {};
  if (title) shareData.title = title;
  if (text) shareData.text = text;
  if (url) shareData.url = url;

  // Validate files if present
  if (files && Array.isArray(files) && files.length > 0) {
    if (navigator.canShare && navigator.canShare({ files })) {
      shareData.files = files;
    } else {
      console.warn('[Share] File sharing not supported by current browser; omitting files.');
    }
  }

  // Attempt Native Web Share API
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      // Check canShare if available
      if (!navigator.canShare || navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return { success: true, method: 'native' };
      }
    } catch (err) {
      // User cancelled native share sheet (Android / iOS standard behavior)
      if (err.name === 'AbortError') {
        return { success: false, method: 'native', cancelled: true };
      }
      console.warn('[Share] Native share failed with error:', err);
      // Fall through to clipboard copy fallback
    }
  }

  // Fallback: Copy URL or Text to clipboard
  const contentToCopy = url || text || title || '';
  if (contentToCopy) {
    const copied = await copyToClipboard(contentToCopy);
    if (copied) {
      return { success: true, method: 'clipboard', message: 'Copied to clipboard' };
    }
  }

  return { success: false, method: 'none', message: 'Sharing not supported on this device' };
}
