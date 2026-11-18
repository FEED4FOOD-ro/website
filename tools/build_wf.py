"""Construiește assets/dashboard/wf.json: datele de intrare pentru calculatorul amprentei de apă.

1) Climă: evapotranspirație de referință ET0 (FAO-56) și precipitații lunare, medii 1991–2020, pentru cele cinci orașe cu laborator activ.
   Sursa: Open-Meteo Historical Weather API (reanaliză meteorologică, licență CC BY 4.0, fără cheie pentru uz necomercial).
2) Randamente: media 2021–2025 a randamentului pe hectar (INS TEMPO, AGR110A) pentru Regiunea București–Ilfov, din assets/dashboard/data.json.
Rulare din folderul site:   python tools/build_wf.py"""
import collections
import json
import pathlib
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
Y0, Y1 = 1991, 2020
# țară: (id, nume RO, nume EN, puncte (lat, lon) din care se face media, baza climei RO, baza climei EN)
LOCATIONS = [
    ("romania", "România", "Romania", [(44.4268, 26.1025)], "Clima: București", "Climate: Bucharest"),
    ("cipru", "Cipru", "Cyprus", [(35.1356, 33.3347)], "Clima: Strovolos (zona Nicosia)", "Climate: Strovolos (Nicosia area)"),
    ("grecia", "Grecia", "Greece", [(41.1528, 24.1472)], "Clima: Drama (nordul Greciei)", "Climate: Drama (northern Greece)"),
    ("polonia", "Polonia", "Poland", [(54.3520, 18.6466), (52.2297, 21.0122)], "Clima: media Gdańsk și Varșovia", "Climate: mean of Gdańsk and Warsaw"),
]
# cultură -> (denumire INS în data.json, indicator)
CROPS = {
    "wheat": "Grau comun", "maize": "Porumb boabe", "sunflower": "Floarea soarelui", "potato": "Cartofi - total",
    "tomato": "Tomate", "onion": "Ceapa uscata", "cabbage": "Varza alba", "pepper": "Ardei"
}


def fetch(url):
    """Cere URL-ul; la limitarea de cereri (429) așteaptă și reîncearcă."""
    for wait in (0, 30, 65, 65, 130, 130, 260):
        time.sleep(wait)
        try:
            with urllib.request.urlopen(url, timeout=180) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code != 429:
                raise
            print("429, reîncerc după", wait or 30, "s", flush=True)
    raise RuntimeError("Open-Meteo a refuzat cererile (429)")


def climate(lat, lon):
    et, pr, years = collections.defaultdict(float), collections.defaultdict(float), set()
    for a in range(Y0, Y1 + 1, 10):
        q = {"latitude": lat, "longitude": lon, "start_date": f"{a}-01-01", "end_date": f"{a + 9}-12-31",
             "daily": "et0_fao_evapotranspiration,precipitation_sum", "timezone": "auto"}
        j = fetch("https://archive-api.open-meteo.com/v1/archive?" + urllib.parse.urlencode(q))
        for t, e, p in zip(j["daily"]["time"], j["daily"]["et0_fao_evapotranspiration"], j["daily"]["precipitation_sum"]):
            m = int(t[5:7])
            if e is not None:
                et[m] += e
            if p is not None:
                pr[m] += p
        years.update(int(t[:4]) for t in j["daily"]["time"])
    n = len(years)
    return [round(et[m] / n, 1) for m in range(1, 13)], [round(pr[m] / n, 1) for m in range(1, 13)]


def yields():
    d = json.load(open(ROOT / "assets" / "dashboard" / "data.json", encoding="utf-8"))["AGR110A"]
    yrs = d["years"]
    idx = [i for i, y in enumerate(yrs) if 2021 <= int(y) <= 2025]
    out = {}
    for key, name in CROPS.items():
        for r in d["rows"]:
            c, forma, regiune, um = r["d"]
            if c == name and forma == "Total" and regiune == "Regiunea BUCURESTI - ILFOV" and um == "Kilograme":
                v = [r["v"][i] for i in idx if r["v"][i]]
                if v:
                    out[key] = {"kg_ha": round(sum(v) / len(v)), "years": f"{yrs[idx[0]]}–{yrs[idx[-1]]}", "n": len(v), "ins": name}
    return out


def main():
    locs = []
    for lid, ro, en, points, b_ro, b_en in LOCATIONS:
        res = [climate(lat, lon) for lat, lon in points]
        et = [round(sum(r[0][m] for r in res) / len(res), 1) for m in range(12)]
        p = [round(sum(r[1][m] for r in res) / len(res), 1) for m in range(12)]
        locs.append({"id": lid, "ro": ro, "en": en, "points": [list(x) for x in points], "basis": {"ro": b_ro, "en": b_en}, "et0": et, "p": p})
        print(lid, round(sum(et)), round(sum(p)), flush=True)
        time.sleep(5)
    out = {"source": "Open-Meteo Historical Weather API (CC BY 4.0), medii 1991–2020; INS TEMPO AGR110A", "period": [Y0, Y1], "locations": locs, "yields": yields()}
    dest = ROOT / "assets" / "dashboard" / "wf.json"
    dest.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("ok", dest.stat().st_size, "bytes;", out["yields"])


if __name__ == "__main__":
    main()
