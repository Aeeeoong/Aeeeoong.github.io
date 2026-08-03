// 기존 데이터를 "보섭" 계정으로 마이그레이션하는 스크립트
// 브라우저 콘솔에서 실행하세요

(function() {
  console.log('=== 데이터 마이그레이션 시작 ===');
  
  // 1. 기존 데이터 확인
  const oldData = localStorage.getItem('workout_tracker_data');
  
  if (!oldData) {
    console.log('❌ 기존 데이터가 없습니다.');
    return;
  }
  
  console.log('✅ 기존 데이터 발견:', oldData.length, '바이트');
  
  // 2. "보섭" 키로 복사
  const newKey = 'workout_tracker_data_보섭';
  localStorage.setItem(newKey, oldData);
  console.log('✅ 데이터를 "보섭" 계정으로 복사 완료');
  
  // 3. Firebase 데이터도 확인
  if (window.db && window.userId) {
    console.log('✅ Firebase 연결 확인 - User ID:', window.userId);
    console.log('ℹ️  Firebase 데이터는 자동으로 "보섭" 사용자 이름으로 저장됩니다.');
  } else {
    console.log('⚠️ Firebase가 연결되지 않았습니다.');
  }
  
  // 4. 완료
  console.log('');
  console.log('=== 마이그레이션 완료 ===');
  console.log('다음 단계:');
  console.log('1. 페이지를 새로고침하세요');
  console.log('2. 로그인 페이지에서 "보섭"으로 로그인하세요');
  console.log('3. 데이터가 제대로 표시되는지 확인하세요');
  console.log('');
  console.log('기존 익명 데이터 정리 (선택사항):');
  console.log('localStorage.removeItem("workout_tracker_data");');
  console.log('localStorage.removeItem("firebase_migrated");');
})();
