// 운동 트래커 - 데이터 저장 관리

class WorkoutStorage {
  constructor() {
    this.STORAGE_KEY = 'workout_tracker_data';
    this.data = this.loadData();
  }

  // 데이터 구조 초기화
  getDefaultData() {
    return {
      workouts: [],
      inbody: [],
      settings: {
        routineOrder: ['하체', '등', '가슴어깨'],
        exercises: {
          '하체': [
            '브이스쿼트',
            '레그프레스',
            '레그익스텐션',
            '레그컬',
            '어브덕션',
            '어덕션'
          ],
          '등': [
            '랫풀다운',
            'MTS rows',
            '아이소 랫풀다운',
            '어시스트 풀업',
            '오버헤드 프레스'
          ],
          '가슴어깨': [
            '체스트 프레스',
            '플라이',
            '복근',
            '케이블 푸시다운',
            '어시스트 딥'
          ]
        }
      }
    };
  }

  // 데이터 로드
  loadData() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    }
    return this.getDefaultData();
  }

  // 데이터 저장
  saveData() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
      return true;
    } catch (error) {
      console.error('데이터 저장 실패:', error);
      return false;
    }
  }

  // 운동 기록 추가
  addWorkout(workout) {
    const newWorkout = {
      id: Date.now(),
      date: workout.date,
      type: workout.type,
      exercises: workout.exercises,
      createdAt: new Date().toISOString()
    };
    this.data.workouts.push(newWorkout);
    this.saveData();
    return newWorkout;
  }

  // 운동 기록 수정
  updateWorkout(id, updates) {
    const index = this.data.workouts.findIndex(w => w.id === id);
    if (index !== -1) {
      this.data.workouts[index] = { ...this.data.workouts[index], ...updates };
      this.saveData();
      return this.data.workouts[index];
    }
    return null;
  }

  // 운동 기록 삭제
  deleteWorkout(id) {
    const index = this.data.workouts.findIndex(w => w.id === id);
    if (index !== -1) {
      this.data.workouts.splice(index, 1);
      this.saveData();
      return true;
    }
    return false;
  }

  // 운동 기록 가져오기
  getWorkouts(filters = {}) {
    let workouts = [...this.data.workouts];
    
    // 날짜 필터
    if (filters.startDate) {
      workouts = workouts.filter(w => new Date(w.date) >= new Date(filters.startDate));
    }
    if (filters.endDate) {
      workouts = workouts.filter(w => new Date(w.date) <= new Date(filters.endDate));
    }
    
    // 타입 필터
    if (filters.type) {
      workouts = workouts.filter(w => w.type === filters.type);
    }
    
    // 정렬 (최신순)
    workouts.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return workouts;
  }

  // 특정 운동 기록 가져오기
  getWorkout(id) {
    return this.data.workouts.find(w => w.id === id);
  }

  // 인바디 기록 추가
  addInbody(inbody) {
    const newInbody = {
      id: Date.now(),
      date: inbody.date,
      weight: parseFloat(inbody.weight),
      muscle: parseFloat(inbody.muscle),
      bodyFat: parseFloat(inbody.bodyFat),
      createdAt: new Date().toISOString()
    };
    this.data.inbody.push(newInbody);
    this.saveData();
    return newInbody;
  }

  // 인바디 기록 가져오기
  getInbodyRecords(limit = null) {
    const records = [...this.data.inbody].sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );
    return limit ? records.slice(0, limit) : records;
  }

  // 최신 인바디 기록
  getLatestInbody() {
    if (this.data.inbody.length === 0) return null;
    return this.data.inbody.sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    )[0];
  }

  // 특정 운동 기구의 무게 추이
  getExerciseProgress(exerciseName) {
    const progress = [];
    
    this.data.workouts
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .forEach(workout => {
        const exercise = workout.exercises.find(e => e.name === exerciseName);
        if (exercise && exercise.weight) {
          progress.push({
            date: workout.date,
            weight: parseFloat(exercise.weight),
            sets: parseInt(exercise.sets) || 0,
            reps: parseInt(exercise.reps) || 0,
            comment: exercise.comment || ''
          });
        }
      });
    
    return progress;
  }

  // 운동 통계
  getWorkoutStats() {
    const totalWorkouts = this.data.workouts.length;
    const workoutsByType = {};
    
    this.data.workouts.forEach(workout => {
      workoutsByType[workout.type] = (workoutsByType[workout.type] || 0) + 1;
    });
    
    // 최근 7일 운동 횟수
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentWorkouts = this.data.workouts.filter(w => 
      new Date(w.date) >= sevenDaysAgo
    ).length;
    
    return {
      totalWorkouts,
      workoutsByType,
      recentWorkouts,
      lastWorkout: this.data.workouts.length > 0 
        ? this.getWorkouts()[0] 
        : null
    };
  }

  // 데이터 내보내기
  exportData() {
    return JSON.stringify(this.data, null, 2);
  }

  // 데이터 가져오기
  importData(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      this.data = imported;
      this.saveData();
      return true;
    } catch (error) {
      console.error('데이터 가져오기 실패:', error);
      return false;
    }
  }

  // 데이터 초기화
  resetData() {
    if (confirm('정말로 모든 데이터를 삭제하시겠습니까?')) {
      this.data = this.getDefaultData();
      this.saveData();
      return true;
    }
    return false;
  }
}

// 전역 인스턴스 생성
const storage = new WorkoutStorage();
