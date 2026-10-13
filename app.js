/* ==========================================================================
   StudyAdapt — Application Core & Pomodoro Engine for Samisleither
   Com integração Firebase Firestore + Auth
   ========================================================================== */

import firebaseService from './firebase-service.js';

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
    this.activeTab = "dashboard";

    // Pomodoro Timer State
    this.timerSeconds = 1500; // 25 mins
    this.timerTotalSeconds = 1500;
    this.timerInterval = null;
    this.timerRunning = false;

    // Firebase
    this.firebase = firebaseService;
    this._saveDebounceTimer = null;
    this._unsubscribeSnapshot = null;

    // Loading overlay
    this._showLoadingOverlay('Conectando ao Firebase...');

    this.initFirebase();
  }

  /* =============================================
     Firebase Initialization
     ============================================= */
  async initFirebase() {
    try {
      await this.firebase.initialize();

      // Listen for auth state changes
      this.firebase.onAuthStateChanged(async (user) => {
        if (user) {
          // User is logged in — load from Firestore
          await this._loadStateFromFirestore();
          this.showApp();
          this.init();
          this._hideLoadingOverlay();
          this._showSyncStatus('online');
        } else {
          // No user logged in
          this._hideLoadingOverlay();
          this.showRegisterScreen();
        }
      });

      // Bind auth UI events
      this.bindAuthEvents();

      // Small delay to let auth state resolve
      setTimeout(() => {
        if (!this.firebase.getCurrentUser()) {
          this._hideLoadingOverlay();
          this.showRegisterScreen();
        }
      }, 3000);

    } catch (error) {
      console.error('Erro ao conectar Firebase, usando localStorage como fallback:', error);
      this._hideLoadingOverlay();
      this._showSyncStatus('offline');
      // Fallback to localStorage
      this.initAuthLegacy();
    }

    if (window.feather) feather.replace();
  }

  /* =============================================
     Loading Overlay
     ============================================= */
  _showLoadingOverlay(message) {
    let overlay = document.getElementById('firebase-loading-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'firebase-loading-overlay';
      overlay.innerHTML = `
        <div class="firebase-loader">
          <div class="firebase-spinner"></div>
          <p class="firebase-loading-text">${message || 'Carregando...'}</p>
          <p class="firebase-loading-sub">Sincronizando dados com a nuvem</p>
        </div>
      `;
      document.body.appendChild(overlay);
    } else {
      const textEl = overlay.querySelector('.firebase-loading-text');
      if (textEl) textEl.textContent = message;
      overlay.classList.remove('hidden');
    }
  }

  _hideLoadingOverlay() {
    const overlay = document.getElementById('firebase-loading-overlay');
    if (overlay) {
      overlay.classList.add('fade-out');
      setTimeout(() => overlay.remove(), 400);
    }
  }

  /* =============================================
     Sync Status Indicator
     ============================================= */
  _showSyncStatus(status) {
    let badge = document.getElementById('sync-status-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'sync-status-badge';
      document.body.appendChild(badge);
    }

    if (status === 'online') {
      badge.className = 'sync-badge sync-online';
      badge.innerHTML = '☁️ Sincronizado';
    } else if (status === 'saving') {
      badge.className = 'sync-badge sync-saving';
      badge.innerHTML = '🔄 Salvando...';
    } else if (status === 'offline') {
      badge.className = 'sync-badge sync-offline';
      badge.innerHTML = '⚠️ Offline (localStorage)';
    } else if (status === 'error') {
      badge.className = 'sync-badge sync-error';
      badge.innerHTML = '❌ Erro de sincronização';
    }

    // Auto-hide after 3 seconds for transient statuses
    if (status === 'online' || status === 'saving') {
      setTimeout(() => {
        badge.classList.add('fade-out');
        setTimeout(() => { badge.classList.remove('fade-out'); badge.className = 'sync-badge sync-hidden'; }, 400);
      }, 3000);
    }
  }

  /* =============================================
     Firestore State Management
     ============================================= */
  async _loadStateFromFirestore() {
    try {
      const cloudState = await this.firebase.loadAppState();
      if (cloudState) {
        this.state = cloudState;
        // Also save to localStorage as cache
        this._saveToLocalStorage();
        console.log('☁️ Estado carregado do Firestore');
      } else {
        // No cloud data — check localStorage or use default
        const localState = this._loadFromLocalStorage();
        if (localState) {
          this.state = localState;
          // Push to Firestore for first time
          await this.firebase.saveAppState(this.state);
          console.log('📤 Estado do localStorage enviado para o Firestore');
        } else {
          this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
          await this.firebase.saveAppState(this.state);
          console.log('🆕 Estado padrão criado no Firestore');
        }
      }
    } catch (error) {
      console.error('Erro ao carregar do Firestore:', error);
      // Fallback to localStorage
      this.state = this._loadFromLocalStorage() || JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
  }

  async saveState() {
    // Always save to localStorage immediately (for speed/offline)
    this._saveToLocalStorage();

    // Debounced save to Firestore (avoid too many writes)
    if (this._saveDebounceTimer) {
      clearTimeout(this._saveDebounceTimer);
    }

    this._saveDebounceTimer = setTimeout(async () => {
      try {
        this._showSyncStatus('saving');
        await this.firebase.saveAppState(this.state);
        this._showSyncStatus('online');
      } catch (error) {
        console.error('Erro ao salvar no Firestore:', error);
        this._showSyncStatus('error');
      }
    }, 1000); // 1 second debounce
  }

  _saveToLocalStorage() {
    localStorage.setItem("studyadapt_samisleither_data", JSON.stringify(this.state));
  }

  _loadFromLocalStorage() {
    const saved = localStorage.getItem("studyadapt_samisleither_data");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return null;
  }

  /* =============================================
     Authentication / Registration System (Firebase)
     ============================================= */
  showRegisterScreen() {
    document.getElementById("register-screen").classList.remove("hidden");
    document.getElementById("login-screen").classList.add("hidden");
    document.getElementById("app-container").classList.add("hidden");
    if (window.feather) feather.replace();
  }

  showLoginScreen() {
    document.getElementById("register-screen").classList.add("hidden");
    document.getElementById("login-screen").classList.remove("hidden");
    document.getElementById("app-container").classList.add("hidden");
    if (window.feather) feather.replace();
  }

  showApp() {
    document.getElementById("register-screen").classList.add("hidden");
    document.getElementById("login-screen").classList.add("hidden");
    document.getElementById("app-container").classList.remove("hidden");
  }

  bindAuthEvents() {
    // Toggle between register and login
    document.getElementById("btn-go-login").addEventListener("click", (e) => {
      e.preventDefault();
      this.showLoginScreen();
    });

    document.getElementById("btn-go-register").addEventListener("click", (e) => {
      e.preventDefault();
      this.showRegisterScreen();
    });

    // Register form submit
    document.getElementById("register-form").addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleRegister();
    });

    // Login form submit
    document.getElementById("login-form").addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleLogin();
    });
  }

  async handleRegister() {
    const name = document.getElementById("reg-name").value.trim();
    const email = document.getElementById("reg-email").value.trim();
    const password = document.getElementById("reg-password").value;
    const examName = document.getElementById("reg-exam").value;
    const examDate = document.getElementById("reg-exam-date").value;
    const hoursPerDay = parseFloat(document.getElementById("reg-hours").value);

    if (!name || !email || !password || !examName || !examDate) {
      this._showAuthError("register", "Por favor, preencha todos os campos.");
      return;
    }

    // Show loading
    const submitBtn = document.querySelector('#register-form .btn-register');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<div class="btn-spinner"></div> Criando conta...';
    submitBtn.disabled = true;

    try {
      const result = await this.firebase.register(email, password, name);

      if (!result.success) {
        this._showAuthError("register", result.error);
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        return;
      }

      // Initialize state with registration data
      this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
      this.state.user.name = name;
      this.state.user.examName = examName;
      this.state.user.examDate = examDate;
      this.state.user.hoursPerDay = hoursPerDay;
      this.state.user.streakDays = 0;
      this.state.user.email = email;

      // Save to Firestore
      await this.firebase.saveAppState(this.state);
      await this.firebase.saveUserProfile({
        name,
        email,
        examName,
        examDate,
        hoursPerDay,
        createdAt: new Date().toISOString()
      });

      this.showApp();
      this.init();
      this._showSyncStatus('online');

    } catch (error) {
      this._showAuthError("register", "Erro inesperado. Tente novamente.");
      console.error(error);
    } finally {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
      if (window.feather) feather.replace();
    }
  }

  async handleLogin() {
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    if (!email || !password) {
      this._showAuthError("login", "Preencha e-mail e senha.");
      return;
    }

    // Show loading
    const submitBtn = document.querySelector('#login-form .btn-register');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<div class="btn-spinner"></div> Entrando...';
    submitBtn.disabled = true;

    try {
      const result = await this.firebase.login(email, password);

      if (!result.success) {
        this._showAuthError("login", result.error);
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        return;
      }

      // State will be loaded by onAuthStateChanged callback
      // No need to do anything here

    } catch (error) {
      this._showAuthError("login", "Erro inesperado. Tente novamente.");
      console.error(error);
    } finally {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
      if (window.feather) feather.replace();
    }
  }

  async handleLogout() {
    await this.firebase.logout();
    this._unsubscribeFromSnapshots();
    this.showRegisterScreen();
  }

  _unsubscribeFromSnapshots() {
    if (this._unsubscribeSnapshot) {
      this._unsubscribeSnapshot();
      this._unsubscribeSnapshot = null;
    }
  }

  _showAuthError(form, message) {
    let errorContainer;
    if (form === "register") {
      errorContainer = document.getElementById("register-error");
    } else {
      errorContainer = document.getElementById("login-error");
    }

    if (!errorContainer) {
      errorContainer = document.createElement("div");
      errorContainer.id = form === "register" ? "register-error" : "login-error";
      errorContainer.className = "auth-error-msg";
      const formEl = document.getElementById(form === "register" ? "register-form" : "login-form");
      formEl.insertBefore(errorContainer, formEl.querySelector('.btn-register'));
    }

    errorContainer.textContent = message;
    errorContainer.classList.remove("hidden");

    // Auto-hide after 5 seconds
    setTimeout(() => errorContainer.classList.add("hidden"), 5000);
  }

  /* =============================================
     Legacy Auth (Fallback when Firebase is unavailable)
     ============================================= */
  initAuthLegacy() {
    this.bindAuthEvents();

    const loggedUser = localStorage.getItem("studyadapt_logged_user");
    if (loggedUser) {
      this.state = this._loadFromLocalStorage() || JSON.parse(JSON.stringify(DEFAULT_STATE));
      this.showApp();
      this.init();
    } else {
      this.showRegisterScreen();
    }
  }

  /* =============================================
     App Init & Events
     ============================================= */
  init() {
    this.bindEvents();
    this.updateUI();
  }

  bindEvents() {
    // Nav Tabs
    document.querySelectorAll(".nav-item").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const tab = e.currentTarget.getAttribute("data-tab");
        if (tab) this.switchTab(tab);
      });
    });

    // Logout
    document.getElementById("btn-logout").addEventListener("click", () => {
      if (confirm("Deseja realmente sair da sua conta?")) {
        this.handleLogout();
      }
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

      // Log completed session to Firestore
      this.firebase.logStudySession({
        topicTitle: task.topicTitle,
        subjectId: task.subjectId,
        durationMinutes: task.durationMinutes,
        type: task.type,
        completedAt: new Date().toISOString()
      }).catch(err => console.warn('Erro ao registrar sessão:', err));

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

    const newSubject = {
      id: `sub_${Date.now()}`,
      name,
      difficulty: diff,
      color,
      topics: []
    };

    this.state.subjects.push(newSubject);

    // Also save individually to Firestore subjects collection
    this.firebase.saveSubject(newSubject).catch(err => console.warn('Erro ao salvar matéria:', err));

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

      // Update subject in Firestore
      this.firebase.saveSubject(subject).catch(err => console.warn('Erro ao atualizar matéria:', err));
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

    const newSim = {
      id: `sim_${Date.now()}`,
      date: dateStr,
      subjectId: subId,
      subjectName: subName,
      accuracy: scoreVal,
      totalQuestions: 45
    };

    this.state.simulations.unshift(newSim);

    // Also save to Firestore simulations collection
    this.firebase.saveSimulation(newSim).catch(err => console.warn('Erro ao salvar simulado:', err));

    this.saveState();
    this.updateUI();
    document.getElementById("quick-sim-score").value = "";

    // Show success notification instead of alert
    this._showToast("Simulado registrado com sucesso! ☁️ Salvo na nuvem.");
  }

  _showToast(message) {
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = 'toast-notification show';
    setTimeout(() => { toast.className = 'toast-notification'; }, 3500);
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

    // Update profile in Firestore
    this.firebase.saveUserProfile({
      name: this.state.user.name,
      examName: this.state.user.examName,
      examDate: this.state.user.examDate,
      hoursPerDay: this.state.user.hoursPerDay
    }).catch(err => console.warn('Erro ao atualizar perfil:', err));

    this.saveState();
    this.updateUI();
    this._showToast("Perfil atualizado e sincronizado na nuvem! ☁️");
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

        // Log Pomodoro session to Firestore
        this.firebase.logStudySession({
          type: 'pomodoro',
          durationMinutes: Math.round(this.timerTotalSeconds / 60),
          completedAt: new Date().toISOString()
        }).catch(err => console.warn('Erro ao registrar sessão Pomodoro:', err));

        this._showToast("🎉 Sessão de estudo concluída com sucesso!");
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
