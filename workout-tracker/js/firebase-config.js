// Firebase 설정 파일
// FIREBASE_SETUP.md 가이드를 따라 여기에 본인의 Firebase 구성 정보를 입력하세요

const firebaseConfig = {
  apiKey: "AIzaSyDOw-42MCpUu9JWvbcRY4X-0Y6mp67oE_0",
  authDomain: "workout-tracker-ec237.firebaseapp.com",
  projectId: "workout-tracker-ec237",
  storageBucket: "workout-tracker-ec237.firebasestorage.app",
  messagingSenderId: "45881955462",
  appId: "1:45881955462:web:dcd4859031f50a21aded07"
};

// Firebase 초기화
let db = null;
let userId = null;

async function initializeFirebase() {
  try {
    // Firebase 설정이 아직 안 되어 있는지 확인
    if (firebaseConfig.apiKey === "YOUR_API_KEY") {
      console.warn('⚠️ Firebase 설정이 필요합니다. FIREBASE_SETUP.md를 참고하세요.');
      return false;
    }

    // Firebase 앱 초기화
    const app = firebase.initializeApp(firebaseConfig);
    
    // Firestore 초기화 (즉시 window에 할당)
    db = firebase.firestore();
    window.db = db;
    console.log('✅ Firestore 초기화 완료');
    
    // 익명 인증 (간단한 개인 사용)
    const userCredential = await firebase.auth().signInAnonymously();
    userId = userCredential.user.uid;
    window.userId = userId;
    console.log('✅ Firebase 연결 완료! User ID:', userId);
    
    // localStorage 데이터가 있으면 마이그레이션
    migrateFromLocalStorage();
    
    return true;
  } catch (error) {
    console.error('❌ Firebase 초기화 실패:', error);
    return false;
  }
}

// localStorage 데이터를 Firebase로 마이그레이션
async function migrateFromLocalStorage() {
  try {
    const localData = localStorage.getItem('workout_tracker_data');
    const migrated = localStorage.getItem('firebase_migrated');
    
    // 이미 마이그레이션 했거나 로컬 데이터가 없으면 스킵
    if (migrated || !localData) {
      return;
    }
    
    const data = JSON.parse(localData);
    
    // 운동 기록 마이그레이션
    if (data.workouts && data.workouts.length > 0) {
      console.log('🔄 운동 기록 마이그레이션 중...', data.workouts.length, '개');
      for (const workout of data.workouts) {
        await db.collection('users').doc(userId).collection('workouts').doc(String(workout.id)).set(workout);
      }
    }
    
    // 인바디 기록 마이그레이션
    if (data.inbody && data.inbody.length > 0) {
      console.log('🔄 인바디 기록 마이그레이션 중...', data.inbody.length, '개');
      for (const inbody of data.inbody) {
        await db.collection('users').doc(userId).collection('inbody').doc(String(inbody.id)).set(inbody);
      }
    }
    
    // 설정 마이그레이션
    if (data.settings) {
      console.log('🔄 설정 마이그레이션 중...');
      await db.collection('users').doc(userId).collection('settings').doc('config').set(data.settings);
    }
    
    // 마이그레이션 완료 표시
    localStorage.setItem('firebase_migrated', 'true');
    console.log('✅ 마이그레이션 완료! 이제 localStorage 데이터를 삭제해도 안전합니다.');
    
    // 사용자에게 알림
    if (typeof showNotification === 'function') {
      showNotification('✅ 데이터가 Firebase로 안전하게 이전되었습니다!');
    }
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
  }
}

// Firebase 초기화 실행
initializeFirebase();
