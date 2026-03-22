import logo from '../assets/CVACare_Logo.png';

// Exact design tokens from the website's CSS (index.css + TherapistDashboard.css)
const C = {
  // Brand colours
  primary:        [206, 54, 48],   // --color-primary  #ce3630
  primaryDark:    [181, 46, 41],   // #b52e29
  // Dark-slate (matches .logs-table.gait-table thead gradient start #1e293b)
  slateDeep:      [30, 41, 59],    // #1e293b
  slateDark:      [51, 65, 85],    // #334155
  // Text colours
  text:           [51, 51, 51],    // --color-text  #333333
  textBody:       [51, 65, 85],    // #334155  (table cell text)
  textMuted:      [100, 116, 139], // #64748b  (labels, subtitles)
  textLight:      [148, 163, 184], // #94a3b8  (secondary muted)
  white:          [255, 255, 255],
  // Backgrounds
  pageBg:         [245, 247, 250], // #f5f7fa
  metaBg:         [248, 249, 250], // #f8f9fa
  cardBg:         [255, 255, 255], // white (all cards)
  rowAlt:         [248, 250, 252], // #f8fafc  (alternate table rows)
  rowBorder:      [241, 245, 249], // #f1f5f9  (table row divider)
  // Borders
  border:         [229, 231, 235], // #e5e7eb  (card/section borders)
  // Score colours — exact values from .overview-activity-score classes
  scoreHighBg:    [220, 252, 231], // #dcfce7
  scoreHighText:  [22, 101, 52],   // #166534
  scoreMidBg:     [254, 243, 199], // #fef3c7
  scoreMidText:   [146, 64, 14],   // #92400e
  scoreLowBg:     [254, 202, 202], // #fecaca
  scoreLowText:   [153, 27, 27],   // #991b1b
  // Severity badge colours — exact values from .severity-* classes
  mildBg:         [209, 250, 229], // #d1fae5
  mildText:       [6, 95, 70],     // #065f46
  mildBorder:     [110, 231, 183], // #6ee7b7
  moderateBg:     [254, 215, 170], // #fed7aa
  moderateText:   [146, 64, 14],   // #92400e
  moderateBorder: [251, 191, 36],  // #fbbf24
  severeBg:       [254, 202, 202], // #fecaca
  severeText:     [153, 27, 27],   // #991b1b
  severeBorder:   [248, 113, 113], // #f87171
  unknownBg:      [229, 231, 235], // #e5e7eb
  unknownText:    [75, 85, 99],    // #4b5563
  unknownBorder:  [209, 213, 219], // #d1d5db
  // Problem chip colours — exact values from .problem-chip class
  chipBg:         [254, 226, 226], // #fee2e2
  chipBgDark:     [254, 202, 202], // #fecaca
  chipText:       [153, 27, 27],   // #991b1b
  chipBorder:     [252, 165, 165], // #fca5a5
};

const PAGE_MARGIN = 14;
const HEADER_HEIGHT = 40;  // 37mm slate band + 3mm primary accent
const META_BAR_HEIGHT = 14;

const loadImageAsDataUrl = (src) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });

const getScoreStyle = (score) => {
  if (score >= 80) return { bg: C.scoreHighBg, text: C.scoreHighText };
  if (score >= 60) return { bg: C.scoreMidBg, text: C.scoreMidText };
  return { bg: C.scoreLowBg, text: C.scoreLowText };
};

const getSeverityStyle = (severity) => {
  const s = (severity ?? '').toLowerCase();
  if (s === 'mild')     return { bg: C.mildBg,     text: C.mildText,     border: C.mildBorder };
  if (s === 'moderate') return { bg: C.moderateBg,  text: C.moderateText, border: C.moderateBorder };
  if (s === 'severe')   return { bg: C.severeBg,    text: C.severeText,   border: C.severeBorder };
  return { bg: C.unknownBg, text: C.unknownText, border: C.unknownBorder };
};

// Header — dark-slate band matching the website's .logs-table.gait-table thead
// with 3 px primary-red bottom accent (matching thead border-bottom: 3px solid primary)
const addBrandedHeader = (doc, title, logoDataUrl) => {
  const { width: pageWidth } = doc.internal.pageSize;

  doc.setFillColor(...C.slateDeep);
  doc.rect(0, 0, pageWidth, HEADER_HEIGHT - 3, 'F');

  doc.setFillColor(...C.primary);
  doc.rect(0, HEADER_HEIGHT - 3, pageWidth, 3, 'F');

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', PAGE_MARGIN, 7, 22, 22);
  }

  const textX = logoDataUrl ? PAGE_MARGIN + 26 : PAGE_MARGIN;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...C.white);
  doc.text('CVAPed', textX, 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...C.textLight);
  doc.text('Speech & Physical Therapy', textX, 25);

  // "OFFICIAL REPORT" badge — matches .admin-badge (primary gradient, border-radius 15px)
  const badgeW = 30;
  const bX = pageWidth - PAGE_MARGIN - badgeW;
  doc.setFillColor(...C.primary);
  doc.roundedRect(bX, 7, badgeW, 6, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(...C.white);
  doc.text('OFFICIAL REPORT', bX + badgeW / 2, 11.2, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...C.white);
  doc.text(title, pageWidth - PAGE_MARGIN, 20, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...C.textLight);
  doc.text(
    `Generated: ${new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`,
    pageWidth - PAGE_MARGIN,
    28,
    { align: 'right' }
  );
};

// Meta bar below header — matches the website's controls/info strip (#f8f9fa bg)
const addReportMetaBar = (doc, patientCount) => {
  const { width: pageWidth } = doc.internal.pageSize;
  const colW = (pageWidth - 2 * PAGE_MARGIN) / 3;

  doc.setFillColor(...C.metaBg);
  doc.rect(0, HEADER_HEIGHT, pageWidth, META_BAR_HEIGHT, 'F');
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.2);
  doc.line(0, HEADER_HEIGHT + META_BAR_HEIGHT, pageWidth, HEADER_HEIGHT + META_BAR_HEIGHT);

  const items = [
    { label: 'REPORT TYPE', value: 'Physical Therapy — Gait Analysis' },
    { label: 'PATIENTS',    value: String(patientCount) },
    { label: 'PLATFORM',    value: 'CVAPed Health System' },
  ];

  items.forEach((item, i) => {
    const x = PAGE_MARGIN + i * colW + colW / 2;
    if (i > 0) {
      doc.setDrawColor(...C.border);
      doc.setLineWidth(0.2);
      doc.line(
        PAGE_MARGIN + i * colW, HEADER_HEIGHT + 3,
        PAGE_MARGIN + i * colW, HEADER_HEIGHT + META_BAR_HEIGHT - 3
      );
    }
    // Uppercase micro-label matching .metric-label style
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(...C.textMuted);
    doc.text(item.label, x, HEADER_HEIGHT + 5.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.textBody);
    doc.text(item.value, x, HEADER_HEIGHT + 11.5, { align: 'center' });
  });
};

// Footer — matches website's admin-header pattern (light bg, primary top accent stripe)
const addPageFooters = (doc) => {
  const totalPages = doc.internal.getNumberOfPages();
  const { width: pageWidth, height: pageHeight } = doc.internal.pageSize;

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    doc.setFillColor(...C.metaBg);
    doc.rect(0, pageHeight - 14, pageWidth, 14, 'F');

    doc.setFillColor(...C.primary);
    doc.rect(0, pageHeight - 14, pageWidth, 2, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...C.textMuted);
    doc.text(
      'CVAPed — Speech & Physical Therapy',
      PAGE_MARGIN,
      pageHeight - 5
    );

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(...C.textLight);
    doc.text('Confidential — For Medical Use Only', pageWidth / 2, pageHeight - 5, {
      align: 'center',
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...C.primary);
    doc.text(`${i} / ${totalPages}`, pageWidth - PAGE_MARGIN, pageHeight - 5, {
      align: 'right',
    });
  }
};

// Patient card — white card with shadow, red left bar, avatar circle matching
// .patient-avatar-small (primary gradient, white initials), score/severity badges
// matching exact website colour classes
const renderPatientCard = (doc, patient, yPos, patientIndex, totalPatients) => {
  const { width: pageWidth } = doc.internal.pageSize;
  const cardWidth = pageWidth - 2 * PAGE_MARGIN;
  const cardHeight = 38;
  const accentW = 4;

  // Drop shadow (matches card box-shadow: 0 2px 12px rgba(0,0,0,0.08))
  doc.setFillColor(210, 213, 219);
  doc.roundedRect(PAGE_MARGIN + 0.8, yPos + 1, cardWidth, cardHeight, 3, 3, 'F');

  // White card background (matches .datatable-container background: white)
  doc.setFillColor(...C.cardBg);
  doc.roundedRect(PAGE_MARGIN, yPos, cardWidth, cardHeight, 3, 3, 'F');

  // Card border (matches border: 1px solid #e5e7eb)
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.2);
  doc.roundedRect(PAGE_MARGIN, yPos, cardWidth, cardHeight, 3, 3, 'S');

  // Left primary accent bar
  doc.setFillColor(...C.primary);
  doc.roundedRect(PAGE_MARGIN, yPos, accentW, cardHeight, 2, 2, 'F');
  doc.rect(PAGE_MARGIN + 1.5, yPos, accentW - 1.5, cardHeight, 'F');

  // Patient avatar circle — matches .patient-avatar-small
  // (background: linear-gradient(135deg, primary 0%, primaryDark 100%), white initials)
  const avCX = PAGE_MARGIN + accentW + 9;
  const avCY = yPos + 13;
  doc.setFillColor(...C.primary);
  doc.circle(avCX, avCY, 6, 'F');

  const initials = (patient.name ?? 'U')
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0] ?? '')
    .join('')
    .toUpperCase();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...C.white);
  doc.text(initials, avCX, avCY + 2.5, { align: 'center' });

  // "X of Y" sub-label below avatar
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(...C.textMuted);
  doc.text(`${patientIndex + 1} of ${totalPatients}`, avCX, yPos + 29, { align: 'center' });

  const nameX = PAGE_MARGIN + accentW + 20;

  // Patient name — matches .patient-name-text (font-weight 600, color #333)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...C.text);
  doc.text(patient.name ?? 'Unknown Patient', nameX, yPos + 13);

  // Email — matches .email-text (color #64748b, font-size 0.85rem)
  if (patient.email) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.textMuted);
    doc.text(patient.email, nameX, yPos + 21);
  }

  // Analysis date
  if (patient.date) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...C.textLight);
    doc.text(`Analysis: ${patient.date}`, nameX, yPos + 30);
  }

  // Score badge — exact colours from .overview-activity-score.score-high/mid/low
  if (patient.score !== undefined && patient.score !== null) {
    const scoreStyle = getScoreStyle(patient.score);
    const badgeW = 38;
    const badgeH = 14;
    const bX = pageWidth - PAGE_MARGIN - badgeW - 4;
    const bY = yPos + 3;

    doc.setFillColor(...scoreStyle.bg);
    doc.roundedRect(bX, bY, badgeW, badgeH, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(...scoreStyle.text);
    doc.text('OVERALL SCORE', bX + badgeW / 2, bY + 4.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(`${patient.score}%`, bX + badgeW / 2, bY + 12.5, { align: 'center' });

    // Progress bar below score badge
    const barY = yPos + 20;
    const fillW = Math.max(0, (patient.score / 100) * badgeW);
    doc.setFillColor(...C.border);
    doc.roundedRect(bX, barY, badgeW, 3, 1.5, 1.5, 'F');
    if (fillW > 0) {
      doc.setFillColor(...scoreStyle.text);
      doc.roundedRect(bX, barY, fillW, 3, 1.5, 1.5, 'F');
    }

    // Severity badge — exact colours from .severity-mild/moderate/severe/unknown
    if (patient.severity) {
      const sevStyle = getSeverityStyle(patient.severity);
      const sevLabel = `Severity: ${patient.severity}`;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      const sevW = doc.getTextWidth(sevLabel) + 8;
      const sevX = bX + (badgeW - sevW) / 2;
      const sevY = yPos + 27;

      doc.setFillColor(...sevStyle.bg);
      doc.roundedRect(sevX, sevY, sevW, 6.5, 1.5, 1.5, 'F');
      doc.setDrawColor(...sevStyle.border);
      doc.setLineWidth(0.3);
      doc.roundedRect(sevX, sevY, sevW, 6.5, 1.5, 1.5, 'S');
      doc.setTextColor(...sevStyle.text);
      doc.text(sevLabel, sevX + sevW / 2, sevY + 4.7, { align: 'center' });
    }
  }

  return yPos + cardHeight + 6;
};

// Section label — matches .gait-metric-item .metric-label
// (uppercase, #64748b, bold, 0.75rem, letter-spacing 0.5px)
const renderSectionLabel = (doc, label, yPos) => {
  const { width: pageWidth } = doc.internal.pageSize;

  doc.setFillColor(...C.primary);
  doc.rect(PAGE_MARGIN, yPos, 2.5, 7, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.textMuted);
  doc.text(label.toUpperCase(), PAGE_MARGIN + 5.5, yPos + 5.2);

  const labelWidth = doc.getTextWidth(label.toUpperCase());
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.2);
  doc.line(PAGE_MARGIN + 7.5 + labelWidth, yPos + 3.5, pageWidth - PAGE_MARGIN, yPos + 3.5);

  return yPos + 10;
};

// Detected issues chips — exact colours from .problem-chip
// (background: linear-gradient(#fee2e2→#fecaca), color #991b1b, border #fca5a5)
const renderDetectedIssues = (doc, problems, yPos) => {
  const { width: pageWidth } = doc.internal.pageSize;
  const contentW = pageWidth - 2 * PAGE_MARGIN;
  const COLS = 2;
  const colGap = 3;
  const cellW = (contentW - colGap) / COLS;
  const chipH = 12;
  const rowGap = 3;
  const accentW = 4;

  problems.forEach((problem, idx) => {
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    const x = PAGE_MARGIN + col * (cellW + colGap);
    const y = yPos + row * (chipH + rowGap);

    doc.setFillColor(220, 210, 210);
    doc.roundedRect(x + 0.5, y + 0.8, cellW, chipH, 2, 2, 'F');

    doc.setFillColor(...C.chipBg);
    doc.roundedRect(x, y, cellW, chipH, 2, 2, 'F');

    doc.setFillColor(...C.primary);
    doc.roundedRect(x, y, accentW, chipH, 1.5, 1.5, 'F');
    doc.rect(x + 1.5, y, accentW - 1.5, chipH, 'F');

    doc.setDrawColor(...C.chipBorder);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, cellW, chipH, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...C.white);
    doc.text('!', x + accentW / 2, y + 8, { align: 'center' });

    const text = problem
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.chipText);
    const maxW = cellW - accentW - 6;
    const lines = doc.splitTextToSize(text, maxW);
    const lineH = 4;
    const textStartY = y + (chipH - lines.length * lineH) / 2 + lineH;
    doc.text(lines, x + accentW + 4, textStartY);
  });

  const totalRows = Math.ceil(problems.length / COLS);
  return yPos + totalRows * (chipH + rowGap) + 4;
};

// Patient separator — matches website section-header pattern
// (border-bottom: 3px solid #e5e7eb with centered label)
const renderPatientSeparator = (doc, nextPatientIndex, totalPatients, yPos) => {
  const { width: pageWidth } = doc.internal.pageSize;
  const sepY = yPos + 6;
  const label = `Patient ${nextPatientIndex + 2} of ${totalPatients}`;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  const labelW = doc.getTextWidth(label);
  const pad = 4;
  const midX = pageWidth / 2;

  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.5);
  doc.line(PAGE_MARGIN, sepY, midX - labelW / 2 - pad - 2, sepY);
  doc.line(midX + labelW / 2 + pad + 2, sepY, pageWidth - PAGE_MARGIN, sepY);

  doc.setTextColor(...C.textMuted);
  doc.text(label, midX, sepY + 2, { align: 'center' });

  return sepY + 8;
};

/**
 * generatePdfReport
 *
 * Reusable PDF report generator for CVAPed. Produces a branded A4 report with
 * a header (logo + title), per-patient info cards, a structured data table, and
 * a branded footer on every page.
 *
 * @param {object}   config
 * @param {string}   config.title           - Report title shown in the header
 * @param {Array}    config.patients        - Array of patient objects:
 *   {
 *     name:        string,
 *     email:       string,
 *     score:       number,    // 0-100, used for colour-coded badge
 *     severity:    string,    // 'mild' | 'moderate' | 'severe'
 *     date:        string,    // pre-formatted display string
 *     problems:    string[],  // list of detected issue strings
 *     metricsRows: Array<object>  // row data matching metricsColumns
 *     exerciseRows: Array<object> // row data matching exerciseColumns
 *   }
 * @param {Array}    config.metricsColumns  - Column definitions: [{ header, dataKey }]
 * @param {Array}    config.exerciseColumns - Column definitions for exercise table
 * @param {string}   config.filename        - Output filename WITHOUT .pdf extension
 */
export const generatePdfReport = async ({
  title = 'Report',
  patients = [],
  metricsColumns = [],
  exerciseColumns = [],
  filename = 'CVAPed_Report',
}) => {
  const [{ default: jsPDF }, { default: autoTable }, logoDataUrl] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    loadImageAsDataUrl(logo),
  ]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { height: pageHeight } = doc.internal.pageSize;

  addBrandedHeader(doc, title, logoDataUrl);
  addReportMetaBar(doc, patients.length);

  let yPos = HEADER_HEIGHT + META_BAR_HEIGHT + 6;

  patients.forEach((patient, idx) => {
    const estimatedCardHeight   = 44;
    const estimatedTableHeight  = patient.metricsRows?.length ? patient.metricsRows.length * 8 + 24 : 0;
    const estimatedIssuesHeight = patient.problems?.length ? 22 : 0;
    const estimatedExerciseHeight = patient.exerciseRows?.length ? patient.exerciseRows.length * 8 + 24 : 0;
    const blockHeight =
      estimatedCardHeight +
      (patient.metricsRows?.length ? estimatedTableHeight : 0) +
      (patient.problems?.length ? estimatedIssuesHeight : 0) +
      (patient.exerciseRows?.length ? estimatedExerciseHeight : 0) +
      16;

    if (yPos + blockHeight > pageHeight - 20 && idx > 0) {
      doc.addPage();
      addBrandedHeader(doc, title, logoDataUrl);
      yPos = HEADER_HEIGHT + 6;
    }

    yPos = renderPatientCard(doc, patient, yPos, idx, patients.length);

    if (patient.metricsRows?.length > 0 && metricsColumns.length > 0) {
      yPos = renderSectionLabel(doc, 'Gait Metrics', yPos);
      autoTable(doc, {
        startY: yPos,
        head: [metricsColumns.map((c) => c.header)],
        body: patient.metricsRows.map((row) =>
          metricsColumns.map((c) => {
            const val = row[c.dataKey];
            return val !== undefined && val !== null ? String(val) : '—';
          })
        ),
        margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
        styles: {
          fontSize: 8,
          cellPadding: { top: 3, bottom: 3, left: 5, right: 5 },
          textColor: C.textBody,
          lineColor: C.rowBorder,
          lineWidth: 0.15,
          valign: 'middle',
        },
        headStyles: {
          fillColor: C.slateDeep,
          textColor: C.white,
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center',
          cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
        },
        alternateRowStyles: {
          fillColor: C.rowAlt,
        },
        columnStyles: {
          0: { fontStyle: 'bold', textColor: C.textMuted, halign: 'left' },
          1: { halign: 'center', fontStyle: 'bold', textColor: C.primary },
        },
        theme: 'grid',
      });
      yPos = doc.lastAutoTable.finalY + 6;
    }

    if (patient.problems?.length > 0) {
      yPos = renderSectionLabel(doc, 'Detected Issues', yPos);
      yPos = renderDetectedIssues(doc, patient.problems, yPos);
    }

    if (patient.exerciseRows?.length > 0 && exerciseColumns.length > 0) {
      yPos = renderSectionLabel(doc, 'Prescribed Exercises', yPos);
      autoTable(doc, {
        startY: yPos,
        head: [exerciseColumns.map((c) => c.header)],
        body: patient.exerciseRows.map((row) =>
          exerciseColumns.map((c) => {
            const val = row[c.dataKey];
            return val !== undefined && val !== null ? String(val) : '—';
          })
        ),
        margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
        styles: {
          fontSize: 8,
          cellPadding: { top: 3, bottom: 3, left: 5, right: 5 },
          textColor: C.textBody,
          lineColor: C.rowBorder,
          lineWidth: 0.15,
          valign: 'middle',
        },
        headStyles: {
          fillColor: C.primary,
          textColor: C.white,
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center',
          cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
        },
        alternateRowStyles: {
          fillColor: C.rowAlt,
        },
        columnStyles: {
          0: { fontStyle: 'bold', textColor: C.textMuted, halign: 'left' },
          1: { halign: 'center', textColor: C.textMuted },
          2: { halign: 'center', textColor: C.primary },
          3: { halign: 'center', fontStyle: 'bold' },
        },
        theme: 'grid',
      });
      yPos = doc.lastAutoTable.finalY + 6;
    }

    if (idx < patients.length - 1) {
      yPos = renderPatientSeparator(doc, idx, patients.length, yPos);
    }
  });

  addPageFooters(doc);
  doc.save(`${filename}.pdf`);
};

export const PHYSICAL_THERAPY_METRICS_COLUMNS = [
  { header: 'Metric', dataKey: 'metric' },
  { header: 'Value',  dataKey: 'value' },
];

export const buildGaitMetricsRows = (gaitMetrics, analysisDuration, dataQuality) => {
  if (!gaitMetrics) return [];
  const fmt = (val, suffix = '') =>
    val !== undefined && val !== null
      ? `${Number(val).toFixed(val % 1 === 0 ? 0 : 1)}${suffix}`
      : '—';
  const has = (v) => v != null && v !== '' && !Number.isNaN(Number(v));

  const getCadenceStatus  = (v) => v >= 100 ? 'Fast'      : v >= 80 ? 'Normal'    : 'Slow';
  const getVelocityStatus = (v) => v >= 1.2  ? 'Fast'      : v >= 0.8 ? 'Normal'   : 'Slow';
  // symmetry/stability/regularity arrive already ×100 from backend
  const getSymmetryStatus  = (v) => v >= 90   ? 'Excellent' : v >= 70  ? 'Good'     : 'Fair';
  const getStabilityStatus = (v) => v >= 80   ? 'Stable'    : v >= 60  ? 'Moderate' : 'Unstable';
  const getStrideStatus    = (v) => v >= 1.2  ? 'Long'      : v >= 0.8 ? 'Normal'   : 'Short';
  const getRegularityStatus = (v) => v >= 80  ? 'Consistent': v >= 60  ? 'Regular'  : 'Irregular';
  const getStepsStatus     = (v) => v >= 30   ? 'Excellent' : v >= 15  ? 'Good'     : 'Low';

  return [
    {
      metric: 'Steps',
      value: has(gaitMetrics.step_count) ? String(gaitMetrics.step_count) : '—',
      status: has(gaitMetrics.step_count) ? getStepsStatus(gaitMetrics.step_count) : 'N/A',
    },
    {
      metric: 'Cadence',
      value: fmt(gaitMetrics.cadence, ' steps/min'),
      status: has(gaitMetrics.cadence) ? getCadenceStatus(gaitMetrics.cadence) : 'N/A',
    },
    {
      metric: 'Stride Length',
      value: fmt(gaitMetrics.stride_length, ' m'),
      status: has(gaitMetrics.stride_length) ? getStrideStatus(gaitMetrics.stride_length) : 'N/A',
    },
    {
      metric: 'Velocity',
      value: fmt(gaitMetrics.velocity, ' m/s'),
      status: has(gaitMetrics.velocity) ? getVelocityStatus(gaitMetrics.velocity) : 'N/A',
    },
    {
      metric: 'Gait Symmetry',
      value: fmt(gaitMetrics.gait_symmetry, '%'),
      status: has(gaitMetrics.gait_symmetry) ? getSymmetryStatus(gaitMetrics.gait_symmetry) : 'N/A',
    },
    {
      metric: 'Stability Score',
      value: fmt(gaitMetrics.stability_score, '%'),
      status: has(gaitMetrics.stability_score) ? getStabilityStatus(gaitMetrics.stability_score) : 'N/A',
    },
    {
      metric: 'Step Regularity',
      value: fmt(gaitMetrics.step_regularity, '%'),
      status: has(gaitMetrics.step_regularity) ? getRegularityStatus(gaitMetrics.step_regularity) : 'N/A',
    },
    {
      metric: 'Analysis Duration',
      value: analysisDuration ? `${Number(analysisDuration).toFixed(0)}s` : '—',
      status: analysisDuration ? 'Complete' : 'N/A',
    },
    {
      metric: 'Data Quality',
      value: dataQuality ?? '—',
      status: dataQuality
        ? (['good', 'excellent'].includes(dataQuality.toLowerCase()) ? 'Good'
          : dataQuality.toLowerCase() === 'fair' ? 'Fair' : 'Poor')
        : 'N/A',
    },
  ];
};

// ─── Score-band helper (mirrors website getScoreBand logic) ───────────────────
const getScoreBandLabel = (score) => {
  if (score == null) return 'N/A';
  if (score >= 86) return 'Mastered';
  if (score >= 71) return 'Functional';
  if (score >= 51) return 'Mild';
  if (score >= 31) return 'Moderate';
  return 'Severe';
};

const getDeltaText = (delta) => {
  if (delta == null) return 'N/A';
  if (delta > 0) return `+${delta}%`;
  if (delta < 0) return `${delta}%`;
  return '0%';
};

// ─── Diagnostic Comparison meta bar ──────────────────────────────────────────
const addDiagMetaBar = (doc, patientName, assessmentDate, assessmentType) => {
  const { width: pageWidth } = doc.internal.pageSize;
  const colW = (pageWidth - 2 * PAGE_MARGIN) / 3;

  doc.setFillColor(...C.metaBg);
  doc.rect(0, HEADER_HEIGHT, pageWidth, META_BAR_HEIGHT, 'F');
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.2);
  doc.line(0, HEADER_HEIGHT + META_BAR_HEIGHT, pageWidth, HEADER_HEIGHT + META_BAR_HEIGHT);

  const items = [
    { label: 'PATIENT',     value: patientName },
    { label: 'ASSESSMENT',  value: assessmentDate },
    { label: 'TYPE',        value: assessmentType },
  ];

  items.forEach((item, i) => {
    const x = PAGE_MARGIN + i * colW + colW / 2;
    if (i > 0) {
      doc.setDrawColor(...C.border);
      doc.setLineWidth(0.2);
      doc.line(
        PAGE_MARGIN + i * colW, HEADER_HEIGHT + 3,
        PAGE_MARGIN + i * colW, HEADER_HEIGHT + META_BAR_HEIGHT - 3
      );
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(...C.textMuted);
    doc.text(item.label, x, HEADER_HEIGHT + 5.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.textBody);
    doc.text(item.value, x, HEADER_HEIGHT + 11.5, { align: 'center' });
  });
};

/**
 * generateDiagnosticComparisonPdf
 *
 * Exports a branded Diagnostic Comparison report for a single patient.
 *
 * @param {object} config
 * @param {object} config.comparisonData  - diagComparisonData from state
 * @param {object} config.patient         - selectedDiagPatient { firstName, lastName, email }
 * @param {string} [config.filename]      - output filename without .pdf
 */
export const generateDiagnosticComparisonPdf = async ({
  comparisonData,
  patient,
  filename,
}) => {
  const [{ default: jsPDF }, { default: autoTable }, logoDataUrl] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    loadImageAsDataUrl(logo),
  ]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { height: pageHeight, width: pageWidth } = doc.internal.pageSize;

  const patientName = comparisonData?.patient_name
    ?? `${patient?.firstName ?? ''} ${patient?.lastName ?? ''}`.trim();
  const assessmentDate = comparisonData?.assessment_date
    ? new Date(comparisonData.assessment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';
  const assessmentType = comparisonData?.assessment_type
    ? comparisonData.assessment_type.charAt(0).toUpperCase() + comparisonData.assessment_type.slice(1)
    : '—';

  addBrandedHeader(doc, 'Diagnostic Comparison Report', logoDataUrl);
  addDiagMetaBar(doc, patientName, assessmentDate, assessmentType);

  let yPos = HEADER_HEIGHT + META_BAR_HEIGHT + 6;

  // ── Patient info card ──────────────────────────────────────────────────────
  yPos = renderPatientCard(
    doc,
    {
      name: patientName,
      email: patient?.email ?? '',
      date: `Assessment: ${assessmentDate}`,
      score: null,
      severity: comparisonData?.severity_level ?? null,
    },
    yPos,
    0,
    1
  );

  // ── Summary insights row ───────────────────────────────────────────────────
  const si = comparisonData?.summary_insights;
  if (si && Object.keys(si).length > 0) {
    yPos = renderSectionLabel(doc, 'Summary Insights', yPos);

    const insightColW = (pageWidth - 2 * PAGE_MARGIN) / 4;
    const insightH = 18;
    const insightItems = [
      { label: 'AVG CHANGE', value: `${si.overall_avg_delta >= 0 ? '+' : ''}${si.overall_avg_delta}%`, color: si.overall_avg_delta >= 0 ? C.scoreHighText : C.scoreLowText },
      { label: 'IMPROVING',  value: String(si.improving_count),  color: C.mildText },
      { label: 'DECLINING',  value: String(si.declining_count),  color: C.severeText },
      { label: 'STABLE',     value: String(si.stable_count),     color: C.textMuted },
    ];

    insightItems.forEach((item, i) => {
      const bX = PAGE_MARGIN + i * insightColW;
      doc.setFillColor(...C.metaBg);
      doc.roundedRect(bX, yPos, insightColW - 2, insightH, 2, 2, 'F');
      doc.setDrawColor(...C.border);
      doc.setLineWidth(0.2);
      doc.roundedRect(bX, yPos, insightColW - 2, insightH, 2, 2, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(...C.textMuted);
      doc.text(item.label, bX + (insightColW - 2) / 2, yPos + 5.5, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(...item.color);
      doc.text(item.value, bX + (insightColW - 2) / 2, yPos + 14, { align: 'center' });
    });
    yPos += insightH + 6;

    if (si.strongest_area && si.strongest_area.delta > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...C.mildText);
      doc.text(`Most Improved: ${si.strongest_area.metric} (+${si.strongest_area.delta}%)`, PAGE_MARGIN, yPos);
      yPos += 6;
    }
    if (si.weakest_area && si.weakest_area.delta < 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...C.severeText);
      doc.text(`Needs Attention: ${si.weakest_area.metric} (${si.weakest_area.delta}%)`, PAGE_MARGIN, yPos);
      yPos += 6;
    }
    yPos += 2;
  }

  // ── Comparison table ───────────────────────────────────────────────────────
  const hasAnyHomeScores = comparisonData?.home_scores && (
    Object.keys(comparisonData.home_scores.articulation || {}).length > 0 ||
    comparisonData.home_scores.fluency != null ||
    comparisonData.home_scores.receptive != null ||
    comparisonData.home_scores.expressive != null ||
    comparisonData.home_scores.gait?.overall_gait != null
  );
  if (comparisonData?.has_facility_data || hasAnyHomeScores) {
    yPos = renderSectionLabel(doc, 'Facility vs. At-Home Comparison', yPos);

    const rows = [];
    const push = (label, fVal, hVal, delta) => {
      const fBand = getScoreBandLabel(fVal);
      const hBand = getScoreBandLabel(hVal);
      const deltaText = getDeltaText(delta);
      rows.push([
        label,
        fVal != null ? `${fVal}%` : '—',
        fBand,
        hVal != null ? `${hVal}%` : '—',
        hBand,
        deltaText,
      ]);
    };

    ['r', 's', 'l', 'th', 'k'].forEach((sound) => {
      const fVal = comparisonData.facility_scores?.articulation?.[sound];
      const hVal = comparisonData.home_scores?.articulation?.[sound];
      const delta = comparisonData.deltas?.articulation?.[sound];
      if (fVal != null || hVal != null) push(`Articulation /${sound.toUpperCase()}/`, fVal, hVal, delta);
    });

    if (comparisonData.facility_scores?.fluency != null || comparisonData.home_scores?.fluency != null) {
      push('Fluency', comparisonData.facility_scores?.fluency, comparisonData.home_scores?.fluency, comparisonData.deltas?.fluency);
    }
    if (comparisonData.facility_scores?.receptive != null || comparisonData.home_scores?.receptive != null) {
      push('Receptive Language', comparisonData.facility_scores?.receptive, comparisonData.home_scores?.receptive, comparisonData.deltas?.receptive);
    }
    if (comparisonData.facility_scores?.expressive != null || comparisonData.home_scores?.expressive != null) {
      push('Expressive Language', comparisonData.facility_scores?.expressive, comparisonData.home_scores?.expressive, comparisonData.deltas?.expressive);
    }
    if (comparisonData.facility_scores?.gait?.overall_gait != null || comparisonData.home_scores?.gait?.overall_gait != null) {
      push('Gait (Overall)', comparisonData.facility_scores?.gait?.overall_gait, comparisonData.home_scores?.gait?.overall_gait, comparisonData.deltas?.gait);
    }

    if (rows.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Facility Score', 'Level', 'At-Home Score', 'Level', 'Δ Change']],
        body: rows,
        margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
        styles: {
          fontSize: 8,
          cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
          textColor: C.textBody,
          lineColor: C.rowBorder,
          lineWidth: 0.15,
          valign: 'middle',
        },
        headStyles: {
          fillColor: C.slateDeep,
          textColor: C.white,
          fontStyle: 'bold',
          fontSize: 7.5,
          halign: 'center',
          cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
        },
        alternateRowStyles: { fillColor: C.rowAlt },
        columnStyles: {
          0: { fontStyle: 'bold', textColor: C.textMuted, halign: 'left', cellWidth: 42 },
          1: { halign: 'center', fontStyle: 'bold', textColor: C.primary },
          2: { halign: 'center', fontStyle: 'bold', fontSize: 7 },
          3: { halign: 'center', fontStyle: 'bold', textColor: C.scoreHighText },
          4: { halign: 'center', fontStyle: 'bold', fontSize: 7 },
          5: { halign: 'center', fontStyle: 'bold' },
        },
        didParseCell: (data) => {
          if (data.section !== 'body') return;
          const bandColor = (band) => {
            if (band === 'Mastered' || band === 'Functional') return { bg: C.mildBg, text: C.mildText };
            if (band === 'Mild')     return { bg: C.scoreMidBg, text: C.scoreMidText };
            if (band === 'Moderate') return { bg: C.moderateBg, text: C.moderateText };
            if (band === 'Severe')   return { bg: C.severeBg,   text: C.severeText };
            return null;
          };
          if (data.column.index === 2 || data.column.index === 4) {
            const bc = bandColor(data.cell.raw);
            if (bc) {
              data.cell.styles.fillColor = bc.bg;
              data.cell.styles.textColor = bc.text;
            } else {
              data.cell.styles.textColor = C.textMuted;
            }
          }
          if (data.column.index === 5) {
            const val = data.cell.raw;
            if (val && val.startsWith('+')) {
              data.cell.styles.fillColor = C.mildBg;
              data.cell.styles.textColor = C.mildText;
            } else if (val && val.startsWith('-')) {
              data.cell.styles.fillColor = C.severeBg;
              data.cell.styles.textColor = C.severeText;
            } else {
              data.cell.styles.textColor = C.textMuted;
            }
          }
        },
        theme: 'grid',
      });
      yPos = doc.lastAutoTable.finalY + 6;
    }
  }

  // ── Assessment notes ───────────────────────────────────────────────────────
  if (comparisonData?.notes) {
    if (yPos + 20 > pageHeight - 20) {
      doc.addPage();
      addBrandedHeader(doc, 'Diagnostic Comparison Report', logoDataUrl);
      yPos = HEADER_HEIGHT + 6;
    }
    yPos = renderSectionLabel(doc, 'Clinical Notes', yPos);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.textBody);
    const lines = doc.splitTextToSize(comparisonData.notes, pageWidth - 2 * PAGE_MARGIN);
    doc.text(lines, PAGE_MARGIN, yPos);
    yPos += lines.length * 5 + 4;
  }

  addPageFooters(doc);
  const namePart = patientName.replace(/\s+/g, '_') || 'Patient';
  doc.save(`${filename ?? `CVAPed_DiagnosticComparison_${namePart}`}.pdf`);
};

// ─── Pre-Evaluation helpers ───────────────────────────────────────────────────
const STROKE_TIMEFRAME_LABELS = {
  less_than_1_month: '< 1 Month',
  '1_to_6_months': '1–6 Months',
  '6_to_12_months': '6–12 Months',
  over_1_year: 'Over 1 Year',
};
const MOBILITY_LABELS = {
  independent: 'Walks Independently',
  assisted: 'With Assistance',
  wheelchair: 'Wheelchair User',
  bed_bound: 'Bed-bound',
};
const MOTOR_LABELS = {
  normal: 'Normal',
  mild_weakness: 'Mild Weakness',
  moderate_weakness: 'Moderate Weakness',
  severe_weakness: 'Severe / No Movement',
};
const AGE_GROUP_LABELS = {
  toddler: '1–2 Years (Toddler)',
  preschool: '3–4 Years (Preschool)',
  school_age: '5–8 Years (School-Age)',
  older: '9+ Years',
};
const COMMUNICATION_LABELS = {
  preverbal: 'Pre-verbal / Non-verbal',
  single_words: 'Single Words',
  short_phrases: 'Short Phrases',
  sentences: 'Full Sentences',
};
const INTELLIGIBILITY_LABELS = {
  easily: 'Easily Understood',
  mostly_family: 'Mostly by Family',
  difficult: 'Difficult to Understand',
  not_speaking: 'Not Yet Speaking',
};
const SPEECH_CONCERN_LABELS = {
  articulation: 'Pronunciation',
  language: 'Language',
  fluency: 'Fluency',
  multiple: 'Multiple Areas',
};
const FOLLOWS_INSTRUCTIONS_LABELS = {
  yes_consistently: 'Yes, Consistently',
  sometimes: 'Sometimes',
  rarely: 'Rarely',
  no: 'No / Not Yet',
};
const RESPONDS_TO_NAME_LABELS = {
  always: 'Always',
  usually: 'Usually',
  inconsistently: 'Inconsistently',
  rarely_no: 'Rarely / No',
};
const PRIOR_SPEECH_LABELS = {
  formal_eval: 'Formal Evaluation',
  informal: 'Informal Screening',
  no: 'None',
};
const THERAPY_FOCUS_LABELS = {
  speech: 'Speech Therapy',
  physical: 'Physical Therapy',
  both: 'Speech + Physical',
};

const renderKeyValueTable = (doc, autoTable, rows, startY) => {
  if (rows.length === 0) return startY;
  autoTable(doc, {
    startY,
    head: [['Field', 'Value']],
    body: rows,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    styles: {
      fontSize: 8,
      cellPadding: { top: 3, bottom: 3, left: 5, right: 5 },
      textColor: C.textBody,
      lineColor: C.rowBorder,
      lineWidth: 0.15,
      valign: 'middle',
    },
    headStyles: {
      fillColor: C.slateDeep,
      textColor: C.white,
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
      cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
    },
    alternateRowStyles: { fillColor: C.rowAlt },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: C.textMuted, cellWidth: 60 },
      1: { textColor: C.textBody },
    },
    theme: 'grid',
  });
  return doc.lastAutoTable.finalY + 6;
};

/**
 * generatePreEvalPdf
 *
 * Exports a Pre-Evaluation / Initial Diagnostic self-report for one patient.
 *
 * @param {object} config
 * @param {object} config.patient    - { firstName, lastName, email }
 * @param {object} config.selfReport - the selfReport (r) object from preEvalModalEntry
 */
export const generatePreEvalPdf = async ({ patient, selfReport: r }) => {
  const [{ default: jsPDF }, { default: autoTable }, logoDataUrl] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    loadImageAsDataUrl(logo),
  ]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { height: pageHeight, width: pageWidth } = doc.internal.pageSize;

  const patientName = `${patient?.firstName ?? ''} ${patient?.lastName ?? ''}`.trim();

  addBrandedHeader(doc, 'Pre-Evaluation Self-Report', logoDataUrl);

  // Meta bar
  const focusLabel = THERAPY_FOCUS_LABELS[r?.therapyFocus] ?? r?.therapyFocus ?? '—';
  const levelLabel = r?.recommendedLevel
    ? r.recommendedLevel.charAt(0).toUpperCase() + r.recommendedLevel.slice(1) + ' Level'
    : '—';
  {
    const colW = (pageWidth - 2 * PAGE_MARGIN) / 3;
    doc.setFillColor(...C.metaBg);
    doc.rect(0, HEADER_HEIGHT, pageWidth, META_BAR_HEIGHT, 'F');
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.2);
    doc.line(0, HEADER_HEIGHT + META_BAR_HEIGHT, pageWidth, HEADER_HEIGHT + META_BAR_HEIGHT);

    [
      { label: 'PATIENT',       value: patientName },
      { label: 'THERAPY FOCUS', value: focusLabel },
      { label: 'REC. LEVEL',    value: levelLabel },
    ].forEach((item, i) => {
      const x = PAGE_MARGIN + i * colW + colW / 2;
      if (i > 0) {
        doc.setDrawColor(...C.border);
        doc.setLineWidth(0.2);
        doc.line(PAGE_MARGIN + i * colW, HEADER_HEIGHT + 3, PAGE_MARGIN + i * colW, HEADER_HEIGHT + META_BAR_HEIGHT - 3);
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(...C.textMuted);
      doc.text(item.label, x, HEADER_HEIGHT + 5.5, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...C.textBody);
      doc.text(item.value, x, HEADER_HEIGHT + 11.5, { align: 'center' });
    });
  }

  let yPos = HEADER_HEIGHT + META_BAR_HEIGHT + 6;

  yPos = renderPatientCard(
    doc,
    { name: patientName, email: patient?.email ?? '', score: null, severity: null, date: null },
    yPos, 0, 1
  );

  if (!r?.completedWizard) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...C.textMuted);
    doc.text('No self-report data available — patient has not completed the intake wizard.', PAGE_MARGIN, yPos + 6);
    addPageFooters(doc);
    doc.save(`CVAPed_PreEval_${patientName.replace(/\s+/g, '_')}.pdf`);
    return;
  }

  // ── General section ────────────────────────────────────────────────────────
  const generalRows = [
    ['Therapy Focus', focusLabel],
    r?.therapyFocus && ['Recommended Level', levelLabel],
  ].filter(Boolean);

  if (r?.recommendedFocus) generalRows.push(['Recommended Focus', r.recommendedFocus]);
  if (r?.recommendedTherapy) {
    generalRows.push(['Recommended Therapy', r.recommendedTherapy === 'speech' ? 'Speech Therapy' : r.recommendedTherapy === 'physical' ? 'Physical Therapy' : 'Therapy']);
  }

  if (generalRows.length > 0) {
    yPos = renderSectionLabel(doc, 'General Information', yPos);
    yPos = renderKeyValueTable(doc, autoTable, generalRows, yPos);
  }

  // ── Physical section ───────────────────────────────────────────────────────
  const showPhysical = r?.therapyFocus === 'physical' || r?.therapyFocus === 'both';
  if (showPhysical) {
    const physRows = [
      r?.strokeTimeframe && ['Stroke Timeframe', STROKE_TIMEFRAME_LABELS[r.strokeTimeframe] ?? r.strokeTimeframe],
      r?.affectedSide    && ['Affected Side', r.affectedSide.charAt(0).toUpperCase() + r.affectedSide.slice(1).replace('_', ' ')],
      r?.mobilityStatus  && ['Mobility', MOBILITY_LABELS[r.mobilityStatus] ?? r.mobilityStatus],
      r?.balanceIssues != null && ['Balance Issues', r.balanceIssues ? 'Yes' : 'No'],
      r?.armMotorFunction && ['Arm Motor Function', MOTOR_LABELS[r.armMotorFunction] ?? r.armMotorFunction],
      r?.legMotorFunction && ['Leg Motor Function', MOTOR_LABELS[r.legMotorFunction] ?? r.legMotorFunction],
      r?.spasticity != null && ['Spasticity', r.spasticity ? 'Present' : 'None'],
      r?.priorPhysicalTherapy && ['Prior Physical Therapy', r.priorPhysicalTherapy === 'facility' ? 'At a Facility' : r.priorPhysicalTherapy === 'self_guided' ? 'Self-Guided' : 'No'],
    ].filter(Boolean);

    if (physRows.length > 0) {
      if (yPos + physRows.length * 8 + 20 > pageHeight - 20) {
        doc.addPage();
        addBrandedHeader(doc, 'Pre-Evaluation Self-Report', logoDataUrl);
        yPos = HEADER_HEIGHT + 6;
      }
      yPos = renderSectionLabel(doc, 'Physical Therapy Assessment', yPos);
      yPos = renderKeyValueTable(doc, autoTable, physRows, yPos);
    }
  }

  // ── Speech section ─────────────────────────────────────────────────────────
  const showSpeech = r?.therapyFocus === 'speech' || r?.therapyFocus === 'both';
  if (showSpeech) {
    const speechRows = [
      r?.childAgeGroup         && ['Age Group', AGE_GROUP_LABELS[r.childAgeGroup] ?? r.childAgeGroup],
      r?.childCommunicationMode && ['Communication Mode', COMMUNICATION_LABELS[r.childCommunicationMode] ?? r.childCommunicationMode],
      r?.speechIntelligibility && ['Speech Intelligibility', INTELLIGIBILITY_LABELS[r.speechIntelligibility] ?? r.speechIntelligibility],
      r?.mainSpeechConcern     && ['Main Concern', SPEECH_CONCERN_LABELS[r.mainSpeechConcern] ?? r.mainSpeechConcern],
      r?.followsInstructions   && ['Follows Instructions', FOLLOWS_INSTRUCTIONS_LABELS[r.followsInstructions] ?? r.followsInstructions],
      r?.respondsToName        && ['Responds to Name', RESPONDS_TO_NAME_LABELS[r.respondsToName] ?? r.respondsToName],
      r?.priorSpeechEval       && ['Prior Speech Eval', PRIOR_SPEECH_LABELS[r.priorSpeechEval] ?? r.priorSpeechEval],
      r?.primarySpeechGoal     && ['Primary Goal', r.primarySpeechGoal],
    ].filter(Boolean);

    if (speechRows.length > 0) {
      if (yPos + speechRows.length * 8 + 20 > pageHeight - 20) {
        doc.addPage();
        addBrandedHeader(doc, 'Pre-Evaluation Self-Report', logoDataUrl);
        yPos = HEADER_HEIGHT + 6;
      }
      yPos = renderSectionLabel(doc, 'Speech Therapy Assessment', yPos);
      yPos = renderKeyValueTable(doc, autoTable, speechRows, yPos);
    }
  }

  addPageFooters(doc);
  doc.save(`CVAPed_PreEval_${patientName.replace(/\s+/g, '_')}.pdf`);
};

// ─── Exercise Plan PDF ─────────────────────────────────────────────────────────
const getDifficultyStyle = (difficulty) => {
  const d = (difficulty || '').toLowerCase();
  if (d === 'beginner') return { bg: C.mildBg, text: C.mildText };
  if (d === 'intermediate') return { bg: C.scoreMidBg, text: C.scoreMidText };
  if (d === 'advanced') return { bg: C.severeBg, text: C.severeText };
  return { bg: C.unknownBg, text: C.unknownText };
};

const getStatusStyle = (status) => {
  if (!status) return { bg: C.unknownBg, text: C.unknownText };
  const s = status.toLowerCase();
  // Green — positive statuses
  if (['good', 'optimal', 'excellent', 'normal', 'stable', 'consistent', 'complete'].includes(s))
    return { bg: C.mildBg, text: C.mildText };
  // Yellow — borderline statuses
  if (['fair', 'moderate', 'regular', 'fast', 'slow', 'long', 'short'].includes(s))
    return { bg: C.scoreMidBg, text: C.scoreMidText };
  // Red — problematic statuses
  if (['poor', 'low', 'unstable', 'irregular'].includes(s))
    return { bg: C.severeBg, text: C.severeText };
  // N/A
  if (s === 'n/a') return { bg: C.unknownBg, text: C.unknownText };
  return { bg: C.unknownBg, text: C.unknownText };
};

const addEnhancedSectionLabel = (doc, label, yPos, color = C.primary) => {
  const { width: pageWidth } = doc.internal.pageSize;

  doc.setFillColor(...color);
  doc.rect(PAGE_MARGIN, yPos, 3, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...C.text);
  doc.text(label.toUpperCase(), PAGE_MARGIN + 7, yPos + 5.5);

  const labelWidth = doc.getTextWidth(label.toUpperCase());
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(PAGE_MARGIN + 10 + labelWidth, yPos + 4, pageWidth - PAGE_MARGIN, yPos + 4);

  return yPos + 12;
};

const renderEnhancedExerciseCard = (doc, exercise, index, yPos, pageWidth, pageHeight, addBrandedHeader, logoDataUrl, onNewPage) => {
  const cardWidth = pageWidth - 2 * PAGE_MARGIN;
  const cardHeight = 45;
  const accentW = 5;

  if (yPos + cardHeight > pageHeight - 20) {
    yPos = onNewPage();
  }

  doc.setFillColor(220, 220, 220);
  doc.roundedRect(PAGE_MARGIN + 0.5, yPos + 0.5, cardWidth, cardHeight, 2, 2, 'F');

  doc.setFillColor(...C.cardBg);
  doc.roundedRect(PAGE_MARGIN, yPos, cardWidth, cardHeight, 2, 2, 'F');

  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(PAGE_MARGIN, yPos, cardWidth, cardHeight, 2, 2, 'S');

  doc.setFillColor(...C.primary);
  doc.roundedRect(PAGE_MARGIN, yPos, accentW, cardHeight, 2, 2, 'F');

  doc.setFillColor(255, 255, 255);
  doc.circle(PAGE_MARGIN + accentW + 10, yPos + 15, 7, 'F');
  doc.setFillColor(...C.primary);
  doc.circle(PAGE_MARGIN + accentW + 10, yPos + 15, 7, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...C.white);
  doc.text(String(index + 1), PAGE_MARGIN + accentW + 10, yPos + 17.5, { align: 'center' });

  const nameX = PAGE_MARGIN + accentW + 24;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...C.text);
  const exerciseName = exercise.exercise_name.length > 35 ? exercise.exercise_name.substring(0, 32) + '...' : exercise.exercise_name;
  doc.text(exerciseName, nameX, yPos + 10);

  if (exercise.problem_targeted) {
    const problemLabel = exercise.problem_targeted.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.textMuted);
    doc.text(`Target: ${problemLabel}`, nameX, yPos + 18);
  }

  const difficultyStyle = getDifficultyStyle(exercise.difficulty);
  const badgeW = 28;
  const badgeH = 8;
  const bX = pageWidth - PAGE_MARGIN - badgeW - 5;
  const bY = yPos + 5;

  doc.setFillColor(...difficultyStyle.bg);
  doc.roundedRect(bX, bY, badgeW, badgeH, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(...difficultyStyle.text);
  const diffText = exercise.difficulty ? exercise.difficulty.substring(0, 8) : 'N/A';
  doc.text(diffText, bX + badgeW / 2, bY + 5.5, { align: 'center' });

  if (exercise.duration) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.textBody);
    doc.text(`Duration: ${exercise.duration}`, nameX, yPos + 26);
  }

  if (exercise.reps) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.textMuted);
    doc.text(`Reps: ${exercise.reps}`, nameX + 55, yPos + 26);
  }

  doc.setDrawColor(...C.rowBorder);
  doc.setLineWidth(0.2);
  doc.line(nameX, yPos + 32, pageWidth - PAGE_MARGIN - 5, yPos + 32);

  const descY = yPos + 36;
  if (exercise.description) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.textBody);
    const splitDesc = doc.splitTextToSize(exercise.description, cardWidth - accentW - 30);
    const maxDescLines = 2;
    const truncatedDesc = splitDesc.slice(0, maxDescLines);
    doc.text(truncatedDesc, nameX, descY);
  }

  return yPos + cardHeight + 8;
};

const renderInstructions = (doc, instructions, yPos, pageWidth, pageHeight, addBrandedHeader, logoDataUrl, sectionLabel) => {
  if (!instructions || instructions.length === 0) return yPos;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...C.primary);
  doc.text('Step-by-Step Instructions:', PAGE_MARGIN + 5, yPos);
  yPos += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.textBody);

  instructions.forEach((instruction, idx) => {
    if (yPos > pageHeight - 25) {
      doc.addPage();
      addBrandedHeader(doc, sectionLabel, logoDataUrl);
      yPos = HEADER_HEIGHT + 6;
    }

    const bulletY = yPos + 2;
    doc.setFillColor(...C.primary);
    doc.circle(PAGE_MARGIN + 7, bulletY, 1.5, 'F');

    const splitLine = doc.splitTextToSize(`${idx + 1}. ${instruction}`, pageWidth - 45);
    doc.text(splitLine, PAGE_MARGIN + 12, yPos + 4);
    yPos += splitLine.length * 4 + 3;
  });

  return yPos + 5;
};

const addExercisePlanMetaBar = (doc, patientName, exportDate, analysisDate, exerciseCount) => {
  const { width: pageWidth } = doc.internal.pageSize;
  const colW = (pageWidth - 2 * PAGE_MARGIN) / 4;

  doc.setFillColor(...C.metaBg);
  doc.rect(0, HEADER_HEIGHT, pageWidth, META_BAR_HEIGHT, 'F');
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.2);
  doc.line(0, HEADER_HEIGHT + META_BAR_HEIGHT, pageWidth, HEADER_HEIGHT + META_BAR_HEIGHT);

  const items = [
    { label: 'PATIENT', value: patientName },
    { label: 'EXPORT DATE', value: exportDate },
    { label: 'ANALYSIS DATE', value: analysisDate },
    { label: 'EXERCISES', value: String(exerciseCount) },
  ];

  items.forEach((item, i) => {
    const x = PAGE_MARGIN + i * colW + colW / 2;
    if (i > 0) {
      doc.setDrawColor(...C.border);
      doc.setLineWidth(0.2);
      doc.line(
        PAGE_MARGIN + i * colW, HEADER_HEIGHT + 3,
        PAGE_MARGIN + i * colW, HEADER_HEIGHT + META_BAR_HEIGHT - 3
      );
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(...C.textMuted);
    doc.text(item.label, x, HEADER_HEIGHT + 5.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.textBody);
    doc.text(item.value, x, HEADER_HEIGHT + 11.5, { align: 'center' });
  });
};

export const generateExercisePlanPdf = async ({
  patientName,
  patientEmail,
  gaitMetrics,
  gait_metrics,
  analysisDate: inputAnalysisDate = null,
  detectedProblems,
  exercises,
  filename = 'CVAPed_ExercisePlan',
}) => {
  const metrics = gaitMetrics || gait_metrics || {};
  const analysisDuration = metrics.analysis_duration || metrics.duration || null;
  
  const [{ default: jsPDF }, { default: autoTable }, logoDataUrl] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    loadImageAsDataUrl(logo),
  ]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { height: pageHeight, width: pageWidth } = doc.internal.pageSize;

  const exportDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const analysisDateSource = inputAnalysisDate ?? metrics?.created_at;
  const analysisDate = analysisDateSource
    ? new Date(analysisDateSource).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'N/A';

  addBrandedHeader(doc, 'Exercise Plan Report', logoDataUrl);
  addExercisePlanMetaBar(doc, patientName, exportDate, analysisDate, exercises.length);

  let yPos = HEADER_HEIGHT + META_BAR_HEIGHT + 8;

  // Patient info card - enhanced
  const cardW = pageWidth - 2 * PAGE_MARGIN;
  const cardH = 28;
  
  doc.setFillColor(220, 220, 220);
  doc.roundedRect(PAGE_MARGIN + 0.8, yPos + 0.8, cardW, cardH, 3, 3, 'F');
  doc.setFillColor(...C.cardBg);
  doc.roundedRect(PAGE_MARGIN, yPos, cardW, cardH, 3, 3, 'F');
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(PAGE_MARGIN, yPos, cardW, cardH, 3, 3, 'S');

  doc.setFillColor(...C.primary);
  doc.roundedRect(PAGE_MARGIN, yPos, 4, cardH, 2, 2, 'F');

  const initials = (patientName || 'U').split(' ').slice(0, 2).map(n => n?.[0] || '').join('').toUpperCase();
  doc.setFillColor(...C.primary);
  doc.circle(PAGE_MARGIN + 14, yPos + 14, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...C.white);
  doc.text(initials, PAGE_MARGIN + 14, yPos + 16, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...C.text);
  doc.text(patientName || 'Patient', PAGE_MARGIN + 26, yPos + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.textMuted);
  if (patientEmail) {
    doc.text(patientEmail, PAGE_MARGIN + 26, yPos + 17);
  }
  doc.text(`Analysis Date: ${analysisDate}`, PAGE_MARGIN + 26, yPos + 24);

  yPos += cardH + 12;

  // Gait Analysis Results Section - with enhanced styling
  yPos = addEnhancedSectionLabel(doc, 'Gait Analysis Results', yPos, [71, 154, 195]);

  const getCadenceStatus = (v) => v >= 100 ? 'Fast' : v >= 80 ? 'Normal' : 'Slow';
  const getVelocityStatus = (v) => v >= 1.2 ? 'Fast' : v >= 0.8 ? 'Normal' : 'Slow';
  const getSymmetryStatus = (v) => v >= 0.9 ? 'Excellent' : v >= 0.7 ? 'Good' : 'Fair';
  const getStabilityStatus = (v) => v >= 0.8 ? 'Stable' : v >= 0.6 ? 'Moderate' : 'Unstable';
  const getStrideStatus = (v) => v >= 1.2 ? 'Long' : v >= 0.8 ? 'Normal' : 'Short';
  const getRegularityStatus = (v) => v >= 0.8 ? 'Consistent' : v >= 0.6 ? 'Regular' : 'Irregular';

  const has = (v) => v != null && v !== '' && !Number.isNaN(v);
  const gaitMetricsRows = [
    ['Steps',     has(metrics?.step_count)    ? String(metrics.step_count) : '—',                               has(metrics?.step_count)    ? (metrics.step_count >= 30 ? 'Excellent' : metrics.step_count >= 15 ? 'Good' : 'Low') : 'N/A'],
    ['Duration',  has(analysisDuration)       ? `${Number(analysisDuration).toFixed(0)}s` : '—',                has(analysisDuration)       ? 'Complete' : 'N/A'],
    ['Cadence',   has(metrics?.cadence)       ? `${Number(metrics.cadence).toFixed(0)} spm` : '—',              has(metrics?.cadence)       ? getCadenceStatus(metrics.cadence) : 'N/A'],
    ['Velocity',  has(metrics?.velocity)      ? `${Number(metrics.velocity).toFixed(2)} m/s` : '—',             has(metrics?.velocity)      ? getVelocityStatus(metrics.velocity) : 'N/A'],
    ['Symmetry',  has(metrics?.gait_symmetry) ? `${(metrics.gait_symmetry * 100).toFixed(0)}%` : '—',           has(metrics?.gait_symmetry) ? getSymmetryStatus(metrics.gait_symmetry) : 'N/A'],
    ['Stability', has(metrics?.stability_score) ? `${(metrics.stability_score * 100).toFixed(0)}%` : '—',       has(metrics?.stability_score) ? getStabilityStatus(metrics.stability_score) : 'N/A'],
    ['Stride',    has(metrics?.stride_length) ? `${Number(metrics.stride_length).toFixed(2)}m` : '—',           has(metrics?.stride_length) ? getStrideStatus(metrics.stride_length) : 'N/A'],
    ['Regularity',has(metrics?.step_regularity) ? `${(metrics.step_regularity * 100).toFixed(0)}%` : '—',      has(metrics?.step_regularity) ? getRegularityStatus(metrics.step_regularity) : 'N/A'],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Metric', 'Value', 'Status']],
    body: gaitMetricsRows,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    styles: {
      fontSize: 8,
      cellPadding: { top: 4, bottom: 4, left: 6, right: 6 },
      textColor: C.textBody,
      lineColor: C.rowBorder,
      lineWidth: 0.15,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [71, 154, 195],
      textColor: C.white,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
      cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
    },
    alternateRowStyles: {
      fillColor: C.rowAlt,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 30 },
      1: { halign: 'center', fontStyle: 'bold', fontSize: 9, textColor: C.primary },
      2: { halign: 'center' },
    },
    theme: 'grid',
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 2) {
        const statusStyle = getStatusStyle(data.cell.raw);
        data.cell.styles.fillColor = statusStyle.bg;
        data.cell.styles.textColor = statusStyle.text;
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  yPos = doc.lastAutoTable.finalY + 14;

  // Check for new page
  if (yPos > pageHeight - 80) {
    doc.addPage();
    addBrandedHeader(doc, 'Exercise Plan Report', logoDataUrl);
    yPos = HEADER_HEIGHT + 6;
  }

  // Detected Problems Section - enhanced with colored badges
  yPos = addEnhancedSectionLabel(doc, 'Detected Gait Problems', yPos, C.primary);

  if (detectedProblems && detectedProblems.length > 0) {
    const problemsData = detectedProblems.map((problem, index) => [
      String(index + 1),
      problem.problem?.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) || 'Unknown',
      problem.severity || 'N/A',
      problem.clinical_note || '—',
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Problem', 'Severity', 'Clinical Notes']],
      body: problemsData,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      styles: {
        fontSize: 8,
        cellPadding: { top: 4, bottom: 4, left: 6, right: 6 },
        textColor: C.textBody,
        lineColor: C.rowBorder,
        lineWidth: 0.15,
        valign: 'middle',
      },
      headStyles: {
        fillColor: C.primary,
        textColor: C.white,
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
        cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
      },
      alternateRowStyles: {
        fillColor: C.rowAlt,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { fontStyle: 'bold', cellWidth: 45 },
        2: { halign: 'center', cellWidth: 25 },
        3: { cellWidth: 'auto' },
      },
      theme: 'grid',
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 2) {
          const severityStyle = getSeverityStyle(data.cell.raw);
          data.cell.styles.fillColor = severityStyle.bg;
          data.cell.styles.textColor = severityStyle.text;
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });

    yPos = doc.lastAutoTable.finalY + 14;
  } else {
    doc.setFillColor(...C.mildBg);
    doc.roundedRect(PAGE_MARGIN, yPos, cardW - 40, 12, 2, 2, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...C.mildText);
    doc.text('No significant gait problems detected', PAGE_MARGIN + 5, yPos + 7.5);
    yPos += 20;
  }

  // Check for new page
  if (yPos > pageHeight - 60) {
    doc.addPage();
    addBrandedHeader(doc, 'Exercise Plan Report', logoDataUrl);
    yPos = HEADER_HEIGHT + 6;
  }

  // Prescribed Exercises Section
  yPos = addEnhancedSectionLabel(doc, `Prescribed Exercise Plan (${exercises.length} exercises)`, yPos, [232, 176, 78]);

  const handleNewPage = () => {
    doc.addPage();
    addBrandedHeader(doc, 'Exercise Plan Report', logoDataUrl);
    return HEADER_HEIGHT + 6;
  };

  exercises.forEach((exercise, index) => {
    yPos = renderEnhancedExerciseCard(
      doc, exercise, index, yPos, pageWidth, pageHeight,
      addBrandedHeader, logoDataUrl, handleNewPage
    );

    yPos = renderInstructions(
      doc, exercise.instructions, yPos, pageWidth, pageHeight,
      addBrandedHeader, logoDataUrl, 'Exercise Plan Report'
    );

    yPos += 5;
  });

  // Footer on all pages
  addPageFooters(doc);
  doc.save(`${filename}.pdf`);
};

// ─── Score band helper (mirrors getScoreBandLabel already defined above) ─────

const getScoreBandStyle = (score) => {
  if (score == null) return { bg: C.unknownBg, text: C.unknownText };
  if (score >= 86) return { bg: C.mildBg,     text: C.mildText };
  if (score >= 71) return { bg: C.scoreHighBg, text: C.scoreHighText };
  if (score >= 51) return { bg: C.scoreMidBg,  text: C.scoreMidText };
  if (score >= 31) return { bg: C.moderateBg,  text: C.moderateText };
  return { bg: C.severeBg, text: C.severeText };
};

// ─── Shared analytics meta bar ───────────────────────────────────────────────
const addAnalyticsMetaBar = (doc, reportType, totalTrials, totalPatients, period) => {
  const { width: pageWidth } = doc.internal.pageSize;
  const colW = (pageWidth - 2 * PAGE_MARGIN) / 3;

  doc.setFillColor(...C.metaBg);
  doc.rect(0, HEADER_HEIGHT, pageWidth, META_BAR_HEIGHT, 'F');
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.2);
  doc.line(0, HEADER_HEIGHT + META_BAR_HEIGHT, pageWidth, HEADER_HEIGHT + META_BAR_HEIGHT);

  const items = [
    { label: 'REPORT TYPE',  value: reportType },
    { label: 'TOTAL TRIALS', value: String(totalTrials) },
    { label: 'PERIOD',       value: period },
  ];

  items.forEach((item, i) => {
    const x = PAGE_MARGIN + i * colW + colW / 2;
    if (i > 0) {
      doc.setDrawColor(...C.border);
      doc.setLineWidth(0.2);
      doc.line(PAGE_MARGIN + i * colW, HEADER_HEIGHT + 3, PAGE_MARGIN + i * colW, HEADER_HEIGHT + META_BAR_HEIGHT - 3);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(...C.textMuted);
    doc.text(item.label, x, HEADER_HEIGHT + 5.5, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.textBody);
    doc.text(item.value, x, HEADER_HEIGHT + 11.5, { align: 'center' });
  });
};

// ─── Shared summary stat card strip ─────────────────────────────────────────
const renderStatStrip = (doc, stats, yPos) => {
  const { width: pageWidth } = doc.internal.pageSize;
  const contentW = pageWidth - 2 * PAGE_MARGIN;
  const cardW = (contentW - (stats.length - 1) * 4) / stats.length;
  const cardH = 22;

  stats.forEach((stat, i) => {
    const x = PAGE_MARGIN + i * (cardW + 4);
    doc.setFillColor(220, 220, 220);
    doc.roundedRect(x + 0.6, yPos + 0.8, cardW, cardH, 2, 2, 'F');
    doc.setFillColor(...C.cardBg);
    doc.roundedRect(x, yPos, cardW, cardH, 2, 2, 'F');
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, yPos, cardW, cardH, 2, 2, 'S');
    doc.setFillColor(...C.primary);
    doc.rect(x, yPos, cardW, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(...C.textMuted);
    doc.text(stat.label.toUpperCase(), x + cardW / 2, yPos + 7, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...C.primary);
    doc.text(String(stat.value), x + cardW / 2, yPos + 16, { align: 'center' });
  });

  return yPos + cardH + 10;
};

// ─────────────────────────────────────────────────────────────────────────────
//  generateArticulationPdf
// ─────────────────────────────────────────────────────────────────────────────
export const generateArticulationPdf = async ({
  analytics,
  generatedBy = 'Therapist',
  filename = 'CVAPed_Articulation_Analytics',
}) => {
  const { data } = analytics;
  const period = data.days === 'all' ? 'All Time' : `Last ${data.days} Days`;

  const [{ default: jsPDF }, { default: autoTable }, logoDataUrl] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    loadImageAsDataUrl(logo),
  ]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { height: pageHeight, width: pageWidth } = doc.internal.pageSize;

  addBrandedHeader(doc, 'Articulation Therapy Analytics', logoDataUrl);
  addAnalyticsMetaBar(doc, 'Articulation — Speech Therapy', data.total_trials, data.total_patients, period);

  let yPos = HEADER_HEIGHT + META_BAR_HEIGHT + 8;

  yPos = renderStatStrip(doc, [
    { label: 'Total Trials',    value: data.total_trials },
    { label: 'Patients Active', value: data.total_patients },
    { label: 'Overall Avg Score', value: `${data.overall_avg_score ?? 0}%` },
    { label: 'Sounds Tracked',  value: data.per_sound?.length ?? 0 },
  ], yPos);

  // Per-Sound Breakdown
  yPos = renderSectionLabel(doc, 'Performance by Sound', yPos);

  const soundRows = (data.per_sound ?? []).map((s) => [
    s.label,
    s.trial_count,
    s.patient_count,
    `${s.avg_score ?? 0}%`,
    getScoreBandLabel(s.avg_score),
  ]);

  if (soundRows.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [['Sound', 'Trials', 'Patients', 'Avg Score', 'Band']],
      body: soundRows,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      styles: {
        fontSize: 8,
        cellPadding: { top: 4, bottom: 4, left: 6, right: 6 },
        textColor: C.textBody,
        lineColor: C.rowBorder,
        lineWidth: 0.15,
        valign: 'middle',
      },
      headStyles: {
        fillColor: C.slateDeep,
        textColor: C.white,
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
        cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
      },
      alternateRowStyles: { fillColor: C.rowAlt },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40 },
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center', fontStyle: 'bold', textColor: C.primary },
        4: { halign: 'center' },
      },
      theme: 'grid',
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          const style = getScoreBandStyle(
            parseFloat(soundRows[data.row.index]?.[3]) || 0
          );
          data.cell.styles.fillColor = style.bg;
          data.cell.styles.textColor = style.text;
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
    yPos = doc.lastAutoTable.finalY + 12;
  } else {
    doc.setFillColor(...C.mildBg);
    doc.roundedRect(PAGE_MARGIN, yPos, pageWidth - 2 * PAGE_MARGIN - 40, 12, 2, 2, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...C.mildText);
    doc.text('No articulation trial data for this period', PAGE_MARGIN + 5, yPos + 7.5);
    yPos += 20;
  }

  // Per-Level Breakdown
  if (yPos > pageHeight - 80) {
    doc.addPage();
    addBrandedHeader(doc, 'Articulation Therapy Analytics', logoDataUrl);
    yPos = HEADER_HEIGHT + 6;
  }

  yPos = renderSectionLabel(doc, 'Performance by Level', yPos);

  const levelRows = (data.per_level ?? []).map((lv) => [
    lv.label,
    lv.trial_count,
    lv.patient_count,
    `${lv.avg_score ?? 0}%`,
    getScoreBandLabel(lv.avg_score),
  ]);

  if (levelRows.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [['Level', 'Trials', 'Patients', 'Avg Score', 'Band']],
      body: levelRows,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      styles: {
        fontSize: 8,
        cellPadding: { top: 4, bottom: 4, left: 6, right: 6 },
        textColor: C.textBody,
        lineColor: C.rowBorder,
        lineWidth: 0.15,
        valign: 'middle',
      },
      headStyles: {
        fillColor: C.slateDeep,
        textColor: C.white,
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
        cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
      },
      alternateRowStyles: { fillColor: C.rowAlt },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center', fontStyle: 'bold', textColor: C.primary },
        4: { halign: 'center' },
      },
      theme: 'grid',
      didParseCell: (cellData) => {
        if (cellData.section === 'body' && cellData.column.index === 4) {
          const style = getScoreBandStyle(
            parseFloat(levelRows[cellData.row.index]?.[3]) || 0
          );
          cellData.cell.styles.fillColor = style.bg;
          cellData.cell.styles.textColor = style.text;
          cellData.cell.styles.fontStyle = 'bold';
        }
      },
    });
    yPos = doc.lastAutoTable.finalY + 12;
  }

  // Top / Bottom callout
  if (data.top_sound || data.bottom_sound) {
    if (yPos > pageHeight - 60) {
      doc.addPage();
      addBrandedHeader(doc, 'Articulation Therapy Analytics', logoDataUrl);
      yPos = HEADER_HEIGHT + 6;
    }
    yPos = renderSectionLabel(doc, 'Highlights', yPos);

    const highlights = [];
    if (data.top_sound) highlights.push([
      'Best Performing Sound', data.top_sound.label, `${data.top_sound.avg_score ?? 0}%`, getScoreBandLabel(data.top_sound.avg_score)
    ]);
    if (data.bottom_sound) highlights.push([
      'Needs Most Attention', data.bottom_sound.label, `${data.bottom_sound.avg_score ?? 0}%`, getScoreBandLabel(data.bottom_sound.avg_score)
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Category', 'Sound', 'Avg Score', 'Band']],
      body: highlights,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      styles: {
        fontSize: 8,
        cellPadding: { top: 4, bottom: 4, left: 6, right: 6 },
        textColor: C.textBody,
        lineColor: C.rowBorder,
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: C.slateDeep,
        textColor: C.white,
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
        cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
      },
      alternateRowStyles: { fillColor: C.rowAlt },
      columnStyles: {
        0: { fontStyle: 'bold' },
        2: { halign: 'center', fontStyle: 'bold', textColor: C.primary },
        3: { halign: 'center' },
      },
      theme: 'grid',
    });
    yPos = doc.lastAutoTable.finalY + 12;
  }

  addPageFooters(doc);
  doc.save(`${filename}.pdf`);
};

// ─────────────────────────────────────────────────────────────────────────────
//  generateFluencyPdf
// ─────────────────────────────────────────────────────────────────────────────
export const generateFluencyPdf = async ({
  analytics,
  generatedBy = 'Therapist',
  filename = 'CVAPed_Fluency_Analytics',
}) => {
  const { data } = analytics;
  const period = data.days === 'all' ? 'All Time' : `Last ${data.days} Days`;

  const [{ default: jsPDF }, { default: autoTable }, logoDataUrl] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    loadImageAsDataUrl(logo),
  ]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { height: pageHeight, width: pageWidth } = doc.internal.pageSize;

  addBrandedHeader(doc, 'Fluency Therapy Analytics', logoDataUrl);
  addAnalyticsMetaBar(doc, 'Fluency — Speech Therapy', data.total_trials, data.total_patients, period);

  let yPos = HEADER_HEIGHT + META_BAR_HEIGHT + 8;

  yPos = renderStatStrip(doc, [
    { label: 'Total Trials',      value: data.total_trials },
    { label: 'Patients Active',   value: data.total_patients },
    { label: 'Overall Avg Score', value: `${data.overall_avg_score ?? 0}%` },
    { label: 'Levels Tracked',    value: data.per_level?.length ?? 0 },
  ], yPos);

  // Per-Level Breakdown
  yPos = renderSectionLabel(doc, 'Performance by Level', yPos);

  const levelRows = (data.per_level ?? []).map((lv) => [
    lv.label,
    lv.trial_count,
    lv.patient_count,
    `${lv.avg_score ?? 0}%`,
    `${lv.avg_fluency_rate ?? 0}%`,
    getScoreBandLabel(lv.avg_score),
  ]);

  if (levelRows.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [['Level', 'Trials', 'Patients', 'Avg Score', 'Fluency Rate', 'Band']],
      body: levelRows,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      styles: {
        fontSize: 8,
        cellPadding: { top: 4, bottom: 4, left: 6, right: 6 },
        textColor: C.textBody,
        lineColor: C.rowBorder,
        lineWidth: 0.15,
        valign: 'middle',
      },
      headStyles: {
        fillColor: C.slateDeep,
        textColor: C.white,
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
        cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
      },
      alternateRowStyles: { fillColor: C.rowAlt },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40 },
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center', fontStyle: 'bold', textColor: C.primary },
        4: { halign: 'center' },
        5: { halign: 'center' },
      },
      theme: 'grid',
      didParseCell: (cellData) => {
        if (cellData.section === 'body' && cellData.column.index === 5) {
          const style = getScoreBandStyle(
            parseFloat(levelRows[cellData.row.index]?.[3]) || 0
          );
          cellData.cell.styles.fillColor = style.bg;
          cellData.cell.styles.textColor = style.text;
          cellData.cell.styles.fontStyle = 'bold';
        }
      },
    });
    yPos = doc.lastAutoTable.finalY + 12;
  } else {
    doc.setFillColor(...C.mildBg);
    doc.roundedRect(PAGE_MARGIN, yPos, pageWidth - 2 * PAGE_MARGIN - 40, 12, 2, 2, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...C.mildText);
    doc.text('No fluency trial data for this period', PAGE_MARGIN + 5, yPos + 7.5);
    yPos += 20;
  }

  // Mastery Distribution
  if (yPos > pageHeight - 80) {
    doc.addPage();
    addBrandedHeader(doc, 'Fluency Therapy Analytics', logoDataUrl);
    yPos = HEADER_HEIGHT + 6;
  }

  yPos = renderSectionLabel(doc, 'Patient Mastery Distribution', yPos);

  const mastery = data.mastery_distribution ?? {};
  const masteryRows = [
    ['Mastered (≥ 86%)',    mastery.mastered ?? 0],
    ['Functional (71-85%)', mastery.functional ?? 0],
    ['Mild (51-70%)',       mastery.mild ?? 0],
    ['Moderate (31-50%)',   mastery.moderate ?? 0],
    ['Severe (< 31%)',      mastery.severe ?? 0],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Mastery Band', 'Patient Count']],
    body: masteryRows,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    tableWidth: 100,
    styles: {
      fontSize: 8,
      cellPadding: { top: 4, bottom: 4, left: 6, right: 6 },
      textColor: C.textBody,
      lineColor: C.rowBorder,
      lineWidth: 0.15,
      valign: 'middle',
    },
    headStyles: {
      fillColor: C.slateDeep,
      textColor: C.white,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
      cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
    },
    alternateRowStyles: { fillColor: C.rowAlt },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'center', fontStyle: 'bold', textColor: C.primary },
    },
    theme: 'grid',
    didParseCell: (cellData) => {
      if (cellData.section === 'body' && cellData.column.index === 0) {
        const label = String(cellData.cell.raw ?? '').toLowerCase();
        let style = { bg: C.unknownBg, text: C.unknownText };
        if (label.startsWith('mastered'))   style = { bg: C.mildBg, text: C.mildText };
        else if (label.startsWith('functional')) style = { bg: C.scoreHighBg, text: C.scoreHighText };
        else if (label.startsWith('mild'))   style = { bg: C.scoreMidBg, text: C.scoreMidText };
        else if (label.startsWith('moderate')) style = { bg: C.moderateBg, text: C.moderateText };
        else if (label.startsWith('severe')) style = { bg: C.severeBg, text: C.severeText };
        cellData.cell.styles.fillColor = style.bg;
        cellData.cell.styles.textColor = style.text;
      }
    },
  });
  yPos = doc.lastAutoTable.finalY + 12;

  addPageFooters(doc);
  doc.save(`${filename}.pdf`);
};

// ─────────────────────────────────────────────────────────────────────────────
//  generateLanguagePdf
// ─────────────────────────────────────────────────────────────────────────────
export const generateLanguagePdf = async ({
  analytics,
  generatedBy = 'Therapist',
  filename = 'CVAPed_Language_Analytics',
}) => {
  const { data } = analytics;
  const period = data.days === 'all' ? 'All Time' : `Last ${data.days} Days`;

  const [{ default: jsPDF }, { default: autoTable }, logoDataUrl] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    loadImageAsDataUrl(logo),
  ]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { height: pageHeight, width: pageWidth } = doc.internal.pageSize;

  addBrandedHeader(doc, 'Language Therapy Analytics', logoDataUrl);
  addAnalyticsMetaBar(doc, 'Language — Speech Therapy', data.total_trials, data.total_patients, period);

  let yPos = HEADER_HEIGHT + META_BAR_HEIGHT + 8;

  const rec = data.receptive ?? { trial_count: 0, avg_accuracy: 0, per_level: [] };
  const exp = data.expressive ?? { trial_count: 0, avg_accuracy: 0, per_level: [] };

  yPos = renderStatStrip(doc, [
    { label: 'Total Trials',         value: data.total_trials },
    { label: 'Patients Active',      value: data.total_patients },
    { label: 'Receptive Accuracy',   value: `${rec.avg_accuracy ?? 0}%` },
    { label: 'Expressive Accuracy',  value: `${exp.avg_accuracy ?? 0}%` },
  ], yPos);

  // Receptive section
  yPos = renderSectionLabel(doc, 'Receptive Language — Per Level', yPos);

  const recRows = (rec.per_level ?? []).map((lv) => [
    lv.label,
    lv.trial_count,
    lv.patient_count,
    `${lv.accuracy ?? 0}%`,
    getScoreBandLabel(lv.accuracy),
  ]);

  if (recRows.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [['Level', 'Trials', 'Patients', 'Accuracy', 'Band']],
      body: recRows,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      styles: {
        fontSize: 8,
        cellPadding: { top: 4, bottom: 4, left: 6, right: 6 },
        textColor: C.textBody,
        lineColor: C.rowBorder,
        lineWidth: 0.15,
        valign: 'middle',
      },
      headStyles: {
        fillColor: C.slateDeep,
        textColor: C.white,
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
        cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
      },
      alternateRowStyles: { fillColor: C.rowAlt },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40 },
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center', fontStyle: 'bold', textColor: C.primary },
        4: { halign: 'center' },
      },
      theme: 'grid',
      didParseCell: (cellData) => {
        if (cellData.section === 'body' && cellData.column.index === 4) {
          const style = getScoreBandStyle(
            parseFloat(recRows[cellData.row.index]?.[3]) || 0
          );
          cellData.cell.styles.fillColor = style.bg;
          cellData.cell.styles.textColor = style.text;
          cellData.cell.styles.fontStyle = 'bold';
        }
      },
    });
    yPos = doc.lastAutoTable.finalY + 12;
  } else {
    doc.setFillColor(...C.mildBg);
    doc.roundedRect(PAGE_MARGIN, yPos, pageWidth - 2 * PAGE_MARGIN - 40, 12, 2, 2, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...C.mildText);
    doc.text('No receptive language data for this period', PAGE_MARGIN + 5, yPos + 7.5);
    yPos += 20;
  }

  // Expressive section
  if (yPos > pageHeight - 80) {
    doc.addPage();
    addBrandedHeader(doc, 'Language Therapy Analytics', logoDataUrl);
    yPos = HEADER_HEIGHT + 6;
  }

  yPos = renderSectionLabel(doc, 'Expressive Language — Per Level', yPos);

  const expRows = (exp.per_level ?? []).map((lv) => [
    lv.label,
    lv.trial_count,
    lv.patient_count,
    `${lv.accuracy ?? 0}%`,
    getScoreBandLabel(lv.accuracy),
  ]);

  if (expRows.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [['Level', 'Trials', 'Patients', 'Accuracy', 'Band']],
      body: expRows,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      styles: {
        fontSize: 8,
        cellPadding: { top: 4, bottom: 4, left: 6, right: 6 },
        textColor: C.textBody,
        lineColor: C.rowBorder,
        lineWidth: 0.15,
        valign: 'middle',
      },
      headStyles: {
        fillColor: C.slateDeep,
        textColor: C.white,
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
        cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
      },
      alternateRowStyles: { fillColor: C.rowAlt },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40 },
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center', fontStyle: 'bold', textColor: C.primary },
        4: { halign: 'center' },
      },
      theme: 'grid',
      didParseCell: (cellData) => {
        if (cellData.section === 'body' && cellData.column.index === 4) {
          const style = getScoreBandStyle(
            parseFloat(expRows[cellData.row.index]?.[3]) || 0
          );
          cellData.cell.styles.fillColor = style.bg;
          cellData.cell.styles.textColor = style.text;
          cellData.cell.styles.fontStyle = 'bold';
        }
      },
    });
    yPos = doc.lastAutoTable.finalY + 12;
  } else {
    doc.setFillColor(...C.mildBg);
    doc.roundedRect(PAGE_MARGIN, yPos, pageWidth - 2 * PAGE_MARGIN - 40, 12, 2, 2, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...C.mildText);
    doc.text('No expressive language data for this period', PAGE_MARGIN + 5, yPos + 7.5);
    yPos += 20;
  }

  // Combined summary
  if (yPos > pageHeight - 60) {
    doc.addPage();
    addBrandedHeader(doc, 'Language Therapy Analytics', logoDataUrl);
    yPos = HEADER_HEIGHT + 6;
  }

  yPos = renderSectionLabel(doc, 'Mode Comparison Summary', yPos);

  autoTable(doc, {
    startY: yPos,
    head: [['Mode', 'Total Trials', 'Avg Accuracy', 'Band']],
    body: [
      ['Receptive', rec.trial_count ?? 0, `${rec.avg_accuracy ?? 0}%`, getScoreBandLabel(rec.avg_accuracy)],
      ['Expressive', exp.trial_count ?? 0, `${exp.avg_accuracy ?? 0}%`, getScoreBandLabel(exp.avg_accuracy)],
    ],
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    tableWidth: 120,
    styles: {
      fontSize: 8,
      cellPadding: { top: 5, bottom: 5, left: 8, right: 8 },
      textColor: C.textBody,
      lineColor: C.rowBorder,
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: C.slateDeep,
      textColor: C.white,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    alternateRowStyles: { fillColor: C.rowAlt },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'center' },
      2: { halign: 'center', fontStyle: 'bold', textColor: C.primary },
      3: { halign: 'center' },
    },
    theme: 'grid',
    didParseCell: (cellData) => {
      if (cellData.section === 'body' && cellData.column.index === 3) {
        const style = getScoreBandStyle(
          parseFloat(
            cellData.row.index === 0 ? rec.avg_accuracy : exp.avg_accuracy
          ) || 0
        );
        cellData.cell.styles.fillColor = style.bg;
        cellData.cell.styles.textColor = style.text;
        cellData.cell.styles.fontStyle = 'bold';
      }
    },
  });

  addPageFooters(doc);
  doc.save(`${filename}.pdf`);
};

// ─── Physical Therapy Enhanced PDF ───────────────────────────────────────────
/**
 * generatePhysicalTherapyPdf
 *
 * Enhanced Physical Therapy report with:
 *  - Multi-patient summary strip + score distribution + most common problems
 *  - Per-patient card with score band label + gait_score pill
 *  - 3-column gait metrics table (Metric | Value | Status) with colour coding
 *  - Problems table (Problem | Severity | Clinical Note) with colour-coded severity
 *
 * @param {object} config
 * @param {Array}  config.patients     - Array of patient objects
 * @param {string} [config.filename]   - Output filename without .pdf
 * @param {string} [config.generatedBy] - Therapist name for meta bar
 */
export const generatePhysicalTherapyPdf = async ({
  patients = [],
  filename = 'CVAPed_PhysicalTherapyReport',
  generatedBy = 'Therapist',
}) => {
  const [{ default: jsPDF }, { default: autoTable }, logoDataUrl] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    loadImageAsDataUrl(logo),
  ]);

  const TITLE   = 'Physical Therapy Report';
  const PT_BLUE = [71, 154, 195];

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { width: pageWidth, height: pageHeight } = doc.internal.pageSize;

  addBrandedHeader(doc, TITLE, logoDataUrl);

  const totalAnalyses  = patients.length;
  const uniquePatients = new Set(patients.map(p => p.email)).size;
  const avgScore       = totalAnalyses
    ? Math.round(patients.reduce((s, p) => s + (p.score ?? 0), 0) / totalAnalyses)
    : 0;
  const totalIssues    = patients.reduce((s, p) => s + (p.problem_details?.length ?? 0), 0);
  const dateNow        = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  addAnalyticsMetaBar(doc, 'Physical Therapy', totalAnalyses, uniquePatients, dateNow);

  let yPos = HEADER_HEIGHT + META_BAR_HEIGHT + 8;

  // ── Summary section (only when ≥ 2 analyses) ──────────────────────────────
  if (totalAnalyses >= 2) {
    yPos = renderSectionLabel(doc, 'Summary Overview', yPos);

    yPos = renderStatStrip(doc, [
      { label: 'Total Analyses',  value: String(totalAnalyses) },
      { label: 'Unique Patients', value: String(uniquePatients) },
      { label: 'Avg Score',       value: `${avgScore}%` },
      { label: 'Total Issues',    value: String(totalIssues) },
    ], yPos);
    yPos += 28;

    // Score distribution table
    const bandCounts = {};
    patients.forEach(p => {
      const band = getScoreBandLabel(p.score);
      bandCounts[band] = (bandCounts[band] ?? 0) + 1;
    });
    const bandOrder = ['Mastered', 'Functional', 'Mild', 'Moderate', 'Severe'];
    const distRows = bandOrder
      .filter(b => bandCounts[b])
      .map(b => [b, bandCounts[b], `${Math.round((bandCounts[b] / totalAnalyses) * 100)}%`]);

    if (distRows.length) {
      if (yPos > pageHeight - 80) {
        doc.addPage();
        addBrandedHeader(doc, TITLE, logoDataUrl);
        yPos = HEADER_HEIGHT + 6;
      }
      yPos = renderSectionLabel(doc, 'Score Distribution', yPos);
      autoTable(doc, {
        startY: yPos,
        head: [['Band', 'Count', 'Share']],
        body: distRows,
        margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
        tableWidth: 80,
        styles: {
          fontSize: 8,
          cellPadding: { top: 4, bottom: 4, left: 6, right: 6 },
          textColor: C.textBody,
          lineColor: C.rowBorder,
          lineWidth: 0.15,
          valign: 'middle',
        },
        headStyles: {
          fillColor: PT_BLUE,
          textColor: C.white,
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center',
          cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
        },
        alternateRowStyles: { fillColor: C.rowAlt },
        columnStyles: {
          0: { fontStyle: 'bold' },
          1: { halign: 'center' },
          2: { halign: 'center', fontStyle: 'bold', textColor: C.primary },
        },
        theme: 'grid',
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 0) {
            const fakeScore = data.cell.raw === 'Mastered' ? 90
              : data.cell.raw === 'Functional' ? 75
              : data.cell.raw === 'Mild' ? 60
              : data.cell.raw === 'Moderate' ? 40 : 20;
            const style = getScoreBandStyle(fakeScore);
            data.cell.styles.fillColor = style.bg;
            data.cell.styles.textColor = style.text;
          }
        },
      });
      yPos = doc.lastAutoTable.finalY + 12;
    }

    // Most common problems table
    const problemFreq = {};
    patients.forEach(p => {
      (p.problem_details ?? []).forEach(pd => {
        const key = pd.problem ?? 'Unknown';
        problemFreq[key] = (problemFreq[key] ?? 0) + 1;
      });
    });
    const topProblems = Object.entries(problemFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([prob, cnt]) => [
        prob.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        cnt,
        `${Math.round((cnt / totalAnalyses) * 100)}%`,
      ]);

    if (topProblems.length) {
      if (yPos > pageHeight - 80) {
        doc.addPage();
        addBrandedHeader(doc, TITLE, logoDataUrl);
        yPos = HEADER_HEIGHT + 6;
      }
      yPos = renderSectionLabel(doc, 'Most Common Problems', yPos);
      autoTable(doc, {
        startY: yPos,
        head: [['Problem', 'Occurrences', 'Prevalence']],
        body: topProblems,
        margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
        tableWidth: 120,
        styles: {
          fontSize: 8,
          cellPadding: { top: 4, bottom: 4, left: 6, right: 6 },
          textColor: C.textBody,
          lineColor: C.rowBorder,
          lineWidth: 0.15,
          valign: 'middle',
        },
        headStyles: {
          fillColor: C.primary,
          textColor: C.white,
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center',
          cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
        },
        alternateRowStyles: { fillColor: C.rowAlt },
        columnStyles: {
          0: { fontStyle: 'bold' },
          1: { halign: 'center' },
          2: { halign: 'center', fontStyle: 'bold', textColor: C.primary },
        },
        theme: 'grid',
      });
      yPos = doc.lastAutoTable.finalY + 14;
    }
  }

  // ── Per-patient sections ───────────────────────────────────────────────────
  patients.forEach((patient, idx) => {
    const problemCount = patient.problem_details?.length ?? 0;
    const metricsCount = patient.metricsRows?.length ?? 0;
    const estimatedH   = 54 + metricsCount * 8 + 24 + (problemCount ? problemCount * 8 + 24 : 18);

    if (yPos + estimatedH > pageHeight - 20 && (idx > 0 || totalAnalyses >= 2)) {
      doc.addPage();
      addBrandedHeader(doc, TITLE, logoDataUrl);
      yPos = HEADER_HEIGHT + 6;
    }

    // ── Enhanced patient card ─────────────────────────────────────────────
    const cardW  = pageWidth - 2 * PAGE_MARGIN;
    const cardH  = 44;
    const avatarCx = PAGE_MARGIN + 14;
    const avatarCy = yPos + 18;

    doc.setFillColor(220, 220, 220);
    doc.roundedRect(PAGE_MARGIN + 0.6, yPos + 0.8, cardW, cardH, 2, 2, 'F');
    doc.setFillColor(...C.cardBg);
    doc.roundedRect(PAGE_MARGIN, yPos, cardW, cardH, 2, 2, 'F');
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(PAGE_MARGIN, yPos, cardW, cardH, 2, 2, 'S');

    doc.setFillColor(...PT_BLUE);
    doc.rect(PAGE_MARGIN, yPos, 4, cardH, 'F');

    doc.setFillColor(...C.slateDeep);
    doc.circle(avatarCx, avatarCy, 10, 'F');
    const initials = (patient.name ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...C.white);
    doc.text(initials, avatarCx, avatarCy + 3.5, { align: 'center' });

    const textX = PAGE_MARGIN + 29;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...C.text);
    doc.text(patient.name ?? 'Patient', textX, yPos + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.textMuted);
    if (patient.email) doc.text(patient.email, textX, yPos + 17);
    doc.text(`Analysis: ${patient.date ?? '—'}`, textX, yPos + 24);

    // Score badge
    const scoreStyle = getScoreStyle(patient.score ?? 0);
    const scoreBadgeX = pageWidth - PAGE_MARGIN - 52;
    doc.setFillColor(...scoreStyle.bg);
    doc.roundedRect(scoreBadgeX, yPos + 6, 22, 11, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...scoreStyle.text);
    doc.text(`${patient.score ?? '—'}%`, scoreBadgeX + 11, yPos + 13, { align: 'center' });

    // Score band label
    const bandLabel = getScoreBandLabel(patient.score);
    const bandStyle = getScoreBandStyle(patient.score);
    doc.setFillColor(...bandStyle.bg);
    doc.roundedRect(scoreBadgeX, yPos + 20, 22, 9, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...bandStyle.text);
    doc.text(bandLabel, scoreBadgeX + 11, yPos + 25.5, { align: 'center' });

    // gait_score pill (if present)
    if (patient.gait_score != null) {
      const gsPillX = scoreBadgeX - 28;
      doc.setFillColor(...C.scoreMidBg);
      doc.roundedRect(gsPillX, yPos + 6, 24, 11, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...C.scoreMidText);
      doc.text(`Gait: ${Number(patient.gait_score).toFixed(1)}`, gsPillX + 12, yPos + 13, { align: 'center' });
    }

    // Severity badge
    const sevStyle = getSeverityStyle(patient.severity);
    doc.setFillColor(...sevStyle.bg);
    doc.roundedRect(scoreBadgeX, yPos + 32, 22, 8, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...sevStyle.text);
    doc.text((patient.severity ?? 'unknown').toUpperCase(), scoreBadgeX + 11, yPos + 37, { align: 'center' });

    yPos += cardH + 10;

    // ── Gait Metrics Table (Metric | Value | Status) ──────────────────────
    if (yPos > pageHeight - 80) {
      doc.addPage();
      addBrandedHeader(doc, TITLE, logoDataUrl);
      yPos = HEADER_HEIGHT + 6;
    }

    yPos = addEnhancedSectionLabel(doc, 'Gait Analysis Metrics', yPos, PT_BLUE);

    const metricsBody = (patient.metricsRows ?? []).map(r => [r.metric, r.value, r.status ?? 'N/A']);

    autoTable(doc, {
      startY: yPos,
      head: [['Metric', 'Value', 'Status']],
      body: metricsBody,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      styles: {
        fontSize: 8,
        cellPadding: { top: 4, bottom: 4, left: 6, right: 6 },
        textColor: C.textBody,
        lineColor: C.rowBorder,
        lineWidth: 0.15,
        valign: 'middle',
      },
      headStyles: {
        fillColor: PT_BLUE,
        textColor: C.white,
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
        cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
      },
      alternateRowStyles: { fillColor: C.rowAlt },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 38 },
        1: { halign: 'center', fontStyle: 'bold', fontSize: 9, textColor: C.primary },
        2: { halign: 'center' },
      },
      theme: 'grid',
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 2) {
          const style = getStatusStyle(data.cell.raw);
          data.cell.styles.fillColor = style.bg;
          data.cell.styles.textColor = style.text;
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
    yPos = doc.lastAutoTable.finalY + 12;

    // ── Problems Table (Problem | Severity | Clinical Notes) ─────────────
    if (yPos > pageHeight - 80) {
      doc.addPage();
      addBrandedHeader(doc, TITLE, logoDataUrl);
      yPos = HEADER_HEIGHT + 6;
    }

    yPos = addEnhancedSectionLabel(doc, 'Detected Gait Problems', yPos, C.primary);

    const problemDetails = patient.problem_details ?? [];
    if (problemDetails.length > 0) {
      const problemBody = problemDetails.map((pd, i) => [
        String(i + 1),
        (pd.problem ?? 'Unknown').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        (pd.severity ?? 'mild').charAt(0).toUpperCase() + (pd.severity ?? 'mild').slice(1),
        pd.clinical_note ?? '—',
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['#', 'Problem', 'Severity', 'Clinical Notes']],
        body: problemBody,
        margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
        styles: {
          fontSize: 8,
          cellPadding: { top: 4, bottom: 4, left: 6, right: 6 },
          textColor: C.textBody,
          lineColor: C.rowBorder,
          lineWidth: 0.15,
          valign: 'middle',
        },
        headStyles: {
          fillColor: C.primary,
          textColor: C.white,
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center',
          cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
        },
        alternateRowStyles: { fillColor: C.rowAlt },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12 },
          1: { fontStyle: 'bold', cellWidth: 50 },
          2: { halign: 'center', cellWidth: 28 },
          3: { cellWidth: 'auto' },
        },
        theme: 'grid',
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 2) {
            const style = getSeverityStyle(data.cell.raw);
            data.cell.styles.fillColor = style.bg;
            data.cell.styles.textColor = style.text;
            data.cell.styles.fontStyle = 'bold';
          }
        },
      });
      yPos = doc.lastAutoTable.finalY + 14;
    } else {
      doc.setFillColor(...C.mildBg);
      doc.roundedRect(PAGE_MARGIN, yPos, cardW - 40, 12, 2, 2, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...C.mildText);
      doc.text('No gait problems detected', PAGE_MARGIN + 5, yPos + 7.5);
      yPos += 22;
    }

    yPos += 4;
  });

  addPageFooters(doc);
  doc.save(`${filename}.pdf`);
};
