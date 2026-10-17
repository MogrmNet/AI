/* ==========================================================================
   WaveSense AI — script.js
   Designed & Developed by GARHI
   Vanilla JS, no build step, no eval(). All demo data is SIMULATED.
   Sections: utilities · i18n/theme · nav · explainer · architecture · risks ·
   BOM · budget · team · demo dashboard · roadmap · testing · commercial ·
   repo tree · sources · export · init
   ========================================================================== */
(() => {
'use strict';

/* ---------- Utilities ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const b = (ar, en) => ({ ar, en });
const clone = o => JSON.parse(JSON.stringify(o));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = n => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
const egp = n => 'EGP ' + nf(n);

/* Defensive localStorage wrapper (may throw in private mode / blocked storage) */
const store = {
  ok: true,
  get(k, d) { try { const v = localStorage.getItem('wsai.' + k); return v == null ? d : JSON.parse(v); } catch (e) { this.ok = false; return d; } },
  set(k, v) { try { localStorage.setItem('wsai.' + k, JSON.stringify(v)); } catch (e) { this.ok = false; } }
};

let lang = store.get('lang', 'ar'); if (lang !== 'ar' && lang !== 'en') lang = 'ar';
let theme = store.get('theme', 'dark'); if (theme !== 'dark' && theme !== 'light') theme = 'dark';
const L = o => (o == null ? '' : (typeof o === 'string' ? o : (o[lang] != null ? o[lang] : o.en || '')));

/* Small UI string table for dynamic text */
const UI = {
  copied: b('تم النسخ', 'Copied to clipboard'),
  copyFail: b('تعذّر النسخ تلقائيًا — حدّد النص وانسخه يدويًا', 'Automatic copy failed — select and copy manually'),
  csvDone: b('تم تنزيل ملف CSV', 'CSV downloaded'),
  mdDone: b('تم تنزيل ملف Markdown', 'Markdown downloaded'),
  noEvents: b('لا توجد أحداث بعد. اضغط «بدء العرض».', 'No events yet. Press “Start Demo”.'),
  noEventsToast: b('لا توجد أحداث لتصديرها بعد', 'No events to export yet'),
  item: b('اسم البند', 'Item name'),
  del: b('حذف البند', 'Remove item'),
  have: b('متوفر لدينا', 'Already have'),
  newItem: b('بند جديد', 'New item'),
  gross: b('إجمالي كل البنود', 'Gross total (all items)'),
  avail: b('ناقص: بنود متوفرة لدينا', 'Less: items already available'),
  net: b('الصافي المطلوب شراؤه', 'Net to purchase'),
  lowGtHigh: b('تنبيه: السعر الأدنى أعلى من الأعلى في بعض البنود', 'Warning: a low price exceeds its high price on some rows'),
  stillState: b('سكون', 'STILL'), motionState: b('حركة مكتشفة', 'MOTION DETECTED'),
  idleState: b('خامل — لم يبدأ', 'IDLE — not started'), warmState: b('جارٍ ملء النافذة…', 'Filling window…'),
  connActive: b('محاكاة نشطة', 'Simulated link active'), connPaused: b('متوقف مؤقتًا', 'Paused'), connNone: b('لم يبدأ', 'Not started'),
  evStart: b('بدء حركة', 'Motion started'), evEnd: b('انتهاء حركة', 'Motion ended'),
  signalY: b('السعة (وحدة اعتباطية، محاكاة)', 'Amplitude (arb. units, simulated)'),
  varY: b('تباين النافذة', 'Window variance'), timeX: b('الزمن (ث)', 'Time (s)'),
  signalL: b('إشارة محاكاة', 'Simulated signal'), varL: b('تباين النافذة', 'Window variance'), thrL: b('العتبة', 'Threshold'),
  roomReset: b('أُعيد ضبط العرض للغرفة المحددة', 'Demo reset for the selected room'),
  todo: b('لم تبدأ', 'To do'), progress: b('قيد التنفيذ', 'In progress'), done: b('مكتملة', 'Done'), blocked: b('متعثرة', 'Blocked'),
  pending: b('لم يُختبر', 'Not tested'), pass: b('نجح', 'Passed'), fail: b('فشل', 'Failed'),
  open: b('مفتوح', 'Open'), mitigating: b('قيد المعالجة', 'Mitigating'), closed: b('مغلق', 'Closed'),
  Low: b('منخفض', 'Low'), Medium: b('متوسط', 'Medium'), High: b('مرتفع', 'High'),
  min: b('الأدنى', 'Min'), max: b('الأقصى', 'Max'),
  dash: '—'
};
const T = k => L(UI[k]);

/* Toast + clipboard + download helpers */
let toastTimer;
function toast(msg) {
  const el = $('#toast'); if (!el) return;
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); toast(T('copied')); return true; }
  } catch (e) { /* fall through to legacy path */ }
  let ok = false;
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;opacity:0';
    document.body.appendChild(ta); ta.select(); ok = document.execCommand('copy'); ta.remove();
  } catch (e) { ok = false; }
  toast(ok ? T('copied') : T('copyFail'));
  return ok;
}
function downloadFile(name, text, mime) {
  try {
    const blob = new Blob([text], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    return true;
  } catch (e) { toast(T('copyFail')); return false; }
}
/* CSV with formula-injection guard for text cells; UTF-8 BOM so Excel reads Arabic */
function csvCell(v) {
  if (typeof v === 'number') return String(v);
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
const toCSV = rows => '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n');
const icons = () => { try { if (window.lucide && window.lucide.createIcons) window.lucide.createIcons(); } catch (e) { /* decorative only */ } };
const num = (v, def = 0) => { const n = parseFloat(v); return Number.isFinite(n) && n >= 0 ? n : def; };
const optNum = el => { const t = el.value.trim(); if (t === '') return null; const n = parseFloat(t); return Number.isFinite(n) && n >= 0 ? n : null; };

/* ==========================================================================
   DATA (bilingual)
   ========================================================================== */
const SECTIONS = [
  ['home', 'الرئيسية', 'Home'], ['summary', 'الملخص', 'Summary'], ['problem', 'المشكلة والحل', 'Problem'], ['how', 'كيف يعمل CSI', 'How CSI works'],
  ['arch', 'المعمارية', 'Architecture'], ['feasibility', 'الجدوى التقنية', 'Feasibility'], ['hardware', 'العتاد والبرمجيات', 'Hardware'],
  ['budget', 'الميزانية', 'Budget'], ['team', 'الفريق', 'Team'], ['demo', 'العرض التجريبي', 'Live demo'], ['algo', 'الخوارزمية', 'Algorithm'],
  ['backend', 'الخلفية', 'Backend'], ['frontend', 'الواجهة', 'Frontend'], ['roadmap', 'الخارطة', 'Roadmap'], ['testing', 'الاختبار', 'Testing'],
  ['risks', 'المخاطر', 'Risks'], ['commercial', 'التجاري', 'Commercial'], ['repo', 'المستودع', 'Repo'], ['export', 'التصدير', 'Export'], ['sources', 'المصادر', 'Sources']
];

const HOW = [
  { t: b('مصدر لاسلكي يولّد حزمًا', 'A wireless source generates packets'), d: b('مرسِل ESP32 متوافق (أو مصدر Wi-Fi) يرسل حزمًا بانتظام عبر قناة محددة.', 'A compatible ESP32 transmitter (or another Wi-Fi source) sends packets regularly on a chosen channel.') },
  { t: b('المستقبِل يستخرج CSI', 'The receiver extracts CSI'), d: b('مستقبِل متوافق يقيس حالة القناة لكل حزمة مستلمة ويُخرجها، عادةً عبر المنفذ التسلسلي. قد تتضمن القياسات السعة والطور حسب دعم العتاد والبرنامج الثابت.', 'A compatible receiver measures channel state for each received packet and outputs it, typically over serial. Measurements may include amplitude and phase depending on hardware and firmware support.') },
  { t: b('الحركة والبيئة قد تغيّر القياسات', 'Motion and environment may alter measurements'), d: b('حركة جسم أو تغيّر في الأثاث/الأبواب أو تداخل لاسلكي قد يغيّر نمط انعكاس الإشارة. ليس كل تغيّر ناتجًا عن حركة بشرية.', 'A moving body, changed furniture/doors or wireless interference may change how the signal reflects. Not every change is caused by human motion.') },
  { t: b('بايثون يعالج البيانات الواردة', 'Python processes incoming data'), d: b('سكربت يقرأ البيانات، يختم الوقت، يتحقق من الصلاحية، ويجهّز نوافذ زمنية للخوارزمية.', 'A script reads the data, timestamps it, validates it and prepares time windows for the algorithm.') },
  { t: b('خوارزمية تقدّر وجود حركة', 'An algorithm estimates motion'), d: b('خصائص النوافذ (مثل التباين) تُقارن بخط أساس أو مصنِّف مدرَّب مع عتبة قرار موثقة.', 'Window features (e.g., variance) are compared with a baseline or trained classifier using a documented threshold.') },
  { t: b('الواجهة الخلفية تسجّل النتيجة', 'The backend records the result'), d: b('واجهة برمجية تتحقق من الحمولة وتخزّن الحدث بطابع زمني في SQLite.', 'An API validates the payload and stores the timestamped event in SQLite.') },
  { t: b('اللوحة تعرض الحالة والسجل', 'The dashboard shows state and history'), d: b('الواجهة تعرض الحالة الحالية وسجل الأحداث وحالات الخطأ والانقطاع.', 'The frontend shows the current state, event history and error/disconnected states.') }
];

const GLOSS = [
  ['CSI', b('معلومات حالة القناة: قياسات تفصيلية لكيفية انتقال الإشارة اللاسلكية عبر الترددات الفرعية، وقد تشمل السعة والطور.', 'Channel State Information: detailed measurements of how a wireless signal propagates across sub-carriers; may include amplitude and phase.')],
  ['RSSI', b('مؤشر قوة الإشارة المستلمة: رقم واحد خشن لقوة الإشارة، أقل تفصيلًا من CSI.', 'Received Signal Strength Indicator: a single coarse number for signal strength, less detailed than CSI.')],
  ['ESP32', b('عائلة متحكمات دقيقة من Espressif مزوّدة بـ Wi-Fi. ليست كل اللوحات/الشرائح تدعم CSI بالطريقة نفسها.', 'A family of Wi-Fi-enabled microcontrollers from Espressif. Not every board/chip supports CSI the same way.')],
  ['ESP-IDF', b('إطار التطوير الرسمي من Espressif لبناء البرامج الثابتة وتحميلها.', 'Espressif’s official development framework for building and flashing firmware.')],
  [b('التباين', 'Variance'), b('مقياس لمدى تشتت القيم حول متوسطها؛ يزداد عادةً حين تتقلب الإشارة أكثر.', 'A measure of how spread out values are around their mean; typically increases when a signal fluctuates more.')],
  [b('النافذة المنزلقة', 'Sliding window'), b('قطعة زمنية قصيرة من الإشارة تتحرك على طولها لحساب خصائص متتالية.', 'A short time slice of a signal that moves along it to compute successive features.')],
  [b('العتبة', 'Threshold'), b('قيمة قرار: إذا تجاوزتها الخاصية عُدَّت حركة. ضبطها يوازن بين الإنذارات الكاذبة والحركة الفائتة.', 'A decision value: if a feature exceeds it, motion is declared. Tuning it trades false alarms against missed motion.')],
  [b('إيجابي كاذب', 'False positive'), b('إنذار حركة بينما لا توجد حركة فعلية.', 'A motion alarm when there is no actual motion.')],
  ['Recall', b('نسبة الحركة الحقيقية التي اكتشفها النظام فعلًا (الاستدعاء).', 'The share of real motion that the system actually detected.')],
  ['Precision', b('نسبة الإنذارات التي كانت صحيحة فعلًا (الدقة).', 'The share of alarms that were actually correct.')],
  ['REST API', b('واجهة برمجية عبر HTTP تستخدم طرقًا مثل GET وPOST لقراءة الموارد وإنشائها.', 'An HTTP-based API that uses methods such as GET and POST to read and create resources.')],
  ['WebSocket', b('قناة اتصال ثنائية الاتجاه دائمة، تُستخدم لدفع التحديثات الفورية إلى المتصفح.', 'A persistent two-way connection used to push real-time updates to the browser.')]
];

const own = (ta, te, n) => b(`${ta} — عضو ${n}`, `${te} — Member ${n}`);
const OWN = {
  e1: own('تقنية/مدمجة', 'IT/Embedded', 1), e2: own('تقنية/مدمجة', 'IT/Embedded', 2), e3: own('تقنية/مدمجة', 'IT/Embedded', 3), e4: own('تقنية/مدمجة', 'IT/Embedded', 4),
  a1: own('ذكاء اصطناعي', 'AI', 1), a2: own('ذكاء اصطناعي', 'AI', 2),
  k1: own('خلفية', 'Backend', 1), k2: own('خلفية', 'Backend', 2), k3: own('خلفية', 'Backend', 3),
  f1: own('أمامية', 'Frontend', 1), f2: own('أمامية', 'Frontend', 2), u1: b('UI/UX — العضو الوحيد', 'UI/UX — sole member'),
  all: b('كل الفريق', 'Whole team')
};

const ARCH = [
  { icon: 'radio-tower', n: b('مرسِل ESP32 / مصدر Wi-Fi', 'ESP32 Transmitter / Wi-Fi Source'), p: b('توليد حزم لاسلكية منتظمة يقيس المستقبِل قناتها.', 'Generate regular wireless packets whose channel the receiver measures.'), i: b('طاقة، إعدادات البرنامج الثابت', 'Power, firmware configuration'), o: b('حزم لاسلكية', 'Wireless packets'), t: b('تقنية/مدمجة — عضو 2', 'IT/Embedded — Member 2'), d: b('لوحة متوافقة، إصدار ESP-IDF، إعداد القناة/الراوتر', 'Compatible board, ESP-IDF version, channel/router setup') },
  { icon: 'wifi', n: b('مستقبِل ESP32 واستخراج CSI', 'ESP32 Receiver and CSI Extraction'), p: b('استقبال الحزم واستخراج قياسات CSI وإخراجها.', 'Receive packets, extract CSI measurements and output them.'), i: b('حزم لاسلكية', 'Wireless packets'), o: b('سجلات CSI خام عبر المنفذ التسلسلي', 'Raw CSI records over serial'), t: b('تقنية/مدمجة — عضو 3', 'IT/Embedded — Member 3'), d: b('المرسِل، أمثلة ESP-CSI الرسمية، مواصفة صيغة البيانات', 'Transmitter, official ESP-CSI examples, data-format specification') },
  { icon: 'cable', n: b('طبقة جمع البيانات (بايثون/تسلسلي)', 'Python Serial/Data Acquisition Layer'), p: b('قراءة السجلات، ختم الوقت، التحقق، التسجيل وتمرير القياسات.', 'Read records, timestamp, validate, record and pass measurements on.'), i: b('سجلات CSI خام', 'Raw CSI records'), o: b('عينات مختومة زمنيًا وملفات تسجيل', 'Timestamped samples and recording files'), t: b('تقنية/مدمجة — عضو 4', 'IT/Embedded — Member 4'), d: b('المستقبِل، pyserial، مواصفة صيغة البيانات', 'Receiver, pyserial, data-format specification') },
  { icon: 'brain', n: b('معالجة الإشارة بالذكاء الاصطناعي', 'AI Signal Processing'), p: b('تحويل النوافذ إلى خصائص وتقدير حالة الحركة.', 'Turn windows into features and estimate motion state.'), i: b('نوافذ CSI صالحة', 'Validated CSI windows'), o: b('تنبؤ منظّم: حركة/سكون + ثقة اختيارية', 'Structured prediction: motion/still + optional confidence'), t: b('ذكاء اصطناعي (عضوان)', 'AI / Signal Processing (2 members)'), d: b('تسجيلات حقيقية، بروتوكول تقييم، واجهة الدالة', 'Real recordings, evaluation protocol, function interface') },
  { icon: 'server', n: b('واجهة برمجية خلفية', 'Backend API'), p: b('استقبال التنبؤات، التحقق، التخزين، وخدمة الحالة والتاريخ.', 'Receive predictions, validate, store, and serve status and history.'), i: b('حمولة JSON للأحداث', 'JSON event payloads'), o: b('استجابات REST، أحداث مخزنة', 'REST responses, stored events'), t: b('خلفية — الأعضاء 1 و3', 'Backend — Members 1 & 3'), d: b('واجهة الذكاء الاصطناعي، مخطط قاعدة البيانات', 'AI interface, database schema') },
  { icon: 'database', n: b('قاعدة البيانات (SQLite)', 'Database (SQLite)'), p: b('حفظ الأحداث بطوابع زمنية والاستعلام عن السجل.', 'Persist timestamped events and query history.'), i: b('أحداث تم التحقق منها', 'Validated events'), o: b('صفوف أحداث، نتائج استعلامات', 'Event rows, query results'), t: b('خلفية — عضو 2', 'Backend — Member 2'), d: b('مخطط الجدول، الفهارس', 'Table schema, indexes') },
  { icon: 'layout-dashboard', n: b('لوحة التحكم الأمامية', 'Frontend Dashboard'), p: b('عرض الحالة والمخططات وسجل الأحداث وحالات الخطأ.', 'Display status, charts, event history and error states.'), i: b('استجابات REST', 'REST responses'), o: b('واجهة مستخدم', 'User interface'), t: b('أمامية (عضوان) + UI/UX', 'Frontend (2) + UI/UX (1)'), d: b('عقد الواجهة البرمجية، مواصفات التصميم', 'API contract, design specifications') }
];

/* Risk register — probability/impact are preliminary judgments, not measurements */
const RISKS = [
  { id: 'r1', tech: true, t: b('عدم توافق العتاد/البرنامج الثابت', 'Hardware/firmware incompatibility'), p: 'Medium', i: 'High', m: b('تحقق من الشريحة وإصدار ESP-IDF مقابل وثائق ESP-CSI الرسمية قبل الشراء؛ ابدأ بالمثال الرسمي.', 'Verify chip and ESP-IDF version against official ESP-CSI docs before buying; start with the official example.'), o: OWN.e1 },
  { id: 'r2', tech: true, t: b('عيّنات CSI غير كافية', 'Insufficient CSI samples'), p: 'Medium', i: 'High', m: b('سجّل جلسات متعددة بمواضع وأوقات مختلفة؛ وثّق بروتوكول التسجيل.', 'Record multiple sessions at varied positions and times; document the recording protocol.'), o: OWN.e3 },
  { id: 'r3', tech: true, t: b('حساسية البيئة', 'Environmental sensitivity'), p: 'High', i: 'High', m: b('ثبّت التخطيط، دوّن حالة الأبواب والأثاث، واختبر التغييرات صراحةً.', 'Fix the layout, record door/furniture states, and test changes explicitly.'), o: OWN.a1 },
  { id: 'r4', tech: true, t: b('إيجابيات كاذبة', 'False positives'), p: 'Medium', i: 'Medium', m: b('قيّم على مجموعة ساكنة، طبّق تأخيرًا/تنعيمًا، واضبط العتبة لكل بيئة.', 'Evaluate on a static set, apply debounce/smoothing, tune the threshold per environment.'), o: OWN.a2 },
  { id: 'r5', tech: false, t: b('تأخر التكامل', 'Integration delays'), p: 'Medium', i: 'Medium', m: b('واجهة وهمية ونموذج أمامي بحلول الأسبوع 2؛ اتفق مبكرًا على عقد البيانات والواجهة.', 'Mock API and frontend prototype by Week 2; agree the data and API contract early.'), o: OWN.k1 },
  { id: 'r6', tech: true, t: b('أداء حاسوب محمول محدود', 'Limited laptop performance'), p: 'Low', i: 'Medium', m: b('خصائص خفيفة، تجنّب النماذج الثقيلة، وقِس زمن الاستجابة فعليًا.', 'Use lightweight features, avoid heavy models, and measure latency.'), o: OWN.a2 },
  { id: 'r7', tech: false, t: b('الخصوصية وأمن البيانات', 'Privacy and data security'), p: 'Medium', i: 'High', m: b('قلّل التسجيل، حدّد مدة الاحتفاظ، قيّد الوصول، ولا تُدخل بيانات شخصية في العرض.', 'Minimize logging, define retention, restrict access, and keep personal data out of the demo.'), o: OWN.k3 },
  { id: 'r8', tech: false, t: b('تغيّر التكاليف', 'Cost changes'), p: 'Medium', i: 'Low', m: b('أكّد الأسعار لدى الموردين واحتفظ باحتياطي طوارئ.', 'Confirm vendor prices and keep a contingency reserve.'), o: OWN.e1 },
  { id: 'r9', tech: false, t: b('المبالغة في الادعاءات', 'Overclaiming results'), p: 'Medium', i: 'High', m: b('وسم كل البيانات المحاكاة، ولا تُعلن إلا نتائج مقاسة مع بروتوكولها.', 'Label all simulated data and report only measured results with their protocol.'), o: OWN.all }
];

const BOM_DEFAULT = [
  { n: b('لوحات ESP32 متوافقة مع CSI', 'ESP32 boards compatible with CSI'), q: 2, lo: 280, hi: 500, av: false },
  { n: b('كابلات USB', 'USB cables'), q: 2, lo: 75, hi: 150, av: false },
  { n: b('بريدبورد وأسلاك (طقم)', 'Breadboard and wires (set)'), q: 1, lo: 100, hi: 250, av: false },
  { n: b('مصادر طاقة', 'Power supplies'), q: 2, lo: 75, hi: 150, av: false },
  { n: b('راوتر Wi-Fi', 'Wi-Fi router'), q: 1, lo: 0, hi: 1500, av: false },
  { n: b('علبة وإكسسوارات تثبيت (طقم)', 'Enclosure and mounting accessories (set)'), q: 1, lo: 100, hi: 300, av: false },
  { n: b('شحن واحتياطي استبدال', 'Shipping and replacement reserve'), q: 1, lo: 200, hi: 500, av: false }
];

const SCEN = [
  { id: 'eco', n: b('اقتصادي (إثبات مفهوم)', 'Economical proof of concept'), r: '1,500–2,500' },
  { id: 'std', n: b('MVP قياسي', 'Standard MVP'), r: '2,500–4,500' },
  { id: 'exp', n: b('إعداد تجريبي موسّع', 'Expanded experimental setup'), r: '4,500–7,000+' },
  { id: 'bom', n: b('من جدول المواد (صافي)', 'From the BOM table (net)'), r: '' }
];
const BUD_DEFAULT = { sel: 'std', lo: { eco: 1500, std: 2500, exp: 4500, bom: 0 }, hi: { eco: 2500, std: 4500, exp: 7000, bom: 0 }, cont: 10, ded: 0, soft: 0, labor: 0, rec: 0, months: 0 };

const TEAMS = [
  { id: 'emb', icon: 'cpu', n: b('تقنية المعلومات / الأنظمة المدمجة', 'IT / Embedded Systems'), count: 4,
    members: [
      [b('قراءة README والوثائق الحالية', 'Read the existing README and docs'), b('التحقق من طراز اللوحة وإصدار ESP-IDF المتوافق', 'Verify the board model and compatible ESP-IDF version'), b('إعداد بيئة التطوير', 'Set up the development environment'), b('بناء وتحميل المثال الرسمي المتوافق', 'Build and flash the official compatible example')],
      [b('إعداد المرسِل أو مصدر الحزم', 'Configure the transmitter or packet source'), b('التحقق من توليد الحزم اللاسلكية', 'Verify wireless packet generation'), b('توثيق الإعداد وإصدار البرنامج الثابت', 'Document configuration and firmware version')],
      [b('إعداد المستقبِل', 'Configure the receiver'), b('استخراج قياسات CSI', 'Extract CSI measurements'), b('التحقق من اتساق البيانات وجودة التسجيل', 'Validate data consistency and recording quality')],
      [b('بناء سكربت بايثون لجمع البيانات', 'Build a Python data acquisition script'), b('قراءة البيانات عبر pyserial أو وسيلة النقل المدعومة', 'Read data using pyserial or the project’s supported transport'), b('تسجيل البيانات بطابع زمني وتمرير القياسات المجهّزة لواجهة الذكاء الاصطناعي', 'Record timestamped data and pass prepared measurements to the AI interface')]
    ],
    deliv: [b('برنامج ثابت يعمل', 'Working firmware'), b('سكربت جمع البيانات', 'Data acquisition script'), b('تسجيلات عيّنة', 'Sample recordings'), b('تعليمات إعداد العتاد', 'Hardware setup instructions'), b('مواصفة صيغة بيانات CSI', 'CSI data format specification')],
    dep: b('يعتمد على: مستودع ESP-CSI الرسمي واللوحات المتوافقة. يغذّي: فريق الذكاء الاصطناعي بالتسجيلات ومواصفة الصيغة.', 'Depends on: the official ESP-CSI repo and compatible boards. Feeds: the AI team with recordings and the format specification.') },
  { id: 'ai', icon: 'brain', n: b('الذكاء الاصطناعي / معالجة الإشارة', 'AI / Signal Processing'), count: 2,
    members: [
      [b('فحص بيانات العيّنة', 'Inspect sample data'), b('تنظيف الإشارات وتصويرها', 'Clean and visualize signals'), b('استخراج خصائص النوافذ', 'Extract window-based features'), b('مقارنة عيّنات السكون والحركة', 'Compare still and motion samples')],
      [b('تنفيذ كاشف عتبة أساسي', 'Implement a baseline threshold detector'), b('تقييم خط أساس تعلم آلي إن كان مبررًا بالبيانات', 'Evaluate a suitable machine-learning baseline if justified by the data'), b('قياس الدقة (Precision) والاستدعاء (Recall) والإيجابيات الكاذبة وزمن الاستجابة', 'Measure precision, recall, false positives, and latency'), b('التحقق على تسجيلات منفصلة عن جلسات التدريب', 'Validate on recordings separated from training sessions')]
    ],
    deliv: [b('دفاتر تحليل قابلة للتكرار', 'Reproducible analysis notebooks'), b('كود بايثون المصدري', 'Python source code'), b('تقرير التقييم', 'Evaluation report'), b('واجهة دالة موثقة', 'Documented function interface')],
    dep: b('يعتمد على: تسجيلات حقيقية ومواصفة الصيغة. يغذّي: الخلفية بواجهة الدالة.', 'Depends on: real recordings and the format spec. Feeds: the backend with the function interface.') },
  { id: 'be', icon: 'server', n: b('الواجهة الخلفية', 'Backend'), count: 3,
    members: [
      [b('تطوير نقاط نهاية Flask أو FastAPI', 'Develop Flask or FastAPI endpoints'), b('التحقق من الحمولات الواردة', 'Validate incoming payloads'), b('إرجاع استجابات موثقة', 'Return documented responses')],
      [b('تصميم وتنفيذ مخطط SQLite', 'Design and implement the SQLite schema'), b('تخزين الأحداث والطوابع الزمنية', 'Store events and timestamps'), b('تنفيذ استعلامات السجل', 'Implement history queries')],
      [b('إضافة اختبارات تكامل', 'Add integration tests'), b('معالجة البيانات غير الصالحة والأخطاء والانقطاعات', 'Handle invalid data, errors, and disconnections'), b('توثيق عقد الواجهة البرمجية', 'Document the API contract')]
    ],
    deliv: [b('POST /api/events · GET /api/status · GET /api/events · GET /api/health', 'POST /api/events · GET /api/status · GET /api/events · GET /api/health'), b('مخطط قاعدة بيانات', 'Database schema'), b('اختبارات تكامل', 'Integration tests'), b('وثيقة عقد الواجهة', 'API contract document')],
    dep: b('يعتمد على: واجهة دالة الذكاء الاصطناعي. يغذّي: الواجهة الأمامية بعقد الواجهة البرمجية.', 'Depends on: the AI function interface. Feeds: the frontend with the API contract.') },
  { id: 'fe', icon: 'layout-dashboard', n: b('الواجهة الأمامية', 'Frontend'), count: 2,
    members: [
      [b('تنفيذ بنية الصفحة ومكونات اللوحة', 'Implement the page structure and dashboard components'), b('بناء بطاقات الحالة وتخطيطات متجاوبة', 'Build status cards and responsive layouts')],
      [b('ربط الواجهة بالخلفية', 'Connect the UI to the backend'), b('تنفيذ المخططات وسجل الأحداث', 'Implement charts and event history'), b('معالجة حالات التحميل والخطأ والانقطاع', 'Handle loading, error, and disconnected states')]
    ],
    deliv: [b('مكونات اللوحة', 'Dashboard components'), b('بطاقات الحالة', 'Status cards'), b('مخططات وسجل أحداث', 'Charts and event history'), b('معالجة حالات الواجهة', 'UI state handling')],
    dep: b('يعتمد على: عقد الواجهة البرمجية ومواصفات UI/UX.', 'Depends on: the API contract and UI/UX specifications.') },
  { id: 'ux', icon: 'palette', n: b('UI/UX', 'UI/UX'), count: 1,
    members: [
      [b('إنشاء نموذج Figma', 'Create the Figma mockup'), b('تحديد الألوان والخطوط والمسافات والأيقونات', 'Define colors, typography, spacing, and icons'), b('تصميم تخطيطات سطح المكتب والجوال', 'Design desktop and mobile layouts'), b('تصميم حالات: تحميل، خطأ، انقطاع، خمول، حركة مكتشفة', 'Design loading, error, disconnected, idle, and motion-detected states'), b('تسليم مواصفات التصميم لفريق الواجهة', 'Deliver design specifications to the frontend team')]
    ],
    deliv: [b('نموذج Figma', 'Figma mockup'), b('مواصفات التصميم', 'Design specifications')],
    dep: b('يعتمد على: متطلبات الحالات من الفريق. يغذّي: الواجهة الأمامية بالمواصفات.', 'Depends on: state requirements from the team. Feeds: the frontend with specifications.') }
];

const MATRIX_COLS = [b('البرنامج الثابت', 'Firmware'), b('جمع البيانات', 'Acquisition'), b('معالجة الإشارة', 'Signal processing'), b('الواجهة البرمجية', 'API'), b('قاعدة البيانات', 'Database'), b('اللوحة', 'Dashboard'), b('التصميم', 'Design'), b('الاختبار', 'Testing')];
const MATRIX = { emb: ['R', 'R', '', '', '', '', '', 'S'], ai: ['', 'S', 'R', '', '', '', '', 'S'], be: ['', '', '', 'R', 'R', '', '', 'R'], fe: ['', '', '', 'S', '', 'R', 'S', 'S'], ux: ['', '', '', '', '', 'S', 'R', ''] };

const ROAD = [
  { w: 1, items: [['w1a', b('فحص المستودع والعتاد', 'Inspect repository and hardware'), 'emb'], ['w1b', b('التحقق من توافق CSI', 'Validate CSI compatibility'), 'emb'], ['w1c', b('إعداد بيئات التطوير', 'Set up development environments'), 'all']] },
  { w: 2, items: [['w2a', b('التقاط عيّنات حقيقية', 'Capture real samples'), 'emb'], ['w2b', b('أول دفتر تحليل للذكاء الاصطناعي', 'First AI notebook'), 'ai'], ['w2c', b('واجهة برمجية وهمية', 'Mock API'), 'be'], ['w2d', b('نموذج أمامي أولي', 'Frontend prototype'), 'fe']] },
  { w: 3, items: [['w3a', b('تنفيذ وتقييم الكاشف الأساسي', 'Implement and evaluate the baseline detector'), 'ai'], ['w3b', b('تحسين جمع البيانات', 'Improve data collection'), 'emb'], ['w3c', b('توثيق حدود النموذج', 'Document model limitations'), 'ai']] },
  { w: 4, items: [['w4a', b('دمج الجمع الحي والذكاء الاصطناعي والواجهة وقاعدة البيانات واللوحة', 'Integrate live acquisition, AI, API, database and frontend'), 'all']] },
  { w: 5, items: [['w5a', b('اختبار تغيّر البيئة', 'Test environmental changes'), 'all'], ['w5b', b('اختبار الإنذارات الكاذبة', 'Test false alarms'), 'ai'], ['w5c', b('اختبار الانقطاعات وزمن الاستجابة', 'Test disconnections and latency'), 'be']] },
  { w: 6, items: [['w6a', b('إنهاء التوثيق', 'Finalize documentation'), 'all'], ['w6b', b('العرض التجريبي وتقرير التقييم', 'Demo and evaluation report'), 'all'], ['w6c', b('العرض التقديمي', 'Presentation'), 'all']] }
];
const teamName = id => id === 'all' ? OWN.all : (TEAMS.find(t => t.id === id) || {}).n;

const TESTS = [
  ['t1', b('غرفة هادئة', 'Quiet room'), b('لا إنذارات خلال فترة سكون محددة', 'No alarms during a defined still period')],
  ['t2', b('شخص يعبر مسار الاستشعار', 'Person walking across the sensing path'), b('اكتشاف الحركة وتسجيلها', 'Motion is detected and logged')],
  ['t3', b('مواضع حركة مختلفة', 'Different movement positions'), b('تغيّر الأداء عبر المواضع موثق', 'Performance across positions is documented')],
  ['t4', b('تغيير باب أو أثاث', 'Door or furniture changes'), b('أثر التغيير على الإنذارات الكاذبة', 'Impact of the change on false alarms')],
  ['t5', b('تداخل لاسلكي في الخلفية', 'Background wireless interference'), b('سلوك الكاشف تحت التداخل', 'Detector behavior under interference')],
  ['t6', b('فصل كابل USB', 'USB disconnection'), b('تظهر حالة «منقطع» ويُستأنف الجمع', 'A “disconnected” state appears and acquisition resumes')],
  ['t7', b('فشل الواجهة البرمجية', 'API failure'), b('لا فقدان صامت؛ أخطاء واضحة وإعادة محاولة', 'No silent loss; clear errors and retries')],
  ['t8', b('ثبات قاعدة البيانات', 'Database persistence'), b('الأحداث تبقى بعد إعادة التشغيل', 'Events survive a restart')],
  ['t9', b('إعادة اتصال اللوحة', 'Dashboard reconnection'), b('تعود اللوحة للتحديث بعد انقطاع', 'Dashboard resumes updating after an outage')],
  ['t10', b('تشغيل طويل', 'Long-running operation'), b('استقرار الذاكرة والزمن والدقة على مدى ساعات', 'Stability of memory, latency and accuracy over hours')]
];

const UI_STATES = [
  ['loader', b('تحميل', 'Loading'), b('هيكل عظمي ومؤشر؛ لا أرقام وهمية.', 'Skeleton and spinner; no placeholder numbers.')],
  ['circle-check', b('خامل / سكون', 'Idle / still'), b('أخضر مع نص «سكون»؛ آخر تحديث ظاهر.', 'Green with “Still” text; last update visible.')],
  ['activity', b('حركة مكتشفة', 'Motion detected'), b('أحمر مع نص وأيقونة، وليس اللون وحده.', 'Red with text and icon — not color alone.')],
  ['wifi-off', b('منقطع', 'Disconnected'), b('رمادي مع زر إعادة محاولة وآخر وقت اتصال.', 'Grey with a retry button and last-connected time.')],
  ['triangle-alert', b('خطأ', 'Error'), b('رسالة واضحة وسبب مختصر وإجراء مقترح.', 'Clear message, short cause and a suggested action.')],
  ['inbox', b('فارغ', 'Empty'), b('«لا أحداث بعد» مع شرح كيفية البدء.', '“No events yet” with guidance on how to start.')]
];

const TREE = { n: 'WaveSense-AI/', c: [
  { n: 'README.md' },
  { n: 'docs/', c: [{ n: 'architecture.md' }, { n: 'hardware-setup.md' }, { n: 'data-format.md' }, { n: 'api-contract.md' }, { n: 'testing-plan.md' }] },
  { n: 'firmware/', c: [{ n: 'transmitter/', dir: true }, { n: 'receiver/', dir: true }] },
  { n: 'data/', c: [{ n: 'samples/', dir: true }, { n: 'README.md' }] },
  { n: 'ai/', c: [{ n: 'notebooks/', dir: true }, { n: 'src/', dir: true }, { n: 'tests/', dir: true }, { n: 'requirements.txt' }] },
  { n: 'backend/', c: [{ n: 'app/', dir: true }, { n: 'tests/', dir: true }, { n: 'requirements.txt' }] },
  { n: 'frontend/', c: [{ n: 'index.html' }, { n: 'css/', dir: true }, { n: 'js/', dir: true }] },
  { n: 'ui-ux/', dir: true },
  { n: 'tests/', c: [{ n: 'integration/', dir: true }] }
] };

const SOURCES = [
  ['Espressif ESP-CSI', 'https://github.com/espressif/esp-csi', b('الأمثلة والوثائق الرسمية لاستخراج CSI — المرجع الأول لقرارات العتاد والبرنامج الثابت.', 'Official examples and documentation for obtaining CSI — the first reference for hardware and firmware decisions.')],
  ['ESP-IDF (GitHub)', 'https://github.com/espressif/esp-idf', b('شيفرة الإطار والإصدارات والشرائح المدعومة.', 'Framework source, releases and supported chips.')],
  ['ESP-IDF Docs', 'https://docs.espressif.com/projects/esp-idf/', b('أدلة البناء والتحميل ومرجع واجهات Wi-Fi.', 'Build/flash guides and Wi-Fi API reference.')],
  ['Chart.js', 'https://www.chartjs.org/docs/latest/', b('مخططات السلاسل الزمنية في لوحة العرض.', 'Time-series charts in the demo dashboard.')],
  ['Lucide', 'https://lucide.dev/guide/', b('أيقونات SVG مفتوحة المصدر.', 'Open-source SVG icons.')],
  ['Python', 'https://docs.python.org/3/', b('اللغة والمكتبة القياسية لسكربتات الجمع والمعالجة.', 'Language and standard library for acquisition/processing scripts.')],
  ['NumPy', 'https://numpy.org/doc/', b('حسابات المصفوفات ومثال التباين المنزلق.', 'Array computing and the sliding-variance example.')],
  ['pandas', 'https://pandas.pydata.org/docs/', b('تحليل التسجيلات الجدولية.', 'Analyzing tabular recordings.')],
  ['Flask', 'https://flask.palletsprojects.com/', b('خيار إطار للواجهة الخلفية.', 'Backend framework option.')],
  ['FastAPI', 'https://fastapi.tiangolo.com/', b('خيار إطار للواجهة الخلفية مع تحقق من الحمولة.', 'Backend framework option with payload validation.')],
  ['SQLite', 'https://www.sqlite.org/docs.html', b('تخزين الأحداث المحلي.', 'Local event storage.')],
  ['Figma', 'https://www.figma.com/', b('أداة تصميم نماذج الواجهة.', 'UI mockup design tool.')]
];

/* ==========================================================================
   Language / theme / navigation
   ========================================================================== */
const renderers = [];
function renderAll() { renderers.forEach(fn => { try { fn(); } catch (e) { console.error('render error', fn.name, e); } }); icons(); }

function applyLang() {
  const h = document.documentElement;
  h.lang = lang; h.dir = lang === 'ar' ? 'rtl' : 'ltr';
  $$('[data-aria-ar]').forEach(el => el.setAttribute('aria-label', lang === 'ar' ? el.dataset.ariaAr : el.dataset.ariaEn));
  document.title = lang === 'ar' ? 'WaveSense AI — كشف الحركة بـ Wi-Fi CSI | دراسة جدوى تفاعلية' : 'WaveSense AI — Wi-Fi CSI Motion Detection | Interactive Feasibility Study';
  renderAll();
}
function applyTheme() {
  document.documentElement.setAttribute('data-theme', theme);
  try { applyChartTheme(); } catch (e) { /* charts optional */ }
}

function renderNav() {
  $('#nav-list').innerHTML = SECTIONS.map(([id, ar, en]) => `<li><a href="#${id}" data-id="${id}">${esc(lang === 'ar' ? ar : en)}</a></li>`).join('');
}
renderers.push(renderNav);

function setupNav() {
  const btn = $('#menu-btn'), nav = $('#main-nav');
  btn.addEventListener('click', () => { const o = nav.classList.toggle('open'); btn.setAttribute('aria-expanded', String(o)); });
  nav.addEventListener('click', e => { if (e.target.closest('a')) { nav.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); } });
  $('#lang-btn').addEventListener('click', () => { lang = lang === 'ar' ? 'en' : 'ar'; store.set('lang', lang); applyLang(); });
  $('#theme-btn').addEventListener('click', () => { theme = theme === 'dark' ? 'light' : 'dark'; store.set('theme', theme); applyTheme(); });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        $$('#nav-list a').forEach(a => { a.classList.toggle('active', a.dataset.id === en.target.id); if (a.dataset.id === en.target.id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
      });
    }, { rootMargin: '-25% 0px -65% 0px' });
    SECTIONS.forEach(([id]) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }
}

/* Generic copy buttons for code blocks: <button data-copy="#id"> */
function setupCopy() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-copy]'); if (!btn) return;
    const src = $(btn.dataset.copy); if (src) copyText(src.textContent);
  });
}

/* ==========================================================================
   How CSI works + glossary + architecture
   ========================================================================== */
let howStep = 1;
function renderHow() {
  const wrap = $('#how-steps');
  wrap.innerHTML = HOW.map((s, i) => `<button type="button" class="step-btn" data-n="${i + 1}" aria-pressed="${howStep === i + 1}"><b>${i + 1}</b>${esc(L(s.t))}</button>`).join('');
  const s = HOW[howStep - 1];
  $('#how-detail').innerHTML = `<h3>${howStep}. ${esc(L(s.t))}</h3><p>${esc(L(s.d))}</p>`;
  $$('.hn').forEach(g => g.classList.toggle('on', +g.dataset.n === howStep));
}
renderers.push(renderHow);
function setupHow() {
  $('#how-steps').addEventListener('click', e => { const bt = e.target.closest('.step-btn'); if (!bt) return; howStep = +bt.dataset.n; renderHow(); });
  $('#how-prev').addEventListener('click', () => { howStep = howStep === 1 ? 7 : howStep - 1; renderHow(); });
  $('#how-next').addEventListener('click', () => { howStep = howStep === 7 ? 1 : howStep + 1; renderHow(); });
}

function renderGlossary() {
  $('#glossary').innerHTML = GLOSS.map(([t, d]) => `<details><summary>${esc(L(t))}</summary><p>${esc(L(d))}</p></details>`).join('');
}
renderers.push(renderGlossary);

let archSel = 0;
function renderArch() {
  $('#arch-flow').innerHTML = ARCH.map((a, i) => `<button type="button" class="node" data-i="${i}" aria-pressed="${archSel === i}"><i data-lucide="${a.icon}"></i>${esc(L(a.n))}</button>`).join('');
  const a = ARCH[archSel];
  $('#arch-detail').innerHTML = `<h3>${archSel + 1}. ${esc(L(a.n))}</h3><dl>
    <dt>${lang === 'ar' ? 'الغرض' : 'Purpose'}</dt><dd>${esc(L(a.p))}</dd>
    <dt>${lang === 'ar' ? 'المدخلات' : 'Inputs'}</dt><dd>${esc(L(a.i))}</dd>
    <dt>${lang === 'ar' ? 'المخرجات' : 'Outputs'}</dt><dd>${esc(L(a.o))}</dd>
    <dt>${lang === 'ar' ? 'الفريق المسؤول' : 'Responsible team'}</dt><dd>${esc(L(a.t))}</dd>
    <dt>${lang === 'ar' ? 'الاعتماديات' : 'Dependencies'}</dt><dd>${esc(L(a.d))}</dd></dl>`;
}
renderers.push(renderArch);
function setupArch() {
  $('#arch-flow').addEventListener('click', e => { const n = e.target.closest('.node'); if (!n) return; archSel = +n.dataset.i; renderArch(); icons(); });
}

/* ==========================================================================
   Risk registers (technical subset + full), status persisted
   ========================================================================== */
let riskStatus = store.get('risk', {});
function riskTable(list) {
  const rows = list.map(r => {
    const st = riskStatus[r.id] || 'open';
    return `<tr><td><b>${esc(L(r.t))}</b></td><td><span class="sev ${r.p}">${esc(T(r.p))}</span></td><td><span class="sev ${r.i}">${esc(T(r.i))}</span></td>
      <td>${esc(L(r.m))}</td><td>${esc(L(r.o))}</td>
      <td><select class="st-select" data-risk="${r.id}" aria-label="${esc(L(r.t))}">${['open', 'mitigating', 'closed'].map(s => `<option value="${s}"${s === st ? ' selected' : ''}>${esc(T(s))}</option>`).join('')}</select></td></tr>`;
  }).join('');
  return `<table class="tbl"><thead><tr><th>${lang === 'ar' ? 'الخطر' : 'Risk'}</th><th>${lang === 'ar' ? 'الاحتمال' : 'Probability'}</th><th>${lang === 'ar' ? 'الأثر / الشدة' : 'Impact / severity'}</th><th>${lang === 'ar' ? 'التخفيف' : 'Mitigation'}</th><th>${lang === 'ar' ? 'المسؤول' : 'Owner'}</th><th>${lang === 'ar' ? 'الحالة' : 'Status'}</th></tr></thead><tbody>${rows}</tbody></table>`;
}
function renderRisks() { $('#risk-tech').innerHTML = riskTable(RISKS.filter(r => r.tech)); $('#risk-all').innerHTML = riskTable(RISKS); }
renderers.push(renderRisks);
function setupRisks() {
  document.addEventListener('change', e => {
    const s = e.target.closest('[data-risk]'); if (!s) return;
    riskStatus[s.dataset.risk] = s.value; store.set('risk', riskStatus); renderRisks();
  });
}

/* ==========================================================================
   Bill of materials
   ========================================================================== */
let bom = store.get('bom', null);
const validBom = a => Array.isArray(a) && a.length && a.every(x => x && (typeof x.n === 'string' || (x.n && typeof x.n === 'object')) && Number.isFinite(x.q) && Number.isFinite(x.lo) && Number.isFinite(x.hi));
if (!validBom(bom)) bom = clone(BOM_DEFAULT);
const bomName = it => (typeof it.n === 'string' ? it.n : L(it.n));
function bomTotals() {
  const t = { gLo: 0, gHi: 0, aLo: 0, aHi: 0 };
  bom.forEach(it => { const lo = it.q * it.lo, hi = it.q * it.hi; t.gLo += lo; t.gHi += hi; if (it.av) { t.aLo += lo; t.aHi += hi; } });
  t.nLo = t.gLo - t.aLo; t.nHi = t.gHi - t.aHi; return t;
}
function updateBOM() {
  let bad = false;
  $$('#bom-body tr').forEach(tr => {
    const it = bom[+tr.dataset.i]; if (!it) return;
    $('[data-c="lo"]', tr).textContent = nf(it.q * it.lo); $('[data-c="hi"]', tr).textContent = nf(it.q * it.hi);
    const inv = it.lo > it.hi; if (inv) bad = true;
    $$('[data-f="lo"],[data-f="hi"]', tr).forEach(i => i.setAttribute('aria-invalid', String(inv)));
    tr.style.opacity = it.av ? '.6' : '';
  });
  const t = bomTotals();
  $('#bom-foot').innerHTML = `<tr><td colspan="5">${esc(T('gross'))}</td><td class="num">${nf(t.gLo)}</td><td class="num">${nf(t.gHi)}</td><td></td></tr>
    <tr><td colspan="5">${esc(T('avail'))}</td><td class="num">−${nf(t.aLo)}</td><td class="num">−${nf(t.aHi)}</td><td></td></tr>
    <tr><td colspan="5"><b>${esc(T('net'))} (EGP)</b></td><td class="num"><b>${nf(t.nLo)}</b></td><td class="num"><b>${nf(t.nHi)}</b></td><td></td></tr>
    ${bad ? `<tr><td colspan="8" style="color:var(--warn)">${esc(T('lowGtHigh'))}</td></tr>` : ''}`;
  if (typeof renderBudgetOut === 'function') renderBudgetOut();
}
function renderBOM() {
  const body = $('#bom-body'); body.innerHTML = '';
  bom.forEach((it, i) => {
    const tr = document.createElement('tr'); tr.dataset.i = i;
    tr.innerHTML = `<td><input type="text" maxlength="80" data-f="n" aria-label="${esc(T('item'))}" value="${esc(bomName(it))}"></td>
      <td class="num"><input type="number" min="0" max="9999" step="1" inputmode="numeric" data-f="q" aria-label="Qty" value="${it.q}" style="width:84px"></td>
      <td class="num"><input type="number" min="0" step="10" inputmode="decimal" data-f="lo" aria-label="Unit low" value="${it.lo}" style="width:104px"></td>
      <td class="num"><input type="number" min="0" step="10" inputmode="decimal" data-f="hi" aria-label="Unit high" value="${it.hi}" style="width:104px"></td>
      <td><input type="checkbox" data-f="av" aria-label="${esc(T('have'))}"${it.av ? ' checked' : ''}></td>
      <td class="num" data-c="lo"></td><td class="num" data-c="hi"></td>
      <td><button type="button" class="btn sm icon danger" data-del="${i}" aria-label="${esc(T('del'))}"><i data-lucide="trash-2"></i></button></td>`;
    body.appendChild(tr);
  });
  updateBOM();
}
renderers.push(renderBOM);
function bomCSV() {
  const t = bomTotals();
  const rows = [['Item', 'Quantity', 'Unit low (EGP)', 'Unit high (EGP)', 'Already available', 'Line low (EGP)', 'Line high (EGP)']];
  bom.forEach(it => rows.push([bomName(it), it.q, it.lo, it.hi, it.av ? 'yes' : 'no', it.q * it.lo, it.q * it.hi]));
  rows.push(['Gross total', '', '', '', '', t.gLo, t.gHi], ['Less: already available', '', '', '', '', -t.aLo, -t.aHi], ['Net to purchase', '', '', '', '', t.nLo, t.nHi]);
  rows.push(['NOTE: provisional planning estimates dated 2026-10-17; not vendor quotations. Confirm current prices before purchase.']);
  return toCSV(rows);
}
function exportBOM() { if (downloadFile('wavesense-bom.csv', bomCSV(), 'text/csv;charset=utf-8')) toast(T('csvDone')); }
function setupBOM() {
  const body = $('#bom-body');
  const onEdit = e => {
    const el = e.target, tr = el.closest('tr'); if (!tr) return;
    const it = bom[+tr.dataset.i], f = el.dataset.f; if (!it || !f) return;
    if (f === 'n') it.n = el.value.slice(0, 80);
    else if (f === 'av') it.av = el.checked;
    else {
      let v = parseFloat(el.value); const ok = Number.isFinite(v) && v >= 0;
      el.setAttribute('aria-invalid', String(!ok)); v = ok ? v : 0;
      if (f === 'q') v = Math.min(9999, Math.floor(v));
      it[f] = v;
    }
    updateBOM(); store.set('bom', bom);
  };
  body.addEventListener('input', onEdit); body.addEventListener('change', onEdit);
  body.addEventListener('click', e => {
    const d = e.target.closest('[data-del]'); if (!d) return;
    bom.splice(+d.dataset.del, 1); store.set('bom', bom); renderBOM(); icons();
  });
  $('#bom-add').addEventListener('click', () => { bom.push({ n: T('newItem'), q: 1, lo: 0, hi: 0, av: false }); store.set('bom', bom); renderBOM(); icons(); const rows = $$('#bom-body tr'); const last = rows[rows.length - 1]; if (last) $('input', last).focus(); });
  $('#bom-reset').addEventListener('click', () => { bom = clone(BOM_DEFAULT); store.set('bom', bom); renderBOM(); icons(); });
  $('#bom-csv').addEventListener('click', exportBOM);
  $('#ex-bom').addEventListener('click', exportBOM);
  $('#bom-print').addEventListener('click', () => window.print());
}

/* ==========================================================================
   Budget scenarios
   ========================================================================== */
let bud = store.get('bud', null);
if (!bud || typeof bud !== 'object' || !bud.lo || !bud.hi) bud = clone(BUD_DEFAULT);
if (!SCEN.some(s => s.id === bud.sel)) bud.sel = 'std';
function renderBudget() {
  $('#scen-radios').innerHTML = SCEN.map(s => `<label class="toggle"><input type="radio" name="scen" value="${s.id}"${bud.sel === s.id ? ' checked' : ''}><span>${esc(L(s.n))}${s.r ? ` <span class="muted small">(EGP ${s.r})</span>` : ''}</span></label>`).join('');
  $('#bud-lo').value = bud.lo[bud.sel]; $('#bud-hi').value = bud.hi[bud.sel];
  $('#bud-cont').value = bud.cont; $('#bud-ded').value = bud.ded; $('#bud-soft').value = bud.soft; $('#bud-labor').value = bud.labor; $('#bud-rec').value = bud.rec; $('#bud-months').value = bud.months;
  $('#bud-hint').textContent = bud.sel === 'bom' ? (lang === 'ar' ? 'يستخدم صافي جدول المواد (بعد استبعاد البنود المتوفرة)؛ لذلك يُفضَّل إبقاء خصم المعدات صفرًا لتفادي الازدواج.' : 'Uses the BOM net (after excluding available items), so keep the equipment deduction at 0 to avoid double counting.') : '';
  renderBudgetOut();
}
renderers.push(renderBudget);
function renderBudgetOut() {
  const out = $('#bud-out'); if (!out) return;
  const lo = bud.lo[bud.sel], hi = bud.hi[bud.sel], ded = bud.ded, pct = bud.cont / 100;
  const nLo = Math.max(0, lo - ded), nHi = Math.max(0, hi - ded);
  const cLo = nLo * pct, cHi = nHi * pct, ex = bud.soft + bud.labor;
  const oLo = nLo + cLo + ex, oHi = nHi + cHi + ex, rec = bud.rec * bud.months;
  const gLo = oLo + rec, gHi = oHi + rec;
  const row = (k, a, bb, strong) => `<tr><td>${strong ? '<b>' : ''}${esc(k)}${strong ? '</b>' : ''}</td><td class="num">${strong ? '<b>' : ''}${a}${strong ? '</b>' : ''}</td><td class="num">${strong ? '<b>' : ''}${bb}${strong ? '</b>' : ''}</td></tr>`;
  const A = lang === 'ar';
  const segs = [[nHi, 'var(--cyan)'], [cHi, 'var(--purple)'], [ex, 'var(--teal)'], [rec, 'var(--warn)']];
  const tot = segs.reduce((s, x) => s + x[0], 0) || 1;
  out.innerHTML = `<h3><i data-lucide="calculator"></i>${A ? 'النتائج (تقديرية)' : 'Results (estimates)'}</h3>
    ${lo > hi ? `<div class="note warn">${A ? 'الحد الأدنى أعلى من الأقصى.' : 'Minimum exceeds maximum.'}</div>` : ''}
    <div class="tbl-wrap"><table class="tbl" style="min-width:0"><thead><tr><th></th><th class="num">${esc(T('min'))}</th><th class="num">${esc(T('max'))}</th></tr></thead><tbody>
    ${row(A ? 'ميزانية السيناريو (عتاد)' : 'Scenario budget (hardware)', nf(lo), nf(hi))}
    ${row(A ? 'ناقص: معدات متوفرة' : 'Less: available equipment', '−' + nf(Math.min(ded, lo)), '−' + nf(Math.min(ded, hi)))}
    ${row(A ? 'صافي العتاد' : 'Net hardware', nf(nLo), nf(nHi))}
    ${row((A ? 'احتياطي طوارئ ' : 'Contingency ') + bud.cont + '%', nf(cLo), nf(cHi))}
    ${row(A ? 'برمجيات + عمالة (مرة واحدة)' : 'Software + labor (one-time)', nf(ex), nf(ex))}
    ${row(A ? 'إجمالي لمرة واحدة' : 'One-time total', nf(oLo), nf(oHi), true)}
    ${row(A ? `متكرر (${nf(bud.rec)} × ${bud.months} شهر)` : `Recurring (${nf(bud.rec)} × ${bud.months} mo)`, nf(rec), nf(rec))}
    ${row(A ? 'الإجمالي الكلي (EGP)' : 'Grand total (EGP)', nf(gLo), nf(gHi), true)}
    </tbody></table></div>
    <div class="stack" style="margin-top:.8rem" role="img" aria-label="${A ? 'توزيع الحد الأقصى' : 'Maximum split'}">${segs.map(s => `<i style="width:${(s[0] / tot * 100).toFixed(1)}%;background:${s[1]}"></i>`).join('')}</div>
    <p class="muted small" style="margin-top:.4rem">${A ? 'الشريط (للحد الأقصى): <b style="color:var(--cyan)">عتاد</b> · <b style="color:var(--purple)">طوارئ</b> · <b style="color:var(--teal)">برمجيات/عمالة</b> · <b style="color:var(--warn)">متكرر</b>. المصروفات المتكررة صفر ما لم تُدخلها.' : 'Bar (maximum): <b style="color:var(--cyan)">hardware</b> · <b style="color:var(--purple)">contingency</b> · <b style="color:var(--teal)">software/labor</b> · <b style="color:var(--warn)">recurring</b>. Recurring is zero unless you enter it.'}</p>`;
  icons();
}
function setupBudget() {
  $('#scen-radios').addEventListener('change', e => { if (e.target.name !== 'scen') return; bud.sel = e.target.value; store.set('bud', bud); renderBudget(); });
  const bind = (id, fn) => $(id).addEventListener('input', e => { fn(num(e.target.value, 0)); store.set('bud', bud); renderBudgetOut(); });
  bind('#bud-lo', v => { bud.lo[bud.sel] = v; }); bind('#bud-hi', v => { bud.hi[bud.sel] = v; });
  bind('#bud-cont', v => { bud.cont = Math.min(100, v); }); bind('#bud-ded', v => { bud.ded = v; });
  bind('#bud-soft', v => { bud.soft = v; }); bind('#bud-labor', v => { bud.labor = v; });
  bind('#bud-rec', v => { bud.rec = v; }); bind('#bud-months', v => { bud.months = Math.min(120, Math.floor(v)); });
  $('#bud-from-bom').addEventListener('click', () => { const t = bomTotals(); bud.sel = 'bom'; bud.lo.bom = t.nLo; bud.hi.bom = t.nHi; bud.ded = 0; store.set('bud', bud); renderBudget(); });
}

/* ==========================================================================
   Team cards, matrix, tasks
   ========================================================================== */
let taskDone = store.get('tasks', {});
function renderTeams() {
  const A = lang === 'ar';
  $('#teams').innerHTML = TEAMS.map(t => `<article class="card team-card wm">
    <h3><span><i data-lucide="${t.icon}"></i> ${esc(L(t.n))}</span><span class="chip">${t.count} ${A ? (t.count === 1 ? 'عضو' : 'أعضاء') : (t.count === 1 ? 'member' : 'members')}</span></h3>
    ${t.members.map((tasks, mi) => `<div class="member"><h4>${A ? 'عضو' : 'Member'} ${mi + 1}</h4>${tasks.map((tk, ti) => { const k = `${t.id}.${mi}.${ti}`, id = `tk-${t.id}-${mi}-${ti}`; return `<div class="task"><input type="checkbox" id="${id}" data-task="${k}"${taskDone[k] ? ' checked' : ''}><label for="${id}">${esc(L(tk))}</label></div>`; }).join('')}</div>`).join('')}
    <p class="small" style="margin-top:.8rem"><b>${A ? 'المخرجات:' : 'Deliverables:'}</b> ${t.deliv.map(d => esc(L(d))).join(' · ')}</p>
    <p class="small muted">${esc(L(t.dep))}</p>
    <button type="button" class="btn sm no-print" data-copy-team="${t.id}"><i data-lucide="copy"></i>${A ? 'نسخ مهام الفريق' : 'Copy team tasks'}</button></article>`).join('');
  const rows = TEAMS.map(t => `<tr><th scope="row" style="text-align:start">${esc(L(t.n))}</th>${MATRIX[t.id].map(c => `<td class="${c ? 'cell-' + c : ''}">${c}</td>`).join('')}</tr>`).join('');
  $('#matrix').innerHTML = `<table class="tbl matrix"><thead><tr><th></th>${MATRIX_COLS.map(c => `<th>${esc(L(c))}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
}
renderers.push(renderTeams);
function teamTasksText(t) {
  const A = lang === 'ar';
  let s = `## ${L(t.n)} (${t.count})\n`;
  t.members.forEach((tasks, mi) => { s += `\n${A ? 'عضو' : 'Member'} ${mi + 1}:\n` + tasks.map(x => `- [${taskDone[`${t.id}.${mi}.${tasks.indexOf(x)}`] ? 'x' : ' '}] ${L(x)}`).join('\n') + '\n'; });
  s += `\n${A ? 'المخرجات' : 'Deliverables'}: ${t.deliv.map(L).join('; ')}\n${L(t.dep)}\n`;
  return s;
}
const allTasksText = () => TEAMS.map(teamTasksText).join('\n');
function setupTeams() {
  document.addEventListener('change', e => { const c = e.target.closest('[data-task]'); if (!c) return; taskDone[c.dataset.task] = c.checked; store.set('tasks', taskDone); });
  document.addEventListener('click', e => { const bt = e.target.closest('[data-copy-team]'); if (!bt) return; const t = TEAMS.find(x => x.id === bt.dataset.copyTeam); if (t) copyText(teamTasksText(t)); });
  $('#ex-tasks-team').addEventListener('click', () => copyText(allTasksText()));
  $('#ex-tasks').addEventListener('click', () => copyText(allTasksText()));
  $('#tasks-reset').addEventListener('click', () => { taskDone = {}; store.set('tasks', taskDone); renderTeams(); icons(); });
}

/* ==========================================================================
   Live dashboard demo — SIMULATED DATA ONLY
   Algorithm: sliding-window variance vs user threshold (visualization
   placeholder, NOT a validated CSI detector).
   ========================================================================== */
const ROOMS = { room_01: { seed: 1701, noise: 0.6 }, room_02: { seed: 2202, noise: 0.9 }, room_03: { seed: 3303, noise: 1.25 } };
const DEMO_WIN = 20, DEMO_MAX = 120, DEMO_MS = 250, THR_DEFAULT = 2.0;
const D = { running: false, timer: null, tick: 0, rng: null, room: 'room_01', thr: THR_DEFAULT, forced: false, motion: false, above: 0, below: 0, samples: [], vars: [], labels: [], thrArr: [], events: [], last: null, curVar: null, started: false };
let chS = null, chV = null;

function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function gauss(r) { let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function winVar(arr) { const n = arr.length; const m = arr.reduce((s, x) => s + x, 0) / n; return arr.reduce((s, x) => s + (x - m) * (x - m), 0) / (n - 1); }

function demoReset() {
  demoPause();
  D.tick = 0; D.rng = mulberry32(ROOMS[D.room].seed); D.forced = false; D.motion = false; D.above = 0; D.below = 0; D.thr = THR_DEFAULT;
  D.samples.length = 0; D.vars.length = 0; D.labels.length = 0; D.thrArr.length = 0; D.events.length = 0; D.last = null; D.curVar = null; D.started = false;
  $('#demo-force').checked = false; $('#demo-thr').value = THR_DEFAULT;
  renderDemo(); updateCharts();
}
function demoStart() {
  if (D.running) return;
  if (!D.rng) D.rng = mulberry32(ROOMS[D.room].seed);
  D.running = true; D.started = true; D.timer = setInterval(demoTick, DEMO_MS); renderDemo();
}
function demoPause() { if (D.timer) clearInterval(D.timer); D.timer = null; D.running = false; renderDemo(); }
function demoTick() {
  const room = ROOMS[D.room], t = D.tick, g1 = gauss(D.rng), g2 = gauss(D.rng); /* always draw twice → reproducible */
  const scheduled = (t % 160) >= 50 && (t % 160) < 85;
  const moving = scheduled || D.forced;
  let v = 30 + 0.8 * Math.sin(t / 40) + g1 * room.noise;
  if (moving) v += 3.2 * Math.sin(t * 0.9) + g2 * 1.4;
  D.samples.push(+v.toFixed(3)); D.labels.push((t * DEMO_MS / 1000).toFixed(1)); D.thrArr.push(D.thr);
  let vr = null;
  if (D.samples.length >= DEMO_WIN) vr = +winVar(D.samples.slice(-DEMO_WIN)).toFixed(3);
  D.vars.push(vr); D.curVar = vr;
  if (vr != null) {
    if (vr > D.thr) { D.above++; D.below = 0; } else { D.below++; D.above = 0; }
    if (!D.motion && D.above >= 3) { D.motion = true; pushEvent('motion_started', t, vr); }
    else if (D.motion && D.below >= 5) { D.motion = false; pushEvent('motion_ended', t, vr); }
  }
  while (D.samples.length > DEMO_MAX) { D.samples.shift(); D.vars.shift(); D.labels.shift(); D.thrArr.shift(); }
  D.tick++; D.last = new Date();
  renderDemo(); updateCharts();
}
function pushEvent(type, idx, vr) {
  D.events.push({ ts: new Date().toISOString(), idx, room: D.room, type, v: vr, thr: D.thr, source: 'simulated_demo' });
  if (D.events.length > 500) D.events.shift();
}
function renderDemo() {
  if (!$('#demo-state')) return;
  const card = $('#demo-status');
  let cls = 'idle', txt = T('idleState');
  if (D.started) {
    if (D.curVar == null) txt = T('warmState');
    else if (D.motion) { cls = 'motion'; txt = T('motionState'); } else { cls = 'still'; txt = T('stillState'); }
  }
  card.className = 'status-card ' + cls; $('#demo-state').textContent = txt;
  $('#demo-conn').innerHTML = `<span class="dot ${D.running ? 'on' : ''}"></span> ${esc(D.running ? T('connActive') : (D.started ? T('connPaused') : T('connNone')))}`;
  $('#demo-last').textContent = D.last ? D.last.toLocaleTimeString('en-GB') : '—';
  $('#demo-sample').textContent = String(D.tick);
  $('#demo-var').textContent = D.curVar == null ? '—' : D.curVar.toFixed(2);
  $('#demo-thr-val').textContent = D.thr.toFixed(1);
  $('#demo-start').disabled = D.running; $('#demo-pause').disabled = !D.running;
  const tb = $('#demo-log'), ev = D.events.slice(-8).reverse();
  tb.innerHTML = ev.length ? ev.map(e => `<tr><td class="mono">${esc(e.ts.replace('T', ' ').replace(/\.\d+Z$/, ''))}</td><td>#${e.idx}</td><td class="mono">${esc(e.room)}</td><td>${esc(T(e.type === 'motion_started' ? 'evStart' : 'evEnd'))}</td><td class="num">${e.v.toFixed(2)}</td><td class="mono">${esc(e.source)}</td></tr>`).join('') : `<tr><td colspan="6" class="muted">${esc(T('noEvents'))}</td></tr>`;
}
renderers.push(renderDemo);

function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#22D3EE'; }
function chartOpts(yTitle) {
  const txt = cssVar('--muted'), grid = cssVar('--grid-line');
  return { responsive: true, maintainAspectRatio: false, animation: false, interaction: { mode: 'index', intersect: false },
    plugins: { legend: { labels: { color: txt, boxWidth: 12 } }, tooltip: { enabled: true } },
    scales: { x: { ticks: { color: txt, maxTicksLimit: 8 }, grid: { color: grid }, title: { display: true, text: T('timeX'), color: txt } },
      y: { ticks: { color: txt }, grid: { color: grid }, title: { display: true, text: yTitle, color: txt } } } };
}
function initCharts() {
  const cv1 = $('#chart-signal'), cv2 = $('#chart-var');
  if (!window.Chart || !cv1 || !cv2) { if (cv1) cv1.style.display = 'none'; if (cv2) cv2.closest('.chart-box').style.display = 'none'; const fb = $('#chart-fallback'); if (fb) fb.style.display = 'block'; return; }
  try {
    chS = new Chart(cv1, { type: 'line', data: { labels: D.labels, datasets: [{ label: T('signalL'), data: D.samples, borderColor: cssVar('--cyan'), backgroundColor: 'transparent', borderWidth: 2, pointRadius: 0, tension: .25 }] }, options: chartOpts(T('signalY')) });
    chV = new Chart(cv2, { type: 'line', data: { labels: D.labels, datasets: [
      { label: T('varL'), data: D.vars, borderColor: cssVar('--purple'), backgroundColor: 'transparent', borderWidth: 2, pointRadius: 0, tension: .2, spanGaps: false },
      { label: T('thrL'), data: D.thrArr, borderColor: cssVar('--warn'), borderDash: [6, 4], borderWidth: 1.5, pointRadius: 0 }] }, options: chartOpts(T('varY')) });
  } catch (e) { console.error('Chart init failed', e); chS = chV = null; }
}
function updateCharts() { if (chS) chS.update('none'); if (chV) chV.update('none'); }
function applyChartTheme() {
  [chS, chV].forEach((c, i) => {
    if (!c) return;
    const txt = cssVar('--muted'), grid = cssVar('--grid-line');
    c.options.plugins.legend.labels.color = txt;
    ['x', 'y'].forEach(a => { c.options.scales[a].ticks.color = txt; c.options.scales[a].grid.color = grid; c.options.scales[a].title.color = txt; });
    c.data.datasets[0].borderColor = i === 0 ? cssVar('--cyan') : cssVar('--purple');
    if (c.data.datasets[1]) c.data.datasets[1].borderColor = cssVar('--warn');
    c.update('none');
  });
}
function relabelCharts() {
  if (!chS || !chV) return;
  chS.data.datasets[0].label = T('signalL'); chV.data.datasets[0].label = T('varL'); chV.data.datasets[1].label = T('thrL');
  chS.options.scales.x.title.text = T('timeX'); chV.options.scales.x.title.text = T('timeX');
  chS.options.scales.y.title.text = T('signalY'); chV.options.scales.y.title.text = T('varY');
  updateCharts();
}
renderers.push(relabelCharts);
function eventsCSV() {
  const rows = [['timestamp_utc', 'sample_index', 'room_id', 'event', 'window_variance', 'threshold', 'source']];
  D.events.forEach(e => rows.push([e.ts, e.idx, e.room, e.type, e.v, e.thr, e.source]));
  rows.push(['NOTE: simulated_demo data — not real sensor readings.']);
  return toCSV(rows);
}
function exportEvents() { if (!D.events.length) { toast(T('noEventsToast')); return; } if (downloadFile('wavesense-demo-events.csv', eventsCSV(), 'text/csv;charset=utf-8')) toast(T('csvDone')); }
function setupDemo() {
  $('#demo-start').addEventListener('click', demoStart);
  $('#demo-pause').addEventListener('click', demoPause);
  $('#demo-reset').addEventListener('click', demoReset);
  $('#demo-room').addEventListener('change', e => { D.room = ROOMS[e.target.value] ? e.target.value : 'room_01'; demoReset(); toast(T('roomReset')); });
  $('#demo-thr').addEventListener('input', e => { D.thr = Math.min(10, Math.max(0.2, num(e.target.value, THR_DEFAULT))); D.thrArr.fill(D.thr); renderDemo(); updateCharts(); });
  $('#demo-force').addEventListener('change', e => { D.forced = e.target.checked; });
  $('#demo-csv').addEventListener('click', exportEvents);
  $('#ex-events').addEventListener('click', exportEvents);
  D.rng = mulberry32(ROOMS[D.room].seed);
  initCharts(); renderDemo();
}

/* ==========================================================================
   Roadmap (Gantt) with persisted statuses
   ========================================================================== */
const ST = ['todo', 'progress', 'done', 'blocked'];
let roadSt = store.get('road', {});
function renderRoad() {
  const A = lang === 'ar'; let total = 0, done = 0;
  let h = `<div class="gh" style="justify-content:start">${A ? 'المهمة / الفريق' : 'Task / team'}</div>${[1, 2, 3, 4, 5, 6].map(w => `<div class="gh">${A ? 'أ' : 'W'}${w}</div>`).join('')}<div class="gh">${A ? 'الحالة' : 'Status'}</div>`;
  ROAD.forEach(wk => {
    const d = wk.items.filter(it => roadSt[it[0]] === 'done').length; total += wk.items.length; done += d;
    h += `<div class="gh" style="grid-column:1/-1;justify-content:space-between;background:rgba(34,211,238,.08)"><span>${A ? 'الأسبوع' : 'Week'} ${wk.w}</span><span>${d}/${wk.items.length}</span></div>`;
    wk.items.forEach(([id, name, team]) => {
      const st = ST.includes(roadSt[id]) ? roadSt[id] : 'todo';
      h += `<div><span>${esc(L(name))}<br><span class="muted small">${esc(L(teamName(team)))}</span></span></div>`;
      for (let w = 1; w <= 6; w++) h += `<div class="bar-cell">${w === wk.w ? `<span class="gbar ${st}" title="${esc(T(st))}"></span>` : ''}</div>`;
      h += `<div><select class="st-select" data-road="${id}" aria-label="${esc(L(name))}">${ST.map(s => `<option value="${s}"${s === st ? ' selected' : ''}>${esc(T(s))}</option>`).join('')}</select></div>`;
    });
  });
  $('#gantt').innerHTML = h;
  const pct = total ? Math.round(done / total * 100) : 0;
  $('#road-pct').textContent = pct + '%'; $('#road-fill').style.width = pct + '%'; $('#road-bar').setAttribute('aria-valuenow', String(pct));
}
renderers.push(renderRoad);
function setupRoad() {
  document.addEventListener('change', e => { const s = e.target.closest('[data-road]'); if (!s) return; roadSt[s.dataset.road] = s.value; store.set('road', roadSt); renderRoad(); });
  $('#road-reset').addEventListener('click', () => { roadSt = {}; store.set('road', roadSt); renderRoad(); });
}

/* ==========================================================================
   Testing checklist + metrics from user-supplied data
   ========================================================================== */
let testSt = store.get('tests', {});
function renderTests() {
  $('#tests').innerHTML = TESTS.map(([id, n, v], i) => { const st = testSt[id] || 'pending'; return `<tr><td>${i + 1}</td><td><b>${esc(L(n))}</b></td><td>${esc(L(v))}</td><td><select class="st-select" data-test="${id}" aria-label="${esc(L(n))}">${['pending', 'pass', 'fail'].map(s => `<option value="${s}"${s === st ? ' selected' : ''}>${esc(T(s))}</option>`).join('')}</select></td></tr>`; }).join('');
}
renderers.push(renderTests);
function renderMetrics() {
  const A = lang === 'ar', g = id => optNum($(id));
  const tp = g('#m-tp'), fn = g('#m-fn'), fp = g('#m-fp'), tn = g('#m-tn'), fa = g('#m-fa'), hrs = g('#m-hours'), lat = g('#m-lat');
  const pc = x => (x * 100).toFixed(1) + '%';
  const verdict = ok => `<span class="sev ${ok ? 'Low' : 'High'}">${ok ? (A ? 'الهدف محقق على بياناتك' : 'goal met on your data') : (A ? 'الهدف غير محقق' : 'goal not met')}</span>`;
  const rows = [];
  if (tp != null && fn != null && tp + fn > 0) { const r = tp / (tp + fn); rows.push([A ? 'Recall (الاستدعاء)' : 'Recall', pc(r), `${A ? 'الهدف' : 'Goal'} ≥ 90% → ${verdict(r >= 0.9)}`]); }
  if (tp != null && fp != null && tp + fp > 0) rows.push(['Precision', pc(tp / (tp + fp)), '']);
  if (fp != null && tn != null && fp + tn > 0) { const r = fp / (fp + tn); rows.push([A ? 'معدل الإيجابيات الكاذبة (نوافذ)' : 'False-positive window rate', pc(r), `${A ? 'الهدف' : 'Goal'} &lt; 5% → ${verdict(r < 0.05)}`]); }
  if (fa != null && hrs != null && hrs > 0) rows.push([A ? 'إنذارات كاذبة / ساعة' : 'False alarms per hour', (fa / hrs).toFixed(2), A ? 'مقياس مستقل عن معدل النوافذ' : 'distinct from the window-level rate']);
  if (lat != null) rows.push([A ? 'زمن التحديث المقاس' : 'Measured update latency', lat.toFixed(2) + ' s', `${A ? 'الهدف' : 'Goal'} ≤ 2 s → ${verdict(lat <= 2)}`]);
  $('#m-out').innerHTML = `<h3><i data-lucide="bar-chart-3"></i>${A ? 'المقاييس من أرقامك' : 'Metrics from your numbers'}</h3>` + (rows.length ? `<div class="tbl-wrap"><table class="tbl" style="min-width:0"><tbody>${rows.map(r => `<tr><td>${r[0]}</td><td class="num"><b>${r[1]}</b></td><td>${r[2]}</td></tr>`).join('')}</tbody></table></div>` : `<p class="muted">${A ? 'لا توجد نتائج — أدخل أعداد اختبار فعلية. لا تُعرض أي قيم افتراضية.' : 'No results — enter actual test counts. No default values are shown.'}</p>`) +
    `<p class="muted small">${A ? 'تُقارَن الأرقام التي أدخلتها فقط بالأهداف؛ صلاحية بروتوكول الاختبار مسؤوليتك.' : 'Only the numbers you entered are compared with the goals; the validity of the test protocol is your responsibility.'}</p>`;
  icons();
}
renderers.push(renderMetrics);
function setupTests() {
  document.addEventListener('change', e => { const s = e.target.closest('[data-test]'); if (!s) return; testSt[s.dataset.test] = s.value; store.set('tests', testSt); });
  ['#m-tp', '#m-fn', '#m-fp', '#m-tn', '#m-fa', '#m-hours', '#m-lat'].forEach(id => $(id).addEventListener('input', renderMetrics));
}

/* ==========================================================================
   Commercial assumptions calculator (empty by default, no invented numbers)
   ========================================================================== */
function renderCommercial() {
  const A = lang === 'ar', g = id => optNum($(id));
  const u = g('#c-units'), p = g('#c-price'), c = g('#c-cost'), s = g('#c-subs'), f = g('#c-fee'), h = g('#c-host');
  const rows = [];
  if (u != null && p != null) rows.push([A ? 'إيرادات لمرة واحدة' : 'One-time revenue', egp(u * p)]);
  if (u != null && c != null) rows.push([A ? 'تكلفة لمرة واحدة' : 'One-time cost', egp(u * c)]);
  if (u != null && p != null && c != null) rows.push([A ? 'هامش إجمالي لمرة واحدة' : 'One-time gross margin', egp(u * (p - c))]);
  if (s != null && f != null) rows.push([A ? 'إيراد اشتراكات شهري' : 'Monthly subscription revenue', egp(s * f)]);
  if (s != null && f != null) rows.push([A ? 'صافي شهري بعد الاستضافة' : 'Monthly net after hosting', egp(s * f - (h || 0))]);
  $('#c-out').innerHTML = `<h3><i data-lucide="calculator"></i>${A ? 'نتائج الافتراضات' : 'Assumption results'}</h3>` + (rows.length ? `<div class="tbl-wrap"><table class="tbl" style="min-width:0"><tbody>${rows.map(r => `<tr><td>${r[0]}</td><td class="num"><b>${r[1]}</b></td></tr>`).join('')}</tbody></table></div>` : `<p class="muted">—</p>`) +
    `<p class="muted small">${A ? 'هذه حسابات حسابية من افتراضاتك وليست توقعات أو أدلة طلب.' : 'These are arithmetic results from your assumptions — not forecasts or evidence of demand.'}</p>`;
  icons();
}
renderers.push(renderCommercial);
function setupCommercial() { ['#c-units', '#c-price', '#c-cost', '#c-subs', '#c-fee', '#c-host'].forEach(id => $(id).addEventListener('input', renderCommercial)); }

/* ==========================================================================
   UI states, repo tree, sources
   ========================================================================== */
function renderStates() { $('#states').innerHTML = UI_STATES.map(([ic, n, d]) => `<div><b><i data-lucide="${ic}"></i>${esc(L(n))}</b><span class="muted small">${esc(L(d))}</span></div>`).join(''); }
renderers.push(renderStates);

function treeNode(n) {
  if (n.c) return `<details open><summary>📁 ${esc(n.n)}</summary><div class="children">${n.c.map(treeNode).join('')}</div></details>`;
  return `<div class="file">${n.dir ? '📁' : '📄'} ${esc(n.n)}</div>`;
}
function treeText(n, prefix = '', last = true, root = true) {
  let s = root ? n.n + '\n' : prefix + (last ? '└── ' : '├── ') + n.n + '\n';
  if (n.c) n.c.forEach((c, i) => { s += treeText(c, root ? '' : prefix + (last ? '    ' : '│   '), i === n.c.length - 1, false); });
  return s;
}
function renderTree() { $('#tree').innerHTML = treeNode(TREE); }
renderers.push(renderTree);
function setupTree() {
  $('#tree-open').addEventListener('click', () => $$('#tree details').forEach(d => { d.open = true; }));
  $('#tree-close').addEventListener('click', () => $$('#tree details').forEach((d, i) => { d.open = i === 0; }));
  $('#tree-copy').addEventListener('click', () => copyText(treeText(TREE)));
}

function renderSources() {
  const A = lang === 'ar';
  $('#sources-list').innerHTML = `<table class="tbl"><thead><tr><th>${A ? 'المصدر' : 'Source'}</th><th>${A ? 'الرابط' : 'Link'}</th><th>${A ? 'ما الذي يدعمه' : 'What it supports'}</th></tr></thead><tbody>${SOURCES.map(([n, u, d]) => `<tr><td><b>${esc(n)}</b></td><td dir="ltr" style="text-align:left"><a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(u)}</a></td><td>${esc(L(d))}</td></tr>`).join('')}</tbody></table>`;
}
renderers.push(renderSources);

/* ==========================================================================
   Export: summary, Markdown docs, print
   ========================================================================== */
function summaryText() {
  return lang === 'ar'
    ? `WaveSense AI — كشف الحركة بـ Wi-Fi CSI\n"استشعر ما لا تراه."\n\nنموذج أولي لتمييز الحركة عن السكون النسبي في بيئة اختبار مضبوطة باستخدام لوحتي ESP32 متوافقتين وقياسات CSI ومعالجة بايثون وخوارزمية ذكاء اصطناعي وواجهة خلفية وقاعدة بيانات ولوحة تحكم. لا يحدد هوية الأشخاص ولا يعدّهم ولا يحدد مواقعهم.\nالفريق: 12 عضوًا (4 مدمجة، 2 ذكاء اصطناعي، 3 خلفية، 2 أمامية، 1 UI/UX). الجدول: ستة أسابيع (هدف لا ضمان).\nتنبيه: لوحة العرض تستخدم بيانات محاكاة ولا توجد نتائج مقاسة بعد.\n— Designed & Developed by GARHI`
    : `WaveSense AI — Wi-Fi CSI-Based Motion Detection\n"Sense the Invisible."\n\nA prototype to distinguish motion from relative stillness in a controlled test environment using two compatible ESP32 boards, CSI measurements, Python processing, an AI-based algorithm, a backend API, a database and a dashboard. It does not identify, count or locate people.\nTeam: 12 members (4 embedded, 2 AI, 3 backend, 2 frontend, 1 UI/UX). Schedule: six weeks (a target, not a guarantee).\nNotice: the demo dashboard uses simulated data and no measured results exist yet.\n— Designed & Developed by GARHI`;
}
function buildMarkdown() {
  const A = lang === 'ar', t = bomTotals();
  let m = `# WaveSense AI — ${A ? 'وثائق المشروع' : 'Project Documentation'}\n\n> ${A ? 'استشعر ما لا تراه.' : 'Sense the Invisible.'}  \n> Designed & Developed by GARHI\n\n`;
  m += `> **${A ? 'تنبيه' : 'Notice'}:** ${A ? 'بيانات لوحة العرض محاكاة. لا توجد نتائج مقاسة. الأهداف أهداف وليست نتائج محققة.' : 'Demo dashboard data is simulated. No measured results exist. Targets are goals, not achieved results.'}\n\n`;
  m += `## ${A ? 'الملخص' : 'Summary'}\n\n${summaryText().split('\n').slice(2, 5).join('\n')}\n\n`;
  m += `## ${A ? 'المعمارية' : 'Architecture'}\n\n${ARCH.map((a, i) => `${i + 1}. **${L(a.n)}** — ${L(a.p)} (${A ? 'الفريق' : 'Team'}: ${L(a.t)})`).join('\n')}\n\n`;
  m += `## ${A ? 'الفريق والمهام' : 'Team and Tasks'}\n\n${allTasksText()}\n`;
  m += `## ${A ? 'خارطة الطريق (هدف)' : 'Roadmap (target)'}\n\n${ROAD.map(w => `**${A ? 'الأسبوع' : 'Week'} ${w.w}**\n` + w.items.map(it => `- [${roadSt[it[0]] === 'done' ? 'x' : ' '}] ${L(it[1])} (${T(ST.includes(roadSt[it[0]]) ? roadSt[it[0]] : 'todo')})`).join('\n')).join('\n\n')}\n\n`;
  m += `## ${A ? 'جدول المواد (تقديرات تخطيطية بتاريخ 2026-10-17، ليست عروض أسعار)' : 'Bill of Materials (planning estimates dated 2026-10-17, not quotations)'}\n\n| ${A ? 'البند' : 'Item'} | Qty | Unit low | Unit high | ${A ? 'متوفر' : 'Have'} |\n|---|---:|---:|---:|---|\n${bom.map(it => `| ${String(bomName(it)).replace(/\|/g, '/')} | ${it.q} | ${it.lo} | ${it.hi} | ${it.av ? '✓' : ''} |`).join('\n')}\n\n${A ? 'الصافي' : 'Net'}: EGP ${nf(t.nLo)} – ${nf(t.nHi)}\n\n`;
  m += `## API\n\n| Method | Path |\n|---|---|\n| POST | /api/events |\n| GET | /api/status |\n| GET | /api/events |\n| GET | /api/health |\n\n\`\`\`json\n{\n  "room_id": "room_01",\n  "motion_detected": true,\n  "confidence": 0.87,\n  "timestamp": "2026-10-17T14:00:00Z",\n  "source": "simulated_demo"\n}\n\`\`\`\n${A ? 'القيم توضيحية وليست نتائج مقاسة.' : 'Illustrative values, not measured results.'}\n\n`;
  m += `## ${A ? 'أهداف الاختبار (أهداف داخلية)' : 'Test Goals (internal goals)'}\n\n- Recall ≥ 90% (${A ? 'بروتوكول مضبوط' : 'defined controlled protocol'})\n- ${A ? 'معدل الإيجابيات الكاذبة (نوافذ) < 5%' : 'False-positive window rate < 5%'}\n- ${A ? 'زمن التحديث ≤ 2 ث' : 'Update latency ≤ 2 s'}\n\n`;
  m += `## ${A ? 'المخاطر' : 'Risks'}\n\n${RISKS.map(r => `- **${L(r.t)}** — ${T(r.p)}/${T(r.i)} — ${L(r.m)} (${L(r.o)}; ${T(riskStatus[r.id] || 'open')})`).join('\n')}\n\n`;
  m += `## ${A ? 'هيكل المستودع المقترح' : 'Proposed Repository Structure'}\n\n\`\`\`\n${treeText(TREE)}\`\`\`\n${A ? 'يجب فحص المستودع الفعلي قبل الادعاء بوجود هذه المجلدات.' : 'Inspect the actual repository before claiming these folders exist.'}\n\n`;
  m += `## ${A ? 'المصادر' : 'Sources'}\n\n${SOURCES.map(s => `- [${s[0]}](${s[1]}) — ${L(s[2])}`).join('\n')}\n`;
  return m;
}
function setupExport() {
  $('#ex-print').addEventListener('click', () => window.print());
  $('#ex-summary').addEventListener('click', () => copyText(summaryText()));
  document.addEventListener('click', e => { if (e.target.closest('[data-action="copy-summary"]')) copyText(summaryText()); });
  $('#ex-md').addEventListener('click', () => { if (downloadFile('WaveSense-AI-documentation.md', buildMarkdown(), 'text/markdown;charset=utf-8')) toast(T('mdDone')); });
  /* Print: expand all <details>, restore afterwards */
  let saved = [];
  window.addEventListener('beforeprint', () => { saved = $$('details').map(d => [d, d.open]); saved.forEach(([d]) => { d.open = true; }); });
  window.addEventListener('afterprint', () => { saved.forEach(([d, o]) => { d.open = o; }); saved = []; });
}

/* ==========================================================================
   Init
   ========================================================================== */
function init() {
  applyTheme();
  setupNav(); setupCopy(); setupHow(); setupArch(); setupRisks(); setupBOM(); setupBudget(); setupTeams();
  setupDemo(); setupRoad(); setupTests(); setupCommercial(); setupTree(); setupExport();
  applyLang();
  /* Make the in-page language state discoverable for debugging/tests only (read-only snapshot). */
  window.__wsai = Object.freeze({ get lang() { return lang; }, bomTotals, demo: D });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
