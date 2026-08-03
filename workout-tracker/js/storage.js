// 운동 트래커 - Firebase Firestore 데이터 저장 관리

class WorkoutStorage {
  constructor() {
    this.STORAGE_KEY = 'workout_tracker_data';
    this.data = this.getDefaultData();
    this.loadData(); // 즉시 localStorage 로드
    this.isFirebaseReady = false;
    this.waitForFirebase();
  }

  // Firebase 준비 대기
  async waitForFirebase() {
    const maxWait = 50; // 5초 대기
    let attempts = 0;
    
    while (!window.db && attempts < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (window.db) {
      this.isFirebaseReady = true;
      console.log('✅ Firebase 연결 완료');
    } else {
      console.warn('⚠️ Firebase 연결 실패, localStorage 사용');
    }
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

  // 데이터 로드 (localStorage 백업용)
  loadData() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.data = JSON.parse(stored);
        return;
      }
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    }
    this.data = this.getDefaultData();
  }

  // 데이터 저장 (localStorage 백업용)
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
  async addWorkout(workout) {
    const newWorkout = {
      id: Date.now(),
      date: workout.date,
      type: workout.type,
      exercises: workout.exercises,
      createdAt: new Date().toISOString()
    };
    
    if (this.isFirebaseReady && window.db && window.userId) {
      try {
        await window.db.collection('users').doc(window.userId)
          .collection('workouts').doc(String(newWorkout.id)).set(newWorkout);
        console.log('✅ 운동 기록 저장됨 (Firebase)');
      } catch (error) {
        console.error('❌ Firebase 저장 실패:', error);
        // 백업으로 localStorage 사용
        this.data.workouts.push(newWorkout);
        this.saveData();
      }
    } else {
      // localStorage 사용
      this.data.workouts.push(newWorkout);
      this.saveData();
    }
    
    return newWorkout;
  }

  // 운동 기록 수정
  async updateWorkout(id, updates) {
    if (this.isFirebaseReady && window.db && window.userId) {
      try {
        await window.db.collection('users').doc(window.userId)
          .collection('workouts').doc(String(id)).update(updates);
        console.log('✅ 운동 기록 수정됨 (Firebase)');
        return { id, ...updates };
      } catch (error) {
        console.error('❌ Firebase 수정 실패:', error);
      }
    }
    
    // localStorage 백업
    const index = this.data.workouts.findIndex(w => w.id === id);
    if (index !== -1) {
      this.data.workouts[index] = { ...this.data.workouts[index], ...updates };
      this.saveData();
      return this.data.workouts[index];
    }
    return null;
  }

  // 운동 기록 삭제
  async deleteWorkout(id) {
    if (this.isFirebaseReady && window.db && window.userId) {
      try {
        await window.db.collection('users').doc(window.userId)
          .collection('workouts').doc(String(id)).delete();
        console.log('✅ 운동 기록 삭제됨 (Firebase)');
        return true;
      } catch (error) {
        console.error('❌ Firebase 삭제 실패:', error);
      }
    }
    
    // localStorage 백업
    const index = this.data.workouts.findIndex(w => w.id === id);
    if (index !== -1) {
      this.data.workouts.splice(index, 1);
      this.saveData();
      return true;
    }
    return false;
  }

  // 운동 기록 가져오기
  async getWorkouts(filters = {}) {
    if (this.isFirebaseReady && window.db && window.userId) {
      try {
        let query = window.db.collection('users').doc(window.userId).collection('workouts');
        
        // 타입 필터
        if (filters.type) {
          query = query.where('type', '==', filters.type);
        }
        
        const snapshot = await query.get();
        let workouts = [];
        snapshot.forEach(doc => {
          workouts.push(doc.data());
        });
        
        // 날짜 필터 (클라이언트 사이드)
        if (filters.startDate) {
          workouts = workouts.filter(w => new Date(w.date) >= new Date(filters.startDate));
        }
        if (filters.endDate) {
          workouts = workouts.filter(w => new Date(w.date) <= new Date(filters.endDate));
        }
        
        // 정렬 (최신순)
        workouts.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        return workouts;
      } catch (error) {
        console.error('❌ Firebase 조회 실패:', error);
      }
    }
    
    // localStorage 백업
    let workouts = [...this.data.workouts];
    
    if (filters.startDate) {
      workouts = workouts.filter(w => new Date(w.date) >= new Date(filters.startDate));
    }
    if (filters.endDate) {
      workouts = workouts.filter(w => new Date(w.date) <= new Date(filters.endDate));
    }
    if (filters.type) {
      workouts = workouts.filter(w => w.type === filters.type);
    }
    
    workouts.sort((a, b) => new Date(b.date) - new Date(a.date));
    return workouts;
  }

  // 특정 운동 기록 가져오기
  async getWorkout(id) {
    if (this.isFirebaseReady && window.db && window.userId) {
      try {
        const doc = await window.db.collection('users').doc(window.userId)
          .collection('workouts').doc(String(id)).get();
        return doc.exists ? doc.data() : null;
      } catch (error) {
        console.error('❌ Firebase 조회 실패:', error);
      }
    }
    
    return this.data.workouts.find(w => w.id === id);
  }

  // 인바디 기록 추가
  async addInbody(inbody) {
    const newInbody = {
      id: Date.now(),
      date: inbody.date,
      weight: parseFloat(inbody.weight),
      muscle: parseFloat(inbody.muscle),
      bodyFat: parseFloat(inbody.bodyFat),
      createdAt: new Date().toISOString()
    };
    
    if (this.isFirebaseReady && window.db && window.userId) {
      try {
        await window.db.collection('users').doc(window.userId)
          .collection('inbody').doc(String(newInbody.id)).set(newInbody);
        console.log('✅ 인바디 기록 저장됨 (Firebase)');
      } catch (error) {
        console.error('❌ Firebase 저장 실패:', error);
        this.data.inbody.push(newInbody);
        this.saveData();
      }
    } else {
      this.data.inbody.push(newInbody);
      this.saveData();
    }
    
    return newInbody;
  }

  // 인바디 기록 가져오기
  async getInbodyRecords(limit = null) {
    if (this.isFirebaseReady && window.db && window.userId) {
      try {
        const snapshot = await window.db.collection('users').doc(window.userId)
          .collection('inbody').orderBy('date', 'desc').get();
        let records = [];
        snapshot.forEach(doc => {
          records.push(doc.data());
        });
        return limit ? records.slice(0, limit) : records;
      } catch (error) {
        console.error('❌ Firebase 조회 실패:', error);
      }
    }
    
    const records = [...this.data.inbody].sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );
    return limit ? records.slice(0, limit) : records;
  }

  // 최신 인바디 기록
  async getLatestInbody() {
    if (this.isFirebaseReady && window.db && window.userId) {
      try {
        const snapshot = await window.db.collection('users').doc(window.userId)
          .collection('inbody').orderBy('date', 'desc').limit(1).get();
        if (!snapshot.empty) {
          return snapshot.docs[0].data();
        }
        return null;
      } catch (error) {
        console.error('❌ Firebase 조회 실패:', error);
      }
    }
    
    if (this.data.inbody.length === 0) return null;
    return this.data.inbody.sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    )[0];
  }

  // 특정 운동 기구의 무게 추이
  async getExerciseProgress(exerciseName) {
    const progress = [];
    const workouts = await this.getWorkouts();
    
    workouts
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .forEach(workout => {
        const exercise = workout.exercises.find(e => e.name === exerciseName);
        if (exercise) {
          let weight, sets, reps;
          
          // 상세 모드인 경우 최대 무게 사용
          if (exercise.mode === 'detailed' && exercise.setsDetail && exercise.setsDetail.length > 0) {
            const maxWeightSet = exercise.setsDetail.reduce((max, set) => 
              (set.weight || 0) > (max.weight || 0) ? set : max
            , exercise.setsDetail[0]);
            
            weight = maxWeightSet.weight;
            sets = exercise.setsDetail.length;
            reps = maxWeightSet.reps;
          } else {
            // 간편 모드 또는 기존 데이터
            weight = exercise.weight;
            sets = exercise.sets;
            reps = exercise.reps;
          }
          
          if (weight) {
            progress.push({
              date: workout.date,
              weight: parseFloat(weight),
              sets: parseInt(sets) || 0,
              reps: parseInt(reps) || 0,
              comment: exercise.comment || '',
              mode: exercise.mode || 'simple',
              setsDetail: exercise.setsDetail || null
            });
          }
        }
      });
    
    return progress;
  }

  // 운동 통계
  async getWorkoutStats() {
    const workouts = await this.getWorkouts();
    const totalWorkouts = workouts.length;
    const workoutsByType = {};
    
    workouts.forEach(workout => {
      workoutsByType[workout.type] = (workoutsByType[workout.type] || 0) + 1;
    });
    
    // 최근 7일 운동 횟수
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentWorkouts = workouts.filter(w => 
      new Date(w.date) >= sevenDaysAgo
    ).length;
    
    return {
      totalWorkouts,
      workoutsByType,
      recentWorkouts,
      lastWorkout: workouts.length > 0 ? workouts[0] : null
    };
  }

  // 데이터 내보내기
  exportData() {
    return JSON.stringify(this.data, null, 2);
  }

  // 데이터 가져오기
  async importData(jsonStringOrObject) {
    try {
      let imported;
      
      // 문자열이면 파싱, 객체면 그대로 사용
      if (typeof jsonStringOrObject === 'string') {
        imported = JSON.parse(jsonStringOrObject);
      } else {
        imported = jsonStringOrObject;
      }
      
      // localStorage에 저장 (항상)
      this.data = imported;
      this.saveData();
      console.log('✅ localStorage에 저장 완료');
      
      // Firebase에도 데이터 추가 (설정되어 있다면)
      if (this.isFirebaseReady && window.db && window.userId) {
        // 운동 기록 추가
        if (imported.workouts && imported.workouts.length > 0) {
          for (const workout of imported.workouts) {
            await window.db.collection('users').doc(window.userId)
              .collection('workouts').doc(String(workout.id)).set(workout);
          }
          console.log(`✅ ${imported.workouts.length}개 운동 기록 Firebase에도 저장`);
        }
        
        // 인바디 기록 추가
        if (imported.inbody && imported.inbody.length > 0) {
          for (const inbody of imported.inbody) {
            await window.db.collection('users').doc(window.userId)
              .collection('inbody').doc(String(inbody.id)).set(inbody);
          }
          console.log(`✅ ${imported.inbody.length}개 인바디 기록 Firebase에도 저장`);
        }
        
        // 설정 업데이트
        if (imported.settings) {
          await window.db.collection('users').doc(window.userId)
            .collection('settings').doc('config').set(imported.settings);
          console.log('✅ 설정 Firebase에도 저장');
        }
      }
      
      return true;
    } catch (error) {
      console.error('데이터 가져오기 실패:', error);
      throw error;
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
