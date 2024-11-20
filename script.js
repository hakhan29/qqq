const video = document.getElementById('video');
const expressionDiv = document.getElementById('expression');

// 모델 파일 로드
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('./models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('./models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('./models'),
    faceapi.nets.faceExpressionNet.loadFromUri('./models')
]).then(startVideo);

function startVideo() {
    navigator.mediaDevices.getUserMedia({ video: {} })
        .then(stream => video.srcObject = stream)
        .catch(err => console.error(err));
}

video.addEventListener('play', () => {
    const canvas = faceapi.createCanvasFromMedia(video);
    document.body.append(canvas);

    const hexCanvas = document.createElement('canvas');
    hexCanvas.width = 300;
    hexCanvas.height = 300;
    hexCanvas.style.position = 'absolute';
    hexCanvas.style.top = '10px';
    hexCanvas.style.right = '10px';
    document.body.append(hexCanvas);
    const hexContext = hexCanvas.getContext('2d');

    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceExpressions();

        if (detections.length > 0) {
            const expressions = detections[0].expressions;

            // 감정별 색상 및 비율
            const colors = {
                anger: `rgba(255, 0, 0, ${expressions.anger || 0})`,        // 빨강
                happy: `rgba(255, 255, 0, ${expressions.happy || 0})`,      // 노랑
                sad: `rgba(0, 0, 255, ${expressions.sad || 0})`,            // 파랑
                neutral: `rgba(255, 255, 255, ${expressions.neutral || 0})`, // 흰색
                surprised: `rgba(255, 165, 0, ${expressions.surprised || 0})`, // 주황
                fear: `rgba(128, 0, 128, ${expressions.fear || 0})`          // 보라
            };

            // 6각형 중심 및 반지름 설정
            const centerX = hexCanvas.width / 2;
            const centerY = hexCanvas.height / 2;
            const radius = 100;

            // 6각형 꼭짓점 계산
            const points = [];
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i;
                points.push({
                    x: centerX + radius * Math.cos(angle),
                    y: centerY + radius * Math.sin(angle),
                });
            }

            // 캔버스 초기화
            hexContext.clearRect(0, 0, hexCanvas.width, hexCanvas.height);

            // 그라데이션 생성
            const gradient = hexContext.createRadialGradient(centerX, centerY, 10, centerX, centerY, radius);
            Object.keys(colors).forEach((emotion, index) => {
                const color = colors[emotion];
                gradient.addColorStop(index / 6, color);
            });

            // 6각형 경로 그리기
            hexContext.beginPath();
            hexContext.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                hexContext.lineTo(points[i].x, points[i].y);
            }
            hexContext.closePath();

            // 그라데이션 채우기
            hexContext.fillStyle = gradient;
            hexContext.fill();

            // 꼭짓점에 색상 표시 (각 감정 색상)
            points.forEach((point, index) => {
                const colorKeys = Object.keys(colors);
                const color = colors[colorKeys[index]];

                hexContext.beginPath();
                hexContext.arc(point.x, point.y, 10, 0, 2 * Math.PI);
                hexContext.fillStyle = color;
                hexContext.fill();
                hexContext.closePath();
            });
        } else {
            hexContext.clearRect(0, 0, hexCanvas.width, hexCanvas.height);
        }
    }, 100);
});
