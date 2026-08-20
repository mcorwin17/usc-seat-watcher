// USC Banner seat checker. Compares against state.json, prints transition alerts
// to stdout (empty output = nothing newly open), rewrites state.json.
import fs from 'node:fs';

const WATCH = [
  { crn: '15405', label: 'MATH 344L 002 (Fri 10:50am lab)', subject: 'MATH', num: '344L' },
  { crn: '15406', label: 'MATH 344L 003 (Fri 12:00pm lab)', subject: 'MATH', num: '344L' },
  { crn: '16035', label: 'CSCE 520 J60 (Database Design, online)', subject: 'CSCE', num: '520' },
];
const TERM = '202608';
const B = 'https://banner.onecarolina.sc.edu/StudentRegistrationSsb/ssb';

// Banner caches search criteria per cookie session -> fresh jar per course query.
async function query(subject, num) {
  const jar = {};
  const ck = () => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
  const absorb = (r) => {
    for (const s of r.headers.getSetCookie?.() ?? []) {
      const [kv] = s.split(';');
      const i = kv.indexOf('=');
      if (i > 0) jar[kv.slice(0, i).trim()] = kv.slice(i + 1).trim();
    }
  };
  const g = async (u, o = {}) => {
    const r = await fetch(u, { ...o, redirect: 'follow', headers: { Cookie: ck(), 'User-Agent': 'Mozilla/5.0', ...(o.headers || {}) } });
    absorb(r);
    return r;
  };
  await g(`${B}/term/termSelection?mode=search&mepCode=COL`);
  await g(`${B}/term/search?mode=search&mepCode=COL`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `term=${TERM}`,
  });
  const r = await g(`${B}/searchResults/searchResults?txt_subject=${subject}&txt_courseNumber=${num}&txt_term=${TERM}&pageOffset=0&pageMaxSize=50&mepCode=COL`);
  const d = await r.json();
  if (!d?.data) throw new Error(`no data for ${subject} ${num}`);
  return d.data;
}

let state = {};
try { state = JSON.parse(fs.readFileSync('state.json', 'utf8')); } catch {}

const seen = {};
const alerts = [];
const groups = [...new Set(WATCH.map((w) => `${w.subject}|${w.num}`))];
for (const grp of groups) {
  const [subject, num] = grp.split('|');
  const rows = await query(subject, num);
  for (const w of WATCH.filter((x) => x.subject === subject && x.num === num)) {
    const row = rows.find((r) => r.courseReferenceNumber === w.crn);
    if (!row) throw new Error(`CRN ${w.crn} missing from ${subject} ${num} results`);
    const seats = row.seatsAvailable;
    seen[w.crn] = seats;
    const prev = state[w.crn] ?? 0;
    if (seats > 0 && prev <= 0) alerts.push(`SEAT OPEN: ${w.label} — CRN ${w.crn} — ${seats} seat(s). Register NOW at my.sc.edu.`);
  }
}

fs.writeFileSync('state.json', JSON.stringify(seen, null, 2) + '\n');
if (alerts.length) console.log(alerts.join('\n'));
