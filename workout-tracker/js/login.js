// 로그인 처리
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const usernameInput = document.getElementById('username');
  const username = usernameInput.value.trim();
  const errorMessage = document.getElementById('error-message');
  
  // 유효성 검사
  if (!username) {
    errorMessage.textContent = '사용자 이름을 입력해주세요';
    errorMessage.classList.add('show');
    return;
  }
  
  if (username.length < 2) {
    errorMessage.textContent = '사용자 이름은 2글자 이상이어야 합니다';
    errorMessage.classList.add('show');
    return;
  }
  
  if (username.length > 20) {
    errorMessage.textContent = '사용자 이름은 20글자 이하여야 합니다';
    errorMessage.classList.add('show');
    return;
  }
  
  // 특수문자 제한 (한글, 영문, 숫자만 허용)
  if (!/^[가-힣a-zA-Z0-9]+$/.test(username)) {
    errorMessage.textContent = '한글, 영문, 숫자만 사용 가능합니다';
    errorMessage.classList.add('show');
    return;
  }
  
  // 로그인 처리
  try {
    errorMessage.classList.remove('show');
    
    // localStorage에 사용자 이름 저장
    localStorage.setItem('currentUser', username);
    
    console.log('✅ 로그인 성공:', username);
    
    // 홈으로 이동
    window.location.href = './index.html';
  } catch (error) {
    console.error('로그인 실패:', error);
    errorMessage.textContent = '로그인 중 오류가 발생했습니다';
    errorMessage.classList.add('show');
  }
});

// Enter 키 처리
document.getElementById('username').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('login-form').dispatchEvent(new Event('submit'));
  }
});
