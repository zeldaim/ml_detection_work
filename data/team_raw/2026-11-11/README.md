# team_raw / 2026-11-11 수집 로그

수집일: 2026-11-11 · 수집 PC: 팀 실습 PC(sesac, host 192.168.0.67) · VMware Tools(vmrun) 경유 수집

## 중요: 원본(미가림) 로그입니다
- 본 로그는 **가림(마스킹) 처리하지 않은 원본**입니다.
- 사유: ML(AI-SIEM) 학습 특징값 보존 — 마스킹 시 요청 본문/파라미터가 바뀌어 학습에 영향.
- 따라서 다음 민감정보가 **그대로 포함**될 수 있습니다:
  - 로그인/회원가입 POST 본문의 **평문 비밀번호** (특히 `waf/modsec_audit.log`)
  - `.env`의 **JWT_SECRET**(`f0c1…`), DB 비밀번호(`1234`)가 에러/감사 로그에 노출됐을 가능성
  - 쿼리스트링·Authorization 헤더의 토큰
- 데이터는 시연용 가상 회원/상품이며, **비공개(private) 레포에만** 보관합니다. 공개 전환 금지.

## WEB 서버 (192.168.20.10, VMware "WEB"/Web10) — `web/`
Apache(Docker) 로그는 호스트 마운트 `/home/ubuntu/sesac_shop_web_php/logs/` 에서 수집.

| tar.gz | 압축 | 원본 | 포함 파일 (원본크기 / 라인수 / 기간) |
|---|---|---|---|
| `web_app.tgz` | 5.4 MB | 101.7 MB | `app.log` 101.7MB / 394,694줄 / 2026-10-26T19:46:39 ~ 2026-11-10T15:48:31 (JSON 비즈니스 로그) |
| `web_apache.tgz` | 8.5 MB | 196 MB | `apache/shop_access.log` 136.8MB / 1,084,528줄 / 26/Oct ~ 10/Nov · `apache/shop_error.log` 59.7MB / 279,823줄 / Oct26 ~ Nov09 · `apache/error.log` 10KB · `apache/other_vhosts_access.log` 0B |
| `web_waf.tgz` | 72.3 MB | 3.05 GB | `waf/access.log` 59.5MB / 357,922줄 / 28/Oct ~ 10/Nov · `waf/error.log` 977MB / 1,353,578줄 / Oct28 ~ Nov10 · `waf/modsec_audit.log` 1.95GB (ModSecurity 감사로그, 요청 본문 포함) |

- WEB 전체 압축 합계: 약 86 MB (각 파일 100MB 미만 → 분할 없음)
- 전체 수집 기간(대략): **2026-10-26 ~ 2026-11-10**

## DB 서버 (192.168.10.20, MySQL 8.0 Docker) — 의도적으로 제외
- 구성: `compose.db.yml`, `mysql:8.0`, `--slow_query_log=1 --long_query_time=0`(전 쿼리 기록), `--slow_query_log_file=/var/log/mysql/slow.log`, 로그 볼륨 `./logs/mysql`.
- **제외 사유:** 해당 DB VM엔 쓸 만한 쿼리 로그 없이 가상 시드 데이터만 있을 가능성이 커 이번 백업에서 제외(사용자 판단). 또한 그 VM(VMware "DB"/Ubuntu22.04)은 VMware Tools 미실행 + 방화벽 VM 미기동으로 접근 경로도 없었음.
- 필요 시 재수집: DB VM 콘솔에서 `ubuntu`로 1회 로그인하여 Tools 가동 후 `/var/log/mysql/` 수집 및 `SHOW VARIABLES`(general_log/slow_query_log) 확인.

## 수집 방법 메모
- 네트워크(pfSense `192.168.0.141:2222`) 불가 → VMware Tools(vmrun) 게스트 명령으로 게스트 내부에서 tar 후 호스트로 복사.
- OS 계정: `ubuntu` (구축 가이드 명시). 원본 VM 파일/설정은 변경하지 않음(임시 tar는 `/tmp`에 생성 후 반출).
