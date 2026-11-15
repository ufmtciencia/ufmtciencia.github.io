"""Monta o index.html do jogo (um único arquivo, publicado pelo GitHub Pages).

Uso, dentro da pasta codigo-fonte:
    python build.py            -> gera ../index.html
Para atualizar a biblioteca do Firebase (só quando mudar entry.js):
    npm install && npm run firebase
"""
import pathlib
R = pathlib.Path(__file__).parent
t = (R / 'index.html').read_text(encoding='utf-8')
ler = lambda nome: (R / nome).read_text(encoding='utf-8')
geo = R / 'campus.geojson'
partes = {
    '/*LEAFLET_CSS*/': ler('vendor/leaflet.css'),
    '/*GAME_CSS*/': ler('style.css'),
    '/*LEAFLET_JS*/': ler('vendor/leaflet.js'),
    '/*GEO*/': 'const GEO_CAMPUS = ' + geo.read_text(encoding='utf-8') + ';' if geo.exists() else 'const GEO_CAMPUS = null;',
    '/*MUNDO*/': ler('mundo.js'),
    '/*LUGARES*/': ler('lugares.js'),
    '/*DATA_JS*/': ler('data.js'),
    '/*FIREBASE_SDK*/': ler('vendor/firebase.bundle.js'),
    '/*GAME_JS*/': ler('game.js'),
    '/*NUVEM_JS*/': ler('nuvem.js'),
}
for k, v in partes.items():
    assert k in t, k
    t = t.replace(k, v.replace('</script', '<\\/script'))
saida = R.parent / 'index.html'
saida.write_text(t, encoding='utf-8', newline='\n')
print(saida, len(t))
