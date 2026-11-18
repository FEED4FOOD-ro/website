"""Construiește assets/dashboard/air.json: serii lunare de calitate a aerului pentru stațiile din București.

Sursa: Agenția Europeană de Mediu (EEA), Air Quality Download Service, date verificate (E1a), raportate de România (ANPM/RNMCA).
Serviciul nu cere cont. Necesită pyarrow:   pip install pyarrow
Rulare din folderul site:   python tools/build_air.py
Din valorile zilnice (sau orare, cu cel puțin 18 ore valide pe zi) se calculează medii lunare;
o lună rămâne goală dacă are mai puțin de 75% din zile valide."""
import calendar
import collections
import datetime
import json
import pathlib
import re
import tempfile
import urllib.request

import pyarrow.parquet as pq

ROOT = pathlib.Path(__file__).resolve().parent.parent
API = "https://eeadmz1-downloads-api-appservice.azurewebsites.net/ParquetFile/urls"
LAST_YEAR = 2025
POLLUTANTS = {"pm10": "PM10", "pm25": "PM2.5", "no2": "NO2", "o3": "O3"}
# metadate stație din EEA (PanEuropean_metadata.csv): cod național, tip, zonă, latitudine, longitudine
STATIONS = {
    "RO0065A": ("B1", "background", 44.4473, 26.0367),
    "RO0066A": ("B2", "industrial", 44.4180, 26.1608),
    "RO0067A": ("B3", "traffic", 44.4449, 26.1273),
    "RO0068A": ("B4", "industrial", 44.3839, 26.1250),
    "RO0069A": ("B5", "industrial", 44.4195, 26.0336),
    "RO0070A": ("B6", "traffic", 44.4350, 26.0983),
    "RO0229A": ("B9", "background", 44.4917, 26.0307),
}


def file_urls(pollutant):
    body = json.dumps({"countries": ["RO"], "cities": ["Bucuresti"], "pollutants": [pollutant], "dataset": 2, "source": "Api"}).encode()
    req = urllib.request.Request(API, data=body, headers={"Content-Type": "application/json"})
    txt = urllib.request.urlopen(req, timeout=60).read().decode("utf-8-sig")
    return [l.strip() for l in txt.splitlines()[1:] if l.strip().startswith("https://")]


def daily_values(path):
    """-> {date: value} din fișierul unui punct de prelevare (zilnic sau orar)."""
    t = pq.read_table(path, columns=["Start", "Value", "AggType", "Validity"]).to_pydict()
    day, hours = {}, collections.defaultdict(list)
    for s, v, a, ok in zip(t["Start"], t["Value"], t["AggType"], t["Validity"]):
        if ok != 1 or v is None:
            continue
        if a == "day":
            day[s.date()] = float(v)
        else:
            hours[s.date()].append(float(v))
    out = {d: sum(h) / len(h) for d, h in hours.items() if len(h) >= 18}
    out.update(day)          # valoarea zilnică raportată are prioritate
    return out


def main():
    tmp = pathlib.Path(tempfile.mkdtemp(prefix="eea_aq_"))
    per = {code: {k: {} for k in POLLUTANTS} for code in STATIONS}
    for key, name in POLLUTANTS.items():
        for u in file_urls(name):
            code = re.search(r"(RO\d{4}A)", u).group(1)
            if code not in STATIONS:
                continue
            f = tmp / u.rsplit("/", 1)[1]
            f.write_bytes(urllib.request.urlopen(u, timeout=180).read())
            for d, v in daily_values(f).items():
                per[code][key].setdefault(d, v)      # prima sursă rămâne (fișierul _100 înaintea lui _101)
    out = {"source": "European Environment Agency · Air Quality Download Service (verified data, E1a) · reported by Romania (ANPM / RNMCA)",
           "vars": list(POLLUTANTS), "stations": []}
    for code, (nat, typ, lat, lon) in STATIONS.items():
        years = [d.year for k in POLLUTANTS for d in per[code][k]]
        if not years:
            continue
        y0, y1 = min(years), min(max(years), LAST_YEAR)
        st = {"wsi": code, "name": f"{nat} ({code})", "type": typ, "lat": lat, "lon": lon, "y0": y0, "y1": y1}
        for key in POLLUTANTS:
            series = []
            for y in range(y0, y1 + 1):
                for m in range(1, 13):
                    n = calendar.monthrange(y, m)[1]
                    vals = [per[code][key][datetime.date(y, m, d)] for d in range(1, n + 1) if datetime.date(y, m, d) in per[code][key]]
                    series.append(round(sum(vals) / len(vals), 1) if len(vals) >= -(-n * 3 // 4) else None)
            st[key] = series
        out["stations"].append(st)
    dest = ROOT / "assets" / "dashboard" / "air.json"
    dest.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("ok", dest.stat().st_size, "bytes,", len(out["stations"]), "stații")


if __name__ == "__main__":
    main()
