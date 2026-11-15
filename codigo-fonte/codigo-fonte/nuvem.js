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

const Nuvem = {
  ok: false, auth: null, db: null, user: null,
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

  async mudouUsuario(u) {
    this.user = u;
    if (u) {
      store.set('ufmtc_convidado', false);
      fechar('t-geral');
      aviso('☁️ Carregando seu progresso…');
      try {
        const [prog, perfil] = await Promise.all([
          FB.getDoc(FB.doc(this.db, 'progresso', u.uid)),
          FB.getDoc(FB.doc(this.db, 'jogadores', u.uid)),
        ]);
        this.pontosNuvem = perfil.exists() ? (perfil.data().pontos || 0) : 0;
        if (prog.exists()) {
          S = Object.assign(ESTADO_NOVO(), prog.data().estado || {});
        } else if (S.nome && (!S.uid || S.uid === u.uid)) {
          // progresso de convidado neste aparelho: leva para a conta
        } else {
          S = ESTADO_NOVO();
        }
        S.uid = u.uid; store.set('ufmtc_estado', S);
        aviso('');
      } catch (e) {
        aviso(''); console.warn(e);
        toast('Não foi possível carregar o progresso da nuvem. Jogando com os dados deste aparelho.', 4000);
      }
      this.sujo = true;
      entrarNoJogo();
    } else if (store.get('ufmtc_convidado', false)) {
      this.entrarComoConvidado();
    } else {
      telaLogin();
    }
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

  async gravar(forcar) {
    if (!this.ok || !this.user || !this.sujo || this.gravando || !S.nome) return;
    const agora = Date.now();
    if (!forcar && agora - this.ultimo < SYNC_MS) return;
    if (agora - this.ultimo < 6000) return; // respeita o intervalo mínimo das regras
    this.gravando = true; this.sujo = false;
    const uidAtual = this.user.uid;
    try {
      const estado = JSON.parse(JSON.stringify(S));
      const pub = this.dadosPublicos();
      await FB.setDoc(FB.doc(this.db, 'progresso', uidAtual), { estado, atualizado: FB.serverTimestamp() });
      await FB.setDoc(FB.doc(this.db, 'jogadores', uidAtual), pub);
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
    if (!this.ok || !this.user) return;
    try {
      const snap = await FB.getDocs(FB.collection(this.db, 'arenas'));
      const novo = {};
      snap.docs.forEach(d => { novo[d.id] = this.docArena(d); });
      this.arenas = novo;
    } catch (e) { console.warn('Falha ao ler arenas', e); }
  },

  async lerArena(id) {
    if (!this.ok || !this.user) return;
    try {
      const d = await FB.getDoc(FB.doc(this.db, 'arenas', id));
      if (d.exists()) this.arenas[id] = this.docArena(d); else delete this.arenas[id];
    } catch (e) { console.warn('Falha ao ler arena', e); }
  },

  async registrarConquista(id, parceiro) {
    if (!this.ok || !this.user) return false;
    const dados = {
      uid: this.user.uid,
      apelido: String(S.nome || 'Explorador(a)').trim().slice(0, 20).padEnd(2, '_'),
      avatar: avatarDe(S.avatar),
      parceiro: String(parceiro.sp || '').slice(0, 20),
      nivel: Math.min(100, Math.max(1, parceiro.nivel | 0)),
      quando: FB.serverTimestamp(),
    };
    try {
      await FB.setDoc(FB.doc(this.db, 'arenas', id), dados);
      this.arenas[id] = { ...dados, quando: Date.now() };
      return true;
    } catch (e) { console.warn('Falha ao registrar conquista', e); return false; }
  },

  async sair() {
    await this.gravar(true);
    try { await FB.signOut(this.auth); } catch (e) { }
    store.del('ufmtc_estado'); store.set('ufmtc_convidado', false);
    location.reload();
  },

  async excluirConta() {
    const u = this.user; if (!u) return;
    try {
      await FB.deleteDoc(FB.doc(this.db, 'jogadores', u.uid));
      await FB.deleteDoc(FB.doc(this.db, 'progresso', u.uid));
      // tira o jogador das arenas em que ele aparece como último conquistador
      try {
        const minhas = await FB.getDocs(FB.query(FB.collection(this.db, 'arenas'), FB.where('uid', '==', u.uid)));
        await Promise.all(minhas.docs.map(d => FB.deleteDoc(d.ref)));
      } catch (e) { console.warn('Falha ao limpar arenas', e); }
      await FB.deleteUser(u);
      store.del('ufmtc_estado'); store.set('ufmtc_convidado', false);
      location.reload();
    } catch (e) {
      if (e.code === 'auth/requires-recent-login') toast('Por segurança, saia e entre de novo na conta antes de excluí-la.', 4500);
      else toast('Não foi possível excluir agora: ' + (e.code || e.message), 4500);
    }
  },

  async ranking() {
    await this.gravar(true);
    const col = FB.collection(this.db, 'jogadores');
    const snap = await FB.getDocs(FB.query(col, FB.orderBy('pontos', 'desc'), FB.limit(20)));
    const lista = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
    let minhaPos = null;
    const eu = lista.findIndex(x => x.uid === this.user.uid);
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

/* ---------- Tela de login */
function telaLogin() {
  const aceitou = store.get('ufmtc_aceite', false);
  const p = abrir('t-geral', `
    <div style="text-align:center"><div style="font-size:54px">🌿🔬</div><h2>UFMT Ciência</h2>
    <div class="mini">Explore o campus, registre a fauna de Mato Grosso e vença os desafios científicos.</div></div>
    <label class="mini" style="display:flex;gap:8px;align-items:flex-start;margin:14px 0 4px">
      <input type="checkbox" id="lg-aceite" style="width:auto;margin-top:2px" ${aceitou ? 'checked' : ''}>
      <span>Concordo que o jogo guarde meu <b>e-mail</b>, <b>apelido</b> e <b>progresso</b>. Só o apelido, o avatar e a pontuação ficam visíveis para outros jogadores (no ranking e nas arenas). Minha localização <b>não</b> é enviada. <a href="#" id="lg-priv">Saiba mais</a></span>
    </label>
    <div id="lg-privtxt" class="explica" style="display:none;font-size:12px">O UFMT Ciência é um projeto educacional da UFMT. Guardamos apenas o necessário para salvar seu progresso e montar o ranking (e-mail, apelido, pontos, nível e conquistas), em servidores do Google Firebase em São Paulo. A localização do GPS é usada só no seu aparelho. Você pode excluir sua conta e todos os seus dados a qualquer momento no Menu. Menores de idade devem jogar com autorização dos responsáveis.</div>
    <button class="bt" id="lg-google" style="background:#fff;color:#1c2a24;border:2px solid #d8cfbd">Entrar com Google</button>
    <div class="mini" style="text-align:center;margin:12px 0 0">ou com e-mail</div>
    <input id="lg-email" type="email" placeholder="seu@email.com" autocomplete="email">
    <input id="lg-senha" type="password" placeholder="Senha (mín. 6 caracteres)" autocomplete="current-password">
    <div class="linha"><button class="bt" id="lg-entrar">Entrar</button><button class="bt sec" id="lg-criar">Criar conta</button></div>
    <div style="text-align:center;margin-top:8px"><a href="#" id="lg-esqueci" class="mini">Esqueci minha senha</a></div>
    <div id="lg-msg" class="mini" style="text-align:center;color:#c0392b;min-height:18px;margin-top:6px"></div>
    <button class="bt sec" id="lg-conv" style="margin-top:4px">Jogar como convidado <span class="mini">(sem ranking, salvo só neste aparelho)</span></button>`, true);
  $('#t-geral').dataset.trava = '1';
  const msg = t => { p.querySelector('#lg-msg').textContent = t || ''; };
  const aceite = () => { const ok = p.querySelector('#lg-aceite').checked; if (!ok) msg('Marque a caixa de consentimento para continuar.'); else store.set('ufmtc_aceite', true); return ok; };
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
      if (criar) await FB.createUserWithEmailAndPassword(Nuvem.auth, email, senha);
      else await FB.signInWithEmailAndPassword(Nuvem.auth, email, senha);
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
  p.querySelector('#lg-conv').onclick = () => Nuvem.entrarComoConvidado();
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
      <div class="item-lista" style="${j.uid === Nuvem.user.uid ? 'outline:3px solid #2e9e5b' : ''}">
        <div style="font-size:24px;width:34px;text-align:center">${med(i)}</div>
        <div class="f"><b>${esc(j.apelido)}</b>${j.uid === Nuvem.user.uid ? ' (você)' : ''}<br><span class="mini">nível ${j.nivel} · ${j.especies} espécies · ${j.arenas} arenas</span></div>
        <div style="font-weight:900">${j.pontos.toLocaleString('pt-BR')}</div></div>`).join('') : '<div class="mini">Ninguém no ranking ainda. Seja o primeiro!</div>')
      + `<div class="explica" style="margin-top:10px">Sua posição: <b>${minhaPos}º</b> com <b>${Nuvem.pontosNuvem.toLocaleString('pt-BR')}</b> pontos. Os pontos são a soma de todo o XP que você já ganhou.</div>`;
  } catch (e) {
    console.warn(e);
    p.querySelector('#rk').innerHTML = '<div class="explica">Não foi possível carregar o ranking agora. Verifique a conexão.</div>';
  }
}
