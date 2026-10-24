/* Local design prototype. No SSH transport, credential storage or server changes. */
(() => {
  'use strict';
  const D=window.Desk,S=D.state,E=D.esc,I=D.icon,$=selector=>document.querySelector(selector);
  const steps=['Сервер','Ключ сервера','Доступ SSH','План','Установка'];
  const phases=[
    ['Docker и Compose','Подготовка среды выполнения'],
    ['Проверка исходников','Выбор совместимой версии MeetSpace'],
    ['Сборка образов','Подготовка компонентов приложения'],
    ['Конфигурация сервисов','Настройка приложения и медиасервиса'],
    ['База, очередь и хранилище','Подготовка постоянных данных'],
    ['Резервная копия','Проверка каталога резервных копий'],
    ['Миграции базы данных','Подготовка структуры данных'],
    ['HTTPS и сертификат','Настройка защищённого адреса'],
    ['Запуск MeetSpace','Запуск сервисов пространства'],
    ['Проверка готовности','Проверка HTTPS, API и медиасервиса']
  ];
  const fingerprint='SHA256:K7s4bXoYZQ6nPf3wJLa81cMeVrT5Au09HdE2gTxyzAb';
  const fresh=()=>({step:'server',host:'203.0.113.10',port:'22',username:'deploy',domain:'meet.example.org',auth:'password',email:'admin@example.org',path:'/opt/meetspace',detailsValid:false,trusted:false,checked:false,consent:false,stage:0});
  let model=fresh(),origin='settings',pendingClose=false;
  const url=()=>`https://${model.domain}`;
  const errorMarkup='<p id="si-error" class="si-error" role="alert" hidden></p>';
  const note=(text,glyph='Info',extra='')=>`<div class="si-note ${extra}">${I(glyph)}<p>${text}</p></div>`;
  function field(label,name,value,attributes='',hint='') {
    return `<label class="si-field"><span>${label}</span><input name="${name}" data-si-field="${name}" value="${E(value)}" ${attributes}>${hint?`<small>${hint}</small>`:''}</label>`;
  }
  function heading(kicker,title,text) {return `<div class="si-heading"><span class="si-kicker">${kicker}</span><h1 tabindex="-1" id="si-title">${title}</h1><p>${text}</p></div>`;}
  function serverCard() {return `<div class="si-server-card">${I('Server')}<div><strong>${E(model.host)}</strong><small>${E(model.username)} · порт ${E(model.port)}</small></div><span class="badge">SSH</span></div>`;}
  function keyCard() {return `<div class="si-fingerprint"><span>ED25519 · ПРИМЕР ОТПЕЧАТКА</span><code>${fingerprint}</code></div>`;}
  function serverStep() {
    return `${heading('СОБСТВЕННАЯ ИНФРАСТРУКТУРА','Начнём с сервера.','Укажите отдельный Linux VPS, на котором будет работать MeetSpace.')}<form id="si-server-form" class="si-form" novalidate><div class="si-form-grid">${field('IP-адрес или хост','host',model.host,'required maxlength="253" autocomplete="off" spellcheck="false" placeholder="203.0.113.10"')}${field('Порт SSH','port',model.port,'required inputmode="numeric" maxlength="5" placeholder="22"')}</div>${field('Пользователь SSH','username',model.username,'required maxlength="32" autocomplete="off" spellcheck="false" placeholder="deploy"','Пользователь с правами root или sudo.')}${field('Домен MeetSpace','domain',model.domain,'required maxlength="253" autocomplete="off" spellcheck="false" placeholder="meet.example.org"','A-запись домена должна указывать на IP сервера.')}${note('Понадобятся доступ по SSH и отдельный сервер. Настройки приложения появятся на следующем этапе.','Server')}${errorMarkup}<div class="si-actions"><button class="btn btn-primary" type="submit">Продолжить ${I('ArrowRight')}</button></div></form>`;
  }
  function fingerprintStep() {
    return `${heading('ИДЕНТИЧНОСТЬ СЕРВЕРА','Проверим ключ сервера.','При первом подключении нужно убедиться, что это именно ваш сервер.')}${serverCard()}${keyCard()}${note('Сравните отпечаток с данными в панели провайдера VPS. Если он не совпадает, вернитесь к параметрам подключения.','ShieldCheck')}<form id="si-trust-form" class="si-form"><label class="si-check"><input type="checkbox" name="trust" ${model.trusted?'checked':''}><span>Я проверил отпечаток и доверяю этому серверу</span></label><p class="si-demo-tag">Отпечаток — пример для макета, он не получен от сервера.</p>${errorMarkup}<div class="si-actions"><button class="btn btn-primary" type="submit" ${model.trusted?'':'disabled'}>Подтвердить сервер ${I('ArrowRight')}</button></div></form>`;
  }
  function secretField(label,name,placeholder,required=false) {
    return `<div class="si-field"><span><label for="si-${name}">${label}</label></span><div class="si-secret-field"><input id="si-${name}" name="${name}" type="password" autocomplete="off" placeholder="${placeholder}" maxlength="512" ${required?'required':''}><button class="icon-btn" type="button" data-action="installer-secret" data-id="si-${name}" aria-label="Показать ${name==='password'?'пароль':'кодовую фразу'}" aria-pressed="false">${I('Eye')}</button></div></div>`;
  }
  function accessStep() {
    return `${heading('ДОСТУП ПО SSH','Доступ к серверу.','Подтвердите доступ для проверки сервера перед установкой.')}${serverCard()}${keyCard()}<div class="si-auth-tabs" role="group" aria-label="Способ входа по SSH">${[['password','LockKeyhole','Пароль SSH'],['key','KeyRound','Приватный ключ']].map(([id,glyph,label])=>`<button type="button" data-action="installer-auth" data-value="${id}" aria-pressed="${model.auth===id}">${I(glyph)}${label}</button>`).join('')}</div><form id="si-access-form" class="si-form" novalidate>${model.auth==='password'?secretField('Пароль SSH','password','Для макета: demo',true):`<label class="si-key-picker">${I('FileKey')}<span><strong id="si-key-name">Выбрать файл ключа</strong><small>Демонстрационный файл · содержимое не читается</small></span><input type="file" name="keyfile" aria-label="Выбрать файл SSH-ключа"></label>${secretField('Кодовая фраза · если есть','passphrase','Необязательно')}`}<p class="si-demo-tag">Используйте пароль demo или демонстрационный файл ключа.</p>${errorMarkup}<div class="si-actions"><button class="btn btn-primary" type="submit">Проверить сервер без изменений ${I('ArrowRight')}</button></div></form>`;
  }
  function planStep() {
    return `${heading('ПЕРЕД УСТАНОВКОЙ','Всё по плану.','Проверьте параметры пространства и план установки.')}<div class="si-checklist"><div class="si-step-caption"><strong>Проверка сервера</strong><span class="badge">Пример</span></div>${[
      ['Laptop','Система и ресурсы','Ubuntu 24.04 · 4 CPU · 8 ГБ RAM · диск 60 ГБ'],
      ['Link','Домен и сеть',`${model.domain} → ${model.host}`],
      ['Server','Среда выполнения','Docker и Compose · готовая среда']
    ].map(([glyph,title,detail])=>`<div class="si-check-row">${I(glyph)}<div><strong>${title}</strong><small>${E(detail)}</small></div><span class="badge green">${I('Check')}</span></div>`).join('')}</div><form id="si-plan-form" class="si-form" novalidate><div class="si-plan-grid">${field('Email администратора','email',model.email,'type="email" required maxlength="254" autocomplete="off"','Для уведомлений о сертификате.')}<label class="si-field"><span>Каталог установки</span><select name="path" data-si-field="path">${['/opt/meetspace','/srv/meetspace'].map(value=>`<option ${model.path===value?'selected':''}>${value}</option>`).join('')}</select></label></div><div class="si-plan-summary"><strong>Что появится на сервере</strong><p>MeetSpace, медиасервис, база данных и постоянное хранилище. Для домена будет настроен HTTPS.</p><div class="si-summary"><dl><div><dt>Адрес пространства</dt><dd>${E(url())}</dd></div><div><dt>Доступ к серверу</dt><dd>${E(model.username)}@${E(model.host)}:${E(model.port)}</dd></div><div><dt>HTTPS</dt><dd>Автоматический сертификат</dd></div></dl></div></div><details class="si-details"><summary>Требования и подробности ${I('ChevronDown')}</summary><p>Отдельный Linux VPS, root или sudo, домен с A-записью на адрес сервера. Рекомендуется 4 CPU, 8 ГБ памяти и диск 60 ГБ. Фактическая проверка ресурсов, DNS и портов в макете не выполняется.</p></details><label class="si-check"><input type="checkbox" name="consent" ${model.consent?'checked':''}><span>Разрешаю установку по показанному плану. В макете изменения демонстрационные.</span></label>${errorMarkup}<div class="si-actions"><button class="btn btn-primary" type="submit" ${model.consent?'':'disabled'}>Начать демо-установку ${I('ArrowRight')}</button></div></form>`;
  }
  function logText() {
    return ['MeetSpace · демонстрационный журнал',`Сервер: ${model.host}:${model.port}`,`Пользователь: ${model.username}`,`Пространство: ${url()}`,`Каталог: ${model.path}`,...phases.map(([label],index)=>`${index<model.stage?'✓':index===model.stage?'→':'·'} ${label}${index<model.stage?' — завершено':index===model.stage?' — текущий этап':''}`),'Реальные команды не выполнялись.'].join('\n');
  }
  function progressStep() {
    const percent=model.stage*10;
    return `${heading('СОЗДАЁМ ПРОСТРАНСТВО','Установка MeetSpace','Демонстрация установки на удалённый сервер.')}<div class="si-progress-heading">${I('Server')}<div><strong>${E(model.domain)}</strong><small>${E(model.username)}@${E(model.host)}:${E(model.port)}</small></div><strong>${percent}%</strong></div><div class="si-progress-track" role="progressbar" aria-label="Ход демо-установки" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><span style="width:${percent}%"></span></div><p class="si-demo-tag">Завершено ${model.stage} из ${phases.length} этапов · демонстрация</p><ol class="si-install-stages">${phases.map(([title,desc],index)=>`<li class="${index<model.stage?'complete':index===model.stage?'current':''}"><span class="si-stage-mark">${index<model.stage?I('Check'):String(index+1).padStart(2,'0')}</span><div><strong>${title}</strong><small>${index<model.stage?'Завершено · демо':index===model.stage?desc:'Ожидает очереди'}</small></div>${index===model.stage?'<span class="badge">Сейчас</span>':''}</li>`).join('')}</ol><details class="si-details"><summary>Подробный журнал ${I('ChevronDown')}</summary><pre class="si-log">${E(logText())}</pre><button type="button" class="btn btn-secondary btn-small" data-action="installer-copy-log">${I('Copy')}Копировать журнал</button></details><div class="si-actions"><button class="btn btn-primary" data-action="installer-next-stage">${model.stage===phases.length-1?'Показать результат':'Следующий этап'} ${I('ArrowRight')}</button><button class="btn btn-secondary" data-action="installer-fail">Показать сбой</button></div><p class="si-demo-tag">Этапы переключаются вручную. Сервер не изменяется.</p>`;
  }
  function errorStep() {
    return `<div class="si-state-icon warning">${I('Unplug')}</div>${heading('ВОССТАНОВЛЕНИЕ','Связь прервалась.','Соединение с сервером потеряно. Последний этап сохранён в этом окне.')}<div class="si-server-card">${I('History')}<div><strong>${E(phases[model.stage][0])}</strong><small>Завершено ${model.stage} из ${phases.length} этапов</small></div></div>${note('При восстановлении соединения приложение сначала уточняет состояние установки и продолжает с последнего подтверждённого этапа.','Info')}<div class="si-actions"><button class="btn btn-primary" data-action="installer-retry">${I('RotateCw')}Повторить подключение</button><button class="btn btn-secondary" data-action="installer-review">Вернуться к плану</button></div><details class="si-details"><summary>Журнал установки ${I('ChevronDown')}</summary><pre class="si-log">${E(logText())}\nДемо: соединение прервано.</pre></details><p class="si-demo-tag">Ошибка смоделирована. Повтор вернёт к сохранённому этапу.</p>`;
  }
  function completeStep() {
    return `<div class="si-state-icon success">${I('Check')}</div>${heading('ГОТОВО К ОБЩЕНИЮ','Ваше пространство готово.','Сценарий установки завершён. Добавьте аккаунт для подключения к пространству.')}<div class="si-result-address"><small>АДРЕС ВАШЕГО ПРОСТРАНСТВА</small><strong>${E(url())}</strong><span>${I('CircleCheck')}HTTPS · демонстрационный результат</span></div><div class="si-summary"><dl><div><dt>Сервер</dt><dd>${E(model.host)}</dd></div><div><dt>Этапы</dt><dd>${phases.length} из ${phases.length} · завершены</dd></div><div><dt>Каталог</dt><dd>${E(model.path)}</dd></div></dl></div><div class="si-actions"><button class="btn btn-primary" data-action="installer-add-account">${I('UserPlus')}Добавить аккаунт</button><button class="btn btn-secondary" data-action="installer-copy-address">${I('Copy')}Копировать адрес</button></div><button class="si-back" data-action="installer-close">Вернуться в приложение ${I('ArrowRight')}</button><p class="si-demo-tag">Сервер не развёрнут. Это итоговый экран локального макета.</p>`;
  }
  const index=()=>model.step==='server'?0:model.step==='fingerprint'?1:model.step==='access'?2:model.step==='plan'?3:4;
  function art() {
    return `<div class="si-art" aria-hidden="true"><div class="si-art-orbit"><div></div><div></div></div><div class="si-art-call"><span class="si-art-live"><i></i>Встреча команды</span><div class="si-art-people"><span>АК</span><span>МП</span></div><div class="si-art-controls"><span>${I('Video')}</span><span>${I('Mic')}</span><span>${I('Phone')}</span></div></div><div class="si-art-message">${I('MessageCircle')}<div>Хорошие идеи.<br><strong>Начинаются здесь.</strong></div></div></div>`;
  }
  function syncRoute() {const route=new URL(location.href);route.searchParams.set('setupStep',model.step);history.replaceState({},'',route.href);}
  D.screens.installer=()=>{
    syncRoute();const active=index();
    return `<section id="si-installer" class="si-shell"><aside class="si-side"><a class="si-brand" href="${E(D.localLink('onboarding',{theme:S.theme}))}" data-action="installer-close"><img src="assets/brand-mark.svg" alt=""><span>MeetSpace<span>.</span></span><small>ДЛЯ WINDOWS</small></a><div class="si-side-copy"><span class="si-kicker">ВАШ СЕРВЕР. ВАШИ ПРАВИЛА.</span><h2>Своё пространство.<br>Полный контроль.</h2><p>Подключите удалённый сервер,<br>а мы покажем каждый шаг настройки.</p></div>${art()}<footer class="si-side-footer">${I('ShieldCheck')}На вашей инфраструктуре</footer></aside><main class="si-main"><header class="si-topbar">${model.step==='complete'?'<span></span>':`<button class="si-back" data-action="installer-back">${I('ArrowLeft')}${['install','error'].includes(model.step)?'Закрыть мастер':'Назад'}</button>`}<span class="si-demo-tag">Демо-макет</span><button class="icon-btn" data-action="installer-close" aria-label="Закрыть мастер установки">${I('X')}</button></header><div class="si-content"><div class="si-step-caption"><span>Подключение сервера</span><strong>${String(active+1).padStart(2,'0')} / 05</strong></div><ol class="si-stepper" aria-label="Этапы настройки">${steps.map((label,n)=>`<li class="${n===active?'current':n<active||model.step==='complete'?'done':''}" ${n===active?'aria-current="step"':''}><b>${n<active||model.step==='complete'?I('Check'):n+1}</b><span>${label}</span></li>`).join('')}</ol>${({server:serverStep,fingerprint:fingerprintStep,access:accessStep,plan:planStep,install:progressStep,error:errorStep,complete:completeStep}[model.step]||serverStep)()}</div><footer class="si-session-note">${I('LockKeyhole')}Данные доступа не сохраняются. SSH-подключение в макете не выполняется.</footer></main></section>`;
  };
  function showStep(step,focus=true) {
    const allowed=step==='server'||step==='fingerprint'&&model.detailsValid||step==='access'&&model.trusted||step==='plan'&&model.checked||['install','error'].includes(step)&&model.consent||step==='complete'&&model.consent&&model.stage===phases.length;
    if(!allowed)return;
    model.step=step;D.render();$('.si-main')?.scrollTo?.({top:0});if(focus)$('#si-title')?.focus({preventScroll:true});
  }
  function exit() {pendingClose=false;model=fresh();const route=new URL(location.href);route.searchParams.delete('setupStep');history.replaceState({},'',route.href);D.closeModal();D.go(origin);}
  function close() {
    if(['install','error'].includes(model.step)){
      pendingClose=true;D.openModal('Закрыть мастер установки?',`<div data-si-close-confirm><p class="modal-note">Демонстрация остановится. Реальная установка не выполнялась, сервер не изменялся.</p><div class="modal-actions"><button class="btn btn-secondary" data-action="close-modal">Продолжить просмотр</button><button class="btn btn-primary" data-action="installer-confirm-close">Закрыть мастер</button></div></div>`);return;
    }
    exit();
  }
  function fail(form,name,message) {const node=form.querySelector('#si-error');if(node){node.textContent=message;node.hidden=false;}const input=form.elements.namedItem(name);input?.setAttribute?.('aria-invalid','true');input?.focus?.();}
  function validHost(value) {
    if(!value||value.length>253||/[\s/@?#\\]/.test(value))return false;
    if(value.includes(':')){try {return new URL(`http://[${value.replace(/^\[|\]$/g,'')}]/`).hostname.includes(':');}catch{return false;}}
    if(/^\d+(?:\.\d+){3}$/.test(value))return value.split('.').every(part=>/^\d{1,3}$/.test(part)&&Number(part)<=255);
    return value.includes('.')&&value.split('.').every(part=>/^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/i.test(part))&&!/^\d+(?:\.\d+)+$/.test(value);
  }
  function domain(value) {
    if(!value||value.length>253||/[\s/@:#?\\]/.test(value))return null;
    try {const name=new URL('https://'+value).hostname;if(name.includes('.')&&!/^\d+(?:\.\d+){3}$/.test(name)&&name.split('.').every(part=>/^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/i.test(part)))return name;}catch{}
    return null;
  }
  async function copy(text) {try {await navigator.clipboard.writeText(text);D.toast('Скопировано');}catch {D.openModal('Скопировать текст',`<label class="field">Выделите и скопируйте текст<textarea readonly rows="8">${E(text)}</textarea></label>`);$('.modal textarea')?.select();}}
  D.openInstaller=()=>{origin=S.screen==='onboarding'?'onboarding':'settings';model=fresh();pendingClose=false;D.go('installer');$('#si-title')?.focus();};
  Object.assign(D.handlers,{
    'installer-open':()=>D.openInstaller(),
    'installer-close':close,
    'installer-confirm-close':()=>{if(pendingClose&&$('[data-si-close-confirm]'))exit();},
    'installer-back':()=>{
      if(['server','install','error','complete'].includes(model.step)){close();return;}
      if(model.step==='fingerprint'){model.trusted=false;model.checked=false;model.consent=false;showStep('server');}
      else if(model.step==='access'){model.checked=false;model.consent=false;showStep('fingerprint');}
      else if(model.step==='plan'){model.checked=false;model.consent=false;showStep('access');}
    },
    'installer-auth':button=>{if(model.step!=='access'||!model.trusted||!['password','key'].includes(button.dataset.value))return;model.auth=button.dataset.value;showStep('access',false);},
    'installer-secret':button=>{const input=document.getElementById(button.dataset.id);if(!input||!['si-password','si-passphrase'].includes(input.id))return;const show=input.type==='password';input.type=show?'text':'password';button.innerHTML=I(show?'EyeOff':'Eye');button.setAttribute('aria-pressed',String(show));button.setAttribute('aria-label',`${show?'Скрыть':'Показать'} ${input.id==='si-password'?'пароль':'кодовую фразу'}`);},
    'installer-next-stage':()=>{if(model.step!=='install'||!model.consent)return;model.stage=Math.min(phases.length,model.stage+1);showStep(model.stage===phases.length?'complete':'install',false);},
    'installer-fail':()=>{if(model.step==='install')showStep('error');},
    'installer-retry':()=>{if(model.step==='error'){showStep('install');D.toast('Демо: соединение восстановлено');}},
    'installer-review':()=>{if(model.step!=='error')return;model.consent=false;showStep('plan');},
    'installer-copy-log':()=>copy(logText()),
    'installer-copy-address':()=>{if(model.step==='complete')return copy(url());},
    'installer-add-account':()=>{if(model.step==='complete'&&model.stage===phases.length)D.openAccountAdd?.(url());}
  });
  document.addEventListener('input',event=>{
    const input=event.target;if(!input.closest?.('#si-installer'))return;
    input.removeAttribute?.('aria-invalid');const error=$('#si-error');if(error)error.hidden=true;
    const key=input.dataset.siField;if(!['host','port','username','domain','email','path'].includes(key))return;
    model[key]=input.value;
    if(['host','port','username','domain'].includes(key)){model.detailsValid=false;model.trusted=false;model.checked=false;model.consent=false;}
  });
  document.addEventListener('change',event=>{
    const input=event.target;if(!input.closest?.('#si-installer'))return;
    if(input.name==='trust'){$('#si-trust-form button[type=submit]').disabled=!input.checked;}
    if(input.name==='consent'){$('#si-plan-form button[type=submit]').disabled=!input.checked;}
    if(input.name==='keyfile'){$('#si-key-name').textContent=input.files?.[0]?.name||'Выбрать файл ключа';}
    if(input.name==='path'&&['/opt/meetspace','/srv/meetspace'].includes(input.value))model.path=input.value;
  });
  document.addEventListener('submit',event=>{
    const form=event.target;if(!['si-server-form','si-trust-form','si-access-form','si-plan-form'].includes(form.id))return;event.preventDefault();
    if(S.screen!=='installer')return;const data=new FormData(form);
    if(form.id==='si-server-form'&&model.step==='server'){
      const host=String(data.get('host')||'').trim(),port=String(data.get('port')||'').trim(),username=String(data.get('username')||'').trim(),name=domain(String(data.get('domain')||'').trim());
      if(!validHost(host))return fail(form,'host','Укажите корректный IP-адрес или полное имя сервера.');
      if(!/^\d{1,5}$/.test(port)||Number(port)<1||Number(port)>65535)return fail(form,'port','Порт SSH должен быть целым числом от 1 до 65535.');
      if(!/^[a-z_][a-z\d_-]{0,31}$/i.test(username))return fail(form,'username','Введите имя пользователя SSH, например deploy или root.');
      if(!name)return fail(form,'domain','Укажите доменное имя без протокола, порта и пути, например meet.example.org.');
      Object.assign(model,{host,port:String(Number(port)),username,domain:name,detailsValid:true,trusted:false,checked:false,consent:false,stage:0});showStep('fingerprint');
    }
    if(form.id==='si-trust-form'&&model.step==='fingerprint'&&model.detailsValid){
      if(!data.has('trust'))return fail(form,'trust','Подтвердите проверку отпечатка сервера.');
      model.trusted=true;showStep('access');
    }
    if(form.id==='si-access-form'&&model.step==='access'&&model.trusted){
      if(model.auth==='password'&&!String(data.get('password')||''))return fail(form,'password','Для макета введите пароль demo.');
      const file=form.elements.namedItem('keyfile')?.files?.[0];
      if(model.auth==='key'&&!file)return fail(form,'keyfile','Выберите демонстрационный файл SSH-ключа.');
      if(model.auth==='key'&&file.size>1024*1024)return fail(form,'keyfile','Выберите демонстрационный файл размером до 1 МБ.');
      form.reset();model.checked=true;model.consent=false;showStep('plan');
    }
    if(form.id==='si-plan-form'&&model.step==='plan'&&model.checked){
      const email=String(data.get('email')||'').trim(),path=String(data.get('path')||'');
      const emailField=form.elements.namedItem('email');
      if(!email||email.length>254||!emailField.validity.valid)return fail(form,'email','Укажите корректную почту администратора.');
      if(!['/opt/meetspace','/srv/meetspace'].includes(path))return fail(form,'path','Выберите каталог установки.');
      if(!data.has('consent'))return fail(form,'consent','Подтвердите показанный план установки.');
      Object.assign(model,{email,path,consent:true,stage:0});showStep('install');
    }
  });
})();
