// 운동 트래커 - 메인 앱 로직

// 유틸리티 함수
const utils = {
  // 날짜 포맷 (YYYY-MM-DD)
  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  },

  // 날짜 표시 (YYYY년 MM월 DD일)
  displayDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  },

  // 오늘 날짜
  getTodayString() {
    return this.formatDate(new Date());
  },

  // 상대 시간 (몇 일 전)
  getRelativeTime(date) {
    const now = new Date();
    const target = new Date(date);
    const diffTime = now - target;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '오늘';
    if (diffDays === 1) return '어제';
    if (diffDays < 7) return `${diffDays}일 전`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
    return `${Math.floor(diffDays / 30)}개월 전`;
  },

  // 숫자 포맷 (소수점 1자리)
  formatNumber(num, decimal = 1) {
    return parseFloat(num).toFixed(decimal);
  },

  // 변화량 계산
  calculateChange(current, previous) {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous * 100);
  },

  // 변화량 표시
  displayChange(change) {
    const formatted = Math.abs(change).toFixed(1);
    if (change > 0) return `+${formatted}%`;
    if (change < 0) return `-${formatted}%`;
    return '0%';
  }
};

// 달력 관련
let currentCalendarDate = new Date();

async function renderCalendar() {
  try {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    // 월 표시
    const monthTitle = document.getElementById('calendar-month');
    if (monthTitle) {
      monthTitle.textContent = `${year}년 ${month + 1}월`;
    }
    
    const calendar = document.getElementById('workout-calendar');
    if (!calendar) return;
    
    calendar.innerHTML = '';
    
    // 요일 헤더
    ['일', '월', '화', '수', '목', '금', '토'].forEach(day => {
      const header = document.createElement('div');
      header.className = 'calendar-day-header';
      header.textContent = day;
      calendar.appendChild(header);
    });
    
    // 달력 날짜 계산
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const prevLastDay = new Date(year, month, 0);
    
    const firstDayOfWeek = firstDay.getDay();
    const lastDate = lastDay.getDate();
    const prevLastDate = prevLastDay.getDate();
    
    // 운동 기록 가져오기
    const allWorkouts = await storage.getWorkouts();
    const workoutDates = new Set(allWorkouts.map(w => w.date));
    
    // 오늘 날짜
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    // 이전 달 날짜
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = document.createElement('div');
      day.className = 'calendar-day empty';
      day.textContent = prevLastDate - i;
      calendar.appendChild(day);
    }
    
    // 이번 달 날짜
    for (let date = 1; date <= lastDate; date++) {
      const day = document.createElement('div');
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
      
      day.className = 'calendar-day';
      day.textContent = date;
      
      if (workoutDates.has(dateStr)) {
        day.classList.add('has-workout');
        day.style.cursor = 'pointer';
        day.addEventListener('click', () => {
          const dayWorkouts = allWorkouts.filter(w => w.date === dateStr);
          if (dayWorkouts.length > 0) {
            const workout = dayWorkouts[0];
            alert(`${dateStr}\n\n${workout.type} 운동\n${workout.exercises.length}개 운동 완료`);
          }
        });
      }
      
      if (dateStr === todayStr) {
        day.classList.add('today');
      }
      
      calendar.appendChild(day);
    }
    
    // 다음 달 날짜
    const remainingDays = 42 - (firstDayOfWeek + lastDate);
    for (let date = 1; date <= remainingDays; date++) {
      const day = document.createElement('div');
      day.className = 'calendar-day empty';
      day.textContent = date;
      calendar.appendChild(day);
    }
  } catch (error) {
    console.error('달력 렌더링 오류:', error);
  }
}

// 페이지별 초기화 함수
const pages = {
  // 메인 대시보드
  async initDashboard() {
    const stats = await storage.getWorkoutStats();
    const latestInbody = await storage.getLatestInbody();
    const recentWorkouts = (await storage.getWorkouts()).slice(0, 5);

    // 통계 업데이트
    document.getElementById('total-workouts').textContent = stats.totalWorkouts;
    document.getElementById('recent-workouts').textContent = stats.recentWorkouts;
    
    // 인바디 정보
    if (latestInbody) {
      document.getElementById('current-weight').textContent = 
        utils.formatNumber(latestInbody.weight);
      document.getElementById('current-muscle').textContent = 
        utils.formatNumber(latestInbody.muscle);
      
      // 이전 인바디와 비교
      const inbodyRecords = await storage.getInbodyRecords();
      if (inbodyRecords.length > 1) {
        const previous = inbodyRecords[1];
        const weightChange = latestInbody.weight - previous.weight;
        const muscleChange = latestInbody.muscle - previous.muscle;
        
        document.getElementById('weight-change').textContent = 
          `${weightChange >= 0 ? '+' : ''}${utils.formatNumber(weightChange)}kg`;
        document.getElementById('muscle-change').textContent = 
          `${muscleChange >= 0 ? '+' : ''}${utils.formatNumber(muscleChange)}kg`;
      }
    }

    // 최근 운동 기록
    const historyList = document.getElementById('recent-history');
    if (recentWorkouts.length === 0) {
      historyList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-text">아직 운동 기록이 없습니다</div>
          <a href="record.html" class="btn btn-primary">첫 운동 기록하기</a>
        </div>
      `;
    } else {
      historyList.innerHTML = recentWorkouts.map(workout => `
        <li class="history-item">
          <div class="history-date">${utils.displayDate(workout.date)}</div>
          <span class="history-type">${workout.type}</span>
          <div>${workout.exercises.length}개 운동</div>
        </li>
      `).join('');
    }
    
    // 달력 렌더링
    if (document.getElementById('workout-calendar')) {
      await renderCalendar();
      
      // 달력 네비게이션
      document.getElementById('prev-month').addEventListener('click', async () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        await renderCalendar();
      });
      
      document.getElementById('next-month').addEventListener('click', async () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        await renderCalendar();
      });
    }
  },

  // 운동 기록 입력 페이지
  initRecord() {
    const dateInput = document.getElementById('workout-date');
    dateInput.value = utils.getTodayString();

    const typeSelect = document.getElementById('workout-type');
    typeSelect.addEventListener('change', (e) => {
      this.renderExerciseForm(e.target.value);
    });

    // 초기 폼 렌더링
    this.renderExerciseForm(typeSelect.value);

    // 저장 버튼
    document.getElementById('save-workout').addEventListener('click', async () => {
      await this.saveWorkout();
    });
  },

  renderExerciseForm(type) {
    const exercises = storage.data.settings.exercises[type];
    const container = document.getElementById('exercise-form');
    
    container.innerHTML = exercises.map((exercise, index) => `
      <div class="exercise-item">
        <div class="exercise-name">${exercise}</div>
        <div class="exercise-inputs">
          <div class="input-group">
            <label>무게 (kg)</label>
            <input type="number" step="0.5" 
                   id="weight-${index}" 
                   placeholder="0">
          </div>
          <div class="input-group">
            <label>세트</label>
            <input type="number" 
                   id="sets-${index}" 
                   placeholder="0">
          </div>
          <div class="input-group">
            <label>회</label>
            <input type="number" 
                   id="reps-${index}" 
                   placeholder="0">
          </div>
        </div>
        <div class="input-group">
          <label>코멘트</label>
          <input type="text" 
                 id="comment-${index}" 
                 placeholder="예: 자세 좋음, 마지막 세트 힘듦">
        </div>
      </div>
    `).join('');
  },

  async saveWorkout() {
    const date = document.getElementById('workout-date').value;
    const type = document.getElementById('workout-type').value;
    const exercises = storage.data.settings.exercises[type];
    
    const workoutExercises = exercises.map((name, index) => {
      const weight = document.getElementById(`weight-${index}`).value;
      const sets = document.getElementById(`sets-${index}`).value;
      const reps = document.getElementById(`reps-${index}`).value;
      const comment = document.getElementById(`comment-${index}`).value;
      
      // 입력된 값이 있는 경우만 저장
      if (weight || sets || reps || comment) {
        return {
          name,
          weight: weight ? parseFloat(weight) : null,
          sets: sets ? parseInt(sets) : null,
          reps: reps ? parseInt(reps) : null,
          comment: comment || ''
        };
      }
      return null;
    }).filter(e => e !== null);

    if (workoutExercises.length === 0) {
      alert('최소 1개 이상의 운동을 입력해주세요.');
      return;
    }

    await storage.addWorkout({
      date,
      type,
      exercises: workoutExercises
    });

    alert('운동 기록이 저장되었습니다! 💪');
    window.location.href = 'index.html';
  },

  // 인바디 기록 페이지
  async initInbody() {
    const dateInput = document.getElementById('inbody-date');
    dateInput.value = utils.getTodayString();

    // 최근 인바디 표시
    const latest = await storage.getLatestInbody();
    if (latest) {
      document.getElementById('last-weight').textContent = 
        `최근: ${utils.formatNumber(latest.weight)}kg`;
      document.getElementById('last-muscle').textContent = 
        `최근: ${utils.formatNumber(latest.muscle)}kg`;
      document.getElementById('last-bodyfat').textContent = 
        `최근: ${utils.formatNumber(latest.bodyFat)}%`;
    }

    // 저장 버튼
    document.getElementById('save-inbody').addEventListener('click', async () => {
      await this.saveInbody();
    });

    // 인바디 히스토리
    await this.renderInbodyHistory();
  },

  async saveInbody() {
    const date = document.getElementById('inbody-date').value;
    const weight = document.getElementById('weight').value;
    const muscle = document.getElementById('muscle').value;
    const bodyFat = document.getElementById('bodyfat').value;

    if (!weight || !muscle || !bodyFat) {
      alert('모든 항목을 입력해주세요.');
      return;
    }

    await storage.addInbody({
      date,
      weight,
      muscle,
      bodyFat
    });

    alert('인바디 기록이 저장되었습니다! 📊');
    
    // 폼 초기화
    document.getElementById('weight').value = '';
    document.getElementById('muscle').value = '';
    document.getElementById('bodyfat').value = '';
    
    // 히스토리 갱신
    await this.renderInbodyHistory();
  },

  async renderInbodyHistory() {
    const records = await storage.getInbodyRecords(10);
    const container = document.getElementById('inbody-history');
    
    if (records.length === 0) {
      container.innerHTML = '<div class="empty-state">기록이 없습니다</div>';
      return;
    }

    container.innerHTML = `
      <ul class="history-list">
        ${records.map((record, index) => {
          let change = '';
          if (index < records.length - 1) {
            const prev = records[index + 1];
            const weightChange = record.weight - prev.weight;
            const muscleChange = record.muscle - prev.muscle;
            change = `
              <small style="color: var(--text-secondary)">
                체중 ${weightChange >= 0 ? '+' : ''}${utils.formatNumber(weightChange)}kg,
                근육 ${muscleChange >= 0 ? '+' : ''}${utils.formatNumber(muscleChange)}kg
              </small>
            `;
          }
          return `
            <li class="history-item">
              <div class="history-date">${utils.displayDate(record.date)}</div>
              <div>
                체중: ${utils.formatNumber(record.weight)}kg | 
                골격근: ${utils.formatNumber(record.muscle)}kg | 
                체지방: ${utils.formatNumber(record.bodyFat)}%
              </div>
              ${change}
            </li>
          `;
        }).join('')}
      </ul>
    `;
  }
};

// 다크모드 고정
function initTheme() {
  document.documentElement.setAttribute('data-theme', 'dark');
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
  // 다크모드 초기화
  initTheme();
  
  const page = document.body.dataset.page;
  
  // 현재 페이지 네비게이션 활성화
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    if (item.dataset.page === page) {
      item.classList.add('active');
    }
  });

  // 페이지별 초기화
  switch(page) {
    case 'dashboard':
      pages.initDashboard();
      break;
    case 'record':
      pages.initRecord();
      break;
    case 'inbody':
      pages.initInbody();
      break;
  }
});
