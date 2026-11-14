/* =====================================================================
   UFMT CIÊNCIA — CONTEÚDO DO JOGO
   Edite este arquivo para trocar criaturas, perguntas e curiosidades.
   ===================================================================== */

/* Áreas científicas (equivalem aos "tipos" do Pokémon GO).
   "vence" = área que leva dano extra (×1,5) desta.  Ciclo provisório. */
const TIPOS = {
  fis: { nome: 'Física',     cor: '#e8743b', icone: '⚡', vence: 'qui' },
  qui: { nome: 'Química',    cor: '#9b59b6', icone: '⚗️', vence: 'bio' },
  bio: { nome: 'Biologia',   cor: '#2e9e5b', icone: '🧬', vence: 'eco' },
  eco: { nome: 'Ecologia',   cor: '#5b8c2a', icone: '🌿', vence: 'ast' },
  ast: { nome: 'Astronomia', cor: '#3b5bdb', icone: '🔭', vence: 'mat' },
  mat: { nome: 'Matemática', cor: '#d4a017', icone: '📐', vence: 'fis' },
};

const RARIDADES = {
  comum:    { nome: 'Comum',    peso: 55, fuga: 0.20, dif: [1],    xp: 100, cor: '#7f8c8d' },
  incomum:  { nome: 'Incomum',  peso: 28, fuga: 0.30, dif: [1, 2], xp: 150, cor: '#27ae60' },
  raro:     { nome: 'Raro',     peso: 14, fuga: 0.45, dif: [2, 3], xp: 250, cor: '#2980b9' },
  lendario: { nome: 'Lendário', peso: 3,  fuga: 0.60, dif: [3],    xp: 500, cor: '#c0392b' },
};

/* Situação de conservação (Lista Vermelha da IUCN). null = não exibido. */
const STATUS = {
  LC: 'Pouco preocupante', NT: 'Quase ameaçada', VU: 'Vulnerável', EN: 'Em perigo',
};

/* Emojis são provisórios: troque por ilustrações próprias depois. */
const CRIATURAS = [
  // ---- Física
  { id: 'onca', nome: 'Onça-pintada', cientifico: 'Panthera onca', tipo: 'fis', bioma: 'Pantanal, Amazônia e Cerrado', status: 'NT', raridade: 'lendario', emoji: '🐆', atk: 30, hp: 120,
    fato: 'Maior felino das Américas. Sua mordida, proporcional ao tamanho, está entre as mais fortes dos felinos: consegue perfurar o casco de jabutis.' },
  { id: 'jacare', nome: 'Jacaré-do-pantanal', cientifico: 'Caiman yacare', tipo: 'fis', bioma: 'Pantanal', status: 'LC', raridade: 'comum', emoji: '🐊', atk: 18, hp: 90,
    fato: 'Já foi muito caçado pela pele; com a proteção, a população se recuperou e o Pantanal tem uma das maiores concentrações de jacarés do mundo.' },
  { id: 'seriema', nome: 'Seriema', cientifico: 'Cariama cristata', tipo: 'fis', bioma: 'Cerrado', status: 'LC', raridade: 'comum', emoji: '🐦', atk: 15, hp: 70,
    fato: 'Prefere correr a voar. Para comer presas grandes, como cobras, ela as bate com força contra o chão.' },
  // ---- Química
  { id: 'ariranha', nome: 'Ariranha', cientifico: 'Pteronura brasiliensis', tipo: 'qui', bioma: 'Pantanal e Amazônia', status: 'EN', raridade: 'raro', emoji: '🦦', atk: 24, hp: 95,
    fato: 'A maior lontra do mundo: pode passar de 1,5 m. Vive em grupos familiares que defendem juntos o território.' },
  { id: 'sucuri', nome: 'Sucuri-amarela', cientifico: 'Eunectes notaeus', tipo: 'qui', bioma: 'Pantanal', status: null, raridade: 'incomum', emoji: '🐍', atk: 20, hp: 100,
    fato: 'Sucuri típica do Pantanal. Não é venenosa: mata por constrição, apertando a presa com o corpo.' },
  { id: 'pequi', nome: 'Pequizeiro', cientifico: 'Caryocar brasiliense', tipo: 'qui', bioma: 'Cerrado', status: null, raridade: 'comum', emoji: '🌳', atk: 14, hp: 110,
    fato: 'Árvore símbolo do Cerrado. A cor amarela da polpa vem dos carotenoides, e embaixo dela há espinhos finos: nunca morda o caroço!' },
  // ---- Biologia
  { id: 'capivara', nome: 'Capivara', cientifico: 'Hydrochoerus hydrochaeris', tipo: 'bio', bioma: 'Pantanal, Cerrado e Amazônia', status: 'LC', raridade: 'comum', emoji: '🦫', atk: 14, hp: 95,
    fato: 'O maior roedor do mundo. Vive em grupos perto da água e tem membranas entre os dedos que ajudam a nadar.' },
  { id: 'tamandua', nome: 'Tamanduá-bandeira', cientifico: 'Myrmecophaga tridactyla', tipo: 'bio', bioma: 'Cerrado e Pantanal', status: 'VU', raridade: 'incomum', emoji: '🦡', atk: 19, hp: 90,
    fato: 'Não tem dentes. A língua passa de 60 cm e pode entrar e sair do formigueiro cerca de 150 vezes por minuto.' },
  { id: 'quati', nome: 'Quati', cientifico: 'Nasua nasua', tipo: 'bio', bioma: 'Cerrado, Pantanal e Amazônia', status: 'LC', raridade: 'comum', emoji: '🦝', atk: 15, hp: 75,
    fato: 'Fêmeas e filhotes andam em bandos. A cauda listrada, sempre erguida, ajuda o grupo a se manter junto na mata.' },
  // ---- Astronomia
  { id: 'loboguara', nome: 'Lobo-guará', cientifico: 'Chrysocyon brachyurus', tipo: 'ast', bioma: 'Cerrado', status: 'NT', raridade: 'raro', emoji: '🦊', atk: 23, hp: 90,
    fato: 'Maior canídeo da América do Sul, ativo ao entardecer e à noite. Come muita fruta-do-lobo e estampa a nota de R$ 200.' },
  { id: 'ema', nome: 'Ema', cientifico: 'Rhea americana', tipo: 'ast', bioma: 'Cerrado e Pantanal', status: 'NT', raridade: 'incomum', emoji: '🪶', atk: 18, hp: 95,
    fato: 'Maior ave do Brasil. Para os povos Guarani, existe uma Constelação da Ema no céu, perto do Cruzeiro do Sul.' },
  { id: 'anta', nome: 'Anta', cientifico: 'Tapirus terrestris', tipo: 'ast', bioma: 'Amazônia, Cerrado e Pantanal', status: 'VU', raridade: 'raro', emoji: '🐗', atk: 22, hp: 115,
    fato: 'Maior mamífero terrestre do Brasil e grande dispersora de sementes. Para os Guarani, a Via Láctea é o "caminho da anta" (Tapi\'i rapé).' },
  // ---- Ecologia
  { id: 'tuiuiu', nome: 'Tuiuiú', cientifico: 'Jabiru mycteria', tipo: 'eco', bioma: 'Pantanal', status: 'LC', raridade: 'incomum', emoji: '🦢', atk: 19, hp: 85,
    fato: 'Ave-símbolo do Pantanal. De asas abertas pode passar de 2,5 m de uma ponta à outra.' },
  { id: 'cervo', nome: 'Cervo-do-pantanal', cientifico: 'Blastocerus dichotomus', tipo: 'eco', bioma: 'Pantanal', status: 'VU', raridade: 'raro', emoji: '🦌', atk: 21, hp: 100,
    fato: 'Maior cervo da América do Sul. Tem membranas entre os cascos que o ajudam a andar em áreas alagadas.' },
  { id: 'arara', nome: 'Arara-azul', cientifico: 'Anodorhynchus hyacinthinus', tipo: 'eco', bioma: 'Pantanal', status: 'VU', raridade: 'raro', emoji: '🦜', atk: 22, hp: 85,
    fato: 'Maior arara do mundo. No Pantanal, faz ninho principalmente em ocos de uma árvore chamada manduvi.' },
  // ---- Matemática
  { id: 'tatu', nome: 'Tatu-canastra', cientifico: 'Priodontes maximus', tipo: 'mat', bioma: 'Cerrado, Pantanal e Amazônia', status: 'VU', raridade: 'raro', emoji: '🦔', atk: 22, hp: 120,
    fato: 'Maior tatu do mundo, pode passar de 50 kg. As tocas que cava servem de abrigo para dezenas de outras espécies.' },
  { id: 'tucano', nome: 'Tucano-toco', cientifico: 'Ramphastos toco', tipo: 'mat', bioma: 'Cerrado e Pantanal', status: 'LC', raridade: 'comum', emoji: '🐤', atk: 16, hp: 70,
    fato: 'O bico enorme é leve e funciona como um radiador: o fluxo de sangue nele ajuda a ave a perder calor.' },
  { id: 'piranha', nome: 'Piranha-vermelha', cientifico: 'Pygocentrus nattereri', tipo: 'mat', bioma: 'Pantanal e Amazônia', status: null, raridade: 'comum', emoji: '🐟', atk: 17, hp: 65,
    fato: 'Vive em cardumes. A fama de feroz é exagerada: come principalmente peixes, insetos e restos de animais.' },
];

/* Banco de perguntas.  t = área, d = dificuldade (1 a 3),
   o = alternativas (a PRIMEIRA é sempre a correta; o jogo embaralha). */
const PERGUNTAS = [
  // ---------------- FÍSICA
  { t: 'fis', d: 1, p: 'Qual é a unidade de força no Sistema Internacional?', o: ['Newton', 'Joule', 'Watt', 'Pascal'], e: '1 N é a força que dá a 1 kg uma aceleração de 1 m/s².' },
  { t: 'fis', d: 1, p: 'Qual é, aproximadamente, a velocidade da luz no vácuo?', o: ['300 000 km/s', '300 000 km/h', '340 m/s', '3 000 km/s'], e: '340 m/s é a velocidade do som no ar, quase um milhão de vezes menor.' },
  { t: 'fis', d: 1, p: 'Desprezando o ar, qual a aceleração de um objeto em queda livre perto da superfície da Terra?', o: ['Cerca de 9,8 m/s²', 'Cerca de 1 m/s²', 'Cerca de 98 m/s²', 'Zero'], e: 'A cada segundo de queda, a velocidade aumenta cerca de 9,8 m/s.' },
  { t: 'fis', d: 2, p: 'Num dia quente em Cuiabá, por que o asfalto escuro esquenta mais que uma calçada clara?', o: ['Superfícies escuras absorvem mais radiação do Sol', 'O asfalto produz calor próprio', 'A calçada joga o calor para o asfalto', 'O asfalto é mais leve'], e: 'Cores claras refletem mais luz; cores escuras absorvem e convertem em calor.' },
  { t: 'fis', d: 2, p: 'O som consegue se propagar no vácuo?', o: ['Não, ele precisa de um meio material', 'Sim, e mais rápido que no ar', 'Sim, na mesma velocidade da luz', 'Só os sons graves'], e: 'O som é uma vibração das partículas do meio. Sem partículas, não há som.' },
  { t: 'fis', d: 2, p: 'Pela Lei de Ohm (V = R·I), qual a corrente num resistor de 10 Ω ligado a 5 V?', o: ['0,5 A', '2 A', '50 A', '15 A'], e: 'I = V / R = 5 / 10 = 0,5 A.' },
  { t: 'fis', d: 2, p: 'O arco-íris aparece porque as gotas de chuva:', o: ['refratam e dispersam a luz do Sol em cores', 'emitem luz colorida', 'absorvem o azul do céu', 'refletem as cores das nuvens'], e: 'Cada cor se desvia num ângulo diferente ao entrar e sair da gota (dispersão).' },
  { t: 'fis', d: 2, p: 'A grandeza "potência" mede:', o: ['energia transferida por unidade de tempo', 'força por unidade de área', 'massa por unidade de volume', 'distância por unidade de tempo'], e: 'Potência = energia / tempo, medida em watts (1 W = 1 J/s).' },
  { t: 'fis', d: 3, p: 'Se a distância entre dois corpos dobra, a força gravitacional entre eles:', o: ['fica 4 vezes menor', 'fica 2 vezes menor', 'dobra', 'não muda'], e: 'A gravidade cai com o quadrado da distância: (2)² = 4.' },
  { t: 'fis', d: 3, p: 'Se a velocidade de um carro dobra, sua energia cinética:', o: ['quadruplica', 'dobra', 'não muda', 'cai pela metade'], e: 'Ec = m·v²/2. Dobrar v multiplica a energia por 2² = 4.' },
  { t: 'fis', d: 3, p: 'Uma onça percorre 60 m em 4 s. Qual a velocidade média dela?', o: ['15 m/s', '240 m/s', '6 m/s', '64 m/s'], e: 'v = 60 m / 4 s = 15 m/s, o que dá 54 km/h.' },

  // ---------------- QUÍMICA
  { t: 'qui', d: 1, p: 'Qual é a fórmula química da água?', o: ['H₂O', 'CO₂', 'O₂', 'H₂O₂'], e: 'Dois átomos de hidrogênio ligados a um de oxigênio. H₂O₂ é a água oxigenada.' },
  { t: 'qui', d: 1, p: 'Uma solução com pH igual a 7 é:', o: ['neutra', 'ácida', 'básica', 'salgada'], e: 'Abaixo de 7 é ácida, acima de 7 é básica.' },
  { t: 'qui', d: 1, p: 'Cuiabá nasceu da corrida do ouro no século XVIII. Qual o símbolo químico do ouro?', o: ['Au', 'Ag', 'O', 'Go'], e: 'Vem do latim aurum. Ag é a prata (argentum).' },
  { t: 'qui', d: 2, p: 'Qual gás é o mais abundante no ar que respiramos?', o: ['Nitrogênio', 'Oxigênio', 'Gás carbônico', 'Hidrogênio'], e: 'O ar seco tem cerca de 78% de nitrogênio e 21% de oxigênio.' },
  { t: 'qui', d: 2, p: 'A ferrugem é resultado de qual processo?', o: ['Oxidação do ferro', 'Evaporação do ferro', 'Fusão do ferro', 'Fotossíntese'], e: 'O ferro reage com o oxigênio e a água e forma óxidos de ferro.' },
  { t: 'qui', d: 2, p: 'O número atômico de um elemento indica:', o: ['quantos prótons há no núcleo', 'quantos nêutrons há no núcleo', 'a massa do átomo', 'quantas moléculas ele forma'], e: 'É o número de prótons que define qual elemento é qual.' },
  { t: 'qui', d: 2, p: 'A naftalina "some" do armário, passando direto de sólido para gás. Esse processo é a:', o: ['sublimação', 'fusão', 'condensação', 'solidificação'], e: 'Sublimação é a passagem direta do estado sólido para o gasoso.' },
  { t: 'qui', d: 2, p: 'Para haver fogo, como nas queimadas do Pantanal, é preciso combustível, calor e:', o: ['comburente, geralmente o oxigênio', 'nitrogênio', 'água', 'gás carbônico'], e: 'É o "triângulo do fogo". Tirando um dos três lados, o fogo apaga.' },
  { t: 'qui', d: 3, p: 'No sal de cozinha (NaCl), os átomos estão unidos por ligação:', o: ['iônica', 'covalente', 'metálica', 'de hidrogênio'], e: 'O sódio cede um elétron ao cloro, formando íons Na⁺ e Cl⁻ que se atraem.' },
  { t: 'qui', d: 3, p: 'Quantas partículas há em 1 mol de uma substância?', o: ['Cerca de 6,02 × 10²³', '1 000', 'Cerca de 6,02 × 10⁶', '100'], e: 'É a constante de Avogadro.' },
  { t: 'qui', d: 3, p: 'O que acontece ao misturar vinagre com bicarbonato de sódio?', o: ['Uma reação que libera gás carbônico', 'Nada acontece', 'Forma-se ouro', 'Libera-se oxigênio puro'], e: 'O ácido acético reage com o bicarbonato e produz CO₂: daí as bolhas.' },

  // ---------------- BIOLOGIA
  { t: 'bio', d: 1, p: 'Em que parte da célula vegetal acontece a fotossíntese?', o: ['Cloroplasto', 'Mitocôndria', 'Núcleo', 'Ribossomo'], e: 'O cloroplasto tem clorofila, que captura a luz do Sol.' },
  { t: 'bio', d: 1, p: 'Qual característica é exclusiva dos mamíferos?', o: ['Glândulas mamárias que produzem leite', 'Botar ovos', 'Ter coluna vertebral', 'Respirar ar'], e: 'Peixes, aves e répteis também têm coluna vertebral; só mamíferos produzem leite.' },
  { t: 'bio', d: 1, p: 'A molécula que guarda a informação genética é o:', o: ['DNA', 'ATP', 'Amido', 'Colesterol'], e: 'DNA: ácido desoxirribonucleico.' },
  { t: 'bio', d: 1, p: 'A capivara é o maior ____ do mundo.', o: ['roedor', 'marsupial', 'felino', 'anfíbio'], e: 'Um adulto pode passar de 60 kg.' },
  { t: 'bio', d: 1, p: 'Qual é a principal alimentação do tamanduá-bandeira?', o: ['Formigas e cupins', 'Frutas', 'Peixes', 'Folhas'], e: 'Ele abre os ninhos com as garras e captura os insetos com a língua pegajosa.' },
  { t: 'bio', d: 1, p: 'A menor unidade que forma os seres vivos é a:', o: ['célula', 'molécula de água', 'pele', 'semente'], e: 'Todo ser vivo é formado por uma ou mais células.' },
  { t: 'bio', d: 2, p: 'A sucuri é venenosa?', o: ['Não, ela mata por constrição', 'Sim, muito venenosa', 'Só os filhotes', 'Só na seca'], e: 'Ela aperta a presa com o corpo até impedir a circulação.' },
  { t: 'bio', d: 2, p: 'Jacarés dependem do ambiente para regular a temperatura do corpo. Animais assim são chamados de:', o: ['ectotérmicos', 'endotérmicos', 'herbívoros', 'anfíbios'], e: 'Por isso ficam ao sol pela manhã e procuram sombra ou água no calor.' },
  { t: 'bio', d: 2, p: 'Qual proteína dos glóbulos vermelhos transporta o oxigênio?', o: ['Hemoglobina', 'Insulina', 'Queratina', 'Clorofila'], e: 'A hemoglobina tem ferro, que se liga ao oxigênio.' },
  { t: 'bio', d: 3, p: 'Ao final da mitose, uma célula origina:', o: ['2 células geneticamente iguais', '4 células diferentes', '1 célula maior', '2 gametas'], e: 'A meiose é que forma 4 células diferentes, como os gametas.' },
  { t: 'bio', d: 3, p: 'Abelhas levam pólen e as flores oferecem néctar: os dois ganham. Essa relação se chama:', o: ['mutualismo', 'parasitismo', 'predação', 'competição'], e: 'No mutualismo, as duas espécies se beneficiam.' },

  // ---------------- ASTRONOMIA
  { t: 'ast', d: 1, p: 'Qual é a estrela mais próxima da Terra?', o: ['O Sol', 'Alfa Centauri', 'Sirius', 'A Lua'], e: 'Depois do Sol, a mais próxima é Proxima Centauri. A Lua não é estrela.' },
  { t: 'ast', d: 1, p: 'Qual é o maior planeta do Sistema Solar?', o: ['Júpiter', 'Saturno', 'Terra', 'Netuno'], e: 'Caberiam mais de mil Terras dentro de Júpiter.' },
  { t: 'ast', d: 1, p: 'A Via Láctea é:', o: ['a galáxia onde fica o Sistema Solar', 'uma constelação', 'uma nuvem da atmosfera', 'outro nome do Sol'], e: 'Ela tem centenas de bilhões de estrelas.' },
  { t: 'ast', d: 1, p: 'Que constelação, presente na bandeira do Brasil, ajuda a encontrar o polo sul celeste?', o: ['Cruzeiro do Sul', 'Órion', 'Escorpião', 'Ursa Maior'], e: 'Prolongando o braço maior da cruz cerca de 4,5 vezes, chega-se perto do polo sul celeste.' },
  { t: 'ast', d: 2, p: 'As estações do ano acontecem principalmente por causa:', o: ['da inclinação do eixo da Terra', 'da distância entre a Terra e o Sol', 'das fases da Lua', 'da rotação da Terra'], e: 'A inclinação de cerca de 23,4° faz cada hemisfério receber mais luz em épocas diferentes.' },
  { t: 'ast', d: 2, p: 'Quanto tempo, aproximadamente, a luz do Sol leva para chegar à Terra?', o: ['Cerca de 8 minutos', '1 segundo', '1 dia', '1 ano'], e: 'São cerca de 150 milhões de km a 300 000 km/s: uns 8 min e 20 s.' },
  { t: 'ast', d: 2, p: 'As fases da Lua acontecem porque:', o: ['vemos partes diferentes da metade iluminada pelo Sol', 'a sombra da Terra cobre a Lua', 'a Lua muda de tamanho', 'nuvens cobrem a Lua'], e: 'A sombra da Terra só aparece na Lua durante os eclipses lunares.' },
  { t: 'ast', d: 2, p: 'O ano-luz é uma unidade de:', o: ['distância', 'tempo', 'velocidade', 'brilho'], e: 'É a distância que a luz percorre em um ano: cerca de 9,5 trilhões de km.' },
  { t: 'ast', d: 2, p: 'Para os povos Guarani, a Via Láctea é o "caminho" de qual animal?', o: ['Anta', 'Onça', 'Ema', 'Capivara'], e: 'Tapi\'i rapé, o caminho da anta. A ema dá nome a outra constelação guarani.' },
  { t: 'ast', d: 3, p: 'Cuiabá fica a cerca de 15,6° de latitude sul. Quantas vezes por ano o Sol passa a pino ao meio-dia na cidade?', o: ['Duas', 'Nenhuma', 'Uma', 'Todos os dias'], e: 'Entre os trópicos isso ocorre duas vezes por ano. Em Cuiabá, no início de fevereiro e no início de novembro.' },
  { t: 'ast', d: 3, p: 'Um eclipse solar só pode acontecer na fase de Lua:', o: ['Nova', 'Cheia', 'Crescente', 'Minguante'], e: 'Só na Lua Nova ela fica entre a Terra e o Sol.' },
  { t: 'ast', d: 3, p: 'A Constelação da Ema, dos povos Guarani, fica perto de qual constelação ocidental?', o: ['Cruzeiro do Sul', 'Ursa Maior', 'Leão', 'Peixes'], e: 'A cabeça da Ema fica perto do Cruzeiro do Sul, e o corpo se estende em direção ao Escorpião.' },

  // ---------------- ECOLOGIA
  { t: 'eco', d: 1, p: 'O Pantanal é conhecido como:', o: ['a maior planície alagável do planeta', 'o maior deserto do Brasil', 'a maior floresta do mundo', 'uma cadeia de montanhas'], e: 'Grande parte dele fica embaixo d\'água durante as cheias.' },
  { t: 'eco', d: 1, p: 'Quais são os três biomas de Mato Grosso?', o: ['Amazônia, Cerrado e Pantanal', 'Caatinga, Pampa e Mata Atlântica', 'Amazônia, Caatinga e Pampa', 'Cerrado, Pampa e Mata Atlântica'], e: 'Mato Grosso é um dos poucos estados com três biomas.' },
  { t: 'eco', d: 1, p: 'Numa cadeia alimentar, quem são os produtores?', o: ['Plantas e algas', 'Onças', 'Fungos', 'Herbívoros'], e: 'Eles produzem o próprio alimento pela fotossíntese.' },
  { t: 'eco', d: 1, p: 'Fungos e bactérias que reciclam a matéria de seres mortos são chamados de:', o: ['decompositores', 'produtores', 'predadores', 'polinizadores'], e: 'Eles devolvem os nutrientes para o solo.' },
  { t: 'eco', d: 2, p: 'O que comanda o ritmo da vida no Pantanal ao longo do ano?', o: ['O ciclo de cheias e secas', 'As marés do oceano', 'A neve', 'Os vulcões'], e: 'É o "pulso de inundação": peixes, aves e plantas seguem esse ritmo.' },
  { t: 'eco', d: 2, p: 'Muitas árvores do Cerrado têm casca grossa e raízes profundas. Isso ajuda a:', o: ['resistir ao fogo e alcançar água na seca', 'atrair a chuva', 'crescer na sombra', 'boiar nas cheias'], e: 'A casca isola o tronco do calor do fogo; as raízes buscam água no fundo do solo.' },
  { t: 'eco', d: 2, p: 'O rio Cuiabá faz parte de qual bacia hidrográfica?', o: ['Bacia do Paraguai', 'Bacia Amazônica', 'Bacia do São Francisco', 'Bacia do Tocantins'], e: 'Suas águas correm para o Pantanal e para o rio Paraguai.' },
  { t: 'eco', d: 2, p: 'Qual gás de efeito estufa é liberado em maior quantidade nas queimadas?', o: ['Gás carbônico (CO₂)', 'Oxigênio', 'Nitrogênio', 'Hélio'], e: 'A queima da vegetação devolve ao ar o carbono guardado nas plantas.' },
  { t: 'eco', d: 3, p: 'As tocas do tatu-canastra abrigam muitas outras espécies. Por isso ele é chamado de:', o: ['engenheiro de ecossistemas', 'espécie invasora', 'decompositor', 'parasita'], e: 'Espécies que criam ou modificam habitats para outras são engenheiras de ecossistemas.' },
  { t: 'eco', d: 3, p: 'Uma espécie que só existe naturalmente em uma determinada região é chamada de:', o: ['endêmica', 'exótica', 'invasora', 'migratória'], e: 'Espécies exóticas são as que vêm de outros lugares.' },

  // ---------------- MATEMÁTICA
  { t: 'mat', d: 1, p: 'Quanto é 15% de 200?', o: ['30', '15', '20', '35'], e: '10% de 200 é 20; 5% é 10. Total: 30.' },
  { t: 'mat', d: 1, p: 'Qual a área de um quadrado com lado de 5 m?', o: ['25 m²', '20 m²', '10 m²', '15 m²'], e: 'Área = lado × lado = 5 × 5. (20 m seria o perímetro.)' },
  { t: 'mat', d: 1, p: 'Qual é a raiz quadrada de 144?', o: ['12', '14', '72', '11'], e: '12 × 12 = 144.' },
  { t: 'mat', d: 1, p: 'Quanto vale a soma dos ângulos internos de um triângulo?', o: ['180°', '90°', '360°', '270°'], e: 'Vale para qualquer triângulo no plano.' },
  { t: 'mat', d: 1, p: 'Um tuiuiú tem 2,6 m de envergadura. Quanto é isso em centímetros?', o: ['260 cm', '26 cm', '2 600 cm', '206 cm'], e: '1 m = 100 cm, então 2,6 × 100 = 260.' },
  { t: 'mat', d: 2, p: 'Ao lançar um dado comum, qual a probabilidade de sair 6?', o: ['1/6', '1/2', '1/3', '6/6'], e: 'Um resultado favorável em seis possíveis.' },
  { t: 'mat', d: 2, p: 'Quanto é 2¹⁰?', o: ['1 024', '20', '512', '100'], e: '2⁵ = 32, e 32 × 32 = 1 024.' },
  { t: 'mat', d: 2, p: 'Qual o próximo número da sequência 1, 1, 2, 3, 5, 8, ...?', o: ['13', '11', '10', '16'], e: 'É a sequência de Fibonacci: cada termo é a soma dos dois anteriores.' },
  { t: 'mat', d: 2, p: 'Três quatis pesam 4 kg, 5 kg e 6 kg. Qual o peso médio?', o: ['5 kg', '15 kg', '4,5 kg', '6 kg'], e: '(4 + 5 + 6) / 3 = 5.' },
  { t: 'mat', d: 2, p: 'Num triângulo retângulo com catetos 3 e 4, quanto mede a hipotenusa?', o: ['5', '7', '6', '12'], e: 'Pitágoras: 3² + 4² = 9 + 16 = 25, e √25 = 5.' },
  { t: 'mat', d: 3, p: 'Num mapa na escala 1:1000, 5 cm correspondem a quantos metros reais?', o: ['50 m', '5 m', '500 m', '5 000 m'], e: '5 cm × 1000 = 5 000 cm = 50 m.' },
  { t: 'mat', d: 3, p: 'Um grupo de 5 capivaras dobra de tamanho a cada ano. Quantas serão depois de 3 anos?', o: ['40', '15', '20', '30'], e: '5 → 10 → 20 → 40. Crescimento exponencial: 5 × 2³.' },
];

/* Curiosidades exibidas nas Estações Científicas. */
const CURIOSIDADES = [
  'A luz do Sol que você vê agora saiu dele há cerca de 8 minutos.',
  'O Pantanal tem mais de 4 mil espécies de plantas e animais já descritas.',
  'Um raio pode aquecer o ar ao redor a cerca de 30 000 °C, mais que a superfície do Sol.',
  'O Cerrado é chamado de "berço das águas": nele nascem rios de várias grandes bacias do Brasil.',
  'Se todo o DNA de uma célula humana fosse esticado, teria cerca de 2 metros.',
  'Cuiabá fica perto do centro geodésico da América do Sul.',
  'O som viaja cerca de 4 vezes mais rápido na água do que no ar.',
  'Uma colher de chá de solo saudável pode ter mais micro-organismos do que há pessoas na Terra.',
  'Júpiter tem dezenas de luas; quatro delas foram descobertas por Galileu em 1610.',
  'O número π aparece em fórmulas de círculos, ondas, pêndulos e até na probabilidade.',
  'A água é uma das poucas substâncias que fica menos densa ao congelar: por isso o gelo boia.',
  'Os povos indígenas do Brasil usam as estrelas há milênios para marcar épocas de plantio e de pesca.',
];
