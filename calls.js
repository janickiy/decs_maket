(() => {
'use strict';
const D = window.Desk, I = D.icon, E = D.esc;
const $ = s => document.querySelector(s);
function call() {
  const c = D.state.call ||= {};
  const base = {title:'Дизайн-синхронизация', mic:true, camera:false, sharing:false, presenting:false, presentationHidden:false, viewMode:'grid', featuredId:'dmitry', railPage:0, recording:false, hand:false, panel:null, name:D.state.profile?.name || 'Александр Соколов', noise:true, volume:75, background:'none', messages:[], draft:''};
  for (const [k,v] of Object.entries(base)) if (c[k] === undefined) c[k] = v;
  return c;
}
function initials(name) { return name.trim().split(/\s+/).map(s=>s[0]).slice(0,2).join('') || 'ВЫ'; }
function people() {
  const c=call();
  const all=[
    {id:'dmitry',name:'Дмитрий Смирнов',role:'Участник',initials:'ДС',color:'lilac',talking:true,cameraDemo:true},
    {id:'anna',name:'Анна Кузнецова',role:'Организатор',initials:'АК',color:'peach'},
    {id:'maria',name:'Мария Волкова',role:'Участник',initials:'МВ',color:'mint'},
    {id:'max',name:'Максим Петров',role:'Участник',initials:'МП',color:'lilac'},
    {id:'self',name:c.name,role:'Вы',initials:initials(c.name),color:'self',own:true}
  ];
  if(c.personal){const target=D.chats?.find(item=>item.id===c.meetingId);if(target)all[0]={id:'contact',name:target.name,role:'Участник',initials:target.initials||initials(target.name),color:target.color==='peach'?'peach':target.color==='green'?'mint':'lilac',talking:true};return [all[0],all[4]];}return all;
}
function elapsed() { const total=Math.max(0,Math.floor((Date.now()-(call().startedAt||Date.now()))/1000)); return `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`; }
function button(action,icon,label,active=false,extra='') { return `<button type="button" class="call-control ${active?'selected':''} ${extra}" data-action="${action}" aria-label="${label}" title="${label}" aria-pressed="${active}"><span>${I(icon)}</span><small>${label}</small></button>`; }
function avatar(p,size='') { return `<span class="call-avatar ${p.color} ${size}">${p.own||p.color==='self'?D.avatarImage(D.state.profile.avatar)||E(p.initials):E(p.initials)}</span>`; }
function bars() { return '<span class="voice-bars" aria-label="Говорит"><i></i><i></i><i></i><i></i></span>'; }
function tile(p,mini=false,featured=false) {
  const c=call(), name=p.own?'Вы':p.name;
  const tag=featured?'article':'button';
  const attrs=featured?`aria-label="Видео · ${E(name)}"`:`type="button" data-action="call-feature" data-value="${E(p.id)}" aria-label="Показать крупно: ${E(name)}"`;
  return `<${tag} class="call-tile ${p.talking?'speaker':''} ${p.own?'own':''} ${mini?'mini':''} ${p.cameraDemo?'has-camera':''}" ${attrs}><div class="tile-ambient"></div>${p.cameraDemo?'<img class="call-camera-feed" src="assets/call-camera-demo.jpg" width="1280" height="720" alt="Демонстрационный кадр камеры" draggable="false">':`<div class="tile-person">${avatar(p)}${p.own&&c.camera?'<span>Камера · демо</span>':''}</div>`}${p.talking?`<span class="speaker-label">${bars()} Говорит</span>`:''}<div class="tile-caption"><strong>${E(name)}</strong><span>${p.talking?bars():I(p.own&&c.mic?'Mic':'MicOff')}</span></div></${tag}>`;
}
function speakerLayout() {
  const c=call(),all=people(),featured=all.find(p=>p.id===c.featuredId)||all[0];
  const others=all.filter(p=>p.id!==featured.id),pages=Math.ceil(others.length/3);
  const page=Math.min(Math.max(0,Number(c.railPage)||0),Math.max(0,pages-1));
  return `<div class="call-speaker-layout"><div class="call-featured">${tile(featured,false,true)}</div><div class="call-speaker-rail"><div class="presentation-filmstrip" aria-label="Участники встречи">${others.slice(page*3,page*3+3).map(p=>tile(p,true)).join('')}</div>${pages>1?`<div class="call-rail-pages" role="group" aria-label="Страницы участников">${Array.from({length:pages},(_,i)=>`<button type="button" class="${i===page?'active':''}" data-action="call-rail-page" data-value="${i}" aria-label="Страница ${i+1} из ${pages}" aria-pressed="${i===page}"></button>`).join('')}</div>`:''}</div></div>`;
}
D.screens.prejoin = () => {
  const c=call();
  return `<section class="call-prejoin"><button class="prejoin-back" data-action="navigate" data-value="meetings">${I('ArrowLeft')} Все встречи</button><div class="prejoin-title"><span class="prejoin-eyebrow">ПОЧТИ НА МЕСТЕ</span><h1>${E(c.title)}</h1><p>Проверьте звук и устраивайтесь поудобнее</p></div><div class="prejoin-layout"><div><div class="prejoin-preview"><span class="preview-demo">Демо-предпросмотр</span><div class="preview-person">${avatar({initials:initials(c.name),color:'self'})}<strong>${E(c.name)}</strong><span>${c.camera?'Камера включена в макете':'Ваша камера выключена'}</span></div><div class="preview-tools"><button class="${c.mic?'':'off'}" data-action="call-mic" title="${c.mic?'Выключить':'Включить'} микрофон" aria-label="${c.mic?'Выключить':'Включить'} микрофон">${I(c.mic?'Mic':'MicOff')}</button><button class="${c.camera?'':'off'}" data-action="call-camera" title="${c.camera?'Выключить':'Включить'} камеру" aria-label="${c.camera?'Выключить':'Включить'} камеру">${I(c.camera?'Video':'VideoOff')}</button><button data-action="call-background" title="Настройки фона" aria-label="Настройки фона">${I('Sparkles')}</button></div></div><p class="prejoin-privacy">${I('ShieldCheck')} Локальный макет. Камера и микрофон устройства не используются.</p></div><div class="prejoin-settings"><h2>Готовы присоединиться?</h2><div class="prejoin-waiting"><div class="waiting-avatars">${people().filter(p=>!p.own).slice(0,3).map(p=>avatar(p)).join('')}</div><span>${c.personal?E(people()[0].name.split(' ')[0])+' уже ждёт вас': 'Анна и ещё 3 участника уже здесь'}</span></div><label class="field">Ваше имя<input data-call-setting="name" id="call-name" maxlength="60" value="${E(c.name)}" placeholder="Как вас представить?"></label><label class="field">${I('Mic')} Микрофон<select data-call-setting="microphone"><option>Микрофон по умолчанию · демо</option><option ${c.microphone?.startsWith('Гарнитура')?'selected':''}>Гарнитура · демо</option></select></label><div class="prejoin-sound"><span class="sound-level"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span><small>${c.mic?'Пример уровня звука':'Микрофон выключен'}</small></div><label class="field">${I('Volume2')} Динамики<select data-call-setting="speaker"><option>Динамики по умолчанию · демо</option><option ${c.speaker?.startsWith('Наушники')?'selected':''}>Наушники · демо</option></select></label><div class="prejoin-volume"><input type="range" min="0" max="100" value="${c.volume}" data-call-setting="volume" aria-label="Громкость динамиков"><button data-action="call-test-sound">Проверить звук</button></div><label class="call-checkbox"><input type="checkbox" data-call-setting="noise" ${c.noise?'checked':''}><span>Подавление фонового шума</span><span class="small-demo">демо</span></label><button class="btn btn-primary join-call-button" data-action="call-start">${I('Video')} ${c.personal?'Начать звонок':'Присоединиться к встрече'} ${I('ArrowRight')}</button><p class="prejoin-join-note">Подключение к демонстрационной комнате</p></div></div></section>`;
};
function presentation() {
  const c=call();
  const presenter=c.sharing?'Вы демонстрируете экран · демо':'Анна Кузнецова демонстрирует экран';
  return `<div class="call-presentation"><div class="presentation-view"><div class="presentation-canvas"><div class="presentation-paper"><div class="slide-orbit" aria-hidden="true"></div><span class="slide-eyebrow">MEETSPACE / PRODUCT</span><h2>В одной<br>команде.<br>На одной волне.</h2><p class="slide-description">Следующая глава нашего продукта</p><span class="slide-page">01 / 08</span></div></div><div class="presentation-header">${I('Monitor')}<span>${presenter}</span>${c.sharing?'<button data-action="call-share">Остановить</button>':'<span class="presentation-demo">Демо-презентация</span>'}</div></div><div class="presentation-filmstrip" style="--participant-count:${people().length}">${people().map(p=>tile(p,true)).join('')}</div></div>`;
}
function callMessages() {
  const c=call(), initial=c.personal?[{name:people()[0].name,text:'Привет! Я на месте.',time:'10:00',initials:people()[0].initials,color:people()[0].color}]:[{name:'Анна Кузнецова',text:'Всем привет! Сегодня обсудим новые экраны и следующие шаги 👋',time:'10:00',initials:'АК',color:'lilac'},{name:'Максим Петров',text:'Привет! Я на месте.',time:'10:01',initials:'МП',color:'peach'}];
  return [...initial,...c.messages].map(m=>`<div class="call-message ${m.own?'own':''}">${avatar({initials:m.initials||initials(m.name),color:m.color||'self'})}<div><div class="call-message-bubble"><div class="call-message-meta"><strong>${m.own?'Вы':E(m.name)}</strong></div><p>${E(m.text).replace(/\n/g,'<br>')}</p><footer class="call-message-footer"><time>${E(m.time)}</time>${m.own?`<span class="call-message-sent" role="img" aria-label="Отправлено" title="Отправлено">${I('Check')}</span>`:''}</footer></div></div></div>`).join('');
}
function sidePanel() {
  const c=call();if(!c.panel)return '';
  return `<aside class="call-sidepanel" aria-label="Панель встречи"><div class="call-panel-head"><h2>${c.panel==='people'?'Участники встречи':'Чат встречи'}</h2><button class="panel-close" data-action="call-panel" data-value="none" aria-label="Закрыть панель встречи">${I('X')}</button></div><div class="call-panel-tabs"><button class="${c.panel==='chat'?'active':''}" data-action="call-panel" data-value="chat" aria-pressed="${c.panel==='chat'}">Чат</button><button class="${c.panel==='people'?'active':''}" data-action="call-panel" data-value="people" aria-pressed="${c.panel==='people'}">Участники <span>${people().length}</span></button></div>${c.panel==='people'?`<div class="call-panel-content"><div class="participants-caption">НА ВСТРЕЧЕ · ${people().length}</div>${people().map(p=>`<div class="call-participant">${avatar(p)}<div><strong>${E(p.name)}${p.own?' (вы)':''}</strong><small>${p.role==='Вы'?'Участник':p.role}</small></div><span class="participant-status">${p.talking?bars():I(p.own&&c.mic?'Mic':'MicOff')}</span></div>`).join('')}<button class="invite-call" data-action="call-invite">${I('UserPlus')} Пригласить участников</button></div>`:`<div class="call-chat-messages" id="call-chat-messages"><div class="call-chat-notice">Сегодня</div>${callMessages()}</div><div class="call-chat-composer"><textarea id="call-chat-input" placeholder="Напишите сообщение…" rows="1" maxlength="2000" aria-label="Сообщение участникам">${E(c.draft)}</textarea><div><span>Enter — отправить</span><button data-action="call-send" aria-label="Отправить сообщение">${I('Send')}</button></div></div>`}</aside>`;
}
function inviteLink() { return D.localLink('prejoin',{meeting:call().meetingId||'design',theme:D.state.theme}); }
function invitationText() { return `Приглашаю на встречу «${call().title}».\n\nПодключиться к встрече: ${inviteLink()}`; }
function showInvitation() {
  const link=inviteLink();let qr='';
  try { qr=window.MeetSpaceQR.toSvg(link); } catch { qr='<p class="modal-note">QR-код недоступен. Используйте ссылку на встречу.</p>'; }
  D.openModal('Поделиться встречей',`<div class="call-share-dialog"><p class="call-share-title">${E(call().title)}</p><div class="call-share-card"><div class="call-share-copy"><h3>Ссылка на встречу</h3><p>Поделитесь ссылкой или отсканируйте QR-код, чтобы открыть встречу.</p><div class="call-share-link-row"><input readonly id="call-invite-link" aria-label="Ссылка на встречу" value="${E(link)}"><button type="button" class="btn btn-soft" data-action="call-copy-invite">${I('Copy')}<span>Копировать</span></button></div><p class="call-share-local-note">В локальном макете ссылка открывается на этом компьютере.</p></div><aside class="call-share-qr"><div class="call-share-qr-code" role="img" aria-label="QR-код ссылки на встречу">${qr}</div><strong>QR-код встречи</strong><p>Отсканируйте, чтобы открыть ссылку</p></aside></div><div class="call-share-footer"><button type="button" class="btn btn-primary" data-action="call-invite-people">${I('Mail')}Пригласить участников</button></div></div>`,true);
  $('.modal')?.classList.add('call-share-modal');
}
function showInvitePeople() {
  D.openModal('Пригласить участников',`<form id="call-invite-people-form"><p class="modal-note">Укажите адреса участников и скопируйте приглашение для отправки.</p><label class="field">Электронная почта участников<input name="emails" type="email" multiple required maxlength="600" autocomplete="off" placeholder="anna@company.ru, max@company.ru"></label><label class="field">Текст приглашения<textarea id="call-invite-message" readonly rows="5">${E(invitationText())}</textarea></label><div class="modal-actions"><button type="button" class="btn btn-secondary" data-action="call-invite">Назад</button><button type="submit" class="btn btn-primary">${I('Copy')}Копировать приглашение</button></div></form>`);
}
async function copyInvitation(text,input,notice='Ссылка скопирована') {
  if(!input)return;
  try { await navigator.clipboard.writeText(text);D.toast(notice); }
  catch { if(input.isConnected){input.focus();input.select();}D.toast('Выделен текст. Нажмите Ctrl+C, чтобы скопировать.'); }
}
D.screens.call = () => {
  const c=call();c.startedAt ||= Date.now();
  const showPresentation=c.sharing&&!c.presentationHidden;
  const view=c.viewMode==='speaker'?'speaker':'grid';
  return `<section class="call-room call-room-reference"><header class="call-room-header"><div class="call-room-name"><a class="call-back-link" href="${E(D.localLink('meetings',{theme:D.state.theme}))}" data-action="navigate" data-value="meetings" aria-label="К списку встреч" title="К списку встреч">${I('ArrowLeft')}</a><div><h1>${E(c.title)}</h1><p>Встреча в эфире <span class="call-demo-label">Демо</span></p></div></div><div class="call-header-actions"><time class="call-clock" aria-label="Время встречи">${elapsed()}</time><button class="recording-status ${c.recording?'is-recording':''}" data-action="call-record" aria-pressed="${c.recording}" aria-label="${c.recording?'Остановить демо-запись':'Включить демо-запись'}">${I('Circle')}<span>${c.recording?'Идёт запись':'Запись'}</span></button><button type="button" class="call-invite-button" data-action="call-invite" aria-haspopup="dialog">${I('Link')}<span>Пригласить</span></button><button type="button" class="call-reconnect" data-action="call-reconnect" aria-label="Переподключиться" title="Переподключиться">${I('RotateCw')}</button></div></header><div class="call-body ${c.panel?'with-panel':''}"><div class="call-stage"><div class="call-viewbar"><div class="call-view-switch" role="group" aria-label="Вид видеовстречи">${[['grid','Grid2X2','Сетка'],['speaker','User','Выступающий']].map(([id,icon,label])=>`<button type="button" class="${!showPresentation&&view===id?'active':''}" data-action="call-view" data-value="${id}" aria-pressed="${!showPresentation&&view===id}">${I(icon)}<span>${label}</span></button>`).join('')}${c.sharing?`<button type="button" class="${showPresentation?'active':''}" data-action="call-view" data-value="presentation" aria-pressed="${showPresentation}">${I('Monitor')}<span>Экран</span></button>`:''}</div><span class="call-participant-count">${I('Users')}${people().length} участников</span></div><div class="call-media">${showPresentation?presentation():view==='speaker'?speakerLayout():`<div class="call-video-grid ${c.personal?'personal':''}" aria-label="Участники видеовстречи">${people().map(p=>tile(p)).join('')}</div>`}</div></div>${sidePanel()}</div><footer class="call-toolbar"><div class="call-controls" role="group" aria-label="Управление видеовстречей">${button('call-mic',c.mic?'Mic':'MicOff','Микрофон',c.mic,c.mic?'':'disabled-media')}${button('call-camera',c.camera?'Video':'VideoOff','Камера',c.camera)}${button('call-share','MonitorUp','Экран',c.sharing)}${button('call-panel','Users','Участники',c.panel==='people','panel-people')}${button('call-panel','MessageSquare','Чат',c.panel==='chat','panel-chat')}${button('call-leave','LogOut','Выйти',false,'leave-call')}</div></footer></section>`;
};
function update() { D.save(); D.render(); }
function toggle(key,notice) { const c=call(); c[key]=!c[key]; update(); if(notice)D.toast(notice(c[key])); }
function send() {
  const input=$('#call-chat-input'),text=input?.value.trim(); if(!text)return;
  const c=call();c.draft='';c.messages.push({name:c.name,own:true,text:text.slice(0,2000),time:new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})});update();$('#call-chat-input')?.focus();
}
Object.assign(D.handlers,{
  'call-start':()=>{const c=call();if(c.personal){D.startPersonalCall(c.meetingId,{mic:c.mic,camera:c.camera});return}c.name=$('#call-name')?.value.trim()||c.name||'Гость';c.startedAt=Date.now();c.messages=[];c.draft='';c.sharing=false;c.presenting=false;c.presentationHidden=false;c.viewMode='grid';c.featuredId='dmitry';c.railPage=0;c.hand=false;c.panel=null;D.save();D.go('call')},
  'call-mic':()=>toggle('mic'),
  'call-camera':()=>toggle('camera',on=>on?'Камера включена в макете. Устройства не используются.':'Камера выключена'),
  'call-hand':()=>toggle('hand',on=>on?'Вы подняли руку':'Вы опустили руку'),
  'call-share':()=>{const c=call();c.sharing=!c.sharing;if(c.sharing)c.presentationHidden=false;update();D.toast(c.sharing?'Показан пример вашей демонстрации. Экран устройства не передаётся.':'Ваша демонстрация завершена')},
  'call-record':()=>toggle('recording',on=>on?'Демо-запись включена. Медиафайл не создаётся.':'Демо-запись остановлена'),
  'call-panel':b=>{const c=call();let value=b.dataset.value;if(!value)value=b.classList.contains('panel-chat')?'chat':'people';c.panel=value==='none'?null:b.closest('.call-panel-tabs')?value:c.panel===value?null:value;update()},
  'call-view':b=>{const c=call(),view=b.dataset.value;if(!['grid','speaker','presentation'].includes(view))return;if(view==='presentation'){if(!c.sharing)return;c.presentationHidden=false}else{c.viewMode=view;c.presentationHidden=true}update();$(`.call-view-switch [data-value="${view}"]`)?.focus()},
  'call-feature':b=>{const c=call(),id=b.dataset.value;if(!people().some(p=>p.id===id))return;c.featuredId=id;c.viewMode='speaker';c.railPage=0;c.presentationHidden=true;update()},
  'call-rail-page':b=>{const page=Number(b.dataset.value),count=Math.ceil((people().length-1)/3);if(!Number.isInteger(page)||page<0||page>=count)return;call().railPage=page;update();$(`.call-rail-pages [data-value="${page}"]`)?.focus()},
  'call-reconnect':()=>D.toast('Демо-подключение обновлено'),
  'call-send':send,
  'call-leave':()=>{const c=call(),length=elapsed(),count=people().length,title=c.title;D.go('meetings');D.openModal('Встреча завершена',`<div class="call-summary"><span class="summary-icon">${I('Check')}</span><h3>Спасибо за встречу!</h3><p>${E(title)}</p><div class="summary-metrics"><div><strong>${length}</strong><span>Длительность</span></div><div><strong>${count}</strong><span>Участников</span></div></div><p class="summary-note">Это демонстрационная сессия. Аудио, видео и запись не сохранялись.</p><button class="btn btn-primary" data-action="close-modal">Вернуться к встречам</button></div>`)},
  'call-background':()=>D.openModal('Фон камеры',`<p class="modal-note">Выберите оформление аватара в демонстрационной комнате.</p><div class="call-background-options">${[['none','Без фона'],['blur','Мягкий фон'],['studio','Студия']].map(([id,name])=>`<button class="${call().background===id?'active':''}" data-action="call-set-background" data-value="${id}"><span class="background-sample ${id}">АС</span>${name}</button>`).join('')}</div>`),
  'call-set-background':b=>{call().background=b.dataset.value;D.closeModal();update();D.toast('Фон выбран для демонстрационного аватара')},
  'call-invite':showInvitation,
  'call-invite-people':showInvitePeople,
  'call-copy-invite':()=>{const input=$('#call-invite-link');return copyInvitation(input?.value,input)},
  'call-test-sound':()=>{try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error();const a=new Audio(),o=a.createOscillator(),g=a.createGain();o.type='sine';o.frequency.value=660;g.gain.value=Number(call().volume)/100*0.12;o.connect(g);g.connect(a.destination);o.start();g.gain.exponentialRampToValueAtTime(0.001,a.currentTime+0.35);o.stop(a.currentTime+0.4);o.onended=()=>a.close();D.toast('Воспроизводится тестовый сигнал')}catch{D.toast('В этом браузере тестовый звук недоступен')}},

});
let composerObserver;
function resizeCallComposer(input = $('#call-chat-input')) {
  if (!input) return;
  input.style.height = 'auto';
  const contentHeight = input.scrollHeight;
  input.style.height = `${Math.max(24, Math.min(120, contentHeight))}px`;
  input.style.overflowY = contentHeight > 120 ? 'auto' : 'hidden';
}
function watchCallComposer() {
  composerObserver?.disconnect();
  composerObserver = null;
  const input = $('#call-chat-input');
  if (!input) return;
  resizeCallComposer(input);
  if (!window.ResizeObserver) return;
  let width = input.clientWidth;
  composerObserver = new ResizeObserver(() => {
    if (input.clientWidth === width) return;
    width = input.clientWidth;
    resizeCallComposer(input);
  });
  composerObserver.observe(input);
}
document.addEventListener('desk:render', watchCallComposer);
document.addEventListener('submit',event=>{
  const form=event.target;if(form.id!=='call-invite-people-form')return;event.preventDefault();
  if(!form.reportValidity())return;
  const input=$('#call-invite-message'),emails=new FormData(form).get('emails').trim();
  input.value=`Кому: ${emails}\n\n${invitationText()}`;
  copyInvitation(input.value,input,'Приглашение скопировано');
});
document.addEventListener('change',e=>{const key=e.target.dataset.callSetting;if(!key)return;call()[key]=e.target.type==='checkbox'?e.target.checked:e.target.type==='range'?Number(e.target.value):e.target.value;D.save()});
document.addEventListener('input',e=>{if(e.target.id==='call-chat-input'){call().draft=e.target.value;resizeCallComposer(e.target);D.save()}if(e.target.id==='call-name'){call().name=e.target.value;D.save()}});
document.addEventListener('keydown',e=>{if(e.target.id==='call-chat-input'&&e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();send()}if(D.state.screen==='call'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.target.closest('input,textarea,select,[contenteditable="true"]')&&!document.querySelector('.modal')){const key=e.key.toLowerCase();if(key==='m'||key==='v'||key==='c'){e.preventDefault();if(key==='m')D.handlers['call-mic']();if(key==='v')D.handlers['call-camera']();if(key==='c'){call().panel=call().panel==='chat'?null:'chat';update();}}}});
document.addEventListener('desk:render',()=>{if(D.state.screen==='call'){clearInterval(D.callTimer);D.callTimer=setInterval(()=>document.querySelectorAll('.call-clock').forEach(el=>el.textContent=elapsed()),1000);const list=$('#call-chat-messages');if(list)list.scrollTop=list.scrollHeight;$('.call-room')?.setAttribute('data-background',call().background)}else if(D.state.screen==='prejoin')$('.prejoin-preview')?.setAttribute('data-background',call().background)});
})();
