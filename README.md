# UFMT Ciência

Jogo educativo de exploração do campus Cuiabá da UFMT: registre animais e plantas de Mato Grosso, visite estações científicas e vença desafios nas arenas.

- **Jogar:** abra o endereço do GitHub Pages deste repositório no celular (use o GPS no campus ou o modo virtual).
- **Contas e ranking:** Firebase (plano gratuito Spark), projeto `ufmt-ciencia`. Contas só para maiores de 18 anos; menores jogam em perfis de dependente criados por um responsável.
- **Conteúdo:** perguntas e animais em `codigo-fonte/data.js`; estações e arenas em `codigo-fonte/lugares.js`.
- **Mapa:** © colaboradores do OpenStreetMap (ODbL) e Natural Earth.

## Como gerar o jogo

O site publicado é um único arquivo, `index.html`, montado a partir de `codigo-fonte/`:

```
cd codigo-fonte
python build.py          # gera ../index.html
```

A biblioteca do Firebase (`codigo-fonte/vendor/firebase.bundle.js`) só precisa ser refeita quando `entry.js` mudar:

```
cd codigo-fonte
npm install
npm run firebase
python build.py
```

As regras de segurança do banco ficam em `firestore.rules` e são publicadas no console do Firebase (Firestore → Regras).

Projeto da UFMT — Física.
