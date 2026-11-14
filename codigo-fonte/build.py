import sys, json, pathlib
R = pathlib.Path(__file__).parent
t = (R/'src/index.html').read_text()
geo_path = R/'data/campus.geojson'
geo = 'const GEO_CAMPUS = null;'
if geo_path.exists():
    geo = 'const GEO_CAMPUS = ' + geo_path.read_text() + ';'
parts = {
 '/*LEAFLET_CSS*/': (R/'node_modules/leaflet/dist/leaflet.css').read_text(),
 '/*GAME_CSS*/': (R/'src/style.css').read_text(),
 '/*LEAFLET_JS*/': (R/'node_modules/leaflet/dist/leaflet.js').read_text().replace('//# sourceMappingURL=leaflet.js.map',''),
 '/*GEO*/': geo,
 '/*LUGARES*/': (R/'data/lugares.js').read_text() if (R/'data/lugares.js').exists() else '',
 '/*DATA_JS*/': (R/'src/data.js').read_text(),
 '/*GAME_JS*/': (R/'src/game.js').read_text(),
 '/*FIREBASE_SDK*/': (R/'fb/firebase.bundle.js').read_text(),
 '/*NUVEM_JS*/': (R/'src/nuvem.js').read_text(),
}
for k,v in parts.items():
    assert k in t, k
    t = t.replace(k, v.replace('</script','<\\/script'))
out = R/'dist/index.html'; out.parent.mkdir(exist_ok=True); out.write_text(t)
print(out, len(t))
