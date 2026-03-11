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
 *   }
 * @param {Array}    config.metricsColumns  - Column definitions: [{ header, dataKey }]
 * @param {string}   config.filename        - Output filename WITHOUT .pdf extension
 */
export const generatePdfReport = async ({
  title = 'Report',
  patients = [],
  metricsColumns = [],
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
    const blockHeight =
      estimatedCardHeight +
      (patient.metricsRows?.length ? estimatedTableHeight : 0) +
      (patient.problems?.length ? estimatedIssuesHeight : 0) +
      16;

    if (yPos + blockHeight > pageHeight - 20 && idx > 0) {
      doc.addPage();
      addBrandedHeader(doc, title, logoDataUrl);
      yPos = HEADER_HEIGHT + 6;
    }

    yPos = renderPatientCard(doc, patient, yPos, idx, patients.length);

    if (patient.metricsRows?.length > 0 && metricsColumns.length > 0) {
      yPos = renderSectionLabel(doc, 'Gait Metrics', yPos);
      // Table styled to match .logs-table.gait-table:
      //   thead: dark-slate (#1e293b), white uppercase text, primary bottom border
      //   tbody: #334155 text, #f8fafc alt rows, #f1f5f9 row borders
      //   metric col: #64748b bold (like .metric-label)
      //   value col:  primary red bold (like .metric-value)
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
  return [
    { metric: 'Steps',             value: gaitMetrics.step_count ?? '—' },
    { metric: 'Cadence',           value: fmt(gaitMetrics.cadence, ' steps/min') },
    { metric: 'Stride Length',     value: fmt(gaitMetrics.stride_length, ' m') },
    { metric: 'Velocity',          value: fmt(gaitMetrics.velocity, ' m/s') },
    { metric: 'Gait Symmetry',     value: fmt(gaitMetrics.gait_symmetry, '%') },
    { metric: 'Stability Score',   value: fmt(gaitMetrics.stability_score, '%') },
    { metric: 'Step Regularity',   value: fmt(gaitMetrics.step_regularity, '%') },
    { metric: 'Analysis Duration', value: analysisDuration ? `${Number(analysisDuration).toFixed(0)}s` : '—' },
    { metric: 'Data Quality',      value: dataQuality ?? '—' },
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

    if (si.strongest_area) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...C.mildText);
      doc.text(`Most Improved: ${si.strongest_area.metric} (${si.strongest_area.delta >= 0 ? '+' : ''}${si.strongest_area.delta}%)`, PAGE_MARGIN, yPos);
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
  if (comparisonData?.has_facility_data) {
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
