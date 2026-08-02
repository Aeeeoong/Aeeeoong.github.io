#!/usr/bin/env python3
"""
운동 데이터 시각화 스크립트
파싱된 운동 데이터를 그래프로 시각화합니다.
"""

import json
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
from datetime import datetime
import os

# 한글 폰트 설정
plt.rcParams['font.family'] = 'DejaVu Sans'
plt.rcParams['axes.unicode_minus'] = False

class WorkoutVisualizer:
    def __init__(self, data_file: str, output_dir: str):
        self.data_file = data_file
        self.output_dir = output_dir
        
        with open(data_file, 'r', encoding='utf-8') as f:
            self.data = json.load(f)
        
        os.makedirs(output_dir, exist_ok=True)
    
    def visualize_inbody_changes(self):
        """인바디 변화 시각화"""
        inbody_data = self.data['inbody_records']
        
        if len(inbody_data) < 2:
            print("⚠️  인바디 데이터가 부족합니다.")
            return
        
        dates = [record['date'] for record in inbody_data]
        weights = [record['weight'] for record in inbody_data]
        skeletal_muscles = [record['skeletal_muscle'] for record in inbody_data]
        body_fats = [record['body_fat_percentage'] for record in inbody_data]
        
        fig, axes = plt.subplots(1, 3, figsize=(15, 5))
        fig.suptitle('InBody Changes (2026.06)', fontsize=16, fontweight='bold')
        
        # 체중 변화
        axes[0].plot(dates, weights, marker='o', linewidth=2, markersize=10, color='#2E86AB')
        axes[0].set_title('Weight (kg)', fontsize=12, fontweight='bold')
        axes[0].set_ylabel('Weight (kg)', fontsize=10)
        axes[0].grid(True, alpha=0.3)
        for i, (date, weight) in enumerate(zip(dates, weights)):
            axes[0].annotate(f'{weight}kg', 
                           xy=(i, weight), 
                           xytext=(0, 10),
                           textcoords='offset points',
                           ha='center',
                           fontsize=9)
        
        # 골격근량 변화
        axes[1].plot(dates, skeletal_muscles, marker='o', linewidth=2, markersize=10, color='#A23B72')
        axes[1].set_title('Skeletal Muscle (kg)', fontsize=12, fontweight='bold')
        axes[1].set_ylabel('Muscle (kg)', fontsize=10)
        axes[1].grid(True, alpha=0.3)
        for i, (date, muscle) in enumerate(zip(dates, skeletal_muscles)):
            axes[1].annotate(f'{muscle}kg', 
                           xy=(i, muscle), 
                           xytext=(0, 10),
                           textcoords='offset points',
                           ha='center',
                           fontsize=9)
        
        # 체지방률 변화
        axes[2].plot(dates, body_fats, marker='o', linewidth=2, markersize=10, color='#F18F01')
        axes[2].set_title('Body Fat %', fontsize=12, fontweight='bold')
        axes[2].set_ylabel('Body Fat (%)', fontsize=10)
        axes[2].grid(True, alpha=0.3)
        for i, (date, fat) in enumerate(zip(dates, body_fats)):
            axes[2].annotate(f'{fat}%', 
                           xy=(i, fat), 
                           xytext=(0, 10),
                           textcoords='offset points',
                           ha='center',
                           fontsize=9)
        
        plt.tight_layout()
        output_path = os.path.join(self.output_dir, 'inbody_changes.png')
        plt.savefig(output_path, dpi=300, bbox_inches='tight')
        print(f"✅ 인바디 변화 그래프 저장: {output_path}")
        plt.close()
    
    def visualize_equipment_progression(self):
        """기구별 증량 추이 시각화"""
        progression_data = self.data['equipment_progression']
        
        if not progression_data:
            print("⚠️  증량 추이 데이터가 없습니다.")
            return
        
        fig, ax = plt.subplots(figsize=(12, 6))
        
        colors = ['#06A77D', '#D4B483', '#C1666B', '#4281A4', '#48A9A6']
        
        for idx, (equipment, records) in enumerate(progression_data.items()):
            stages = [i+1 for i in range(len(records))]
            weights = [record['weight'] for record in records]
            
            ax.plot(stages, weights, 
                   marker='o', 
                   linewidth=2.5, 
                   markersize=10, 
                   label=equipment,
                   color=colors[idx % len(colors)])
            
            # 주석 추가
            for stage, weight, record in zip(stages, weights, records):
                comment = record.get('comment', record.get('note', ''))
                ax.annotate(f'{weight}kg\n{comment}', 
                          xy=(stage, weight), 
                          xytext=(0, 15),
                          textcoords='offset points',
                          ha='center',
                          fontsize=8,
                          bbox=dict(boxstyle='round,pad=0.3', 
                                  facecolor=colors[idx % len(colors)], 
                                  alpha=0.3))
        
        ax.set_xlabel('Stage', fontsize=12, fontweight='bold')
        ax.set_ylabel('Weight (kg)', fontsize=12, fontweight='bold')
        ax.set_title('Equipment Weight Progression', fontsize=14, fontweight='bold')
        ax.legend(loc='upper left', fontsize=10)
        ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        output_path = os.path.join(self.output_dir, 'equipment_progression.png')
        plt.savefig(output_path, dpi=300, bbox_inches='tight')
        print(f"✅ 증량 추이 그래프 저장: {output_path}")
        plt.close()
    
    def visualize_workout_distribution(self):
        """운동 부위별 분포 시각화"""
        workout_records = self.data['workout_records']
        
        if not workout_records:
            print("⚠️  운동 기록 데이터가 없습니다.")
            return
        
        # 부위별 카운트
        body_parts = {}
        for record in workout_records:
            part = record['type']
            body_parts[part] = body_parts.get(part, 0) + 1
        
        fig, ax = plt.subplots(figsize=(8, 8))
        
        colors = ['#E63946', '#F1FAEE', '#A8DADC']
        ax.pie(body_parts.values(), 
               labels=body_parts.keys(), 
               autopct='%1.1f%%',
               startangle=90,
               colors=colors,
               textprops={'fontsize': 12, 'fontweight': 'bold'})
        
        ax.set_title('Workout Distribution by Body Part', fontsize=14, fontweight='bold')
        
        plt.tight_layout()
        output_path = os.path.join(self.output_dir, 'workout_distribution.png')
        plt.savefig(output_path, dpi=300, bbox_inches='tight')
        print(f"✅ 운동 분포 그래프 저장: {output_path}")
        plt.close()
    
    def generate_summary_report(self):
        """분석 요약 리포트 생성"""
        report_path = os.path.join(self.output_dir, 'analysis_report.md')
        
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write("# 운동 데이터 분석 리포트\n\n")
            f.write("---\n\n")
            
            # 인바디 변화
            f.write("## 📊 인바디 변화 분석\n\n")
            inbody_data = self.data['inbody_records']
            
            if len(inbody_data) >= 2:
                start = inbody_data[0]
                end = inbody_data[1]
                
                f.write(f"**측정 기간**: {start['date']} ~ {end['date']}\n\n")
                f.write("| 항목 | 시작 | 종료 | 변화량 |\n")
                f.write("|------|------|------|--------|\n")
                f.write(f"| 체중 | {start['weight']}kg | {end['weight']}kg | {end['weight']-start['weight']:+.1f}kg |\n")
                f.write(f"| 골격근량 | {start['skeletal_muscle']}kg | {end['skeletal_muscle']}kg | {end['skeletal_muscle']-start['skeletal_muscle']:+.1f}kg |\n")
                f.write(f"| 체지방률 | {start['body_fat_percentage']}% | {end['body_fat_percentage']}% | {end['body_fat_percentage']-start['body_fat_percentage']:+.1f}% |\n\n")
                
                # 체지방량 계산
                start_fat = start['weight'] * start['body_fat_percentage'] / 100
                end_fat = end['weight'] * end['body_fat_percentage'] / 100
                f.write(f"**추정 체지방량 변화**: {start_fat:.2f}kg → {end_fat:.2f}kg ({end_fat-start_fat:+.2f}kg)\n\n")
                
                f.write("### 💡 분석 결과\n\n")
                if end['weight'] < start['weight'] and end['skeletal_muscle'] >= start['skeletal_muscle']:
                    f.write("✅ **리컴포지션 성공**: 체중은 감소했지만 골격근량은 유지/증가했습니다!\n\n")
                    f.write("이는 체지방이 감소하면서 근육량은 보존된 매우 이상적인 감량 패턴입니다.\n\n")
            
            # 운동 기록
            f.write("## 💪 운동 기록\n\n")
            workout_records = self.data['workout_records']
            
            f.write(f"**총 기록된 운동 세션**: {len(workout_records)}회\n\n")
            
            for record in workout_records:
                f.write(f"### {record['date']} - {record['type']}\n\n")
                for exercise, details in record['exercises'].items():
                    if details:
                        weight = details.get('weight', '?')
                        f.write(f"- **{exercise}**: {weight}kg\n")
                f.write("\n")
            
            # 증량 추이
            f.write("## 📈 증량 추이 분석\n\n")
            progression_data = self.data['equipment_progression']
            
            for equipment, records in progression_data.items():
                f.write(f"### {equipment}\n\n")
                
                if len(records) > 1:
                    start_weight = records[0]['weight']
                    end_weight = records[-1]['weight']
                    increase = end_weight - start_weight
                    increase_pct = (increase / start_weight) * 100
                    
                    f.write(f"**증량률**: {start_weight}kg → {end_weight}kg ({increase:+.1f}kg, {increase_pct:+.1f}%)\n\n")
                
                f.write("| 단계 | 무게 | 비고 |\n")
                f.write("|------|------|------|\n")
                for i, record in enumerate(records, 1):
                    weight = record['weight']
                    comment = record.get('comment', record.get('note', ''))
                    f.write(f"| {i} | {weight}kg | {comment} |\n")
                f.write("\n")
            
            # 추천 사항
            f.write("## 🎯 다음 단계 추천\n\n")
            f.write("### 1. 더 많은 데이터 수집\n")
            f.write("- 전체 대화 내용에서 모든 운동 기록 추출 필요\n")
            f.write("- 날짜별 상세 기록 (세트, 렙, 코멘트) 정리\n\n")
            
            f.write("### 2. 루틴 정립 분석\n")
            f.write("- 초기: 불규칙한 루틴\n")
            f.write("- 중기: 가슴/어깨, 등, 하체 3분할 정립\n")
            f.write("- 각 단계별 성과 비교 분석\n\n")
            
            f.write("### 3. 증량 패턴 분석\n")
            f.write("- 어떤 기구가 가장 빠르게 증량되었는지\n")
            f.write("- 정체 구간 파악 및 돌파 전략 분석\n\n")
            
            f.write("---\n\n")
            f.write("*이 리포트는 제공된 샘플 데이터를 기반으로 생성되었습니다.*\n")
        
        print(f"✅ 분석 리포트 저장: {report_path}")
    
    def run_all(self):
        """모든 시각화 실행"""
        print("\n" + "="*60)
        print("🎨 운동 데이터 시각화 시작")
        print("="*60 + "\n")
        
        self.visualize_inbody_changes()
        self.visualize_equipment_progression()
        self.visualize_workout_distribution()
        self.generate_summary_report()
        
        print("\n" + "="*60)
        print("✨ 시각화 완료!")
        print("="*60)

if __name__ == '__main__':
    visualizer = WorkoutVisualizer(
        '../data/workout_data.json',
        '../output'
    )
    visualizer.run_all()
