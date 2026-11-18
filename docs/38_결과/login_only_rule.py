#!/usr/bin/env python3
"""'로그인만 하고 서핑은 안 한다' 룰을 라벨된 실제 랩 로그(출발지 × 5분)에 돌려 공격 종류별 탐지와 정상 오탐을 센다.

    python docs/38_결과/login_only_rule.py [datasets/real_web]
"""
import collections
import csv
import gzip
import re
import sys
from datetime import datetime

D = sys.argv[1] if len(sys.argv) > 1 else "datasets/real_web"
lab = {r["ip"]: (r["label"], r["type"]) for r in csv.DictReader(open(f"{D}/real_canon_answer.csv", encoding="utf-8"))}
R = re.compile(r'^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) (\S+)')
win = collections.defaultdict(lambda: [0, 0])          # (ip, 5분 구간) → [로그인 요청, 전체 요청]
for line in gzip.open(f"{D}/real_canon_access.log.gz", "rt", encoding="utf-8", errors="replace"):
    m = R.match(line)
    if not m:
        continue
    ip, ts, _meth, path = m.groups()
    t = datetime.strptime(ts.split()[0].split(".")[0], "%d/%b/%Y:%H:%M:%S")
    w = win[(ip, t.strftime("%m%d%H") + f"{t.minute // 5:02d}")]
    w[0] += "login" in path.lower()
    w[1] += 1


def group(ip):
    label, kind = lab.get(ip, ("normal", "normal"))
    return kind if label == "attack" else "normal"


for n, ratio in ((3, 1.0), (3, 0.9), (2, 0.8)):
    hit, tot = collections.Counter(), collections.Counter()
    for (ip, _), (login, total) in win.items():
        g = group(ip)
        tot[g] += 1
        hit[g] += login >= n and login / total >= ratio
    print(f"\n룰: 5분에 로그인 ≥{n} 그리고 로그인 비율 ≥{ratio:.0%}")
    for g in sorted(tot, key=lambda g: (g != "normal", g)):
        print(f"  {g:<12} {hit[g]:>4}/{tot[g]}")
