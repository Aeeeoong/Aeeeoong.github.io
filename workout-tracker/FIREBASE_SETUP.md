# 🔥 Firebase 설정 가이드 (10분 완성!)

## 1단계: Firebase 프로젝트 생성 (3분)

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름 입력 (예: `workout-tracker`)
4. Google 애널리틱스 **사용 안 함** (선택)
5. "프로젝트 만들기" 클릭

## 2단계: Firestore 데이터베이스 생성 (2분)

1. 왼쪽 메뉴에서 **"Firestore Database"** 클릭
2. "데이터베이스 만들기" 클릭
3. **"테스트 모드에서 시작"** 선택 (나중에 보안 규칙 설정 가능)
4. 위치: `asia-northeast3 (서울)` 선택
5. "사용 설정" 클릭

## 3단계: 웹 앱 추가 (3분)

1. 프로젝트 개요 페이지에서 **웹 아이콘(`</>`)** 클릭
2. 앱 닉네임 입력 (예: `workout-tracker-web`)
3. "Firebase 호스팅 설정" **체크 안 함**
4. "앱 등록" 클릭
5. **Firebase 구성 정보 복사** (아래와 같은 형식)

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

## 4단계: 구성 정보 입력 (2분)

1. `workout-tracker/js/firebase-config.js` 파일 열기
2. 위에서 복사한 정보를 붙여넣기

```javascript
// 여기에 복사한 firebaseConfig 붙여넣기
const firebaseConfig = {
  apiKey: "여기에_본인의_API_KEY",
  authDomain: "여기에_본인의_AUTH_DOMAIN",
  projectId: "여기에_본인의_PROJECT_ID",
  storageBucket: "여기에_본인의_STORAGE_BUCKET",
  messagingSenderId: "여기에_본인의_SENDER_ID",
  appId: "여기에_본인의_APP_ID"
};
```

## ✅ 완료!

설정이 끝나면:
1. 앱을 새로고침
2. 기존 localStorage 데이터가 자동으로 Firebase로 이전됩니다
3. 이제 어느 기기에서든 동일한 데이터 접근 가능!

## 🔒 보안 규칙 설정 (선택사항)

Firebase Console → Firestore Database → 규칙 탭에서:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 개인 사용자만 자신의 데이터 읽기/쓰기 가능
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

**주의**: 테스트 모드는 30일 후 자동으로 비활성화됩니다. 위 보안 규칙을 설정하세요!

## ❓ 문제 해결

### "Permission denied" 오류
- Firestore 규칙을 테스트 모드로 변경
- 또는 인증 추가 (Google 로그인 등)

### 데이터가 안 보임
1. Firebase Console에서 Firestore 데이터 확인
2. 브라우저 콘솔(F12)에서 오류 확인
3. `firebase-config.js`의 설정 정보 재확인

### 여러 기기에서 접근하고 싶음
- Firebase Authentication 추가 (Google, 이메일 로그인 등)
- 현재는 익명 사용자로 설정되어 있어 한 기기당 하나의 데이터셋

---

**💡 팁**: Firebase Console의 Firestore Database 탭에서 실시간으로 데이터 확인 가능!
