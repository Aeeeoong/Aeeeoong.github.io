// 운동 트래커 - 히스토리 페이지

async function renderHistory(filterType = '') {
  const filters = filterType ? { type: filterType } : {};
  const workouts = await storage.getWorkouts(filters);
  const container = document.getElementById('history-container');
  
  if (workouts.length === 0) {
    container.innerHTML = `
      <div class="card">
        <div class="empty-state">
          <div class="empty-state-icon">📝</div>
          <div class="empty-state-text">운동 기록이 없습니다</div>
          <a href="record.html" class="btn btn-primary">첫 운동 기록하기</a>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = workouts.map(workout => `
    <div class="card">
      <div class="card-header">
        <div>
          <div style="font-size: 0.95rem; color: var(--text-secondary);">
            ${utils.displayDate(workout.date)} (${utils.getRelativeTime(workout.date)})
          </div>
          <span class="history-type">${workout.type}</span>
        </div>
        <button class="btn" 
                style="padding: 0.5rem 1rem; font-size: 0.9rem; background: var(--danger); color: white;"
                onclick="deleteWorkout(${workout.id})">
          삭제
        </button>
      </div>
      
      <div style="display: grid; gap: 0.75rem; margin-top: 1rem;">
        ${workout.exercises.map(ex => {
          // 상세 모드인지 확인
          const isDetailed = ex.mode === 'detailed' && ex.setsDetail && ex.setsDetail.length > 0;
          
          return `
            <div style="background: var(--bg-main); padding: 0.75rem; border-radius: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <div style="font-weight: 600;">${ex.name}</div>
                ${isDetailed ? '<span style="font-size: 0.75rem; color: var(--primary); background: var(--bg); padding: 0.25rem 0.5rem; border-radius: 4px;">상세</span>' : ''}
              </div>
              
              ${isDetailed ? `
                <!-- 상세 모드: 세트별 표시 -->
                <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem;">
                  ${ex.setsDetail.map(set => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: var(--bg); border-radius: 6px;">
                      <span style="color: var(--text-secondary); font-size: 0.875rem; font-weight: 600;">${set.set}세트</span>
                      <span style="color: var(--text-primary); font-size: 0.875rem;">
                        ${set.weight ? `${set.weight}kg` : '-'} × ${set.reps ? `${set.reps}회` : '-'}
                      </span>
                    </div>
                  `).join('')}
                </div>
              ` : `
                <!-- 간편 모드: 요약 표시 -->
                <div style="color: var(--text-secondary); font-size: 0.95rem;">
                  ${ex.weight ? `${ex.weight}kg` : ''} 
                  ${ex.sets ? `${ex.sets} 세트` : ''} 
                  ${ex.reps ? `${ex.reps}회` : ''}
                </div>
              `}
              
              ${ex.comment ? `
                <div style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.5rem; font-style: italic;">
                  💬 ${ex.comment}
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `).join('');
}

async function deleteWorkout(id) {
  if (confirm('이 운동 기록을 삭제하시겠습니까?')) {
    await storage.deleteWorkout(id);
    const filterType = document.getElementById('filter-type').value;
    await renderHistory(filterType);
  }
}

// 유틸리티 함수 (app.js에서 복사)
const utils = {
  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  },

  displayDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  },

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
  }
};

// 데이터 내보내기
function exportData() {
  const data = storage.exportData();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `workout-tracker-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  alert('데이터가 내보내기되었습니다! 💾');
}

// 데이터 가져오기
function importData() {
  document.getElementById('import-file').click();
}

// 다크모드 고정
function initTheme() {
  document.documentElement.setAttribute('data-theme', 'dark');
}

// 페이지 초기화
document.addEventListener('DOMContentLoaded', async () => {
  // 다크모드 초기화
  initTheme();
  
  // 초기 렌더링
  await renderHistory();
  
  // 필터 변경
  document.getElementById('filter-type').addEventListener('change', async (e) => {
    await renderHistory(e.target.value);
  });
  
  // 데이터 내보내기
  document.getElementById('export-data').addEventListener('click', exportData);
  
  // 데이터 가져오기
  document.getElementById('import-data').addEventListener('click', importData);
  
  // 파일 선택
  document.getElementById('import-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          await storage.importData(event.target.result);
          alert('데이터를 성공적으로 가져왔습니다! 📥');
          await renderHistory();
        } catch (error) {
          alert('데이터 가져오기 실패. JSON 형식을 확인해주세요.');
          console.error('Import error:', error);
        }
      };
      reader.readAsText(file);
    }
  });
  
  // 네비게이션 활성화
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    if (item.dataset.page === 'history') {
      item.classList.add('active');
    }
  });
});
