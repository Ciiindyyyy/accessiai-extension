// background.js (MV3 service worker) — AccessiAI

/**********************
 * Utils robustes
 **********************/
console.log('[AccessiAI] SW version 2025-10-31 1');

const PROXY_URL = "https://accessiai-worker.accessiai.workers.dev";

export async function callGemini({ prompt, model = "gemini-2.5-flash" }) {
  const resp = await fetch(PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, model }),
  });
  if (!resp.ok) throw new Error("Proxy error " + resp.status);
  const json = await resp.json();

  // Supporte {data:{...}} et {...} direct
  const root = json?.data ?? json;
  const text =
    root?.candidates?.[0]?.content?.parts?.[0]?.text ?? "(no text)";

  return { raw: json, text };
}


// Exemple d’utilisation
// const r = await callGemini({ prompt: "Summarize: AccessiAI makes the web accessible." });
// console.log(r.text);

function log(...args) { console.debug('[AccessiAI]', ...args); }

// Wrapper callback -> Promise pour tabs.sendMessage (et gestion lastError)
function tabsSendMessage(tabId, payload) {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.sendMessage(tabId, payload, (resp) => {
        const err = chrome.runtime.lastError;
        if (err) {
          // Exemple: "The message port closed before a response was received."
          // ou "Could not establish connection. Receiving end does not exist."
          return reject(new Error(err.message || String(err)));
        }
        resolve(resp);
      });
    } catch (e) {
      reject(e);
    }
  });
}

// Envoie un message à l’onglet actif si possible
async function sendToActiveTab(payload) {
  //const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const [tab] = await chrome.runtime.getContexts?.() ?? [];
  if (!tab?.id) throw new Error('No active tab');
  return tabsSendMessage(tab.id, payload);
}

/**********************
 * Menus & commandes
 **********************/
function createContextMenus() {
  // parent
  chrome.contextMenus.create({ id: 'accessiai', title: 'AccessiAI', contexts: ['selection'] });
  // enfants
  [
    { id: 'accessiai_explain',  title: 'Explain ✨',   action: 'explain'  },
    { id: 'accessiai_simplify', title: 'Simplify 📘',  action: 'simplify' },
    { id: 'accessiai_translate',title: 'Translate 🌍', action: 'translate'},
    { id: 'accessiai_correct',  title: 'Correct 📝',   action: 'correct'  },
  ].forEach((it) => {
    chrome.contextMenus.create({
      id: it.id, parentId: 'accessiai', title: it.title, contexts: ['selection']
    });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  try { createContextMenus(); } catch (e) { log('onInstalled menu error:', e); }
});

chrome.runtime.onStartup.addListener(() => {
  // Au redémarrage du navigateur, certains menus peuvent sauter sur certaines plateformes
  try { createContextMenus(); } catch (e) { log('onStartup menu error:', e); }
});

// Click menu -> demander au content de jouer l’action (il connaît la sélection)
chrome.contextMenus.onClicked.addListener(async (info) => {
  try {
    const map = {
      accessiai_explain:  'explain',
      accessiai_simplify: 'simplify',
      accessiai_translate:'translate',
      accessiai_correct:  'correct',
    };
    const action = map[info.menuItemId];
    if (!action) return;
    await sendToActiveTab({ type: 'ACCESSIAI_DO', action });
  } catch (e) {
    log('contextMenus.onClicked error:', e.message || e);
    // On ignore silencieusement si pas de content script sur l’onglet
  }
});

// Raccourcis (manifest.commands)
chrome.commands.onCommand.addListener(async (command) => {
  try {
    const map = {
      accessiai_explain:  'explain',
      accessiai_simplify: 'simplify',
      accessiai_translate:'translate',
      accessiai_correct:  'correct',
    };
    const action = map[command];
    if (!action) return;
    await sendToActiveTab({ type: 'ACCESSIAI_DO', action });
  } catch (e) {
    log('commands.onCommand error:', e.message || e);
  }
});

/**********************
 * “Traitement” (mock conservé)
 **********************/
function mockProcess(action, text) {
  try {
    switch (action) {
      case 'simplify':
        return `Simplified:\n${text.replace(/\b(utiliser|exploiter|démontrer|finalité)\b/gi, '→').replace(/\s+/g,' ').trim()}`;
      case 'explain':
        return `Explanation:\nThis means: ${text}\n\nIn simple terms: ...`;
      case 'translate':
        return `Translation (EN):\n${text}\n\n(Note: mock translation)`;
      case 'correct':
        return `Correction:\n${text}\n\nSuggested: ${text}`;
      case 'write':
        return `Draft:\n${text}\n\n(Writer mock)`;
      case 'rewrite':
        return `Rewritten:\n${text}\n\n(Rewriter mock)`;
      default:
        return text || '';
    }
  } catch (e) {
    return `Error: ${e?.message || e}`;
  }
}

// --- Générateur de prompt par action
function buildPrompt(action, text) {
  switch (action) {
    case 'simplify':
      return `Summarize the following into clear key bullet points (max 6), keep terms precise:\n\n"""${text}"""`;
    case 'explain':
      return `Explain in plain language (≤4 sentences) with one tiny example if relevant:\n\n"""${text}"""`;
    case 'correct':
      return `Proofread and return the corrected text only (keep meaning and tone):\n\n"""${text}"""`;
    case 'write':
      return `Write the requested content. Be concise, direct, and useful:\n\n"""${text}"""`;
    case 'rewrite':
      return `Rewrite the text to be clearer and more natural. Return rewritten text only:\n\n"""${text}"""`;
    default:
      return text;
  }
}

// --- Exécuter une action via Gemini (ton proxy)
async function runActionWithGemini(action, text) {
  const prompt = buildPrompt(action, text);
  // flash = rapide et peu coûteux. Tu peux passer "gemini-2.0-pro" pour Writer si tu veux plus riche.
  const { text: out } = await callGemini({ prompt, model: "gemini-2.5-flash" });
  return out || "(no result)";
}


//========================================================================================================

// Timeout helper
async function withTimeout(promise, ms = 15000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await promise(ctrl.signal);
  } finally {
    clearTimeout(timer);
  }
}

async function translateWithGemini({ text, source, target }) {
  const sys = [
    source ? `Source language is ${source}.`
           : `Detect the source language and put it in "detected".`,
    `Translate to ${target}.`,
    `Return strictly JSON with keys: "detected" (string or null) and "translated" (string).`,
    `Output ONLY the JSON object. No code fences, no explanation, no extra text.`
  ].join(' ');

  const prompt = `${sys}\n\nText:\n"""${text}"""`;

  const { text: raw } = await callGemini({ prompt, model: "gemini-2.5-flash" });

  // --- NEW: nettoyer/extraire JSON si le modèle met des ``` ou du texte autour
  const stripFences = (s) =>
    s.trim()
     .replace(/^```(?:json)?\s*/i, '')
     .replace(/```$/i, '')
     .trim();

  let cleaned = stripFences(raw);
  // si toujours pas du JSON "pur", on tente d'extraire le 1er {...}
  if (!cleaned.startsWith('{')) {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) cleaned = m[0];
  }

  let parsed = null;
  try { parsed = JSON.parse(cleaned); } catch (_) {}

  return {
    translated: parsed?.translated || cleaned || '',
    detected: source || parsed?.detected || null
  };
}


// ====================== ROUTEUR UNIQUE ======================
let MOCK = false; 
chrome.storage.local.get({ mockMode: false }, ({ mockMode }) => { 
  MOCK = !!mockMode; 
  console.log('[AccessiAI] mockMode initial =', MOCK);
});
//--------------
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.mockMode) {
    MOCK = !!changes.mockMode.newValue;
    console.log('[AccessiAI] mockMode ->', MOCK);
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      switch (msg?.type) {

        // ===== Actions venant du content (bulle) =====
        case 'ACCESSIAI_ACTION': 
        case 'ACCESSIAI_DO': { 
          const text = msg.text || '';
          if (msg.action === 'translate') {
            // lit préférences popup
            const { lastTranslateTarget = '', lastTranslateSourceOverride = '' } =
              await chrome.storage.local.get(['lastTranslateTarget', 'lastTranslateSourceOverride']);

            if (!lastTranslateTarget) {
              sendResponse({ result: 'Choose a target language in the popup first.' });
              return;
            }

            const out = await translateWithGemini({
              text,
              source: lastTranslateSourceOverride || null,
              target: lastTranslateTarget
            });

            // pour compat content.js actuel
            sendResponse({ result: out.translated });
          /*} else {
            // autres outils (mock pour l’instant)
            const out = mockProcess(msg.action, text);
            await chrome.storage.session.set({
              accessiai_last_action: msg.action,
              accessiai_last_text: text,
              accessiai_last_result: out,
              accessiai_updated_at: Date.now(),
            });
            sendResponse({ result: out });
          }
          break;
        }*/
          } else {
            let out;
            if (MOCK) {
              out = mockProcess(msg.action, text);
            } else {
              out = await runActionWithGemini(msg.action, text);
            }
            await chrome.storage.session.set({
              accessiai_last_action: msg.action,
              accessiai_last_text: text,
              accessiai_last_result: out,
              accessiai_updated_at: Date.now(),
            });
            sendResponse({ result: out });
          }
          break;
        }
        
        // ===== Popup: Traduction directe =====
        case 'ACCESSIAI_TRANSLATE': {
          const { text, source, target } = msg;
          const out = await translateWithGemini({ text, source, target });
          sendResponse(out); // { translated, detected }
          break;
        }

        // ===== Popup: Chat =====
        
        case 'ACCESSIAI_CHAT': {  
          console.log('[AccessiAI] CHAT received:', { from: sender?.id, hasText: !!msg.text, files: msg.files?.length||0 });

          const userText = (msg.text || '').trim().slice(0, 4000); // évite textes énormes
          const files = Array.isArray(msg.files) ? msg.files : [];

          const { aa_chat_log_v1 = [] } = await chrome.storage.local.get(['aa_chat_log_v1']);
          const MAX_TURNS = 10;
          const recent = aa_chat_log_v1.slice(-MAX_TURNS);

          const system = [
            'You are AccessiAI, a helpful, concise assistant inside a Chrome extension.',
            'Answer in the language of the last user message.',
            'Prefer short paragraphs and bullet points when helpful.',
            'If user asked to fix text, output only the corrected text unless asked to explain.'
          ].join(' ');

          const serialize = (m) => {
            const role = m.role === 'assistant' ? 'Assistant' : 'User';
            const filesNote = Array.isArray(m.files) && m.files.length
              ? ` [files: ${m.files.map(f => `${f.name}(${Math.round((f.size||0)/1024)}KB)`).join(', ')}]`
              : '';
            return `${role}: ${m.text || ''}${filesNote}`;
          };

          const convo = recent.map(serialize).join('\n');
          const nowLine = `User: ${userText}${files.length ? ` [files: ${files.map(f=>`${f.name}(${Math.round((f.size||0)/1024)}KB)`).join(', ')}]` : ''}`;

          const prompt = [system, '', 'Conversation so far:', convo, nowLine, 'Assistant:'].join('\n');

          let reply = '(no reply)';
          try {
            const r = await callGemini({ prompt, model: 'gemini-2.5-flash' });
            reply = (r && r.text) ? r.text : reply;
          } catch (apiErr) {
            console.warn('[AccessiAI] CHAT callGemini failed:', apiErr);
            reply = `Sorry, the chat backend failed (${apiErr?.message || apiErr}).`;
          }

          sendResponse({ reply });
          break;
        }
        // ...


        // ===== Petit utilitaires popup/content =====
        case 'ACCESSIAI_SET_DRAFT':
          await chrome.storage.session.set({ accessiai_draft: msg.text || '' });
          sendResponse({ ok: true });
          break;

        case 'ACCESSIAI_GET_LAST_RESULT': {
          const store = await chrome.storage.session.get([
            'accessiai_last_action',
            'accessiai_last_text',
            'accessiai_last_result',
            'accessiai_updated_at',
          ]);
          sendResponse(store);
          break;
        }

        case 'ACCESSIAI_SET_THEME':
          await chrome.storage.session.set({ accessiai_theme: msg.value || 'auto' });
          sendResponse({ ok: true });
          break;

        case 'ACCESSIAI_OPEN_POPUP': {
          //const { view = 'view-home', draft = '' } = msg;
          const { view, draft, result } = msg;

          // stocke pour la popup
          await chrome.storage.session.set({
            //accessiai_open_view: view,
            //accessiai_draft: draft
            accessiai_open_view: view || 'view-home',
            accessiai_draft: draft || '',
            accessiai_result: result || ''
          });

        // ouvrir la popup (si ancrée dans la barre)
          if (chrome.action && chrome.action.openPopup) {
            try { await chrome.action.openPopup(); break; } catch (_) {}
          }
          // fallback (rare) : ouvrir la page popup dans un onglet
          const url = chrome.runtime.getURL('popup.html');
          //await chrome.tabs.create({ url });
          await chrome.windows.create({ url });
          break;

        }
        
        default:
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (e) {
      console.error('[AccessiAI] onMessage fatal:', e);
      sendResponse({ error: e?.message || String(e) });
    }
  })();

  return true; // réponse async
});

