(() => {
  'use strict';
  const D = window.Desk, S = D.state, E = D.esc, I = D.icon;
  let timer;
  const contact = id => D.chats.find(chat => chat.id === id && !chat.group);
  const fallbackContact = () => contact('max') || D.chats.find(chat => !chat.group);
  const initials = name => name.trim().split(/\s+/).map(part => part[0]).slice(0, 2).join('');
  function duration() {
    const seconds = Math.max(0, Math.floor((Date.now() - (S.personalCall?.connectedAt || Date.now())) / 1000));
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }
  function createCall(person, options = {}) {
    S.personalCall = {chatId:person.id, active:true, startedAt:Date.now(), connectedAt:Date.now() + 1400, connected:false, mic:options.mic ?? true, camera:options.camera ?? false, sharing:false};
    return S.personalCall;
  }
  function ensureCall() {
    const person = contact(S.chat) || fallbackContact();
    if (!S.personalCall?.active || S.personalCall.chatId !== person.id) {
      createCall(person);
      S.chat = person.id;
      D.save();
    }
    return {session:S.personalCall, person};
  }
  D.startPersonalCall = (id, options = {}) => {
    const person = contact(id);
    if (!person) return;
    if (!S.personalCall?.active || S.personalCall.chatId !== id) createCall(person, options);
    S.chat = id;
    D.go('personal-call');
  };
  function control(action, glyph, label, enabled, extra = '') {
    return `<button type="button" class="personal-call-control ${enabled ? 'is-on' : 'is-off'} ${extra}" data-action="${action}" aria-label="${label}" ${enabled === null ? '' : `aria-pressed="${enabled}"`}><span>${I(glyph)}</span><small>${label}</small></button>`;
  }
  function peer(person, session, compact = false) {
    return `<section class="personal-call-peer ${compact ? 'compact' : ''}" aria-label="Собеседник"><div class="personal-call-avatar">${E(person.initials || initials(person.name))}</div><h2>${E(person.name)}</h2><p class="personal-call-status" role="status">${session.connected ? 'На связи' : 'Вы звоните…'}</p><p class="personal-call-camera-note">${I('VideoOff')}<span>${session.connected ? 'Камера собеседника выключена' : 'Ожидаем ответа собеседника'}</span></p></section>`;
  }
  D.screens['personal-call'] = () => {
    const {session:c, person} = ensureCall();
    return `<section class="personal-call-room"><header class="personal-call-header"><div class="personal-call-heading"><button class="personal-call-back" data-action="personal-call-minimize" aria-label="Свернуть звонок и открыть переписку" title="Вернуться в чат">${I('ChevronDown')}</button><div><h1>Личный звонок</h1><p>${I('LockKeyhole')}<span>${c.connected ? 'Соединение установлено' : 'Соединяем вас с собеседником'}</span></p></div></div><div class="personal-call-timer">${I('Phone')}<time class="personal-call-clock">${duration()}</time></div></header><main class="personal-call-stage ${c.sharing ? 'sharing' : ''}">${c.sharing ? `<div class="personal-call-share"><div class="personal-call-share-preview">${I('MonitorUp')}<h2>Вы демонстрируете экран</h2><p>Демонстрация в макете</p><button class="personal-call-stop-share" data-action="personal-call-share">Остановить демонстрацию</button></div></div>${peer(person, c, true)}` : peer(person, c)}<aside class="personal-call-self ${c.camera ? 'camera-on' : ''}" aria-label="Ваше окно"><span class="personal-call-self-camera" title="${c.camera ? 'Камера включена в демо' : 'Камера выключена'}">${I(c.camera ? 'Video' : 'VideoOff')}</span><div class="personal-call-self-avatar">${E(initials(S.profile.name))}</div>${c.camera ? '<span class="personal-call-self-demo">Камера · демо</span>' : ''}<div class="personal-call-self-caption"><strong>Вы</strong><span aria-label="${c.mic ? 'Микрофон включён' : 'Микрофон выключен'}">${I(c.mic ? 'Mic' : 'MicOff')}</span></div></aside></main><footer class="personal-call-footer"><p class="personal-call-caption">Разговор один на один <span>· Демо</span></p><div class="personal-call-controls">${control('personal-call-mic', c.mic ? 'Mic' : 'MicOff', 'Микрофон', c.mic)}${control('personal-call-camera', c.camera ? 'Video' : 'VideoOff', 'Камера', c.camera)}${control('personal-call-share', 'MonitorUp', 'Экран', c.sharing)}${control('personal-call-end', 'PhoneOff', 'Завершить', null, 'personal-call-end')}</div></footer></section>`;
  };
  D.personalCallBanner = () => {
    const c = S.personalCall, person = contact(c?.chatId);
    if (!c?.active || !person) return '';
    return `<aside class="personal-call-resume-banner" aria-label="Текущий личный звонок"><div>${I('Phone')}<strong>${E(person.name)}</strong><time class="personal-call-clock">${duration()}</time></div><button class="personal-call-resume-button" data-action="personal-call-resume">Вернуться к звонку</button><button class="personal-call-banner-end" data-action="personal-call-end" aria-label="Завершить звонок" title="Завершить звонок">${I('PhoneOff')}</button></aside>`;
  };
  function toggle(key, action) {
    if (!S.personalCall?.active) return;
    S.personalCall[key] = !S.personalCall[key];
    D.save(); D.render();
    document.querySelector(`.personal-call-control[data-action="${action}"]`)?.focus();
  }
  Object.assign(D.handlers, {
    'personal-call-mic': () => toggle('mic', 'personal-call-mic'),
    'personal-call-camera': () => {toggle('camera', 'personal-call-camera'); if (S.personalCall.camera) D.toast('Камера включена в макете. Устройство не используется.');},
    'personal-call-share': () => {toggle('sharing', 'personal-call-share'); if (S.personalCall.sharing) D.toast('Демонстрация в макете. Экран устройства не передаётся.');},
    'personal-call-minimize': () => {S.chat = S.personalCall.chatId; D.go('chats');},
    'personal-call-resume': () => {if (S.personalCall?.active) {S.chat = S.personalCall.chatId; D.go('personal-call');}},
    'personal-call-end': () => {
      const c = S.personalCall;
      if (!c?.active) return;
      const length = duration();
      c.active = false; c.sharing = false; c.endedAt = Date.now();
      clearInterval(timer);
      S.chat = c.chatId;
      D.go('chats');
      D.toast(`Звонок завершён · ${length}`);
    }
  });
  function tick() {
    const c = S.personalCall;
    if (!c?.active) return;
    if (!c.connected && Date.now() >= c.connectedAt) {
      c.connected = true; D.save();
      if (S.screen === 'personal-call') {D.render(); return;}
    }
    document.querySelectorAll('.personal-call-clock').forEach(clock => {clock.textContent = duration();});
  }
  document.addEventListener('desk:render', () => {
    clearInterval(timer);
    if (S.personalCall?.active) {timer = setInterval(tick, 1000); tick();}
  });
  document.addEventListener('keydown', event => {
    if (S.screen !== 'personal-call' || event.ctrlKey || event.metaKey || event.altKey || event.repeat || event.target.closest('input,textarea,select,[contenteditable="true"]') || document.querySelector('.modal')) return;
    const action = {m:'personal-call-mic', v:'personal-call-camera'}[event.key.toLowerCase()];
    if (action) {event.preventDefault(); D.handlers[action]();}
  });
  const originalInit = D.init;
  D.init = () => {
    const url = new URL(location.href), legacyId = url.searchParams.get('meeting') || (S.call?.personal ? S.call.meetingId : null);
    if (['prejoin', 'call'].includes(S.screen) && contact(legacyId)) {
      S.screen = 'personal-call'; S.chat = legacyId;
      url.searchParams.set('screen', 'personal-call'); url.searchParams.set('chat', legacyId); url.searchParams.delete('meeting');
      history.replaceState({}, '', url);
    }
    if (S.screen === 'personal-call') {
      S.chat = (contact(S.chat) || fallbackContact()).id;
      url.searchParams.set('screen', 'personal-call'); url.searchParams.set('chat', S.chat); url.searchParams.delete('meeting');
      history.replaceState({}, '', url);
    }
    if (['call', 'prejoin'].includes(S.screen) && S.personalCall?.active) {
      S.personalCall.active = false;
      S.personalCall.sharing = false;
      D.save();
    }
    originalInit();
  };
})();
