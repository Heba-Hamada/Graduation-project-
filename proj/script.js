/* ---------- Tabs ---------- */
const tabs = document.querySelectorAll('.tab');
const fileTab = document.getElementById('fileTab');
const urlTab = document.getElementById('urlTab');
let mode = 'file';
tabs.forEach(t=>t.addEventListener('click',()=>{
  tabs.forEach(x=>x.classList.remove('active'));
  t.classList.add('active');
  mode = t.dataset.tab;
  fileTab.classList.toggle('hidden', mode!=='file');
  urlTab.classList.toggle('hidden', mode!=='url');
}));

/* ---------- File picker ---------- */
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileNameEl = document.getElementById('fileName');
let chosenFile = null;
dropZone.addEventListener('click',()=>fileInput.click());
fileInput.addEventListener('change',e=>{
  chosenFile = e.target.files[0];
  if(chosenFile) fileNameEl.textContent = `Selected: ${chosenFile.name} (${(chosenFile.size/1024).toFixed(1)} KB)`;
});
['dragover','dragenter'].forEach(ev=>dropZone.addEventListener(ev,e=>{e.preventDefault();dropZone.classList.add('drag')}));
['dragleave','drop'].forEach(ev=>dropZone.addEventListener(ev,e=>{e.preventDefault();dropZone.classList.remove('drag')}));
dropZone.addEventListener('drop',e=>{
  chosenFile = e.dataTransfer.files[0];
  if(chosenFile){fileInput.files = e.dataTransfer.files; fileNameEl.textContent = `Selected: ${chosenFile.name} (${(chosenFile.size/1024).toFixed(1)} KB)`;}
});

/* ---------- Analyze flow ---------- */
const heroSection = document.getElementById('heroSection');
const loadingSection = document.getElementById('loadingSection');
const reportSection = document.getElementById('reportSection');
const analyzeBtn = document.getElementById('analyzeBtn');
const urlInput = document.getElementById('urlInput');
const steps = document.querySelectorAll('.step');
const progressBar = document.getElementById('progressBar');
const chatBtn = document.getElementById('chatBtn');

analyzeBtn.addEventListener('click', startAnalysis);

function startAnalysis(){
  let target = '';
  if(mode==='file'){
    if(!chosenFile){alert('Please choose a file to analyze.');return;}
    target = chosenFile.name;
  } else {
    const u = urlInput.value.trim();
    if(!u){alert('Please paste a URL to analyze.');return;}
    target = u;
  }
  heroSection.classList.add('hidden');
  reportSection.classList.add('hidden');
  loadingSection.classList.remove('hidden');
  window.scrollTo({top:0,behavior:'smooth'});

  steps.forEach(s=>{s.classList.remove('active','done');s.querySelector('.ic').innerHTML = s.querySelector('.ic').dataset.orig || s.querySelector('.ic').innerHTML;});
  progressBar.style.width = '0';

  const total = steps.length;
  let i = 0;
  const tick = () => {
    if(i>0){
      steps[i-1].classList.remove('active');
      steps[i-1].classList.add('done');
      steps[i-1].querySelector('.ic').innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    }
    if(i<total){
      steps[i].classList.add('active');
      steps[i].querySelector('.ic').innerHTML = '<div class="spinner"></div>';
      progressBar.style.width = `${((i+1)/total)*100}%`;
      i++;
      setTimeout(tick, 900 + Math.random()*400);
    } else {
      setTimeout(()=>showReport(target), 400);
    }
  };
  tick();
}

/* ---------- Report ---------- */
function classify(score){
  if(score < 35) return {label:'Benign', cls:'benign'};
  if(score < 70) return {label:'Suspicious', cls:'suspicious'};
  return {label:'Malicious', cls:'malicious'};
}
function pickScore(target){
  // deterministic-ish pseudo-random from string
  let h = 0;
  for(const c of target) h = (h*31 + c.charCodeAt(0)) >>> 0;
  return 20 + (h % 75);
}
function showReport(target){
  loadingSection.classList.add('hidden');
  reportSection.classList.remove('hidden');

  const score = pickScore(target);
  const cls = classify(score);

  document.getElementById('targetLabel').textContent = target;
  const badge = document.getElementById('verdictBadge');
  const iconMap = {
    benign: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    suspicious: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    malicious: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
  };
  badge.innerHTML = `<span class="badge ${cls.cls}">${iconMap[cls.cls]} ${cls.label}</span>`;

  // ring
  const circ = 2 * Math.PI * 52;
  const ring = document.getElementById('ringPath');
  ring.style.strokeDashoffset = circ;
  setTimeout(()=>{ ring.style.transition='stroke-dashoffset 1.2s ease'; ring.style.strokeDashoffset = circ - (circ * score/100); },50);
  // count up
  const scoreEl = document.getElementById('scoreVal');
  let n=0; const target_n = score;
  const inc = Math.max(1, Math.round(target_n/40));
  const iv = setInterval(()=>{n+=inc; if(n>=target_n){n=target_n;clearInterval(iv);} scoreEl.textContent=n;},25);

  // info card
  const infoTitle = document.getElementById('infoTitle');
  const infoBody = document.getElementById('infoBody');
  if(mode==='file'){
    infoTitle.textContent = 'File Information';
    const hash = fakeHash(target+score);
    infoBody.innerHTML = `
      <div class="kv"><span>Name</span><span>${escapeHtml(chosenFile.name)}</span></div>
      <div class="kv"><span>Size</span><span>${(chosenFile.size/1024).toFixed(2)} KB</span></div>
      <div class="kv"><span>Type</span><span>${chosenFile.type||'unknown'}</span></div>
      <div class="kv"><span>SHA-256</span><span>${hash.slice(0,32)}…</span></div>`;
  } else {
    infoTitle.textContent = 'URL Information';
    let host=''; try{ host = new URL(target).hostname; }catch{ host=target; }
    infoBody.innerHTML = `
      <div class="kv"><span>URL</span><span>${escapeHtml(target)}</span></div>
      <div class="kv"><span>Domain</span><span>${escapeHtml(host)}</span></div>
      <div class="kv"><span>Protocol</span><span>${target.startsWith('https')?'HTTPS':'HTTP'}</span></div>
      <div class="kv"><span>Reputation</span><span>${score<35?'Trusted':score<70?'Unknown':'Blacklisted'}</span></div>`;
  }

  // signals
  const signalsBody = document.getElementById('signalsBody');
  const signals = buildSignals(score, mode);
  signalsBody.innerHTML = signals.map(s=>`<div class="kv"><span>${s.k}</span><span>${s.v}</span></div>`).join('');

  // ai explanation + recs
  document.getElementById('aiExplain').textContent = buildExplanation(cls.label, mode, target, score);
  document.getElementById('recList').innerHTML = buildRecs(cls.label, mode).map(r=>`
    <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span>${r}</span></li>`).join('');

  // store for chat
  window.__report = {target, score, classification: cls.label, mode};

  // reveal chat button
  setTimeout(()=>{
    chatBtn.classList.add('show');
    if(!window.__chatGreeted){
      window.__chatGreeted = true;
      // queue greeting on first open
    }
  }, 600);
}

function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function fakeHash(seed){
  const chars='0123456789abcdef'; let h='';
  let n=0; for(const c of seed) n = (n*131 + c.charCodeAt(0)) >>> 0;
  for(let i=0;i<64;i++){ n = (n*1664525 + 1013904223) >>> 0; h += chars[n & 15]; }
  return h;
}
function buildSignals(score, mode){
  const high = score>=70, mid = score>=35;
  if(mode==='file'){
    return [
      {k:'Suspicious imports', v: high?'12 detected':mid?'4 detected':'0 detected'},
      {k:'Entropy', v: high?'7.92 (packed)':mid?'6.41':'4.12'},
      {k:'Obfuscation', v: high?'Yes':mid?'Partial':'No'},
      {k:'Heuristic match', v: high?'Trojan.Generic':mid?'PUA.Adware':'None'},
    ];
  }
  return [
    {k:'Domain age', v: high?'2 days':mid?'4 months':'6 years'},
    {k:'SSL valid', v: high?'No':'Yes'},
    {k:'Phishing keywords', v: high?'7 matches':mid?'2 matches':'0 matches'},
    {k:'Brand impersonation', v: high?'Likely':mid?'Possible':'None'},
  ];
}
function buildExplanation(label, mode, target, score){
  if(label==='Malicious'){
    return mode==='file'
      ? `The submitted file shows multiple high-risk traits: a packed payload with high entropy, obfuscated control flow, and imports commonly used by trojans (e.g. process injection and registry persistence). With a risk score of ${score}/100, the AI model classifies this sample as malicious with high confidence.`
      : `The URL exhibits strong phishing indicators: a recently registered domain, missing or invalid SSL, and login-form keywords mimicking a known brand. The combined behavioural signals push the risk score to ${score}/100 — classified as malicious.`;
  }
  if(label==='Suspicious'){
    return mode==='file'
      ? `The file contains some risky characteristics — moderate entropy and a few unusual imports — but no definitive malware signature was triggered. The AI engine assigns a risk score of ${score}/100 and recommends caution before execution.`
      : `The URL displays mixed signals: a relatively young domain and a couple of phishing-related terms, but no full impersonation pattern. Risk score ${score}/100 — proceed only if you trust the source.`;
  }
  return mode==='file'
    ? `Static analysis found no malicious indicators in this file. Entropy is normal, no obfuscation detected, and no heuristic rules matched. Risk score ${score}/100 — classified as benign.`
    : `The URL resolves to a well-established domain with valid SSL and no phishing keywords detected. Risk score ${score}/100 — classified as benign.`;
}
function buildRecs(label, mode){
  if(label==='Malicious') return [
    mode==='file'?'Do not execute this file on any system.':'Do not visit this URL or submit credentials to it.',
    'Quarantine or delete the sample immediately.',
    'Run a full antivirus scan on the device that received it.',
    'Report the indicator to your security team or to abuse@ for the hosting provider.',
  ];
  if(label==='Suspicious') return [
    mode==='file'?'Only open in a sandboxed/virtual environment.':'Open only in an isolated browser profile.',
    'Cross-check with a second analysis service before trusting.',
    'Verify the sender or source through a separate channel.',
  ];
  return [
    'No threats detected — the target appears safe.',
    'Keep your antivirus and browser up to date.',
    'Re-scan periodically if behaviour seems unusual.',
  ];
}

/* ---------- New scan ---------- */
document.getElementById('newScanBtn').addEventListener('click',()=>{
  reportSection.classList.add('hidden');
  heroSection.classList.remove('hidden');
  chatBtn.classList.remove('show');
  document.getElementById('chatWin').classList.remove('open');
  chosenFile=null; fileInput.value=''; fileNameEl.textContent=''; urlInput.value='';
  window.scrollTo({top:0,behavior:'smooth'});
});

/* ---------- Chat ---------- */
const chatWin = document.getElementById('chatWin');
const chatBody = document.getElementById('chatBody');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const chatClose = document.getElementById('chatClose');

chatBtn.addEventListener('click',()=>{
  const opening = !chatWin.classList.contains('open');
  chatWin.classList.toggle('open');
  if(opening && chatBody.children.length===0){
    botSay(`Hi! I've reviewed your analysis of "${truncate(window.__report?.target||'the target',40)}". Ask me anything about the risk score, classification or what to do next.`);
  }
  if(opening) setTimeout(()=>chatInput.focus(),300);
});
chatClose.addEventListener('click',()=>chatWin.classList.remove('open'));

chatForm.addEventListener('submit', e=>{
  e.preventDefault();
  const txt = chatInput.value.trim();
  if(!txt) return;
  userSay(txt); chatInput.value='';
  showTyping();
  setTimeout(()=>{ removeTyping(); botSay(aiReply(txt)); }, 700 + Math.random()*600);
});

function userSay(t){ const d=document.createElement('div'); d.className='msg user'; d.textContent=t; chatBody.appendChild(d); scrollChat(); }
function botSay(t){ const d=document.createElement('div'); d.className='msg bot'; d.textContent=t; chatBody.appendChild(d); scrollChat(); }
function showTyping(){ const d=document.createElement('div'); d.className='typing'; d.id='typingEl'; d.innerHTML='<span></span><span></span><span></span>'; chatBody.appendChild(d); scrollChat(); }
function removeTyping(){ const el=document.getElementById('typingEl'); if(el) el.remove(); }
function scrollChat(){ chatBody.scrollTop = chatBody.scrollHeight; }
function truncate(s,n){ return s.length>n? s.slice(0,n)+'…' : s; }

function aiReply(q){
  const r = window.__report; if(!r) return "Please run an analysis first so I can give you specific answers.";
  const lower = q.toLowerCase();
  if(/score|number/.test(lower)) return `Your risk score is ${r.score}/100. Scores under 35 are benign, 35–69 are suspicious, and 70+ are malicious. Yours falls into the "${r.classification}" range.`;
  if(/why|suspicious|malic/.test(lower)){
    if(r.classification==='Malicious') return r.mode==='file' ? "The file is flagged as malicious because it shows multiple high-risk traits at once: high entropy (a sign of packing), obfuscated logic, and imports typical of trojans like process-injection and persistence APIs." : "The URL is flagged as malicious because it combines a brand-new domain, a missing/invalid SSL certificate, and login-form keywords that mimic a known brand — a textbook phishing pattern.";
    if(r.classification==='Suspicious') return "It scored in the middle range — a few risk signals were detected (unusual imports or phishing-related terms) but none triggered a definitive malware/phishing rule. Treat it with caution.";
    return "No risk signals matched. Static analysis found normal entropy, no obfuscation, and no heuristic hits — that's why it's marked benign.";
  }
  if(/delete|remove|quarant/.test(lower)) return r.classification==='Malicious' ? "Yes — delete or quarantine it immediately and run a full antivirus scan on the device that received it." : r.classification==='Suspicious' ? "Not necessarily. Keep it isolated (e.g. a VM) until you can verify the source. If in doubt, delete." : "No need — the target looks safe based on this scan.";
  if(/safe|open|click|visit/.test(lower)) return r.classification==='Benign' ? "Yes, based on this scan it looks safe to proceed." : r.classification==='Suspicious' ? "Only proceed in an isolated environment (sandbox or VM) and double-check via a second tool." : "No — avoid opening or visiting it. Treat it as hostile.";
  if(/recommend|do|next/.test(lower)) return "Check the Recommendations card above — it lists the specific next steps for your classification.";
  return "I can explain the risk score, why it's classified that way, or what to do next. Try asking: \"Why is this suspicious?\" or \"Should I delete this file?\"";
}