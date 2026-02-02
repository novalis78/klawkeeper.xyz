'use client';

import { useEffect, useRef } from 'react';

export default function LightTrails() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let time = 0;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Light trail paths
    const paths = [
      {
        angle: 0,
        radius: 100,
        speed: 0.01,
        color: '#FF4D00',
        blur: 30,
        width: 3
      },
      {
        angle: Math.PI / 3,
        radius: 80,
        speed: 0.015,
        color: '#00F3FF',
        blur: 25,
        width: 2
      },
      {
        angle: Math.PI * 2 / 3,
        radius: 120,
        speed: 0.008,
        color: '#FF8844',
        blur: 35,
        width: 3
      }
    ];

    const trail = [];
    const maxTrailLength = 60;

    const draw = () => {
      // Fade effect
      ctx.fillStyle = 'rgba(5, 5, 5, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      time += 1;

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      paths.forEach((path, pathIndex) => {
        // Update path position
        path.angle += path.speed;

        const x = centerX + Math.cos(path.angle) * path.radius;
        const y = centerY + Math.sin(path.angle) * path.radius;

        // Add to trail
        if (!trail[pathIndex]) trail[pathIndex] = [];
        trail[pathIndex].push({ x, y });
        if (trail[pathIndex].length > maxTrailLength) {
          trail[pathIndex].shift();
        }

        // Draw trail with glow
        ctx.shadowBlur = path.blur;
        ctx.shadowColor = path.color;
        ctx.strokeStyle = path.color;
        ctx.lineWidth = path.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        trail[pathIndex].forEach((point, i) => {
          const alpha = i / trail[pathIndex].length;
          ctx.globalAlpha = alpha * 0.8;

          if (i === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.stroke();

        // Draw bright point at current position
        ctx.globalAlpha = 1;
        ctx.shadowBlur = path.blur * 1.5;
        ctx.beginPath();
        ctx.arc(x, y, path.width * 1.5, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ zIndex: 1 }}
    />
  );
}
