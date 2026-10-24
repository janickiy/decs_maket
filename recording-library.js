(() => {
  'use strict';
  const D = window.Desk, S = D.state, E = D.esc, I = D.icon, records = D.records;
  const $ = selector => document.querySelector(selector);
  let menu = null, menuTrigger = null, pendingDelete = null;

  // These are the existing fictional recordings, keyed by their original index.
  // Organizer details are shown for each fictional recording.
  const demoOwnership = [
    { owner: 'Вы', ownerIsSelf: true, requestedBySelf: true },
    { owner: 'Максим Петров', ownerIsSelf: false, requestedBySelf: false },
    { owner: 'Вы', ownerIsSelf: true, requestedBySelf: true },
    { owner: 'Анна Кузнецова', ownerIsSelf: false, requestedBySelf: true },
    { owner: 'Вы', ownerIsSelf: true, requestedBySelf: true },
    { owner: 'Мария Волкова', ownerIsSelf: false, requestedBySelf: false }
  ];
  function recordIndex(value) {
    if (value === '' || value === null || value === undefined) return -1;
    const index = Number(value);
    return Number.isInteger(index) && index >= 0 && index < records.length ? index : -1;
  }
  D.recordVisible = value => {
    const index = recordIndex(value);
    const deleted = Array.isArray(S.deletedRecordingIds) ? S.deletedRecordingIds : [];
    return index !== -1 && !deleted.some(id => Number(id) === index);
  };
  function metadata(index) {
    const record = records[index], seed = demoOwnership[index] || {};
    return { ...seed, ...record, owner: record.owner || seed.owner || 'Участник встречи' };
  }
  D.recordCanDelete = value => {
    const index = recordIndex(value);
    return D.recordVisible(index) && !S.guestConferenceId && !S.profile?.guestConferenceId;
  };
  const visibleRecords = () => records.map((record, index) => ({ record, index })).filter(({ index }) => D.recordVisible(index));
  const recordDate = record => `${record.date}${/\b20\d{2}\b/.test(record.date) ? '' : ' 2026'}`;
  const ownerName = record => record.ownerIsSelf ? `${S.profile.name} (вы)` : record.owner;
  function sizeLabel(record) {
    if (!Number.isFinite(record.sizeBytes) || record.sizeBytes <= 0) return 'Видео не подключено';
    return `${(record.sizeBytes / 1024 / 1024).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} МБ`;
  }
  function menuButton(index) {
    return `<button type="button" class="icon-btn record-menu-trigger" data-action="record-menu" data-id="${index}" aria-label="Действия с записью: ${E(records[index].title)}" title="Действия с записью" aria-haspopup="menu" aria-expanded="false">${I('MoreVertical')}</button>`;
  }
  function cards(query = '') {
    const found = visibleRecords().filter(({ record }) => record.title.toLocaleLowerCase('ru-RU').includes(query.trim().toLocaleLowerCase('ru-RU')));
    if (!found.length) return `<div class="record-library-empty">${I('CirclePlay')}<h2>${query.trim() ? 'Записи не найдены' : 'Записей пока нет'}</h2><p>${query.trim() ? 'Попробуйте другое название встречи.' : 'Здесь появятся доступные записи ваших встреч.'}</p>${query.trim() ? '<button class="btn btn-soft" data-action="record-clear-search">Сбросить поиск</button>' : '<button class="btn btn-soft" data-action="record-past-meetings">Завершённые встречи</button>'}</div>`;
    return found.map(({ record, index }) => {
      const meta = metadata(index);
      return `<article class="record-card record-library-card"><button type="button" class="record-thumbnail variant-${index % 3}" data-action="record" data-id="${index}" aria-label="Открыть запись ${E(record.title)}"><div class="record-mini-grid">${D.people.map(person => `<div>${D.avatar(person[0], person[3])}</div>`).join('')}</div><span class="play-overlay">${I('Play')}</span><span class="duration-badge">${E(record.duration)}</span></button><div class="record-content"><div class="record-library-copy"><h3><button type="button" data-action="record" data-id="${index}">${E(record.title)}</button></h3><p>${E(recordDate(record))} · ${record.people} участников</p><p class="record-library-owner">Организатор: ${E(ownerName(meta))}</p></div><div class="row record-actions"><span class="record-library-type">Видеозапись · демо</span><button type="button" class="icon-btn" data-action="record" data-id="${index}" aria-label="Смотреть запись: ${E(record.title)}" title="Смотреть запись">${I('ArrowUpRight')}</button>${menuButton(index)}</div></div></article>`;
    }).join('');
  }
  D.screens.recordings = () => `<section class="record-library"><div class="page-heading"><div><h1>Записи встреч</h1></div><span class="badge">${visibleRecords().length} записей · Демо-данные</span></div><div class="records-toolbar"><div class="input-icon">${I('Search')}<input id="record-library-search" type="search" placeholder="Найти запись" aria-label="Найти запись" value="${E(S.recordingQuery || '')}"></div><div class="records-view-switch" role="group" aria-label="Вид записей">${[['list', 'List', 'Список'], ['grid', 'Grid2X2', 'Плитка']].map(([view, glyph, label]) => `<button type="button" data-action="record-view" data-value="${view}" aria-pressed="${(S.recordView === 'list' ? 'list' : 'grid') === view}">${I(glyph)}<span>${label}</span></button>`).join('')}</div></div><div class="record-grid ${S.recordView === 'list' ? 'records-list' : ''}" id="record-grid">${cards(S.recordingQuery)}</div><div class="record-library-footer"><button class="record-past-link" data-action="record-past-meetings">${I('ArrowLeft')}Завершённые встречи</button></div></section>`;
  function infoList(index) {
    const record = metadata(index);
    return `<dl class="record-library-details"><div><dt>Дата записи</dt><dd>${E(recordDate(record))}</dd></div><div><dt>Длительность</dt><dd>${E(record.duration)}</dd></div><div><dt>Организатор</dt><dd>${E(ownerName(record))}</dd></div><div><dt>Участники</dt><dd>${record.people}</dd></div><div><dt>Размер файла</dt><dd>${E(sizeLabel(record))}</dd></div></dl>`;
  }
  D.screens.recording = () => {
    const index = recordIndex(S.record);
    if (!D.recordVisible(index)) return `<section class="record-library-empty record-library-unavailable">${I('CirclePlay')}<h1>Запись недоступна</h1><p>${index !== -1 ? 'Эта запись удалена из макета.' : 'Не удалось найти запись по этой ссылке.'}</p><button class="btn btn-primary" data-action="navigate" data-value="recordings">${I('ArrowLeft')}Все записи</button></section>`;
    const record = records[index], [minutes, seconds] = record.duration.split(':').map(Number);
    return `<div class="record-library-detail"><header class="page-heading"><div><h1>${E(record.title)}</h1><p>${E(recordDate(record))} · ${record.people} участников · ${E(record.duration)}</p></div><div class="record-detail-header-actions"><button class="btn btn-secondary" data-action="navigate" data-value="recordings">${I('ArrowLeft')}Все записи</button>${menuButton(index)}</div></header><div class="record-detail record-overview-layout"><div class="record-player"><div class="row between"><span>${I('Video')} ${E(record.title)}</span><span class="badge">Демо записи</span></div><div class="record-mini-grid">${D.people.map(person => `<div>${D.avatar(person[0], person[3])}</div>`).join('')}</div><div class="player-controls"><button data-action="play-record" aria-label="Воспроизвести демо записи" id="play-button">${I('Play')}</button><time id="record-time">00:00</time><input type="range" id="record-progress" aria-label="Позиция записи" min="0" max="${minutes * 60 + seconds}" value="0"><time>${E(record.duration)}</time><button data-action="record-audio" aria-label="Информация о звуке">${I('Volume2')}</button></div></div><section class="record-notes panel record-about" aria-labelledby="record-about-title"><h3 id="record-about-title">О записи</h3>${infoList(index)}<div class="record-about-actions"><button class="btn btn-primary" data-action="record-download-video" data-id="${index}">${I('Download')}Скачать видеозапись</button><button class="btn btn-secondary" data-action="copy-record">${I('Link')}Скопировать ссылку</button></div></section></div></div>`;
  };
  function closeMenu(restoreFocus = false) {
    const trigger = menuTrigger;
    menu?.remove(); menu = null; menuTrigger = null;
    if (trigger?.isConnected) {
      trigger.setAttribute('aria-expanded', 'false');
      trigger.removeAttribute('aria-controls');
      if (restoreFocus) trigger.focus();
    }
  }
  function openMenu(trigger) {
    const index = recordIndex(trigger.dataset.id);
    if (!D.recordVisible(index)) return;
    if (menuTrigger === trigger) { closeMenu(true); return; }
    closeMenu();
    menuTrigger = trigger;
    menu = document.createElement('div');
    menu.id = 'record-library-menu';
    menu.className = 'record-library-menu';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', 'Действия с записью');
    menu.innerHTML = `<button type="button" role="menuitem" tabindex="-1" data-action="record-copy-link" data-id="${index}">${I('Copy')}Копировать ссылку</button><button type="button" role="menuitem" tabindex="-1" data-action="record-file-info" data-id="${index}">${I('FileText')}Сведения о файле</button>${D.recordCanDelete(index) ? `<button type="button" role="menuitem" tabindex="-1" class="record-menu-danger" data-action="record-delete" data-id="${index}">${I('Trash2')}Удалить запись</button>` : ''}<p>Для участников с доступом к встрече.</p>`;
    document.body.append(menu);
    trigger.setAttribute('aria-expanded', 'true');
    trigger.setAttribute('aria-controls', menu.id);
    const rect = trigger.getBoundingClientRect(), bounds = menu.getBoundingClientRect();
    menu.style.left = `${Math.max(12, Math.min(rect.right - bounds.width, window.innerWidth - bounds.width - 12))}px`;
    menu.style.top = `${Math.max(12, rect.bottom + bounds.height + 8 <= window.innerHeight ? rect.bottom + 6 : rect.top - bounds.height - 6)}px`;
    menu.querySelector('[role="menuitem"]')?.focus();
  }
  async function copyLink(index) {
    closeMenu(true);
    if (!D.recordVisible(index)) return;
    const link = D.localLink('recording', { record: index });
    try { await navigator.clipboard.writeText(link); D.toast('Ссылка на запись скопирована'); }
    catch {
      D.openModal('Ссылка на запись', `<p class="modal-note">Скопируйте ссылку вручную. Она открывает эту запись в локальном макете.</p><label class="field">Ссылка<input id="record-copy-fallback" value="${E(link)}" readonly></label><div class="modal-actions"><button class="btn btn-primary" data-action="close-modal">Готово</button></div>`);
      setTimeout(() => { $('#record-copy-fallback')?.focus(); $('#record-copy-fallback')?.select(); }, 30);
    }
  }
  function showFileInfo(index) {
    closeMenu(true);
    if (!D.recordVisible(index)) return;
    D.openModal('Сведения о записи', `<div class="record-file-heading">${I('Video')}<div><h3>${E(records[index].title)}</h3><p>Видеозапись · демонстрационный пример</p></div></div>${infoList(index)}<div class="modal-actions"><button class="btn btn-secondary" data-action="close-modal">Закрыть</button><button class="btn btn-primary" data-action="record-download-info" data-id="${index}">${I('Download')}Скачать файл</button></div>`);
  }
  function confirmDelete(index) {
    closeMenu(true);
    if (!D.recordCanDelete(index)) { D.toast('Запись недоступна для удаления.'); return; }
    pendingDelete = index;
    D.openModal('Удалить запись?', `<div class="record-delete-dialog" data-record-delete="${index}"><p class="record-delete-title">${E(records[index].title)} · ${E(recordDate(records[index]))}</p><p>Запись и её файлы будут удалены для всех участников встречи. Восстановить их будет невозможно.</p><p class="modal-note">Демонстрационный режим: удаляется только запись в этом макете на вашем устройстве.</p><p id="record-delete-error" class="record-delete-error" role="alert" hidden></p><div class="modal-actions"><button class="btn btn-secondary" data-action="record-delete-cancel">Отмена</button><button class="btn btn-danger" data-action="record-delete-confirm" data-id="${index}">Удалить запись</button></div></div>`);
  }
  function removeRecord(index) {
    if (pendingDelete !== index || !D.recordCanDelete(index) || !$(`[data-record-delete="${index}"]`)) return;
    const previous = S.deletedRecordingIds;
    S.deletedRecordingIds = [...(Array.isArray(previous) ? previous : []), index];
    if (D.save() === false) {
      if (previous === undefined) delete S.deletedRecordingIds; else S.deletedRecordingIds = previous;
      const error = $('#record-delete-error');
      if (error) { error.hidden = false; error.textContent = 'Не удалось сохранить удаление. Запись осталась в списке. Попробуйте ещё раз.'; }
      return;
    }
    pendingDelete = null;
    clearInterval(D.recordTimer); D.recordTimer = null;
    D.closeModal();
    if (S.screen === 'recording') D.go('recordings'); else D.render();
    D.toast('Демонстрационная запись удалена');
    const firstCard = $('[data-action="record-menu"]') || $('#record-library-search');
    firstCard?.focus();
  }
  Object.assign(D.handlers, {
    'record': button => {
      closeMenu();
      const index = recordIndex(button.dataset.id);
      if (!D.recordVisible(index)) { D.toast('Запись недоступна или удалена'); D.go('recordings'); return; }
      clearInterval(D.recordTimer); D.recordTimer = null;
      S.record = index; S.recordTab = 'transcript'; D.go('recording');
    },
    'record-view': button => {
      const view = button.dataset.value;
      if (!['list', 'grid'].includes(view)) return;
      closeMenu(); S.recordView = view; D.save();
      $('#record-grid')?.classList.toggle('records-list', view === 'list');
      document.querySelectorAll('[data-action="record-view"]').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.value === view)));
    },
    'record-clear-search': () => { S.recordingQuery = ''; D.render(); $('#record-library-search')?.focus(); },
    'record-menu': openMenu,
    'record-copy-link': button => copyLink(recordIndex(button.dataset.id)),
    'copy-record': () => copyLink(recordIndex(S.record)),
    'record-file-info': button => showFileInfo(recordIndex(button.dataset.id)),
    'record-download-video': button => {
      const index = recordIndex(button.dataset.id);
      if (!D.recordVisible(index)) return;
      const record = records[index];
      if (!record.videoUrl) {D.toast('Видеозапись недоступна для скачивания'); return;}
      let url;
      try {url = new URL(record.videoUrl, location.href);} catch {D.toast('Видеозапись недоступна для скачивания'); return;}
      if (!['http:', 'https:', 'blob:'].includes(url.protocol) && !(location.protocol === 'file:' && url.protocol === 'file:')) {D.toast('Видеозапись недоступна для скачивания'); return;}
      const link = document.createElement('a');
      link.href = url.href; link.download = record.fileName || `${record.title}.mp4`;
      link.target = '_blank'; link.rel = 'noopener noreferrer'; link.click();
    },
    'record-download-info': button => {
      const index = recordIndex(button.dataset.id);
      if (!D.recordVisible(index)) return;
      const record = metadata(index);
      D.download('Сведения о демозаписи.txt', `MeetSpace — демонстрационная запись\n\nНазвание: ${record.title}\nДата: ${recordDate(record)}\nДлительность: ${record.duration}\nОрганизатор: ${ownerName(record)}\nУчастников: ${record.people}\n\nВидеофайл не подключён. Этот TXT содержит только сведения о демонстрационной записи.`);
      D.toast('Скачаны сведения о демонстрационной записи');
    },
    'record-delete': button => confirmDelete(recordIndex(button.dataset.id)),
    'record-delete-cancel': () => { pendingDelete = null; D.closeModal(); },
    'record-delete-confirm': button => removeRecord(recordIndex(button.dataset.id)),
    'record-past-meetings': () => { closeMenu(); S.meetingTab = 'past'; S.query = ''; S.from = ''; S.to = ''; S.scope = 'all'; S.selected = null; D.go('meetings'); }
  });
  document.addEventListener('input', event => {
    if (event.target.id !== 'record-library-search') return;
    closeMenu(); S.recordingQuery = event.target.value;
    $('#record-grid').innerHTML = cards(S.recordingQuery);
  });
  document.addEventListener('pointerdown', event => {
    if (menu && !menu.contains(event.target) && !menuTrigger?.contains(event.target)) closeMenu();
  });
  document.addEventListener('keydown', event => {
    const trigger = event.target.closest?.('[data-action="record-menu"]');
    if (!menu && trigger && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault(); event.stopPropagation(); openMenu(trigger);
      if (event.key === 'ArrowUp' && menu) {
        const items = menu.querySelectorAll('[role="menuitem"]');
        items[items.length - 1]?.focus();
      }
      return;
    }
    if (!menu || (!menu.contains(event.target) && !menuTrigger?.contains(event.target))) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeMenu(true); return; }
    if (event.key === 'Tab') { closeMenu(true); return; }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    const items = [...menu.querySelectorAll('[role="menuitem"]')], current = items.indexOf(document.activeElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[next]?.focus();
  }, true);
  document.addEventListener('focusin', event => {
    if (menu && !menu.contains(event.target) && !menuTrigger?.contains(event.target)) closeMenu();
  });
  document.addEventListener('scroll', event => { if (menu && !menu.contains(event.target)) closeMenu(); }, true);
  window.addEventListener('resize', () => closeMenu());
  document.addEventListener('desk:render', () => closeMenu());
})();
