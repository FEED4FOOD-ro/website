# Site FEED4FOOD România

Site static (HTML + CSS), în română și engleză, publicat pe GitHub Pages:
https://feed4food-ro.github.io/website/

## Structura

| Ce | Unde |
|---|---|
| Conținutul paginilor în română | `_src/ro/*.html` → publicate la rădăcină (`despre.html` etc.) |
| Conținutul paginilor în engleză | `_src/en/*.html` → publicate în `en/` (`en/about.html` etc.) |
| Meniul, subsolul, textele comune, numele fișierelor pe limbi | `build.py` |
| Design (culori, fonturi, aranjare) | `assets/style.css` |
| Imagini (comune ambelor limbi) | `img/` |
| Paginile finale | `*.html` și `en/*.html` (generate, nu le edita direct) |

### Pagina „Dashboard” (registru, climă, surse deschise)

Pagina `registru.html` / `en/registry.html` are tabelul de indicatori INS TEMPO cu grafice pe ani și seriile climatice ANM.
Codul stă în `assets/dashboard.js` și `assets/dashboard.css`, iar datele în `assets/dashboard/` (`data.json`, `meteo.json`,
`i18n-en.json`, plus bibliotecile `echarts.min.js` și `xlsx.js`). Se încarcă doar pe această pagină: în comentariul de pe prima
linie din `_src/*/registru.html`, cheile `"css"` și `"js"` spun ce fișiere suplimentare primește pagina.
Tabul Calitatea aerului are grafice din `assets/dashboard/air.json` (EEA, stațiile din București, 2013–2025) și un catalog de surse deschise.
Fișierul se reface cu `python tools/build_air.py` (cere `pip install pyarrow` și internet, nu cont). Cardurile de surse sunt scrise direct în `_src/*/registru.html`.
Tabul Amprenta de apă este un calculator (`assets/waterfootprint.js`): ETc = Kc × ET0 după FAO-56, apă verde / albastră / cenușie după manualul Water Footprint Network.
Datele lui stau în `assets/dashboard/wf.json` (ET0 și ploaie lunară 1991–2020 pentru cele patru țări cu laboratoare active, prin Open-Meteo, plus randamentele INS pentru București–Ilfov);
se refac cu `python tools/build_wf.py` (cere internet, nu cont; Open-Meteo poate limita cererile, scriptul reîncearcă singur). Coeficienții culturilor sunt în `CROPS` din `waterfootprint.js`.
Pagina „Metodologie” (`metodologie.html` / `en/methodology.html`) are taburi simple (`assets/tabs.js`); conținutul ei este încă un draft de lucru.
Pentru date noi se înlocuiesc `data.json` / `meteo.json` și, dacă apar indicatori noi, rândurile din tabelul din `_src/*/registru.html`.

Comutatorul RO / EN din antet duce mereu la aceeași pagină în cealaltă limbă.

## Cum modifici ceva

1. Editezi fișierul din `_src/ro/` și pe cel cu același nume din `_src/en/`
   (de exemplu `_src/ro/noutati.html` și `_src/en/noutati.html` pentru o știre nouă).
   În paginile în engleză, linkurile spre alte pagini folosesc numele englezești
   (`about.html`, `news.html`, `results.html`...), vezi lista `PAGES` din `build.py`.
2. Rulezi `python build.py`.
3. Verifici local: `python -m http.server 8765`, apoi deschizi http://localhost:8765
4. Faci commit și push. GitHub Pages actualizează site-ul în 1–2 minute.

## Publicare

Repository: `feed4food-ro/website`, branch `main`, folder `/ (root)`
(Settings → Pages → Deploy from a branch).

Opțional, adresă proprie: Settings → Pages → Custom domain.
