/* ============================================================
   CODETESTER V2.0 — app.js
   Handles both landing page (index.html) and editor (home.html)
============================================================ */

/* ---- detect which page we're on ---- */
const IS_EDITOR  = document.body.classList.contains('editor-page');
const IS_LANDING = document.body.classList.contains('landing-page');

/* ============================================================
   LANDING PAGE LOGIC
============================================================ */
if (IS_LANDING) {
  fetch('config.json')
    .then(r => r.json())
    .then(cfg => {
      renderFeatures(cfg.features || []);
      renderFiles(cfg.supported_files || []);
    })
    .catch(() => {
      // fallback inline data if config fails
      renderFeatures([
        { icon:'⚡', label:'Instant Run',       desc:'Zero build step. Hit Run and see results immediately.' },
        { icon:'📁', label:'Multi-file',         desc:'HTML, CSS, JS, JSON, and Python in one session.' },
        { icon:'🪟', label:'Live Preview',       desc:'Side-by-side editor and preview, resizable to your flow.' },
        { icon:'📟', label:'Console Panel',      desc:'Capture logs, warnings, and errors right below the preview.' },
        { icon:'🔒', label:'No account needed',  desc:'Lite by design. No login, no cloud save, just code.' },
        { icon:'🎨', label:'Glass UI',            desc:'Crafted for focus — blur, depth, calm dark aesthetics.' },
      ]);
      renderFiles(['html','css','js','json','py']);
    });

  function renderFeatures(features) {
    const grid = document.getElementById('featuresGrid');
    if (!grid) return;
    features.forEach((f, i) => {
      const card = document.createElement('div');
      card.className = 'feature-card';
      card.style.animationDelay = `${i * 0.07}s`;
      card.style.animation = `fadeUpCard 0.5s cubic-bezier(0.22,1,0.36,1) ${i*0.07}s both`;
      card.innerHTML = `
        <div class="fc-icon">${f.icon}</div>
        <div class="fc-label">${f.label}</div>
        <div class="fc-desc">${f.desc}</div>
      `;
      grid.appendChild(card);
    });

    // inject keyframe if not already done
    if (!document.getElementById('fadekf')) {
      const st = document.createElement('style');
      st.id = 'fadekf';
      st.textContent = `@keyframes fadeUpCard { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }`;
      document.head.appendChild(st);
    }
  }

  const FILE_META = {
    html: { color:'#e96c3b', name:'HTML5'   },
    css:  { color:'#38b8ff', name:'CSS3'    },
    js:   { color:'#f0da4a', name:'JavaScript' },
    json: { color:'#a0e87c', name:'JSON'    },
    py:   { color:'#4ebeff', name:'Python (preview)' },
  };

  function renderFiles(files) {
    const row = document.getElementById('filesRow');
    if (!row) return;
    files.forEach(ext => {
      const meta = FILE_META[ext] || { color:'#fff', name: ext.toUpperCase() };
      const badge = document.createElement('div');
      badge.className = 'file-badge';
      badge.innerHTML = `
        <div class="fb-dot" style="background:${meta.color};box-shadow:0 0 8px ${meta.color}66"></div>
        <div>
          <div class="fb-ext">.${ext}</div>
          <div class="fb-name">${meta.name}</div>
        </div>
      `;
      row.appendChild(badge);
    });
  }
}

/* ============================================================
   EDITOR PAGE LOGIC
============================================================ */
if (IS_EDITOR) {

  /* ---- FILE COLOR MAP ---- */
  const FILE_COLORS = {
    html:'#e96c3b', css:'#38b8ff', js:'#f0da4a',
    json:'#a0e87c', py:'#4ebeff', txt:'#aaa',
  };

  function extColor(name) {
    const ext = name.split('.').pop().toLowerCase();
    return FILE_COLORS[ext] || '#aaaaaa';
  }

  /* ---- DEFAULT TEMPLATES ---- */
  const TEMPLATES = {
    'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>My Page</title>
</head>
<body>

  <h1>Hello, World!</h1>
  <p>Edit the code then press <strong>Run</strong>.</p>
  <button id="btn">Click me</button>

</body>
</html>`,
    'style.css': `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Segoe UI', sans-serif;
  background: #f0f0f0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 16px;
  padding: 20px;
}

h1 {
  font-size: 2.5rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: #1a1a1a;
}

p { color: #666; }

#btn {
  padding: 10px 24px;
  background: #6e58ff;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: transform 0.15s;
}
#btn:hover { transform: translateY(-2px); }`,
    'script.js': `const btn = document.getElementById('btn');
let count = 0;

btn.addEventListener('click', () => {
  count++;
  btn.textContent = \`Clicked \${count}x\`;
  console.log('Count:', count);
});

console.log('Ready!');`,
  };

  /* ---- STATE ---- */
  let files = {};        // { name: content }
  let activeFile = null;
  let logCount = 0;

  /* ---- DOM REFS ---- */
  const fileTabs      = document.getElementById('fileTabs');
  const sidebarFiles  = document.getElementById('sidebarFiles');
  const lineNumbers   = document.getElementById('lineNumbers');
  const codeTextarea  = document.getElementById('codeTextarea');
  const previewFrame  = document.getElementById('previewFrame');
  const previewEmpty  = document.getElementById('previewEmpty');
  const statusDot     = document.getElementById('statusDot');
  const consoleBody   = document.getElementById('consoleBody');
  const logBadge      = document.getElementById('logBadge');
  const editorPane    = document.getElementById('editorPane');
  const outputPane    = document.getElementById('outputPane');
  const hDivider      = document.getElementById('hDivider');
  const previewPane   = document.getElementById('previewPane');
  const consolePane   = document.getElementById('consolePane');
  const vDivider      = document.getElementById('vDivider');
  const flashBar      = document.getElementById('flashBar');
  const addFileModal  = document.getElementById('addFileModal');

  /* ============================================================
     INIT
  ============================================================ */
  function init() {
    loadFiles();
    renderSidebar();
    renderTabs();
    if (activeFile) switchFile(activeFile);
    setupDividers();
    setupEvents();
    setupConsoleRelay();
  }

  /* ---- LOAD FILES ---- */
  function loadFiles() {
    // No localStorage save — lite, testing only
    // Just init with defaults
    files = {
      'index.html': TEMPLATES['index.html'],
      'style.css':  TEMPLATES['style.css'],
      'script.js':  TEMPLATES['script.js'],
    };
    activeFile = 'index.html';
  }

  /* ---- SAVE CURRENT TEXTAREA ---- */
  function saveActive() {
    if (activeFile) files[activeFile] = codeTextarea.value;
  }

  /* ---- SWITCH FILE ---- */
  function switchFile(name) {
    saveActive();
    activeFile = name;
    codeTextarea.value = files[name] || '';
    updateLineNums();
    codeTextarea.focus();
    renderSidebar();
    renderTabs();
  }

  /* ---- RENDER SIDEBAR ---- */
  function renderSidebar() {
    sidebarFiles.innerHTML = '';
    Object.keys(files).forEach(name => {
      const item = document.createElement('div');
      item.className = 'sidebar-file-item' + (name === activeFile ? ' active' : '');
      item.innerHTML = `
        <div class="sfi-dot" style="background:${extColor(name)}"></div>
        <span class="sfi-name" title="${name}">${name}</span>
        <button class="sfi-del" data-del="${name}" title="Remove file">✕</button>
      `;
      item.querySelector('.sfi-name').addEventListener('click', () => switchFile(name));
      item.querySelector('.sfi-del').addEventListener('click', e => {
        e.stopPropagation();
        removeFile(name);
      });
      sidebarFiles.appendChild(item);
    });
  }

  /* ---- RENDER TABS ---- */
  function renderTabs() {
    fileTabs.innerHTML = '';
    Object.keys(files).forEach(name => {
      const tab = document.createElement('div');
      tab.className = 'file-tab' + (name === activeFile ? ' active' : '');
      tab.innerHTML = `
        <div class="ft-indicator" style="background:${extColor(name)}"></div>
        <span>${name}</span>
        <button class="ft-close" data-del="${name}">✕</button>
      `;
      tab.querySelector('span').addEventListener('click', () => switchFile(name));
      tab.querySelector('.ft-close').addEventListener('click', e => {
        e.stopPropagation();
        removeFile(name);
      });
      fileTabs.appendChild(tab);
    });
  }

  /* ---- ADD / REMOVE FILE ---- */
  function addFile(name, content) {
    if (!name) return;
    // clean name
    name = name.trim().replace(/\s+/g, '-');
    if (!name.includes('.')) name += '.html';
    files[name] = content || getDefaultContent(name);
    renderSidebar();
    renderTabs();
    switchFile(name);
  }

  function removeFile(name) {
    if (Object.keys(files).length <= 1) return; // keep at least 1 file
    delete files[name];
    if (activeFile === name) {
      activeFile = Object.keys(files)[0];
      codeTextarea.value = files[activeFile];
      updateLineNums();
    }
    renderSidebar();
    renderTabs();
  }

  function getDefaultContent(name) {
    const ext = name.split('.').pop().toLowerCase();
    if (ext === 'html') return `<!DOCTYPE html>\n<html>\n<head><title>${name}</title></head>\n<body>\n\n</body>\n</html>`;
    if (ext === 'css')  return `/* ${name} */\n`;
    if (ext === 'js')   return `// ${name}\n`;
    if (ext === 'json') return `{\n  \n}`;
    if (ext === 'py')   return `# ${name}\n# Note: Python runs as preview only (no execution)\n`;
    return ``;
  }

  /* ---- LINE NUMBERS ---- */
  function updateLineNums() {
    const n = codeTextarea.value.split('\n').length;
    lineNumbers.innerHTML = Array.from({ length: n }, (_, i) =>
      `<span class="ln-num">${i + 1}</span>`
    ).join('');
    syncLineScroll();
  }

  function syncLineScroll() {
    lineNumbers.scrollTop = codeTextarea.scrollTop;
  }

  /* ============================================================
     RUN PREVIEW
  ============================================================ */
  function runPreview() {
    saveActive();

    // Flash bar animation
    flashBar.style.width = '0%';
    requestAnimationFrame(() => {
      flashBar.style.transition = 'width 0.38s cubic-bezier(0.22,1,0.36,1)';
      flashBar.style.width = '100%';
    });
    setTimeout(() => { flashBar.style.width = '0%'; flashBar.style.transition = 'width 0.1s'; }, 450);

    statusDot.className = 'status-dot loading';
    clearConsole(false);

    // Build combined document from all files
    const html   = getFileByExt('html') || '<html><body></body></html>';
    const css    = Object.entries(files)
      .filter(([n]) => n.endsWith('.css'))
      .map(([, v]) => v).join('\n');
    const js     = Object.entries(files)
      .filter(([n]) => n.endsWith('.js'))
      .map(([, v]) => v).join('\n');

    // console shim injected into iframe
    const SHIM = `<script>
(function(){
  const _p = function(lvl, args) {
    const msg = Array.from(args).map(a => {
      try { return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a); }
      catch(e) { return '[unserializable]'; }
    }).join(' ');
    window.parent.postMessage({ type:'__ct_log', level:lvl, msg }, '*');
  };
  ['log','info','warn','error'].forEach(m => {
    const o = console[m].bind(console);
    console[m] = function(){ _p(m, arguments); o.apply(console, arguments); };
  });
  window.addEventListener('error', e => {
    window.parent.postMessage({ type:'__ct_err', msg: e.message + ' (line ' + e.lineno + ')' }, '*');
  });
  window.addEventListener('unhandledrejection', e => {
    window.parent.postMessage({ type:'__ct_err', msg: 'Unhandled: ' + e.reason }, '*');
  });
})();
<\/script>`;

    let doc = html;

    // inject CSS
    if (css) {
      const styleEl = `<style>\n${css}\n</style>`;
      if (/<\/head>/i.test(doc)) doc = doc.replace(/<\/head>/i, `${styleEl}\n</head>`);
      else doc = styleEl + '\n' + doc;
    }

    // inject JS + shim
    if (js || true) {
      const scriptEl = `${SHIM}<script>\n${js}\n<\/script>`;
      if (/<\/body>/i.test(doc)) doc = doc.replace(/<\/body>/i, `${scriptEl}\n</body>`);
      else doc += '\n' + scriptEl;
    }

    // short delay for perceived accuracy, then render
    const delay = 200 + Math.random() * 200; // 200-400ms (fast but not instant)
    setTimeout(() => {
      try {
        previewFrame.srcdoc = doc;
        previewFrame.classList.add('visible');
        previewEmpty.style.display = 'none';
        statusDot.className = 'status-dot ok';
      } catch (e) {
        statusDot.className = 'status-dot error';
        addLog('error', 'Preview build failed: ' + e.message);
      }
    }, delay);
  }

  function getFileByExt(ext) {
    const entry = Object.entries(files).find(([n]) => n.endsWith('.' + ext));
    return entry ? entry[1] : null;
  }

  /* ============================================================
     CONSOLE
  ============================================================ */
  function setupConsoleRelay() {
    window.addEventListener('message', e => {
      if (!e.data) return;
      if (e.data.type === '__ct_log') addLog(e.data.level, e.data.msg);
      if (e.data.type === '__ct_err') {
        addLog('error', e.data.msg);
        statusDot.className = 'status-dot error';
      }
    });
  }

  const LEVEL_ICONS = { log:'›', info:'ℹ', warn:'⚠', error:'✕' };

  function addLog(level, msg) {
    const placeholder = consoleBody.querySelector('.console-placeholder');
    if (placeholder) placeholder.remove();

    const entry = document.createElement('div');
    entry.className = `console-entry level-${level}`;
    entry.innerHTML = `<span class="ce-icon">${LEVEL_ICONS[level] || '›'}</span><span class="ce-msg">${escHtml(msg)}</span>`;
    consoleBody.appendChild(entry);
    consoleBody.scrollTop = consoleBody.scrollHeight;

    logCount++;
    logBadge.textContent = logCount;
    logBadge.classList.add('show');
  }

  function clearConsole(resetCount = true) {
    consoleBody.innerHTML = '<div class="console-placeholder">// output appears here</div>';
    if (resetCount) {
      logCount = 0;
      logBadge.classList.remove('show');
    }
  }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  /* ============================================================
     DIVIDERS (resizable)
  ============================================================ */
  function setupDividers() {
    // H-divider: editor width vs output width
    let draggingH = false, startX = 0, startEdW = 0;

    hDivider.addEventListener('mousedown', e => {
      draggingH = true;
      startX   = e.clientX;
      startEdW = editorPane.offsetWidth;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });
    document.addEventListener('mousemove', e => {
      if (!draggingH) return;
      const dx = e.clientX - startX;
      const totalW = editorPane.parentElement.offsetWidth - hDivider.offsetWidth;
      const newEdW = Math.max(200, Math.min(totalW - 200, startEdW + dx));
      const newOutW = totalW - newEdW;
      editorPane.style.flex = 'none';
      editorPane.style.width = newEdW + 'px';
      outputPane.style.flex = 'none';
      outputPane.style.width = newOutW + 'px';
    });
    document.addEventListener('mouseup', () => {
      if (draggingH) { draggingH = false; document.body.style.cursor = ''; document.body.style.userSelect = ''; }
    });

    // V-divider: preview height vs console height
    let draggingV = false, startY = 0, startPH = 0;

    vDivider.addEventListener('mousedown', e => {
      draggingV = true;
      startY  = e.clientY;
      startPH = previewPane.offsetHeight;
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    });
    document.addEventListener('mousemove', e => {
      if (!draggingV) return;
      const dy = e.clientY - startY;
      const totalH = outputPane.offsetHeight - vDivider.offsetHeight;
      const newPH = Math.max(80, Math.min(totalH - 80, startPH + dy));
      previewPane.style.flex = 'none';
      previewPane.style.height = newPH + 'px';
      consolePane.style.flex = 'none';
      consolePane.style.height = (totalH - newPH) + 'px';
    });
    document.addEventListener('mouseup', () => {
      if (draggingV) { draggingV = false; document.body.style.cursor = ''; document.body.style.userSelect = ''; }
    });
  }

  /* ============================================================
     ADD FILE MODAL
  ============================================================ */
  function openAddFileModal() {
    addFileModal.classList.add('open');
    document.getElementById('newFileName').focus();
    document.getElementById('newFileName').value = '';
  }
  function closeAddFileModal() {
    addFileModal.classList.remove('open');
  }

  // File type chip auto-fill
  let selectedExt = 'html';
  document.querySelectorAll('.ft-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.ft-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      selectedExt = chip.dataset.ext;
      const input = document.getElementById('newFileName');
      const base = input.value.replace(/\.[^.]+$/, '') || 'new-file';
      input.value = base + '.' + selectedExt;
    });
  });

  document.getElementById('addFileBtn').addEventListener('click', openAddFileModal);
  document.getElementById('closeModal').addEventListener('click', closeAddFileModal);
  document.getElementById('cancelModal').addEventListener('click', closeAddFileModal);
  addFileModal.addEventListener('click', e => { if (e.target === addFileModal) closeAddFileModal(); });

  document.getElementById('confirmAddFile').addEventListener('click', () => {
    const name = document.getElementById('newFileName').value.trim();
    if (name) { addFile(name); closeAddFileModal(); }
  });
  document.getElementById('newFileName').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('confirmAddFile').click();
    if (e.key === 'Escape') closeAddFileModal();
  });

  /* ============================================================
     EVENTS
  ============================================================ */
  function setupEvents() {
    // Run
    document.getElementById('btnRun').addEventListener('click', runPreview);

    // Refresh
    document.getElementById('btnRefresh').addEventListener('click', runPreview);

    // Fullscreen preview
    document.getElementById('btnFullscreen').addEventListener('click', () => {
      const fs = previewPane.classList.toggle('fs-preview');
      if (!fs) {
        // restore layout
        previewPane.style.height = '';
        previewPane.style.flex = '';
      }
      document.getElementById('btnFullscreen').title = fs ? 'Exit fullscreen' : 'Fullscreen';
    });

    // Clear console
    document.getElementById('btnClearConsole').addEventListener('click', () => clearConsole(true));

    // Textarea
    codeTextarea.addEventListener('input', () => {
      files[activeFile] = codeTextarea.value;
      updateLineNums();
    });

    codeTextarea.addEventListener('scroll', syncLineScroll);

    codeTextarea.addEventListener('keydown', e => {
      // Ctrl/Cmd + Enter = Run
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        runPreview();
        return;
      }

      // Tab = 2-space indent
      if (e.key === 'Tab') {
        e.preventDefault();
        const s = codeTextarea.selectionStart;
        const v = codeTextarea.value;
        if (e.shiftKey) {
          const ls = v.lastIndexOf('\n', s - 1) + 1;
          if (v.substring(ls, ls + 2) === '  ') {
            codeTextarea.value = v.slice(0, ls) + v.slice(ls + 2);
            codeTextarea.selectionStart = codeTextarea.selectionEnd = Math.max(ls, s - 2);
          }
        } else {
          codeTextarea.value = v.slice(0, s) + '  ' + v.slice(codeTextarea.selectionEnd);
          codeTextarea.selectionStart = codeTextarea.selectionEnd = s + 2;
        }
        files[activeFile] = codeTextarea.value;
        updateLineNums();
        return;
      }

      // Auto-close brackets
      const PAIRS = { '(':')', '[':']', '{':'}', '"':'"', "'":"'" };
      if (PAIRS[e.key]) {
        e.preventDefault();
        const s = codeTextarea.selectionStart, end = codeTextarea.selectionEnd;
        const sel = codeTextarea.value.slice(s, end);
        const ins = e.key + sel + PAIRS[e.key];
        document.execCommand('insertText', false, ins);
        codeTextarea.selectionStart = codeTextarea.selectionEnd = s + 1;
        files[activeFile] = codeTextarea.value;
        updateLineNums();
      }

      // Escape closes fullscreen
      if (e.key === 'Escape' && previewPane.classList.contains('fs-preview')) {
        previewPane.classList.remove('fs-preview');
        previewPane.style.height = '';
        previewPane.style.flex = '';
      }
    });
  }

  /* ---- KICK OFF ---- */
  init();
}
