'use strict';

// Текст общий для страницы и скачиваемого приглашения. Сборка не нужна.
const INVITATION = {
  originalPhoto: './assets/photo-original.jpg',
  polishedPhoto: './assets/photo-polished.png',
  togetherPhoto: window.INVITATION_TOGETHER_PHOTO,
  recipient: 'любимой Ане',
  date: '31 октября · ДР',
  location: 'Москва, Сколково',
  note: 'Ты сделаешь именинника счастливее.',
  playfulMoves: 4
};

(() => {
  const screens = [...document.querySelectorAll('[data-screen]')];
  const originalPhoto = document.getElementById('photo-original');
  const polishedPhoto = document.getElementById('photo-polished');
  const feedback = document.getElementById('photo-feedback');
  const live = document.getElementById('live-region');
  const arena = document.getElementById('button-arena');
  const yes = document.getElementById('answer-yes');
  const no = document.getElementById('answer-no');
  const skip = document.getElementById('skip-joke');
  const message = document.getElementById('play-message');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const moveLimit = Math.min(8, Math.max(1, Number(INVITATION.playfulMoves) || 4));
  const state = { screen: 'welcome', moves: 0, settled: false, lockedUntil: 0, hoverReadyAt: 0, lastPoint: null };
  let idleTimer;
  let totalTimer;
  let announceTimer;
  let keyboardMode = false;

  originalPhoto.src = INVITATION.originalPhoto;
  polishedPhoto.src = INVITATION.polishedPhoto;
  const togetherPhoto = new Image();
  togetherPhoto.src = INVITATION.togetherPhoto;
  document.getElementById('final-ticket-main').style.setProperty('--together-photo', `url("${INVITATION.togetherPhoto}")`);
  document.getElementById('invitation-recipient').textContent = INVITATION.recipient;
  document.getElementById('invitation-date').textContent = INVITATION.date;
  document.getElementById('invitation-location').textContent = INVITATION.location;
  document.getElementById('invitation-note').textContent = INVITATION.note;

  // Рисуем отдельный квиток, чтобы сохранить PNG без библиотек и сервера.
  function invitationImage() {
    const canvas = document.createElement('canvas');
    canvas.width = 1800;
    canvas.height = 1000;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is unavailable');
    const paper = '#f4eee4';
    const card = '#fbf7ef';
    const ink = '#342b2b';
    const cherry = '#843e4e';
    const line = '#d8cabc';
    const muted = '#81736e';

    function text(value, x, y, font, color = ink, align = 'left') {
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.textAlign = align;
      ctx.fillText(value, x, y);
    }

    function wrapped(value, x, y, width, font, color, lineHeight) {
      ctx.font = font;
      let row = '';
      for (const word of value.split(/\s+/)) {
        const next = row ? `${row} ${word}` : word;
        if (row && ctx.measureText(next).width > width) {
          text(row, x, y, font, color);
          y += lineHeight;
          row = word;
        } else row = next;
      }
      text(row, x, y, font, color);
    }

    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = card;
    ctx.fillRect(80, 80, 1640, 840);
    // Та же композиция, что на странице: общая фотография и бумага поверх неё.
    const photoX = 80 + 1340 * .26;
    const photoWidth = 1340 * .74;
    const scale = Math.max(photoWidth / togetherPhoto.naturalWidth, 840 / togetherPhoto.naturalHeight);
    const cropWidth = photoWidth / scale;
    const cropHeight = 840 / scale;
    ctx.drawImage(togetherPhoto,
      (togetherPhoto.naturalWidth - cropWidth) * .5,
      (togetherPhoto.naturalHeight - cropHeight) * .55,
      cropWidth, cropHeight, photoX, 80, photoWidth, 840);
    const photoWash = ctx.createLinearGradient(80, 0, 1420, 0);
    photoWash.addColorStop(0, card);
    photoWash.addColorStop(.28, 'rgba(251, 247, 239, .97)');
    photoWash.addColorStop(.54, 'rgba(251, 247, 239, .82)');
    photoWash.addColorStop(1, 'rgba(251, 247, 239, .38)');
    ctx.fillStyle = photoWash;
    ctx.fillRect(80, 80, 1340, 840);
    ctx.fillStyle = '#f3eadf';
    ctx.fillRect(1420, 80, 300, 840);
    ctx.strokeStyle = line;
    ctx.lineWidth = 2;
    ctx.strokeRect(80, 80, 1640, 840);
    ctx.setLineDash([10, 12]);
    ctx.beginPath();
    ctx.moveTo(1420, 80);
    ctx.lineTo(1420, 920);
    ctx.stroke();
    ctx.setLineDash([]);
    [80, 920].forEach(y => {
      ctx.beginPath();
      ctx.arc(1420, y, 24, 0, Math.PI * 2);
      ctx.fillStyle = paper;
      ctx.fill();
      ctx.stroke();
    });

    text('Приглашение', 170, 250, '82px Georgia, serif');
    wrapped(INVITATION.recipient, 170, 335, 1120, 'italic 62px Georgia, serif', cherry, 76);
    text('Когда', 170, 490, '36px sans-serif', muted);
    text(INVITATION.date, 365, 490, '45px sans-serif');
    text('Где', 170, 585, '36px sans-serif', muted);
    text(INVITATION.location, 365, 585, '45px sans-serif');
    ctx.beginPath();
    ctx.moveTo(170, 645);
    ctx.lineTo(1330, 645);
    ctx.stroke();
    wrapped(INVITATION.note, 170, 745, 1120, '50px Georgia, serif', ink, 68);

    text('МЕСТО РЯДОМ', 1570, 205, '24px sans-serif', muted, 'center');
    ctx.beginPath();
    ctx.moveTo(1570, 450);
    ctx.bezierCurveTo(1440, 360, 1510, 295, 1570, 355);
    ctx.bezierCurveTo(1630, 295, 1700, 360, 1570, 450);
    ctx.strokeStyle = cherry;
    ctx.lineWidth = 4;
    ctx.stroke();
    text('для тебя', 1570, 550, 'italic 48px Georgia, serif', cherry, 'center');
    ctx.fillStyle = ink;
    [0, 9, 18, 33, 42, 60, 72, 81, 96, 111, 120, 138].forEach((x, i) => {
      ctx.fillRect(1495 + x, 685, i % 3 === 0 ? 7 : 3, 125);
    });
    return canvas.toDataURL('image/png');
  }

  const download = document.getElementById('download-invitation');
  download.addEventListener('click', async () => {
    const error = document.getElementById('download-error');
    error.hidden = true;
    download.disabled = true;
    download.setAttribute('aria-busy', 'true');
    try {
      await togetherPhoto.decode();
      const link = document.createElement('a');
      link.href = invitationImage();
      link.download = 'priglashenie-dlya-ani.png';
      document.body.append(link);
      link.click();
      link.remove();
      announce('Браузер начал скачивание приглашения в PNG.');
    } catch {
      error.hidden = false;
    } finally {
      download.disabled = false;
      download.removeAttribute('aria-busy');
    }
  });

  function announce(text) {
    clearTimeout(announceTimer);
    live.textContent = '';
    announceTimer = setTimeout(() => { live.textContent = text; }, 60);
  }

  function clearDanceTimers() {
    clearTimeout(idleTimer);
    clearTimeout(totalTimer);
  }

  function showScreen(name, entryEvent) {
    clearDanceTimers();
    clearTimeout(announceTimer);
    live.textContent = '';
    state.screen = name;
    screens.forEach(screen => { screen.hidden = screen.dataset.screen !== name; });
    if (name === 'invite') prepareDance(entryEvent);
    const current = screens.find(screen => screen.dataset.screen === name);
    current.querySelector('h1').focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  // Координаты по ширине — доля свободного места, поэтому кнопки не выходят за билет.
  const poses = [
    [[0, 24, 0], [1, 24, 0]],
    [[1, 128, -5], [0, 74, 4]],
    [[0, 77, 4], [1, 12, -4]],
    [[1, 20, -3], [0, 143, 5]]
  ];

  function placeButtons() {
    const pose = state.settled ? poses[0] : poses[state.moves % poses.length];
    [yes, no].forEach((button, index) => {
      const [fraction, top, rotation] = pose[index];
      const left = Math.max(0, arena.clientWidth - button.offsetWidth) * fraction;
      button.style.left = `${left}px`;
      const maxTop = Math.max(0, arena.clientHeight - button.offsetHeight - 8);
      button.style.top = `${top / 143 * Math.min(143, maxTop)}px`;
      button.style.transform = `rotate(${rotation}deg)`;
    });
  }

  function settle(instant = false) {
    if (state.screen !== 'invite') return;
    clearDanceTimers();
    state.settled = true;
    // Клик во время возвращения кнопок не должен случайно выбрать другой ответ.
    state.lockedUntil = instant || reducedMotion.matches ? 0 : performance.now() + 650;
    arena.classList.add('has-moved');
    placeButtons();
    message.textContent = 'Всё, я собрался. Теперь выбор за тобой.';
    skip.textContent = 'Теперь без фокусов';
    skip.disabled = true;
    announce('Обе кнопки остановились. Можно выбрать любой ответ.');
  }

  function prepareDance(entryEvent) {
    state.moves = 0;
    // Курсор от выбора фото не считается новым подходом к кнопке.
    state.lastPoint = entryEvent && entryEvent.detail > 0
      ? { x: entryEvent.clientX, y: entryEvent.clientY }
      : null;
    state.lockedUntil = 0;
    state.hoverReadyAt = performance.now() + 750;
    state.settled = reducedMotion.matches || keyboardMode;
    arena.classList.toggle('has-moved', state.settled);
    skip.disabled = state.settled;
    skip.textContent = state.settled ? 'Теперь без фокусов' : 'Ладно, без фокусов';
    message.textContent = '';
    placeButtons();
  }

  function shuffle(trigger, event) {
    if (state.screen !== 'invite' || state.settled || performance.now() < state.lockedUntil) return;
    if (reducedMotion.matches || keyboardMode) { settle(true); return; }
    state.moves += 1;
    state.lastPoint = event ? { x: event.clientX, y: event.clientY } : null;
    arena.classList.add('has-moved');
    if (state.moves >= moveLimit) { settle(); return; }
    state.lockedUntil = performance.now() + 700;
    placeButtons();
    const lines = [
      trigger === 'yes' ? '«Приеду» просто застеснялась. Я её понимаю.' : 'Кажется, «Не приеду» куда-то торопится.',
      'Так. Это не я, это они волнуются.',
      trigger === 'yes' ? 'Ладно, ещё один глубокий вдох…' : 'А «Приеду» уже вернулась. Совпадение?'
    ];
    message.textContent = lines[(state.moves - 1) % lines.length];
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => settle(), 6500);
    if (state.moves === 1) totalTimer = setTimeout(() => settle(), 20000);
  }

  function choose(answer) {
    if (state.screen !== 'invite') return;
    clearDanceTimers();
    showScreen(answer);
  }

  document.getElementById('open-invitation').addEventListener('click', () => showScreen('photo'));

  document.querySelectorAll('[data-photo]').forEach(button => {
    button.addEventListener('click', event => {
      if (button.dataset.photo === 'original') {
        feedback.hidden = true;
        showScreen('invite', event);
        return;
      }
      feedback.hidden = false;
      announce('Красиво, конечно. Но этот мужчина на мой день рождения не приглашён. Попробуй ещё раз.');
      button.classList.remove('is-wrong');
      void button.offsetWidth;
      button.classList.add('is-wrong');
    });
  });

  arena.addEventListener('pointermove', event => {
    if (!finePointer.matches || event.pointerType !== 'mouse' || keyboardMode || state.settled || state.screen !== 'invite') return;
    if (performance.now() < Math.max(state.lockedUntil, state.hoverReadyAt)) return;
    if (state.lastPoint && Math.hypot(event.clientX - state.lastPoint.x, event.clientY - state.lastPoint.y) < 28) return;
    for (const button of [yes, no]) {
      const rect = button.getBoundingClientRect();
      const dx = Math.max(rect.left - event.clientX, 0, event.clientX - rect.right);
      const dy = Math.max(rect.top - event.clientY, 0, event.clientY - rect.bottom);
      if (Math.hypot(dx, dy) <= 10) { shuffle(button === yes ? 'yes' : 'no', event); break; }
    }
  });

  arena.addEventListener('pointerleave', () => { state.lastPoint = null; });

  [yes, no].forEach(button => {
    const answer = button === yes ? 'yes' : 'no';
    button.addEventListener('pointerdown', event => {
      if (state.screen !== 'invite' || state.settled) return;
      // На телефоне шутка запускается касанием. Этот же жест не отправляет ответ.
      event.preventDefault();
      shuffle(answer, event);
    });
    button.addEventListener('click', event => {
      if (event.detail === 0) { choose(answer); return; }
      if (performance.now() < state.lockedUntil) return;
      if (!state.settled) { shuffle(answer, event); return; }
      choose(answer);
    });
  });

  skip.addEventListener('click', () => settle());
  document.querySelectorAll('[data-restart]').forEach(button => {
    button.addEventListener('click', () => {
      feedback.hidden = true;
      document.querySelectorAll('.is-wrong').forEach(card => card.classList.remove('is-wrong'));
      showScreen('welcome');
    });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Tab') {
      keyboardMode = true;
      if (state.screen === 'invite' && !state.settled) settle(true);
    }
    if (event.key === 'Escape' && state.screen === 'invite') settle();
  });
  document.addEventListener('pointerdown', () => { keyboardMode = false; }, true);
  window.addEventListener('resize', () => { if (state.screen === 'invite') placeButtons(); });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches && state.screen === 'invite') settle(true);
  });
})();
