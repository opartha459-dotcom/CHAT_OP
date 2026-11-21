import React, { useState } from 'react';
import { Globe } from 'lucide-react';

export const SOCIAL_PLATFORMS = [
  { id: 'github', label: 'GitHub', domains: ['github.com'], color: '#ffffff', brandBg: '#181717' },
  { id: 'x', label: 'X (Twitter)', domains: ['x.com', 'twitter.com'], color: '#ffffff', brandBg: '#000000' },
  { id: 'discord', label: 'Discord', domains: ['discord.com', 'discord.gg'], color: '#5865F2', brandBg: '#5865F2' },
  { id: 'telegram', label: 'Telegram', domains: ['t.me', 'telegram.org', 'telegram.me'], color: '#229ED9', brandBg: '#229ED9' },
  { id: 'youtube', label: 'YouTube', domains: ['youtube.com', 'youtu.be'], color: '#FF0000', brandBg: '#FF0000' },
  { id: 'instagram', label: 'Instagram', domains: ['instagram.com'], color: '#E1306C', brandBg: '#E1306C' },
  { id: 'linkedin', label: 'LinkedIn', domains: ['linkedin.com'], color: '#0A66C2', brandBg: '#0A66C2' },
  { id: 'facebook', label: 'Facebook', domains: ['facebook.com', 'fb.com'], color: '#1877F2', brandBg: '#1877F2' },
  { id: 'reddit', label: 'Reddit', domains: ['reddit.com'], color: '#FF4500', brandBg: '#FF4500' },
  { id: 'twitch', label: 'Twitch', domains: ['twitch.tv'], color: '#9146FF', brandBg: '#9146FF' },
  { id: 'tiktok', label: 'TikTok', domains: ['tiktok.com'], color: '#00F2FE', brandBg: '#010101' },
  { id: 'other', label: 'Custom Domain / Web', domains: [], color: '#a855f7', brandBg: '#231C38' }
];

export const extractDomain = (rawUrl = '') => {
  if (!rawUrl) return '';
  let urlStr = rawUrl.trim();
  if (!/^https?:\/\//i.test(urlStr)) {
    urlStr = 'https://' + urlStr;
  }
  try {
    const parsed = new URL(urlStr);
    return parsed.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return rawUrl.replace(/^https?:\/\//i, '').split('/')[0].replace(/^www\./, '').toLowerCase();
  }
};

export const getAutoFaviconUrl = (rawUrl = '') => {
  const domain = extractDomain(rawUrl);
  if (!domain) return '';
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
};

export const detectSocialPlatform = (rawUrl = '') => {
  const domain = extractDomain(rawUrl);
  if (!domain) return { platform: 'other', label: '', iconUrl: '', color: '#a855f7' };

  for (const plat of SOCIAL_PLATFORMS) {
    if (plat.domains.some((d) => domain === d || domain.endsWith('.' + d))) {
      return {
        platform: plat.id,
        label: plat.label,
        iconUrl: getAutoFaviconUrl(rawUrl),
        color: plat.color
      };
    }
  }

  // Capitalize domain as fallback label
  const cleanLabel = domain.split('.')[0]
    ? domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1)
    : 'Website';

  return {
    platform: 'other',
    label: cleanLabel,
    iconUrl: getAutoFaviconUrl(rawUrl),
    color: '#a855f7'
  };
};

export const SocialBrandIcon = ({
  platform = 'other',
  iconUrl = '',
  url = '',
  autoFetch = true,
  className = 'w-5 h-5',
  fallbackName = ''
}) => {
  const [imgError, setImgError] = useState(false);

  // If custom iconUrl provided or autoFetch is true with custom domain, prioritize image
  const resolvedImgSrc = iconUrl || (autoFetch && url ? getAutoFaviconUrl(url) : '');

  if (resolvedImgSrc && !imgError && (platform === 'other' || iconUrl)) {
    return (
      <img
        src={resolvedImgSrc}
        alt={fallbackName || platform}
        onError={() => setImgError(true)}
        className={`${className} object-contain rounded-md shrink-0`}
      />
    );
  }

  // Built-in crisp SVGs for major brands
  switch (platform) {
    case 'github':
      return (
        <svg className={`${className} shrink-0 fill-current`} viewBox="0 0 24 24">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
        </svg>
      );
    case 'x':
    case 'twitter':
      return (
        <svg className={`${className} shrink-0 fill-current`} viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case 'discord':
      return (
        <svg className={`${className} shrink-0 fill-current`} viewBox="0 0 24 24">
          <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.894.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
      );
    case 'telegram':
      return (
        <svg className={`${className} shrink-0 fill-current`} viewBox="0 0 24 24">
          <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      );
    case 'youtube':
      return (
        <svg className={`${className} shrink-0 fill-current`} viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg className={`${className} shrink-0 fill-current`} viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg className={`${className} shrink-0 fill-current`} viewBox="0 0 24 24">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
        </svg>
      );
    case 'facebook':
      return (
        <svg className={`${className} shrink-0 fill-current`} viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );
    case 'reddit':
      return (
        <svg className={`${className} shrink-0 fill-current`} viewBox="0 0 24 24">
          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
        </svg>
      );
    case 'twitch':
      return (
        <svg className={`${className} shrink-0 fill-current`} viewBox="0 0 24 24">
          <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg className={`${className} shrink-0 fill-current`} viewBox="0 0 24 24">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.99v9.19a7.48 7.48 0 01-2.18 5.25c-2.89 2.87-7.6 2.84-10.45-.07a7.46 7.46 0 01-1.97-5.25c-.02-4.14 3.32-7.51 7.46-7.52.48.01.96.06 1.43.16v4.06a3.42 3.42 0 00-1.4-.29 3.47 3.47 0 00-3.47 3.47 3.47 3.47 0 003.47 3.47c1.92 0 3.47-1.55 3.47-3.47V.02z" />
        </svg>
      );
    default:
      if (resolvedImgSrc && !imgError) {
        return (
          <img
            src={resolvedImgSrc}
            alt={fallbackName || 'Link'}
            onError={() => setImgError(true)}
            className={`${className} object-contain rounded-md shrink-0`}
          />
        );
      }
      return <Globe className={`${className} shrink-0`} />;
  }
};
