(() => {
  'use strict';
  const D = window.Desk, S = D.state, E = D.esc, I = D.icon;
  const $ = selector => document.querySelector(selector);
  const initials = name => String(name || '').trim().split(/\s+/).slice(0, 2).map(part => part[0] || '').join('');
  const safeImage = src => typeof src === 'string' && /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(src);
  D.avatarImage = photo => safeImage(photo?.src) ? `<img class="avatar-photo" src="${E(photo.src)}" alt="" draggable="false">` : '';
  D.profileAvatar = (online = false, extra = '') => D.avatar(initials(S.profile.name), `blue ${extra}`, online, S.profile.avatar, 'data-avatar-self');
  D.chatAvatar = chat => D.avatar(chat.initials, chat.color, !chat.group, chat.group ? S.groupAvatars?.[chat.id] : null, chat.group ? `data-avatar-group="${E(chat.id)}"` : '');
  function target(kind, id) {
    if (kind === 'profile' && S.activeAccountId) return {name:S.profile.name, photo:S.profile.avatar, initials:initials(S.profile.name), color:'blue'};
    const chat = kind === 'group' && D.chats.find(item => item.id === id && item.group && (!D.chatIsVisible || D.chatIsVisible(id)));
    return chat ? {name:chat.name, photo:S.groupAvatars?.[id], initials:chat.initials, color:chat.color} : null;
  }
  D.avatarControl = (kind, id = '') => {
    const data = target(kind, id); if (!data) return '';
    const hasPhoto = !!D.avatarImage(data.photo), attrs = `data-kind="${E(kind)}" data-id="${E(id)}"`;
    return `<section class="avatar-settings" data-avatar-control="${E(kind)}" data-id="${E(id)}" aria-label="${kind === 'group' ? 'Фото группы' : 'Фото профиля'}"><button type="button" class="avatar-settings-preview ${kind}" data-action="avatar-edit" ${attrs} aria-label="${hasPhoto ? 'Изменить' : 'Добавить'} фото ${kind === 'group' ? 'группы' : 'профиля'}">${D.avatar(data.initials, data.color, false, data.photo)}<span class="avatar-camera">${I('Camera')}</span></button><div class="avatar-settings-copy"><h3>${kind === 'group' ? 'Фото группы' : 'Фото профиля'}</h3><p>${hasPhoto ? 'Настройте кадр или выберите новое фото.' : kind === 'group' ? 'Помогите участникам быстрее находить этот чат.' : 'Добавьте фото, чтобы вас было проще узнать.'}</p><div class="avatar-settings-actions"><button type="button" class="btn btn-soft btn-small" data-action="avatar-edit" ${attrs}>${I(hasPhoto ? 'SquarePen' : 'Upload')}${hasPhoto ? 'Изменить фото' : 'Добавить фото'}</button>${hasPhoto ? `<button type="button" class="avatar-remove-link" data-action="avatar-remove" ${attrs}>Удалить</button>` : ''}</div><small>JPG, PNG или WebP · до 5 МБ</small></div></section>`;
  };
  function refresh() {
    document.querySelectorAll('[data-avatar-self]').forEach(el => {el.innerHTML = D.avatarImage(S.profile.avatar) || E(initials(S.profile.name));});
    document.querySelectorAll('[data-avatar-group]').forEach(el => {
      const chat = D.chats.find(item => item.id === el.dataset.avatarGroup);
      if (chat) el.innerHTML = D.avatarImage(S.groupAvatars?.[chat.id]) || E(chat.initials);
    });
    document.querySelectorAll('[data-avatar-control]').forEach(el => {el.outerHTML = D.avatarControl(el.dataset.avatarControl, el.dataset.id);});
  }
  const baseOpen = D.openModal, baseClose = D.closeModal;
  let editor = null;
  function finish(restore = true) {
    const current = editor; editor = null;
    baseClose();
    if (!current) return;
    if (restore && current.account === S.activeAccountId && current.screen === S.screen && current.parent) {
      baseOpen('', '');
      clearTimeout(D.modalFocusTimer);
      $('#modal-root').replaceChildren(current.parent);
      D.lastFocus = current.lastFocus;
    }
    refresh();
    if (restore) requestAnimationFrame(() => {
      if (current.trigger?.isConnected) current.trigger.focus();
      else [...document.querySelectorAll('[data-action="avatar-edit"]')].find(el => el.dataset.kind === current.kind && el.dataset.id === current.id)?.focus();
    });
  }
  D.closeModal = () => editor ? finish() : baseClose();
  D.openModal = (...args) => {if (editor) finish(false); return baseOpen(...args);};
  function persist(current, photo) {
    if (current.account !== S.activeAccountId || !target(current.kind, current.id)) return false;
    const account = S.accounts?.find(item => item.id === S.activeAccountId), accountBefore = account?.data;
    const profileBefore = S.profile, groupsBefore = S.groupAvatars;
    if (current.kind === 'profile') S.profile = {...S.profile, avatar:photo};
    else S.groupAvatars = {...S.groupAvatars, [current.id]:photo};
    if (D.save() !== false) return true;
    S.profile = profileBefore; S.groupAvatars = groupsBefore;
    if (account) account.data = accountBefore;
    return false;
  }
  const validEditor = current => editor === current && current.account === S.activeAccountId && !!$('#avatar-editor');
  function error(message) {const el = $('#avatar-error'); if (el) el.textContent = message;}
  function draw() {
    if (!editor?.image) return;
    const canvas = $('#avatar-canvas'); if (!canvas) return;
    const context = canvas.getContext('2d'), img = editor.image;
    const zoom = Number($('#avatar-zoom').value), x = (100-Number($('#avatar-x').value))/2, y = (100-Number($('#avatar-y').value))/2;
    const side = Math.min(img.naturalWidth, img.naturalHeight) / zoom;
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(img, (img.naturalWidth - side) * x / 100, (img.naturalHeight - side) * y / 100, side, side, 0, 0, canvas.width, canvas.height);
    $('#avatar-zoom-value').textContent = `${Math.round(zoom * 100)}%`;
    for (const [key, extent] of [['x', img.naturalWidth-side], ['y', img.naturalHeight-side]]) {
      const input = $('#avatar-'+key);
      input.disabled = extent < .001;
      $('#avatar-'+key+'-value').textContent = `${Math.round(Number(input.value))}%`;
    }
    editor.crop = {zoom, x, y};
  }
  function decode(src) {
    return new Promise((resolve, reject) => {
      const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('Не удалось открыть изображение. Выберите другой файл.')); image.src = src;
    });
  }
  function busy(value) {
    const el = $('#avatar-editor'); if (!el) return;
    el.setAttribute('aria-busy', String(value));
    el.querySelectorAll('[data-action="avatar-save"], [data-action="avatar-choose"], input[type="range"]').forEach(control => {control.disabled = value || (control.type === 'range' && !editor?.image);});
    if ($('#avatar-save')) $('#avatar-save').disabled = value || !editor?.image;
    if (!value && editor?.image) draw();
  }
  function showImage(image, original, crop = {zoom:1, x:50, y:50}) {
    editor.image = image; editor.original = original;
    $('#avatar-editor').classList.add('has-image');
    $('#avatar-file-label').textContent = 'Заменить фото';
    $('#avatar-zoom').value = crop.zoom; $('#avatar-x').value = 100-2*crop.x; $('#avatar-y').value = 100-2*crop.y;
    busy(false); draw();
  }
  async function loadFile(file) {
    const current = editor; if (!current || !file) return;
    error('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {error('Выберите изображение JPG, PNG или WebP.'); return;}
    if (file.size > 5 * 1024 * 1024) {error('Размер файла больше 5 МБ. Выберите изображение поменьше.'); return;}
    const sequence = ++current.sequence; busy(true);
    let url;
    try {
      url = URL.createObjectURL(file);
      const image = await decode(url);
      if (!validEditor(current) || sequence !== current.sequence) return;
      if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 40000000) throw new Error('Изображение слишком большое. Выберите фото до 40 мегапикселей.');
      const canvas = document.createElement('canvas'), scale = Math.min(1, 1024 / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.drawImage(image,0,0,canvas.width,canvas.height);
      const original = canvas.toDataURL('image/jpeg', .82), normalized = await decode(original);
      if (validEditor(current) && sequence === current.sequence) showImage(normalized, original);
    } catch (err) {if (validEditor(current) && sequence === current.sequence) error(err.message || 'Не удалось открыть изображение.');}
    finally {if (url) URL.revokeObjectURL(url); if (validEditor(current) && sequence === current.sequence) busy(false);}
  }
  async function openEditor(button, remove = false) {
    const kind = button.dataset.kind, id = button.dataset.id || '', data = target(kind, id); if (!data) return;
    const parent = $('#modal-root').firstElementChild, lastFocus = D.lastFocus;
    if (parent) parent.remove();
    const current = {kind, id, account:S.activeAccountId, screen:S.screen, parent, lastFocus, trigger:button, sequence:0};
    editor = current;
    const heading = kind === 'group' ? 'Фото группы' : 'Фото профиля';
    if (remove) {
      baseOpen('Удалить фото?', `<div id="avatar-editor"><p class="modal-note">Вместо фотографии ${kind === 'group' ? 'группы' : 'профиля'} будут отображаться инициалы. Вы сможете добавить новое фото в любое время.</p><div class="modal-actions"><button type="button" class="btn btn-secondary" data-action="close-modal">Отмена</button><button type="button" class="btn btn-danger" data-action="avatar-delete-confirm">Удалить фото</button></div></div>`); return;
    }
    baseOpen(heading, `<div id="avatar-editor" class="avatar-editor ${kind}"><div class="avatar-editor-body"><div class="avatar-workspace"><div class="avatar-crop"><canvas id="avatar-canvas" width="512" height="512" tabindex="0" role="img" aria-label="Область обрезки фотографии. Перетащите фото или используйте стрелки."></canvas><div class="avatar-crop-guide" aria-hidden="true"></div><div class="avatar-placeholder">${I(kind === 'group' ? 'Users' : 'UserRound')}</div></div><p class="avatar-drag-hint">Перетащите фото или используйте ползунки.</p></div><div class="avatar-editor-tools"><button type="button" class="btn avatar-file-choice" data-action="avatar-choose">${I('Upload')}<span id="avatar-file-label">Добавить фото</span></button><input type="file" id="avatar-file" accept="image/jpeg,image/png,image/webp" hidden><p class="avatar-file-note">JPG, PNG или WebP · до 5 МБ</p><div class="avatar-adjustments">${[['zoom','Масштаб',1,3,.01,1,'100%'],['x','По горизонтали',-100,100,1,0,'0%'],['y','По вертикали',-100,100,1,0,'0%']].map(([key,label,min,max,step,value,output])=>`<label for="avatar-${key}">${label}<output id="avatar-${key}-value">${output}</output></label><input id="avatar-${key}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" disabled>`).join('')}<button type="button" class="avatar-reset" data-action="avatar-reset">Сбросить</button></div></div><p id="avatar-error" class="avatar-error" role="alert"></p></div><footer class="avatar-editor-footer"><div><button type="button" class="btn btn-secondary" data-action="close-modal">Отмена</button><button type="button" id="avatar-save" class="btn btn-primary" data-action="avatar-save" disabled>${I('Check')}Сохранить фото</button></div><p>Изображение остаётся в макете и не отправляется на сервер.</p></footer></div>`, true);
    $('.modal').classList.add('avatar-editor-modal');
    bindDragging();
    const src = data.photo?.original || data.photo?.src;
    if (safeImage(src)) {
      busy(true);
      try {const image = await decode(src); if (validEditor(current)) showImage(image, src, data.photo.crop);}
      catch {if (validEditor(current)) error('Не удалось открыть сохранённое фото. Выберите новый файл.');}
      finally {if (validEditor(current)) busy(false);}
    }
  }
  Object.assign(D.handlers, {
    'avatar-edit':button => openEditor(button),
    'avatar-remove':button => openEditor(button, true),
    'avatar-choose':() => $('#avatar-file')?.click(),
    'avatar-reset':() => {if (!editor?.image) return; $('#avatar-zoom').value = 1; $('#avatar-x').value = 0; $('#avatar-y').value = 0; draw();},
    'avatar-save':() => {
      if (!editor?.image) return;
      const photo = {src:$('#avatar-canvas').toDataURL('image/jpeg', .88), original:editor.original, crop:editor.crop};
      if (persist(editor, photo)) {finish(); D.toast('Фото сохранено');}
      else error('Не удалось сохранить фото. Освободите место в браузере и попробуйте ещё раз.');
    },
    'avatar-delete-confirm':() => {if (editor && persist(editor, null)) {finish(); D.toast('Фото удалено');}}
  });
  const clamp = value => Math.min(100, Math.max(-100, value));
  function bindDragging() {
    const canvas=$('#avatar-canvas'); let drag=null;
    canvas.addEventListener('pointerdown',event=>{
      if(event.button!==0 || !editor?.image || $('#avatar-editor').getAttribute('aria-busy')==='true')return;
      event.preventDefault();canvas.focus({preventScroll:true});
      const side=Math.min(editor.image.naturalWidth,editor.image.naturalHeight)/editor.crop.zoom;
      drag={pointer:event.pointerId,x:event.clientX,y:event.clientY,left:Number($('#avatar-x').value),top:Number($('#avatar-y').value),side,w:editor.image.naturalWidth,h:editor.image.naturalHeight,current:editor};
      canvas.setPointerCapture(event.pointerId);canvas.classList.add('dragging');
    });
    canvas.addEventListener('pointermove',event=>{
      if(!drag||event.pointerId!==drag.pointer||!validEditor(drag.current))return;
      const ratio=drag.side/canvas.getBoundingClientRect().width;
      $('#avatar-x').value=drag.w>drag.side?clamp(drag.left+(event.clientX-drag.x)*ratio*200/(drag.w-drag.side)):0;
      $('#avatar-y').value=drag.h>drag.side?clamp(drag.top+(event.clientY-drag.y)*ratio*200/(drag.h-drag.side)):0;
      draw();
    });
    for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,event=>{
      if(drag&&event.pointerId!==drag.pointer)return;
      drag=null;canvas.classList.remove('dragging');
      if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
    });
    canvas.addEventListener('keydown',event=>{
      if(!editor?.image||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
      event.preventDefault();const key=['ArrowLeft','ArrowRight'].includes(event.key)?'x':'y',input=$('#avatar-'+key);
      if(input.disabled)return;
      input.value=clamp(Number(input.value)+(['ArrowLeft','ArrowUp'].includes(event.key)?-1:1)*(event.shiftKey?10:2));draw();
    });
  }
  document.addEventListener('input', event => {if (['avatar-zoom','avatar-x','avatar-y'].includes(event.target.id)) draw();});
  document.addEventListener('change', event => {if (event.target.id === 'avatar-file') {const file = event.target.files?.[0]; event.target.value = ''; loadFile(file);}});
})();
