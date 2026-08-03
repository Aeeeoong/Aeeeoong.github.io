// 인증 관련 유틸리티

// 현재 로그인한 사용자 가져오기
export function getCurrentUser() {
  return localStorage.getItem('currentUser');
}

// 로그인 여부 확인
export function isLoggedIn() {
  return !!getCurrentUser();
}

// 로그인 체크 (로그인 안 되어 있으면 로그인 페이지로 이동)
export function requireAuth() {
  const currentUser = getCurrentUser();
  
  // 로그인 페이지나 특정 페이지는 체크 제외
  const currentPath = window.location.pathname;
  if (currentPath.includes('login.html')) {
    return;
  }
  
  if (!currentUser) {
    console.log('⚠️ 로그인 필요 - 로그인 페이지로 이동');
    window.location.href = './login.html';
    return;
  }
  
  console.log('✅ 로그인 확인:', currentUser);
  window.currentUser = currentUser;
}

// 로그아웃
export function logout() {
  const currentUser = getCurrentUser();
  console.log('👋 로그아웃:', currentUser);
  
  localStorage.removeItem('currentUser');
  window.location.href = './login.html';
}

// 페이지 로드 시 자동으로 로그인 체크
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', requireAuth);
} else {
  requireAuth();
}
