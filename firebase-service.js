/* ==========================================================================
   StudyAdapt — Firebase Database Service
   Camada de abstração para Firebase Auth + Firestore
   ========================================================================== */

import firebaseConfig from './firebase-config.js';

class FirebaseService {
  constructor() {
    this.app = null;
    this.auth = null;
    this.db = null;
    this.currentUser = null;
    this._initialized = false;
    this._onAuthChangeCallbacks = [];
  }

  /* =============================================
     Initialization
     ============================================= */
  async initialize() {
    if (this._initialized) return;

    try {
      // Import Firebase modules from CDN (ESM)
      const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js');
      const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js');
      const { getFirestore, doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, deleteDoc, onSnapshot, serverTimestamp, arrayUnion, arrayRemove } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');

      // Store references for later use
      this._firebaseModules = {
        initializeApp,
        getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
        signOut, onAuthStateChanged, updateProfile,
        getFirestore, doc, setDoc, getDoc, updateDoc,
        collection, query, where, getDocs, deleteDoc,
        onSnapshot, serverTimestamp, arrayUnion, arrayRemove
      };

      this.app = initializeApp(firebaseConfig);
      this.auth = getAuth(this.app);
      this.db = getFirestore(this.app);
      this._initialized = true;

      // Listen for auth state changes
      onAuthStateChanged(this.auth, (user) => {
        this.currentUser = user;
        this._onAuthChangeCallbacks.forEach(cb => cb(user));
      });

      console.log('🔥 Firebase inicializado com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao inicializar Firebase:', error);
      throw error;
    }
  }

  /* =============================================
     Auth State Observer
     ============================================= */
  onAuthStateChanged(callback) {
    this._onAuthChangeCallbacks.push(callback);
    // If already initialized and we have a user, call immediately
    if (this._initialized && this.currentUser) {
      callback(this.currentUser);
    }
  }

  /* =============================================
     Authentication Methods
     ============================================= */

  /**
   * Registrar novo usuário com e-mail e senha
   */
  async register(email, password, displayName) {
    const { createUserWithEmailAndPassword, updateProfile } = this._firebaseModules;

    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;

      // Update display name
      await updateProfile(user, { displayName });

      console.log('✅ Usuário registrado:', user.uid);
      return { success: true, user };
    } catch (error) {
      console.error('❌ Erro no registro:', error);
      return { success: false, error: this._translateAuthError(error.code) };
    }
  }

  /**
   * Login com e-mail e senha
   */
  async login(email, password) {
    const { signInWithEmailAndPassword } = this._firebaseModules;

    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      console.log('✅ Login bem-sucedido:', userCredential.user.uid);
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('❌ Erro no login:', error);
      return { success: false, error: this._translateAuthError(error.code) };
    }
  }

  /**
   * Logout
   */
  async logout() {
    const { signOut } = this._firebaseModules;

    try {
      await signOut(this.auth);
      this.currentUser = null;
      console.log('✅ Logout realizado');
      return { success: true };
    } catch (error) {
      console.error('❌ Erro no logout:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Retorna o usuário logado atualmente
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /* =============================================
     Firestore — User Profile (Document)
     ============================================= */

  /**
   * Criar/atualizar perfil do usuário no Firestore
   */
  async saveUserProfile(profileData) {
    if (!this.currentUser) throw new Error('Usuário não autenticado');
    const { doc, setDoc, serverTimestamp } = this._firebaseModules;

    const userRef = doc(this.db, 'users', this.currentUser.uid);
    await setDoc(userRef, {
      ...profileData,
      updatedAt: serverTimestamp()
    }, { merge: true });

    console.log('💾 Perfil salvo no Firestore');
  }

  /**
   * Carregar perfil do usuário
   */
  async getUserProfile() {
    if (!this.currentUser) return null;
    const { doc, getDoc } = this._firebaseModules;

    const userRef = doc(this.db, 'users', this.currentUser.uid);
    const snapshot = await getDoc(userRef);

    if (snapshot.exists()) {
      return snapshot.data();
    }
    return null;
  }

  /* =============================================
     Firestore — Full App State (Single Document)
     Armazena todo o estado do app em um único doc
     para manter compatibilidade com a estrutura atual
     ============================================= */

  /**
   * Salvar o estado completo do app no Firestore
   */
  async saveAppState(state) {
    if (!this.currentUser) throw new Error('Usuário não autenticado');
    const { doc, setDoc, serverTimestamp } = this._firebaseModules;

    const stateRef = doc(this.db, 'appStates', this.currentUser.uid);
    await setDoc(stateRef, {
      state: JSON.parse(JSON.stringify(state)), // deep clone to avoid Firebase issues
      userId: this.currentUser.uid,
      updatedAt: serverTimestamp()
    }, { merge: true });

    console.log('💾 Estado do app salvo no Firestore');
  }

  /**
   * Carregar o estado completo do app do Firestore
   */
  async loadAppState() {
    if (!this.currentUser) return null;
    const { doc, getDoc } = this._firebaseModules;

    const stateRef = doc(this.db, 'appStates', this.currentUser.uid);
    const snapshot = await getDoc(stateRef);

    if (snapshot.exists()) {
      const data = snapshot.data();
      return data.state || null;
    }
    return null;
  }

  /**
   * Escutar mudanças em tempo real no estado do app
   */
  listenToAppState(callback) {
    if (!this.currentUser) return null;
    const { doc, onSnapshot } = this._firebaseModules;

    const stateRef = doc(this.db, 'appStates', this.currentUser.uid);
    const unsubscribe = onSnapshot(stateRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        callback(data.state);
      }
    });

    return unsubscribe;
  }

  /* =============================================
     Firestore — Subjects Collection
     Dados individuais por matéria para queries
     ============================================= */

  /**
   * Salvar uma matéria individualmente
   */
  async saveSubject(subject) {
    if (!this.currentUser) throw new Error('Usuário não autenticado');
    const { doc, setDoc, serverTimestamp } = this._firebaseModules;

    const subjectRef = doc(this.db, 'users', this.currentUser.uid, 'subjects', subject.id);
    await setDoc(subjectRef, {
      ...subject,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  /**
   * Carregar todas as matérias do usuário
   */
  async loadSubjects() {
    if (!this.currentUser) return [];
    const { collection, getDocs } = this._firebaseModules;

    const subjectsRef = collection(this.db, 'users', this.currentUser.uid, 'subjects');
    const snapshot = await getDocs(subjectsRef);

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Excluir uma matéria
   */
  async deleteSubject(subjectId) {
    if (!this.currentUser) throw new Error('Usuário não autenticado');
    const { doc, deleteDoc } = this._firebaseModules;

    const subjectRef = doc(this.db, 'users', this.currentUser.uid, 'subjects', subjectId);
    await deleteDoc(subjectRef);
  }

  /* =============================================
     Firestore — Simulations Collection
     ============================================= */

  /**
   * Salvar um simulado
   */
  async saveSimulation(simulation) {
    if (!this.currentUser) throw new Error('Usuário não autenticado');
    const { doc, setDoc, serverTimestamp } = this._firebaseModules;

    const simId = simulation.id || `sim_${Date.now()}`;
    const simRef = doc(this.db, 'users', this.currentUser.uid, 'simulations', simId);
    await setDoc(simRef, {
      ...simulation,
      id: simId,
      createdAt: serverTimestamp()
    });
  }

  /**
   * Carregar simulados do usuário
   */
  async loadSimulations() {
    if (!this.currentUser) return [];
    const { collection, getDocs } = this._firebaseModules;

    const simsRef = collection(this.db, 'users', this.currentUser.uid, 'simulations');
    const snapshot = await getDocs(simsRef);

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /* =============================================
     Firestore — Study Sessions / Pomodoro History
     ============================================= */

  /**
   * Registrar sessão de estudo concluída
   */
  async logStudySession(sessionData) {
    if (!this.currentUser) throw new Error('Usuário não autenticado');
    const { doc, setDoc, serverTimestamp } = this._firebaseModules;

    const sessionId = `session_${Date.now()}`;
    const sessionRef = doc(this.db, 'users', this.currentUser.uid, 'studySessions', sessionId);
    await setDoc(sessionRef, {
      ...sessionData,
      id: sessionId,
      userId: this.currentUser.uid,
      createdAt: serverTimestamp()
    });

    console.log('📚 Sessão de estudo registrada');
  }

  /**
   * Carregar histórico de sessões de estudo
   */
  async loadStudySessions() {
    if (!this.currentUser) return [];
    const { collection, getDocs } = this._firebaseModules;

    const sessionsRef = collection(this.db, 'users', this.currentUser.uid, 'studySessions');
    const snapshot = await getDocs(sessionsRef);

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /* =============================================
     Helper — Translate Firebase Auth Errors to PT-BR
     ============================================= */
  _translateAuthError(errorCode) {
    const messages = {
      'auth/email-already-in-use': 'Este e-mail já está em uso. Tente fazer login.',
      'auth/invalid-email': 'E-mail inválido. Verifique o formato.',
      'auth/weak-password': 'Senha muito fraca. Use no mínimo 6 caracteres.',
      'auth/user-not-found': 'Conta não encontrada. Verifique o e-mail ou crie uma conta.',
      'auth/wrong-password': 'Senha incorreta. Tente novamente.',
      'auth/invalid-credential': 'Credenciais inválidas. Verifique e-mail e senha.',
      'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
      'auth/network-request-failed': 'Erro de conexão. Verifique sua internet.',
      'auth/popup-closed-by-user': 'Login cancelado pelo usuário.',
      'auth/operation-not-allowed': 'Operação não permitida. Habilite o login por E-mail/Senha no Firebase Console.',
      'auth/configuration-not-found': 'Método de login não configurado. Ative "E-mail/Senha" no Firebase Console → Authentication → Sign-in method.'
    };

    return messages[errorCode] || `Erro inesperado: ${errorCode}`;
  }
}

// Singleton export
const firebaseService = new FirebaseService();
export default firebaseService;
