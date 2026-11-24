export const PRESET_BACKGROUNDS = [
  { id: 'royal', label: 'Royal', style: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' },
  { id: 'sunset', label: 'Sunset', style: 'linear-gradient(135deg, #f43f5e 0%, #fb923c 100%)' },
  { id: 'emerald', label: 'Emerald', style: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' },
  { id: 'midnight', label: 'Midnight', style: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' },
  { id: 'cyan', label: 'Neon Cyan', style: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)' },
  { id: 'berry', label: 'Berry', style: 'linear-gradient(135deg, #9333ea 0%, #ec4899 100%)' },
  { id: 'velvet', label: 'Velvet', style: 'linear-gradient(135deg, #3b0764 0%, #6b21a8 100%)' },
  { id: 'aurora', label: 'Aurora', style: 'linear-gradient(135deg, #064e3b 0%, #0284c7 100%)' },
  { id: 'rosegold', label: 'Rose Gold', style: 'linear-gradient(135deg, #f43f5e 0%, #f472b6 50%, #fb7185 100%)' },
  { id: 'oceanic', label: 'Oceanic', style: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 100%)' },
  { id: 'darklava', label: 'Dark Lava', style: 'linear-gradient(135deg, #450a0a 0%, #7f1d1d 50%, #991b1b 100%)' },
  { id: 'matrix', label: 'Matrix', style: 'linear-gradient(135deg, #022c22 0%, #064e3b 50%, #047857 100%)' }
];

export const PRESET_TEXT_COLORS = [
  { id: 'white', label: 'White', value: '#ffffff' },
  { id: 'yellow', label: 'Yellow', value: '#facc15' },
  { id: 'coral', label: 'Coral', value: '#f87171' },
  { id: 'emerald', label: 'Emerald', value: '#34d399' },
  { id: 'sky', label: 'Sky', value: '#38bdf8' },
  { id: 'pink', label: 'Pink', value: '#f472b6' },
  { id: 'lime', label: 'Lime', value: '#a3e635' },
  { id: 'purple', label: 'Purple', value: '#c084fc' },
  { id: 'orange', label: 'Orange', value: '#fb923c' },
  { id: 'black', label: 'Charcoal', value: '#0f172a' }
];

export const PRESET_TEXT_GRADIENTS = [
  { id: 'goldensun', label: 'Golden Sun', value: 'linear-gradient(135deg, #facc15 0%, #f97316 100%)' },
  { id: 'flamingo', label: 'Cyber Flamingo', value: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)' },
  { id: 'rainbow', label: 'Rainbow Glow', value: 'linear-gradient(135deg, #f43f5e 0%, #fbbf24 33%, #10b981 66%, #3b82f6 100%)' },
  { id: 'icefire', label: 'Ice & Fire', value: 'linear-gradient(135deg, #38bdf8 0%, #ec4899 100%)' },
  { id: 'electric', label: 'Electric Lime', value: 'linear-gradient(135deg, #a3e635 0%, #06b6d4 100%)' },
  { id: 'cottoncandy', label: 'Cotton Candy', value: 'linear-gradient(135deg, #fbcfe8 0%, #bae6fd 100%)' },
  { id: 'sunsetglow', label: 'Sunset Horizon', value: 'linear-gradient(135deg, #fb923c 0%, #db2777 100%)' },
  { id: 'cyberlime', label: 'Cyber Matrix', value: 'linear-gradient(135deg, #22c55e 0%, #eab308 100%)' }
];

/**
 * Returns the CSS style object for story text.
 * Correctly applies gradient text clipping if the value is a linear-gradient,
 * sets solid color otherwise, and applies bold / italic styles.
 */
export const getStoryTextStyle = (style = {}) => {
  const textColor = style?.textColor || '#ffffff';
  const textGradient = style?.textGradient || (typeof textColor === 'string' && textColor.includes('gradient') ? textColor : '');
  const isBold = Boolean(
    style?.bold === true ||
    style?.bold === 'true' ||
    style?.bold === 1 ||
    style?.isBold === true ||
    style?.isBold === 'true'
  );
  const isItalic = Boolean(
    style?.italic === true ||
    style?.italic === 'true' ||
    style?.italic === 1 ||
    style?.isItalic === true ||
    style?.isItalic === 'true'
  );

  const base = {
    fontWeight: isBold ? '700' : '400',
    fontStyle: isItalic ? 'italic' : 'normal'
  };

  if (textGradient) {
    return {
      ...base,
      backgroundImage: textGradient,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      color: 'transparent',
      caretColor: '#ffffff'
    };
  }

  return {
    ...base,
    color: textColor,
    caretColor: textColor
  };
};
