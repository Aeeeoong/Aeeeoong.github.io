// 운동 트래커 - 설정 페이지

let currentRoutine = null; // 현재 편집 중인 루틴
let editingRoutineIndex = null; // 편집 중인 루틴 인덱스
let editingExerciseIndex = null; // 편집 중인 운동 인덱스

// 루틴 목록 렌더링
function renderRoutines() {
  const container = document.getElementById('routines-list');
  const settings = storage.data.settings;
  
  if (!settings.routineOrder || settings.routineOrder.length === 0) {
    container.innerHTML = '<div class="empty-state">루틴이 없습니다. 루틴을 추가해주세요.</div>';
    return;
  }
  
  container.innerHTML = settings.routineOrder.map((routineName, index) => {
    const exercises = settings.exercises[routineName] || [];
    
    return `
      <div class="routine-card" data-index="${index}">
        <div class="routine-header">
          <div>
            <h3 class="routine-name">${routineName}</h3>
            <p class="routine-count">${exercises.length}개 운동</p>
          </div>
          <div class="routine-actions">
            <button class="btn-icon" onclick="moveRoutine(${index}, -1)" ${index === 0 ? 'disabled' : ''} title="위로">
              ↑
            </button>
            <button class="btn-icon" onclick="moveRoutine(${index}, 1)" ${index === settings.routineOrder.length - 1 ? 'disabled' : ''} title="아래로">
              ↓
            </button>
            <button class="btn-icon" onclick="editRoutine(${index})" title="편집">
              ✏️
            </button>
            <button class="btn-icon danger" onclick="deleteRoutine(${index})" title="삭제">
              🗑️
            </button>
          </div>
        </div>
        
        <div class="exercises-list">
          ${exercises.length > 0 ? exercises.map((exercise, exIndex) => `
            <div class="exercise-item-settings">
              <span class="exercise-name">${exercise}</span>
              <div class="exercise-actions">
                <button class="btn-icon-small" onclick="moveExercise('${routineName}', ${exIndex}, -1)" ${exIndex === 0 ? 'disabled' : ''}>↑</button>
                <button class="btn-icon-small" onclick="moveExercise('${routineName}', ${exIndex}, 1)" ${exIndex === exercises.length - 1 ? 'disabled' : ''}>↓</button>
                <button class="btn-icon-small" onclick="editExercise('${routineName}', ${exIndex})">✏️</button>
                <button class="btn-icon-small danger" onclick="deleteExercise('${routineName}', ${exIndex})">×</button>
              </div>
            </div>
          `).join('') : '<div class="empty-state-small">운동이 없습니다</div>'}
          
          <button class="btn-add-exercise" onclick="addExercise('${routineName}')">
            + 운동 추가
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// 루틴 추가 모달 열기
function openRoutineModal() {
  document.getElementById('modal-title').textContent = '루틴 추가';
  document.getElementById('routine-name').value = '';
  document.getElementById('routine-modal').style.display = 'flex';
  editingRoutineIndex = null;
}

// 루틴 편집 모달 열기
function editRoutine(index) {
  const routineName = storage.data.settings.routineOrder[index];
  document.getElementById('modal-title').textContent = '루틴 편집';
  document.getElementById('routine-name').value = routineName;
  document.getElementById('routine-modal').style.display = 'flex';
  editingRoutineIndex = index;
}

// 루틴 모달 닫기
function closeRoutineModal() {
  document.getElementById('routine-modal').style.display = 'none';
  editingRoutineIndex = null;
}

// 루틴 저장
async function saveRoutine() {
  const name = document.getElementById('routine-name').value.trim();
  
  if (!name) {
    alert('루틴 이름을 입력하세요.');
    return;
  }
  
  if (editingRoutineIndex !== null) {
    // 편집
    const oldName = storage.data.settings.routineOrder[editingRoutineIndex];
    storage.data.settings.routineOrder[editingRoutineIndex] = name;
    
    // 운동 목록도 이름 변경
    if (oldName !== name) {
      storage.data.settings.exercises[name] = storage.data.settings.exercises[oldName] || [];
      delete storage.data.settings.exercises[oldName];
    }
  } else {
    // 추가
    if (storage.data.settings.routineOrder.includes(name)) {
      alert('이미 존재하는 루틴 이름입니다.');
      return;
    }
    
    storage.data.settings.routineOrder.push(name);
    storage.data.settings.exercises[name] = [];
  }
  
  await saveSettings();
  closeRoutineModal();
  renderRoutines();
}

// 루틴 삭제
async function deleteRoutine(index) {
  const routineName = storage.data.settings.routineOrder[index];
  const exercises = storage.data.settings.exercises[routineName] || [];
  
  if (exercises.length > 0) {
    if (!confirm(`"${routineName}" 루틴에 ${exercises.length}개의 운동이 있습니다. 정말 삭제하시겠습니까?`)) {
      return;
    }
  } else {
    if (!confirm(`"${routineName}" 루틴을 삭제하시겠습니까?`)) {
      return;
    }
  }
  
  storage.data.settings.routineOrder.splice(index, 1);
  delete storage.data.settings.exercises[routineName];
  
  await saveSettings();
  renderRoutines();
}

// 루틴 순서 변경
async function moveRoutine(index, direction) {
  const routines = storage.data.settings.routineOrder;
  const newIndex = index + direction;
  
  if (newIndex < 0 || newIndex >= routines.length) return;
  
  [routines[index], routines[newIndex]] = [routines[newIndex], routines[index]];
  
  await saveSettings();
  renderRoutines();
}

// 운동 추가 모달 열기
function addExercise(routineName) {
  currentRoutine = routineName;
  document.getElementById('exercise-modal-title').textContent = `${routineName} - 운동 추가`;
  document.getElementById('exercise-name').value = '';
  document.getElementById('exercise-modal').style.display = 'flex';
  editingExerciseIndex = null;
}

// 운동 편집 모달 열기
function editExercise(routineName, exIndex) {
  currentRoutine = routineName;
  const exerciseName = storage.data.settings.exercises[routineName][exIndex];
  document.getElementById('exercise-modal-title').textContent = `${routineName} - 운동 편집`;
  document.getElementById('exercise-name').value = exerciseName;
  document.getElementById('exercise-modal').style.display = 'flex';
  editingExerciseIndex = exIndex;
}

// 운동 모달 닫기
function closeExerciseModal() {
  document.getElementById('exercise-modal').style.display = 'none';
  currentRoutine = null;
  editingExerciseIndex = null;
}

// 운동 저장
async function saveExercise() {
  const name = document.getElementById('exercise-name').value.trim();
  
  if (!name) {
    alert('운동 이름을 입력하세요.');
    return;
  }
  
  if (!currentRoutine) {
    alert('루틴을 선택하세요.');
    return;
  }
  
  const exercises = storage.data.settings.exercises[currentRoutine] || [];
  
  if (editingExerciseIndex !== null) {
    // 편집
    exercises[editingExerciseIndex] = name;
  } else {
    // 추가
    if (exercises.includes(name)) {
      alert('이미 존재하는 운동 이름입니다.');
      return;
    }
    exercises.push(name);
  }
  
  storage.data.settings.exercises[currentRoutine] = exercises;
  
  await saveSettings();
  closeExerciseModal();
  renderRoutines();
}

// 운동 삭제
async function deleteExercise(routineName, exIndex) {
  const exerciseName = storage.data.settings.exercises[routineName][exIndex];
  
  if (!confirm(`"${exerciseName}" 운동을 삭제하시겠습니까?`)) {
    return;
  }
  
  storage.data.settings.exercises[routineName].splice(exIndex, 1);
  
  await saveSettings();
  renderRoutines();
}

// 운동 순서 변경
async function moveExercise(routineName, exIndex, direction) {
  const exercises = storage.data.settings.exercises[routineName];
  const newIndex = exIndex + direction;
  
  if (newIndex < 0 || newIndex >= exercises.length) return;
  
  [exercises[exIndex], exercises[newIndex]] = [exercises[newIndex], exercises[exIndex]];
  
  await saveSettings();
  renderRoutines();
}

// 설정 저장 (Firebase + localStorage)
async function saveSettings() {
  // localStorage 저장
  storage.saveData();
  
  // Firebase 저장
  if (storage.isFirebaseReady && window.db && window.userId) {
    try {
      await window.db.collection('users').doc(window.userId)
        .collection('settings').doc('config').set(storage.data.settings);
      console.log('✅ 설정 저장됨 (Firebase)');
    } catch (error) {
      console.error('❌ Firebase 저장 실패:', error);
    }
  }
}

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

// 설정 초기화
async function resetSettings() {
  if (!confirm('설정을 초기화하시겠습니까? 루틴과 운동 목록이 기본값으로 되돌아갑니다. (운동 기록은 유지됩니다)')) {
    return;
  }
  
  const defaultData = storage.getDefaultData();
  storage.data.settings = defaultData.settings;
  
  await saveSettings();
  renderRoutines();
  alert('설정이 초기화되었습니다.');
}

// 다크모드 고정
function initTheme() {
  document.documentElement.setAttribute('data-theme', 'dark');
}

// 페이지 초기화
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  
  // Firebase 대기
  await storage.waitForFirebase();
  
  // 루틴 렌더링
  renderRoutines();
  
  // 이벤트 리스너
  document.getElementById('add-routine-btn').addEventListener('click', openRoutineModal);
  document.getElementById('save-routine-btn').addEventListener('click', saveRoutine);
  document.getElementById('save-exercise-btn').addEventListener('click', saveExercise);
  
  document.getElementById('export-data').addEventListener('click', exportData);
  document.getElementById('import-data').addEventListener('click', importData);
  document.getElementById('reset-settings').addEventListener('click', resetSettings);
  
  // 파일 선택
  document.getElementById('import-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const success = storage.importData(event.target.result);
        if (success) {
          alert('데이터를 성공적으로 가져왔습니다! 📥');
          renderRoutines();
        } else {
          alert('데이터 가져오기 실패. JSON 형식을 확인해주세요.');
        }
      };
      reader.readAsText(file);
    }
  });
  
  // 네비게이션 활성화
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    const href = item.getAttribute('href');
    if (href && href.includes('settings.html')) {
      item.classList.add('active');
    }
  });
  
  // 모달 외부 클릭 시 닫기
  document.getElementById('routine-modal').addEventListener('click', (e) => {
    if (e.target.id === 'routine-modal') {
      closeRoutineModal();
    }
  });
  
  document.getElementById('exercise-modal').addEventListener('click', (e) => {
    if (e.target.id === 'exercise-modal') {
      closeExerciseModal();
    }
  });
});
