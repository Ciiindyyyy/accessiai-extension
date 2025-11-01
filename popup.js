// ===== Elements =====
const aboutBtn = document.getElementById('aboutBtn');
const aboutModal = document.getElementById('aboutModal');
const toastEl = document.getElementById('toast');
const statusChip = document.getElementById('statusChip'); // peut être null si tu l’as retiré

// ===== Views =====
const viewHome = document.getElementById('view-home');
const viewWriter = document.getElementById('view-writer');
const viewRewriter = document.getElementById('view-rewriter');
const viewChat = document.getElementById('view-chat');
const viewSimplify = document.getElementById('view-simplify');
const viewExplain = document.getElementById('view-explain');
const viewTranslate = document.getElementById('view-translate');
const viewCorrect = document.getElementById('view-correct');

// ===== Home =====
const openChatBtn = document.getElementById('openChat');

// ===== Writer & Rewriter =====
const writerInput = document.getElementById('writerInput');
const writerRun = document.getElementById('writerRun');
const writerCopy = document.getElementById('writerCopy');
const writerResult = document.getElementById('writerResult');

const rewriterInput = document.getElementById('rewriterInput');
const rewriterRun = document.getElementById('rewriterRun');
const rewriterCopy = document.getElementById('rewriterCopy');
const rewriterResult = document.getElementById('rewriterResult');

// ===== Simplify / Explain / Translate / Correct =====
const simplifyInput = document.getElementById('simplifyInput');
const simplifyRun = document.getElementById('simplifyRun');
const simplifyCopy = document.getElementById('simplifyCopy');
const simplifyResult = document.getElementById('simplifyResult');
// Explain :
const explainInput = document.getElementById('explainInput');
const explainRun = document.getElementById('explainRun');
const explainCopy = document.getElementById('explainCopy');
const explainResult = document.getElementById('explainResult');
// Translate : 
const translateInput = document.getElementById('translateInput');
const translateRun = document.getElementById('translateRun');
const translateCopy = document.getElementById('translateCopy');
const translateResult = document.getElementById('translateResult');
// =========================================
// ===== Translate controls (popup) =====
const trFrom = document.getElementById('trFrom');
const trTo   = document.getElementById('trTo');
const trSwap = document.getElementById('trSwap');

/*trFrom.addEventListener('change', async (e) => {
  const v = e.target.value || ''; // "" = Auto
  await chrome.storage.local.set({ lastTranslateSourceOverride: v });
});

trTo.addEventListener('change', async (e) => {
  const v = e.target.value;
  if (v) await chrome.storage.local.set({ lastTranslateTarget: v });
});*/


(async function initTranslateControls() {
  // 1) Charger la liste des codes
  const res = await fetch(chrome.runtime.getURL('languages.json'));
  const codes = await res.json(); // ex: ["fr","en","ar",...]

  // 2) Générer les libellés localisés
  let dn;
  try {
    dn = new Intl.DisplayNames([navigator.language || 'en'], { type: 'language' });
  } catch {
    dn = { of: (c) => c }; // fallback
  }

  // 3) Remplir les selects (From ET To)
  const fragTo = document.createDocumentFragment();
  const fragFrom = document.createDocumentFragment();

  codes.forEach(code => {
    const name = dn.of(code) || code;

    const optTo = document.createElement('option');
    optTo.value = code; optTo.textContent = name;
    fragTo.appendChild(optTo);

    const optFrom = document.createElement('option');
    optFrom.value = code; optFrom.textContent = name;
    fragFrom.appendChild(optFrom);
  });

  trTo.appendChild(fragTo);
  trFrom.appendChild(fragFrom);

  // 4) Charger préférences
  const pref = await chrome.storage.local.get({
    lastTranslateTarget: '',
    lastTranslateSourceOverride: '' // vide => Auto
  });
  if (pref.lastTranslateTarget) trTo.value = pref.lastTranslateTarget;
  if (pref.lastTranslateSourceOverride) trFrom.value = pref.lastTranslateSourceOverride;

  // 5) Listeners + persistance
  trTo.addEventListener('change', () => {
    chrome.storage.local.set({ lastTranslateTarget: trTo.value || '' });
  });
  trFrom.addEventListener('change', () => {
    chrome.storage.local.set({ lastTranslateSourceOverride: trFrom.value || '' });
  });
  trSwap.addEventListener('click', () => {
    const from = trFrom.value; // peut être ''
    const to = trTo.value;
    if (!to) return; // rien à swapper si pas de cible
    trFrom.value = to;
    trTo.value = from || ''; // si Auto, redevient vide
    trFrom.dispatchEvent(new Event('change'));
    trTo.dispatchEvent(new Event('change'));
  });
})();

// Correct :
const correctInput = document.getElementById('correctInput');
const correctRun = document.getElementById('correctRun');
const correctCopy = document.getElementById('correctCopy');
const correctResult = document.getElementById('correctResult');

// ===== Chat =====
//const chatSend = document.getElementById('chatSend');
//const chatText = document.getElementById('chatText');
//const chatStream = document.getElementById('chatStream');

// ===== Floating bubble toggle =====
const bubbleToggle = document.getElementById('bubbleToggle');

// ===== Utils =====
function toast(msg){
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.hidden = false;
  setTimeout(()=> toastEl.hidden = true, 1800);
}
function setStatus(text, variant='muted'){
  // Pas de chip ? On ignore, pour éviter tout crash.
  if (!statusChip) return;
  statusChip.textContent = text;
  statusChip.className = `aa-chip aa-chip-${variant}`;
}
function showView(id){
  [viewHome, viewWriter, viewRewriter, viewChat, viewSimplify, viewExplain, viewTranslate, viewCorrect]
    .forEach(v => v.hidden = v.id !== id);
  document.body.classList.toggle('is-chat-open', id === 'view-chat');
}
function escapeHtml(str=''){
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/\"/g,'&quot;').replace(/'/g,'&#39;');
}
async function getActiveTab(){
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}
async function notifyContent(type, payload){
  try{
    const tab = await getActiveTab();
    if (tab?.id) await chrome.tabs.sendMessage(tab.id, { type, ...payload });
  }catch(_){ /* ok si pas de content script sur l’onglet */ }
}

// ===== About modal =====
aboutBtn?.addEventListener('click', ()=> aboutModal?.showModal());
aboutModal?.addEventListener('close', ()=> aboutModal?.close());

// ===== NAV =====
for (const backBtn of document.querySelectorAll('.aa-back')){
  backBtn.addEventListener('click', e => showView(e.currentTarget.dataset.open));
}
for (const modeBtn of document.querySelectorAll('.aa-action-mode')){
  modeBtn.addEventListener('click', e => showView(e.currentTarget.dataset.open));
}
//openChatBtn?.addEventListener('click', ()=> showView('view-chat'));
openChatBtn?.addEventListener('click', () => {
  showView('view-chat');
  openChatView();       // ← appelle ici
});


// ===== Outils simples (placeholders) =====
function setupSimpleTool(prefix, label){
  const input = document.getElementById(`${prefix}Input`);
  const runBtn = document.getElementById(`${prefix}Run`);
  const copyBtn = document.getElementById(`${prefix}Copy`);
  const result = document.getElementById(`${prefix}Result`);

  runBtn?.addEventListener('click', async ()=>{
    const txt = (input?.value || '').trim();
    if(!txt) return toast(`Paste some text to ${label}`);
    if (result) result.innerHTML =
      `<p class="aa-placeholder">(${label} API to be wired)\nText length: ${txt.length} chars</p>`;
    if (copyBtn) copyBtn.disabled = false;
  });

  copyBtn?.addEventListener('click', async ()=>{
    const text = (result?.innerText || '').trim();
    if(!text) return;
    await navigator.clipboard.writeText(text);
    toast('Copied!');
  });
}

//setupSimpleTool('simplify', 'Simplify');

// === Simplify tool (Summarizer API locale + fallback cloud) ===
setupSimplifyTool();

function setupSimplifyTool() {
  const input = document.getElementById('simplifyInput');
  const runBtn = document.getElementById('simplifyRun');
  const copyBtn = document.getElementById('simplifyCopy');
  const result = document.getElementById('simplifyResult');

  if (!input || !runBtn || !copyBtn || !result) return;

  runBtn.addEventListener('click', async () => {
    const txt = (input.value || '').trim();
    if (!txt) return toast('Paste some text to Simplify');

    result.innerHTML = `<p class="aa-placeholder">Simplifying…</p>`;
    result.classList.add('aa-skeleton');
    copyBtn.disabled = true;

    try {
      let summary = null;

      // 🧠 Étape 1 — Essai avec l’API locale Chrome
   
      if ("ai" in chrome && chrome.ai?.summarizer) {
        try {
          const summarizer = await chrome.ai.summarizer.create({
            type: "key-points",
            format: "plain-text"
          });
          let s = await summarizer.summarize(txt);
          if (s && typeof s === "object" && "text" in s) s = s.text; // robustesse
          summary = s; // <-- on affecte la variable externe
          console.log("Local Summarizer result:", summary);
        } catch (e) {
          console.warn("Local Summarizer non dispo:", e.message || e);
        }
      }

      // 🌐 Étape 2 — fallback via Worker Cloudflare
      if (!summary) {
        const resp = await chrome.runtime.sendMessage({
          type: 'ACCESSIAI_DO',
          action: 'simplify',
          text: txt
        });
        summary = resp?.result || "(no result)";
      }

      result.innerHTML = `<div class="aa-out">${escapeHtml(summary)}</div>`;
      copyBtn.disabled = false;
    } catch (e) {
      console.error(e);
      result.innerHTML = `<p class="aa-placeholder">Error: ${e.message || e}</p>`;
      copyBtn.disabled = true;
    } finally {
      result.classList.remove('aa-skeleton');
    }
  });

  copyBtn.addEventListener('click', async () => {
    const text = result?.innerText?.trim();
    if (!text) return;
    await navigator.clipboard.writeText(text);
    toast('Copied!');
  });
}


//setupSimpleTool('explain',  'Explain');

setupExplainTool();

function setupExplainTool() {
  const input = document.getElementById('explainInput');
  const runBtn = document.getElementById('explainRun');
  const copyBtn = document.getElementById('explainCopy');
  const result = document.getElementById('explainResult');
  if (!input || !runBtn || !copyBtn || !result) return;

  runBtn.addEventListener('click', async () => {
    const txt = (input.value || '').trim();
    if (!txt) return toast('Paste some text to Explain');
    result.innerHTML = `<p class="aa-placeholder">Explaining…</p>`;
    result.classList.add('aa-skeleton'); copyBtn.disabled = true;

    try {
      let outText = null;

      // 🧠 Prompt API locale
      if ("ai" in chrome && chrome.ai?.promptSession) {
        try {
          const session = await chrome.ai.promptSession.create();
          outText = await session.prompt(
            `Explain this in simple terms with at most 4 sentences and one tiny example if relevant:\n\n${txt}`
          );
        } catch (e) { console.warn('Prompt API local failed:', e); }
      }

      // 🌐 fallback Cloudflare
      if (!outText) {
        const resp = await chrome.runtime.sendMessage({ type: 'ACCESSIAI_DO', action: 'explain', text: txt });
        outText = resp?.result || '(no result)';
      }

      result.innerHTML = `<div class="aa-out">${escapeHtml(outText)}</div>`;
      copyBtn.disabled = false;
    } catch (e) {
      result.innerHTML = `<p class="aa-placeholder">Error: ${e.message || e}</p>`;
    } finally {
      result.classList.remove('aa-skeleton');
    }
  });

  copyBtn.addEventListener('click', async () => {
    const text = result?.innerText?.trim(); if (!text) return;
    await navigator.clipboard.writeText(text); toast('Copied!');
  });
}


// ✔ Mise en place dédiée au module "Translate"
setupTranslateTool();

function setupTranslateTool() {
  // Récupérer les éléments de la vue Translate
  const input   = document.getElementById('translateInput');
  const result  = document.getElementById('translateResult');
  const runBtn  = document.getElementById('translateRun');
  const copyBtn = document.getElementById('translateCopy');

  // Sécurité si la vue n'est pas montée
  if (!input || !result || !runBtn || !copyBtn) return;

  // Listener du bouton "Translate"
  runBtn.addEventListener('click', async () => {
    const txt = input.value.trim();
    if (!txt) return toast('Paste some text to Translate');

    // Récupérer les préférences (cibles/override) depuis le storage
    const { lastTranslateTarget = '', lastTranslateSourceOverride = '' } =
      await chrome.storage.local.get(['lastTranslateTarget', 'lastTranslateSourceOverride']);

    if (!lastTranslateTarget) {
      result.innerHTML = `<p class="aa-placeholder">Choose a target language in the selector above.</p>`;
      return;
    }

    // État “loading”
    copyBtn.disabled = true;
    runBtn.dataset.loading = '1';
    result.classList.add('aa-skeleton');
    result.innerHTML = `<p class="aa-placeholder">Translating...</p>`;

    try {
      // Appel background → Gemini (ou mock actuel)
      const out = await chrome.runtime.sendMessage({
        type: 'ACCESSIAI_TRANSLATE',
        text: txt,
        target: lastTranslateTarget,
        source: lastTranslateSourceOverride || null
      });

      const translated = out?.translated || '(no result)';
      const detected   = out?.detected || out?.source || '';
      const header     = detected
        ? `(${detected} → ${lastTranslateTarget})`
        : `→ ${lastTranslateTarget}`;

      result.innerHTML =
        `<div>
          <div style="opacity:.7;font-size:12px;margin-bottom:6px">${header}</div>
          <div class="aa-out">${escapeHtml(translated)}</div>
        </div>`;


      copyBtn.disabled = false;

    } catch (e) {
      result.innerHTML = `<p class="aa-placeholder">Translation failed. Please try again.</p>`;
      copyBtn.disabled = true;

    } finally {
      result.classList.remove('aa-skeleton');
      runBtn.dataset.loading = '';
      // si rien n'a été rendu, on garde le bouton Copy désactivé
      copyBtn.disabled = !result.querySelector('.aa-out')?.textContent.trim();
    }
  });

  // =======================
  // Bouton "Copy" (comme les autres vues)
  copyBtn.addEventListener('click', async () => {
    // on copie uniquement la traduction (sans l’en-tête)
    const out = result.querySelector('.aa-out')?.innerText.trim()
            || result.innerText.trim();
    if (!out) return;
    await navigator.clipboard.writeText(out);
    toast('Copied!');
  });

}

// ==========================================
//setupCorrectTool('correct', 'Correct');

setupCorrectTool();

function setupCorrectTool() {
  const input = document.getElementById('correctInput');
  const runBtn = document.getElementById('correctRun');
  const copyBtn = document.getElementById('correctCopy');
  const result = document.getElementById('correctResult');
  if (!input || !runBtn || !copyBtn || !result) return;

  runBtn.addEventListener('click', async () => {
    const txt = (input.value || '').trim();
    if (!txt) return toast('Paste some text to Correct');
    result.innerHTML = `<p class="aa-placeholder">Correcting…</p>`;
    result.classList.add('aa-skeleton'); copyBtn.disabled = true;

    try {
      let corrected = null;

      // ✏️ Proofreader API locale
      if ("ai" in chrome && chrome.ai?.proofreader) {
        try {
          const proof = await chrome.ai.proofreader.create();
          const out = await proof.proofread(txt);
          // Certains builds renvoient { correctedText } — on gère les 2 cas
          corrected = out?.correctedText || out?.text || null;
        } catch (e) { console.warn('Proofreader local failed:', e); }
      }

      // 🌐 fallback Cloudflare
      if (!corrected) {
        const resp = await chrome.runtime.sendMessage({ type: 'ACCESSIAI_DO', action: 'correct', text: txt });
        corrected = resp?.result || '(no result)';
      }

      result.innerHTML = `<div class="aa-out">${escapeHtml(corrected)}</div>`;
      copyBtn.disabled = false;
    } catch (e) {
      result.innerHTML = `<p class="aa-placeholder">Error: ${e.message || e}</p>`;
    } finally {
      result.classList.remove('aa-skeleton');
    }
  });

  copyBtn.addEventListener('click', async () => {
    const text = result?.innerText?.trim(); if (!text) return;
    await navigator.clipboard.writeText(text); toast('Copied!');
  });
}


// ===== Writer =====

setupWriterTool();

function setupWriterTool() {
  const input = document.getElementById('writerInput');
  const runBtn = document.getElementById('writerRun');
  const copyBtn = document.getElementById('writerCopy');
  const result = document.getElementById('writerResult');
  if (!input || !runBtn || !copyBtn || !result) return;

  runBtn.addEventListener('click', async () => {
    const prompt = (input.value || '').trim();
    if (!prompt) return toast('Please describe what to write');
    result.innerHTML = `<p class="aa-placeholder">Writing…</p>`;
    result.classList.add('aa-skeleton'); copyBtn.disabled = true;

    try {
      let text = null;

      // ✍️ Writer API locale
      if ("ai" in chrome && chrome.ai?.writer) {
        try {
          const writer = await chrome.ai.writer.create();
          text = await writer.write(prompt); // API locale
        } catch (e) { console.warn('Writer local failed:', e); }
      }

      // 🌐 fallback Cloudflare
      if (!text) {
        const resp = await chrome.runtime.sendMessage({ type: 'ACCESSIAI_DO', action: 'write', text: prompt });
        text = resp?.result || '(no result)';
      }

      result.innerHTML = `<div class="aa-out">${escapeHtml(text)}</div>`;
      copyBtn.disabled = false;
    } catch (e) {
      result.innerHTML = `<p class="aa-placeholder">Error: ${e.message || e}</p>`;
    } finally {
      result.classList.remove('aa-skeleton');
    }
  });

  copyBtn.addEventListener('click', async () => {
    const text = result?.innerText?.trim(); if (!text) return;
    await navigator.clipboard.writeText(text); toast('Copied!');
  });
}
// ===== Rewriter =====
setupRewriterTool();

function setupRewriterTool() {
  const input = document.getElementById('rewriterInput');
  const runBtn = document.getElementById('rewriterRun');
  const copyBtn = document.getElementById('rewriterCopy');
  const result = document.getElementById('rewriterResult');
  if (!input || !runBtn || !copyBtn || !result) return;

  runBtn.addEventListener('click', async () => {
    const txt = (input.value || '').trim();
    if (!txt) return toast('Paste some text to improve');
    result.innerHTML = `<p class="aa-placeholder">Rewriting…</p>`;
    result.classList.add('aa-skeleton'); copyBtn.disabled = true;

    try {
      let outText = null;

      // 🖊️ Rewriter API locale
      if ("ai" in chrome && chrome.ai?.rewriter) {
        try {
          const rewriter = await chrome.ai.rewriter.create({ style: "clear" });
          outText = await rewriter.rewrite(txt);
        } catch (e) { console.warn('Rewriter local failed:', e); }
      }

      // 🌐 fallback Cloudflare
      if (!outText) {
        const resp = await chrome.runtime.sendMessage({ type: 'ACCESSIAI_DO', action: 'rewrite', text: txt });
        outText = resp?.result || '(no result)';
      }

      result.innerHTML = `<div class="aa-out">${escapeHtml(outText)}</div>`;
      copyBtn.disabled = false;
    } catch (e) {
      result.innerHTML = `<p class="aa-placeholder">Error: ${e.message || e}</p>`;
    } finally {
      result.classList.remove('aa-skeleton');
    }
  });

  copyBtn.addEventListener('click', async () => {
    const text = result?.innerText?.trim(); if (!text) return;
    await navigator.clipboard.writeText(text); toast('Copied!');
  });
}

// Optionnel : si le chip existe encore, on met un statut initial
setStatus('Ready', 'muted');

// ============ chat =================

// ===================== Chat Assistant (Advanced) =====================
const chatLog     = document.getElementById('aaChatLog');
const chatTyping  = document.getElementById('aaTyping');
const chatText    = document.getElementById('aaChatText');
const chatSend    = document.getElementById('aaSendBtn');
const attachBtn   = document.getElementById('aaAttachBtn');
const fileInput   = document.getElementById('aaFile');
const attachBox   = document.getElementById('aaAttachments');

// Aliases pour la partie 1/2
const aaChatLog = chatLog;
const aaTyping = chatTyping;
const aaChatText = chatText;
const aaSendBtn = chatSend;
const aaAttachments = attachBox;

const CHAT_KEY = 'accessiai_chat_history_v1';   // clé de persistance

// ___________________________________________

// ===== Chat: persistence + horodatage =====
const CHAT_STORE_KEY = 'aa_chat_log_v1';

function hhmm(d = new Date()) {
  const h = String(d.getHours()).padStart(2,'0');
  const m = String(d.getMinutes()).padStart(2,'0');
  return `${h}:${m}`;
}

function loadChatLog() {
  return new Promise(res => {
    chrome.storage.local.get([CHAT_STORE_KEY], out => {
      res(Array.isArray(out[CHAT_STORE_KEY]) ? out[CHAT_STORE_KEY] : []);
    });
  });
}

function saveChatLog(log) {
  return new Promise(res => {
    chrome.storage.local.set({ [CHAT_STORE_KEY]: log }, res);
  });
}

function renderBubble(msg) {
  // msg: {role:'user'|'assistant', text:'', time:'HH:MM', files?: [{name,size}]}
  const el = document.createElement('div');
  el.className = `aa-msg ${msg.role === 'user' ? 'me' : 'bot'}`;

  const b = document.createElement('div');
  b.className = 'aa-bubble';
  b.textContent = msg.text || '';

// fichiers (si attachés)
if (Array.isArray(msg.files) && msg.files.length) {
  const filesWrap = document.createElement('div');
  filesWrap.className = 'aa-files';

  msg.files.forEach(f => {
  const isImg = (f.type && f.type.startsWith('image/')) ||
                (f.name && /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(f.name));

  if (isImg && f.url) {
    const img = document.createElement('img');
    img.src = f.url;
    img.alt = f.name || 'image';
    img.className = 'aa-thumb';
    filesWrap.appendChild(img);
    img.onload = () => { try { URL.revokeObjectURL(f.url); } catch(_){} };
    return;
  }

  // sinon: puce texte
  const chip = document.createElement('div');
  chip.className = 'aa-chip';
  chip.textContent = `${f.name} (${Math.round((f.size||0)/1024)} KB)`;
  filesWrap.appendChild(chip);
});


  b.appendChild(document.createElement('br'));
  b.appendChild(filesWrap);
}

  const meta = document.createElement('div');
  meta.className = 'aa-meta';
  meta.textContent = msg.time || hhmm();

  el.appendChild(b);
  el.appendChild(meta);
  aaChatLog.appendChild(el);

  // auto-scroll
  aaChatLog.scrollTop = aaChatLog.scrollHeight;
}

async function redrawFromStorage() {
  aaChatLog.innerHTML = '';
  const log = await loadChatLog();
  log.forEach(renderBubble);
}

// Appelle ceci quand tu ouvres la vue chat :
async function openChatView() {
  // ton code qui montre #view-chat, puis :
  await redrawFromStorage();
  aaChatText.focus();
}
//-----------------------------

// ===================== Chat Assistant (robuste) =====================

/*let pendingFiles = [];

// Wrapper fiable pour sendMessage (gère lastError)
function bgSend(data){
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(data, (resp) => {
        const err = chrome.runtime.lastError;
        if (err) return reject(new Error(err.message || String(err)));
        resolve(resp);
      });
    } catch(e){ reject(e); }
  });
}

async function sendChat(){
  const text = (aaChatText.value || '').trim();
  const hasFiles = pendingFiles.length > 0;
  if (!text && !hasFiles) return;

  // 1) pousser la bulle user + persister
  const userMsg = {
    role: 'user',
    text,
    time: hhmm(),
    files: pendingFiles.map(f => ({ name: f.name, size: f.size, type: f.type || '' }))
  };
  const log = await loadChatLog();
  log.push(userMsg);
  await saveChatLog(log);
  renderBubble(userMsg);

  // reset UI
  aaChatText.value = '';
  pendingFiles = [];
  aaAttachments.hidden = true;
  aaAttachments.innerHTML = '';

  // 2) appel background
  aaTyping.hidden = false;
  try {
    const resp = await bgSend({ type: 'ACCESSIAI_CHAT', text: userMsg.text, files: userMsg.files });
    const replyText = (resp && resp.reply) ? String(resp.reply) : '(no reply)';

    const botMsg = { role: 'assistant', text: replyText, time: hhmm() };
    const log2 = await loadChatLog();
    log2.push(botMsg);
    await saveChatLog(log2);
    renderBubble(botMsg);
  } catch (e) {
    const botMsg = { role: 'assistant', text: `⚠️ Chat failed: ${e.message || e}`, time: hhmm() };
    const log2 = await loadChatLog();
    log2.push(botMsg);
    await saveChatLog(log2);
    renderBubble(botMsg);
  } finally {
    aaTyping.hidden = true;
  }
}

// Bouton Send
aaSendBtn?.addEventListener('click', () => { sendChat(); });

// Enter pour envoyer (Shift+Enter = retour ligne)
aaChatText?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    const hasText = (aaChatText.value || '').trim().length > 0;
    const hasFiles = pendingFiles.length > 0;
    if (hasText || hasFiles) {
      e.preventDefault();
      sendChat();
    }
  }
});*/

// ====== Chat core (popup.js) ======

let pendingFiles = []; // [{ file, name, size, type, url }]

// sendMessage robuste (inchangé)
function bgSend(data){
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(data, (resp) => {
        const err = chrome.runtime.lastError;
        if (err) return reject(new Error(err.message || String(err)));
        resolve(resp);
      });
    } catch(e){ reject(e); }
  });
}

// Util: File -> dataURL (pour la vision côté background/proxy)
async function fileToDataURL(file){
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result || ''));
    r.onerror = rej;
    r.readAsDataURL(file); // ex: "data:image/png;base64,AAAA..."
  });
}

async function sendChat(){
  const text = (aaChatText.value || '').trim();
  const hasFiles = pendingFiles.length > 0;
  if (!text && !hasFiles) return;

  // (1) Rendre la bulle utilisateur immédiatement (avec vignettes URL)
  const userMsg = {
    role: 'user',
    text,
    time: hhmm(),
    files: pendingFiles.map(p => ({
      name: p.name,
      size: p.size,
      type: p.type || '',
      url : p.url || ''   // <-- utilisé par renderBubble pour afficher l’image
    }))
  };
  const log = await loadChatLog();
  log.push(userMsg);
  await saveChatLog(log);
  renderBubble(userMsg);

  // (2) Préparer les fichiers pour le background (vision)
  const filesForBg = await Promise.all(
    pendingFiles.map(async p => {
      if (p.type?.startsWith('image/') && p.file) {
        const dataUrl = await fileToDataURL(p.file);
        return { name: p.name, size: p.size, type: p.type, dataUrl };
      }
      // Fichiers non-images (ou si pas de file) — on envoie les métadonnées
      return { name: p.name, size: p.size, type: p.type || '' };
    })
  );

  // (3) Reset immédiat des contrôles d’entrée (on garde les URLs actives pour la bulle déjà rendue)
  aaChatText.value = '';
  aaAttachments.hidden = true;
  aaAttachments.innerHTML = '';

  // (4) Appel background
  aaTyping.hidden = false;
  try {
    const resp = await bgSend({
      type : 'ACCESSIAI_CHAT',
      text : userMsg.text,
      files: filesForBg         // <-- maintenant contient dataUrl pour images
    });

    const replyText = (resp && resp.reply) ? String(resp.reply) : '(no reply)';

    const botMsg = { role: 'assistant', text: replyText, time: hhmm() };
    const log2 = await loadChatLog();
    log2.push(botMsg);
    await saveChatLog(log2);
    renderBubble(botMsg);

  } catch (e) {
    const botMsg = { role: 'assistant', text: `⚠️ Chat failed: ${e.message || e}`, time: hhmm() };
    const log2 = await loadChatLog();
    log2.push(botMsg);
    await saveChatLog(log2);
    renderBubble(botMsg);

  } finally {
    aaTyping.hidden = true;
    // Libérer les blob:URL maintenant que la bulle est affichée
    try { pendingFiles.forEach(p => p.url && URL.revokeObjectURL(p.url)); } catch {}
    pendingFiles = [];
  }
}

// Bouton Send
aaSendBtn?.addEventListener('click', () => { sendChat(); });

// Enter pour envoyer (Shift+Enter = retour ligne)
aaChatText?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    const hasText = (aaChatText.value || '').trim().length > 0;
    const hasFiles = pendingFiles.length > 0;
    if (hasText || hasFiles) {
      e.preventDefault();
      sendChat();
    }
  }
});


// Pièces jointes (aperçus)
/*attachBtn?.addEventListener('click', () => fileInput?.click());

fileInput?.addEventListener('change', () => {
  const files = Array.from(fileInput.files || []);
  pendingFiles = files;

  aaAttachments.hidden = files.length === 0;
  aaAttachments.innerHTML = '';

  for (const f of files) {
    if (f.type.startsWith('image/')) {
      const url = URL.createObjectURL(f);
      const img = document.createElement('img');
      img.src = url;
      img.alt = f.name;
      img.className = 'aa-thumb';
      aaAttachments.appendChild(img);
      img.onload = () => { try { URL.revokeObjectURL(url); } catch(_){} };
    } else {
      const chip = document.createElement('div');
      chip.className = 'aa-chip';
      chip.textContent = `${f.name} (${Math.round(f.size/1024)} KB)`;
      aaAttachments.appendChild(chip);
    }
  }

  if (files.length) {
    const clear = document.createElement('button');
    clear.className = 'aa-icon';
    clear.title = 'Remove';
    clear.textContent = '✕';
    clear.onclick = () => {
      fileInput.value = '';
      pendingFiles = [];
      aaAttachments.hidden = true;
      aaAttachments.innerHTML = '';
    };
    aaAttachments.appendChild(clear);
  }

  aaChatText.focus();
});*/

attachBtn?.addEventListener('click', () => fileInput?.click());

fileInput?.addEventListener('change', () => {
  const files = Array.from(fileInput.files || []);
  pendingFiles = files;
  aaAttachments.hidden = files.length === 0;
  aaAttachments.innerHTML = '';

  for (const f of files) {
    if ((f.type || '').startsWith('image/')) {
      const url = URL.createObjectURL(f);
      const img = document.createElement('img');
      img.src = url; img.alt = f.name; img.className = 'aa-thumb';
      aaAttachments.appendChild(img);
      img.onload = () => { try { URL.revokeObjectURL(url); } catch(_){} };
    } else {
      const chip = document.createElement('div');
      chip.className = 'aa-chip';
      chip.textContent = `${f.name} (${Math.round(f.size/1024)} KB)`;
      aaAttachments.appendChild(chip);
    }
  }

  if (files.length) {
    const clear = document.createElement('button');
    clear.className = 'aa-icon'; clear.title = 'Remove'; clear.textContent = '✕';
    clear.onclick = () => {
      fileInput.value = '';
      pendingFiles = [];
      aaAttachments.hidden = true;
      aaAttachments.innerHTML = '';
    };
    aaAttachments.appendChild(clear);
  }
  aaChatText.focus();
});

// Pièces jointes (aperçus)
/*attachBtn?.addEventListener('click', () => f?.click());
fileInput?.addEventListener('change', () => {
  const files = Array.from(f.files || []);
  pendingFiles = files;
  aaAttachments.hidden = files.length === 0;
  aaAttachments.innerHTML = '';
  for (const f of files) {
    if (f.type.startsWith('image/')) {
      const url = URL.createObjectURL(f);
      const img = document.createElement('img');
      img.src = url; img.alt = f.name; img.className = 'aa-thumb';
      aaAttachments.appendChild(img);
      img.onload = () => { try { URL.revokeObjectURL(url); } catch(_){} };
    } else {
      const chip = document.createElement('div');
      chip.className = 'aa-chip';
      chip.textContent = `${f.name} (${Math.round(f.size/1024)} KB)`;
      aaAttachments.appendChild(chip);
    }
  }
  if (files.length){
    const clear = document.createElement('button');
    clear.className = 'aa-icon'; clear.title = 'Remove'; clear.textContent = '✕';
    clear.onclick = () => { f.value = ''; pendingFiles = []; aaAttachments.hidden = true; aaAttachments.innerHTML = ''; };
    aaAttachments.appendChild(clear);
  }
  aaChatText.focus();
});

// ___________________________________________

// petit util déjà présent ailleurs, au cas où
/*function escapeHtml2(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
//=========================================================

attachBtn?.addEventListener('click', () => fileInput?.click());

fileInput?.addEventListener('change', () => {
  const files = Array.from(fileInput.files || []);
  pendingFiles = files;             // <-- on garde tout
  attachBox.hidden = files.length === 0;
  attachBox.innerHTML = '';

  for (const f of files) {
    // vignette image
    if (f.type.startsWith('image/')) {
      const url = URL.createObjectURL(f);
      const img = document.createElement('img');
      img.src = url;
      img.alt = f.name;
      img.className = 'aa-thumb';
      attachBox.appendChild(img);
      continue;
    }
    // fichiers non-images : puce texte
    const chip = document.createElement('div');
    chip.className = 'aa-chip';
    chip.textContent = `${f.name} (${Math.round(f.size/1024)} KB)`;
    attachBox.appendChild(chip);
  }

  // bouton pour nettoyer (optionnel)
  if (files.length) {
    const clear = document.createElement('button');
    clear.className = 'aa-icon';
    clear.title = 'Remove';
    clear.textContent = '✕';
    clear.onclick = () => {
      fileInput.value = '';
      pendingFiles = [];
      attachBox.hidden = true;
      attachBox.innerHTML = '';
    };
    attachBox.appendChild(clear);
  }
  aaChatText.focus();

});*/


// ===== Toggle bulle (persistant + synchro) =====
if (bubbleToggle) {
  // A. Charger l'état persistant (par défaut: true)
  chrome.storage.local.get({ bubbleEnabled: true }, async ({ bubbleEnabled }) => {
    bubbleToggle.checked = !!bubbleEnabled;
    // Synchroniser l’état initial avec le content script
    await notifyContent('SYNC_BUBBLE', { enabled: !!bubbleEnabled });
  });

  // B. Sauvegarder tout changement + notifier le content script
  bubbleToggle.addEventListener('change', async () => {
    const enabled = bubbleToggle.checked;
    await chrome.storage.local.set({ bubbleEnabled: enabled });
    toast(enabled ? 'Floating bubble enabled' : 'Floating bubble disabled');
    await notifyContent('TOGGLE_BUBBLE', { enabled });
  });
}

// Auto-navigation + préremplissage depuis la bulle
// ================================================
document.addEventListener('DOMContentLoaded', async () => {
  const { accessiai_open_view, accessiai_draft, accessiai_result } =
    await chrome.storage.session.get([
      'accessiai_open_view', 'accessiai_draft', 'accessiai_result'
    ]);

  if (accessiai_open_view) {
    showView(accessiai_open_view);
  }

  // Pose le texte sélectionné en haut (textarea)
  if (accessiai_draft) {
    switch (accessiai_open_view) {
      case 'view-simplify': {
        const el = document.getElementById('simplifyInput');
        if (el) el.value = accessiai_draft;
        break;
      }
      case 'view-explain': {
        const el = document.getElementById('explainInput');
        if (el) el.value = accessiai_draft;
        break;
      }
      case 'view-correct': {
        const el = document.getElementById('correctInput');
        if (el) el.value = accessiai_draft;
        break;
      }
      case 'view-translate': {
        const el = document.getElementById('translateInput');
        if (el) el.value = accessiai_draft;
        break;
      }
      case 'view-chat': {
        const el = document.getElementById('aaChatText');
        if (el) el.value = accessiai_draft;
        break;
      }
    }
  }

  // Pose le résultat en bas (zone résultat) et active Copy
  if (accessiai_result) {
    const setResult = (resultId, copyBtnId) => {
      const r = document.getElementById(resultId);
      if (r) r.innerText = accessiai_result;           // sécurisé (pas d'HTML)
      const copyBtn = document.getElementById(copyBtnId);
      if (copyBtn) copyBtn.disabled = false;           // active le bouton Copy
    };

    switch (accessiai_open_view) {
      case 'view-simplify':
        setResult('simplifyResult', 'simplifyCopy');
        break;
      case 'view-explain':
        setResult('explainResult', 'explainCopy');
        break;
      case 'view-correct':
        setResult('correctResult', 'correctCopy');
        break;
      case 'view-translate':
        // garde l’en-tête → ar etc. si tu en mets un ; ici on remplit juste
        setResult('translateResult', 'translateCopy');
        break;
    }
  }

  // Nettoyage (important pour ne pas réutiliser l'ancien contenu)
  await chrome.storage.session.remove(
    ['accessiai_open_view','accessiai_draft','accessiai_result']
  );
});

