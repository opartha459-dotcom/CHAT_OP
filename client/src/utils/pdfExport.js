/**
 * Zero-dependency, standards-compliant PDF 1.4 generator for PulseChat transcripts.
 * Produces A4 multi-page PDFs with margins, headers, footers, page numbers,
 * word/character wrapping, and keep-together message blocks.
 */

const PAGE_W = 595.28; // A4 width in pt
const PAGE_H = 841.89; // A4 height in pt
const MARGIN_X = 46;
const MARGIN_TOP = 64;
const MARGIN_BOTTOM = 54;
const CONTENT_W = PAGE_W - MARGIN_X * 2; // ~503.28 pt

// Convert arbitrary Unicode text into PDF WinAnsi-safe ASCII + basic Latin-1
function sanitizePdfText(str = '') {
  return String(str)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, '  ')
    // Replace common symbols/emojis with readable ASCII equivalents
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2014/g, '--')
    .replace(/\u2013/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u2022/g, '*')
    // Strip characters outside printable Latin-1 range so PDF Type1 Helvetica never corrupts
    .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, '');
}

function escapePdfLiteral(str = '') {
  return str.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

// Approximate character width in Helvetica at given fontSize (pt)
function wrapTextLines(text, maxWidthPt, fontSize = 10) {
  const avgCharW = fontSize * 0.52;
  const maxChars = Math.max(16, Math.floor(maxWidthPt / avgCharW));
  const clean = sanitizePdfText(text);
  const paragraphs = clean.split('\n');
  const lines = [];

  for (const para of paragraphs) {
    if (!para.trim()) {
      lines.push('');
      continue;
    }
    const words = para.split(/\s+/);
    let current = '';

    for (const word of words) {
      if (!word) continue;
      // Break ultra-long continuous tokens (URLs, hashes, unbroken strings)
      if (word.length > maxChars) {
        if (current) {
          lines.push(current);
          current = '';
        }
        for (let i = 0; i < word.length; i += maxChars) {
          const chunk = word.slice(i, i + maxChars);
          if (i + maxChars < word.length) {
            lines.push(chunk);
          } else {
            current = chunk;
          }
        }
        continue;
      }

      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length <= maxChars) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }

  return lines.length > 0 ? lines : [''];
}

function pdfTextOp(x, y, text, font = 'F1', size = 10, rgb = [0.1, 0.13, 0.2]) {
  const safe = escapePdfLiteral(text);
  return [
    'BT',
    `/${font} ${size} Tf`,
    `${rgb[0]} ${rgb[1]} ${rgb[2]} rg`,
    `1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm`,
    `(${safe}) Tj`,
    'ET'
  ].join('\n');
}

function pdfRectOp(x, y, w, h, rgb, fill = true) {
  return [
    `${rgb[0]} ${rgb[1]} ${rgb[2]} ${fill ? 'rg' : 'RG'}`,
    `${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`,
    fill ? 'f' : 'S'
  ].join('\n');
}

function pdfLineOp(x1, y1, x2, y2, rgb = [0.85, 0.88, 0.92], width = 0.6) {
  return [
    `${width} w`,
    `${rgb[0]} ${rgb[1]} ${rgb[2]} RG`,
    `${x1.toFixed(2)} ${y1.toFixed(2)} m`,
    `${x2.toFixed(2)} ${y2.toFixed(2)} l`,
    'S'
  ].join('\n');
}

/**
 * Generates a professional multi-page PDF Blob for a chat transcript.
 */
export function generateChatTranscriptPdf({
  title = 'PulseChat Conversation',
  type = 'direct',
  participants = [],
  exportedBy = 'User',
  exportedAt = new Date(),
  messages = []
}) {
  const pages = [];
  let ops = [];
  let cursorY = PAGE_H - MARGIN_TOP;

  const startNewPage = (isFirst = false) => {
    if (ops.length > 0) pages.push(ops);
    ops = [];

    if (isFirst) {
      // Branded Indigo Header Banner
      const bannerH = 54;
      const bannerY = PAGE_H - 34 - bannerH;
      ops.push(pdfRectOp(MARGIN_X, bannerY, CONTENT_W, bannerH, [0.31, 0.27, 0.9], true));
      ops.push(pdfTextOp(MARGIN_X + 16, bannerY + 32, 'PulseChat', 'F2', 17, [1, 1, 1]));
      ops.push(pdfTextOp(MARGIN_X + 16, bannerY + 14, 'OFFICIAL ENCRYPTED CHAT TRANSCRIPT', 'F2', 8.5, [0.82, 0.85, 1]));
      ops.push(
        pdfTextOp(
          PAGE_W - MARGIN_X - 150,
          bannerY + 23,
          `Generated ${exportedAt.toLocaleDateString()}`,
          'F1',
          9,
          [0.9, 0.92, 1]
        )
      );

      cursorY = bannerY - 18;

      // Document Metadata Summary Box
      const partText = participants.length > 0 ? participants.join(', ') : title;
      const partLines = wrapTextLines(`Participants: ${partText}`, CONTENT_W - 24, 9);
      const metaH = 38 + partLines.length * 12;
      const metaY = cursorY - metaH;

      ops.push(pdfRectOp(MARGIN_X, metaY, CONTENT_W, metaH, [0.96, 0.97, 0.99], true));
      ops.push(pdfRectOp(MARGIN_X, metaY, CONTENT_W, metaH, [0.85, 0.88, 0.94], false));
      ops.push(pdfTextOp(MARGIN_X + 12, cursorY - 16, sanitizePdfText(title), 'F2', 12, [0.06, 0.09, 0.16]));
      ops.push(
        pdfTextOp(
          MARGIN_X + 12,
          cursorY - 30,
          sanitizePdfText(
            `Type: ${type === 'group' ? 'Group Chat' : 'Direct Message'}   |   Messages: ${messages.length}   |   Exported by: @${exportedBy}`
          ),
          'F1',
          8.5,
          [0.39, 0.45, 0.55]
        )
      );
      partLines.forEach((line, idx) => {
        ops.push(pdfTextOp(MARGIN_X + 12, cursorY - 44 - idx * 12, line, 'F1', 8.5, [0.39, 0.45, 0.55]));
      });

      cursorY = metaY - 18;
    } else {
      // Running Header on continuation pages
      ops.push(
        pdfTextOp(
          MARGIN_X,
          PAGE_H - 36,
          sanitizePdfText(`PulseChat Transcript -- ${title}`),
          'F2',
          9,
          [0.39, 0.45, 0.55]
        )
      );
      ops.push(pdfLineOp(MARGIN_X, PAGE_H - 44, PAGE_W - MARGIN_X, PAGE_H - 44, [0.85, 0.88, 0.94], 0.7));
      cursorY = PAGE_H - MARGIN_TOP;
    }
  };

  startNewPage(true);

  if (messages.length === 0) {
    ops.push(pdfTextOp(MARGIN_X, cursorY - 14, 'No messages in this conversation.', 'F3', 10, [0.45, 0.5, 0.58]));
  } else {
    for (const m of messages) {
      const sender = sanitizePdfText(m.sender || 'System');
      const timeStr = m.timestamp ? new Date(m.timestamp).toLocaleString() : '';
      const rawBody = m.isDeleted
        ? '[This message was deleted]'
        : m.content || (m.attachment ? '' : '[Empty message]');
      const bodyLines = wrapTextLines(rawBody, CONTENT_W - 24, 9.5);
      const hasAttachment = Boolean(m.attachment);
      const attachmentText = hasAttachment
        ? sanitizePdfText(`[Attachment: ${m.attachment.name || m.attachment.url || 'Media file'}]`)
        : '';

      const lineH = 13;
      const bodyBlockH = bodyLines.length * lineH;
      const attachH = hasAttachment ? 14 : 0;
      const blockH = 20 + bodyBlockH + attachH + 10; // header + body + attachment + bottom padding

      // Keep message block intact; break page if it overflows bottom margin
      if (cursorY - blockH < MARGIN_BOTTOM) {
        startNewPage(false);
      }

      // Draw subtle left accent bar & card background
      const cardBottomY = cursorY - blockH + 4;
      ops.push(pdfRectOp(MARGIN_X, cardBottomY, CONTENT_W, blockH - 4, [0.985, 0.988, 0.995], true));
      ops.push(pdfRectOp(MARGIN_X, cardBottomY, 3, blockH - 4, m.isMe ? [0.31, 0.27, 0.9] : [0.58, 0.64, 0.72], true));

      // Sender + Timestamp header
      ops.push(pdfTextOp(MARGIN_X + 12, cursorY - 13, sender, 'F2', 9.5, m.isMe ? [0.31, 0.27, 0.9] : [0.06, 0.09, 0.16]));
      const timeX = PAGE_W - MARGIN_X - Math.min(160, timeStr.length * 4.6 + 8);
      ops.push(pdfTextOp(timeX, cursorY - 13, sanitizePdfText(timeStr), 'F1', 8, [0.45, 0.5, 0.58]));

      // Message Body Lines
      let textY = cursorY - 27;
      for (const line of bodyLines) {
        if (line) {
          ops.push(
            pdfTextOp(
              MARGIN_X + 12,
              textY,
              line,
              m.isDeleted ? 'F3' : 'F1',
              9.5,
              m.isDeleted ? [0.5, 0.55, 0.63] : [0.15, 0.19, 0.27]
            )
          );
        }
        textY -= lineH;
      }

      if (hasAttachment) {
        const attachLines = wrapTextLines(attachmentText, CONTENT_W - 24, 8.5);
        ops.push(pdfTextOp(MARGIN_X + 12, textY, attachLines[0] || '', 'F3', 8.5, [0.01, 0.52, 0.78]));
      }

      cursorY -= blockH + 4;
    }
  }

  if (ops.length > 0) pages.push(ops);

  // Add consistent footers & page numbers ("Page X of Y") to every page
  const totalPages = pages.length;
  const pageContents = pages.map((pageOps, idx) => {
    const footerY = 28;
    const footerOps = [
      pdfLineOp(MARGIN_X, footerY + 12, PAGE_W - MARGIN_X, footerY + 12, [0.85, 0.88, 0.94], 0.6),
      pdfTextOp(MARGIN_X, footerY, 'PulseChat Secure Messaging -- Confidential Transcript', 'F1', 8, [0.47, 0.53, 0.62]),
      pdfTextOp(PAGE_W - MARGIN_X - 58, footerY, `Page ${idx + 1} of ${totalPages}`, 'F2', 8, [0.39, 0.45, 0.55])
    ];
    return [...pageOps, ...footerOps].join('\n');
  });

  // Assemble valid PDF 1.4 binary structure
  // Objects: 1=Catalog, 2=Pages, 3=Helvetica, 4=Helvetica-Bold, 5=Helvetica-Oblique,
  // then for each page: PageObj, ContentStreamObj
  const objects = [];
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');

  const pageObjIds = pageContents.map((_, i) => 6 + i * 2);
  objects.push(
    `2 0 obj\n<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${totalPages} >>\nendobj`
  );
  objects.push('3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj');
  objects.push('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj');
  objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>\nendobj');

  pageContents.forEach((streamStr, i) => {
    const pageId = 6 + i * 2;
    const contentId = pageId + 1;
    objects.push(
      `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${contentId} 0 R >>\nendobj`
    );
    objects.push(
      `${contentId} 0 obj\n<< /Length ${streamStr.length} >>\nstream\n${streamStr}\nendstream\nendobj`
    );
  });

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj + '\n';
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
}
