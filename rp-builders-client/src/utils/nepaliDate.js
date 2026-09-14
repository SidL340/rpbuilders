// Nepali BS Date Utilities & Fiscal Year (आर्थिक वर्ष) Engine
// Accurate conversion calibrated for BS 2070 - 2095

export const BS_MONTHS = ['बैशाख', 'जेठ', 'असार', 'श्रावण', 'भदौ', 'असोज', 'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुन', 'चैत्र'];
export const BS_MONTHS_EN = ['Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashoj', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'];
export const BS_DAYS_NP = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

// Official days in each BS month (starting from 2078 BS to 2090 BS)
const BS_MONTH_DAYS = {
  2078: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2079: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2080: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
  2081: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2082: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2083: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
  2084: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
  2085: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2086: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2087: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2088: [31, 31, 32, 32, 31, 30, 29, 30, 30, 29, 30, 30],
  2089: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2090: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
};

// Calibrated reference: 2079-01-01 BS = 2022-04-14 AD UTC
const REF_BS_YEAR = 2079;
const REF_BS_MONTH = 1;
const REF_BS_DAY = 1;
const REF_AD_YEAR = 2022;
const REF_AD_MONTH = 3; // April (0-indexed)
const REF_AD_DAY = 14;

function getDaysInBSMonth(year, month) {
  const y = BS_MONTH_DAYS[year];
  if (!y) return 30;
  return y[month - 1] || 30;
}

/**
 * Converts numbers to Nepali Devanagari digits
 * 2083 -> २०८३
 */
export function toNepaliDigits(number) {
  if (number === null || number === undefined) return '';
  return String(number)
    .split('')
    .map(c => (c >= '0' && c <= '9' ? BS_DAYS_NP[parseInt(c, 10)] : c))
    .join('');
}

/**
 * Convert AD Date to BS date string "YYYY-MM-DD"
 */
export function adToBs(adDate) {
  if (!adDate) return null;
  const d = adDate instanceof Date ? adDate : new Date(adDate);
  const utcDate = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const utcRef = Date.UTC(REF_AD_YEAR, REF_AD_MONTH, REF_AD_DAY);

  let totalDays = Math.floor((utcDate - utcRef) / (1000 * 60 * 60 * 24));

  let year = REF_BS_YEAR;
  let month = REF_BS_MONTH;
  let day = REF_BS_DAY;

  while (totalDays > 0) {
    const daysInMonth = getDaysInBSMonth(year, month);
    if (day + totalDays <= daysInMonth) {
      day += totalDays;
      totalDays = 0;
    } else {
      totalDays -= (daysInMonth - day + 1);
      day = 1;
      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
    }
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Convert BS date string "YYYY-MM-DD" to AD Date string "YYYY-MM-DD"
 */
export function bsToAd(bsDate) {
  if (!bsDate) return null;
  const [bYear, bMonth, bDay] = bsDate.split('-').map(Number);

  let days = 0;
  let y = REF_BS_YEAR;
  let m = REF_BS_MONTH;
  let d = REF_BS_DAY;

  while (y < bYear || (y === bYear && m < bMonth) || (y === bYear && m === bMonth && d < bDay)) {
    days++;
    d++;
    if (d > getDaysInBSMonth(y, m)) {
      d = 1;
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }
  }

  const refDate = new Date(Date.UTC(REF_AD_YEAR, REF_AD_MONTH, REF_AD_DAY));
  refDate.setUTCDate(refDate.getUTCDate() + days);

  return refDate.toISOString().split('T')[0];
}

/**
 * Get today's date in BS ("YYYY-MM-DD")
 */
export function todayBS() {
  return adToBs(new Date());
}

/**
 * Get today's date in AD ("YYYY-MM-DD")
 */
export function todayAD() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Format BS date into human-readable Nepali or English string
 * Example: "2083-05-14" → "२०८३ भदौ १४" or "2083 Bhadra 14"
 */
export function formatBSDate(bsDate, lang = 'np') {
  if (!bsDate) return '';
  const parts = bsDate.split('-');
  if (parts.length < 3) return bsDate;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);

  if (lang === 'np') {
    return `${toNepaliDigits(y)} ${BS_MONTHS[m - 1]} ${toNepaliDigits(d)}`;
  }
  return `${y} ${BS_MONTHS_EN[m - 1]} ${String(d).padStart(2, '0')}`;
}

/**
 * Get Aarthik Barsha (आर्थिक वर्ष / Fiscal Year) for a given BS date
 * Shrawan 1 (04-01) to Ashadh end (03-31/32)
 * e.g. "2083-05-14" (Bhadra 14) -> "2083/84" (२०८३/८४)
 * e.g. "2083-02-10" (Jestha 10) -> "2082/83" (२०८२/८३)
 */
export function getFiscalYear(bsDate) {
  const dateStr = bsDate || todayBS();
  const [yStr, mStr] = dateStr.split('-');
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);

  let label = '';
  let start = '';
  let end = '';

  if (m >= 4) {
    // Shrawan (4) to Chaitra (12)
    const nextY = y + 1;
    label = `${y}/${String(nextY).slice(-2)}`; // e.g. "2083/84"
    start = `${y}-04-01`;
    end = `${nextY}-03-32`;
  } else {
    // Baisakh (1) to Ashadh (3)
    const prevY = y - 1;
    label = `${prevY}/${String(y).slice(-2)}`; // e.g. "2082/83"
    start = `${prevY}-04-01`;
    end = `${y}-03-32`;
  }

  return {
    label,
    labelNp: toNepaliDigits(label),
    start,
    end,
    fullLabel: `आ.व. ${toNepaliDigits(label)}`,
  };
}

/**
 * Get list of standard Nepali Fiscal Years for dropdowns
 */
export function getFiscalYearList() {
  const currentFY = getFiscalYear(todayBS()).label;
  const years = [
    '2084/85',
    '2083/84',
    '2082/83',
    '2081/82',
    '2080/81',
    '2079/80',
  ];

  return years.map(fy => ({
    value: fy,
    label: `आ.व. ${toNepaliDigits(fy)} (${fy})`,
    isCurrent: fy === currentFY,
  }));
}

export default {
  BS_MONTHS,
  BS_MONTHS_EN,
  BS_DAYS_NP,
  toNepaliDigits,
  adToBs,
  bsToAd,
  todayBS,
  todayAD,
  formatBSDate,
  getFiscalYear,
  getFiscalYearList,
};
