// 운동 트래커 - 차트 시각화

// 차트 인스턴스 저장
let inbodyChart = null;
let exerciseChart = null;
let distributionChart = null;

// 차트 공통 옵션
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'top'
    }
  }
};

// 인바디 차트 그리기
async function renderInbodyChart(mode = 'weight') {
  const allRecords = await storage.getInbodyRecords();
  const records = allRecords.reverse(); // 오래된 것부터
  
  if (records.length === 0) {
    document.getElementById('inbody-chart').parentElement.innerHTML = 
      '<div class="empty-state">인바디 데이터가 없습니다</div>';
    return;
  }

  const ctx = document.getElementById('inbody-chart');
  
  if (inbodyChart) {
    inbodyChart.destroy();
  }

  const dates = records.map(r => {
    const d = new Date(r.date);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });

  // Y축 범위 계산 함수
  const calculateYRange = (data) => {
    const values = data.filter(v => v != null);
    if (values.length === 0) return { min: 0, max: 100 };
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const padding = range * 0.1 || 1; // 최소 1 단위 여유
    
    return {
      min: Math.floor((min - padding) * 10) / 10,
      max: Math.ceil((max + padding) * 10) / 10
    };
  };

  let datasets = [];
  let scales = {};

  if (mode === 'weight') {
    // 체중만
    const weightData = records.map(r => r.weight);
    const range = calculateYRange(weightData);
    
    datasets = [{
      label: '체중 (kg)',
      data: weightData,
      borderColor: '#2563eb',
      backgroundColor: 'rgba(37, 99, 235, 0.2)',
      tension: 0.3,
      fill: true,
      pointRadius: 5,
      pointHoverRadius: 7
    }];
    
    scales = {
      y: {
        min: range.min,
        max: range.max,
        title: {
          display: true,
          text: '체중 (kg)'
        }
      }
    };
  } else if (mode === 'muscle') {
    // 골격근량만
    const muscleData = records.map(r => r.muscleMass);
    const range = calculateYRange(muscleData);
    
    datasets = [{
      label: '골격근량 (kg)',
      data: muscleData,
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.2)',
      tension: 0.3,
      fill: true,
      pointRadius: 5,
      pointHoverRadius: 7
    }];
    
    scales = {
      y: {
        min: range.min,
        max: range.max,
        title: {
          display: true,
          text: '골격근량 (kg)'
        }
      }
    };
  } else if (mode === 'bodyfat') {
    // 체지방률만
    const bodyFatData = records.map(r => r.bodyFat);
    const range = calculateYRange(bodyFatData);
    
    datasets = [{
      label: '체지방률 (%)',
      data: bodyFatData,
      borderColor: '#f59e0b',
      backgroundColor: 'rgba(245, 158, 11, 0.2)',
      tension: 0.3,
      fill: true,
      pointRadius: 5,
      pointHoverRadius: 7
    }];
    
    scales = {
      y: {
        min: range.min,
        max: range.max,
        title: {
          display: true,
          text: '체지방률 (%)'
        }
      }
    };
  }

  inbodyChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: datasets
    },
    options: {
      ...chartOptions,
      scales: scales
    }
  });
}

// 운동별 중량 추이 차트
async function renderExerciseChart(exerciseName) {
  const progress = await storage.getExerciseProgress(exerciseName);
  
  // 기존 차트 파괴
  if (exerciseChart) {
    exerciseChart.destroy();
    exerciseChart = null;
  }
  
  const chartContainer = document.querySelector('#exercise-chart')?.parentElement;
  if (!chartContainer) return;
  
  if (progress.length === 0) {
    chartContainer.innerHTML = '<div class="empty-state">선택한 운동의 기록이 없습니다</div>';
    return;
  }

  // 캔버스 재생성
  chartContainer.innerHTML = '<canvas id="exercise-chart"></canvas>';
  const ctx = document.getElementById('exercise-chart');
  
  if (!ctx) return;

  const dates = progress.map(p => {
    const d = new Date(p.date);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });

  // 무게 데이터 확인
  const hasWeight = progress.some(p => p.weight && p.weight > 0);
  
  // 무게가 없으면 회수로 차트 그리기
  const chartData = hasWeight 
    ? progress.map(p => p.weight) 
    : progress.map(p => p.reps);
  
  const chartLabel = hasWeight 
    ? `${exerciseName} 무게 (kg)` 
    : `${exerciseName} 회수`;
  
  const yAxisLabel = hasWeight ? '무게 (kg)' : '회수';

  exerciseChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: [{
        label: chartLabel,
        data: chartData,
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        tension: 0.3,
        fill: true,
        pointRadius: 5,
        pointHoverRadius: 7
      }]
    },
    options: {
      ...chartOptions,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: yAxisLabel
          }
        }
      },
      plugins: {
        ...chartOptions.plugins,
        tooltip: {
          callbacks: {
            afterLabel: function(context) {
              const index = context.dataIndex;
              const record = progress[index];
              let info = [];
              if (record.sets) info.push(`${record.sets} 세트`);
              if (record.reps) info.push(`${record.reps}회`);
              if (record.comment) info.push(record.comment);
              return info.join(' / ');
            }
          }
        }
      }
    }
  });
}

// 운동 분포 차트
async function renderDistributionChart() {
  const stats = await storage.getWorkoutStats();
  const types = Object.keys(stats.workoutsByType);
  const counts = Object.values(stats.workoutsByType);
  
  if (types.length === 0) {
    document.getElementById('distribution-chart').parentElement.innerHTML = 
      '<div class="empty-state">운동 기록이 없습니다</div>';
    return;
  }

  const ctx = document.getElementById('distribution-chart');
  
  if (distributionChart) {
    distributionChart.destroy();
  }

  distributionChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: types,
      datasets: [{
        data: counts,
        backgroundColor: [
          '#2563eb',
          '#10b981',
          '#f59e0b'
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom'
        }
      }
    }
  });
}

// 운동 선택 드롭다운 업데이트
function updateExerciseSelect(routine) {
  const exercises = storage.data.settings.exercises[routine];
  const select = document.getElementById('exercise-select');
  
  select.innerHTML = exercises.map(ex => 
    `<option value="${ex}">${ex}</option>`
  ).join('');
  
  // 첫 번째 운동의 차트 표시
  renderExerciseChart(exercises[0]);
}

// 다크모드 고정
function initTheme() {
  document.documentElement.setAttribute('data-theme', 'dark');
}

// 페이지 초기화
document.addEventListener('DOMContentLoaded', () => {
  // 다크모드 초기화
  initTheme();
  
  // 인바디 차트 (기본: 체중)
  renderInbodyChart('weight');
  
  // 인바디 탭 클릭 이벤트
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // 탭 활성화 상태 변경
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // 차트 다시 그리기
      const tab = btn.dataset.tab;
      renderInbodyChart(tab);
    });
  });
  
  // 운동 분포 차트
  renderDistributionChart();
  
  // 운동 루틴 선택
  const routineSelect = document.getElementById('routine-select');
  updateExerciseSelect(routineSelect.value);
  
  routineSelect.addEventListener('change', (e) => {
    updateExerciseSelect(e.target.value);
  });
  
  // 운동 선택
  document.getElementById('exercise-select').addEventListener('change', (e) => {
    renderExerciseChart(e.target.value);
  });
  
  // 네비게이션 활성화
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    if (item.dataset.page === 'stats') {
      item.classList.add('active');
    }
  });
});
