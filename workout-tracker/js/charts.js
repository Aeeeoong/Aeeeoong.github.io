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
function renderInbodyChart() {
  const records = storage.getInbodyRecords().reverse(); // 오래된 것부터
  
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

  inbodyChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: [
        {
          label: '체중 (kg)',
          data: records.map(r => r.weight),
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          tension: 0.3,
          fill: true
        },
        {
          label: '골격근량 (kg)',
          data: records.map(r => r.muscle),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.3,
          fill: true
        },
        {
          label: '체지방률 (%)',
          data: records.map(r => r.bodyFat),
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          tension: 0.3,
          fill: true,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      ...chartOptions,
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: '체중 / 골격근량 (kg)'
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: '체지방률 (%)'
          },
          grid: {
            drawOnChartArea: false
          }
        }
      }
    }
  });
}

// 운동별 중량 추이 차트
function renderExerciseChart(exerciseName) {
  const progress = storage.getExerciseProgress(exerciseName);
  
  if (progress.length === 0) {
    document.getElementById('exercise-chart').parentElement.innerHTML = 
      '<div class="empty-state">선택한 운동의 기록이 없습니다</div>';
    return;
  }

  const ctx = document.getElementById('exercise-chart');
  
  if (exerciseChart) {
    exerciseChart.destroy();
  }

  const dates = progress.map(p => {
    const d = new Date(p.date);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });

  exerciseChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: [{
        label: `${exerciseName} 무게 (kg)`,
        data: progress.map(p => p.weight),
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
            text: '무게 (kg)'
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
function renderDistributionChart() {
  const stats = storage.getWorkoutStats();
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

// 페이지 초기화
document.addEventListener('DOMContentLoaded', () => {
  // 인바디 차트
  renderInbodyChart();
  
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
