"""Construiește site-ul FEED4FOOD România, în română și engleză.

Conținutul fiecărei pagini stă în:
    _src/ro/<cheie>.html   -> publicat la rădăcină (ex. despre.html)
    _src/en/<cheie>.html   -> publicat în en/ (ex. en/about.html)

Prima linie din fiecare fișier este un comentariu cu titlul și descrierea:
    <!-- {"title": "Despre proiect", "desc": "...", "nav": "despre"} -->
"nav" spune ce buton din meniu e evidențiat (cheia paginii-părinte).

În fragmente, linkurile spre alte pagini folosesc numele de fișier din limba
respectivă (ex. în engleză "about.html"), iar imaginile "img/...".

Rulează:  python build.py
Meniul, subsolul și textele comune se schimbă o singură dată, aici.
"""
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "_src"
LANGS = ("ro", "en")

# cheie -> nume de fișier publicat, pe limbi
PAGES = {
    "index": {"ro": "index.html", "en": "index.html"},
    "despre": {"ro": "despre.html", "en": "about.html"},
    "laborator-bucuresti": {"ro": "laborator-bucuresti.html", "en": "bucharest-living-lab.html"},
    "consortiu": {"ro": "consortiu.html", "en": "consortium.html"},
    "rezultate": {"ro": "rezultate.html", "en": "results.html"},
    "noutati": {"ro": "noutati.html", "en": "news.html"},
    "registru": {"ro": "registru.html", "en": "registry.html"},
    "metodologie": {"ro": "metodologie.html", "en": "methodology.html"},
    "contact": {"ro": "contact.html", "en": "contact.html"},
    "raportare-2024": {"ro": "raportare-2024.html", "en": "report-2024.html"},
    "raportare-2025": {"ro": "raportare-2025.html", "en": "report-2025.html"},
    "raportare-2026": {"ro": "raportare-2026.html", "en": "report-2026.html"},
}

NAV = {
    "ro": [
        ("index", "Acasă"), ("despre", "Despre proiect"), ("laborator-bucuresti", "Laboratorul București"),
        ("consortiu", "Consorțiu și echipă"), ("rezultate", "Rezultate"), ("registru", "Dashboard"), ("metodologie", "Metodologie"), ("noutati", "Noutăți"), ("contact", "Contact"),
    ],
    "en": [
        ("index", "Home"), ("despre", "About"), ("laborator-bucuresti", "Bucharest Living Lab"),
        ("consortiu", "Consortium & team"), ("rezultate", "Results"), ("registru", "Dashboard"), ("metodologie", "Methodology"), ("noutati", "News"), ("contact", "Contact"),
    ],
}

T = {
    "ro": {
        "site": "FEED4FOOD România",
        "tagline": "România · Universitatea din București",
        "skip": "Sari la conținut",
        "menu": "Meniu",
        "menu_label": "Meniu principal",
        "switch_label": "Language: English",
        "about": "Comunități vulnerabile care stimulează inovarea și guvernanța sistemelor alimentare durabile în orașele europene.",
        "address": "Universitatea din București<br>Strada Panduri 90, 050663 București",
        "pages": "Pagini",
        "follow": "Urmărește-ne",
        "fb_ro": "Facebook FEED4FOOD România",
        "eu_site": "feed4food.eu (proiectul european)",
        "funding1": "Proiect finanțat prin PN4, Programul 5.8. Cooperare europeană și internațională, Subprogramul 5.8.1. Orizont Europa (COFUND), contract nr. 50/2024. Autoritate contractantă: Unitatea Executivă pentru Finanțarea Învățământului Superior, a Cercetării, Dezvoltării și Inovării (UEFISCDI).",
        "funding2": "FEED4FOOD, Grant Agreement nr. 101069506, este finanțat în cadrul parteneriatului Driving Urban Transitions, cofinanțat de Uniunea Europeană. Opiniile exprimate aparțin exclusiv autorilor și nu reflectă neapărat pe cele ale Uniunii Europene.",
        "locale": "ro_RO",
    },
    "en": {
        "site": "FEED4FOOD Romania",
        "tagline": "Romania · University of Bucharest",
        "skip": "Skip to content",
        "menu": "Menu",
        "menu_label": "Main menu",
        "switch_label": "Limba: română",
        "about": "Vulnerable communities fostering innovation and governance of sustainable food systems in European cities.",
        "address": "University of Bucharest<br>90 Panduri Street, 050663 Bucharest, Romania",
        "pages": "Pages",
        "follow": "Follow us",
        "fb_ro": "FEED4FOOD Romania on Facebook",
        "eu_site": "feed4food.eu (European project)",
        "funding1": "Funded through PN4, Programme 5.8 European and International Cooperation, Subprogramme 5.8.1 Horizon Europe (COFUND), contract no. 50/2024. Contracting authority: Executive Agency for Higher Education, Research, Development and Innovation Funding (UEFISCDI).",
        "funding2": "FEED4FOOD, Grant Agreement no. 101069506, is funded under the Driving Urban Transitions Partnership, co-funded by the European Union. Views and opinions expressed are those of the author(s) only and do not necessarily reflect those of the European Union.",
        "locale": "en_GB",
    },
}

TEMPLATE = """<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="{base}img/hero.jpg">
<meta property="og:type" content="website">
<meta property="og:locale" content="{locale}">
<link rel="alternate" hreflang="ro" href="{alt_ro}">
<link rel="alternate" hreflang="en" href="{alt_en}">
<link rel="icon" href="{base}img/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Source+Sans+3:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{base}assets/style.css">
{head_extra}</head>
<body>
<a class="skip" href="#main">{skip}</a>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="index.html"><img src="{base}img/logo-alb.png" alt=""><span>FEED4FOOD<small>{tagline}</small></span></a>
    <div class="header-tools">
      <div class="lang-switch" role="group" aria-label="Limba / Language">
        <a href="{sw_ro}" hreflang="ro" lang="ro"{cur_ro}>RO</a><a href="{sw_en}" hreflang="en" lang="en"{cur_en}>EN</a>
      </div>
      <button class="nav-toggle" aria-expanded="false" aria-controls="nav">{menu}</button>
    </div>
    <nav class="nav" id="nav" aria-label="{menu_label}">
{nav}
    </nav>
  </div>
</header>
<main id="main">
{body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <h4>{site}</h4>
        <p>{about}</p>
        <p>{address}<br><a href="mailto:daniel.diaconu@unibuc.ro">daniel.diaconu@unibuc.ro</a></p>
      </div>
      <div>
        <h4>{pages}</h4>
        <ul>
{footnav}
        </ul>
      </div>
      <div>
        <h4>{follow}</h4>
        <ul>
          <li><a href="https://www.facebook.com/profile.php?id=61557230353816" rel="noopener">{fb_ro}</a></li>
          <li><a href="https://www.linkedin.com/company/feed4foodromaniaresearch/" rel="noopener">LinkedIn</a></li>
          <li><a href="https://feed4food.eu/" rel="noopener">{eu_site}</a></li>
          <li><a href="https://www.facebook.com/feed4foodeu" rel="noopener">Facebook FEED4FOOD EU</a></li>
        </ul>
      </div>
    </div>
    <div class="funding">
      <img src="{base}img/finantare.png" alt="Driving Urban Transitions · Co-funded by the European Union" width="900" height="150">
      <div>
        <p>{funding1}</p>
        <p>{funding2}</p>
      </div>
    </div>
  </div>
</footer>
<script src="{base}assets/site.js" defer></script>
{scripts_extra}</body>
</html>
"""


def rel(from_lang, to_lang, filename):
    """Link relativ de la o pagină în from_lang spre filename în to_lang."""
    if from_lang == to_lang:
        return filename
    return ("en/" if to_lang == "en" else "../") + filename


def build_page(lang, key):
    src_file = SRC / lang / f"{key}.html"
    text = src_file.read_text(encoding="utf-8")
    m = re.match(r"\s*<!--\s*(\{.*?\})\s*-->\s*", text, re.S)
    meta = json.loads(m.group(1))
    body = text[m.end():].rstrip()
    t = T[lang]
    base = "../" if lang == "en" else ""
    if base:  # imaginile și fișierele comune stau la rădăcină
        body = re.sub(r'((?:src|href)=")(img/|assets/)', rf"\1{base}\2", body)
        body = body.replace("url('img/", f"url('{base}img/")
    active = meta.get("nav", key)
    current = ' aria-current="page"'
    nav = "\n".join(
        f'      <a href="{PAGES[k][lang]}"{current if k == active else ""}>{label}</a>'
        for k, label in NAV[lang]
    )
    footnav = "\n".join(f'          <li><a href="{PAGES[k][lang]}">{label}</a></li>' for k, label in NAV[lang])
    title = meta["title"] if key == "index" else f'{meta["title"]} · {t["site"]}'
    # fișiere suplimentare doar pentru anumite pagini: "css" și "js" în comentariul de pe prima linie
    head_extra = "".join(f'<link rel="stylesheet" href="{base}{f}">\n' for f in meta.get("css", []))
    scripts_extra = "".join(f'<script src="{base}{f}" defer></script>\n' for f in meta.get("js", []))
    page = TEMPLATE.format(
        head_extra=head_extra, scripts_extra=scripts_extra,
        lang=lang, base=base, title=html.escape(title), desc=html.escape(meta.get("desc", "")),
        nav=nav, footnav=footnav, body=body,
        sw_ro=rel(lang, "ro", PAGES[key]["ro"]), sw_en=rel(lang, "en", PAGES[key]["en"]),
        alt_ro=rel(lang, "ro", PAGES[key]["ro"]), alt_en=rel(lang, "en", PAGES[key]["en"]),
        cur_ro=' aria-current="true"' if lang == "ro" else "",
        cur_en=' aria-current="true"' if lang == "en" else "",
        **{k: v for k, v in t.items()},
    )
    out = ROOT / ("en" if lang == "en" else "") / PAGES[key][lang]
    out.parent.mkdir(exist_ok=True)
    out.write_text(page, encoding="utf-8", newline="\n")
    print("scris", out.relative_to(ROOT).as_posix())


if __name__ == "__main__":
    for lang in LANGS:
        for key in PAGES:
            if (SRC / lang / f"{key}.html").exists():
                build_page(lang, key)
            else:
                print(f"LIPSEȘTE: _src/{lang}/{key}.html")
