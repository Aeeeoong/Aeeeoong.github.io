// Pull-to-Refresh (당겨서 새로고침)

class PullToRefresh {
  constructor() {
    this.startY = 0;
    this.currentY = 0;
    this.pulling = false;
    this.threshold = 80; // 새로고침 임계값 (px)
    this.maxPull = 120; // 최대 당기기 거리 (px)
    
    this.init();
  }
  
  init() {
    // 새로고침 인디케이터 생성
    this.createIndicator();
    
    // 터치 이벤트 리스너
    document.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: true });
    document.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.onTouchEnd.bind(this));
  }
  
  createIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'pull-to-refresh-indicator';
    indicator.innerHTML = `
      <div class="ptr-spinner"></div>
      <div class="ptr-text">당겨서 새로고침</div>
    `;
    document.body.insertBefore(indicator, document.body.firstChild);
    this.indicator = indicator;
  }
  
  onTouchStart(e) {
    // 페이지 최상단에서만 작동
    if (window.scrollY === 0) {
      this.startY = e.touches[0].pageY;
      this.pulling = false;
    }
  }
  
  onTouchMove(e) {
    if (window.scrollY > 0) return;
    
    this.currentY = e.touches[0].pageY;
    const pullDistance = this.currentY - this.startY;
    
    // 아래로 당기는 경우만
    if (pullDistance > 0) {
      this.pulling = true;
      
      // 최대 거리 제한
      const distance = Math.min(pullDistance, this.maxPull);
      const progress = Math.min(distance / this.threshold, 1);
      
      // 인디케이터 표시 및 위치 조정
      this.indicator.style.transform = `translateY(${distance}px)`;
      this.indicator.style.opacity = progress;
      
      // 텍스트 변경
      const text = this.indicator.querySelector('.ptr-text');
      const spinner = this.indicator.querySelector('.ptr-spinner');
      
      if (distance >= this.threshold) {
        text.textContent = '놓으면 새로고침';
        spinner.style.transform = 'rotate(180deg)';
      } else {
        text.textContent = '당겨서 새로고침';
        spinner.style.transform = 'rotate(0deg)';
      }
      
      // 스크롤 방지
      if (pullDistance > 10) {
        e.preventDefault();
      }
    }
  }
  
  onTouchEnd() {
    if (!this.pulling) return;
    
    const pullDistance = this.currentY - this.startY;
    
    // 임계값 이상이면 새로고침
    if (pullDistance >= this.threshold) {
      this.refresh();
    } else {
      this.reset();
    }
    
    this.pulling = false;
  }
  
  async refresh() {
    const text = this.indicator.querySelector('.ptr-text');
    const spinner = this.indicator.querySelector('.ptr-spinner');
    
    text.textContent = '새로고침 중...';
    spinner.classList.add('spinning');
    
    // 애니메이션을 위한 짧은 지연
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // 페이지 새로고침
    window.location.reload();
  }
  
  reset() {
    this.indicator.style.transform = 'translateY(0)';
    this.indicator.style.opacity = '0';
    
    const spinner = this.indicator.querySelector('.ptr-spinner');
    spinner.style.transform = 'rotate(0deg)';
    spinner.classList.remove('spinning');
  }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
  new PullToRefresh();
});
