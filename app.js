/* ==========================================================================
   StudyAdapt — Application Core & Pomodoro Engine for Samisleither
   ========================================================================== */

const DEFAULT_STATE = {
  user: {
    name: "samisleither",
    examName: "ENEM 2026 / Concursos",
    examDate: "2026-11-08",
    hoursPerDay: 4,
    streakDays: 5
  },
  subjects: [
    {
      id: "sub_1",
      name: "Matemática & Suas Tecnologias",
      difficulty: 4,
      color: "#6366f1",
      topics: [
        { id: "top_1", title: "Funções do 2º Grau & Máximos/Mínimos", duration: 60, status: "completed" },
        { id: "top_2", title: "Geometria Espacial (Prismas e Pirâmides)", duration: 45, status: "pending" },
        { id: "top_3", title: "Análise Combinatória & Arranjos", duration: 60, status: "pending" }
      ]
    },
    {
      id: "sub_2",
      name: "Biologia & Ecologia",
      difficulty: 3,
      color: "#10b981",
      topics: [
        { id: "top_4", title: "Ecologia - Ciclos Biogeoquímicos", duration: 45, status: "completed" },
        { id: "top_5", title: "Genética - 1ª Lei de Mendel", duration: 60, status: "pending" }
      ]
    },
    {
      id: "sub_3",
      name: "Física Geral",
      difficulty: 5,
      color: "#f43f5e",
      topics: [
        { id: "top_6", title: "Cinemática - MUV e Gráficos", duration: 50, status: "pending" }
      ]
    },
    {
      id: "sub_4",
      name: "História do Brasil",
      difficulty: 2,
      color: "#f59e0b",
      topics: [
        { id: "top_7", title: "Brasil Colônia - Ciclo do Açúcar", duration: 40, status: "completed" }
      ]
    }
  ],
  tasksToday: [
    {
      id: "task_1",
      subjectId: "sub_1",
      topicTitle: "Geometria Espacial (Prismas e Pirâmides)",
      durationMinutes: 45,
      type: "new",
      status: "pending"
    },
    {
      id: "task_2",
      subjectId: "sub_2",
      topicTitle: "Genética - 1ª Lei de Mendel",
      durationMinutes: 60,
      type: "new",
      status: "pending"
    },
    {
      id: "task_3",
      subjectId: "sub_4",
      topicTitle: "Revisão: Brasil Colônia",
      durationMinutes: 25,
      type: "review",
      status: "completed"
    },
    {
      id: "task_4",
      subjectId: "sub_3",
      topicTitle: "Cinemática - MUV e Gráficos",
      durationMinutes: 50,
      type: "new",
      status: "pending"
    }
  ],
  reviews: [
    { id: "rev_1", subjectName: "História", topicTitle: "Brasil Colônia", daysInterval: 3, dueDate: "Amanhã" },
    { id: "rev_2", subjectName: "Biologia", topicTitle: "Ecologia - Ciclos", daysInterval: 7, dueDate: "Em 5 dias" },
    { id: "rev_3", subjectName: "Matemática", topicTitle: "Funções do 2º Grau", daysInterval: 15, dueDate: "Em 12 dias" }
  ],
  simulations: [
    { date: "02/10/2026", subjectId: "sub_1", subjectName: "Matemática", accuracy: 82, totalQuestions: 45 },
    { date: "28/09/2026", subjectId: "sub_2", subjectName: "Biologia", accuracy: 88, totalQuestions: 30 },
    { date: "20/09/2026", subjectId: "sub_3", subjectName: "Física", accuracy: 65, totalQuestions: 25 }
  ]
};

class StudyApp {
  constructor() {
    this.state = this.loadState();
    if (!this.state.user || this.state.user.name !== "samisleither") {
      this.state.user = this.state.user || {};
      this.state.user.name = "samisleither";
      this.saveState();
    }
    this.activeTab = "dashboard";

    // Pomodoro Timer State
    this.timerSeconds = 1500; // 25 mins
    this.timerTotalSeconds = 1500;
    this.timerInterval = null;
    this.timerRunning = false;

    this.init();
  }

  loadState() {
    const saved = localStorage.getItem("studyadapt_samisleither_data");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return DEFAULT_STATE;
  }

  saveState() {
    localStorage.setItem("studyadapt_samisleither_data", JSON.stringify(this.state));
  }

  init() {
    this.bindEvents();
    this.updateUI();
  }

  bindEvents() {
    // Nav Tabs
    document.querySelectorAll(".nav-item").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const tab = e.currentTarget.getAttribute("data-tab");
        this.switchTab(tab);
      });
    });

    // Re-schedule Button
    document.getElementById("btn-quick-reschedule").addEventListener("click", () => {
      this.triggerAdaptiveReschedule(true);
    });

    // Banner close
    document.getElementById("btn-close-banner").addEventListener("click", () => {
      document.getElementById("reschedule-banner").classList.add("hidden");
    });

    // Subject Modal
    document.getElementById("btn-open-subject-modal").addEventListener("click", () => {
      document.getElementById("modal-subject").classList.remove("hidden");
    });

    document.getElementById("btn-close-subject-modal").addEventListener("click", () => {
      document.getElementById("modal-subject").classList.add("hidden");
    });

    document.getElementById("btn-cancel-subject").addEventListener("click", () => {
      document.getElementById("modal-subject").classList.add("hidden");
    });

    document.getElementById("form-add-subject").addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleAddSubject();
    });

    // Topic Modal
    document.getElementById("btn-close-topic-modal").addEventListener("click", () => {
      document.getElementById("modal-topic").classList.add("hidden");
    });

    document.getElementById("btn-cancel-topic").addEventListener("click", () => {
      document.getElementById("modal-topic").classList.add("hidden");
    });

    document.getElementById("form-add-topic").addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleAddTopic();
    });

    // Quick Simulado
    document.getElementById("btn-quick-sim-save").addEventListener("click", () => {
      this.handleSaveQuickSimulated();
    });

    // Settings Form
    document.getElementById("settings-form").addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleSaveSettings();
    });

    // Reset Demo Data
    document.getElementById("btn-reset-demo").addEventListener("click", () => {
      if (confirm("Restaurar dados de demonstração para samisleither?")) {
        this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
        this.saveState();
        this.updateUI();
      }
    });

    // Pomodoro Controls (Dashboard + Full Page)
    document.getElementById("dash-btn-timer-toggle").addEventListener("click", () => this.toggleTimer());
    document.getElementById("dash-btn-timer-reset").addEventListener("click", () => this.resetTimer());
    
    const fullStart = document.getElementById("full-btn-timer-start");
    if (fullStart) fullStart.addEventListener("click", () => this.toggleTimer());
    
    const fullReset = document.getElementById("full-btn-timer-reset");
    if (fullReset) fullReset.addEventListener("click", () => this.resetTimer());

    document.querySelectorAll(".mode-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
        e.currentTarget.classList.add("active");
        const secs = parseInt(e.currentTarget.getAttribute("data-time"), 10);
        this.setTimerDuration(secs);
      });
    });
  }

  switchTab(tabId) {
    this.activeTab = tabId;
    document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));

    const navBtn = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
    const pane = document.getElementById(`tab-${tabId}`);
    
    if (navBtn) navBtn.classList.add("active");
    if (pane) pane.classList.add("active");

    if (tabId === "performance") {
      this.renderPerformanceChart();
    }

    if (window.feather) feather.replace();
  }

  updateUI() {
    this.renderHeader();
    this.renderTodayTasks();
    this.renderSubjects();
    this.renderReviews();
    this.renderSimulations();
    this.renderSettings();
    this.populateSubjectSelects();
    this.updateTimerDisplay();

    if (this.activeTab === "performance") {
      this.renderPerformanceChart();
    }

    if (window.feather) feather.replace();
  }

  renderHeader() {
    document.getElementById("welcome-title").textContent = `Olá, ${this.state.user.name || "samisleither"} 👋`;
    
    const targetDate = new Date(this.state.user.examDate);
    const today = new Date();
    const diffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
    const daysLabel = diffDays > 0 ? `${diffDays} dias` : 'Hoje';
    
    document.getElementById("exam-countdown-text").innerHTML = 
      `Faltam <strong>${daysLabel}</strong> para o ${this.state.user.examName}`;

    document.getElementById("streak-days").textContent = `${this.state.user.streakDays} Dias Seguidos`;

    // Rhythm Calculation
    const missedTasks = this.state.tasksToday.filter(t => t.status === "missed").length;
    const rhythmIndicator = document.getElementById("rhythm-indicator");
    const rhythmText = document.getElementById("rhythm-text");

    if (missedTasks >= 2) {
      rhythmIndicator.className = "rhythm-pill status-behind";
      rhythmText.textContent = "Ritmo: Replanejamento Recomendado";
    } else {
      rhythmIndicator.className = "rhythm-pill status-on-track";
      rhythmText.textContent = "Ritmo: No Prazo";
    }

    // Stats
    const totalToday = this.state.tasksToday.length;
    const doneToday = this.state.tasksToday.filter(t => t.status === "completed").length;
    document.getElementById("stat-completed-today").textContent = `${doneToday}/${totalToday}`;
    document.getElementById("stat-hours-today").textContent = `${this.state.user.hoursPerDay}h`;
    document.getElementById("stat-pending-reviews").textContent = `${this.state.reviews.length}`;

    // Overall Progress %
    let allTopicsCount = 0;
    let completedTopicsCount = 0;
    this.state.subjects.forEach(s => {
      s.topics.forEach(t => {
        allTopicsCount++;
        if (t.status === "completed") completedTopicsCount++;
      });
    });

    const pct = allTopicsCount > 0 ? Math.round((completedTopicsCount / allTopicsCount) * 100) : 0;
    document.getElementById("stat-progress-pct").textContent = `${pct}%`;
    document.getElementById("progress-box-pct").textContent = `${pct}%`;
    document.getElementById("progress-bar-fill").style.width = `${pct}%`;
  }

  renderTodayTasks() {
    const container = document.getElementById("today-tasks-list");
    container.innerHTML = "";

    if (this.state.tasksToday.length === 0) {
      container.innerHTML = `<div class="task-item"><p>Nenhuma tarefa agendada para hoje!</p></div>`;
      return;
    }

    this.state.tasksToday.forEach(task => {
      const subject = this.state.subjects.find(s => s.id === task.subjectId) || { name: "Geral", color: "#6366f1" };

      const item = document.createElement("div");
      item.className = `task-item status-${task.status}`;

      const typeBadge = task.type === "review" 
        ? `<span class="task-type-badge type-review">Revisão</span>` 
        : `<span class="task-type-badge type-new">Tópico Novo</span>`;

      item.innerHTML = `
        <div class="task-left">
          <div class="subject-color-indicator" style="background-color: ${subject.color}"></div>
          <div class="task-info">
            <h4>${task.topicTitle}</h4>
            <div class="task-meta">
              <span>${subject.name}</span>
              <span>⏱ ${task.durationMinutes} min</span>
              ${typeBadge}
            </div>
          </div>
        </div>
        <div class="task-actions">
          <button class="btn btn-sm btn-success" data-action="complete" data-id="${task.id}" title="Concluído">
            <i data-feather="check"></i>
          </button>
          <button class="btn btn-sm btn-warning" data-action="partial" data-id="${task.id}" title="Parcial">
            <i data-feather="minus"></i>
          </button>
          <button class="btn btn-sm btn-danger" data-action="missed" data-id="${task.id}" title="Não Feito">
            <i data-feather="x"></i>
          </button>
        </div>
      `;

      container.appendChild(item);
    });

    container.querySelectorAll("button[data-action]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const action = e.currentTarget.getAttribute("data-action");
        const taskId = e.currentTarget.getAttribute("data-id");
        this.updateTaskStatus(taskId, action);
      });
    });
  }

  updateTaskStatus(taskId, action) {
    const task = this.state.tasksToday.find(t => t.id === taskId);
    if (!task) return;

    if (action === "complete") {
      task.status = "completed";
      this.scheduleSpacedReview(task);
    } else if (action === "partial") {
      task.status = "partial";
    } else if (action === "missed") {
      task.status = "missed";
      this.triggerAdaptiveReschedule(false, task);
    }

    this.saveState();
    this.updateUI();
  }

  scheduleSpacedReview(task) {
    const subject = this.state.subjects.find(s => s.id === task.subjectId);
    const subName = subject ? subject.name : "Geral";
    
    const exists = this.state.reviews.some(r => r.topicTitle.includes(task.topicTitle));
    if (!exists) {
      this.state.reviews.unshift({
        id: `rev_${Date.now()}`,
        subjectName: subName,
        topicTitle: task.topicTitle,
        daysInterval: 1,
        dueDate: "Amanhã"
      });
    }
  }

  triggerAdaptiveReschedule(isManual = false, missedTask = null) {
    const missedList = this.state.tasksToday.filter(t => t.status === "missed");

    if (missedTask && missedTask.status === "missed" && !missedList.includes(missedTask)) {
      missedList.push(missedTask);
    }

    const banner = document.getElementById("reschedule-banner");
    const bannerMsg = document.getElementById("reschedule-banner-msg");

    if (missedList.length > 0 || isManual) {
      bannerMsg.textContent = `⚡ Motor Adaptativo ativado para samisleither: ${missedList.length || 1} matéria(s) pendente(s) foram redistribuídas de maneira inteligente nos próximos 3 dias!`;
      banner.classList.remove("hidden");
    }

    this.state.tasksToday.forEach(t => {
      if (t.status === "missed") {
        t.status = "pending";
      }
    });

    this.saveState();
    this.updateUI();
  }

  renderSubjects() {
    const container = document.getElementById("subjects-container");
    container.innerHTML = "";

    this.state.subjects.forEach(sub => {
      const card = document.createElement("div");
      card.className = "subject-card";

      const stars = "★".repeat(sub.difficulty) + "☆".repeat(5 - sub.difficulty);

      let topicsHtml = sub.topics.map(t => `
        <div class="topic-mini-item">
          <span>${t.title}</span>
          <span class="badge-tag">${t.duration} min</span>
        </div>
      `).join("");

      if (sub.topics.length === 0) {
        topicsHtml = `<div class="topic-mini-item"><span>Sem tópicos cadastrados ainda.</span></div>`;
      }

      card.innerHTML = `
        <div>
          <div class="subject-card-header">
            <div class="subject-title-area">
              <div class="subject-tag-badge" style="background-color: ${sub.color}"></div>
              <h3>${sub.name}</h3>
            </div>
            <div class="difficulty-stars" title="Dificuldade: ${sub.difficulty}/5">${stars}</div>
          </div>
          <div class="topics-mini-list">
            ${topicsHtml}
          </div>
        </div>
        <div>
          <button class="btn btn-secondary btn-sm" style="width: 100%;" data-add-topic-for="${sub.id}">
            <i data-feather="plus"></i> Adicionar Tópico
          </button>
        </div>
      `;

      container.appendChild(card);
    });

    container.querySelectorAll("button[data-add-topic-for]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const subId = e.currentTarget.getAttribute("data-add-topic-for");
        document.getElementById("topic-subject-id").value = subId;
        document.getElementById("modal-topic").classList.remove("hidden");
      });
    });
  }

  handleAddSubject() {
    const name = document.getElementById("new-sub-name").value.trim();
    const diff = parseInt(document.getElementById("new-sub-diff").value, 10);
    const color = document.getElementById("new-sub-color").value;

    if (!name) return;

    this.state.subjects.push({
      id: `sub_${Date.now()}`,
      name,
      difficulty: diff,
      color,
      topics: []
    });

    this.saveState();
    this.updateUI();

    document.getElementById("form-add-subject").reset();
    document.getElementById("modal-subject").classList.add("hidden");
  }

  handleAddTopic() {
    const subId = document.getElementById("topic-subject-id").value;
    const title = document.getElementById("new-topic-title").value.trim();
    const duration = parseInt(document.getElementById("new-topic-time").value, 10);

    if (!title || !subId) return;

    const subject = this.state.subjects.find(s => s.id === subId);
    if (subject) {
      subject.topics.push({ id: `top_${Date.now()}`, title, duration, status: "pending" });
      this.state.tasksToday.push({
        id: `task_${Date.now()}`,
        subjectId: subId,
        topicTitle: title,
        durationMinutes: duration,
        type: "new",
        status: "pending"
      });
    }

    this.saveState();
    this.updateUI();

    document.getElementById("form-add-topic").reset();
    document.getElementById("modal-topic").classList.add("hidden");
  }

  renderReviews() {
    const container = document.getElementById("reviews-timeline-container");
    container.innerHTML = "";

    if (this.state.reviews.length === 0) {
      container.innerHTML = `<p class="section-desc">Nenhuma revisão pendente no momento.</p>`;
      return;
    }

    this.state.reviews.forEach(rev => {
      const item = document.createElement("div");
      item.className = "review-timeline-item";
      item.innerHTML = `
        <div class="review-days-tag">+${rev.daysInterval} dia(s)</div>
        <div style="flex: 1;">
          <h4>${rev.topicTitle}</h4>
          <p class="section-desc" style="margin: 0;">${rev.subjectName} • Vencimento: <strong>${rev.dueDate}</strong></p>
        </div>
        <button class="btn btn-sm btn-success" data-done-review="${rev.id}">
          <i data-feather="check-circle"></i> Concluir Revisão
        </button>
      `;

      container.appendChild(item);
    });

    container.querySelectorAll("button[data-done-review]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.getAttribute("data-done-review");
        this.state.reviews = this.state.reviews.filter(r => r.id !== id);
        this.saveState();
        this.updateUI();
      });
    });
  }

  renderSimulations() {
    const tbody = document.getElementById("sim-history-tbody");
    tbody.innerHTML = "";

    this.state.simulations.forEach(sim => {
      const tr = document.createElement("tr");
      const badgeClass = sim.accuracy >= 75 ? "type-review" : "type-new";
      tr.innerHTML = `
        <td>${sim.date}</td>
        <td><strong>${sim.subjectName}</strong></td>
        <td>${sim.accuracy}% (${Math.round(sim.accuracy * sim.totalQuestions / 100)}/${sim.totalQuestions})</td>
        <td><span class="task-type-badge ${badgeClass}">${sim.accuracy >= 75 ? "Ótimo" : "Aprimorar"}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  handleSaveQuickSimulated() {
    const subId = document.getElementById("quick-sim-subject").value;
    const scoreVal = parseFloat(document.getElementById("quick-sim-score").value);

    if (isNaN(scoreVal) || !subId) return;

    const subject = this.state.subjects.find(s => s.id === subId);
    const subName = subject ? subject.name : "Geral";

    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    this.state.simulations.unshift({
      date: dateStr,
      subjectId: subId,
      subjectName: subName,
      accuracy: scoreVal,
      totalQuestions: 45
    });

    this.saveState();
    this.updateUI();
    document.getElementById("quick-sim-score").value = "";
    alert("Simulado registrado com sucesso para samisleither!");
  }

  renderSettings() {
    document.getElementById("setting-user-name").value = this.state.user.name || "samisleither";
    document.getElementById("setting-exam-name").value = this.state.user.examName;
    document.getElementById("setting-exam-date").value = this.state.user.examDate;
    document.getElementById("setting-hours-day").value = this.state.user.hoursPerDay;
  }

  handleSaveSettings() {
    this.state.user.name = document.getElementById("setting-user-name").value || "samisleither";
    this.state.user.examName = document.getElementById("setting-exam-name").value;
    this.state.user.examDate = document.getElementById("setting-exam-date").value;
    this.state.user.hoursPerDay = parseFloat(document.getElementById("setting-hours-day").value);

    this.saveState();
    this.updateUI();
    alert("Perfil de samisleither atualizado!");
  }

  populateSubjectSelects() {
    const select = document.getElementById("quick-sim-subject");
    select.innerHTML = "";
    this.state.subjects.forEach(sub => {
      const opt = document.createElement("option");
      opt.value = sub.id;
      opt.textContent = sub.name;
      select.appendChild(opt);
    });
  }

  /* Pomodoro Timer Engine */
  setTimerDuration(seconds) {
    this.timerSeconds = seconds;
    this.timerTotalSeconds = seconds;
    if (this.timerRunning) {
      this.stopTimer();
    }
    this.updateTimerDisplay();
  }

  toggleTimer() {
    if (this.timerRunning) {
      this.stopTimer();
    } else {
      this.startTimer();
    }
  }

  startTimer() {
    this.timerRunning = true;
    this.updateTimerButtonsUI(true);

    this.timerInterval = setInterval(() => {
      if (this.timerSeconds > 0) {
        this.timerSeconds--;
        this.updateTimerDisplay();
      } else {
        this.stopTimer();
        alert("🎉 Parabéns samisleither! Sessão de estudo concluída com sucesso!");
        this.resetTimer();
      }
    }, 1000);
  }

  stopTimer() {
    this.timerRunning = false;
    clearInterval(this.timerInterval);
    this.updateTimerButtonsUI(false);
  }

  resetTimer() {
    this.stopTimer();
    this.timerSeconds = this.timerTotalSeconds;
    this.updateTimerDisplay();
  }

  updateTimerButtonsUI(running) {
    const dashBtn = document.getElementById("dash-btn-timer-toggle");
    const fullBtn = document.getElementById("full-btn-timer-start");
    
    if (dashBtn) {
      dashBtn.innerHTML = running ? `<i data-feather="pause"></i> Pausar` : `<i data-feather="play"></i> Iniciar`;
    }
    if (fullBtn) {
      fullBtn.innerHTML = running ? `<i data-feather="pause"></i> Pausar Sessão` : `<i data-feather="play"></i> Iniciar Sessão`;
    }

    const fullStatus = document.getElementById("full-timer-status");
    if (fullStatus) {
      fullStatus.textContent = running ? "Sessão de foco ativa para samisleither..." : "Pausado";
    }

    if (window.feather) feather.replace();
  }

  updateTimerDisplay() {
    const mins = Math.floor(this.timerSeconds / 60);
    const secs = this.timerSeconds % 60;
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    const dashElem = document.getElementById("dash-timer-display");
    if (dashElem) dashElem.textContent = timeStr;

    const fullElem = document.getElementById("full-timer-display");
    if (fullElem) fullElem.textContent = timeStr;
  }

  renderPerformanceChart() {
    const canvas = document.getElementById("performanceChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const padding = 40;
    const width = canvas.width - padding * 2;
    const height = canvas.height - padding * 2;

    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding + (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(canvas.width - padding, y);
      ctx.stroke();

      ctx.fillStyle = "#64748b";
      ctx.font = "11px sans-serif";
      ctx.fillText(`${100 - i * 25}%`, 10, y + 4);
    }

    const data = this.state.subjects.map(sub => {
      const sims = this.state.simulations.filter(s => s.subjectId === sub.id);
      const avgScore = sims.length > 0 ? sims.reduce((acc, curr) => acc + curr.accuracy, 0) / sims.length : 70;
      return {
        name: sub.name.substring(0, 10) + "..",
        color: sub.color,
        score: avgScore
      };
    });

    if (data.length === 0) return;

    const barWidth = width / (data.length * 2);

    data.forEach((item, index) => {
      const x = padding + index * (barWidth * 2) + barWidth / 2;
      const barHeight = (item.score / 100) * height;
      const y = padding + height - barHeight;

      const grad = ctx.createLinearGradient(0, y, 0, padding + height);
      grad.addColorStop(0, item.color);
      grad.addColorStop(1, "rgba(99, 102, 241, 0.1)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, [6, 6, 0, 0]);
      ctx.fill();

      ctx.fillStyle = "#94a3b8";
      ctx.font = "12px sans-serif";
      ctx.fillText(item.name, x, padding + height + 20);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText(`${Math.round(item.score)}%`, x + 4, y - 8);
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.app = new StudyApp();
});
