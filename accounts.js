(() => {
  'use strict';
  const D = window.Desk, S = D.state, e = D.esc, i = D.icon;
  const storageKey = 'meetspace-windows-v1';
  const clone = value => JSON.parse(JSON.stringify(value));
  const globalKeys = new Set(['accounts', 'activeAccountId', 'recentlyDeletedAccount']);
  let transitioning = false;

  function snapshot(source = S, endCall = false) {
    const data = clone(Object.fromEntries(Object.entries(source).filter(([key]) => !globalKeys.has(key))));
    if (endCall) {
      data.call = {};
      if (data.personalCall) {data.personalCall.active = false; data.personalCall.sharing = false;}
    }
    return data;
  }
  if (!Array.isArray(S.accounts)) {
    S.activeAccountId = 'account-primary';
    S.accounts = [{id: S.activeAccountId, primary: true, createdAt: Date.now(), data: snapshot()}];
  }
  if (!S.accounts.length) S.activeAccountId = null;
  const active = () => S.accounts.find(account => account.id === S.activeAccountId);
  function emptyState() {
    return {...D.newAccountState(), screen:'settings', theme:S.theme, profile:{name:'Нет аккаунта', email:'', status:''}, serverUrl:'https://meetspace.team', meetings:[], folders:[], messages:{}, customChats:[]};
  }
  const profile = account => account.id === S.activeAccountId ? S.profile : account.data.profile;
  const server = account => account.id === S.activeAccountId ? S.serverUrl : account.data.serverUrl || 'https://meetspace.team';
  const initials = name => name.trim().split(/\s+/).slice(0, 2).map(part => part[0] || '').join('');
  const avatar = account => D.avatar(initials(profile(account).name), account.id === S.activeAccountId ? 'blue' : 'green');
  const serverLabel = account => server(account).replace(/^https?:\/\//, '').replace(/\/$/, '');
  const baseSave = D.save;
  D.save = () => {
    if (transitioning) return false;
    const account = active();
    if (account) account.data = snapshot();
    return baseSave();
  };

  // Reload all modules so their cached preferences and chat references belong to the chosen account.
  function commit(accounts, targetId, deleted = S.recentlyDeletedAccount || null, reload = false) {
    if (transitioning) return false;
    const target = accounts.find(account => account.id === targetId);
    if (targetId !== null && !target) return false;
    if (targetId === null && accounts.length) return false;
    const data = target ? (targetId === S.activeAccountId ? snapshot(S, reload) : snapshot(target.data, true)) : emptyState();
    if (target) target.data = data;
    const payload = {...data, accounts, activeAccountId: targetId, recentlyDeletedAccount: deleted};
    try {localStorage.setItem(storageKey, JSON.stringify(payload));}
    catch {D.toast('Не удалось сохранить аккаунты. Освободите локальное хранилище и повторите.'); return false;}
    if (reload) {
      transitioning = true;
      clearInterval(D.callTimer);
      const url = new URL(location.href);
      url.search = new URLSearchParams({screen: 'settings', theme: data.theme || 'light', settingsTab: 'accounts'});
      location.replace(url.href);
    } else {
      S.accounts = accounts;
      S.recentlyDeletedAccount = deleted;
      D.closeModal();
      D.render();
    }
    return true;
  }
  function switchAccount(id) {
    if (id === S.activeAccountId) {D.closeModal(); return;}
    const accounts = clone(S.accounts);
    const current = accounts.find(account => account.id === S.activeAccountId);
    if (current) current.data = snapshot(S, true);
    commit(accounts, id, S.recentlyDeletedAccount || null, true);
  }

  D.accountSwitcher = () => active() ? `<div class="account-current-switch"><div class="account-current-identity">${avatar(active())}<div><strong>${e(S.profile.name)}</strong><small>Активный аккаунт · ${e(S.profile.email)} · ${e(serverLabel(active()))}</small></div></div><button class="btn btn-secondary" data-action="account-picker">${i('ChevronsUpDown')} Сменить аккаунт</button></div>` : '';
  D.accountsContent = () => `<div class="account-settings-heading"><div><h2>Аккаунты</h2><p>Переключайтесь между аккаунтами. У каждого — свой профиль, настройки и переписки.</p></div><button class="btn btn-primary" data-action="account-add">${i('Plus')} Добавить аккаунт</button></div>${S.recentlyDeletedAccount ? `<div class="account-undo" role="status"><span>Аккаунт «${e(S.recentlyDeletedAccount.data.profile.name)}» удалён.</span><button class="btn btn-small btn-soft" data-action="account-restore">Восстановить</button></div>` : ''}<div class="account-list">${S.accounts.map(account => `<article class="account-card ${account.id === S.activeAccountId ? 'is-active' : ''}"><div class="account-card-main">${avatar(account)}<div class="account-card-copy"><h3>${e(profile(account).name)}</h3><p>${e(profile(account).email)}</p><small>${e(serverLabel(account))}</small></div></div><div class="account-card-actions">${account.id === S.activeAccountId ? `<span class="badge blue">${i('Check')} Активный</span>` : `<button class="btn btn-secondary" data-action="account-switch" data-id="${e(account.id)}" aria-label="Переключиться на аккаунт ${e(profile(account).name)}">Переключиться</button>`}<button class="btn btn-secondary account-delete-button" data-action="account-delete" data-id="${e(account.id)}" aria-label="Удалить аккаунт ${e(profile(account).name)}" title="Удалить аккаунт">${i('Trash2')}Удалить</button></div></article>`).join('')}</div><p class="account-overview-note">${i('Info')}<span>Аккаунты сохраняются на этом устройстве. Настройки в соседних разделах относятся к активному аккаунту.</span></p>`;

  function openPicker() {
    D.openModal('Сменить аккаунт', `<div class="account-picker">${S.accounts.map(account => `<button class="account-picker-item ${account.id === S.activeAccountId ? 'is-active' : ''}" data-action="account-switch" data-id="${e(account.id)}" aria-pressed="${account.id === S.activeAccountId}" aria-label="Аккаунт ${e(profile(account).name)}">${avatar(account)}<span><strong>${e(profile(account).name)}</strong><small>${e(profile(account).email)} · ${e(serverLabel(account))}</small></span>${account.id === S.activeAccountId ? `<span class="badge blue">Активный</span>` : i('ChevronRight')}</button>`).join('')}<button class="btn btn-secondary" data-action="account-add">${i('Plus')} Добавить аккаунт</button></div>`);
  }
  function openAdd(serverUrl = S.serverUrl) {
    if (typeof serverUrl !== 'string') serverUrl = S.serverUrl;
    D.openModal('Добавить аккаунт', `<form id="account-add-form" class="account-form"><label class="field">Имя и фамилия<input name="name" required maxlength="60" autocomplete="name" placeholder="Например, Мария Орлова"></label><label class="field">Электронная почта<input name="email" type="email" required maxlength="254" autocomplete="email" placeholder="name@company.ru"></label><label class="field">Адрес сервера<input name="server" type="url" required maxlength="500" value="${e(serverUrl)}" placeholder="https://meetspace.team"></label><p class="account-form-hint">В макете создаётся локальный аккаунт. После добавления вы сразу переключитесь на него.</p><p class="account-form-error" role="alert"></p><div class="modal-actions"><button type="button" class="btn btn-secondary" data-action="close-modal">Отмена</button><button type="submit" class="btn btn-primary">Добавить и переключиться</button></div></form>`);
  }
  D.openAccountAdd = serverUrl => openAdd(serverUrl);
  function openDelete(id) {
    const account = S.accounts.find(item => item.id === id);
    if (!account) return;
    const remaining = S.accounts.filter(item => item.id !== id);
    const next = remaining[0];
    const effect = id !== S.activeAccountId ? 'Текущий аккаунт останется активным.' : next ? `Вы переключитесь на аккаунт «${profile(next).name}».` : 'Подключённых аккаунтов не останется. Вы сможете добавить новый или восстановить удалённый.';
    D.openModal('Удалить аккаунт?', `<p class="modal-note">Аккаунт и его данные будут убраны из этого макета на устройстве. ${e(effect)} Последнее удаление можно отменить в разделе «Аккаунты».</p><div class="account-delete-person">${avatar(account)}<div><strong>${e(profile(account).name)}</strong><p>${e(profile(account).email)}</p><small>${e(serverLabel(account))}</small></div></div><div class="modal-actions"><button class="btn btn-secondary" data-action="close-modal">Отмена</button><button class="btn btn-danger" data-action="account-delete-confirm" data-id="${e(id)}">Удалить аккаунт</button></div>`);
  }
  Object.assign(D.handlers, {
    'account-picker': openPicker,
    'account-add': openAdd,
    'account-switch': button => switchAccount(button.dataset.id),
    'account-delete': button => openDelete(button.dataset.id),
    'account-delete-confirm': button => {
      const account = S.accounts.find(item => item.id === button.dataset.id);
      if (!account) return;
      const removed = clone(account);
      if (removed.id === S.activeAccountId) removed.data = snapshot(S, true);
      const accounts = clone(S.accounts.filter(item => item.id !== removed.id));
      const targetId = removed.id === S.activeAccountId ? (accounts[0]?.id ?? null) : S.activeAccountId;
      commit(accounts, targetId, removed, targetId !== S.activeAccountId);
    },
    'account-restore': () => {
      const removed = S.recentlyDeletedAccount;
      if (!removed || S.accounts.some(account => account.id === removed.id)) return;
      const targetId = active() ? S.activeAccountId : removed.id;
      if (commit([...clone(S.accounts), clone(removed)], targetId, null, targetId !== S.activeAccountId)) D.toast('Аккаунт восстановлен');
    }
  });

  const normalizeServer = value => {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('server');
    return url.href.replace(/\/$/, '');
  };
  document.addEventListener('submit', event => {
    const form = event.target;
    if (form.id !== 'account-add-form') return;
    event.preventDefault();
    if (!form.reportValidity()) return;
    const fields = new FormData(form), name = String(fields.get('name')).trim(), email = String(fields.get('email')).trim();
    const error = message => {form.querySelector('.account-form-error').textContent = message;};
    if (!name) {error('Введите имя и фамилию.'); return;}
    let serverUrl;
    try {serverUrl = normalizeServer(String(fields.get('server')).trim());}
    catch {error('Укажите адрес HTTP или HTTPS без логина и пароля.'); return;}
    if (S.accounts.some(account => {
      let address; try {address = normalizeServer(server(account));} catch {address = server(account);}
      return profile(account).email.toLowerCase() === email.toLowerCase() && address === serverUrl;
    })) {error('Аккаунт с этой почтой на этом сервере уже добавлен. Выберите его в списке аккаунтов.'); return;}
    const data = D.newAccountState();
    data.profile = {name, email, status: 'В сети'};
    data.serverUrl = serverUrl;
    data.screen = 'settings';
    const account = {id: 'account-' + (globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2)), primary: false, createdAt: Date.now(), data};
    const accounts = clone(S.accounts);
    const current = accounts.find(item => item.id === S.activeAccountId);
    if (current) current.data = snapshot(S, true);
    accounts.push(account);
    commit(accounts, account.id, S.recentlyDeletedAccount || null, true);
  });

  const baseSettings = D.screens.settings, baseGo = D.go, baseRender = D.render;
  D.screens.settings = () => active() ? baseSettings() : `<section class="accounts-empty-page"><div class="accounts-empty-card"><img class="accounts-empty-brand" src="assets/brand-mark.svg" alt=""><h1>Нет подключённых аккаунтов</h1><p>Добавьте аккаунт, чтобы вернуться к встречам, чатам и настройкам.</p>${S.recentlyDeletedAccount ? `<div class="account-undo" role="status"><span>Аккаунт «${e(S.recentlyDeletedAccount.data.profile.name)}» удалён.</span><button class="btn btn-small btn-soft" data-action="account-restore">Восстановить</button></div>` : ''}<button class="btn btn-primary" data-action="account-add">${i('Plus')}Добавить аккаунт</button></div></section>`;
  function showEmptyAccounts() {
    S.screen = 'settings';
    const url = new URL(location.href);
    url.search = new URLSearchParams({screen:'settings', theme:S.theme || 'light', settingsTab:'accounts'});
    history.replaceState({}, '', url.href);
  }
  const isPublicScreen = screen => ['onboarding', 'installer'].includes(screen);
  if (!active() && !isPublicScreen(S.screen)) showEmptyAccounts();
  D.go = screen => {if (!active() && !isPublicScreen(screen)) {showEmptyAccounts(); screen = 'settings';} return baseGo(screen);};
  D.render = () => {
    document.documentElement.dataset.accountSession = active() ? 'active' : 'empty';
    if (!active() && !isPublicScreen(S.screen)) S.screen = 'settings';
    return baseRender();
  };
  document.addEventListener('keydown', event => {
    if (!active() && (event.ctrlKey || event.metaKey) && ['k','n'].includes(event.key.toLowerCase())) {
      event.preventDefault(); event.stopImmediatePropagation();
    }
  }, true);

  // Another open window must not save the previous account after a switch.
  window.addEventListener('storage', event => {
    if (event.key !== storageKey || !event.newValue) return;
    try {
      const stored = JSON.parse(event.newValue);
      if (stored.activeAccountId !== S.activeAccountId) {
        transitioning = true;
        const url = new URL(location.href);
        url.search = new URLSearchParams({screen: 'settings', settingsTab: 'accounts', theme: stored.theme || 'light'});
        location.replace(url.href);
      } else {
        S.accounts = stored.accounts || S.accounts;
        S.recentlyDeletedAccount = stored.recentlyDeletedAccount || null;
      }
    } catch {}
  });
  if (S.accounts.length && !active()) commit(clone(S.accounts), S.accounts[0].id, S.recentlyDeletedAccount || null, true);
  else D.save();
})();
