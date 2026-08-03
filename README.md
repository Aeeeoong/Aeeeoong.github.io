# 운동 트래커 (React)

개인 운동/인바디 기록 앱. **Firebase Firestore가 유일한 저장소**입니다.

- 라이브: https://aeeeoong.github.io/ (루트 — 예전 `/workout-tracker/` 경로는 제거됨)
- 스택: Vite + React + React Router + Firebase + Chart.js

## Firebase가 로컬에만 저장되던 이유 (수정됨)

예전 바닐라 코드는 Firebase 준비 전에 `WorkoutStorage`가 만들어지고, 대기 조건도 잘못되어 쓰기가 **조용히 localStorage로만** 떨어졌습니다.

지금은:

1. 로그인 후 Firebase 익명 인증 + Firestore가 준비될 때까지 앱 진입을 막음
2. 모든 저장/조회는 Firestore만 사용
3. 실패 시 에러를 보여 주고 로컬에 몰래 저장하지 않음
4. 예전 localStorage 데이터가 있고 클라우드가 비어 있으면 **로그인 시 1회 자동 이전**

## 매일(또는 수정 후) 배포 방법

### A. 추천 — GitHub Actions 자동 배포

```bash
# 로컬에서 확인
npm run dev

# 문제 없으면 커밋 후 push (직접 실행)
git add .
git commit -m "변경 내용"
git push origin main
```

1. `main`에 push하면 Actions가 `npm ci` → `npm run build` → Pages 배포
2. GitHub → **Actions** 에서 **Deploy to GitHub Pages** 성공 확인
3. https://aeeeoong.github.io/ 새로고침

**최초 1회** GitHub 저장소 설정:

1. **Settings → Pages → Build and deployment → Source** 를 **GitHub Actions** 로 변경

**Firebase Console** 확인:

1. Authentication → Sign-in method → **Anonymous** 사용
2. Authentication → Settings → Authorized domains 에 `aeeeoong.github.io`, `localhost` 포함
3. Firestore Rules (개인용 예시 — 경로가 username이라 UID 매칭 규칙이면 깨짐):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### B. 로컬 개발

```bash
npm install
npm run dev
```

http://localhost:5173

### C. 빌드만 확인

```bash
npm run build
npm run preview
```

## 예전 데이터 / JSON

- 로그인 시 자동 마이그레이션 (클라우드 비어 있을 때만)
- 설정 → **JSON 가져오기 → Firebase**
- 샘플: `public/workout-data-import.json`

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` | `dist/` 생성 |
| `npm run preview` | 빌드 미리보기 |
