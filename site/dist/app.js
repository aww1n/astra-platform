const selections = new Map();
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const slip = $("#betslip");
const empty = $("#slipEmpty");
const summary = $("#slipSummary");
const items = $("#slipItems");
const toast = $("#toast");
let toastTimer;
const modalBackdrop = $("#modalBackdrop");
const modalContent = $("#modalContent");

function notify(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function openModal(html) {
  modalContent.innerHTML = html;
  modalBackdrop.hidden = false;
  document.body.style.overflow = 'hidden';
  $('.modal input, .modal button:not(.modal-close)')?.focus();
}

function closeModal() {
  modalBackdrop.hidden = true;
  document.body.style.overflow = '';
}

$('#modalClose').addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', event => { if (event.target === modalBackdrop) closeModal(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeModal(); });

function selectionKey(button) { return `${button.dataset.event}|${button.dataset.pick}`; }

function renderSlip() {
  const values = [...selections.values()];
  $("#slipCount").textContent = values.length;
  $("#mobileCount").textContent = values.length;
  empty.hidden = values.length > 0;
  summary.hidden = values.length === 0;
  items.innerHTML = values.map(item => `<article class="slip-item" data-key="${item.key}"><button aria-label="Удалить выбор">×</button><small>${item.event}</small><b>${item.pick}</b><strong>${item.odd.toFixed(2)}</strong></article>`).join("");
  items.querySelectorAll("button").forEach(button => button.addEventListener("click", () => {
    const card = button.closest(".slip-item");
    selections.delete(card.dataset.key);
    const oddButton = $$(".odd").find(odd => selectionKey(odd) === card.dataset.key);
    oddButton?.classList.remove("selected");
    renderSlip();
  }));
  updatePayout();
}

function updatePayout() {
  const total = [...selections.values()].reduce((value, item) => value * item.odd, 1);
  const stake = Math.max(0, Number($("#stakeInput").value) || 0);
  $("#totalOdds").textContent = total.toFixed(2);
  $("#payout").textContent = `${(stake * total).toFixed(2)} USDT`;
}

function bindOdds() {
  $$('.odd').forEach(button => {
    if (button.dataset.bound) return;
    button.dataset.bound = '1';
    button.addEventListener('click', () => {
      const key = selectionKey(button);
      if (selections.has(key)) {
        selections.delete(key);
        button.classList.remove('selected');
        notify('Выбор удалён из купона');
      } else {
        selections.set(key, { key, event: button.dataset.event, pick: button.dataset.pick, odd: Number(button.dataset.odd) });
        button.classList.add('selected');
        notify('✓ Добавлено в купон');
      }
      renderSlip();
      if (button.closest('.modal')) closeModal();
      if (window.innerWidth <= 740) slip.classList.add('open');
    });
  });
}
bindOdds();

$("#stakeInput").addEventListener("input", updatePayout);
$("#mobileSlip").addEventListener("click", () => slip.classList.add("open"));
$("#closeSlip").addEventListener("click", () => slip.classList.remove("open"));
$("#placeBet").addEventListener("click", () => {
  if (!selections.size) return;
  const chosen = [...selections.values()];
  const stake = Math.max(1, Number($('#stakeInput').value) || 0);
  const total = chosen.reduce((value, item) => value * item.odd, 1);
  const betCard = `<article class="bet-card"><header><b>${chosen.length > 1 ? `ЭКСПРЕСС · ${chosen.length} СОБЫТИЯ` : 'ОДИНОЧНАЯ'}</b><span class="status active-status">Активна</span></header>${chosen.map(item => `<div class="bet-leg"><small>${item.event}</small><strong>${item.pick} <em>@ ${item.odd.toFixed(2)}</em></strong></div>`).join('')}<footer><div><small>Ставка</small><b>${stake.toFixed(2)} USDT</b></div><div><small>Коэффициент</small><b>${total.toFixed(2)}</b></div><div><small>Возможный выигрыш</small><b class="accent">${(stake * total).toFixed(2)} USDT</b></div></footer></article>`;
  $('.my-bets').insertAdjacentHTML('afterbegin', betCard);
  openModal(`<div class="success-state"><div class="success-icon">✓</div><h2 id="modalTitle">Ставка принята</h2><p class="modal-lead">DEMO-ставка добавлена в раздел «Мои ставки».</p><strong>${(stake * total).toFixed(2)} USDT</strong><button class="modal-submit" id="viewBetBtn">Посмотреть ставку</button></div>`);
  $('#viewBetBtn').addEventListener('click', () => { closeModal(); openPage('bets'); });
  selections.clear();
  $$(".odd.selected").forEach(button => button.classList.remove("selected"));
  renderSlip();
  slip.classList.remove("open");
});

$$('.sport-pill').forEach(button => button.addEventListener('click', () => {
  $$('.sport-pill').forEach(item => item.classList.remove('active'));
  button.classList.add('active');
  const sport = button.dataset.sport;
  $$('[data-sport-card]').forEach(card => card.classList.toggle('hidden-card', sport !== 'all' && card.dataset.sportCard !== sport));
}));

$$('.mode-tab').forEach(button => button.addEventListener('click', () => {
  $$('.mode-tab').forEach(item => item.classList.remove('active'));
  button.classList.add('active');
  notify(button.dataset.mode === 'live' ? 'Показаны LIVE-события' : 'Режим переключён');
}));

function openPage(page) {
  ['home','sports','bets','profile'].forEach(name => {
    const section = $(`#${name}Page`);
    if (section) section.hidden = name !== page;
  });
  $$('[data-page]').forEach(item => item.classList.toggle('active', item.dataset.page === page));
  window.scrollTo({top: 0, behavior: 'smooth'});
}
$$('[data-page]').forEach(button => button.addEventListener('click', () => openPage(button.dataset.page)));
$('#walletBtn').addEventListener('click', () => openPage('profile'));
$('#searchBtn').addEventListener('click', () => {
  openModal(`<h2 id="modalTitle">Поиск</h2><p class="modal-lead">Команды, турниры и события</p><input class="form-control" id="searchInput" placeholder="Например, Real Madrid"><div class="search-results" id="searchResults"><button class="search-result"><small>LIVE · Ла Лига</small><b>Real Madrid — Barcelona</b></button><button class="search-result"><small>Сегодня · Premier League</small><b>Manchester City — Chelsea</b></button><button class="search-result"><small>LIVE · ATP 500</small><b>Sinner — Alcaraz</b></button></div>`);
  $('#searchInput').addEventListener('input', event => { const query = event.target.value.toLowerCase(); $$('.search-result').forEach(item => item.hidden = !item.textContent.toLowerCase().includes(query)); });
  $$('.search-result').forEach(button => button.addEventListener('click', () => { closeModal(); openEvent(button.querySelector('b').textContent); }));
});

function openEvent(name) {
  openModal(`<h2 id="modalTitle">${name}</h2><p class="modal-lead"><span class="live-dot"></span> LIVE · официальные DEMO-данные</p><div class="event-detail-score"><strong>${name.split(' — ')[0]}</strong><b>2 : 1</b><strong>${name.split(' — ')[1]}</strong></div><div class="market-group"><h3>Победитель</h3><div class="odds-row"><button class="odd" data-event="${name}" data-pick="П1" data-odd="1.65"><span>П1</span><b>1.65</b></button><button class="odd" data-event="${name}" data-pick="X" data-odd="4.20"><span>X</span><b>4.20</b></button><button class="odd" data-event="${name}" data-pick="П2" data-odd="5.10"><span>П2</span><b>5.10</b></button></div></div><div class="market-group"><h3>Тотал</h3><div class="odds-row two"><button class="odd" data-event="${name}" data-pick="ТБ 2.5" data-odd="1.55"><span>Б 2.5</span><b>1.55</b></button><button class="odd" data-event="${name}" data-pick="ТМ 2.5" data-odd="2.40"><span>М 2.5</span><b>2.40</b></button></div></div>`);
  bindOdds();
}

function openDeposit() {
  openModal(`<h2 id="modalTitle">Пополнить</h2><p class="modal-lead">DEMO-пополнение без реальной транзакции</p><label class="form-label">Актив</label><div class="choice-grid"><button class="choice active">USDT</button><button class="choice">USDC</button><button class="choice">BTC</button></div><label class="form-label">Сеть</label><div class="choice-grid"><button class="choice active">TRON</button><button class="choice">TON</button><button class="choice">Ethereum</button></div><label class="form-label">DEMO-адрес</label><div class="address-box">TDEMO8asTRA29Xn5qL4vN1demo</div><div class="modal-warning">Отправка реальных средств отключена. Этот адрес существует только для демонстрации интерфейса.</div><button class="modal-submit" id="demoCreditBtn">Зачислить 500 DEMO USDT</button>`);
  $('#demoCreditBtn').addEventListener('click', () => { openModal(`<div class="success-state"><div class="success-icon">✓</div><h2 id="modalTitle">Пополнение зачислено</h2><p class="modal-lead">500 DEMO USDT добавлены в демонстрационный кошелёк.</p><button class="modal-submit" id="doneBtn">Готово</button></div>`); $('#doneBtn').addEventListener('click', closeModal); });
}

function openWithdrawal() {
  openModal(`<h2 id="modalTitle">Вывести</h2><p class="modal-lead">Создание демонстрационной заявки</p><label class="form-label">Адрес TRON</label><input class="form-control" id="withdrawAddress" placeholder="T..."><label class="form-label">Сумма USDT</label><input class="form-control" id="withdrawAmount" type="number" min="10" value="100"><div class="modal-warning">Production-вывод отключён до прохождения KYC/AML и launch gate.</div><button class="modal-submit" id="withdrawSubmit">Создать DEMO-заявку</button>`);
  $('#withdrawSubmit').addEventListener('click', () => { if (!$('#withdrawAddress').value.trim()) { notify('Укажите DEMO-адрес'); return; } openModal(`<div class="success-state"><div class="success-icon">✓</div><h2 id="modalTitle">Заявка создана</h2><p class="modal-lead">DEMO-вывод отправлен на проверку.</p><button class="modal-submit" id="doneBtn">Готово</button></div>`); $('#doneBtn').addEventListener('click', closeModal); });
}

$('#depositBtn').addEventListener('click', openDeposit);
$('#withdrawBtn').addEventListener('click', openWithdrawal);
$$('.event-card .teams').forEach(team => { team.style.cursor = 'pointer'; team.addEventListener('click', () => openEvent(team.querySelectorAll('b')[0].textContent + ' — ' + team.querySelectorAll('b')[1].textContent)); });
$$('.profile-grid button').forEach((button, index) => button.addEventListener('click', () => {
  const titles = ['Транзакции','Верификация','Ответственная игра','Поддержка'];
  const bodies = ['DEMO-пополнение +500 USDT<br>Ставка −100 USDT<br>Выигрыш +318 USDT','Статус KYC: VERIFIED<br>Возраст и личность подтверждены в DEMO-режиме.','Лимит депозита: 1 000 USDT/день<br>Лимит ставки: 500 USDT<br>Самоисключение: выключено','Тикет #ASTRA-1042<br>Категория: Технический вопрос<br>Статус: OPEN'];
  openModal(`<h2 id="modalTitle">${titles[index]}</h2><p class="modal-lead">${bodies[index]}</p><button class="modal-submit" id="doneBtn">Закрыть</button>`); $('#doneBtn').addEventListener('click', closeModal);
}));

if (document.modelContext?.registerTool) {
  const register = (tool) => Promise.resolve(document.modelContext.registerTool(tool)).catch(() => {});
  register({name:'read_betslip',title:'Прочитать купон',description:'Возвращает текущие выборы, общий коэффициент и сумму.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:()=>({selections:[...selections.values()],stake:Number($('#stakeInput').value)||0,totalOdds:Number($('#totalOdds').textContent)})});
  register({name:'add_bet_selection',title:'Добавить выбор',description:'Добавляет доступный исход в видимый купон.',inputSchema:{type:'object',properties:{event:{type:'string'},pick:{type:'string'}},required:['event','pick'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:({event,pick})=>{const button=$$('.odd').find(item=>item.dataset.event===event&&item.dataset.pick===pick);if(!button)throw new Error('Selection not found');if(!selections.has(selectionKey(button)))button.click();return {added:true,count:selections.size};}});
}

renderSlip();
