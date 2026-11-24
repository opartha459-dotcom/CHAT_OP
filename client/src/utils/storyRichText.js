/**
 * Story Rich Text & Hyperlink Utilities
 * Provides URL autolinking, clean HTML formatting, and link sanitization for stories.
 */

const URL_REGEX = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;

/**
 * Autolinks bare URLs in text or HTML without modifying existing <a> tags or attributes.
 */
export function autolinkStoryHtml(input) {
  if (!input || typeof input !== 'string') return '';

  // If input already contains HTML tags, we only parse text segments outside tags
  if (/<[a-z][\s\S]*>/i.test(input)) {
    const tokens = input.split(/(<[^>]+>)/g);
    let insideAnchor = false;

    return tokens
      .map((token) => {
        if (!token) return '';

        // Check if token is an opening or closing <a> tag
        if (/^<a[\s>]/i.test(token)) {
          insideAnchor = true;
          // Ensure target="_blank" and rel="noopener noreferrer"
          let modifiedTag = token;
          if (!/target\s*=/i.test(modifiedTag)) {
            modifiedTag = modifiedTag.replace(/^<a/i, '<a target="_blank" rel="noopener noreferrer"');
          }
          if (!/class\s*=/i.test(modifiedTag)) {
            modifiedTag = modifiedTag.replace(/^<a/i, '<a class="story-link underline text-sky-400 hover:text-sky-300 font-semibold cursor-pointer"');
          }
          return modifiedTag;
        }

        if (/^<\/a>/i.test(token)) {
          insideAnchor = false;
          return token;
        }

        // If it's another HTML tag, keep it as-is
        if (token.startsWith('<') && token.endsWith('>')) {
          return token;
        }

        // Text content outside <a> tags: convert bare URLs to links
        if (!insideAnchor) {
          return token.replace(URL_REGEX, (urlMatch) => {
            const href = urlMatch.startsWith('http') ? urlMatch : `https://${urlMatch}`;
            return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="story-link underline text-sky-400 hover:text-sky-300 font-semibold cursor-pointer">${urlMatch}</a>`;
          });
        }

        return token;
      })
      .join('');
  }

  // Pure plain text: autolink URLs and replace newlines with <br/>
  const linked = input.replace(URL_REGEX, (urlMatch) => {
    const href = urlMatch.startsWith('http') ? urlMatch : `https://${urlMatch}`;
    return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="story-link underline text-sky-400 hover:text-sky-300 font-semibold cursor-pointer">${urlMatch}</a>`;
  });

  return linked.replace(/\n/g, '<br/>');
}

/**
 * Strips HTML tags for length checks or plain text preview
 */
export function getPlainTextFromHtml(html) {
  if (!html || typeof html !== 'string') return '';
  let str = html
    .replace(/<br\s*[\/]?>/gi, ' ')
    .replace(/&lt;br\s*[\/]?&gt;/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<\/div>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  // Second pass to ensure no decoded tags (e.g. decoded &lt;br&gt;) remain
  str = str.replace(/<br\s*[\/]?>/gi, ' ').replace(/<[^>]+>/g, '');

  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Checks if HTML has any meaningful text content or media
 */
export function isHtmlEmpty(html) {
  if (!html || typeof html !== 'string') return true;
  const stripped = getPlainTextFromHtml(html);
  return stripped.length === 0;
}
