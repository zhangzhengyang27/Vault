/* AI 讲解员 · 本地知识库 + 流式打字 + 语音播报 */
(function () {
  const D = window.DUNHUANG;

  function normalize(s) { return (s || '').toLowerCase().replace(/\s+/g, ''); }

  function match(input) {
    const q = normalize(input);
    let best = null, bestScore = 0;
    D.tutor.forEach(function (item) {
      let score = 0;
      item.k.forEach(function (kw) {
        const k = normalize(kw);
        if (k && q.indexOf(k) >= 0) score += k.length >= 2 ? 2 : 1;
      });
      if (item.q && q.indexOf(normalize(item.q)) >= 0) score += 3;
      if (score > bestScore) { bestScore = score; best = item; }
    });
    if (best && bestScore >= 2) return best.a;
    /* 章节相关性二次检索 */
    const ch = D.chapters.find(function (c) {
      return c.keywords.some(function (kw) { const k = normalize(kw); return k && q.indexOf(k) >= 0; });
    });
    if (ch) {
      return '关于「' + ch.title + '」——' + ch.summary + ' 你可以点击课程章节中的第 ' + ch.num + ' 讲深入学习，也可以在语音播报按钮处听我朗读讲稿。';
    }
    return '我是本课程的敦煌讲解员，目前基于内置专题知识库回答问题。你可以问我莫高窟的开凿、经变画、飞天、藏经洞、敦煌遗书、斯坦因与伯希和、敦煌研究院等话题。试试点击下方或输入关键词，比如「什么是经变」「三兔共耳」。';
  }

  function speak(text) {
    try {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'zh-CN';
      u.rate = 0.98;
      const voices = speechSynthesis.getVoices();
      const zh = voices.find(v => /zh|cmn|Chinese/i.test(v.lang));
      if (zh) u.voice = zh;
      speechSynthesis.speak(u);
    } catch (e) {}
  }

  window.initTutor = function () {
    if (document.getElementById('tutorWidget')) return;

    const chips = ['什么是经变', '飞天是什么', '藏经洞怎么发现的', '三兔共耳', '敦煌研究院'];

    const el = document.createElement('div');
    el.className = 'tutor-widget';
    el.id = 'tutorWidget';
    el.innerHTML =
      '<div class="tutor-avatar" id="tutorAvatar" title="AI 讲解员">' +
        '<img src="assets/images/avatar.png" alt="AI讲解员" onerror="imgFallback(this,\'讲解员\')"><span class="ring"></span></div>' +
      '<div class="tutor-panel" id="tutorPanel">' +
        '<div class="tutor-head"><img src="assets/images/avatar.png" alt="" onerror="this.style.opacity=0">' +
          '<div><div class="t-name">敦煌讲解员 · 妙音</div><div class="t-sub">课程知识问答</div></div>' +
          '<button class="close" id="tutorClose">×</button></div>' +
        '<div class="tutor-msgs" id="tutorMsgs"></div>' +
        '<div class="tutor-chips" id="tutorChips">' + chips.map(c => '<button>'+c+'</button>').join('') + '</div>' +
        '<div class="tutor-input">' +
          '<input id="tutorInput" placeholder="输入课程问题…" />' +
          '<button class="voice" id="tutorSpeak" title="语音播报">🔊</button>' +
          '<button id="tutorSend">发送</button></div>' +
      '</div>';
    document.body.appendChild(el);

    const avatar = $('#tutorAvatar'), panel = $('#tutorPanel'), msgs = $('#tutorMsgs');
    const input = $('#tutorInput');

    function open() { panel.classList.add('open'); greet(); }
    function close() { panel.classList.remove('open'); speechSynthesis && speechSynthesis.cancel(); }
    avatar.addEventListener('click', function () { panel.classList.contains('open') ? close() : open(); });
    $('#tutorClose').addEventListener('click', close);

    let greeted = false;
    function greet() {
      if (greeted) return;
      greeted = true;
      append('bot', '你好，我是「妙音」。我是这门《敦煌艺术与丝路文明》的 AI 讲解员，只围绕这门课的内容回答。有问题尽管问我。');
    }

    function append(role, text, typing) {
      const msg = document.createElement('div');
      msg.className = 't-msg ' + role;
      msgs.appendChild(msg);
      msgs.scrollTop = msgs.scrollHeight;
      if (typing) typeText(msg, text, role === 'bot');
      else msg.textContent = text;
      msgs.scrollTop = msgs.scrollHeight;
      return msg;
    }

    function typeText(el, text, isBot) {
      let i = 0;
      const cursor = isBot ? '<span class="cursor"></span>' : '';
      function step() {
        i++;
        el.innerHTML = text.slice(0, i) + (i < text.length ? cursor : '');
        msgs.scrollTop = msgs.scrollHeight;
        if (i < text.length) setTimeout(step, 18);
      }
      step();
      return el;
    }

    function ask(q) {
      if (!q || !q.trim()) return;
      const userText = q.trim();
      append('user', userText);
      input.value = '';
      const ans = match(userText);
      setTimeout(function () { append('bot', ans, true); }, 260);
    }

    $('#tutorSend').addEventListener('click', function () { ask(input.value); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') ask(input.value); });
    $('#tutorChips').addEventListener('click', function (e) {
      if (e.target.tagName === 'BUTTON') ask(e.target.textContent);
    });
    $('#tutorSpeak').addEventListener('click', function () {
      const last = msgs.lastElementChild;
      if (last && last.classList.contains('bot')) speak(last.textContent.replace(/[🔊✕]/g, ''));
    });
  };
})();