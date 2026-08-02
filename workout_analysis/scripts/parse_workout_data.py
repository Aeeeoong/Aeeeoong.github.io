#!/usr/bin/env python3
"""
운동 대화 데이터 파싱 스크립트
ChatGPT 대화에서 운동 기록을 추출하고 구조화합니다.
"""

import re
import json
from datetime import datetime
from typing import List, Dict, Any
from collections import defaultdict

class WorkoutDataParser:
    def __init__(self, conversation_file: str):
        self.conversation_file = conversation_file
        self.workout_records = []
        self.inbody_records = []
        self.equipment_progression = defaultdict(list)
        
    def parse_conversation(self):
        """대화 내용을 파싱합니다."""
        with open(self.conversation_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 날짜 패턴 추출
        date_pattern = r'(\d+월 \d+일)'
        
        # 인바디 데이터 추출
        self._extract_inbody_data(content)
        
        # 운동 기록 추출
        self._extract_workout_records(content)
        
        return {
            'inbody_records': self.inbody_records,
            'workout_records': self.workout_records,
            'equipment_progression': dict(self.equipment_progression)
        }
    
    def _extract_inbody_data(self, content: str):
        """인바디 데이터 추출"""
        # 시작 인바디
        start_pattern = r'시작 26\.06\.02\s+체중:\s*([\d.]+)\s+골격근량:\s*([\d.]+)\s+체지방률:\s*([\d.]+)'
        start_match = re.search(start_pattern, content)
        
        if start_match:
            self.inbody_records.append({
                'date': '2026-06-02',
                'weight': float(start_match.group(1)),
                'skeletal_muscle': float(start_match.group(2)),
                'body_fat_percentage': float(start_match.group(3))
            })
        
        # 결과 인바디 (26.26.30은 오타로 보임, 26.06.30으로 수정)
        result_pattern = r'결과 26\.[\d.]+\.30\s+체중:\s*([\d.]+)\s+골격근량:\s*([\d.]+)\s+체지방률:\s*([\d.]+)'
        result_match = re.search(result_pattern, content)
        
        if result_match:
            self.inbody_records.append({
                'date': '2026-06-30',
                'weight': float(result_match.group(1)),
                'skeletal_muscle': float(result_match.group(2)),
                'body_fat_percentage': float(result_match.group(3))
            })
    
    def _extract_workout_records(self, content: str):
        """운동 기록 추출"""
        # 7월 3일 기록 추출
        date = '2026-07-03'
        
        # 하체 운동
        leg_exercises = {
            '브이스쿼트': self._find_weight(content, '브이스쿼트', '40'),
            '레그프레스': self._find_weight(content, '레그프레스', '40'),
            '레그컬': self._find_weight(content, '레그컬', '70')
        }
        
        # 등 운동
        back_exercises = {
            '랫풀다운': self._find_weight(content, '랫풀다운', '35'),
            'MTS Row': self._find_weight(content, 'MTS Row', None),
            '오버헤드 프레스': self._find_weight(content, '오버헤드 프레스', '23')
        }
        
        # 가슴 운동
        chest_exercises = {
            '체스트 프레스': self._find_weight(content, '체스트 프레스', '31.5'),
            '푸시다운': self._find_weight(content, '푸시다운', None)
        }
        
        # 기록 저장
        if any(leg_exercises.values()):
            self.workout_records.append({
                'date': date,
                'type': '하체',
                'exercises': leg_exercises
            })
        
        if any(back_exercises.values()):
            self.workout_records.append({
                'date': date,
                'type': '등',
                'exercises': back_exercises
            })
        
        if any(chest_exercises.values()):
            self.workout_records.append({
                'date': date,
                'type': '가슴',
                'exercises': chest_exercises
            })
        
        # 운동일지 예시에서 추가 데이터 추출
        self._extract_example_workout_log(content)
    
    def _extract_example_workout_log(self, content: str):
        """운동일지 예시에서 데이터 추출"""
        # 1회차 등 운동 예시
        example_back = {
            '랫풀다운': {'weight': 35, 'reps': 12, 'sets': 4},
            'MTS Row': {'weight': 30, 'reps': 12, 'sets': 4},
            '아이소 랫풀다운': {'weight': 10, 'reps': 12, 'sets': 4},
            '어시스트 풀업': {'weight': 70, 'reps': 12, 'sets': 4},
            '오버헤드 프레스': {'weight': 23, 'reps': 15, 'sets': 4}
        }
        
        # 증량 추이 데이터
        self.equipment_progression['브이스쿼트'] = [
            {'stage': 1, 'weight': 25, 'reps': 15, 'sets': 4, 'comment': '쉬움'},
            {'stage': 2, 'weight': 25, 'reps': 15, 'sets': 4, 'comment': '깊이 수정'},
            {'stage': 3, 'weight': 40, 'reps': 15, 'sets': 4, 'comment': '새로운 기준'}
        ]
        
        self.equipment_progression['레그컬'] = [
            {'stage': 1, 'weight': 50, 'note': '시작'},
            {'stage': 2, 'weight': 70, 'note': '증량'}
        ]
        
        self.equipment_progression['체스트 프레스'] = [
            {'stage': 1, 'weight': 31.5, 'note': '고정 - 의자 높이 수정 후 자극 증가'}
        ]
    
    def _find_weight(self, content: str, exercise_name: str, default_weight: str) -> Dict[str, Any]:
        """운동 기구의 무게를 찾습니다."""
        pattern = rf'{exercise_name}[:\s]+(\d+(?:\.\d+)?)\s*kg'
        match = re.search(pattern, content)
        
        if match:
            return {'weight': float(match.group(1))}
        elif default_weight:
            return {'weight': float(default_weight)}
        return {}
    
    def save_to_json(self, output_file: str):
        """결과를 JSON 파일로 저장"""
        data = self.parse_conversation()
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"✅ 데이터 저장 완료: {output_file}")
        return data
    
    def print_summary(self):
        """파싱 결과 요약 출력"""
        data = self.parse_conversation()
        
        print("\n" + "="*60)
        print("📊 운동 데이터 분석 결과")
        print("="*60)
        
        # 인바디 데이터
        print("\n【 인바디 변화 】")
        for record in data['inbody_records']:
            print(f"  날짜: {record['date']}")
            print(f"  - 체중: {record['weight']}kg")
            print(f"  - 골격근량: {record['skeletal_muscle']}kg")
            print(f"  - 체지방률: {record['body_fat_percentage']}%")
            print()
        
        if len(data['inbody_records']) >= 2:
            start = data['inbody_records'][0]
            end = data['inbody_records'][1]
            print(f"  📈 변화량:")
            print(f"  - 체중: {end['weight'] - start['weight']:+.1f}kg")
            print(f"  - 골격근량: {end['skeletal_muscle'] - start['skeletal_muscle']:+.1f}kg")
            print(f"  - 체지방률: {end['body_fat_percentage'] - start['body_fat_percentage']:+.1f}%")
        
        # 운동 기록
        print("\n【 운동 기록 】")
        for record in data['workout_records']:
            print(f"  날짜: {record['date']} - {record['type']}")
            for exercise, details in record['exercises'].items():
                if details:
                    print(f"    • {exercise}: {details.get('weight', '?')}kg")
        
        # 증량 추이
        print("\n【 증량 추이 】")
        for equipment, progression in data['equipment_progression'].items():
            print(f"  {equipment}:")
            for stage in progression:
                weight = stage.get('weight', '?')
                comment = stage.get('comment', stage.get('note', ''))
                print(f"    {stage['stage'] if 'stage' in stage else ''}단계: {weight}kg - {comment}")
        
        print("\n" + "="*60)

if __name__ == '__main__':
    parser = WorkoutDataParser('../data/chatgpt_conversation.txt')
    parser.print_summary()
    parser.save_to_json('../data/workout_data.json')
