# Examply backend — FastAPI + Tesseract OCR
# Build:  docker build -t examply-api .
# Run:    docker run -d -p 8010:8010 -v /home/ec2-user/examply-data:/data examply-api
FROM python:3.11-slim

# System dependencies:
#   tesseract-ocr(+kor,+eng) → OCR 엔진. 스캔본(사진) PDF일 때만 사용됨.
#   (PDF→이미지 변환은 PyMuPDF가 처리하므로 poppler 불필요)
#   ※ 덤프가 전부 '글자 복사되는 디지털 PDF'라면 아래 tesseract 줄도 제거 가능
RUN apt-get update && apt-get install -y --no-install-recommends \
        tesseract-ocr \
        tesseract-ocr-kor \
        tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

# uv — 빠른 파이썬 패키지 매니저 (정적 바이너리 하나만 복사)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# 의존성 먼저 설치 → pyproject/uv.lock 안 바뀌면 이 레이어는 캐시 재사용
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project

# 앱 소스
COPY . .

# 런타임 기본값. SQLite·업로드 파일은 /data 아래(=마운트된 볼륨)에 저장 → 컨테이너 재생성해도 보존
ENV TESSERACT_CMD=/usr/bin/tesseract \
    OCR_LANG=kor+eng \
    DATABASE_URL=sqlite:////data/examply.db \
    UPLOAD_DIR=/data/uploads \
    WORK_DIR=/data/work \
    API_HOST=0.0.0.0 \
    API_PORT=8010

EXPOSE 8010

# 이 경로에 EC2 호스트 디렉터리를 마운트해야 데이터가 영구 보존됨
VOLUME ["/data"]

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8010"]
