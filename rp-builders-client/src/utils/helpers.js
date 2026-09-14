// Format NPR currency
export function formatNPR(amount, showSymbol = true) {
  if (amount === null || amount === undefined) return '—';
  const num = parseFloat(amount);
  if (isNaN(num)) return '—';
  const formatted = Math.abs(num).toLocaleString('en-NP', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const prefix = num < 0 ? '-' : '';
  return showSymbol ? `${prefix}NPR ${formatted}` : `${prefix}${formatted}`;
}

// Format large numbers in short form
export function formatShort(amount) {
  const n = parseFloat(amount);
  if (isNaN(n)) return '0';
  if (Math.abs(n) >= 10000000) return (n/10000000).toFixed(2) + ' Cr';
  if (Math.abs(n) >= 100000)   return (n/100000).toFixed(2) + ' L';
  if (Math.abs(n) >= 1000)     return (n/1000).toFixed(1) + ' K';
  return n.toFixed(0);
}

// Amount in words (Nepali format)
export function amountInWords(amount) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
                 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
                 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const num = Math.floor(parseFloat(amount));
  const paisa = Math.round((parseFloat(amount) - num) * 100);

  function convert(n) {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? ' ' + ones[n%10] : '');
    if (n < 1000) return ones[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' ' + convert(n%100) : '');
    if (n < 100000) return convert(Math.floor(n/1000)) + ' Thousand' + (n%1000 ? ' ' + convert(n%1000) : '');
    if (n < 10000000) return convert(Math.floor(n/100000)) + ' Lakh' + (n%100000 ? ' ' + convert(n%100000) : '');
    return convert(Math.floor(n/10000000)) + ' Crore' + (n%10000000 ? ' ' + convert(n%10000000) : '');
  }

  const words = convert(num);
  const paisaWords = paisa > 0 ? ` and ${convert(paisa)} Paisa` : '';
  return (words || 'Zero') + paisaWords + ' Only';
}

// Voucher type display
export const VOUCHER_TYPES = {
  payment:     { label: 'Payment Voucher',  short: 'PV', color: 'red' },
  receipt:     { label: 'Receipt Voucher',  short: 'RV', color: 'green' },
  journal:     { label: 'Journal Voucher',  short: 'JV', color: 'blue' },
  contra:      { label: 'Contra Voucher',   short: 'CV', color: 'purple' },
  debit_note:  { label: 'Debit Note',       short: 'DN', color: 'orange' },
  credit_note: { label: 'Credit Note',      short: 'CN', color: 'yellow' },
};

export const PARTY_TYPES = {
  thekedar:       'ठेकेदार / Thekedar',
  supplier:       'आपूर्तिकर्ता / Supplier',
  labour:         'मजदुर / Labour',
  equipment_owner:'उपकरण मालिक / Equipment Owner',
  office_vendor:  'Office Vendor',
  employee:       'कर्मचारी / Employee',
  loan_provider:  'साहु / Loan Provider',
  transport:      'यातायात / Transport',
  utility:        'Utility',
  client:         'Client',
  partner_company:'Partner Company',
  government:     'Government',
  other:          'अन्य / Other',
};

export const PROJECT_TYPES = { solo: 'Solo Project', joint_venture: 'Joint Venture (JV)' };
export const PROJECT_STATUSES = {
  planning:  { label: 'Planning',   color: 'yellow' },
  active:    { label: 'Active',     color: 'green' },
  on_hold:   { label: 'On Hold',    color: 'yellow' },
  completed: { label: 'Completed',  color: 'blue' },
  closed:    { label: 'Closed',     color: 'gray' },
};

export const PAYMENT_MODES = ['cash','cheque','bank_transfer','online'];

// TDS rates for Nepal
export const TDS_RATES = [
  { label: 'No TDS (0%)',                   value: 0 },
  { label: 'Thekedar - Works (1.5%)',        value: 1.5 },
  { label: 'Thekedar - Services (5%)',       value: 5 },
  { label: 'Rent Payment (10%)',             value: 10 },
  { label: 'Professional Services (15%)',    value: 15 },
  { label: 'Commission (15%)',               value: 15 },
];

// Truncate long text
export function truncate(str, n = 40) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n) + '...' : str;
}

// Get status badge class
export function getStatusBadge(status) {
  const map = {
    active: 'badge-green', approved: 'badge-green', completed: 'badge-green',
    draft: 'badge-yellow', planning: 'badge-yellow', on_hold: 'badge-yellow',
    cancelled: 'badge-red', terminated: 'badge-red', closed: 'badge-gray',
  };
  return map[status] || 'badge-gray';
}

// Handle API errors
export function getErrorMessage(err) {
  return err?.response?.data?.message || err?.message || 'Something went wrong';
}
