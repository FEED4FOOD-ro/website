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
