# 🏋️ 운동 데이터 분석 프로젝트

ChatGPT와 나눈 운동 관련 대화에서 인바디 변화, 운동 기록, 증량 추이를 추출하고 분석하는 프로젝트입니다.

## 📁 프로젝트 구조

```
workout_analysis/
├── data/                          # 데이터 파일
│   ├── chatgpt_conversation.txt   # 원본 대화 내용
│   └── workout_data.json          # 파싱된 구조화 데이터
├── scripts/                       # 분석 스크립트
│   ├── parse_workout_data.py      # 대화 파싱 및 데이터 추출
│   └── visualize_workout_data.py  # 데이터 시각화
├── output/                        # 분석 결과
│   ├── inbody_changes.png         # 인바디 변화 그래프
│   ├── equipment_progression.png  # 기구별 증량 추이 그래프
│   ├── workout_distribution.png   # 운동 부위별 분포
│   └── analysis_report.md         # 종합 분석 리포트
└── README.md                      # 프로젝트 설명
```

## 🎯 주요 기능

### 1. 데이터 파싱 (`parse_workout_data.py`)

ChatGPT 대화 내용에서 다음 정보를 자동으로 추출합니다:

- **인바디 데이터**: 체중, 골격근량, 체지방률
- **운동 기록**: 날짜별, 부위별, 기구별 무게/세트 정보
- **증량 추이**: 각 기구의 단계별 무게 변화

```bash
cd scripts
python3 parse_workout_data.py
```

### 2. 데이터 시각화 (`visualize_workout_data.py`)

파싱된 데이터를 다양한 그래프로 시각화합니다:

- 📊 인바디 변화 추이 그래프
- 📈 기구별 증량 추이 그래프  
- 🥧 운동 부위별 분포 차트
- 📄 종합 분석 리포트

```bash
cd scripts
python3 visualize_workout_data.py
```

## 📊 분석 결과 요약

### 인바디 변화 (2026.06.02 ~ 2026.06.30)

| 항목 | 시작 | 종료 | 변화량 |
|------|------|------|--------|
| 체중 | 62.8kg | 61.8kg | -1.0kg |
| 골격근량 | 27.4kg | 27.9kg | +0.5kg |
| 체지방률 | 21.9% | 19.5% | -2.4% |

✅ **리컴포지션 성공**: 체중은 감소했지만 골격근량은 증가한 이상적인 패턴!

### 주요 증량 추이

- **브이스쿼트**: 25kg → 40kg (+60%)
- **레그컬**: 50kg → 70kg (+40%)
- **체스트 프레스**: 31.5kg 유지 (자세 개선 중)

## 🚀 사용 방법

### 1. 환경 설정

```bash
# 필요한 패키지 설치
pip install matplotlib
```

### 2. 데이터 추가

전체 ChatGPT 대화 내용을 `data/chatgpt_conversation.txt` 파일에 복사합니다.

### 3. 분석 실행

```bash
# 데이터 파싱
cd scripts
python3 parse_workout_data.py

# 시각화 생성
python3 visualize_workout_data.py
```

### 4. 결과 확인

`output/` 폴더에서 생성된 그래프와 리포트를 확인합니다.

## 📌 다음 단계

### 1. 전체 데이터 수집
현재는 샘플 데이터만 분석되었습니다. 전체 대화 내용을 추가하면:
- 시간에 따른 루틴 변화 추적
- 모든 기구의 상세한 증량 패턴 분석
- 날짜별 컨디션과 성과 상관관계 분석

### 2. 추가 기능 개발
- [ ] 자동 운동 기록 추출 개선 (정규표현식 강화)
- [ ] 주간/월간 통계 대시보드
- [ ] 목표 설정 및 예상 달성 시기 계산
- [ ] 루틴 정립 과정 타임라인 시각화

### 3. 웹 대시보드
- GitHub Pages로 인터랙티브 대시보드 배포
- 실시간 데이터 업데이트 기능
- 모바일 친화적 UI

## 🛠️ 기술 스택

- **Python 3**: 데이터 처리 및 분석
- **matplotlib**: 데이터 시각화
- **JSON**: 구조화된 데이터 저장

## 📝 데이터 형식

### 입력 데이터 (`chatgpt_conversation.txt`)
```
6월 30일 (화) 오전 9:12
헬스 트레이너처럼 지식을 가지고 있어? 인바디 변화량에 대해서 궁금한데

시작 26.06.02
체중: 62.8
골격근량: 27.4
체지방률: 21.9
...
```

### 출력 데이터 (`workout_data.json`)
```json
{
  "inbody_records": [
    {
      "date": "2026-06-02",
      "weight": 62.8,
      "skeletal_muscle": 27.4,
      "body_fat_percentage": 21.9
    }
  ],
  "workout_records": [
    {
      "date": "2026-07-03",
      "type": "하체",
      "exercises": {
        "브이스쿼트": {"weight": 40.0},
        "레그프레스": {"weight": 40.0}
      }
    }
  ]
}
```

## 🤝 기여

더 많은 운동 기록을 추가하거나 분석 기능을 개선하고 싶으시면 언제든지 기여해주세요!

## 📄 라이선스

MIT License

---

**💪 건강한 운동 생활을 데이터로 기록하세요!**
