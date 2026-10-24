(() => {
  'use strict';
  const D = window.Desk, S = D.state, e = D.esc, i = D.icon;
  const messages = () => D.getChatMessages();
  const author = message => message.own ? 'Вы' : message.author;
  let focused = null, menuTrigger = null, resizeObserver = null;
  S.chatPins ||= {};
  if (!S.chatPinsSeeded) {
    S.chatPins.team ||= ['m3'];
    S.chatPinsSeeded = true;
  }
  const pins = () => (S.chatPins[S.chat] || []).map(id => messages().find(message => message.id === id)).filter(Boolean);
  const pinned = id => (S.chatPins[S.chat] || []).includes(id);
  const preview = message => message.text || message.file || 'Вложение';
  const currentFocus = () => focused?.chat === S.chat ? focused.id : null;
  D.clearChatContext = () => {focused = null;};

  function quote(message) {
    if (!message.reply && !message.replyId) return '';
    const original = message.replyId ? messages().find(item => item.id === message.replyId) : messages().find(item => item.text === message.reply);
    if (!original) return `<div class="chat-reply-quote"><strong>${e(message.replyAuthor || 'Ответ на сообщение')}</strong><span>${message.replyId ? 'Сообщение удалено' : e(message.reply)}</span></div>`;
    return `<button class="chat-reply-quote" data-action="chat-jump-message" data-id="${e(original.id)}" aria-label="Перейти к сообщению от ${e(author(original))}"><strong>${e(author(original))}</strong><span>${e(preview(original))}</span></button>`;
  }
  D.chatMessagesHtml = () => `<div class="message-date">Сегодня, 13 октября</div>${messages().map(message => `<div class="message ${message.own ? 'own' : ''} ${pinned(message.id) ? 'message-pinned' : ''} ${currentFocus() === message.id ? 'message-focused' : ''}" id="msg-${e(message.id)}" tabindex="-1" ${currentFocus() === message.id ? 'aria-current="true"' : ''}>${message.own ? '' : D.avatar(message.initials, message.color)}<div class="message-content"><div class="msg-author">${e(author(message))}</div><div class="message-bubble">${quote(message)}<div class="message-text">${e(message.text)}</div>${message.file ? `<button class="file-pill" data-action="download-attachment" data-id="${e(message.id)}">${i('FileText')}<div>${e(message.file)}<small>Открыть вложение</small></div>${i('Download')}</button>` : ''}<footer class="chat-message-meta">${pinned(message.id) ? `<span title="Сообщение закреплено" aria-label="Сообщение закреплено">${i('Pin')}</span>` : ''}${message.edited ? '<span>изменено</span>' : ''}<time>${e(message.time)}</time>${message.own ? `<span class="chat-sent-status" title="Отправлено" aria-label="Отправлено">${i('Check')}</span>` : ''}</footer></div>${message.reaction ? `<button class="reaction" data-action="chat-react-message" data-id="${e(message.id)}" aria-label="Убрать реакцию">👍 1</button>` : ''}<button class="chat-message-more icon-btn" data-action="chat-message-menu" data-id="${e(message.id)}" aria-haspopup="menu" aria-expanded="false" aria-label="Действия с сообщением от ${e(author(message))} в ${e(message.time)}">${i('MoreHorizontal')}</button></div></div>`).join('')}`;

  D.chatPinsHtml = () => {
    const list = pins(), first = list[0];
    if (!first) return '';
    return `<div class="chat-pinned-bar" aria-label="Закреплённые сообщения"><button class="chat-pinned-jump" data-action="chat-jump-message" data-id="${e(first.id)}">${i('Pin')}<span class="chat-pinned-copy"><strong>Закреплённое сообщение</strong><span>${e(author(first))}: ${e(preview(first))}</span></span></button><button class="chat-pinned-count" data-action="chat-pins" aria-label="Все закреплённые сообщения (${list.length})" aria-haspopup="dialog">${list.length}${i('ChevronRight')}</button></div>`;
  };
  D.chatContextHtml = () => currentFocus() ? `<div class="chat-context-return"><span>Просмотр выбранного сообщения</span><button data-action="chat-latest">${i('ArrowDown')}К последним сообщениям</button></div>` : '';

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
    const actions = [['Reply', 'chat-reply-message', 'Ответить'], ['Pin', 'chat-toggle-pin', pinned(message.id) ? 'Открепить сообщение' : 'Закрепить сообщение'], ['Smile', 'chat-react-message', message.reaction ? 'Убрать реакцию' : 'Добавить 👍'], ['Copy', 'chat-copy-message', 'Копировать текст']];
    if (message.own) actions.push(['Pencil', 'chat-edit-message', 'Изменить'], ['Trash2', 'chat-delete-message', 'Удалить']);
    menu.innerHTML = actions.map(([icon, action, label]) => `<button role="menuitem" class="${action === 'chat-delete-message' ? 'danger' : ''}" data-action="${action}" data-id="${e(message.id)}">${i(icon)}${label}</button>`).join('');
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

  const originalReply = D.handlers['reply-message'], originalCancel = D.handlers['cancel-reply'];
  function reply(button) {
    closeMenu();
    const message = messages().find(item => item.id === button.dataset.id);
    if (!message) return;
    originalReply(button);
  }
  Object.assign(D.handlers, {
    'search-chat': openSearch,
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
  });
  document.addEventListener('pointerdown', event => {
    if (menuTrigger && !event.target.closest('#chat-message-menu') && !event.target.closest('[data-action="chat-message-menu"]')) closeMenu();
  });
  document.addEventListener('keydown', event => {
    const menu = document.getElementById('chat-message-menu');
    if (!menu) return;
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
    if (S.screen !== 'chats') {focused = null; return;}
    if (focused?.chat !== S.chat) focused = null;
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
