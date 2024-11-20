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

            // 6각형 그리기
            const centerX = hexCanvas.width / 2;
            const centerY = hexCanvas.height / 2;
            const radius = 100;

            hexContext.clearRect(0, 0, hexCanvas.width, hexCanvas.height);

            // 6각형의 각 꼭짓점
            const points = [];
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i;
                points.push({
                    x: centerX + radius * Math.cos(angle),
                    y: centerY + radius * Math.sin(angle),
                });
            }

            // 꼭짓점별 색상 설정
            points.forEach((point, index) => {
                const colorKeys = Object.keys(colors);
                const color = colors[colorKeys[index]];

                hexContext.beginPath();
                hexContext.arc(point.x, point.y, 10, 0, 2 * Math.PI);
                hexContext.fillStyle = color;
                hexContext.fill();
                hexContext.closePath();
            });

            // 중앙에서 색상 혼합 (삼각형 방식)
            hexContext.beginPath();
            hexContext.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                hexContext.lineTo(points[i].x, points[i].y);
            }
            hexContext.closePath();

            // 혼합 색상 (가중 평균)
            const mixedColor = Object.keys(expressions).reduce(
                (acc, emotion) => {
                    const weight = expressions[emotion] || 0;
                    const [r, g, b, a] = colors[emotion]
                        .match(/rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/)
                        .slice(1)
                        .map(Number);
                    acc.r += r * weight;
                    acc.g += g * weight;
                    acc.b += b * weight;
                    acc.a += a * weight;
                    return acc;
                },
                { r: 0, g: 0, b: 0, a: 0 }
            );

            hexContext.fillStyle = `rgba(${Math.round(mixedColor.r)}, ${Math.round(mixedColor.g)}, ${Math.round(
                mixedColor.b
            )}, ${Math.min(1, mixedColor.a)})`;
            hexContext.fill();
        } else {
            hexContext.clearRect(0, 0, hexCanvas.width, hexCanvas.height);
        }
    }, 100);
});
