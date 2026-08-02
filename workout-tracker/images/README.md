# 앱 아이콘

PWA로 사용하려면 아래 크기의 아이콘 이미지가 필요합니다.

## 필요한 아이콘 크기

- icon-72.png (72x72)
- icon-96.png (96x96)
- icon-128.png (128x128)
- icon-144.png (144x144)
- icon-152.png (152x152)
- icon-192.png (192x192)
- icon-384.png (384x384)
- icon-512.png (512x512)

## 아이콘 생성 방법

### 옵션 1: 온라인 도구 사용
1. [RealFaviconGenerator](https://realfavicongenerator.net/) 접속
2. 원하는 이미지 업로드 (💪 이모지 이미지 추천)
3. PWA 아이콘 생성 선택
4. 다운로드 후 이 폴더에 저장

### 옵션 2: Figma/Canva 사용
1. 512x512 캔버스 생성
2. 배경색: #2563eb (파란색)
3. 중앙에 💪 이모지 또는 텍스트
4. 각 크기별로 내보내기

### 옵션 3: ImageMagick 사용 (CLI)
```bash
# 512x512 원본 이미지(icon-512.png)가 있다면:
convert icon-512.png -resize 192x192 icon-192.png
convert icon-512.png -resize 152x152 icon-152.png
convert icon-512.png -resize 144x144 icon-144.png
convert icon-512.png -resize 128x128 icon-128.png
convert icon-512.png -resize 96x96 icon-96.png
convert icon-512.png -resize 72x72 icon-72.png
```

## 임시 대안

아이콘이 없어도 앱은 정상 작동합니다. 
브라우저가 기본 아이콘을 표시합니다.

나중에 아이콘을 추가하고 다시 배포하면 됩니다.
