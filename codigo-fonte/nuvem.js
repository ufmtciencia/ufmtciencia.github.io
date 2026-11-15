/* =====================================================================
   UFMT CIÊNCIA — CONTAS, PROGRESSO NA NUVEM E RANKING (Firebase, plano gratuito)
   ===================================================================== */
'use strict';

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyB54PcJmtPENrE5oWPZ3iJM-dJXFaKeMt8',
  authDomain: 'ufmt-ciencia.firebaseapp.com',
  projectId: 'ufmt-ciencia',
  storageBucket: 'ufmt-ciencia.firebasestorage.app',
  messagingSenderId: '435597505218',
  appId: '1:435597505218:web:6003811a331583cdda015b',
};
const SYNC_MS = 20000;      // grava no máximo a cada 20 s (economiza a cota gratuita)
const SALTO_MAX = 4900;     // pontos máximos por gravação (as regras do servidor aceitam até 5000)
const MAX_DEPENDENTES = 10;

/* Classificação dos jogadores (só para estatísticas; nunca aparece para outros jogadores). */
const NAO_DIZER = 'Prefiro não dizer';
const CLASSE = {
  adulto: {
    faixa: ['18–24', '25–34', '35–44', '45–59', '60+'],
    escolaridade: ['Fundamental', 'Médio', 'Técnico', 'Graduação (cursando)', 'Graduação (concluída)', 'Pós-graduação'],
    rede: ['Pública', 'Particular', 'Não estudo atualmente'],
  },
  menor: {
    faixa: ['até 9', '10–12', '13–15', '16–17'],
    escolaridade: ['Fundamental I (1º–5º)', 'Fundamental II (6º–9º)', 'Médio', 'Técnico'],
    rede: ['Pública', 'Particular'],
  },
};
const ROTULO_CLASSE = { faixa: 'Faixa de idade', escolaridade: 'Escolaridade', rede: 'Rede de ensino' };
const espera = ms => new Promise(r => setTimeout(r, ms));
const idAleatorio = (n, abc) => { let s = ''; const a = new Uint32Array(n); crypto.getRandomValues(a); a.forEach(x => { s += abc[x % abc.length]; }); return s; };

const Nuvem = {
  ok: false, auth: null, db: null, user: null,
  perfil: null,        // id do perfil que está jogando (uid do adulto ou id do dependente)
  dep: null,           // dados do dependente ativo ({ id, apelido, avatar, tutor }) ou null
  deps: [],            // dependentes do adulto logado
  vinculando: false,
  sujo: false, ultimo: 0, gravando: false, pontosNuvem: 0, iniciou: false,
  arenas: {},   // último conquistador de cada arena: { apelido, avatar, parceiro, nivel, uid, quando(ms) }

  iniciar() {
    try {
      if (!window.FB) throw new Error('SDK ausente');
      const app = FB.initializeApp(FIREBASE_CONFIG);
      this.auth = FB.getAuth(app); this.auth.languageCode = 'pt';
      this.db = FB.getFirestore(app);
      this.ok = true;
    } catch (e) { console.warn('Firebase indisponível', e); this.ok = false; }
    if (!this.ok) { this.entrarComoConvidado(true); return; }
    FB.onAuthStateChanged(this.auth, u => this.mudouUsuario(u));
    setInterval(() => this.gravar(), 5000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') this.gravar(true); });
  },

  ref(col, id) { return FB.doc(this.db, col, id); },
  get anonimo() { return !!(this.user && this.user.isAnonymous); },
  get adulto() { return !!(this.user && !this.user.isAnonymous); },
  get precisaVerificar() {
    const u = this.user;
    return !!(u && !u.isAnonymous && !u.emailVerified && (u.providerData || []).some(p => p.providerId === 'password'));
  },

  async mudouUsuario(u) {
    const atual = this.auth.currentUser;
    if ((u ? u.uid : null) !== (atual ? atual.uid : null)) return;   // aviso atrasado de um login que já mudou
    if (this.vinculando) { this.user = u; return; }   // aparelho do menor sendo vinculado: a tela de código continua
    if (!u && this.ignorarSaida) { this.ignorarSaida = false; this.user = null; return; }  // código recusado: fica na tela do código
    this.user = u; this.perfil = null; this.dep = null; this.deps = [];
    if (!u) {
      if (store.get('ufmtc_convidado', false)) this.entrarComoConvidado(); else telaLogin();
      return;
    }
    store.set('ufmtc_convidado', false);
    fechar('t-geral');
    aviso('☁️ Carregando…');
    try {
      if (u.isAnonymous) {
        // Aparelho de um menor, ligado a um perfil de dependente pelo código do responsável.
        const v = await FB.getDoc(this.ref('vinculos', u.uid));
        if (!v.exists()) {
          aviso('');
          try { await FB.deleteUser(u); } catch (e) { await FB.signOut(this.auth); }
          toast('Este aparelho foi desconectado pelo responsável. Peça um novo código para jogar.', 5000);
          return;
        }
        const pid = v.data().perfil;
        const d = await FB.getDoc(this.ref('dependentes', pid));
        if (!d.exists()) { aviso(''); await this.desconectarAparelho(true); return; }
        this.dep = { id: pid, ...d.data() };
        aviso('');
        return this.carregarPerfil(pid);
      }
      if (this.precisaVerificar) { aviso(''); telaVerificarEmail(); return; }
      const c = await FB.getDoc(this.ref('classificacao', u.uid));
      aviso('');
      if (!c.exists() || c.data().tipo !== 'adulto') { telaAdulto(); return; }
      await this.listarDependentes();
      let pid = store.get('ufmtc_perfil_' + u.uid, u.uid);
      const dep = this.deps.find(x => x.id === pid);
      if (!dep) pid = u.uid;
      this.dep = dep || null;
      return this.carregarPerfil(pid);
    } catch (e) {
      aviso(''); console.warn(e);
      toast('Não foi possível falar com o servidor agora. Tente de novo em instantes.', 4500);
      telaLogin();
    }
  },

  /* Carrega o progresso de um perfil (o do adulto ou de um dependente) e entra no jogo. */
  async carregarPerfil(pid) {
    this.perfil = pid; this.arenas = {}; this.ultimo = 0;
    aviso('☁️ Carregando seu progresso…');
    try {
      const [prog, pub] = await Promise.all([
        FB.getDoc(this.ref('progresso', pid)),
        FB.getDoc(this.ref('jogadores', pid)),
      ]);
      this.pontosNuvem = pub.exists() ? (pub.data().pontos || 0) : 0;
      if (prog.exists()) {
        S = Object.assign(ESTADO_NOVO(), prog.data().estado || {});
      } else if (!this.dep && S.nome && (!S.uid || S.uid === pid)) {
        // progresso de convidado neste aparelho: leva para a conta do adulto
      } else {
        S = ESTADO_NOVO();
        if (this.dep) S.avatar = avatarDe(this.dep.avatar);
      }
      S.uid = pid; store.set('ufmtc_estado', S);
      aviso('');
    } catch (e) {
      aviso(''); console.warn(e);
      toast('Não foi possível carregar o progresso da nuvem. Jogando com os dados deste aparelho.', 4000);
    }
    this.sujo = true;
    entrarNoJogo();
  },

  async trocarPerfil(pid) {
    if (!this.adulto || pid === this.perfil) return;
    aviso('☁️ Salvando…');
    await this.gravar(true, true);
    this.dep = this.deps.find(x => x.id === pid) || null;
    if (!this.dep) pid = this.user.uid;
    store.set('ufmtc_perfil_' + this.user.uid, pid);
    spawns.slice().forEach(removerSpawn);
    fechar('t-geral');
    await this.carregarPerfil(pid);
    toast(`Jogando como ${avatarDe(S.avatar)} ${S.nome || (this.dep ? this.dep.apelido : 'você')}`);
  },

  entrarComoConvidado(semNuvem) {
    store.set('ufmtc_convidado', true);
    fechar('t-geral');
    if (semNuvem) toast('Sem conexão com o servidor: jogando como convidado.', 3500);
    entrarNoJogo();
  },

  marcar() { this.sujo = true; },

  dadosPublicos() {
    const especies = Object.keys(S.registros || {}).length;
    const arenas = Object.values(S.arenas || {}).filter(Boolean).length;
    let pontos = Math.max(0, Math.floor(S.xpTotal || 0));
    if (pontos !== 0) pontos = Math.min(pontos, this.pontosNuvem + SALTO_MAX);
    const apelido = String(S.nome || 'Explorador(a)').trim().slice(0, 20).padEnd(2, '_');
    return { apelido, pontos, nivel: Math.max(1, S.nivel | 0), especies, arenas, atualizado: FB.serverTimestamp() };
  },

  async gravar(forcar, esperar) {
    if (!this.ok || !this.user || !this.perfil || !this.sujo || this.gravando || !S.nome) return;
    if (S.uid && S.uid !== this.perfil) return;   // nunca grava o progresso de um perfil no outro
    let falta = 6000 - (Date.now() - this.ultimo);
    if (!forcar && Date.now() - this.ultimo < SYNC_MS) return;
    if (falta > 0) { if (!esperar) return; await espera(falta); }  // respeita o intervalo mínimo das regras
    this.gravando = true; this.sujo = false;
    const pid = this.perfil;
    try {
      const estado = JSON.parse(JSON.stringify(S));
      const pub = this.dadosPublicos();
      await FB.setDoc(this.ref('progresso', pid), { estado, atualizado: FB.serverTimestamp() });
      await FB.setDoc(this.ref('jogadores', pid), pub);
      this.pontosNuvem = pub.pontos; this.ultimo = Date.now();
      if (pub.pontos < (S.xpTotal || 0)) this.sujo = true; // ainda falta subir pontos
    } catch (e) {
      console.warn('Falha ao gravar', e); this.sujo = true; this.ultimo = Date.now();
    } finally { this.gravando = false; }
  },

  /* ---------- Último conquistador das arenas (coleção "arenas") */
  docArena(d) {
    const x = d.data();
    return { ...x, quando: x.quando && x.quando.toMillis ? x.quando.toMillis() : 0 };
  },

  async carregarArenas() {
    if (!this.ok || !this.perfil) return;
    try {
      const snap = await FB.getDocs(FB.collection(this.db, 'arenas'));
      const novo = {};
      snap.docs.forEach(d => { novo[d.id] = this.docArena(d); });
      this.arenas = novo;
    } catch (e) { console.warn('Falha ao ler arenas', e); }
  },

  async lerArena(id) {
    if (!this.ok || !this.perfil) return;
    try {
      const d = await FB.getDoc(this.ref('arenas', id));
      if (d.exists()) this.arenas[id] = this.docArena(d); else delete this.arenas[id];
    } catch (e) { console.warn('Falha ao ler arena', e); }
  },

  async registrarConquista(id, parceiro) {
    if (!this.ok || !this.perfil) return false;
    const dados = {
      uid: this.perfil,
      apelido: String(S.nome || 'Explorador(a)').trim().slice(0, 20).padEnd(2, '_'),
      avatar: avatarDe(S.avatar),
      parceiro: String(parceiro.sp || '').slice(0, 20),
      nivel: Math.min(100, Math.max(1, parceiro.nivel | 0)),
      quando: FB.serverTimestamp(),
    };
    try {
      await FB.setDoc(this.ref('arenas', id), dados);
      this.arenas[id] = { ...dados, quando: Date.now() };
      return true;
    } catch (e) { console.warn('Falha ao registrar conquista', e); return false; }
  },

  /* Conquistas feitas antes do registro de conquistadores existir: registra o jogador nas arenas que ele
     já venceu e que ainda não têm ninguém registrado (nunca passa por cima de uma conquista registrada). */
  async registrarHistorico() {
    if (!this.ok || !this.perfil || !S.nome) return;
    const vencidas = LUG_OFICIAL.arenas.filter(a => S.arenas[a.id] && !this.arenas[a.id]);
    if (!vencidas.length) return;
    const melhor = S.parceiros.slice().sort((x, y) => y.nivel - x.nivel)[0];
    if (!melhor) return;
    for (const a of vencidas) {
      try {
        const d = await FB.getDoc(this.ref('arenas', a.id));   // confere de novo logo antes de gravar
        if (d.exists()) { this.arenas[a.id] = this.docArena(d); continue; }
        await this.registrarConquista(a.id, melhor);
      } catch (e) { console.warn('Falha ao registrar histórico da arena', a.id, e); }
    }
  },

  /* ---------- Classificação (faixa de idade, escolaridade, rede) */
  async lerClasse(pid) {
    const d = await FB.getDoc(this.ref('classificacao', pid));
    return d.exists() ? d.data() : null;
  },
  async salvarClasse(pid, tipo, c) {
    const dados = { tipo, faixa: c.faixa, escolaridade: c.escolaridade, rede: c.rede, atualizado: FB.serverTimestamp() };
    if (tipo === 'menor') dados.tutor = this.user.uid;
    await FB.setDoc(this.ref('classificacao', pid), dados);
  },

  /* ---------- Dependentes (menores sob responsabilidade do adulto logado) */
  async listarDependentes() {
    if (!this.adulto) { this.deps = []; return []; }
    const snap = await FB.getDocs(FB.query(FB.collection(this.db, 'dependentes'), FB.where('tutor', '==', this.user.uid)));
    this.deps = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => ((a.criado && a.criado.toMillis && a.criado.toMillis()) || 0) - ((b.criado && b.criado.toMillis && b.criado.toMillis()) || 0));
    return this.deps;
  },

  async criarDependente({ apelido, avatar, classe }) {
    if (this.deps.length >= MAX_DEPENDENTES) throw new Error(`Limite de ${MAX_DEPENDENTES} dependentes por conta.`);
    const pid = 'd_' + idAleatorio(14, 'abcdefghijklmnopqrstuvwxyz0123456789');
    await FB.setDoc(this.ref('dependentes', pid), { tutor: this.user.uid, apelido, avatar, criado: FB.serverTimestamp() });
    await this.salvarClasse(pid, 'menor', classe);
    await this.listarDependentes();
    return pid;
  },

  async editarDependente(pid, { apelido, avatar }) {
    const d = this.deps.find(x => x.id === pid); if (!d) return;
    await FB.setDoc(this.ref('dependentes', pid), { tutor: this.user.uid, apelido, avatar, criado: d.criado });
    await this.listarDependentes();
  },

  /* Apaga tudo de um perfil: aparelhos ligados, arenas, ranking, progresso, classificação. */
  async apagarDadosPerfil(pid) {
    const arenas = await FB.getDocs(FB.query(FB.collection(this.db, 'arenas'), FB.where('uid', '==', pid)));
    await Promise.all(arenas.docs.map(d => FB.deleteDoc(d.ref)));
    await FB.deleteDoc(this.ref('jogadores', pid));
    await FB.deleteDoc(this.ref('progresso', pid));
    await FB.deleteDoc(this.ref('classificacao', pid));
  },

  async excluirDependente(pid) {
    await this.desconectarAparelhos(pid);
    await this.apagarDadosPerfil(pid);
    await FB.deleteDoc(this.ref('dependentes', pid));   // por último: as regras dependem dele
    if (this.perfil === pid) {
      store.set('ufmtc_perfil_' + this.user.uid, this.user.uid);
      await this.listarDependentes();
      this.dep = null; spawns.slice().forEach(removerSpawn);
      await this.carregarPerfil(this.user.uid);
    } else await this.listarDependentes();
  },

  /* ---------- Aparelho do menor: código de acesso gerado pelo responsável */
  async gerarCodigo(pid) {
    const codigo = idAleatorio(6, 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789');
    const expira = new Date(Date.now() + 15 * 60000);
    await FB.setDoc(this.ref('codigos', codigo), { perfil: pid, tutor: this.user.uid, expira });
    return { codigo, expira };
  },

  async aparelhosDe(pid) {
    const snap = await FB.getDocs(FB.query(FB.collection(this.db, 'vinculos'), FB.where('tutor', '==', this.user.uid)));
    return snap.docs.filter(d => d.data().perfil === pid);
  },

  async desconectarAparelhos(pid) {
    const lista = await this.aparelhosDe(pid);
    await Promise.all(lista.map(d => FB.deleteDoc(d.ref)));
    return lista.length;
  },

  async entrarComCodigo(codigo) {
    codigo = String(codigo || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (codigo.length !== 6) throw new Error('O código tem 6 letras e números.');
    this.vinculando = true;
    let u = null;
    try {
      u = (await FB.signInAnonymously(this.auth)).user;
      const c = await FB.getDoc(this.ref('codigos', codigo));
      const dados = c.exists() ? c.data() : null;
      if (!dados || !dados.expira || dados.expira.toMillis() < Date.now()) throw new Error('Código inválido ou vencido. Peça um novo ao responsável.');
      await FB.setDoc(this.ref('vinculos', u.uid), { perfil: dados.perfil, tutor: dados.tutor, codigo, criado: FB.serverTimestamp() });
      try { await FB.deleteDoc(this.ref('codigos', codigo)); } catch (e) { }   // código vale uma vez só
    } catch (e) {
      if (u) { this.ignorarSaida = true; try { await FB.deleteUser(u); } catch (er) { await FB.signOut(this.auth); } }
      this.vinculando = false; this.user = null;
      throw e;
    }
    this.vinculando = false;
    return this.mudouUsuario(this.auth.currentUser);
  },

  async desconectarAparelho(silencioso) {
    const u = this.user; if (!u || !u.isAnonymous) return;
    try { await FB.deleteDoc(this.ref('vinculos', u.uid)); } catch (e) { }
    try { await FB.deleteUser(u); } catch (e) { await FB.signOut(this.auth); }
    store.del('ufmtc_estado'); store.set('ufmtc_convidado', false);
    if (!silencioso) toast('Aparelho desconectado.');
    location.reload();
  },

  /* ---------- Conta */
  async sair() {
    await this.gravar(true, true);
    try { await FB.signOut(this.auth); } catch (e) { }
    store.del('ufmtc_estado'); store.set('ufmtc_convidado', false);
    location.reload();
  },

  async excluirConta() {
    const u = this.user; if (!u || u.isAnonymous) return;
    try {
      await this.listarDependentes();
      for (const d of this.deps) {
        await this.desconectarAparelhos(d.id);
        await this.apagarDadosPerfil(d.id);
        await FB.deleteDoc(this.ref('dependentes', d.id));
      }
      await this.apagarDadosPerfil(u.uid);
      await FB.deleteUser(u);
      store.del('ufmtc_estado'); store.del('ufmtc_perfil_' + u.uid); store.set('ufmtc_convidado', false);
      location.reload();
    } catch (e) {
      if (e.code === 'auth/requires-recent-login') toast('Por segurança, saia e entre de novo na conta antes de excluí-la. Seus dados de jogo já foram apagados.', 6000);
      else toast('Não foi possível excluir agora: ' + (e.code || e.message), 4500);
    }
  },

  async ranking() {
    await this.gravar(true);
    const col = FB.collection(this.db, 'jogadores');
    const snap = await FB.getDocs(FB.query(col, FB.orderBy('pontos', 'desc'), FB.limit(20)));
    const lista = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
    let minhaPos = null;
    const eu = lista.findIndex(x => x.uid === this.perfil);
    if (eu >= 0) minhaPos = eu + 1;
    else {
      const c = await FB.getCount(FB.query(col, FB.where('pontos', '>', this.pontosNuvem)));
      minhaPos = c.data().count + 1;
    }
    return { lista, minhaPos };
  },
};

/* ---------- Mensagens de erro do login */
function erroLogin(e) {
  const m = {
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/wrong-password': 'E-mail ou senha incorretos.',
    'auth/user-not-found': 'Não há conta com este e-mail.',
    'auth/invalid-email': 'E-mail inválido.',
    'auth/email-already-in-use': 'Este e-mail já tem conta. Use "Entrar".',
    'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
    'auth/popup-blocked': 'O navegador bloqueou a janela do Google. Permita pop-ups e tente de novo.',
    'auth/popup-closed-by-user': 'Janela do Google fechada antes de concluir.',
    'auth/unauthorized-domain': 'Este endereço ainda não está autorizado no Firebase.',
    'auth/network-request-failed': 'Sem conexão com o servidor.',
    'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos.',
  };
  return m[e.code] || ('Erro: ' + (e.code || e.message));
}

/* ---------- Formulário de classificação */
function htmlClasse(tipo, atual) {
  const c = CLASSE[tipo]; atual = atual || {};
  return Object.keys(ROTULO_CLASSE).map(k => `<h3>${ROTULO_CLASSE[k]}</h3><select id="cl-${k}">
    <option value="">Escolha…</option>${[...c[k], NAO_DIZER].map(o => `<option ${atual[k] === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`).join('');
}
function lerClasse(p) {
  const r = {};
  for (const k of Object.keys(ROTULO_CLASSE)) {
    const v = p.querySelector('#cl-' + k).value;
    if (!v) { toast(`Escolha uma opção em "${ROTULO_CLASSE[k]}" (pode ser "${NAO_DIZER}").`); return null; }
    r[k] = v;
  }
  return r;
}

/* ---------- Tela de login */
function telaLogin() {
  const aceitou = store.get('ufmtc_aceite', false);
  const p = abrir('t-geral', `
    <div style="text-align:center"><div style="font-size:54px">🌿🔬</div><h2>UFMT Ciência</h2>
    <div class="mini">Explore o campus, registre a fauna de Mato Grosso e vença os desafios científicos.</div></div>
    <label class="mini" style="display:flex;gap:8px;align-items:flex-start;margin:14px 0 4px">
      <input type="checkbox" id="lg-aceite" style="width:auto;margin-top:2px" ${aceitou ? 'checked' : ''}>
      <span>Tenho <b>18 anos ou mais</b> e concordo que o jogo guarde meu <b>e-mail</b>, <b>apelido</b>, <b>progresso</b> e as informações de faixa de idade e escolaridade (só para estatísticas). Só o apelido, o avatar e a pontuação ficam visíveis para outros jogadores. Minha localização <b>não</b> é enviada. <a href="#" id="lg-priv">Saiba mais</a></span>
    </label>
    <div id="lg-privtxt" class="explica" style="display:none;font-size:12px">O UFMT Ciência é um projeto educacional da UFMT. As contas são para maiores de 18 anos. Menores de idade jogam em um <b>perfil de dependente</b> criado por um responsável dentro da conta dele, sem e-mail nem nome real. Guardamos apenas o necessário para salvar o progresso, montar o ranking e produzir estatísticas agregadas (faixa de idade, escolaridade e rede de ensino), em servidores do Google Firebase em São Paulo. A localização do GPS é usada só no seu aparelho. Você pode excluir sua conta, seus dependentes e todos os dados a qualquer momento em Menu → Conta e privacidade.</div>
    <button class="bt" id="lg-google" style="background:#fff;color:#1c2a24;border:2px solid #d8cfbd">Entrar com Google</button>
    <div class="mini" style="text-align:center;margin:12px 0 0">ou com e-mail</div>
    <input id="lg-email" type="email" placeholder="seu@email.com" autocomplete="email">
    <input id="lg-senha" type="password" placeholder="Senha (mín. 6 caracteres)" autocomplete="current-password">
    <div class="linha"><button class="bt" id="lg-entrar">Entrar</button><button class="bt sec" id="lg-criar">Criar conta</button></div>
    <div style="text-align:center;margin-top:8px"><a href="#" id="lg-esqueci" class="mini">Esqueci minha senha</a></div>
    <div id="lg-msg" class="mini" style="text-align:center;color:#c0392b;min-height:18px;margin-top:6px"></div>
    <button class="bt sec" id="lg-menor" style="margin-top:4px">🔑 Sou menor de idade: entrar com código do responsável</button>
    <button class="bt sec" id="lg-conv" style="margin-top:4px">Jogar como convidado <span class="mini">(sem ranking, salvo só neste aparelho)</span></button>`, true);
  $('#t-geral').dataset.trava = '1';
  const msg = t => { p.querySelector('#lg-msg').textContent = t || ''; };
  const aceite = () => { const ok = p.querySelector('#lg-aceite').checked; if (!ok) msg('Marque a caixa: as contas são para maiores de 18 anos.'); else store.set('ufmtc_aceite', true); return ok; };
  const ocupado = b => p.querySelectorAll('button').forEach(x => x.disabled = b);
  p.querySelector('#lg-priv').onclick = e => { e.preventDefault(); const t = p.querySelector('#lg-privtxt'); t.style.display = t.style.display === 'none' ? 'block' : 'none'; };
  p.querySelector('#lg-google').onclick = async () => {
    if (!aceite()) return; msg(''); ocupado(true);
    try { await FB.signInWithPopup(Nuvem.auth, new FB.GoogleAuthProvider()); }
    catch (e) { msg(erroLogin(e)); ocupado(false); }
  };
  const comEmail = async criar => {
    if (!aceite()) return;
    const email = p.querySelector('#lg-email').value.trim(), senha = p.querySelector('#lg-senha').value;
    if (!email || !senha) return msg('Preencha e-mail e senha.');
    msg(''); ocupado(true);
    try {
      if (criar) {
        const cred = await FB.createUserWithEmailAndPassword(Nuvem.auth, email, senha);
        try { await FB.sendEmailVerification(cred.user); } catch (e) { console.warn(e); }
      } else await FB.signInWithEmailAndPassword(Nuvem.auth, email, senha);
    } catch (e) { msg(erroLogin(e)); ocupado(false); }
  };
  p.querySelector('#lg-entrar').onclick = () => comEmail(false);
  p.querySelector('#lg-criar').onclick = () => comEmail(true);
  p.querySelector('#lg-esqueci').onclick = async e => {
    e.preventDefault();
    const email = p.querySelector('#lg-email').value.trim();
    if (!email) return msg('Digite seu e-mail acima e toque de novo em "Esqueci minha senha".');
    try { await FB.sendPasswordResetEmail(Nuvem.auth, email); p.querySelector('#lg-msg').style.color = '#1f6f4a'; msg('Enviamos um link de redefinição para ' + email + '.'); }
    catch (er) { msg(erroLogin(er)); }
  };
  p.querySelector('#lg-menor').onclick = telaCodigo;
  p.querySelector('#lg-conv').onclick = () => Nuvem.entrarComoConvidado();
}

/* ---------- Menor: entrar com o código gerado pelo responsável */
function telaCodigo() {
  const p = abrir('t-geral', `
    <h2>🔑 Entrar com código</h2>
    <div class="explica">Peça ao seu responsável para abrir o jogo no celular dele e ir em <b>Menu → Perfis e dependentes → seu perfil → Gerar código</b>. O código vale por 15 minutos e só uma vez.</div>
    <input id="cd-cod" maxlength="7" placeholder="Ex.: K7Q2MX" autocapitalize="characters" autocomplete="off" style="text-align:center;font-size:24px;letter-spacing:6px;font-weight:900">
    <div id="cd-msg" class="mini" style="text-align:center;color:#c0392b;min-height:18px;margin-top:6px"></div>
    <button class="bt" id="cd-ok">Entrar</button>
    <button class="bt sec" id="cd-volta">Voltar</button>`, true);
  $('#t-geral').dataset.trava = '1';
  const b = p.querySelector('#cd-ok');
  p.querySelector('#cd-volta').onclick = telaLogin;
  b.onclick = async () => {
    b.disabled = true; p.querySelector('#cd-msg').textContent = '';
    try { await Nuvem.entrarComCodigo(p.querySelector('#cd-cod').value); }
    catch (e) {
      const t = e.code === 'auth/admin-restricted-operation' || e.code === 'auth/operation-not-allowed'
        ? 'O acesso por código ainda não está ativado no servidor.' : (e.message || 'Não foi possível entrar.');
      const m = p.querySelector('#cd-msg'); if (m) m.textContent = t; b.disabled = false;
    }
  };
}

/* ---------- Conta por e-mail: confirmar o endereço antes de jogar */
function telaVerificarEmail() {
  const u = Nuvem.user;
  const p = abrir('t-geral', `
    <h2>📧 Confirme seu e-mail</h2>
    <div class="explica">Enviamos um link de confirmação para <b>${esc(u.email || '')}</b>. Abra o e-mail (veja também a caixa de spam), toque no link e depois volte aqui.</div>
    <div id="ve-msg" class="mini" style="text-align:center;min-height:18px;margin-top:6px"></div>
    <button class="bt" id="ve-ok">Já confirmei</button>
    <button class="bt sec" id="ve-reenviar">Reenviar e-mail</button>
    <button class="bt sec" id="ve-sair">Sair</button>`, true);
  $('#t-geral').dataset.trava = '1';
  const msg = (t, ok) => { const m = p.querySelector('#ve-msg'); m.textContent = t; m.style.color = ok ? '#1f6f4a' : '#c0392b'; };
  p.querySelector('#ve-ok').onclick = async () => {
    try {
      await FB.reload(u);
      if (!u.emailVerified) return msg('Ainda não recebemos a confirmação. Toque no link do e-mail e tente de novo.');
      await u.getIdToken(true);   // atualiza a credencial para o servidor saber que o e-mail foi confirmado
      Nuvem.mudouUsuario(u);
    } catch (e) { msg(erroLogin(e)); }
  };
  p.querySelector('#ve-reenviar').onclick = async () => {
    try { await FB.sendEmailVerification(u); msg('E-mail reenviado.', true); } catch (e) { msg(erroLogin(e)); }
  };
  p.querySelector('#ve-sair').onclick = () => Nuvem.sair();
}

/* ---------- Primeira entrada de um adulto: declaração de idade e classificação */
async function telaAdulto() {
  let atual = null; try { atual = await Nuvem.lerClasse(Nuvem.user.uid); } catch (e) { }
  const p = abrir('t-geral', `
    <h2>👋 Antes de começar</h2>
    <div class="mini">Estas respostas são usadas só em estatísticas do projeto e não aparecem para outros jogadores.</div>
    <label class="mini" style="display:flex;gap:8px;align-items:flex-start;margin:14px 0 4px">
      <input type="checkbox" id="ad-18" style="width:auto;margin-top:2px"><span>Declaro que tenho <b>18 anos ou mais</b>.</span></label>
    ${htmlClasse('adulto', atual)}
    <button class="bt" id="ad-ok">Continuar</button>
    <button class="bt sec" id="ad-menor">Tenho menos de 18 anos</button>`, true);
  $('#t-geral').dataset.trava = '1';
  p.querySelector('#ad-ok').onclick = async ev => {
    if (!p.querySelector('#ad-18').checked) return toast('Marque a declaração de idade para continuar.');
    const c = lerClasse(p); if (!c) return;
    ev.target.disabled = true;
    try { await Nuvem.salvarClasse(Nuvem.user.uid, 'adulto', c); fechar('t-geral'); Nuvem.mudouUsuario(Nuvem.user); }
    catch (e) { console.warn(e); toast('Não foi possível salvar agora. Tente de novo.'); ev.target.disabled = false; }
  };
  p.querySelector('#ad-menor').onclick = () => {
    const q = abrir('t-geral', `
      <h2>🧒 Menores de 18 anos</h2>
      <div class="explica">As contas são só para adultos. Peça a um <b>pai, mãe ou responsável</b> para entrar no jogo com a conta dele e criar um <b>perfil de dependente</b> para você em Menu → Perfis e dependentes. Depois ele gera um código para você jogar no seu celular.</div>
      <button class="bt" id="mn-sair">Entendi, sair desta conta</button>`, true);
    $('#t-geral').dataset.trava = '1';
    q.querySelector('#mn-sair').onclick = () => Nuvem.sair();
  };
}

/* ---------- Perfis e dependentes (só para adultos) */
async function abrirPerfis() {
  const p = abrir('t-geral', `<button class="fechar" id="bt-x">✕</button><h2>👨‍👧 Perfis e dependentes</h2><div id="pf-lista">Carregando…</div>`);
  p.querySelector('#bt-x').onclick = () => fechar('t-geral');
  try { await Nuvem.listarDependentes(); } catch (e) { console.warn(e); }
  const eu = Nuvem.user.uid;
  const ativo = id => id === Nuvem.perfil ? ' <span class="etq" style="background:#2e9e5b">jogando agora</span>' : '';
  const meuAv = Nuvem.perfil === eu ? avatarDe(S.avatar) : '🧑';
  p.querySelector('#pf-lista').innerHTML = `
    <div class="item-lista"><div class="bicho">${meuAv}</div><div class="f"><b>Meu perfil</b>${ativo(eu)}<br><span class="mini">${esc(Nuvem.user.email || '')}</span></div></div>
    <div class="linha">${Nuvem.perfil !== eu ? '<button class="bt" data-jogar="' + eu + '">Jogar com meu perfil</button>' : ''}<button class="bt sec" id="pf-eu">Minhas informações</button></div>
    <h3>Dependentes (menores de 18)</h3>
    ${Nuvem.deps.length ? Nuvem.deps.map(d => `
      <div class="item-lista"><div class="bicho">${esc(avatarDe(d.avatar))}</div><div class="f"><b>${esc(d.apelido)}</b>${ativo(d.id)}</div>
        <button class="bt sec" data-dep="${d.id}" style="flex:0 0 auto;width:auto;margin:0;padding:8px 12px">Abrir</button></div>`).join('')
      : '<div class="mini">Nenhum dependente ainda.</div>'}
    ${Nuvem.deps.length < MAX_DEPENDENTES ? '<button class="bt" id="pf-novo">➕ Adicionar dependente</button>' : ''}
    <div class="mini" style="margin-top:10px">Dependentes não têm e-mail nem login: jogam neste aparelho (trocando de perfil aqui) ou no próprio celular com um código que você gera.</div>`;
  p.querySelectorAll('[data-jogar]').forEach(b => b.onclick = () => Nuvem.trocarPerfil(b.dataset.jogar));
  p.querySelectorAll('[data-dep]').forEach(b => b.onclick = () => abrirDependente(b.dataset.dep));
  p.querySelector('#pf-eu').onclick = () => editarMinhaClasse();
  const n = p.querySelector('#pf-novo'); if (n) n.onclick = () => formDependente();
}

async function editarMinhaClasse() {
  const p = abrir('t-geral', `<button class="fechar" id="bt-x">✕</button><h2>🧑 Minhas informações</h2><div id="mc">Carregando…</div>`);
  p.querySelector('#bt-x').onclick = abrirPerfis;
  let atual = null; try { atual = await Nuvem.lerClasse(Nuvem.user.uid); } catch (e) { }
  p.querySelector('#mc').innerHTML = `<div class="mini">Usadas só em estatísticas; não aparecem para outros jogadores.</div>${htmlClasse('adulto', atual)}<button class="bt" id="mc-ok">Salvar</button>`;
  p.querySelector('#mc-ok').onclick = async () => {
    const c = lerClasse(p); if (!c) return;
    try { await Nuvem.salvarClasse(Nuvem.user.uid, 'adulto', c); toast('Salvo!'); abrirPerfis(); } catch (e) { toast('Não foi possível salvar agora.'); }
  };
}

async function formDependente(pid) {
  const d = pid ? Nuvem.deps.find(x => x.id === pid) : null;
  let atual = null; if (d) { try { atual = await Nuvem.lerClasse(pid); } catch (e) { } }
  let av = avatarDe(d ? d.avatar : AVATARES[4]);
  const p = abrir('t-geral', `
    <button class="fechar" id="bt-x">✕</button>
    <h2>${d ? '✏️ Editar dependente' : '➕ Novo dependente'}</h2>
    <h3>Apelido no jogo</h3><input id="dp-nome" maxlength="20" placeholder="Não use o nome completo" value="${esc(d ? d.apelido : '')}">
    <h3>Avatar</h3>${gradeAvatares(av)}
    ${htmlClasse('menor', atual)}
    ${d ? '' : `<label class="mini" style="display:flex;gap:8px;align-items:flex-start;margin:14px 0 4px">
      <input type="checkbox" id="dp-ok18" style="width:auto;margin-top:2px"><span>Sou <b>pai, mãe ou responsável legal</b> por este menor e autorizo o jogo a guardar o apelido, o progresso e as informações acima, nas condições descritas em "Saiba mais" na tela de entrada.</span></label>`}
    <button class="bt" id="dp-salvar">Salvar</button>`);
  p.querySelector('#bt-x').onclick = () => d ? abrirDependente(pid) : abrirPerfis();
  ligarGradeAvatares(p, x => { av = x; });
  p.querySelector('#dp-salvar').onclick = async ev => {
    const apelido = p.querySelector('#dp-nome').value.trim().slice(0, 20);
    if (apelido.length < 2) return toast('O apelido precisa ter pelo menos 2 letras.');
    if (!d && !p.querySelector('#dp-ok18').checked) return toast('Confirme que você é o responsável legal.');
    const c = lerClasse(p); if (!c) return;
    ev.target.disabled = true;
    try {
      if (d) { await Nuvem.editarDependente(pid, { apelido, avatar: av }); await Nuvem.salvarClasse(pid, 'menor', c); toast('Salvo!'); abrirDependente(pid); }
      else { const novo = await Nuvem.criarDependente({ apelido, avatar: av, classe: c }); toast(`${av} ${apelido} adicionado(a)!`); abrirDependente(novo); }
    } catch (e) { console.warn(e); toast(e.message && !e.code ? e.message : 'Não foi possível salvar agora.'); ev.target.disabled = false; }
  };
}

async function abrirDependente(pid) {
  const d = Nuvem.deps.find(x => x.id === pid); if (!d) return abrirPerfis();
  const p = abrir('t-geral', `
    <button class="fechar" id="bt-x">✕</button>
    <h2>${esc(avatarDe(d.avatar))} ${esc(d.apelido)}</h2><div class="mini">Perfil de dependente</div>
    ${Nuvem.perfil !== pid ? '<button class="bt" id="dp-jogar">🎮 Jogar com este perfil neste aparelho</button>' : '<div class="explica">Este perfil está jogando agora neste aparelho.</div>'}
    <h3>Celular do menor</h3>
    <div id="dp-cod"><button class="bt sec" id="dp-gerar">🔑 Gerar código de acesso</button></div>
    <div class="mini" id="dp-ap">Verificando aparelhos conectados…</div>
    <h3>Outras opções</h3>
    <button class="bt sec" id="dp-editar">✏️ Editar apelido, avatar e informações</button>
    <button class="bt sec" id="dp-excluir" style="color:#c0392b">Excluir este perfil e todos os dados dele</button>`);
  p.querySelector('#bt-x').onclick = abrirPerfis;
  const j = p.querySelector('#dp-jogar'); if (j) j.onclick = () => Nuvem.trocarPerfil(pid);
  p.querySelector('#dp-editar').onclick = () => formDependente(pid);
  const mostrarAparelhos = async () => {
    try {
      const n = (await Nuvem.aparelhosDe(pid)).length;
      const ap = p.querySelector('#dp-ap'); if (!ap) return;
      ap.innerHTML = n ? `${n} aparelho${n > 1 ? 's' : ''} conectado${n > 1 ? 's' : ''}. <a href="#" id="dp-desc">Desconectar todos</a>` : 'Nenhum aparelho conectado.';
      const dc = p.querySelector('#dp-desc');
      if (dc) dc.onclick = async e => { e.preventDefault(); await Nuvem.desconectarAparelhos(pid); toast('Aparelhos desconectados.'); mostrarAparelhos(); };
    } catch (e) { const ap = p.querySelector('#dp-ap'); if (ap) ap.textContent = ''; }
  };
  mostrarAparelhos();
  p.querySelector('#dp-gerar').onclick = async ev => {
    ev.target.disabled = true;
    try {
      const { codigo, expira } = await Nuvem.gerarCodigo(pid);
      p.querySelector('#dp-cod').innerHTML = `<div class="explica" style="text-align:center">No celular do menor, abra o jogo, toque em <b>"Sou menor de idade: entrar com código do responsável"</b> e digite:
        <div style="font-size:34px;font-weight:900;letter-spacing:8px;margin:8px 0">${codigo}</div>
        <span class="mini">Vale uma vez, até ${expira.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.</span></div>`;
      setTimeout(mostrarAparelhos, 60000);
    } catch (e) { console.warn(e); toast('Não foi possível gerar o código agora.'); ev.target.disabled = false; }
  };
  p.querySelector('#dp-excluir').onclick = async ev => {
    if (ev.target.dataset.c !== '1') { ev.target.dataset.c = '1'; ev.target.textContent = `Toque de novo: apaga ${d.apelido}, o progresso e o ranking para sempre`; ev.target.style.background = '#fde0dc'; return; }
    ev.target.disabled = true;
    try { await Nuvem.excluirDependente(pid); toast('Perfil excluído.'); abrirPerfis(); }
    catch (e) { console.warn(e); toast('Não foi possível excluir agora.'); ev.target.disabled = false; }
  };
}

/* ---------- Conta e privacidade (submenu discreto) */
function abrirPrivacidade() {
  const anon = Nuvem.anonimo;
  const p = abrir('t-geral', `
    <button class="fechar" id="bt-x">✕</button>
    <h2>🔒 Conta e privacidade</h2>
    ${anon ? `<div class="explica">Este aparelho joga com um <b>perfil de dependente</b> criado por um responsável. O responsável pode desconectar este aparelho ou excluir o perfil a qualquer momento.</div>
      <button class="bt sec" id="pv-desc" style="color:#c0392b">Desconectar este aparelho</button>`
    : `<div class="explica">Guardamos seu e-mail, apelido, progresso e as informações de faixa de idade e escolaridade. Ao excluir a conta, apagamos <b>tudo</b>: seu perfil, os perfis dos seus dependentes, o progresso, o ranking e as arenas em que vocês aparecem. Não dá para desfazer.</div>
      <h3>Excluir minha conta e meus dados</h3>
      <div class="mini">Para confirmar, digite <b>EXCLUIR</b>:</div>
      <input id="pv-conf" autocomplete="off" placeholder="EXCLUIR">
      <button class="bt" id="pv-excluir" style="background:#c0392b">Excluir minha conta e meus dados</button>`}`);
  p.querySelector('#bt-x').onclick = () => fechar('t-geral');
  const dsc = p.querySelector('#pv-desc'); if (dsc) dsc.onclick = () => Nuvem.desconectarAparelho();
  const ex = p.querySelector('#pv-excluir');
  if (ex) ex.onclick = async () => {
    if (p.querySelector('#pv-conf').value.trim().toUpperCase() !== 'EXCLUIR') return toast('Digite EXCLUIR para confirmar.');
    ex.disabled = true; ex.textContent = 'Excluindo…';
    await Nuvem.excluirConta();
    ex.disabled = false; ex.textContent = 'Excluir minha conta e meus dados';
  };
}

/* ---------- Painel do professor (estatísticas agregadas, só administradores) */
async function abrirPainel() {
  if (!ehAdmin()) return;
  const p = abrir('t-geral', `<button class="fechar" id="bt-x">✕</button><h2>📊 Painel do professor</h2><div id="pn">Carregando…</div>`);
  p.querySelector('#bt-x').onclick = () => fechar('t-geral');
  try {
    const [cl, jg] = await Promise.all([
      FB.getDocs(FB.collection(Nuvem.db, 'classificacao')),
      FB.getDocs(FB.collection(Nuvem.db, 'jogadores')),
    ]);
    const classe = {}; cl.docs.forEach(d => { classe[d.id] = d.data(); });
    const jog = {}; jg.docs.forEach(d => { jog[d.id] = d.data(); });
    const ids = [...new Set([...Object.keys(classe), ...Object.keys(jog)])];
    const ms = x => x && x.toMillis ? x.toMillis() : 0;
    const agora = Date.now(), dia = 864e5;
    const ativos = n => Object.values(jog).filter(j => agora - ms(j.atualizado) < n * dia).length;
    const tipo = id => (classe[id] && classe[id].tipo) || 'sem classificação';
    const contar = (lista, campo) => { const c = {}; lista.forEach(id => { const v = (classe[id] && classe[id][campo]) || '—'; c[v] = (c[v] || 0) + 1; }); return c; };
    const barras = (titulo, cont, ordem) => {
      const total = Object.values(cont).reduce((a, b) => a + b, 0) || 1;
      const chaves = [...(ordem || []), NAO_DIZER, '—'].filter(k => cont[k]).concat(Object.keys(cont).filter(k => !(ordem || []).includes(k) && k !== NAO_DIZER && k !== '—'));
      return `<h3>${titulo}</h3>${chaves.map(k => `<div class="pn-l"><span>${esc(k)}</span><i style="width:${cont[k] / total * 100}%"></i><b>${cont[k]}</b></div>`).join('')}`;
    };
    const bloco = t => {
      const lista = ids.filter(id => tipo(id) === t); if (!lista.length) return '';
      return `<h2 style="margin-top:16px">${t === 'adulto' ? '🧑 Adultos' : '🧒 Menores (dependentes)'} · ${lista.length}</h2>`
        + Object.keys(ROTULO_CLASSE).map(k => barras(ROTULO_CLASSE[k], contar(lista, k), CLASSE[t][k])).join('');
    };
    const semClasse = ids.filter(id => tipo(id) === 'sem classificação').length;
    const media = campo => { const v = Object.values(jog).map(j => j[campo] || 0); return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : '0'; };
    p.querySelector('#pn').innerHTML = `
      <div class="pn-num"><div><b>${ids.length}</b>perfis</div><div><b>${ativos(1)}</b>ativos 24 h</div><div><b>${ativos(7)}</b>ativos 7 dias</div><div><b>${ativos(30)}</b>ativos 30 dias</div></div>
      <div class="mini">Médias por perfil: nível ${media('nivel')} · ${media('especies')} espécies · ${media('arenas')} arenas.${semClasse ? ` ${semClasse} perfil(is) ainda sem classificação (contas antigas que não entraram de novo).` : ''}</div>
      ${bloco('adulto')}${bloco('menor')}
      <h3>Exportar</h3><div class="mini">Planilha (CSV) sem e-mails nem nomes: um perfil por linha, com código interno anônimo.</div>
      <button class="bt sec" id="pn-csv">📋 Copiar CSV</button>`;
    p.querySelector('#pn-csv').onclick = async () => {
      const cab = 'perfil,tipo,faixa,escolaridade,rede,nivel,pontos,especies,arenas,ultima_atividade';
      const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const linhas = ids.map((id, i) => { const c = classe[id] || {}, j = jog[id] || {}; const t = ms(j.atualizado);
        return ['P' + String(i + 1).padStart(4, '0'), tipo(id), c.faixa, c.escolaridade, c.rede, j.nivel, j.pontos, j.especies, j.arenas, t ? new Date(t).toISOString() : ''].map(q).join(','); });
      const txt = [cab, ...linhas].join('\n');
      try { await navigator.clipboard.writeText(txt); toast('CSV copiado! Cole numa planilha.'); }
      catch (e) { const ta = document.createElement('textarea'); ta.value = txt; p.appendChild(ta); ta.select(); toast('Selecionei o texto: copie com Ctrl+C.'); }
    };
  } catch (e) {
    console.warn(e);
    p.querySelector('#pn').innerHTML = '<div class="explica">Não foi possível carregar o painel. Confira a conexão (e se as regras novas do servidor já foram publicadas).</div>';
  }
}

/* ---------- Tela do ranking */
async function abrirRanking() {
  if (!Nuvem.user) {
    const p = abrir('t-geral', `<button class="fechar" id="bt-x">✕</button><h2>🏆 Ranking</h2>
      <div class="explica">Você está jogando como convidado. Crie uma conta (é grátis) para salvar seu progresso na nuvem e aparecer no ranking.</div>
      ${Nuvem.ok ? '<button class="bt" id="bt-conta">Entrar ou criar conta</button>' : '<div class="mini" style="margin-top:8px">Servidor indisponível neste endereço.</div>'}`);
    p.querySelector('#bt-x').onclick = () => fechar('t-geral');
    const b = p.querySelector('#bt-conta'); if (b) b.onclick = () => { store.set('ufmtc_convidado', false); telaLogin(); };
    return;
  }
  const p = abrir('t-geral', `<button class="fechar" id="bt-x">✕</button><h2>🏆 Ranking</h2><div class="mini">Os 20 melhores exploradores do campus</div><div id="rk" style="margin-top:10px">Carregando…</div>`);
  p.querySelector('#bt-x').onclick = () => fechar('t-geral');
  try {
    const { lista, minhaPos } = await Nuvem.ranking();
    const med = i => ['🥇', '🥈', '🥉'][i] || `<b style="display:inline-block;width:26px;text-align:center">${i + 1}º</b>`;
    p.querySelector('#rk').innerHTML = (lista.length ? lista.map((j, i) => `
      <div class="item-lista" style="${j.uid === Nuvem.perfil ? 'outline:3px solid #2e9e5b' : ''}">
        <div style="font-size:24px;width:34px;text-align:center">${med(i)}</div>
        <div class="f"><b>${esc(j.apelido)}</b>${j.uid === Nuvem.perfil ? ' (você)' : ''}<br><span class="mini">nível ${j.nivel} · ${j.especies} espécies · ${j.arenas} arenas</span></div>
        <div style="font-weight:900">${j.pontos.toLocaleString('pt-BR')}</div></div>`).join('') : '<div class="mini">Ninguém no ranking ainda. Seja o primeiro!</div>')
      + `<div class="explica" style="margin-top:10px">Sua posição: <b>${minhaPos}º</b> com <b>${Nuvem.pontosNuvem.toLocaleString('pt-BR')}</b> pontos. Os pontos são a soma de todo o XP que você já ganhou.</div>`;
  } catch (e) {
    console.warn(e);
    p.querySelector('#rk').innerHTML = '<div class="explica">Não foi possível carregar o ranking agora. Verifique a conexão.</div>';
  }
}
