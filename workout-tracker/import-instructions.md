# 운동일지 데이터 임포트 가이드

## 📊 정리된 데이터 (2026년 7월)

ChatGPT 대화 「인바디 변화 분석」에서 추출한 **7월 운동기록**입니다.

### 운동 기록 (총 18회)
- 📅 2026-07-01 ~ 2026-07-28
- 🦵 하체: 7회
- 🦅 등: 6회
- 💪 가슴어깨: 5회

### 인바디 기록 (3회)
| 날짜 | 체중 | 골격근 | 체지방 |
|---|---:|---:|---:|
| 2026-06-02 | 62.8kg | 27.4kg | 21.9% |
| 2026-06-30 | 61.8kg | 27.9kg | 19.5% |
| 2026-07-30 | 62.2kg | 28.2kg | 19.5% |

### 관련 파일
| 파일 | 설명 |
|---|---|
| `workout-data-import.json` | **앱 임포트용** (이 파일) |
| `docs/7월-운동기록-사용자만.md` | 원본 대화 텍스트 |
| `docs/7월-운동기록-날짜별-표.md` | 날짜별 표 정리 |

## 🚀 임포트 방법

### 방법 1: 설정 페이지에서 임포트 (추천)

1. 앱 접속: https://aeeeoong.github.io/workout-tracker/
2. 하단 메뉴 → **설정**
3. **데이터 관리** 섹션
4. **데이터 가져오기** 클릭
5. `workout-data-import.json` 파일 선택
6. 완료!

### 방법 2: GitHub에서 직접 다운로드

```
https://github.com/aeeeoong/aeeeoong.github.io/blob/main/workout-tracker/workout-data-import.json
```

### 방법 3: 브라우저 콘솔

```javascript
fetch('/workout-tracker/workout-data-import.json')
  .then(res => res.json())
  .then(data => storage.importData(data))
  .then(() => {
    alert('✅ 데이터 임포트 완료!');
    location.reload();
  });
```

## ✅ 임포트 후 확인

- 📈 **통계** 탭: 18회 운동 기록
- 📊 **인바디** 탭: 6월·7월 그래프
- 📝 **내역** 탭: 날짜별 기록

## 📌 참고

- 세트별 무게가 다른 운동은 **상세 모드**(`setsDetail`)로 저장됨
- MTS rows, 플라이, 레그컬 등은 **핀 숫자**(kg 아님)일 수 있음
- 7/12 레그프레스 마지막 세트: 35kg (당일 보정 반영)
