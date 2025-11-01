// --- Guard: ne pas exécuter sur pages restreintes
if (/^(chrome|edge|about|moz|opera):/.test(location.protocol)) {
} else {
  (function () {

   // --- Synchronisation bulle avec popup (toggle AccessiAI) ---
    let bubbleAllowed = true; // État global autorisant ou non la bulle

    chrome.runtime.onMessage.addListener((msg, _sender, _sendResponse) => {
      if (msg?.type === 'TOGGLE_BUBBLE' || msg?.type === 'SYNC_BUBBLE') {
        bubbleAllowed = !!msg.enabled;
        if (!bubbleAllowed) {
          removeUI(); // on supprime toute bulle visible
        }
      }
    });

    // Charger l’état sauvegardé à chaque chargement de page
    chrome.storage.local.get({ bubbleEnabled: true }, ({ bubbleEnabled }) => {
      bubbleAllowed = !!bubbleEnabled;
      if (!bubbleAllowed) {
        removeUI();
      }
    });
      // ====================================================
      
    let bubbleHost = null, bubbleRoot = null, bubbleEl = null;
    let resultHost = null, resultRoot = null, resultEl = null;

    // états
    let hideTimeout = null, rafId = null;
    let lastAnchorEl = null;
    let lastSelectedText = '';

    // drag bulle
    let userDragged = false;
    let dragState = null;

    // drag résultat
    let userDraggedRes = false;
    let dragResState = null;

    // storage keys
    const POS_BUBBLE_KEY = 'accessiai_bubble_pos';
    const POS_RESULT_KEY = 'accessiai_result_pos';
    const PIN_RESULT_KEY = 'accessiai_result_pinned'; // "true"/"false"

    // utils
    function removeEl(host) { if (host && host.parentNode) host.parentNode.removeChild(host); }
    function clearBubble() { removeEl(bubbleHost); bubbleHost = bubbleRoot = bubbleEl = null; userDragged = false; dragState = null; }
    function clearResult() { removeEl(resultHost); resultHost = resultRoot = resultEl = null; userDraggedRes = false; dragResState = null; sessionStorage.removeItem(PIN_RESULT_KEY); }
    function removeUI() { if (hideTimeout) clearTimeout(hideTimeout); clearBubble(); clearResult(); }
    function getSelectionText() {
      const sel = window.getSelection && window.getSelection();
      if (!sel || !sel.rangeCount) return '';
      return sel.toString().trim();
    }
    function getSavedJSON(key) { try { return JSON.parse(sessionStorage.getItem(key) || 'null'); } catch { return null; } }

    /* ========================
       BUBBLE (actions)
    ======================== */
    function ensureBubble() {
      clearBubble();
      bubbleHost = document.createElement('div');
      bubbleHost.style.position = 'fixed';
      bubbleHost.style.inset = '0 auto auto 0';
      bubbleHost.style.zIndex = '2147483647';
      bubbleHost.style.pointerEvents = 'none';
      bubbleRoot = bubbleHost.attachShadow({ mode: 'open' });

      const style = document.createElement('style');
      style.textContent = `
        :host{--bg:#fff;--text:#111827;--soft:#F3F4F6;--border:rgba(0,0,0,.10);--shadow:0 12px 32px rgba(0,0,0,.22);--primary:#2563EB}
        @media (prefers-color-scheme:dark){
          :host{--bg:#0F172A;--text:#E5E7EB;--soft:#1E293B;--border:rgba(255,255,255,.12);--shadow:0 18px 40px rgba(0,0,0,.6);--primary:#3B82F6}
        }
        .bubble{position:fixed;pointer-events:auto;background:var(--bg);border:1px solid var(--border);box-shadow:var(--shadow);border-radius:12px;padding:6px 8px;display:flex;gap:6px;align-items:center;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;color:var(--text)}
        .handle{user-select:none;cursor:grab;font-size:16px;opacity:.6;padding:4px 6px;border-radius:8px}
        .handle:active{cursor:grabbing}
        .btn{-webkit-appearance:none;appearance:none;border:0;background:var(--soft);padding:6px 10px;border-radius:10px;font-size:13px;line-height:1;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:6px;color:var(--text);min-height:28px;transition:transform .06s,background .15s,color .15s}
        .btn:hover{background:rgba(59,130,246,.15)}
        .btn:active{transform:translateY(1px)}
        .divider{width:1px;height:18px;background:var(--border);margin:0 2px}
        .primary{background:var(--primary);color:#fff}
      `;

      bubbleEl = document.createElement('div');
      bubbleEl.className = 'bubble';
      bubbleEl.innerHTML = `
        <span class="handle" title="Drag">⋮⋮</span>
        <button class="btn" data-action="explain">Explain ✨</button>
        <button class="btn" data-action="simplify">Simplify 📘</button>
        <span class="divider"></span>
        <button class="btn" data-action="translate">Translate 🌍</button>
        <button class="btn" data-action="correct">Correct 📝</button>
      `;
      bubbleRoot.appendChild(style);
      bubbleRoot.appendChild(bubbleEl);
      document.documentElement.appendChild(bubbleHost);

      // éviter de perdre la sélection
      bubbleEl.addEventListener('mousedown', (e) => e.stopPropagation());

      // drag bulle
      const handle = bubbleEl.querySelector('.handle');
      handle.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        dragState = {
          startX: e.clientX, startY: e.clientY,
          startTop: parseFloat(bubbleHost.style.top || '0'),
          startLeft: parseFloat(bubbleHost.style.left || '0'),
        };
        userDragged = true;
        handle.setPointerCapture(e.pointerId);
      });
      handle.addEventListener('pointermove', (e) => {
        if (!dragState) return;
        const dx = e.clientX - dragState.startX, dy = e.clientY - dragState.startY;
        const top = Math.max(4, dragState.startTop + dy);
        const left = Math.max(4, dragState.startLeft + dx);
        bubbleHost.style.top = `${top}px`; bubbleHost.style.left = `${left}px`;
        sessionStorage.setItem(POS_BUBBLE_KEY, JSON.stringify({ top, left }));
      });
      handle.addEventListener('pointerup', () => { dragState = null; });

      // actions
      bubbleEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn'); if (!btn) return;
        const action = btn.dataset.action;
        const now = getSelectionText(); lastSelectedText = now || lastSelectedText;
        if (!lastSelectedText) return;
        btn.classList.add('primary'); setTimeout(() => btn.classList.remove('primary'), 250);
        try {
          if (!chrome?.runtime?.id) return;
          chrome.runtime.sendMessage({ type:'ACCESSIAI_ACTION', action, text:lastSelectedText }, (resp) => {
            if (chrome.runtime.lastError) return;
            const out = resp && resp.result ? resp.result : '(no result)';
            showResultCard(out, action, btn);
          });
        } catch {}
      });
    }

    /* ========================
       RESULT CARD (draggable + close)
    ======================== */
    function ensureResult() {
      clearResult();
      resultHost = document.createElement('div');
      resultHost.style.position = 'fixed';
      // 👉 éviter tout flash en (0,0) le temps du calcul
      resultHost.style.top = '-10000px';
      resultHost.style.left = '-10000px';
      resultHost.style.zIndex = '2147483647';
      resultHost.style.pointerEvents = 'none';
      resultRoot = resultHost.attachShadow({ mode: 'open' });

      const style = document.createElement('style');
      style.textContent = `
        :host{--bg:#fff;--text:#111827;--soft:#F3F4F6;--border:rgba(0,0,0,.10);--shadow:0 12px 32px rgba(0,0,0,.22);--primary:#2563EB;--aqua:#0FBFB4}
        @media(prefers-color-scheme:dark){
          :host{--bg:#0F172A;--text:#E5E7EB;--soft:#1E293B;--border:rgba(255,255,255,.12);--shadow:0 18px 40px rgba(0,0,0,.6);--primary:#3B82F6;--aqua:#14B8A6}
        }
        .card{position:fixed;max-width:360px;pointer-events:auto;background:var(--bg);border:1px solid var(--border);box-shadow:var(--shadow);border-radius:12px;padding:10px 12px;color:var(--text);font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;animation:pop .12s ease;overflow:visible}
        @keyframes pop{from{transform:translateY(-2px);opacity:.9}to{transform:none;opacity:1}}
        .bar{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;cursor:grab; user-select:none;}
        .bar:active{cursor:grabbing}
        .title{font-size:12px;opacity:.75}
        .controls{display:flex;align-items:center;gap:6px}
        .close{appearance:none;border:0;background:var(--soft);color:var(--text);width:26px;height:26px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;line-height:1}
        .close:hover{background:rgba(59,130,246,.15)}
        .content{font-size:14px;line-height:1.5;white-space:pre-wrap;word-break:break-word}
        .row{display:flex;gap:8px;margin-top:10px;justify-content:flex-end}
        .small{appearance:none;border:0;background:var(--soft);padding:6px 10px;border-radius:10px;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;color:var(--text);min-height:28px;min-width:64px;justify-content:center;transition:background .15s,color .15s,transform .06s}
        .small:hover{background:rgba(59,130,246,.15)}
        .small:active{transform:translateY(1px)}
        .cta{background:var(--primary);color:#fff}
        .ico{width:14px;height:14px;display:block}
        .toast{position:absolute;top:8px;right:8px;width:22px;height:22px;border-radius:999px;background:var(--aqua);display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow);opacity:0;transform:scale(.8);transition:opacity .15s,transform .15s}
        .toast.show{opacity:1;transform:scale(1)}
        .toast svg{width:14px;height:14px;display:block}
      `;
      resultEl = document.createElement('div');
      resultEl.className = 'card';
      resultRoot.appendChild(style);
      resultRoot.appendChild(resultEl);
      document.documentElement.appendChild(resultHost);
    }

    function showResultCard(text, action, anchorEl) {
      ensureResult();
      const titles = { explain:'Explanation', simplify:'Simplified', translate:'Translation', correct:'Correction' };
      resultEl.innerHTML = `
        <div class="bar" id="dragBar">
          <div class="title">${titles[action] || 'Result'}</div>
          <div class="controls">
            <button class="close" id="closeBtn" title="Close">×</button>
          </div>
        </div>
        <div class="content" id="acc-content"></div>
        <div class="row">
          <button class="small" id="copy-btn" aria-label="Copy">
            <svg class="ico" viewBox="0 0 24 24"><path fill="currentColor" d="M16 1H4a2 2 0 0 0-2 2v12h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z"/></svg>
            <span>Copy</span>
          </button>
          <button class="small cta" id="open-btn">Open in popup</button>
        </div>
        <div class="toast" id="toast" aria-hidden="true"><svg viewBox="0 0 24 24"><path fill="#fff" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg></div>
      `;
      resultEl.querySelector('#acc-content').textContent = text;

      // fermer explicitement
      resultEl.querySelector('#closeBtn').addEventListener('click', () => { clearResult(); });

      // DRAG — grande zone : toute la barre (.bar), sauf clic sur le bouton X
      const dragBar = resultEl.querySelector('#dragBar');
      dragBar.addEventListener('pointerdown', (e) => {
        if (e.target.closest('#closeBtn')) return; // ne pas bloquer le clic sur X
        e.preventDefault(); e.stopPropagation();
        const t0 = parseFloat(resultHost.style.top || '0');
        const l0 = parseFloat(resultHost.style.left || '0');
        dragResState = { startX: e.clientX, startY: e.clientY, startTop: t0, startLeft: l0 };
        userDraggedRes = true;
        sessionStorage.setItem(PIN_RESULT_KEY, 'true'); // pin
        dragBar.setPointerCapture(e.pointerId);
      });
      dragBar.addEventListener('pointermove', (e) => {
        if (!dragResState) return;
        const dx = e.clientX - dragResState.startX, dy = e.clientY - dragResState.startY;
        const top = Math.max(4, dragResState.startTop + dy);
        const left = Math.max(4, dragResState.startLeft + dx);
        resultHost.style.top = `${top}px`; resultHost.style.left = `${left}px`;
        sessionStorage.setItem(POS_RESULT_KEY, JSON.stringify({ top, left }));
      });
      dragBar.addEventListener('pointerup', () => { dragResState = null; });

      // COPY avec feedback
      const copyBtn = resultEl.querySelector('#copy-btn');
      copyBtn.addEventListener('click', async () => {
        const feedback = () => {
          const t = resultEl.querySelector('#toast'); t.classList.add('show'); setTimeout(()=>t.classList.remove('show'), 900);
          const label = copyBtn.querySelector('span'); const prev = label.textContent;
          copyBtn.classList.add('primary'); label.textContent='Copied';
          setTimeout(()=>{ copyBtn.classList.remove('primary'); label.textContent = prev; }, 900);
        };
        let ok = false;
        try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); ok = true; } } catch {}
        if (!ok) {
          try { const ta = document.createElement('textarea'); ta.value = text; ta.style.position='fixed'; ta.style.top='-9999px';
            document.body.appendChild(ta); ta.focus(); ta.select(); document.execCommand('copy'); ta.remove(); ok = true; } catch {}
        }
        feedback();
      });

      // OPEN in popup (sans ouvrir de nouvelle fenêtre Chrome)
      resultEl.querySelector('#open-btn').addEventListener('click', (e) => {
        e.preventDefault();

        // mappe l’action vers l’onglet/écran de ta popup
        const viewByAction = {
          explain:   'view-explain',
          simplify:  'view-simplify',
          translate: 'view-translate',
          correct:   'view-correct'
        };

        const viewId  = viewByAction[action] || 'view-home';
        const draft   = (lastSelectedText && lastSelectedText.trim()) ? lastSelectedText : text;

        chrome.runtime.sendMessage({
          type: 'ACCESSIAI_OPEN_POPUP',
          view: viewId,
          draft: lastSelectedText || '',
          result: String(text || '')
        });
      });


      lastAnchorEl = anchorEl || null;
      positionResultNearAnchor(lastAnchorEl);
    }

    /* ========================
       Positionnements
    ======================== */
    function positionBubbleNearSelection() {

      if (!bubbleAllowed) { clearBubble(); return; }

      const sel = window.getSelection && window.getSelection();
      if (!sel || !sel.rangeCount) { clearBubble(); return; }
      const range = sel.getRangeAt(0);
      const common = range.commonAncestorContainer;
      const node = common.nodeType === 1 ? common : common.parentNode;
      if (node && (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA')) { clearBubble(); return; }

      const text = getSelectionText();
      lastSelectedText = text || lastSelectedText;
      if (!text) { clearBubble(); return; }

      const rect = range.getBoundingClientRect();
      if (!rect || (rect.width === 0 && rect.height === 0)) { clearBubble(); return; }

      ensureBubble();

      bubbleEl.style.visibility = 'hidden';
      requestAnimationFrame(() => {
        const b = bubbleEl.getBoundingClientRect();
        const margin = 8;
        let top = rect.top + (rect.height - b.height) / 2;
        let left = rect.right + margin;
        const vw = document.documentElement.clientWidth;
        if (left + b.width + 8 > vw) left = Math.max(8, rect.left - b.width - margin);
        const minTop = 8, maxTop = document.documentElement.clientHeight - b.height - 8;
        top = Math.max(minTop, Math.min(maxTop, top));

        const saved = getSavedJSON(POS_BUBBLE_KEY);
        if (userDragged && saved && Number.isFinite(saved.top) && Number.isFinite(saved.left)) {
          bubbleHost.style.top = `${saved.top}px`; bubbleHost.style.left = `${saved.left}px`;
        } else {
          bubbleHost.style.top = `${Math.round(top)}px`; bubbleHost.style.left = `${Math.round(left)}px`;
        }
        bubbleEl.style.visibility = 'visible';
      });
    }

    function positionResultNearAnchor(anchorEl) {
      if (!anchorEl || !resultHost || !resultEl) return;

      // Si déjà pinnée par l’utilisateur, respecter sa position
      const pinned = sessionStorage.getItem(PIN_RESULT_KEY) === 'true';
      const saved = getSavedJSON(POS_RESULT_KEY);
      if (pinned && saved && Number.isFinite(saved.top) && Number.isFinite(saved.left)) {
        resultHost.style.top = `${saved.top}px`; resultHost.style.left = `${saved.left}px`;
        return;
      }

      const btnRect = anchorEl.getBoundingClientRect();
      // Positionner avant d'afficher (host était off-screen)
      const r = resultEl.getBoundingClientRect();
      const margin = 10;
      let top = btnRect.top - (r.height - btnRect.height) / 2;
      let left = btnRect.right + margin;
      const vw = document.documentElement.clientWidth;
      if (left + r.width + 8 > vw) left = btnRect.left - r.width - margin;
      const minTop = 8, maxTop = document.documentElement.clientHeight - r.height - 8;
      top = Math.max(minTop, Math.min(maxTop, top));
      resultHost.style.top = `${Math.round(top)}px`;
      resultHost.style.left = `${Math.round(left)}px`;
      // (elle est déjà visible; pas de flash)
    }

    function schedulePositioning() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (!userDragged) positionBubbleNearSelection();
        const pinned = sessionStorage.getItem(PIN_RESULT_KEY) === 'true';
        if (!pinned && lastAnchorEl && resultEl) positionResultNearAnchor(lastAnchorEl);
      });
    }

    /* ========================
       Events
    ======================== */
    document.addEventListener('mouseup', () => { userDragged = false; schedulePositioning(); }, true);
    document.addEventListener('keyup', () => { userDragged = false; schedulePositioning(); }, true);

    // Scrolling : on masque la bulle d’actions (mais PAS la carte-résultat)
    document.addEventListener('scroll', () => {
      if (hideTimeout) clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => { clearBubble(); }, 120);
    }, true);

    // Clic extérieur : on masque seulement la bulle d’actions
    document.addEventListener('mousedown', (e) => {
      const path = e.composedPath ? e.composedPath() : [];
      const insideBubble = bubbleHost && path.includes(bubbleHost);
      const insideResult = resultHost && path.includes(resultHost);
      if (!insideBubble && !insideResult) clearBubble();
    }, true);

    // ESC -> fermer la carte
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') clearResult(); }, true);

    // mémoriser la sélection (ChatGPT)
    document.addEventListener('selectionchange', () => {
      const t = getSelectionText(); if (t) lastSelectedText = t;
      schedulePositioning();
    });

    // messages runtime
    chrome.runtime.onMessage?.addListener((msg) => { if (msg?.type === 'ACCESSIAI_HIDE_BUBBLE') { clearBubble(); return; } });
    chrome.runtime.onMessage?.addListener((msg) => {
      if (msg?.type === 'ACCESSIAI_DO') {
        const cur = getSelectionText(); if (cur) lastSelectedText = cur;
        if (!bubbleEl) positionBubbleNearSelection();
        setTimeout(() => {
          const b = bubbleEl?.querySelector(`.btn[data-action="${msg.action}"]`);
          if (b) b.click();
        }, 0);
      }
    });

  })();
}
