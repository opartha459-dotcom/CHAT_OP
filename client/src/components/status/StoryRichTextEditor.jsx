import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link as LinkIcon,
  Unlink,
  Palette,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  RemoveFormatting,
  Type,
  Check,
  X,
  ChevronDown
} from 'lucide-react';
import { autolinkStoryHtml, isHtmlEmpty, getPlainTextFromHtml } from '../../utils/storyRichText';

const COLOR_PRESETS = [
  '#ffffff', // White
  '#facc15', // Yellow
  '#4ade80', // Green
  '#38bdf8', // Cyan
  '#818cf8', // Indigo
  '#c084fc', // Purple
  '#f472b6', // Pink
  '#fb923c', // Orange
  '#ef4444', // Red
  '#94a3b8'  // Gray
];

const HIGHLIGHT_PRESETS = [
  'rgba(250, 204, 21, 0.45)',  // Yellow glow
  'rgba(74, 222, 128, 0.45)',  // Green glow
  'rgba(56, 189, 248, 0.45)',  // Cyan glow
  'rgba(192, 132, 252, 0.45)', // Purple glow
  'rgba(244, 114, 182, 0.45)', // Pink glow
  'rgba(239, 68, 68, 0.45)',   // Red glow
  'transparent'                // None
];

const FONT_SIZES = [
  { label: 'Small', size: '14px' },
  { label: 'Normal', size: '18px' },
  { label: 'Large', size: '24px' },
  { label: 'Title', size: '32px' }
];

export const StoryRichTextEditor = ({
  value = '',
  onChange,
  placeholder = 'Type your story...',
  fontClass = 'font-sans',
  containerStyle = {},
  className = '',
  minHeight = '140px',
  isCompact = false,
  maxLength = 700,
  showToolbar = true
}) => {
  const editorRef = useRef(null);
  const containerRef = useRef(null);
  const isComposingRef = useRef(false);
  const lastHtmlRef = useRef(value || '');
  const savedRangeRef = useRef(null);
  const selectedTextRef = useRef('');

  // Floating toolbar state
  const [floatingToolbar, setFloatingToolbar] = useState({
    show: false,
    top: 0,
    left: 0
  });

  // Active formats on current selection
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    hasLink: false
  });

  // Dropdown menus state
  const [activeMenu, setActiveMenu] = useState(null); // 'color' | 'highlight' | 'fontSize' | 'link' | null
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [customColor, setCustomColor] = useState('#ffffff');
  const [customHighlight, setCustomHighlight] = useState('#facc15');

  // Synchronize incoming external value into editor without resetting cursor position
  useEffect(() => {
    if (!editorRef.current) return;
    if (value !== lastHtmlRef.current) {
      lastHtmlRef.current = value || '';
      // Only set innerHTML if the editor is NOT currently focused or if it's completely empty
      if (document.activeElement !== editorRef.current || !editorRef.current.innerHTML.trim()) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  // Initial populate on mount
  useEffect(() => {
    if (editorRef.current && value && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value;
      lastHtmlRef.current = value;
    }
  }, []);

  // Save selection whenever range changes inside editor
  const saveCurrentSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current) {
      const range = sel.getRangeAt(0);
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
      }
    }
  }, []);

  // Restore saved selection range
  const restoreSelection = useCallback(() => {
    if (!savedRangeRef.current) return;
    const sel = window.getSelection();
    if (sel) {
      try {
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
      } catch (e) {
        // Range might be detached if DOM shifted
      }
    }
  }, []);

  // Notify parent of content changes with maxLength enforcement
  const notifyChange = useCallback(() => {
    if (!editorRef.current) return;
    let html = editorRef.current.innerHTML;

    if (isHtmlEmpty(html)) {
      html = '';
    } else if (maxLength && maxLength > 0) {
      const plain = getPlainTextFromHtml(html);
      if (plain.length > maxLength) {
        const truncated = plain.slice(0, maxLength);
        editorRef.current.innerText = truncated;
        html = editorRef.current.innerHTML;
      }
    }

    lastHtmlRef.current = html;
    if (onChange) {
      onChange(html);
    }
  }, [onChange, maxLength]);

  // Update floating toolbar position and format states
  const updateToolbarPosition = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !editorRef.current) {
      setFloatingToolbar((prev) => (prev.show ? { ...prev, show: false } : prev));
      if (activeMenu !== 'link') {
        setActiveMenu(null);
      }
      return;
    }

    const range = sel.getRangeAt(0);
    if (!editorRef.current.contains(range.commonAncestorContainer)) {
      setFloatingToolbar((prev) => (prev.show ? { ...prev, show: false } : prev));
      return;
    }

    // Save selection
    savedRangeRef.current = range.cloneRange();

    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect() || { top: 0, left: 0, width: 300 };

    const top = rect.top - containerRect.top - 46;
    const left = rect.left - containerRect.left + rect.width / 2;

    const parentEl = range.commonAncestorContainer.nodeType === 1
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement;

    const hasLink = Boolean(parentEl?.closest('a'));

    try {
      setActiveFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strike: document.queryCommandState('strikeThrough'),
        hasLink
      });
    } catch (e) {
      // Ignored if command state query fails
    }

    setFloatingToolbar({
      show: true,
      top: Math.max(10, top),
      left: Math.max(140, Math.min(containerRect.width - 140, left))
    });
  }, [activeMenu]);

  // Listen to document selection changes
  useEffect(() => {
    const handleSelectionChange = () => {
      saveCurrentSelection();
      updateToolbarPosition();
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [saveCurrentSelection, updateToolbarPosition]);

  // Execute standard formatting command
  const execFormat = (cmd, val = null) => {
    restoreSelection();
    editorRef.current?.focus();
    try {
      document.execCommand(cmd, false, val);
    } catch (e) {
      console.warn(`execCommand failed for ${cmd}:`, e);
    }
    saveCurrentSelection();
    notifyChange();
    updateToolbarPosition();
  };

  // Apply custom text color only to selection
  const applyTextColor = (color) => {
    restoreSelection();
    editorRef.current?.focus();
    try {
      document.execCommand('styleWithCSS', false, true);
      document.execCommand('foreColor', false, color);
    } catch (e) {
      document.execCommand('foreColor', false, color);
    }
    saveCurrentSelection();
    notifyChange();
    setActiveMenu(null);
    updateToolbarPosition();
  };

  // Apply highlight background color only to selection
  const applyHighlightColor = (color) => {
    restoreSelection();
    editorRef.current?.focus();
    try {
      document.execCommand('styleWithCSS', false, true);
      document.execCommand('hiliteColor', false, color);
    } catch (e) {
      document.execCommand('hiliteColor', false, color);
    }
    saveCurrentSelection();
    notifyChange();
    setActiveMenu(null);
    updateToolbarPosition();
  };

  // Apply font size cleanly using span replacement pattern
  const applyFontSize = (fontSize) => {
    restoreSelection();
    editorRef.current?.focus();

    // Use execCommand fontSize=7 as temporary marker, then replace font tag with styled span
    document.execCommand('fontSize', false, '7');
    if (editorRef.current) {
      const fontTags = editorRef.current.querySelectorAll('font[size="7"]');
      fontTags.forEach((fontEl) => {
        const span = document.createElement('span');
        span.style.fontSize = fontSize;
        span.innerHTML = fontEl.innerHTML;
        fontEl.parentNode?.replaceChild(span, fontEl);
      });
    }

    saveCurrentSelection();
    notifyChange();
    setActiveMenu(null);
    updateToolbarPosition();
  };

  // Hyperlink creation & open modal
  const handleOpenLinkModal = () => {
    saveCurrentSelection();
    const sel = window.getSelection();
    let currentText = '';
    let existingUrl = '';

    if (sel && sel.rangeCount > 0 && editorRef.current) {
      const range = sel.getRangeAt(0);
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        currentText = range.toString().trim();
        const parentEl = range.commonAncestorContainer.nodeType === 1
          ? range.commonAncestorContainer
          : range.commonAncestorContainer.parentElement;
        const existingAnchor = parentEl?.closest('a');
        if (existingAnchor) {
          existingUrl = existingAnchor.getAttribute('href') || '';
          if (!currentText) {
            currentText = existingAnchor.textContent || '';
          }
        }
      }
    }

    selectedTextRef.current = currentText;
    setLinkText(currentText);
    setLinkUrl(existingUrl);
    setActiveMenu((prev) => (prev === 'link' ? null : 'link'));
  };

  const handleApplyLink = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!linkUrl.trim()) return;

    restoreSelection();
    editorRef.current?.focus();

    let finalHref = linkUrl.trim();
    if (!/^https?:\/\//i.test(finalHref) && !/^mailto:/i.test(finalHref) && !/^tel:/i.test(finalHref)) {
      finalHref = `https://${finalHref}`;
    }

    const cleanLabel = (linkText.trim() || selectedTextRef.current || finalHref);
    const sel = window.getSelection();

    // If text was selected and user didn't alter label into something completely different, wrap selection
    if (sel && !sel.isCollapsed && sel.rangeCount > 0 && (!linkText.trim() || linkText.trim() === selectedTextRef.current)) {
      document.execCommand('createLink', false, finalHref);

      if (editorRef.current) {
        const anchors = editorRef.current.querySelectorAll(`a[href="${finalHref}"]`);
        anchors.forEach((a) => {
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noopener noreferrer');
          a.className = 'story-link underline text-sky-400 hover:text-sky-300 font-semibold cursor-pointer';
        });
      }
    } else {
      // Direct URL or custom label insertion
      const safeLabel = cleanLabel.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const anchorHtml = `<a href="${finalHref}" target="_blank" rel="noopener noreferrer" class="story-link underline text-sky-400 hover:text-sky-300 font-semibold cursor-pointer">${safeLabel}</a>&nbsp;`;
      document.execCommand('insertHTML', false, anchorHtml);
    }

    saveCurrentSelection();
    notifyChange();
    setLinkUrl('');
    setLinkText('');
    selectedTextRef.current = '';
    setActiveMenu(null);
    updateToolbarPosition();
  };

  const handleRemoveLink = () => {
    restoreSelection();
    editorRef.current?.focus();
    document.execCommand('unlink', false, null);
    saveCurrentSelection();
    notifyChange();
    setActiveMenu(null);
    updateToolbarPosition();
  };

  // Clear all formatting on selection
  const handleClearFormat = () => {
    restoreSelection();
    editorRef.current?.focus();
    document.execCommand('removeFormat', false, null);
    document.execCommand('unlink', false, null);
    saveCurrentSelection();
    notifyChange();
    updateToolbarPosition();
  };

  // Enforce text limits on typing
  const handleKeyDown = (e) => {
    if (isComposingRef.current) return;

    if (maxLength && maxLength > 0) {
      const isControlKey =
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        [
          'Backspace',
          'Delete',
          'ArrowLeft',
          'ArrowRight',
          'ArrowUp',
          'ArrowDown',
          'Home',
          'End',
          'PageUp',
          'PageDown',
          'Tab',
          'Escape',
          'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'
        ].includes(e.key);

      if (!isControlKey) {
        const plain = getPlainTextFromHtml(editorRef.current?.innerHTML || '');
        const sel = window.getSelection();
        const hasSelection = sel && !sel.isCollapsed && sel.toString().length > 0;

        // Block printable characters and Enter if limit is reached and no text is selected
        if (!hasSelection && plain.length >= maxLength) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }
    }
  };

  // Handle paste: autolink raw URLs and insert clean plain text / HTML respecting maxLength
  const handlePaste = (e) => {
    e.preventDefault();
    const rawText = (e.clipboardData || window.clipboardData)?.getData('text/plain') || '';
    if (!rawText) return;

    let textToInsert = rawText;
    if (maxLength && maxLength > 0) {
      const currentPlain = getPlainTextFromHtml(editorRef.current?.innerHTML || '');
      const sel = window.getSelection();
      const selectedLen = (sel && !sel.isCollapsed) ? sel.toString().length : 0;
      const availableSpace = Math.max(0, maxLength - (currentPlain.length - selectedLen));
      if (availableSpace <= 0) return;
      textToInsert = rawText.slice(0, availableSpace);
    }

    const htmlWithLinks = autolinkStoryHtml(textToInsert);
    document.execCommand('insertHTML', false, htmlWithLinks);
    saveCurrentSelection();
    notifyChange();
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full flex flex-col justify-between ${className}`}
      style={containerStyle}
    >
      {/* ─── Top Action Formatting Bar (Desktop & Touch) ─── */}
      {showToolbar && (
        <div
          className="w-full flex items-center justify-between flex-wrap gap-1 px-3 py-1.5 bg-black/55 backdrop-blur-xl border border-white/20 text-white z-30 select-none text-xs rounded-2xl shadow-lg shrink-0 mb-2"
          onMouseDown={(e) => {
            // Prevent stealing focus from editor
            e.preventDefault();
          }}
        >
        <div className="flex items-center space-x-1">
          {/* Bold */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execFormat('bold')}
            className={`p-1.5 rounded-lg transition hover:bg-white/20 cursor-pointer ${
              activeFormats.bold ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-200'
            }`}
            title="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          {/* Italic */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execFormat('italic')}
            className={`p-1.5 rounded-lg transition hover:bg-white/20 cursor-pointer ${
              activeFormats.italic ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-200'
            }`}
            title="Italic"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          {/* Underline */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execFormat('underline')}
            className={`p-1.5 rounded-lg transition hover:bg-white/20 cursor-pointer ${
              activeFormats.underline ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-200'
            }`}
            title="Underline"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>

          {/* Strikethrough */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execFormat('strikeThrough')}
            className={`p-1.5 rounded-lg transition hover:bg-white/20 cursor-pointer ${
              activeFormats.strike ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-200'
            }`}
            title="Strikethrough"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-white/20 mx-1" />

          {/* Text Alignment */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execFormat('justifyLeft')}
            className="p-1.5 rounded-lg transition hover:bg-white/20 text-slate-200 cursor-pointer"
            title="Align Left"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execFormat('justifyCenter')}
            className="p-1.5 rounded-lg transition hover:bg-white/20 text-slate-200 cursor-pointer"
            title="Align Center"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execFormat('justifyRight')}
            className="p-1.5 rounded-lg transition hover:bg-white/20 text-slate-200 cursor-pointer"
            title="Align Right"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-white/20 mx-1" />

          {/* Lists */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execFormat('insertUnorderedList')}
            className="p-1.5 rounded-lg transition hover:bg-white/20 text-slate-200 cursor-pointer"
            title="Bulleted List"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execFormat('insertOrderedList')}
            className="p-1.5 rounded-lg transition hover:bg-white/20 text-slate-200 cursor-pointer"
            title="Numbered List"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Hyperlink & Format Clearing */}
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleOpenLinkModal}
            className={`p-1.5 rounded-lg transition hover:bg-white/20 flex items-center space-x-1 cursor-pointer ${
              activeFormats.hasLink || activeMenu === 'link' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-200'
            }`}
            title="Insert Hyperlink"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span className="text-[10px] font-semibold hidden sm:inline">Link</span>
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleClearFormat}
            className="p-1.5 rounded-lg transition hover:bg-white/20 text-slate-300 hover:text-white cursor-pointer"
            title="Clear Formatting"
          >
            <RemoveFormatting className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      )}

      {/* ─── Floating Formatting Toolbar on Text Selection ─── */}
      {floatingToolbar.show && (
        <div
          className="absolute z-50 flex items-center bg-[#130E24]/95 backdrop-blur-2xl border border-white/25 rounded-2xl px-2.5 py-1.5 shadow-2xl space-x-1 animate-in fade-in zoom-in-95 duration-150 select-none text-white text-xs"
          style={{
            top: `${floatingToolbar.top}px`,
            left: `${floatingToolbar.left}px`,
            transform: 'translate(-50%, -100%)'
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {/* Bold */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execFormat('bold')}
            className={`p-1.5 rounded-xl transition cursor-pointer hover:bg-white/20 ${
              activeFormats.bold ? 'bg-indigo-600 text-white' : 'text-slate-200'
            }`}
            title="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          {/* Italic */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execFormat('italic')}
            className={`p-1.5 rounded-xl transition cursor-pointer hover:bg-white/20 ${
              activeFormats.italic ? 'bg-indigo-600 text-white' : 'text-slate-200'
            }`}
            title="Italic"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          {/* Underline */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execFormat('underline')}
            className={`p-1.5 rounded-xl transition cursor-pointer hover:bg-white/20 ${
              activeFormats.underline ? 'bg-indigo-600 text-white' : 'text-slate-200'
            }`}
            title="Underline"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>

          {/* Strikethrough */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execFormat('strikeThrough')}
            className={`p-1.5 rounded-xl transition cursor-pointer hover:bg-white/20 ${
              activeFormats.strike ? 'bg-indigo-600 text-white' : 'text-slate-200'
            }`}
            title="Strikethrough"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-white/20 mx-1" />

          {/* Font Size Menu Trigger */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setActiveMenu(activeMenu === 'fontSize' ? null : 'fontSize')}
              className={`p-1.5 rounded-xl transition cursor-pointer hover:bg-white/20 flex items-center space-x-0.5 ${
                activeMenu === 'fontSize' ? 'bg-indigo-600 text-white' : 'text-slate-200'
              }`}
              title="Font Size"
            >
              <Type className="w-3.5 h-3.5" />
              <ChevronDown className="w-2.5 h-2.5 opacity-60" />
            </button>

            {/* Font Size Dropdown */}
            {activeMenu === 'fontSize' && (
              <div
                className="absolute left-0 top-full mt-2 bg-[#1C1530] border border-violet-800/60 rounded-xl p-1.5 shadow-2xl flex flex-col space-y-1 min-w-[95px] z-50"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                {FONT_SIZES.map((fs) => (
                  <button
                    key={fs.size}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyFontSize(fs.size)}
                    className="px-2.5 py-1 text-left text-xs text-white hover:bg-violet-600 rounded-lg transition cursor-pointer font-medium"
                  >
                    {fs.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Text Color Trigger */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setActiveMenu(activeMenu === 'color' ? null : 'color')}
              className={`p-1.5 rounded-xl transition cursor-pointer hover:bg-white/20 flex items-center space-x-0.5 ${
                activeMenu === 'color' ? 'bg-indigo-600 text-white' : 'text-slate-200'
              }`}
              title="Text Color"
            >
              <Palette className="w-3.5 h-3.5" />
              <ChevronDown className="w-2.5 h-2.5 opacity-60" />
            </button>

            {/* Color Palette Popover */}
            {activeMenu === 'color' && (
              <div
                className="absolute -left-12 top-full mt-2 bg-[#1C1530] border border-violet-800/60 rounded-2xl p-2.5 shadow-2xl z-50 w-48 space-y-2"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <div className="text-[10px] font-bold text-violet-300 uppercase">Text Color</div>
                <div className="grid grid-cols-5 gap-1.5">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applyTextColor(c)}
                      className="w-6 h-6 rounded-lg border border-white/20 hover:scale-110 active:scale-95 transition cursor-pointer shadow-sm"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
                <div className="flex items-center space-x-1.5 pt-1 border-t border-violet-900/50">
                  <input
                    type="color"
                    value={customColor}
                    onChange={(e) => {
                      setCustomColor(e.target.value);
                      applyTextColor(e.target.value);
                    }}
                    className="w-6 h-6 rounded-md cursor-pointer border border-white/20 bg-transparent"
                    title="Custom Color"
                  />
                  <span className="text-[10px] text-violet-300 font-medium">Custom Color</span>
                </div>
              </div>
            )}
          </div>

          {/* Highlight Color Trigger */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setActiveMenu(activeMenu === 'highlight' ? null : 'highlight')}
              className={`p-1.5 rounded-xl transition cursor-pointer hover:bg-white/20 flex items-center space-x-0.5 ${
                activeMenu === 'highlight' ? 'bg-indigo-600 text-white' : 'text-slate-200'
              }`}
              title="Highlight Glow"
            >
              <Highlighter className="w-3.5 h-3.5" />
              <ChevronDown className="w-2.5 h-2.5 opacity-60" />
            </button>

            {/* Highlight Palette Popover */}
            {activeMenu === 'highlight' && (
              <div
                className="absolute -left-16 top-full mt-2 bg-[#1C1530] border border-violet-800/60 rounded-2xl p-2.5 shadow-2xl z-50 w-48 space-y-2"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <div className="text-[10px] font-bold text-violet-300 uppercase">Highlight Glow</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {HIGHLIGHT_PRESETS.map((bg, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applyHighlightColor(bg)}
                      className="w-7 h-7 rounded-lg border border-white/20 hover:scale-110 active:scale-95 transition cursor-pointer flex items-center justify-center text-[10px]"
                      style={{ backgroundColor: bg }}
                      title={bg === 'transparent' ? 'None' : `Highlight ${idx + 1}`}
                    >
                      {bg === 'transparent' ? <X className="w-3 h-3 text-rose-400" /> : null}
                    </button>
                  ))}
                </div>
                <div className="flex items-center space-x-1.5 pt-1 border-t border-violet-900/50">
                  <input
                    type="color"
                    value={customHighlight}
                    onChange={(e) => {
                      setCustomHighlight(e.target.value);
                      applyHighlightColor(e.target.value);
                    }}
                    className="w-6 h-6 rounded-md cursor-pointer border border-white/20 bg-transparent"
                    title="Custom Highlight"
                  />
                  <span className="text-[10px] text-violet-300 font-medium">Custom Glow</span>
                </div>
              </div>
            )}
          </div>

          <div className="w-[1px] h-4 bg-white/20 mx-1" />

          {/* Hyperlink Button */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleOpenLinkModal}
            className={`p-1.5 rounded-xl transition cursor-pointer hover:bg-white/20 ${
              activeFormats.hasLink ? 'bg-sky-600 text-white' : 'text-slate-200'
            }`}
            title="Attach Link"
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </button>

          {/* Remove Link Button if link active */}
          {activeFormats.hasLink && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleRemoveLink}
              className="p-1.5 rounded-xl transition cursor-pointer hover:bg-rose-600/40 text-rose-300"
              title="Remove Hyperlink"
            >
              <Unlink className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Clear Formatting */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleClearFormat}
            className="p-1.5 rounded-xl transition cursor-pointer hover:bg-white/20 text-slate-300"
            title="Clear formatting on selection"
          >
            <RemoveFormatting className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ─── Inline Hyperlink Modal / Popover ─── */}
      {activeMenu === 'link' && (
        <div
          className="absolute z-50 left-1/2 -translate-x-1/2 top-14 w-80 bg-[#160E2E]/98 backdrop-blur-2xl border border-violet-600/50 rounded-2xl p-3.5 shadow-2xl space-y-2.5 animate-in fade-in zoom-in-95"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center space-x-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-sky-400" />
              <span>Attach Hyperlink / Direct URL</span>
            </span>
            <button
              type="button"
              onClick={() => setActiveMenu(null)}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            <div>
              <label className="block text-[10px] font-semibold text-violet-300 mb-1 text-left">
                Destination URL
              </label>
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleApplyLink(e);
                  }
                }}
                placeholder="https://example.com"
                className="w-full px-3 py-2 bg-[#211642] border border-violet-700/60 rounded-xl text-xs text-white placeholder:text-violet-400/40 focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-violet-300 mb-1 text-left">
                Display Text (Optional / Direct URL)
              </label>
              <input
                type="text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleApplyLink(e);
                  }
                }}
                placeholder="e.g. Visit Website"
                className="w-full px-3 py-2 bg-[#211642] border border-violet-700/60 rounded-xl text-xs text-white placeholder:text-violet-400/40 focus:outline-none focus:ring-2 focus:ring-sky-400/50"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-1">
              {activeFormats.hasLink && (
                <button
                  type="button"
                  onClick={handleRemoveLink}
                  className="px-3 py-1.5 text-rose-300 hover:bg-rose-950/40 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center space-x-1"
                >
                  <Unlink className="w-3 h-3" />
                  <span>Unlink</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveMenu(null)}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-slate-300 font-semibold rounded-xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyLink}
                disabled={!linkUrl.trim()}
                className="px-4 py-1.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow-md transition disabled:opacity-40 cursor-pointer flex items-center space-x-1"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Apply Link</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Rich Text contentEditable Workspace ─── */}
      <div
        className={`relative flex-1 flex flex-col justify-center p-3 text-center overflow-y-auto no-scrollbar w-full ${
          isCompact ? 'max-h-36' : 'min-h-[140px]'
        }`}
        style={{ minHeight }}
      >
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onKeyDown={handleKeyDown}
          onInput={notifyChange}
          onBlur={notifyChange}
          onPaste={handlePaste}
          onCompositionStart={() => {
            isComposingRef.current = true;
          }}
          onCompositionEnd={() => {
            isComposingRef.current = false;
            notifyChange();
          }}
          className={`w-full outline-none leading-relaxed text-white ${
            isCompact ? 'text-base sm:text-lg' : 'text-xl sm:text-2xl'
          } break-words ${fontClass} selection:bg-indigo-500/40 selection:text-white cursor-text`}
          style={{ minHeight: '60px' }}
        />

        {/* Placeholder overlay when editor is empty */}
        {(!value || isHtmlEmpty(value)) && (
          <div
            onClick={() => editorRef.current?.focus()}
            className={`absolute inset-0 flex items-center justify-center p-4 text-white/50 ${
              isCompact ? 'text-base sm:text-lg' : 'text-xl sm:text-2xl'
            } pointer-events-none ${fontClass}`}
          >
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
};
