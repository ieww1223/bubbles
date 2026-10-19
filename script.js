/* =========================================================
   BUBBLE.OS — interactions
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // localStorage 安全包裝（無痕模式或被封鎖時不會報錯）
  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v === null ? fallback : JSON.parse(v);
      } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
    }
  };

  const pad = (n) => String(n).padStart(2, '0');

  /* ---------- 1. Boot ---------- */
  function boot() {
    const el = $('#boot');
    if (!el) return;
    let seen = false;
    try { seen = sessionStorage.getItem('bubble-booted') === '1'; } catch { /* ignore */ }
    if (reduceMotion || seen) { el.remove(); return; }

    const lines = [
      '> BUBBLE.OS v2.0.0',
      '> checking memory ..... OK',
      '> loading pastel.drv .. OK',
      '> signal ★★★★ found',
      '> hello :)'
    ];
    const log = $('#bootLog');
    const bar = $('#bootBar');
    let i = 0;

    const finish = () => {
      try { sessionStorage.setItem('bubble-booted', '1'); } catch { /* ignore */ }
      el.classList.add('is-done');
      setTimeout(() => el.remove(), 700);
    };
    const tick = () => {
      if (i < lines.length) {
        log.textContent += lines[i] + '\n';
        i += 1;
        bar.style.width = (i / lines.length) * 100 + '%';
        setTimeout(tick, 280);
      } else {
        setTimeout(finish, 350);
      }
    };
    tick();
  }

  /* ---------- 2. Clock ---------- */
  function clock() {
    const timeEl = $('#clock');
    const dateEl = $('#today');
    const update = () => {
      const d = new Date();
      timeEl.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
      if (dateEl) dateEl.textContent = `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
    };
    update();
    setInterval(update, 15000);
  }

  /* ---------- 3. Theme ---------- */
  function theme() {
    const root = document.documentElement;
    const btn = $('#themeBtn');
    const icon = $('.theme-btn__icon', btn);
    const meta = $('meta[name="theme-color"]');
    const systemNight = window.matchMedia('(prefers-color-scheme: dark)').matches;

    const apply = (mode) => {
      root.dataset.theme = mode;
      icon.textContent = mode === 'night' ? '☾' : '☀︎';
      meta.setAttribute('content', mode === 'night' ? '#0b1030' : '#bfe0ff');
    };
    apply(store.get('bubble-theme', systemNight ? 'night' : 'day'));

    btn.addEventListener('click', () => {
      const next = root.dataset.theme === 'night' ? 'day' : 'night';
      apply(next);
      store.set('bubble-theme', next);
    });
  }

  /* ---------- 4. Tabs + hash routing ---------- */
  function tabs() {
    const buttons = $$('.dock__btn');
    const screens = $$('.screen');
    const ids = screens.map((s) => s.id);

    const show = (id, push = true) => {
      if (!ids.includes(id)) id = 'home';
      screens.forEach((s) => {
        const on = s.id === id;
        s.hidden = !on;
        s.classList.toggle('is-active', on);
        if (on) s.scrollTop = 0;
      });
      buttons.forEach((b) => {
        const on = b.dataset.target === id;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-selected', String(on));
      });
      if (push && location.hash.slice(1) !== id) history.replaceState(null, '', '#' + id);
      // 通知其他模組（例如離開拍照頁時要關閉相機）
      document.dispatchEvent(new CustomEvent('screen:change', { detail: id }));
    };

    buttons.forEach((b) => b.addEventListener('click', () => show(b.dataset.target)));
    $$('[data-go]').forEach((b) => b.addEventListener('click', () => show(b.dataset.go)));
    window.addEventListener('hashchange', () => show(location.hash.slice(1), false));
    show(location.hash.slice(1) || 'home', false);
  }

  /* ---------- 5. Tap sparkles ---------- */
  function sparkles() {
    if (reduceMotion) return;
    const chars = ['✦', '✧', '★', '♡', '·'];
    const colors = ['var(--pink)', 'var(--sky)', 'var(--lime)'];
    document.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.sticker, input, textarea')) return;
      for (let i = 0; i < 6; i += 1) {
        const s = document.createElement('span');
        s.className = 'spark';
        s.textContent = chars[Math.floor(Math.random() * chars.length)];
        const angle = (Math.PI * 2 * i) / 6 + Math.random() * 0.5;
        const dist = 26 + Math.random() * 22;
        s.style.left = e.clientX + 'px';
        s.style.top = e.clientY + 'px';
        s.style.color = colors[i % colors.length];
        s.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
        s.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
        s.addEventListener('animationend', () => s.remove(), { once: true });
        document.body.appendChild(s);
      }
    });
  }

  /* ---------- 6. 8-bit music player (Web Audio) ---------- */
  // 音高使用 MIDI 編號（60 = 中央 C），null = 休止符。每個音符是 16 分音符。
  const TRACKS = [
    {
      title: 'Bubble Signal', artist: 'Pocket Club', bpm: 124, loops: 4,
      notes: [72, null, 76, 79, 81, null, 79, 76, 74, null, 76, 72, 69, null, 72, null,
              72, null, 76, 79, 84, null, 83, 81, 79, null, 76, 74, 76, null, null, null]
    },
    {
      title: 'Cloud Cassette', artist: 'Pocket Club', bpm: 100, loops: 4,
      notes: [67, 71, 74, 71, 76, null, 74, null, 72, 76, 79, 76, 81, null, 79, null,
              77, 76, 74, 72, 74, null, 71, null, 72, null, null, null, 67, null, null, null]
    },
    {
      title: 'Sticker Heart', artist: 'Pocket Club', bpm: 136, loops: 5,
      notes: [76, 76, null, 79, null, 81, 79, null, 76, null, 74, 76, null, 72, null, null,
              74, 74, null, 77, null, 79, 77, null, 76, null, 72, 74, null, 76, null, null]
    }
  ];

  function player() {
    const card = $('#player');
    const titleEl = $('#trackTitle');
    const artistEl = $('#trackArtist');
    const fill = $('#progressFill');
    const nowEl = $('#timeNow');
    const totalEl = $('#timeTotal');
    const playBtn = $('#playBtn');
    const list = $('#playlist');
    const bars = $$('.eq i');

    let ctx = null;
    let master = null;
    let current = 0;
    let step = 0;
    let timer = null;

    const stepSec = (t) => 60 / t.bpm / 4;
    const totalSteps = (t) => t.notes.length * t.loops;
    const duration = (t) => totalSteps(t) * stepSec(t);
    const fmt = (sec) => `${Math.floor(sec / 60)}:${pad(Math.floor(sec % 60))}`;
    const midiToFreq = (n) => 440 * Math.pow(2, (n - 69) / 12);

    // 播放清單
    TRACKS.forEach((t, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      const no = document.createElement('span');
      const name = document.createElement('span');
      const len = document.createElement('span');
      no.className = 'playlist__no'; no.textContent = pad(i + 1);
      name.className = 'playlist__name'; name.textContent = t.title;
      len.className = 'playlist__len'; len.textContent = fmt(duration(t));
      b.append(no, name, len);
      b.addEventListener('click', () => { load(i); play(); });
      li.appendChild(b);
      list.appendChild(li);
    });

    function ensureAudio() {
      if (ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.08; // 音量（0–1）
      master.connect(ctx.destination);
    }

    function blip(freq, len, type = 'square', vol = 1) {
      if (!ctx) return;
      const t0 = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + len);
      osc.connect(g).connect(master);
      osc.start(t0);
      osc.stop(t0 + len + 0.02);
    }

    function render() {
      const t = TRACKS[current];
      const elapsed = step * stepSec(t);
      fill.style.width = Math.min(100, (step / totalSteps(t)) * 100) + '%';
      nowEl.textContent = fmt(elapsed);
    }

    function load(i) {
      current = (i + TRACKS.length) % TRACKS.length;
      step = 0;
      const t = TRACKS[current];
      titleEl.textContent = t.title;
      artistEl.textContent = t.artist;
      totalEl.textContent = fmt(duration(t));
      $$('li', list).forEach((li, idx) => li.classList.toggle('is-current', idx === current));
      render();
      if (timer) { stop(); play(); }
    }

    function tick() {
      const t = TRACKS[current];
      const note = t.notes[step % t.notes.length];
      const sl = stepSec(t);
      if (note !== null) blip(midiToFreq(note), sl * 1.6, 'square', 1);
      // 簡單的低音：每 4 拍一個三角波
      if (step % 4 === 0) {
        const root = t.notes[(step - (step % 8)) % t.notes.length] || 60;
        blip(midiToFreq(root - 24), sl * 3, 'triangle', 1.4);
      }
      bars.forEach((b) => { b.style.height = (note === null ? 10 + Math.random() * 20 : 25 + Math.random() * 75) + '%'; });

      step += 1;
      render();
      if (step >= totalSteps(t)) { stop(); load(current + 1); play(); }
    }

    function play() {
      ensureAudio();
      if (ctx && ctx.state === 'suspended') ctx.resume();
      if (timer) return;
      timer = setInterval(tick, stepSec(TRACKS[current]) * 1000);
      card.classList.add('is-playing');
      playBtn.textContent = '❚❚';
      playBtn.setAttribute('aria-label', '暫停');
    }

    function stop() {
      clearInterval(timer);
      timer = null;
      card.classList.remove('is-playing');
      playBtn.textContent = '▶';
      playBtn.setAttribute('aria-label', '播放');
      bars.forEach((b) => { b.style.height = '20%'; });
    }

    playBtn.addEventListener('click', () => (timer ? stop() : play()));
    $('#prevBtn').addEventListener('click', () => load(current - 1));
    $('#nextBtn').addEventListener('click', () => load(current + 1));

    // 切到別的分頁或背景時暫停
    document.addEventListener('visibilitychange', () => { if (document.hidden && timer) stop(); });

    load(0);
  }

  /* ---------- 7. Draggable stickers ---------- */
  function stickers() {
    const board = $('#board');
    const items = $$('.sticker', board);
    const KEY = 'bubble-stickers';
    let saved = store.get(KEY, {});
    let z = 10;

    const place = (el, x, y) => {
      el.style.left = x + '%';
      el.style.top = y + '%';
    };
    const resetAll = () => items.forEach((el) => place(el, +el.dataset.x, +el.dataset.y));

    items.forEach((el) => {
      const pos = saved[el.dataset.id];
      if (pos) place(el, pos.x, pos.y); else place(el, +el.dataset.x, +el.dataset.y);

      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        el.setPointerCapture(e.pointerId);
        el.classList.add('is-dragging');
        el.style.zIndex = ++z;
        const rect = board.getBoundingClientRect();
        const r = el.getBoundingClientRect();
        const offX = e.clientX - r.left;
        const offY = e.clientY - r.top;

        const move = (ev) => {
          const maxX = rect.width - r.width;
          const maxY = rect.height - r.height;
          const px = Math.max(0, Math.min(maxX, ev.clientX - rect.left - offX));
          const py = Math.max(0, Math.min(maxY, ev.clientY - rect.top - offY));
          place(el, (px / rect.width) * 100, (py / rect.height) * 100);
        };
        const up = () => {
          el.classList.remove('is-dragging');
          el.removeEventListener('pointermove', move);
          saved[el.dataset.id] = { x: parseFloat(el.style.left), y: parseFloat(el.style.top) };
          store.set(KEY, saved);
        };
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerup', up, { once: true });
        el.addEventListener('pointercancel', up, { once: true });
      });
    });

    $('#stickerReset').addEventListener('click', () => {
      saved = {};
      store.set(KEY, saved);
      resetAll();
    });
  }

  /* ---------- 8. Guestbook ---------- */
  function memo() {
    const form = $('#memoForm');
    const list = $('#memoList');
    const empty = $('#memoEmpty');
    const counter = $('#memoCount');
    const KEY = 'bubble-memo';
    const MAX = 30;
    let items = store.get(KEY, []);
    if (!Array.isArray(items)) items = [];

    const fmtTime = (ts) => {
      const d = new Date(ts);
      return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    function render() {
      list.textContent = '';
      items.forEach((m) => {
        const li = document.createElement('li');
        li.className = 'card memo-item';

        const head = document.createElement('div');
        head.className = 'memo-item__head';
        const name = document.createElement('span');
        name.className = 'memo-item__name';
        name.textContent = '♡ ' + m.name;
        const time = document.createElement('span');
        time.className = 'memo-item__time';
        time.textContent = fmtTime(m.ts);
        const del = document.createElement('button');
        del.className = 'memo-item__del';
        del.type = 'button';
        del.textContent = '✕';
        del.setAttribute('aria-label', '刪除這則留言');
        del.addEventListener('click', () => {
          items = items.filter((x) => x.ts !== m.ts);
          store.set(KEY, items);
          render();
        });
        head.append(name, time, del);

        const msg = document.createElement('p');
        msg.className = 'memo-item__msg';
        msg.textContent = m.msg; // textContent：不解析 HTML，避免 XSS

        li.append(head, msg);
        list.appendChild(li);
      });
      empty.hidden = items.length > 0;
    }

    form.msg.addEventListener('input', () => {
      counter.textContent = `${form.msg.value.length} / 80`;
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = form.name.value.trim().slice(0, 16);
      const msg = form.msg.value.trim().slice(0, 80);
      if (!name || !msg) return;
      items.unshift({ name, msg, ts: Date.now() });
      items = items.slice(0, MAX);
      store.set(KEY, items);
      form.msg.value = '';
      counter.textContent = '0 / 80';
      render();
    });

    render();
  }

  /* ---------- 9. Photo booth（大頭貼機） ---------- */
  function photo() {
    const vf = $('#viewfinder');
    const video = $('#camVideo');
    const still = $('#camStill');
    const idle = $('#camIdle');
    const msg = $('#camMsg');
    const countEl = $('#camCount');
    const flashEl = $('#camFlash');
    const shotEl = $('#shotCount');
    const statusEl = $('#camStatus');
    const shutter = $('#shutter');
    const upload = $('#camUpload');
    const result = $('#result');
    const resultImg = $('#resultImg');
    const saveBtn = $('#saveBtn');
    const avatarBtn = $('#avatarBtn');
    const avatarReset = $('#avatarReset');
    const avatarEl = $('.avatar');
    const stripChip = $('[data-opt="mode"][data-value="strip"]');
    const DEFAULT_MSG = msg.textContent;
    const AVATAR_KEY = 'bubble-avatar';

    const opts = { mode: 'strip', filter: 'none', frame: 'star' };

    // 邊框主題：底色、描邊色、貼紙字元與顏色
    const THEMES = {
      star:  { bg: '#bfe0ff', ink: '#1d2a6b', deco: ['✦', '★', '✧'], colors: ['#fff1a8', '#d4ff5e', '#ffffff'] },
      heart: { bg: '#ffc8e4', ink: '#1d2a6b', deco: ['♡', '♥', '✦'], colors: ['#ffffff', '#ff7ec0', '#fff1a8'] },
      cloud: { bg: '#fffaf0', ink: '#1d2a6b', deco: ['☁︎', '✿', '✧'], colors: ['#c8e6ff', '#ffc8e4', '#9fd0ff'] }
    };

    let stream = null;
    let source = null;   // 'cam'（相機）| 'still'（上傳的照片）| null
    let session = 0;     // 離開頁面時 +1，用來中斷進行中的拍攝
    let busy = false;
    let lastShots = [];
    let resultURL = null;
    let stillURL = null;
    let actx = null;

    const wait = (ms) => new Promise((r) => setTimeout(r, ms));

    /* 快門與倒數音效 */
    function beep(freq, len) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        if (!actx) actx = new AC();
        if (actx.state === 'suspended') actx.resume();
        const t0 = actx.currentTime;
        const osc = actx.createOscillator();
        const g = actx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0.06, t0);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + len);
        osc.connect(g).connect(actx.destination);
        osc.start(t0);
        osc.stop(t0 + len + 0.02);
      } catch { /* ignore */ }
    }

    function setStatus(text, live = false) {
      statusEl.textContent = '● ' + text;
      statusEl.classList.toggle('is-live', live);
    }

    function setOpt(key, value) {
      opts[key] = value;
      vf.dataset[key] = value;
      $$(`[data-opt="${key}"]`).forEach((c) => {
        const on = c.dataset.value === value;
        c.classList.toggle('is-on', on);
        c.setAttribute('aria-checked', String(on));
      });
    }

    function stopStream() {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      stream = null;
      video.srcObject = null;
    }

    function resetBooth() {
      session += 1;
      busy = false;
      stopStream();
      source = null;
      if (stillURL) { URL.revokeObjectURL(stillURL); stillURL = null; }
      still.hidden = true;
      still.removeAttribute('src');
      video.hidden = false;
      idle.hidden = false;
      countEl.textContent = '';
      shotEl.textContent = '';
      msg.textContent = DEFAULT_MSG;
      shutter.disabled = true;
      stripChip.disabled = false;
      setStatus('OFF');
    }

    /* 開相機 */
    async function startCam() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        msg.textContent = '這個網址或瀏覽器不能使用相機（需要 https）。可以改用上傳照片。';
        return;
      }
      const my = session;
      msg.textContent = '等待相機權限…';
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false
        });
        if (my !== session) { s.getTracks().forEach((t) => t.stop()); return; }
        stopStream();
        stream = s;
        video.srcObject = s;
        await video.play().catch(() => {});
        source = 'cam';
        still.hidden = true;
        video.hidden = false;
        idle.hidden = true;
        stripChip.disabled = false;
        shutter.disabled = false;
        setStatus('LIVE', true);
      } catch (err) {
        msg.textContent = err && err.name === 'NotAllowedError'
          ? '相機權限被拒絕了。可以到瀏覽器設定允許相機，或改用上傳照片。'
          : '找不到可以用的相機，可以改用上傳照片。';
      }
    }

    /* 上傳照片（沒有相機時的備案，只支援單張） */
    function useUpload() {
      const file = upload.files && upload.files[0];
      upload.value = '';
      if (!file || !file.type.startsWith('image/')) return;
      stopStream();
      if (stillURL) URL.revokeObjectURL(stillURL);
      stillURL = URL.createObjectURL(file);
      still.onload = () => {
        source = 'still';
        still.hidden = false;
        video.hidden = true;
        idle.hidden = true;
        setOpt('mode', 'single');
        stripChip.disabled = true;
        shutter.disabled = false;
        setStatus('PHOTO');
      };
      still.onerror = () => { msg.textContent = '這張圖片打不開，換一張試試。'; };
      still.src = stillURL;
    }

    /* 以「填滿裁切」的方式把畫面畫進格子 */
    function drawCover(ctx, el, sw, sh, w, h, mirror) {
      const sr = sw / sh;
      const dr = w / h;
      let sx = 0, sy = 0, cw = sw, ch = sh;
      if (sr > dr) { cw = sh * dr; sx = (sw - cw) / 2; } else { ch = sw / dr; sy = (sh - ch) / 2; }
      ctx.save();
      if (mirror) { ctx.translate(w, 0); ctx.scale(-1, 1); }
      ctx.drawImage(el, sx, sy, cw, ch, 0, 0, w, h);
      ctx.restore();
    }

    /* 逐像素濾鏡（不依賴 ctx.filter，Safari 也能用） */
    function applyFilter(ctx, w, h, type) {
      if (type === 'none') return;
      const img = ctx.getImageData(0, 0, w, h);
      const d = img.data; // Uint8ClampedArray：超出 0–255 會自動截斷
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        if (type === 'pink') {
          d[i] = r * 0.92 + 40; d[i + 1] = g * 0.88 + 22; d[i + 2] = b * 0.9 + 38;
        } else if (type === 'mono') {
          const l = (0.299 * r + 0.587 * g + 0.114 * b - 128) * 1.15 + 128;
          d[i] = d[i + 1] = d[i + 2] = l;
        } else if (type === 'retro') {
          const n = (Math.random() - 0.5) * 24; // 底片顆粒
          const sr = 0.393 * r + 0.769 * g + 0.189 * b;
          const sg = 0.349 * r + 0.686 * g + 0.168 * b;
          const sb = 0.272 * r + 0.534 * g + 0.131 * b;
          d[i]     = (sr * 0.6 + r * 0.4) * 0.85 + 28 + n;
          d[i + 1] = (sg * 0.6 + g * 0.4) * 0.85 + 28 + n;
          d[i + 2] = (sb * 0.6 + b * 0.4) * 0.85 + 28 + n;
        } else if (type === 'blue') {
          d[i] = r * 0.85 + 10; d[i + 1] = g * 0.95 + 20; d[i + 2] = b * 0.95 + 45;
        }
      }
      ctx.putImageData(img, 0, 0);
    }

    function capture(w, h) {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      if (source === 'cam') {
        if (!video.videoWidth) return null;
        drawCover(ctx, video, video.videoWidth, video.videoHeight, w, h, true);
      } else if (source === 'still') {
        drawCover(ctx, still, still.naturalWidth, still.naturalHeight, w, h, false);
      } else {
        return null;
      }
      applyFilter(ctx, w, h, opts.filter);
      return c;
    }

    function roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    /* 畫一個有深藍描邊的貼紙字元 */
    function sticker(ctx, ch, x, y, size, color, ink) {
      ctx.save();
      ctx.font = `${size}px "Noto Sans TC", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(4, size / 7);
      ctx.strokeStyle = ink;
      ctx.strokeText(ch, x, y);
      ctx.fillStyle = color;
      ctx.fillText(ch, x, y);
      ctx.restore();
    }

    /* 把拍到的照片合成成一張大頭貼 */
    async function compose(shots) {
      const t = THEMES[opts.frame];
      const n = shots.length;
      const cw = shots[0].width;
      const ch = shots[0].height;
      const P = 20;   // 外邊距
      const G = 16;   // 格子間距
      const F = 130;  // 底部標籤高度
      const W = cw + P * 2;
      const H = P + n * ch + (n - 1) * G + F;

      try {
        await Promise.all([document.fonts.load('700 36px Silkscreen'), document.fonts.load('28px VT323')]);
      } catch { /* 字體載不到就用備用字體 */ }

      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const ctx = c.getContext('2d');

      // 底色 + 圓點花紋
      ctx.fillStyle = t.bg;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(29, 42, 107, 0.08)';
      for (let y = 13; y < H; y += 26) {
        for (let x = 13; x < W; x += 26) {
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 每一格照片 + 貼紙
      shots.forEach((shot, i) => {
        const x = P;
        const y = P + i * (ch + G);
        ctx.save();
        roundRect(ctx, x, y, cw, ch, 14);
        ctx.clip();
        ctx.drawImage(shot, x, y);
        ctx.restore();
        roundRect(ctx, x, y, cw, ch, 14);
        ctx.lineWidth = 4;
        ctx.strokeStyle = t.ink;
        ctx.stroke();
        sticker(ctx, t.deco[i % 3], x + 30, y + 30, 44, t.colors[0], t.ink);
        sticker(ctx, t.deco[(i + 1) % 3], x + cw - 34, y + ch - 32, 38, t.colors[1], t.ink);
        sticker(ctx, t.deco[(i + 2) % 3], x + cw - 30, y + 34, 26, t.colors[2], t.ink);
      });

      // 底部標籤
      const d = new Date();
      const dateStr = `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
      const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
      const fy = H - F;
      ctx.fillStyle = t.ink;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.font = '700 36px Silkscreen, monospace';
      ctx.fillText('BUBBLE.OS', W / 2, fy + 62);
      ctx.font = '28px VT323, monospace';
      ctx.fillText(`${dateStr}  ★  PHOTO BOOTH`, W / 2, fy + 98);
      sticker(ctx, t.deco[0], 44, fy + 52, 40, t.colors[0], t.ink);
      sticker(ctx, t.deco[1], W - 44, fy + 52, 40, t.colors[1], t.ink);

      return { canvas: c, stamp };
    }

    function showResult(c, stamp, single) {
      c.toBlob((blob) => {
        if (!blob) return;
        if (resultURL) URL.revokeObjectURL(resultURL);
        resultURL = URL.createObjectURL(blob);
        resultImg.src = resultURL;
        resultImg.classList.toggle('is-single', single);
        saveBtn.href = resultURL;
        saveBtn.download = `bubble-os-${stamp}.png`;
        result.hidden = false;
        result.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      }, 'image/png');
    }

    async function countdown(my) {
      for (let s = 3; s > 0; s -= 1) {
        if (my !== session) return false;
        countEl.textContent = String(s);
        countEl.classList.remove('pop');
        void countEl.offsetWidth; // 重新觸發動畫
        countEl.classList.add('pop');
        beep(880, 0.08);
        await wait(800);
      }
      countEl.textContent = '';
      return my === session;
    }

    function flash() {
      flashEl.classList.remove('on');
      void flashEl.offsetWidth;
      flashEl.classList.add('on');
      beep(1320, 0.05);
      setTimeout(() => beep(1760, 0.08), 60);
    }

    async function shoot() {
      if (busy || !source) return;
      busy = true;
      const my = session;
      shutter.disabled = true;
      const n = source === 'cam' && opts.mode === 'strip' ? 4 : 1;
      const [w, h] = n === 4 ? [480, 360] : [480, 600];
      const shots = [];

      for (let i = 0; i < n; i += 1) {
        shotEl.textContent = n > 1 ? `${i + 1} / ${n}` : '';
        if (source === 'cam' && !(await countdown(my))) return;
        if (my !== session) return;
        flash();
        const shot = capture(w, h);
        if (shot) shots.push(shot);
        await wait(n > 1 ? 600 : 200);
      }
      if (my !== session) return;
      shotEl.textContent = '';

      if (shots.length) {
        lastShots = shots;
        const { canvas, stamp } = await compose(shots);
        if (my === session) showResult(canvas, stamp, n === 1);
      }
      busy = false;
      shutter.disabled = !source;
    }

    /* 頭像：只接受自己產生的 data URL，避免被塞入奇怪的 CSS */
    const isAvatarURL = (u) => typeof u === 'string' && /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(u);

    function applyAvatar(url) {
      if (!avatarEl) return;
      if (isAvatarURL(url)) {
        avatarEl.style.backgroundImage = `url("${url}")`;
        avatarEl.classList.add('has-photo');
        avatarReset.hidden = false;
      } else {
        avatarEl.style.backgroundImage = '';
        avatarEl.classList.remove('has-photo');
        avatarReset.hidden = true;
      }
    }

    function setAvatarFromShot() {
      const src = lastShots[0];
      if (!src) return;
      const s = Math.min(src.width, src.height);
      const c = document.createElement('canvas');
      c.width = 240;
      c.height = 240;
      c.getContext('2d').drawImage(src, (src.width - s) / 2, (src.height - s) / 2, s, s, 0, 0, 240, 240);
      const url = c.toDataURL('image/jpeg', 0.85);
      store.set(AVATAR_KEY, url);
      applyAvatar(url);
      avatarBtn.textContent = '已設定 ✓';
      setTimeout(() => { avatarBtn.textContent = '設為頭像'; }, 1500);
    }

    /* 事件 */
    $$('[data-opt]').forEach((chip) => chip.addEventListener('click', () => {
      if (chip.disabled || busy) return;
      setOpt(chip.dataset.opt, chip.dataset.value);
    }));
    $('#camStart').addEventListener('click', startCam);
    upload.addEventListener('change', useUpload);
    shutter.addEventListener('click', shoot);
    $('#retakeBtn').addEventListener('click', () => {
      result.hidden = true;
      vf.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    });
    avatarBtn.addEventListener('click', setAvatarFromShot);
    avatarReset.addEventListener('click', () => {
      store.set(AVATAR_KEY, null);
      applyAvatar(null);
    });

    // 離開拍照頁或切到背景時關相機（綠燈會熄滅）
    document.addEventListener('screen:change', (e) => {
      if (e.detail !== 'photo' && (source || busy)) resetBooth();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && source === 'cam') resetBooth();
    });

    applyAvatar(store.get(AVATAR_KEY, null));
    setStatus('OFF');
  }

  /* ---------- Init ---------- */
  boot();
  clock();
  theme();
  tabs();
  sparkles();
  player();
  stickers();
  memo();
  photo();
})();
