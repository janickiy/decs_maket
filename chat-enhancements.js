(() => {
  'use strict';
  const D = window.Desk, S = D.state, e = D.esc, i = D.icon;
  const messages = () => D.getChatMessages();
  const author = message => message.own ? 'Вы' : message.author;
  let focused = null, menuTrigger = null, resizeObserver = null;
  let selection = null, pendingForward = null, pendingDeletion = null, lastDeletion = null;
  const clone = value => JSON.parse(JSON.stringify(value));
  const scopeMatches = value => value?.chat === S.chat && value.account === S.activeAccountId;
  const selectionActive = () => scopeMatches(selection);
  const selectedMessages = () => selectionActive() ? messages().filter(message => selection.ids.has(message.id)) : [];
  const visibleChats = () => D.chats.filter(chat => !D.chatIsVisible || D.chatIsVisible(chat.id));
  const forwardedAuthor = message => message.forwarded?.author || (message.own ? (message.author || S.profile.name) : message.author) || 'Участник';
  const forwardIcon = () => '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 3 6 6-6 6M21 9H9a6 6 0 0 0-6 6v6"/></svg>';
  const messageCount = number => `${number} ${number % 10 === 1 && number % 100 !== 11 ? 'сообщение' : number % 10 >= 2 && number % 10 <= 4 && (number % 100 < 12 || number % 100 > 14) ? 'сообщения' : 'сообщений'}`;
  D.chatSelecting = selectionActive;
  S.chatPins ||= {};
  if (!S.chatPinsSeeded) {
    S.chatPins.team ||= ['m3'];
    S.chatPinsSeeded = true;
  }
  const pins = () => (S.chatPins[S.chat] || []).map(id => messages().find(message => message.id === id)).filter(Boolean);
  const pinned = id => (S.chatPins[S.chat] || []).includes(id);
  const preview = message => message.text || message.file || 'Вложение';
  const currentFocus = () => focused?.chat === S.chat ? focused.id : null;
  D.clearChatContext = () => {focused = null; selection = null; pendingForward = null; pendingDeletion = null;};

  function quote(message) {
    if (!message.reply && !message.replyId) return '';
    const original = message.replyId ? messages().find(item => item.id === message.replyId) : messages().find(item => item.text === message.reply);
    if (!original) return `<div class="chat-reply-quote"><strong>${e(message.replyAuthor || 'Ответ на сообщение')}</strong><span>${message.replyId ? 'Сообщение удалено' : e(message.reply)}</span></div>`;
    return `<button class="chat-reply-quote" data-action="chat-jump-message" data-id="${e(original.id)}" aria-label="Перейти к сообщению от ${e(author(original))}"><strong>${e(author(original))}</strong><span>${e(preview(original))}</span></button>`;
  }
  D.chatMessagesHtml = () => {
    const selecting = selectionActive();
    return `<div class="message-date">Сегодня, 13 октября</div>${messages().map(message => `<div class="message ${message.own ? 'own' : ''} ${pinned(message.id) ? 'message-pinned' : ''} ${currentFocus() === message.id ? 'message-focused' : ''} ${selecting && selection.ids.has(message.id) ? 'message-selected' : ''}" id="msg-${e(message.id)}" data-message-id="${e(message.id)}" tabindex="-1" ${currentFocus() === message.id ? 'aria-current="true"' : ''}>${selecting ? `<button class="chat-message-select" role="checkbox" aria-checked="${selection.ids.has(message.id)}" data-action="chat-toggle-selection" data-id="${e(message.id)}" aria-label="Выбрать сообщение от ${e(author(message))} в ${e(message.time)}: ${e(preview(message))}">${i('Check')}</button>` : ''}${message.own ? '' : D.avatar(message.initials, message.color)}<div class="message-content" ${selecting ? 'inert' : ''}><div class="message-bubble">${message.own ? '' : `<div class="msg-author">${e(author(message))}</div>`}${message.forwarded ? `<div class="chat-forwarded-label">${forwardIcon()}<span>Переслано от <strong>${e(message.forwarded.author)}</strong><small>${e(message.forwarded.chatName || '')}</small></span></div>` : ''}${quote(message)}<div class="message-text">${e(message.text)}</div>${message.file ? `<button class="file-pill" data-action="download-attachment" data-id="${e(message.id)}">${i('FileText')}<div>${e(message.file)}<small>Открыть вложение</small></div>${i('Download')}</button>` : ''}<footer class="chat-message-meta">${pinned(message.id) ? `<span title="Сообщение закреплено" aria-label="Сообщение закреплено">${i('Pin')}</span>` : ''}${message.edited ? '<span>изменено</span>' : ''}<time>${e(message.time)}</time>${message.own ? `<span class="chat-sent-status" title="Отправлено" aria-label="Отправлено">${i('CheckCheck')}</span>` : ''}</footer></div>${message.reaction ? `<button class="reaction" data-action="chat-react-message" data-id="${e(message.id)}" aria-label="Убрать реакцию">👍 1</button>` : ''}${selecting ? '' : `<button class="chat-message-more icon-btn" data-action="chat-message-menu" data-id="${e(message.id)}" aria-haspopup="menu" aria-expanded="false" aria-label="Действия с сообщением от ${e(author(message))} в ${e(message.time)}">${i('MoreHorizontal')}</button>`}</div></div>`).join('')}`;
  };

  D.chatPinsHtml = () => {
    const list = pins(), first = list[0];
    if (!first) return '';
    return `<div class="chat-pinned-bar" aria-label="Закреплённые сообщения"><button class="chat-pinned-jump" data-action="chat-jump-message" data-id="${e(first.id)}">${i('Pin')}<span class="chat-pinned-copy"><strong>Закреплённое сообщение</strong><span>${e(author(first))}: ${e(preview(first))}</span></span></button><button class="chat-pinned-count" data-action="chat-pins" aria-label="Все закреплённые сообщения (${list.length})" aria-haspopup="dialog">${list.length}${i('ChevronRight')}</button></div>`;
  };
  D.chatContextHtml = () => {
    if (selectionActive()) {
      const count = selectedMessages().length, all = count === messages().length && count > 0;
      return `<div class="chat-selection-bar" role="region" aria-label="Выбранные сообщения"><button class="icon-btn" data-action="chat-cancel-selection" aria-label="Отменить выбор сообщений">${i('X')}</button><strong aria-live="polite">Выбрано: ${count}</strong><button class="chat-select-all" data-action="chat-select-all">${all ? 'Снять выбор' : 'Выбрать все'}</button><span class="spacer"></span><button class="btn btn-soft" data-action="chat-forward-selected" ${count ? '' : 'disabled'}>${forwardIcon()}Переслать</button><button class="btn btn-secondary chat-delete-selected" data-action="chat-delete-selected" ${count ? '' : 'disabled'}>${i('Trash2')}Удалить</button></div>`;
    }
    if (scopeMatches(lastDeletion)) return `<div class="chat-delete-undo" role="status"><span>Удалено: ${messageCount(lastDeletion.items.length)}</span><button data-action="chat-restore-last-deleted">${i('RotateCcw')}Отменить удаление</button><button class="icon-btn" data-action="chat-dismiss-deletion" aria-label="Скрыть уведомление об удалении">${i('X')}</button></div>`;
    return currentFocus() ? `<div class="chat-context-return"><span>Просмотр выбранного сообщения</span><button data-action="chat-latest">${i('ArrowDown')}К последним сообщениям</button></div>` : '';
  };

  function resizeComposer() {
    const input = document.getElementById('message-input');
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = Math.max(24, Math.min(140, input.scrollHeight)) + 'px';
    input.style.overflowY = input.scrollHeight > 140 ? 'auto' : 'hidden';
  }
  function rerenderAtPosition() {
    const oldScroll = document.getElementById('messages')?.scrollTop;
    D.render();
    const scroller = document.getElementById('messages');
    if (scroller && oldScroll !== undefined && !currentFocus()) scroller.scrollTop = oldScroll;
  }
  function jump(id) {
    closeMenu();
    D.closeModal();
    if (!messages().some(message => message.id === id)) {
      focused = null;
      D.render();
      D.toast('Сообщение удалено или больше недоступно');
      return;
    }
    focused = {chat: S.chat, id};
    D.render();
    const element = document.getElementById('msg-' + id);
    element?.focus({preventScroll: true});
    element?.scrollIntoView({block: 'center', behavior: 'auto'});
  }

  function closeMenu(restoreFocus = false) {
    document.getElementById('chat-message-menu')?.remove();
    menuTrigger?.setAttribute('aria-expanded', 'false');
    if (restoreFocus && menuTrigger?.isConnected) menuTrigger.focus();
    menuTrigger = null;
  }
  function openMessageMenu(button) {
    if (menuTrigger === button) {closeMenu(true); return;}
    closeMenu();
    const message = messages().find(item => item.id === button.dataset.id);
    if (!message) return;
    menuTrigger = button;
    button.setAttribute('aria-expanded', 'true');
    const menu = document.createElement('div');
    menu.id = 'chat-message-menu';
    menu.className = 'chat-actions-menu';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', 'Действия с сообщением');
    const actions = [['Reply', 'chat-reply-message', 'Ответить'], ['Pin', 'chat-toggle-pin', pinned(message.id) ? 'Открепить сообщение' : 'Закрепить сообщение'], ['Smile', 'chat-react-message', message.reaction ? 'Убрать реакцию' : 'Добавить 👍'], ['Copy', 'chat-copy-message', 'Копировать текст'], ['CornerUpRight', 'chat-forward-message', 'Переслать'], ['CheckCheck', 'chat-select-message', 'Выбрать']];
    if (message.own) actions.push(['Pencil', 'chat-edit-message', 'Изменить'], ['Trash2', 'chat-delete-message', 'Удалить']);
    menu.innerHTML = actions.map(([icon, action, label]) => `<button role="menuitem" class="${action === 'chat-delete-message' ? 'danger' : ''}" data-action="${action}" data-id="${e(message.id)}">${icon === 'CornerUpRight' ? forwardIcon() : i(icon)}${label}</button>`).join('');
    document.body.append(menu);
    const rect = button.getBoundingClientRect();
    menu.style.left = Math.max(10, Math.min(window.innerWidth - menu.offsetWidth - 10, rect.right - menu.offsetWidth)) + 'px';
    menu.style.top = Math.max(44, Math.min(window.innerHeight - menu.offsetHeight - 12, rect.bottom + 6)) + 'px';
    menu.querySelector('button')?.focus();
  }
  function showPins() {
    const list = pins();
    D.openModal('Закреплённые сообщения', `<p class="modal-note">Важное под рукой у участников чата. Можно закрепить до 20 сообщений.</p><div class="chat-pinned-list">${list.map(message => `<div class="chat-pinned-item"><button class="chat-pin-result" data-action="chat-jump-message" data-id="${e(message.id)}"><strong>${e(author(message))}</strong><span>${e(preview(message))}</span><small>${e(message.time)}${message.edited ? ' · изменено' : ''}</small></button><button class="icon-btn" data-action="chat-unpin-modal" data-id="${e(message.id)}" aria-label="Открепить сообщение от ${e(author(message))}">${i('PinOff')}</button></div>`).join('') || '<p class="chat-search-empty">Закреплённых сообщений пока нет.</p>'}</div>`);
  }
  function togglePin(id, fromModal = false) {
    closeMenu();
    if (!messages().some(message => message.id === id)) return;
    const list = pins().map(message => message.id), wasPinned = list.includes(id);
    if (!wasPinned && list.length >= 20) {D.toast('Можно закрепить до 20 сообщений. Сначала открепите одно из них.'); return;}
    S.chatPins[S.chat] = wasPinned ? list.filter(value => value !== id) : [id, ...list];
    D.save();
    rerenderAtPosition();
    if (fromModal) showPins();
    D.toast(wasPinned ? 'Сообщение откреплено' : 'Сообщение закреплено для участников чата');
  }
  function highlighted(text, query) {
    const lower = text.toLocaleLowerCase(), needle = query.toLocaleLowerCase();
    let index = 0, result = '', match = lower.indexOf(needle);
    while (match !== -1) {
      result += e(text.slice(index, match)) + '<mark>' + e(text.slice(match, match + query.length)) + '</mark>';
      index = match + query.length;
      match = lower.indexOf(needle, index);
    }
    return result + e(text.slice(index));
  }
  function searchResults(value) {
    const query = value.trim().slice(0, 200);
    if (query.length < 2) return '<p class="chat-search-hint">Введите не менее 2 символов для поиска по истории чата.</p>';
    const matches = messages().filter(message => message.text?.toLocaleLowerCase().includes(query.toLocaleLowerCase())).reverse();
    if (!matches.length) return '<p class="chat-search-empty">Сообщения не найдены. Попробуйте другой запрос.</p>';
    return `<p class="chat-search-hint">Найдено: ${matches.length}. Нажмите на результат, чтобы перейти к сообщению.</p>${matches.map(message => {
      const start = Math.max(0, message.text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase()) - 55);
      const offset = start < 20 ? 0 : start;
      const length = Math.max(200, query.length + 110);
      const excerpt = (offset ? '…' : '') + message.text.slice(offset, offset + length) + (message.text.length > offset + length ? '…' : '');
      return `<button class="chat-search-result" data-action="chat-jump-message" data-id="${e(message.id)}"><span class="chat-search-meta"><strong>${e(author(message))}</strong><time>13 октября · ${e(message.time)}</time></span><span class="chat-search-excerpt">${highlighted(excerpt, query)}</span></button>`;
    }).join('')}`;
  }
  function openSearch() {
    const chat = D.chats.find(item => item.id === S.chat);
    D.openModal('Поиск по сообщениям', `<div class="chat-message-search"><label class="field">${e(chat?.name || 'Текущий чат')}<input id="chat-message-search-query" type="search" maxlength="200" autocomplete="off" placeholder="Найти сообщение…" aria-label="Поиск сообщений"></label><div id="chat-message-search-results" aria-live="polite">${searchResults('')}</div></div>`);
    setTimeout(() => document.getElementById('chat-message-search-query')?.focus(), 25);
  }

  function saveMessages(change) {
    const keys = ['messages', 'chatPins', 'deletedMessages', 'reply', 'replyTo'];
    const before = Object.fromEntries(keys.map(key => [key, {exists: Object.hasOwn(S, key), value: S[key] === undefined ? null : clone(S[key])}]));
    const account = S.accounts?.find(item => item.id === S.activeAccountId), accountData = account ? clone(account.data) : null;
    change();
    if (D.save() !== false) return true;
    for (const [key, saved] of Object.entries(before)) {if (saved.exists) S[key] = saved.value; else delete S[key];}
    if (account) account.data = accountData;
    return false;
  }
  function beginSelection(id) {
    closeMenu();
    focused = null;
    selection = {chat: S.chat, account: S.activeAccountId, ids: new Set(id && messages().some(message => message.id === id) ? [id] : [])};
    pendingForward = null;
    pendingDeletion = null;
    rerenderAtPosition();
    document.querySelector(id ? `.chat-message-select[data-id="${CSS.escape(id)}"]` : '.chat-selection-bar button')?.focus({preventScroll: true});
  }
  function toggleSelection(id) {
    if (!selectionActive() || !messages().some(message => message.id === id)) return;
    selection.ids.has(id) ? selection.ids.delete(id) : selection.ids.add(id);
    rerenderAtPosition();
    document.querySelector(`.chat-message-select[data-id="${CSS.escape(id)}"]`)?.focus({preventScroll: true});
  }
  function cancelSelection() {
    selection = null; pendingForward = null; pendingDeletion = null;
    rerenderAtPosition();
    document.querySelector('[data-action="chat-select-mode"]')?.focus({preventScroll: true});
  }
  function confirmDeleteSelected() {
    const chosen = selectedMessages();
    if (!chosen.length) return;
    pendingDeletion = {chat: S.chat, account: S.activeAccountId, ids: chosen.map(message => message.id)};
    D.openModal('Удалить выбранные сообщения?', `<div class="chat-delete-confirm"><p class="chat-selection-summary">Выбрано: ${messageCount(chosen.length)}</p><p class="modal-note">Сообщения будут удалены только из вашей истории. У других участников они останутся.</p><p class="modal-note">После удаления можно сразу отменить действие.</p><div class="modal-actions"><button class="btn btn-secondary" data-action="close-modal">Отмена</button><button class="btn btn-danger" data-action="chat-confirm-delete-selected">${i('Trash2')}Удалить</button></div></div>`);
  }
  function deleteSelected() {
    if (!scopeMatches(pendingDeletion) || !document.querySelector('.chat-delete-confirm')) return;
    const ids = new Set(pendingDeletion.ids), chosen = messages().filter(message => ids.has(message.id));
    if (!chosen.length) {D.closeModal(); cancelSelection(); return;}
    const batch = {chat: S.chat, account: S.activeAccountId, order: messages().map(message => message.id), items: clone(chosen), pins: (S.chatPins[S.chat] || []).filter(id => ids.has(id))};
    if (!saveMessages(() => {
      S.deletedMessages ||= [];
      S.deletedMessages.push(...chosen.map(message => ({...clone(message), chat: S.chat})));
      S.messages[S.chat] = messages().filter(message => !ids.has(message.id));
      S.chatPins[S.chat] = (S.chatPins[S.chat] || []).filter(id => !ids.has(id));
      if (S.replyTo?.chatId === S.chat && ids.has(S.replyTo.id)) {S.reply = ''; S.replyTo = null;}
    })) return;
    selection = null; pendingDeletion = null; focused = null; lastDeletion = batch;
    D.closeModal(); rerenderAtPosition();
    D.toast(`Удалено: ${messageCount(chosen.length)}`);
  }
  function restoreLastDeleted() {
    if (!scopeMatches(lastDeletion)) return;
    const batch = lastDeletion, ids = new Set(batch.items.map(message => message.id));
    if (!saveMessages(() => {
      const history = messages();
      for (const message of batch.items) {
        if (history.some(item => item.id === message.id)) continue;
        const position = batch.order.indexOf(message.id);
        const nextId = batch.order.slice(position + 1).find(id => history.some(item => item.id === id));
        const previousId = batch.order.slice(0, position).reverse().find(id => history.some(item => item.id === id));
        const index = nextId ? history.findIndex(item => item.id === nextId) : previousId ? history.findIndex(item => item.id === previousId) + 1 : 0;
        history.splice(index, 0, clone(message));
      }
      S.deletedMessages = (S.deletedMessages || []).filter(message => message.chat !== S.chat || !ids.has(message.id));
      S.chatPins[S.chat] = [...new Set([...(S.chatPins[S.chat] || []), ...batch.pins])].filter(id => history.some(message => message.id === id)).slice(0, 20);
    })) return;
    lastDeletion = null;
    rerenderAtPosition();
    D.toast('Сообщения восстановлены');
  }
  function forwardTargets(query = '') {
    const search = query.trim().toLocaleLowerCase();
    const list = visibleChats().filter(chat => chat.id !== pendingForward?.chat && chat.name.toLocaleLowerCase().includes(search));
    return list.map(chat => `<button class="chat-forward-target ${pendingForward?.target === chat.id ? 'is-selected' : ''}" data-action="chat-forward-target" data-id="${e(chat.id)}" aria-pressed="${pendingForward?.target === chat.id}">${D.chatAvatar ? D.chatAvatar(chat) : D.avatar(chat.initials, chat.color)}<span><strong>${e(chat.name)}</strong><small>${chat.group ? 'Групповой чат' : 'Личный чат'}</small></span><span class="chat-forward-target-check" aria-hidden="true">${i('Check')}</span></button>`).join('') || '<p class="chat-search-empty">Подходящих чатов нет.</p>';
  }
  function openForwardPicker() {
    const chosen = selectedMessages();
    if (!chosen.length) return;
    pendingForward = {chat: S.chat, account: S.activeAccountId, ids: chosen.map(message => message.id), target: null};
    D.openModal('Переслать сообщения', `<div class="chat-forward-dialog"><div class="chat-forward-summary">${forwardIcon()}<div><strong>${messageCount(chosen.length)}</strong><span>Из чата «${e(D.chats.find(chat => chat.id === S.chat)?.name || '')}»</span></div></div><label class="field chat-forward-search">Кому переслать<input id="chat-forward-search" type="search" placeholder="Найти чат или участника…" maxlength="120" autocomplete="off"></label><div class="chat-forward-targets" id="chat-forward-targets" aria-label="Выберите чат для пересылки">${forwardTargets()}</div><div class="modal-actions"><span id="chat-forward-destination" class="chat-forward-destination" aria-live="polite">Выберите получателя</span><button class="btn btn-secondary" data-action="close-modal">Отмена</button><button class="btn btn-primary" id="chat-forward-confirm" data-action="chat-confirm-forward" disabled>${forwardIcon()}Переслать</button></div></div>`);
    document.querySelector('.modal')?.classList.add('chat-forward-modal');
  }
  function chooseForwardTarget(id) {
    if (!scopeMatches(pendingForward) || !visibleChats().some(chat => chat.id === id) || id === S.chat) return;
    pendingForward.target = id;
    document.getElementById('chat-forward-targets').innerHTML = forwardTargets(document.getElementById('chat-forward-search')?.value || '');
    document.getElementById('chat-forward-destination').textContent = D.chats.find(chat => chat.id === id).name;
    document.getElementById('chat-forward-confirm').disabled = false;
    document.querySelector(`.chat-forward-target[data-id="${CSS.escape(id)}"]`)?.focus({preventScroll: true});
  }
  function sendForwarded() {
    if (!scopeMatches(pendingForward) || !document.querySelector('.chat-forward-dialog')) return;
    const target = visibleChats().find(chat => chat.id === pendingForward.target && chat.id !== S.chat);
    if (!target) {D.toast('Выберите доступный чат'); return;}
    const ids = new Set(pendingForward.ids), chosen = messages().filter(message => ids.has(message.id));
    if (!chosen.length) {D.closeModal(); cancelSelection(); D.toast('Выбранные сообщения больше недоступны'); return;}
    const source = D.chats.find(chat => chat.id === S.chat), time = new Date().toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'});
    if (!saveMessages(() => {
      // Initialize a previously unopened destination using the same demo history as the normal chat screen.
      const sourceId = S.chat;
      try {S.chat = target.id; D.getChatMessages();} finally {S.chat = sourceId;}
      S.messages[target.id].push(...chosen.map((message, index) => ({
        id: 'forward-' + (globalThis.crypto?.randomUUID?.() || Date.now() + '-' + Math.random().toString(36).slice(2) + '-' + index),
        own: true, author: S.profile.name, text: message.text || '', time,
        ...(message.file ? {file: message.file, ...(message.fileContent !== undefined ? {fileContent: message.fileContent} : {})} : {}),
        forwarded: message.forwarded ? clone(message.forwarded) : {author: forwardedAuthor(message), chatName: source?.name || '', chatId: sourceId, messageId: message.id}
      })));
    })) return;
    selection = null; pendingForward = null; focused = null;
    D.closeModal(); rerenderAtPosition();
    D.toast(`Переслано в «${target.name}»: ${messageCount(chosen.length)}`);
  }

  const originalReply = D.handlers['reply-message'], originalCancel = D.handlers['cancel-reply'];
  function reply(button) {
    closeMenu();
    const message = messages().find(item => item.id === button.dataset.id);
    if (!message) return;
    originalReply(button);
  }
  Object.assign(D.handlers, {
    'search-chat': openSearch,
    'chat-select-mode': () => selectionActive() ? cancelSelection() : beginSelection(),
    'chat-select-message': button => beginSelection(button.dataset.id),
    'chat-toggle-selection': button => toggleSelection(button.dataset.id),
    'chat-cancel-selection': cancelSelection,
    'chat-select-all': () => {if (!selectionActive()) return; selection.ids = new Set(selectedMessages().length === messages().length ? [] : messages().map(message => message.id)); rerenderAtPosition(); document.querySelector('[data-action="chat-select-all"]')?.focus({preventScroll: true});},
    'chat-delete-selected': confirmDeleteSelected,
    'chat-confirm-delete-selected': deleteSelected,
    'chat-restore-last-deleted': restoreLastDeleted,
    'chat-dismiss-deletion': () => {lastDeletion = null; rerenderAtPosition();},
    'chat-forward-selected': openForwardPicker,
    'chat-forward-message': button => {beginSelection(button.dataset.id); openForwardPicker();},
    'chat-forward-target': button => chooseForwardTarget(button.dataset.id),
    'chat-confirm-forward': sendForwarded,
    'chat-message-menu': openMessageMenu,
    'chat-pins': showPins,
    'chat-jump-message': button => jump(button.dataset.id),
    'chat-latest': () => {focused = null; D.render(); document.getElementById('message-input')?.focus();},
    'chat-toggle-pin': button => togglePin(button.dataset.id),
    'chat-unpin-modal': button => togglePin(button.dataset.id, true),
    'reply-message': reply,
    'chat-reply-message': reply,
    'cancel-reply': () => originalCancel(),
    'chat-edit-message': button => {closeMenu(); D.handlers['edit-message'](button);},
    'chat-delete-message': button => {
      closeMenu();
      if (currentFocus() === button.dataset.id) focused = null;
      S.chatPins[S.chat] = (S.chatPins[S.chat] || []).filter(id => id !== button.dataset.id);
      D.handlers['delete-message'](button);
    },
    'chat-react-message': button => {
      closeMenu();
      const scroll = document.getElementById('messages')?.scrollTop;
      D.handlers['react-message'](button);
      const container = document.getElementById('messages');
      if (container && scroll !== undefined && !currentFocus()) container.scrollTop = scroll;
    },
    'chat-copy-message': async button => {
      const message = messages().find(item => item.id === button.dataset.id);
      closeMenu();
      if (!message) return;
      try {await navigator.clipboard.writeText(message.text); D.toast('Текст скопирован');}
      catch {D.openModal('Текст сообщения', `<label class="field">Выделите и скопируйте текст<textarea readonly rows="5">${e(message.text)}</textarea></label>`);}
    }
  });
  document.addEventListener('input', event => {
    if (event.target.id === 'chat-message-search-query') document.getElementById('chat-message-search-results').innerHTML = searchResults(event.target.value);
    if (event.target.id === 'message-input') resizeComposer();
    if (event.target.id === 'chat-forward-search' && scopeMatches(pendingForward)) document.getElementById('chat-forward-targets').innerHTML = forwardTargets(event.target.value);
  });
  document.addEventListener('click', event => {
    if (!selectionActive() || S.screen !== 'chats') return;
    const row = event.target.closest('.message[data-message-id]');
    if (!row || event.target.closest('[data-action="chat-toggle-selection"]')) return;
    event.preventDefault(); event.stopImmediatePropagation();
    toggleSelection(row.dataset.messageId);
  }, true);
  document.addEventListener('pointerdown', event => {
    if (menuTrigger && !event.target.closest('#chat-message-menu') && !event.target.closest('[data-action="chat-message-menu"]')) closeMenu();
  });
  document.addEventListener('keydown', event => {
    const menu = document.getElementById('chat-message-menu');
    if (!menu) {if (event.key === 'Escape' && selectionActive() && !document.querySelector('.modal')) {event.preventDefault(); event.stopImmediatePropagation(); cancelSelection();} return;}
    if (event.key === 'Escape') {event.preventDefault(); event.stopImmediatePropagation(); closeMenu(true); return;}
    if (event.key === 'Tab') {closeMenu(); return;}
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const buttons = [...menu.querySelectorAll('button')], current = buttons.indexOf(document.activeElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next]?.focus();
  }, true);
  window.addEventListener('resize', () => closeMenu());
  document.addEventListener('desk:render', () => {
    closeMenu();
    resizeObserver?.disconnect();
    if (S.screen !== 'chats') {focused = null; selection = null; pendingForward = null; pendingDeletion = null; lastDeletion = null; return;}
    if (focused?.chat !== S.chat) focused = null;
    if (selection && !scopeMatches(selection)) {selection = null; pendingForward = null; pendingDeletion = null;}
    if (lastDeletion && !scopeMatches(lastDeletion)) lastDeletion = null;
    document.querySelector('.chat-main')?.classList.toggle('is-selecting', selectionActive());
    document.querySelector('[data-action="chat-select-mode"]')?.setAttribute('aria-pressed', String(selectionActive()));
    const target = currentFocus() && document.getElementById('msg-' + currentFocus());
    if (target) target.scrollIntoView({block: 'center', behavior: 'auto'});
    resizeComposer();
    const composer = document.getElementById('message-input');
    if (composer && typeof ResizeObserver !== 'undefined') {
      let width = composer.clientWidth;
      resizeObserver = new ResizeObserver(() => {if (composer.clientWidth !== width) {width = composer.clientWidth; resizeComposer();}});
      resizeObserver.observe(composer);
    }
  });
})();
