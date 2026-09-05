const Restaurant = {
  timer: null,
  state: null,
  storageKey: 'tsumori_restaurant_progress_v2',

  content: {
    levels: [
      { day: 1, title: '开店第一天', target: 5, time: 95, maxMistakes: 3, reward: 45, spawnEvery: 11, grammar: '点单: 〜をください / 〜をお願いします', events: ['order', 'checkout'], customers: ['sato', 'mika'] },
      { day: 2, title: '茶水与结账', target: 6, time: 105, maxMistakes: 3, reward: 58, spawnEvery: 10, grammar: '服务: お水 / お茶 / お会計', events: ['order', 'service', 'checkout'], customers: ['sato', 'mika', 'yamada'] },
      { day: 3, title: '追加订单', target: 7, time: 112, maxMistakes: 3, reward: 72, spawnEvery: 9, grammar: '追加: 〜もください / 〜ありますか', events: ['order', 'service', 'question', 'checkout'], customers: ['sato', 'mika', 'yamada', 'ken'] },
      { day: 4, title: '推荐菜单', target: 8, time: 120, maxMistakes: 4, reward: 90, spawnEvery: 8, grammar: '推荐: おすすめは何ですか', events: ['order', 'service', 'question', 'checkout'], customers: ['sato', 'mika', 'yamada', 'ken', 'emily'] },
      { day: 5, title: '忙碌午餐', target: 9, time: 128, maxMistakes: 4, reward: 108, spawnEvery: 8, grammar: '组合订单与快速回应', events: ['order', 'service', 'question', 'checkout', 'complaint'], customers: ['sato', 'mika', 'yamada', 'ken', 'emily'] },
      { day: 6, title: '新人带班', target: 10, time: 135, maxMistakes: 4, reward: 132, spawnEvery: 7, grammar: '员工协作与补救表达', events: ['order', 'service', 'question', 'checkout', 'complaint'], customers: ['sato', 'mika', 'yamada', 'ken', 'emily'] },
      { day: 7, title: '评论家挑战', target: 11, time: 145, maxMistakes: 5, reward: 160, spawnEvery: 7, grammar: '复杂服务: もう一杯 / 辛いですか / すみません', events: ['order', 'service', 'question', 'checkout', 'complaint'], customers: ['sato', 'mika', 'yamada', 'ken', 'emily', 'kuroda'] }
    ],
    eventTypes: {
      order: { label: '点单', icon: 'utensils', station: 'counter', color: 'red' },
      service: { label: '服务', icon: 'glass-water', station: 'service', color: 'green' },
      question: { label: '问答', icon: 'message-circle-question', station: 'counter', color: 'blue' },
      checkout: { label: '结账', icon: 'receipt', station: 'cashier', color: 'gold' },
      complaint: { label: '投诉', icon: 'triangle-alert', station: 'counter', color: 'dark' }
    },
    stations: [
      { id: 'counter', label: '接待', icon: 'messages-square' },
      { id: 'kitchen', label: '厨房', icon: 'chef-hat' },
      { id: 'service', label: '服务台', icon: 'hand-platter' },
      { id: 'cashier', label: '收银', icon: 'receipt' }
    ],
    staff: [
      { id: 'nana', name: 'ナナ', title: '新人アルバイト', cost: 95, skill: 'order', station: 'counter', speed: 16, success: 0.72, description: '能自动处理简单点单。' },
      { id: 'taro', name: '太郎', title: '厨房帮手', cost: 130, skill: 'service', station: 'service', speed: 14, success: 0.78, description: '擅长送水、茶和餐具。' },
      { id: 'rei', name: 'レイ', title: '收银熟手', cost: 160, skill: 'checkout', station: 'cashier', speed: 13, success: 0.84, description: '能快速处理结账。' },
      { id: 'aoi', name: '葵', title: '接客上手', cost: 230, skill: 'question', station: 'counter', speed: 12, success: 0.8, description: '可以帮忙回答推荐类问题。' }
    ],
    customers: [
      { id: 'sato', name: '佐藤さん', role: '上班族常客', avatar: '佐', tone: 'polite' },
      { id: 'mika', name: 'ミカ', role: '高中生', avatar: 'ミ', tone: 'casual' },
      { id: 'yamada', name: '山田おばあさん', role: '温柔老奶奶', avatar: '山', tone: 'gentle' },
      { id: 'ken', name: 'ケン', role: '运动社团学生', avatar: '健', tone: 'bright' },
      { id: 'emily', name: 'エミリー', role: '旅行者', avatar: 'E', tone: 'curious' },
      { id: 'kuroda', name: '黒田さん', role: '美食评论家', avatar: '黒', tone: 'strict' }
    ],
    eventPool: {
      order: [
        { text: 'ラーメンをお願いします。', zh: '请给我拉面。', answer: 'ラーメンです。', choices: ['ラーメンです。', 'お会計ですね。', 'トイレはあちらです。'], value: 16 },
        { text: 'カレーください。', zh: '请给我咖喱。', answer: 'カレーですね。', choices: ['カレーですね。', 'お水ですね。', '少々お待ちください。'], value: 15 },
        { text: 'うどんをください。', zh: '请给我乌冬。', answer: 'うどんです。', choices: ['うどんです。', 'コーヒーです。', 'ありません。'], value: 16 },
        { text: 'ラーメンと餃子をください。', zh: '请给我拉面和饺子。', answer: 'ラーメンと餃子ですね。', choices: ['ラーメンと餃子ですね。', 'お茶をどうぞ。', 'お会計ですね。'], value: 22 }
      ],
      service: [
        { text: 'お水をください。', zh: '请给我水。', answer: 'お水です。', choices: ['お水です。', 'カレーです。', 'お会計ですね。'], value: 11 },
        { text: 'お茶をいただけますか。', zh: '可以给我茶吗？', answer: 'お茶をどうぞ。', choices: ['お茶をどうぞ。', '辛いです。', 'ラーメンです。'], value: 13 },
        { text: 'メニューをお願いします。', zh: '请给我菜单。', answer: 'メニューです。', choices: ['メニューです。', 'お水です。', 'おすすめです。'], value: 12 }
      ],
      question: [
        { text: 'おすすめは何ですか。', zh: '推荐是什么？', answer: 'ラーメンがおすすめです。', choices: ['ラーメンがおすすめです。', 'お会計をお願いします。', '水はありません。'], value: 20 },
        { text: 'これは辛いですか。', zh: '这个辣吗？', answer: 'はい、少し辛いです。', choices: ['はい、少し辛いです。', 'トイレはあちらです。', 'お茶です。'], value: 19 },
        { text: 'コーヒーはありますか。', zh: '有咖啡吗？', answer: 'はい、あります。', choices: ['はい、あります。', 'いいえ、ラーメンです。', 'お会計ですね。'], value: 18 }
      ],
      checkout: [
        { text: 'お会計をお願いします。', zh: '请结账。', answer: 'お会計ですね。', choices: ['お会計ですね。', 'ラーメンですね。', 'お水です。'], value: 14 },
        { text: 'カードで払えますか。', zh: '可以刷卡吗？', answer: 'はい、カードで大丈夫です。', choices: ['はい、カードで大丈夫です。', '辛いです。', 'おすすめです。'], value: 18 }
      ],
      complaint: [
        { text: 'すみません、注文と違います。', zh: '不好意思，和点的不一样。', answer: '申し訳ありません。すぐ直します。', choices: ['申し訳ありません。すぐ直します。', 'おすすめはラーメンです。', 'お会計ですね。'], value: 24 },
        { text: 'まだですか。', zh: '还没好吗？', answer: '少々お待ちください。', choices: ['少々お待ちください。', 'コーヒーです。', 'カードで大丈夫です。'], value: 20 }
      ]
    }
  },

  async init() {
    this.stopTimer();
    this.newDay();
  },

  destroy() {
    this.stopTimer();
  },

  defaultProgress() {
    return { day: 1, bank: 0, bestScore: 0, completedDays: [], hired: [], staffStations: {} };
  },

  loadProgress() {
    try {
      return { ...this.defaultProgress(), ...JSON.parse(localStorage.getItem(this.storageKey) || '{}') };
    } catch (error) {
      return this.defaultProgress();
    }
  },

  saveProgress(progress) {
    localStorage.setItem(this.storageKey, JSON.stringify(progress));
  },

  newDay(day) {
    const progress = this.loadProgress();
    if (day && day <= progress.day) progress.day = day;
    const level = this.content.levels.find(item => item.day === progress.day) || this.content.levels[0];
    this.state = {
      status: 'ready',
      progress,
      level,
      timeLeft: level.time,
      coins: 0,
      served: 0,
      mistakes: 0,
      spawned: 0,
      activeId: null,
      events: [],
      log: [`Day ${level.day}: ${level.grammar}`],
      mastered: {},
      result: null
    };
    this.render();
  },

  startGame() {
    if (!this.state || this.state.status === 'playing') return;
    this.state.status = 'playing';
    this.spawnEvent();
    this.spawnEvent();
    this.tick();
    this.timer = setInterval(() => this.tick(), 1000);
    this.render();
  },

  tick() {
    const state = this.state;
    if (!state || state.status !== 'playing') return;
    let needsRender = false;
    state.timeLeft -= 1;
    state.events.forEach(event => {
      event.patience = Math.max(0, event.patience - 1);
      if (event.staffId) event.staffWork -= 1;
    });
    needsRender = this.resolveStaffWork() || needsRender;
    const expired = state.events.filter(event => event.patience === 0);
    expired.forEach(event => this.failEvent(event.id, `${event.customer.name}: まだですか。`));
    needsRender = expired.length > 0 || needsRender;
    if (state.spawned < state.level.target && state.timeLeft % state.level.spawnEvery === 0) {
      this.spawnEvent();
      needsRender = true;
    }
    if (state.timeLeft <= 0 || (state.served >= state.level.target && !state.events.length)) this.finishDay();
    else if (needsRender) this.render();
    else this.updateLiveState();
  },

  spawnEvent() {
    const state = this.state;
    if (state.events.length >= 5 || state.spawned >= state.level.target) return;
    const type = this.pick(state.level.events);
    const customer = this.pick(this.content.customers.filter(item => state.level.customers.includes(item.id)));
    const scenario = this.pick(this.content.eventPool[type]);
    const eventType = this.content.eventTypes[type];
    const id = `${type}-${Date.now()}-${state.spawned}`;
    state.events.push({
      id,
      type,
      station: eventType.station,
      customer,
      scenario,
      patience: customer.id === 'kuroda' ? 82 : type === 'complaint' ? 72 : 100,
      staffId: null,
      staffWork: 0,
      feedback: ''
    });
    state.activeId = state.activeId || id;
    state.spawned += 1;
    this.assignAvailableStaff();
  },

  assignAvailableStaff() {
    const state = this.state;
    const hired = this.hiredStaff();
    state.events.forEach(event => {
      if (event.staffId) return;
      const staff = hired.find(person => this.canStaffHandle(person, event) && !state.events.some(item => item.staffId === person.id));
      if (!staff) return;
      event.staffId = staff.id;
      event.staffWork = staff.speed;
      event.feedback = `${staff.name} 正在处理`;
    });
  },

  resolveStaffWork() {
    const state = this.state;
    let changed = false;
    state.events.filter(event => event.staffId && event.staffWork <= 0).forEach(event => {
      const staff = this.content.staff.find(person => person.id === event.staffId);
      if (!staff) return;
      if (Math.random() <= staff.success) {
        this.completeEvent(event, true);
        changed = true;
      } else {
        event.staffId = null;
        event.feedback = `${staff.name} 需要你确认`;
        state.activeId = event.id;
        changed = true;
      }
    });
    this.assignAvailableStaff();
    return changed;
  },

  canStaffHandle(staff, event) {
    if (staff.skill !== event.type) return false;
    const assigned = this.state.progress.staffStations[staff.id] || staff.station;
    return assigned === event.station;
  },

  chooseEvent(id) {
    if (!this.state || this.state.status !== 'playing') return;
    this.state.activeId = id;
    this.render();
  },

  answer(choice) {
    const state = this.state;
    if (!state || state.status !== 'playing') return;
    const event = state.events.find(item => item.id === state.activeId);
    if (!event) return;
    if (choice === event.scenario.answer) {
      this.completeEvent(event, false);
      this.render();
      return;
    }
    event.feedback = 'もう一度考えてください。';
    event.patience = Math.max(0, event.patience - 16);
    state.mistakes += 1;
    state.log.unshift(`回答错误: ${event.scenario.text}`);
    this.render();
  },

  completeEvent(event, byStaff) {
    const state = this.state;
    const index = state.events.findIndex(item => item.id === event.id);
    if (index < 0) return;
    const staffBonus = byStaff ? 0.75 : 1;
    const earned = Math.round(event.scenario.value * staffBonus);
    state.coins += earned;
    state.served += 1;
    state.mastered[event.scenario.answer] = (state.mastered[event.scenario.answer] || 0) + 1;
    state.log.unshift(`${byStaff ? this.staffName(event.staffId) : 'あなた'}: ${event.scenario.answer}`);
    state.events.splice(index, 1);
    state.activeId = state.events[0]?.id || null;
    this.spawnEvent();
  },

  failEvent(id, message) {
    const state = this.state;
    const index = state.events.findIndex(item => item.id === id);
    if (index < 0) return;
    state.events.splice(index, 1);
    state.mistakes += 1;
    state.log.unshift(message);
    if (state.activeId === id) state.activeId = state.events[0]?.id || null;
    this.spawnEvent();
  },

  finishDay() {
    const state = this.state;
    if (state.status === 'finished') return;
    state.status = 'finished';
    this.stopTimer();
    const score = state.coins + state.served * 12 - state.mistakes * 5 + state.timeLeft;
    const passed = state.served >= state.level.target && state.mistakes <= state.level.maxMistakes;
    const reward = passed ? state.level.reward : Math.floor(state.level.reward * 0.25);
    const progress = state.progress;
    progress.bank += state.coins + reward;
    progress.bestScore = Math.max(progress.bestScore || 0, score);
    if (passed && !progress.completedDays.includes(state.level.day)) progress.completedDays.push(state.level.day);
    if (passed && progress.day === state.level.day) progress.day = Math.min(this.content.levels.length, progress.day + 1);
    this.saveProgress(progress);
    state.progress = progress;
    state.result = { passed, reward, score };
    this.render();
  },

  hireStaff(id) {
    const state = this.state;
    if (!state || state.status === 'playing') return;
    const staff = this.content.staff.find(item => item.id === id);
    if (!staff || state.progress.hired.includes(id) || state.progress.bank < staff.cost) return;
    state.progress.bank -= staff.cost;
    state.progress.hired.push(id);
    state.progress.staffStations[id] = staff.station;
    this.saveProgress(state.progress);
    this.newDay(state.progress.day);
  },

  assignStaff(id, station) {
    const state = this.state;
    if (!state || state.status === 'playing' || !state.progress.hired.includes(id)) return;
    state.progress.staffStations[id] = station;
    this.saveProgress(state.progress);
    this.render();
  },

  selectDay(day) {
    const progress = this.loadProgress();
    if (day > progress.day) return;
    progress.day = day;
    this.saveProgress(progress);
    this.newDay(day);
  },

  resetProgress() {
    if (!confirm('重置食堂进度、员工和资金？')) return;
    localStorage.removeItem(this.storageKey);
    this.newDay(1);
  },

  render() {
    const main = document.getElementById('main-content');
    const state = this.state;
    main.innerHTML = `
      <section class="restaurant-shell">
        <header class="restaurant-header restaurant-header-scene">
          <div>
            <p class="restaurant-kicker">SCENE MANAGEMENT</p>
            <h1>ひだまり食堂</h1>
            <p>Day ${state.level.day}: ${this.escapeHtml(state.level.title)}。${this.escapeHtml(state.level.grammar)}</p>
          </div>
          <div class="restaurant-header-actions">
            <button class="btn btn-secondary" id="restaurant-reset-day"><i data-lucide="rotate-ccw"></i>重开本关</button>
            <button class="btn btn-primary" id="restaurant-start" ${state.status === 'playing' ? 'disabled' : ''}><i data-lucide="utensils"></i>${state.status === 'finished' ? '再挑战' : '开店'}</button>
          </div>
        </header>

        <div class="restaurant-level-strip">${this.content.levels.map(level => this.renderLevelButton(level)).join('')}</div>
        <div class="restaurant-scorebar">
          ${this.metric('timer', '时间', `${state.timeLeft}s`)}
          ${this.metric('coins', '本关金币', state.coins)}
          ${this.metric('wallet', '店铺资金', state.progress.bank)}
          ${this.metric('smile', '完成事件', `${state.served}/${state.level.target}`)}
          ${this.metric('alert-circle', '失误', `${state.mistakes}/${state.level.maxMistakes}`)}
          ${this.metric('users', '员工', state.progress.hired.length)}
        </div>

        <div class="restaurant-scene-layout">
          <section class="restaurant-scene">
            <div class="scene-back-wall">
              <div class="scene-noren">ひだまり食堂</div>
              <div class="scene-menu-board">ラーメン　カレー　うどん</div>
            </div>
            ${this.renderStation('counter', '接待区')}
            ${this.renderStation('kitchen', '厨房')}
            ${this.renderStation('service', '服务台')}
            ${this.renderStation('cashier', '收银台')}
            <div class="scene-tables">${this.renderEvents()}</div>
          </section>

          <aside class="restaurant-dialogue">
            ${this.renderActiveEvent()}
          </aside>
        </div>

        <section class="restaurant-management">
          <div class="restaurant-staff-panel">
            <div class="restaurant-upgrade-head">
              <h2>员工雇佣</h2>
              <button class="btn btn-secondary btn-sm" id="restaurant-reset-progress">重置进度</button>
            </div>
            <div class="restaurant-staff-grid">${this.content.staff.map(staff => this.renderStaff(staff)).join('')}</div>
          </div>
          <div class="restaurant-learning">
            <div>
              <h2>学习记录</h2>
              <p>${this.learningSummary()}</p>
            </div>
            <div class="restaurant-log">${state.log.slice(0, 5).map(line => `<span>${this.escapeHtml(line)}</span>`).join('')}</div>
          </div>
        </section>
      </section>
      ${state.status === 'finished' ? this.renderResult() : ''}
    `;
    this.bindEvents(main);
    if (window.lucide) lucide.createIcons();
  },

  updateLiveState() {
    const state = this.state;
    const values = [`${state.timeLeft}s`, state.coins, state.progress.bank, `${state.served}/${state.level.target}`, `${state.mistakes}/${state.level.maxMistakes}`, state.progress.hired.length];
    document.querySelectorAll('.restaurant-scorebar .restaurant-metric strong').forEach((node, index) => {
      if (values[index] !== undefined) node.textContent = String(values[index]);
    });
    state.events.forEach(event => {
      const card = document.querySelector(`[data-event="${event.id}"]`);
      if (!card) return;
      const bar = card.querySelector('.patience span');
      const staff = card.querySelector('.staff-working');
      if (bar) bar.style.width = `${event.patience}%`;
      if (staff) staff.textContent = event.staffId ? `${this.staffName(event.staffId)}: ${Math.max(0, event.staffWork)}s` : '等待处理';
    });
  },

  renderStation(id, label) {
    const station = this.content.stations.find(item => item.id === id);
    const staff = this.hiredStaff().filter(person => (this.state.progress.staffStations[person.id] || person.station) === id);
    return `
      <div class="scene-station station-${id}">
        <span><i data-lucide="${station.icon}"></i>${label}</span>
        <div>${staff.map(person => `<b>${this.escapeHtml(person.name)}</b>`).join('') || '<small>未配置</small>'}</div>
      </div>
    `;
  },

  renderEvents() {
    if (!this.state.events.length) return '<div class="scene-empty">准备开店</div>';
    return this.state.events.map(event => {
      const type = this.content.eventTypes[event.type];
      const active = event.id === this.state.activeId ? 'is-active' : '';
      return `
        <button class="scene-customer ${active}" data-event="${event.id}" type="button">
          <span class="customer-avatar tone-${event.customer.tone}">${this.escapeHtml(event.customer.avatar)}</span>
          <strong>${this.escapeHtml(event.customer.name)}</strong>
          <small>${this.escapeHtml(event.customer.role)}</small>
          <em class="event-badge event-${type.color}"><i data-lucide="${type.icon}"></i>${type.label}</em>
          <span class="patience"><span style="width:${event.patience}%"></span></span>
          <span class="staff-working">${event.staffId ? `${this.staffName(event.staffId)}: ${Math.max(0, event.staffWork)}s` : '等待处理'}</span>
        </button>
      `;
    }).join('');
  },

  renderActiveEvent() {
    const event = this.state.events.find(item => item.id === this.state.activeId);
    if (!event) {
      return `
        <p class="restaurant-kicker">EVENT</p>
        <h2>等待事件</h2>
        <p class="restaurant-muted">客人会在场景里产生点单、服务、问答、结账和投诉事件。</p>
      `;
    }
    const type = this.content.eventTypes[event.type];
    return `
      <p class="restaurant-kicker">${type.label}</p>
      <h2>${this.escapeHtml(event.customer.name)}</h2>
      <p class="restaurant-japanese">${this.escapeHtml(event.scenario.text)}</p>
      <p class="restaurant-translation">${this.escapeHtml(event.scenario.zh)}</p>
      <div class="restaurant-choice-list">
        ${event.scenario.choices.map(choice => `<button type="button" data-answer="${this.escapeAttr(choice)}">${this.escapeHtml(choice)}</button>`).join('')}
      </div>
      <p class="restaurant-feedback">${this.escapeHtml(event.feedback || '选择最合适的日语回应。')}</p>
    `;
  },

  renderStaff(staff) {
    const hired = this.state.progress.hired.includes(staff.id);
    const assigned = this.state.progress.staffStations[staff.id] || staff.station;
    const affordable = this.state.progress.bank >= staff.cost;
    return `
      <div class="restaurant-staff-card ${hired ? 'is-hired' : ''}">
        <span class="staff-portrait">${this.escapeHtml(staff.name.slice(0, 1))}</span>
        <div>
          <strong>${this.escapeHtml(staff.name)} / ${this.escapeHtml(staff.title)}</strong>
          <p>${this.escapeHtml(staff.description)}</p>
          <small>成功率 ${Math.round(staff.success * 100)}% · ${staff.speed}s</small>
        </div>
        ${hired ? `
          <select data-staff-station="${staff.id}" class="restaurant-staff-select">
            ${this.content.stations.map(station => `<option value="${station.id}" ${assigned === station.id ? 'selected' : ''}>${station.label}</option>`).join('')}
          </select>
        ` : `
          <button class="btn btn-sm ${affordable ? 'btn-primary' : 'btn-secondary'}" data-hire="${staff.id}" ${affordable ? '' : 'disabled'}>${staff.cost} 金币</button>
        `}
      </div>
    `;
  },

  renderLevelButton(level) {
    const progress = this.state.progress;
    const locked = level.day > progress.day;
    const completed = progress.completedDays.includes(level.day);
    const active = this.state.level.day === level.day;
    return `<button class="restaurant-level ${active ? 'is-active' : ''} ${completed ? 'is-complete' : ''}" data-day="${level.day}" type="button" ${locked ? 'disabled' : ''}><span>Day ${level.day}</span><strong>${this.escapeHtml(level.title)}</strong></button>`;
  },

  renderResult() {
    const result = this.state.result || { passed: false, reward: 0 };
    const words = Object.entries(this.state.mastered).slice(0, 4).map(([word, count]) => `<span>${this.escapeHtml(word)} x ${count}</span>`).join('');
    return `
      <div class="restaurant-result" role="dialog" aria-modal="true">
        <div class="restaurant-result-card">
          <button class="modal-close" id="restaurant-result-close" type="button" aria-label="关闭"><i data-lucide="x"></i></button>
          <p class="restaurant-kicker">${result.passed ? 'LEVEL CLEAR' : 'TRY AGAIN'}</p>
          <h2>${result.passed ? '闯关成功' : '营业结束'}</h2>
          <p class="restaurant-result-copy">${result.passed ? '新场景已解锁，可以雇佣员工或继续下一天。' : '目标还没达成，优先处理红色和黄色事件。'}</p>
          <div class="restaurant-result-grid">
            ${this.metric('smile', '完成事件', this.state.served)}
            ${this.metric('coins', '奖励', result.reward)}
            ${this.metric('wallet', '店铺资金', this.state.progress.bank)}
          </div>
          <div class="restaurant-result-words"><strong>练习过的回应</strong><div>${words || '<span>还没有完成事件</span>'}</div></div>
          <button class="btn btn-primary" id="restaurant-play-again"><i data-lucide="play"></i>${result.passed ? '进入下一天' : '再挑战一次'}</button>
        </div>
      </div>
    `;
  },

  bindEvents(root) {
    root.querySelector('#restaurant-start')?.addEventListener('click', () => {
      if (this.state.status === 'finished') this.newDay(this.loadProgress().day);
      this.startGame();
    });
    root.querySelector('#restaurant-reset-day')?.addEventListener('click', () => this.newDay(this.state.level.day));
    root.querySelector('#restaurant-reset-progress')?.addEventListener('click', () => this.resetProgress());
    root.querySelector('#restaurant-play-again')?.addEventListener('click', () => {
      this.newDay(this.loadProgress().day);
      this.startGame();
    });
    root.querySelector('#restaurant-result-close')?.addEventListener('click', () => this.newDay(this.loadProgress().day));
    root.querySelectorAll('[data-event]').forEach(button => button.addEventListener('click', () => this.chooseEvent(button.dataset.event)));
    root.querySelectorAll('[data-answer]').forEach(button => button.addEventListener('click', () => this.answer(button.dataset.answer)));
    root.querySelectorAll('[data-hire]').forEach(button => button.addEventListener('click', () => this.hireStaff(button.dataset.hire)));
    root.querySelectorAll('[data-day]').forEach(button => button.addEventListener('click', () => this.selectDay(Number(button.dataset.day))));
    root.querySelectorAll('[data-staff-station]').forEach(select => select.addEventListener('change', () => this.assignStaff(select.dataset.staffStation, select.value)));
  },

  hiredStaff() {
    return this.content.staff.filter(staff => this.state.progress.hired.includes(staff.id));
  },

  staffName(id) {
    return this.content.staff.find(staff => staff.id === id)?.name || 'スタッフ';
  },

  metric(icon, label, value) {
    return `<div class="restaurant-metric"><i data-lucide="${icon}"></i><span><small>${this.escapeHtml(label)}</small><strong>${this.escapeHtml(String(value))}</strong></span></div>`;
  },

  learningSummary() {
    const words = Object.keys(this.state.mastered);
    if (!words.length) return '点击场景里的客人事件，选择最合适的日语回应。员工会自动处理自己擅长的岗位事件。';
    return `已练习: ${words.slice(0, 4).join(' / ')}`;
  },

  pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  },

  stopTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  },

  escapeAttr(text) {
    return this.escapeHtml(text).replace(/"/g, '&quot;');
  }
};

window.Restaurant = Restaurant;
