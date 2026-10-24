(() => {
  'use strict';
  const D = window.Desk, S = D.state, e = D.esc, i = D.icon;
  const $ = selector => document.querySelector(selector);
  const button = (icon, action, label, attrs = '') => `<button type="button" class="icon-btn" data-action="${action}" aria-label="${e(label)}" title="${e(label)}" ${attrs}>${i(icon)}</button>`;
  const seeds = {
    product: [{ kind: 'chat', id: 'team' }, { kind: 'meeting', id: 'design' }, { kind: 'meeting', id: 'weekly' }],
    design: [{ kind: 'chat', id: 'design' }, { kind: 'meeting', id: 'research' }]
  };
  for (const folder of S.folders) {
    if (!Array.isArray(folder.items)) folder.items = (seeds[folder.id] || []).map(item => ({ ...item }));
  }
  S.folderView = S.folderView === 'list' ? 'list' : 'grid';
  let filter = 'all', query = '', picker = null;
  const key = item => `${item.kind}:${item.id}`;
  const current = () => S.folders.find(folder => folder.id === S.activeFolder);
  const itemFor = reference => {
    const data = reference.kind === 'chat' ? D.chats.find(chat => chat.id === reference.id && (!D.chatIsVisible || D.chatIsVisible(chat.id))) : S.meetings.find(meeting => meeting.id === reference.id);
    return data ? { ...reference, data } : null;
  };
  const validItems = folder => (folder.items || []).map(itemFor).filter(Boolean);
  const candidates = () => [...D.chats.filter(chat => !D.chatIsVisible || D.chatIsVisible(chat.id)).map(chat => ({ kind: 'chat', id: chat.id, data: chat })), ...S.meetings.map(meeting => ({ kind: 'meeting', id: meeting.id, data: meeting }))];
  const label = item => item.kind === 'chat' ? item.data.name : item.data.title;
  const detail = item => item.kind === 'chat' ? `${item.data.group ? 'Групповой чат' : 'Личная переписка'}${item.data.group ? ` · ${item.data.people} участников` : ''}` : `${item.data.status === 'past' ? 'Завершена' : item.data.status === 'active' ? 'Идёт встреча' : 'Запланирована'} · ${item.data.date ? new Date(`${item.data.date}T12:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : 'Без даты'}${item.data.time ? `, ${item.data.time}` : ''}`;
  const visual = item => item.kind === 'chat' ? D.avatar(item.data.initials, item.data.color) : `<span class="ext-item-icon">${i('Video')}</span>`;
  const save = () => { D.save(); D.render(); };
  function openFolder(id) {
    S.activeFolder = S.folders.some(folder => folder.id === id) ? id : null;
    filter = 'all'; query = ''; D.go('folders');
  }
  function folderForm(id) {
    const folder = S.folders.find(folder => folder.id === id);
    D.openModal(folder ? 'Переименовать папку' : 'Новая папка', `<form id="ext-folder-form" data-id="${folder ? e(folder.id) : ''}"><label class="field">Название папки<input name="name" value="${e(folder?.name || '')}" required maxlength="50" placeholder="Например, рабочие проекты" autocomplete="off"></label><p class="modal-note">Папка видна только вам. В неё можно добавить чаты и встречи.</p><p class="ext-form-error" id="ext-folder-error" role="alert"></p><div class="modal-actions"><button type="button" class="btn btn-secondary" data-action="close-modal">Отмена</button><button type="submit" class="btn btn-primary">${folder ? 'Сохранить' : 'Создать папку'}</button></div></form>`);
  }
  function folderCard(folder, index) {
    const count = validItems(folder).length;
    return `<article class="ext-folder-card panel"><button class="ext-folder-open" data-action="folder" data-id="${e(folder.id)}"><span class="ext-folder-symbol">${i('Folder')}</span><strong>${e(folder.name)}</strong><small>${count ? `${count} элементов` : 'Пока пусто'}</small></button><div class="ext-folder-card-actions"><span class="muted">Только для вас</span>${button('ChevronUp', 'ext-folder-up', 'Переместить выше', `data-id="${e(folder.id)}" ${index === 0 ? 'disabled' : ''}`)}${button('ChevronDown', 'ext-folder-down', 'Переместить ниже', `data-id="${e(folder.id)}" ${index === S.folders.length - 1 ? 'disabled' : ''}`)}${button('SquarePen', 'ext-folder-rename', 'Переименовать', `data-id="${e(folder.id)}"`)}</div></article>`;
  }
  const viewSwitch = () => `<div class="ext-folder-view-switch" role="group" aria-label="Вид папок и элементов">${[['list', 'List', 'Список'], ['grid', 'Grid2X2', 'Плитка']].map(([view, glyph, title]) => `<button type="button" data-action="ext-folder-view" data-value="${view}" aria-pressed="${S.folderView === view}">${i(glyph)}<span>${title}</span></button>`).join('')}</div>`;
  function itemRows() {
    const folder = current();
    if (!folder) return '';
    const all = validItems(folder);
    const items = all.filter(item => (filter === 'all' || item.kind === filter) && label(item).toLocaleLowerCase('ru').includes(query.toLocaleLowerCase('ru')));
    if (!items.length) return `<div class="empty-state ext-folder-empty">${i(all.length ? 'Search' : 'Folder')}<h3>${all.length ? 'Ничего не найдено' : 'В папке пока пусто'}</h3><p>${all.length ? 'Попробуйте другой запрос или фильтр.' : 'Соберите здесь чаты и встречи, к которым часто возвращаетесь.'}</p>${all.length ? '<button class="btn btn-secondary" data-action="ext-folder-reset">Сбросить фильтры</button>' : '<button class="btn btn-primary" data-action="ext-folder-pick">Добавить элементы</button>'}</div>`;
    return items.map(item => `<article class="ext-folder-row"><button class="ext-folder-item" data-action="ext-folder-open-item" data-kind="${item.kind}" data-id="${e(item.id)}">${visual(item)}<span><strong>${e(label(item))}</strong><small>${e(detail(item))}</small></span>${i('ChevronRight')}</button>${button('X', 'ext-folder-remove-item', 'Убрать из папки', `data-kind="${item.kind}" data-id="${e(item.id)}"`)}</article>`).join('');
  }
  D.screens.folders = () => {
    const folder = current();
    if (!folder) return `<section class="ext-folders-screen"><div class="page-heading"><div><h1>Мои папки</h1><p>Чаты и встречи, собранные по вашим проектам.</p></div><button class="btn btn-primary" data-action="add-folder">${i('Plus')}Новая папка</button></div><div class="ext-folder-overview-toolbar">${viewSwitch()}</div><div class="ext-folder-grid ${S.folderView === 'list' ? 'ext-folder-list' : ''}">${S.folders.map(folderCard).join('') || '<div class="empty-state"><h3>Ваше личное пространство</h3><p>Создайте первую папку, чтобы добавить чаты и встречи.</p><button class="btn btn-primary" data-action="add-folder">Создать папку</button></div>'}</div><div class="ext-folders-footer"><span>${i('LockKeyhole')}Ваши папки видны только вам</span></div></section>`;
    const items = validItems(folder);
    return `<section class="ext-folders-screen"><button class="ext-back" data-action="ext-folders-all">${i('ArrowLeft')}Все папки</button><div class="page-heading"><div><h1>${e(folder.name)}</h1><p>${items.length} элементов · Только для вас</p></div><div class="row"><button class="btn btn-primary" data-action="ext-folder-pick">${i('Plus')}Добавить элементы</button>${button('SquarePen', 'ext-folder-rename', 'Переименовать папку', `data-id="${e(folder.id)}"`)}</div></div><div class="ext-folder-toolbar"><div class="tabs" role="tablist" aria-label="Тип элементов папки">${[['all', 'Все'], ['chat', 'Чаты'], ['meeting', 'Встречи']].map(([id, title]) => `<button role="tab" aria-selected="${id === filter}" class="${id === filter ? 'active' : ''}" data-action="ext-folder-filter" data-value="${id}">${title}<span class="num">${id === 'all' ? items.length : items.filter(item => item.kind === id).length}</span></button>`).join('')}</div><div class="ext-folder-controls"><label class="input-icon">${i('Search')}<input id="ext-folder-search" type="search" value="${e(query)}" placeholder="Найти в папке" aria-label="Найти в папке"></label>${viewSwitch()}</div></div><div class="panel ext-folder-items ${S.folderView === 'grid' ? 'ext-folder-item-grid' : ''}" id="ext-folder-items">${itemRows()}</div><p class="ext-folder-note">Удаление элемента из папки сохраняет сам чат или встречу.</p></section>`;
  };
  function pickerRows(search = '') {
    return candidates().filter(item => label(item).toLocaleLowerCase('ru').includes(search.toLocaleLowerCase('ru'))).map(item => `<label class="ext-picker-row"><input type="checkbox" data-ext-pick="${e(key(item))}" ${picker.selected.has(key(item)) ? 'checked' : ''}>${visual(item)}<span><strong>${e(label(item))}</strong><small>${e(detail(item))}</small></span></label>`).join('') || '<div class="empty-state">Чаты и встречи не найдены</div>';
  }
  function showPicker() {
    const folder = current(); if (!folder) return;
    picker = { folderId: folder.id, selected: new Set(folder.items.map(key)) };
    D.openModal('Элементы папки', `<form id="ext-folder-picker-form"><p class="modal-note">Выберите чаты и встречи для папки «${e(folder.name)}». Один элемент можно добавить в несколько папок.</p><label class="input-icon ext-picker-search">${i('Search')}<input type="search" id="ext-picker-search" placeholder="Найти чат или встречу" aria-label="Найти элемент"></label><div class="ext-picker-list" id="ext-picker-list">${pickerRows()}</div><div class="modal-actions"><span class="ext-picker-count" id="ext-picker-count">Выбрано: ${picker.selected.size}</span><button type="button" class="btn btn-secondary" data-action="close-modal">Отмена</button><button type="submit" class="btn btn-primary">Сохранить</button></div></form>`, true);
  }
  function moveFolder(id, offset) {
    const from = S.folders.findIndex(folder => folder.id === id), to = from + offset;
    if (from < 0 || to < 0 || to >= S.folders.length) return;
    [S.folders[from], S.folders[to]] = [S.folders[to], S.folders[from]]; save();
  }
  S.groupSettings ||= {};
  for (const [id, settings] of Object.entries(S.groupSettings)) {
    const chat = D.chats.find(item => item.id === id && item.group);
    if (chat) Object.assign(chat, { name: settings.name, description: settings.description, people: settings.members.length + 1 });
  }
  function groupSettings(chat) {
    return S.groupSettings[chat.id] || { name: chat.name, description: chat.description || '', members: D.people.slice(0, Math.max(0, chat.people - 1)).map((person, index) => ({ id: String(index), role: 'member' })) };
  }
  function manageGroup() {
    const chat = D.chats.find(item => item.id === S.chat && item.group); if (!chat) return;
    const settings = groupSettings(chat);
    D.openModal('Управление группой', `<form id="ext-group-form" data-id="${e(chat.id)}"><div class="field-row"><label class="field">Название группы<input name="name" required maxlength="50" value="${e(settings.name)}"></label><label class="field">Описание<input name="description" maxlength="200" value="${e(settings.description)}"></label></div><p class="modal-note">Выберите участников и их роли. Изменения применяются в этом локальном макете.</p><div class="ext-group-row">${D.avatar(S.profile.name.split(' ').map(part => part[0]).join('').slice(0, 2), 'blue')}<div><strong>${e(S.profile.name)} · Вы</strong><small>Владелец группы</small></div><span class="badge blue">Владелец</span></div>${D.people.map((person, index) => { const member = settings.members.find(item => item.id === String(index)); return `<div class="ext-group-row"><input type="checkbox" name="member" value="${index}" ${member ? 'checked' : ''} aria-label="${e(person[1])} в группе">${D.avatar(person[0], person[3])}<div><strong>${e(person[1])}</strong><small>${e(person[2])}</small></div><select name="role-${index}" aria-label="Роль ${e(person[1])}"><option value="member" ${member?.role !== 'admin' ? 'selected' : ''}>Участник</option><option value="admin" ${member?.role === 'admin' ? 'selected' : ''}>Администратор</option></select></div>`; }).join('')}<p id="ext-group-error" class="ext-form-error" role="alert"></p><div class="modal-actions"><button type="button" class="btn btn-secondary" data-action="chat-info">Отмена</button><button class="btn btn-primary" type="submit">Сохранить изменения</button></div></form>`, true);
  }
  Object.assign(D.handlers, {
    folder: b => openFolder(b.dataset.id),
    'add-folder': () => folderForm(),
    'ext-folders-all': () => openFolder(null),
    'ext-folder-rename': b => folderForm(b.dataset.id),
    'ext-folder-up': b => moveFolder(b.dataset.id, -1),
    'ext-folder-down': b => moveFolder(b.dataset.id, 1),
    'ext-folder-view': b => {
      if (!['list', 'grid'].includes(b.dataset.value)) return;
      S.folderView = b.dataset.value; save();
      document.querySelector(`[data-action="ext-folder-view"][data-value="${S.folderView}"]`)?.focus();
    },
    'ext-folder-filter': b => { filter = b.dataset.value; D.render(); },
    'ext-folder-reset': () => { filter = 'all'; query = ''; D.render(); },
    'ext-folder-pick': showPicker,
    'ext-group-manage': manageGroup,
    'ext-folder-open-item': b => {
      if (b.dataset.kind === 'chat') { D.handlers['open-chat'](b); return; }
      const meeting = S.meetings.find(item => item.id === b.dataset.id); if (!meeting) return;
      D.handlers['calendar-meeting'](b);
    },
    'ext-folder-remove-item': b => {
      const folder = current(); if (!folder) return;
      folder.items = folder.items.filter(item => key(item) !== `${b.dataset.kind}:${b.dataset.id}`); save(); D.toast('Элемент убран из папки. Его можно добавить снова.');
    }
  });
  document.addEventListener('input', event => {
    if (event.target.id === 'ext-folder-search') { query = event.target.value; $('#ext-folder-items').innerHTML = itemRows(); }
    if (event.target.id === 'ext-picker-search' && picker) $('#ext-picker-list').innerHTML = pickerRows(event.target.value);
  });
  document.addEventListener('change', event => {
    if (event.target.dataset.extPick && picker) {
      const value = event.target.dataset.extPick;
      if (event.target.checked) picker.selected.add(value); else picker.selected.delete(value);
      if ($('#ext-picker-count')) $('#ext-picker-count').textContent = `Выбрано: ${picker.selected.size}`;
    }
  });
  document.addEventListener('submit', event => {
    const form = event.target;
    if (form.id === 'ext-folder-form') {
      event.preventDefault();
      const name = String(new FormData(form).get('name') || '').trim().normalize('NFC'), id = form.dataset.id;
      const error = !name ? 'Введите название папки.' : S.folders.some(folder => folder.id !== id && folder.name.toLocaleLowerCase('ru') === name.toLocaleLowerCase('ru')) ? 'Папка с таким названием уже существует.' : '';
      if (error) { $('#ext-folder-error').textContent = error; return; }
      let folder = S.folders.find(item => item.id === id);
      if (folder) folder.name = name;
      else { folder = { id: `folder-${crypto.randomUUID()}`, name, items: [] }; S.folders.push(folder); }
      S.activeFolder = folder.id; D.closeModal(); D.go('folders'); D.toast(id ? 'Название папки изменено' : 'Папка создана. Добавьте в неё чаты и встречи.');
    }
    if (form.id === 'ext-folder-picker-form') {
      event.preventDefault();
      const folder = picker && S.folders.find(item => item.id === picker.folderId); if (!folder) return;
      folder.items = candidates().filter(item => picker.selected.has(key(item))).map(({ kind, id }) => ({ kind, id })); picker = null; D.closeModal(); save(); D.toast('Содержимое папки сохранено');
    }
    if (form.id === 'ext-group-form') {
      event.preventDefault();
      const chat = D.chats.find(item => item.id === form.dataset.id && item.group); if (!chat) return;
      const fields = new FormData(form), name = String(fields.get('name') || '').trim();
      if (!name) { $('#ext-group-error').textContent = 'Введите название группы.'; return; }
      const members = fields.getAll('member').map(id => ({ id: String(id), role: fields.get(`role-${id}`) === 'admin' ? 'admin' : 'member' }));
      const settings = { name, description: String(fields.get('description') || '').trim(), members };
      S.groupSettings[chat.id] = settings;
      Object.assign(chat, { name, description: settings.description, people: members.length + 1 });
      D.save(); D.refreshChatDetails(); D.showChatInfo('members'); D.toast('Группа обновлена');
    }
  });
  document.addEventListener('desk:render', () => {
    const sidebar = $('.sidebar-folder');
    if (sidebar && !sidebar.querySelector('[data-action="ext-folders-all"]')) sidebar.insertAdjacentHTML('beforeend', `<button class="nav-item ext-all-folders ${S.screen === 'folders' && !S.activeFolder ? 'active' : ''}" data-action="ext-folders-all">${i('Folder')}<span>Все папки</span></button>`);
    if (S.screen === 'folders') {
      document.title = `${current()?.name || 'Мои папки'} · MeetSpace для Windows`;
      const breadcrumb = $('.breadcrumb strong'); if (breadcrumb) breadcrumb.textContent = 'Мои папки';
      document.querySelectorAll('.sidebar-folder [data-action="folder"]').forEach(node => node.classList.toggle('active', node.dataset.id === S.activeFolder));
    }
  });
  D.save();
})();
