'use client';

import { useEffect, useRef } from 'react';

export default function CyberGrid() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let time = 0;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Grid parameters
    const gridSize = 50;
    const perspective = 500;
    const gridDepth = 20;

    const draw = () => {
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      time += 0.005;

      // Draw perspective grid
      ctx.strokeStyle = '#00F3FF';
      ctx.lineWidth = 1;

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const vanishingY = centerY - 200;

      // Vertical lines
      for (let i = -10; i <= 10; i++) {
        const x = centerX + i * gridSize;

        ctx.beginPath();
        ctx.globalAlpha = 0.1 + Math.sin(time + i * 0.2) * 0.05;

        // Draw line from bottom to vanishing point
        ctx.moveTo(x, canvas.height);
        ctx.lineTo(centerX + (i * gridSize * 0.3), vanishingY);

        ctx.stroke();
      }

      // Horizontal lines (receding into distance)
      for (let i = 0; i < gridDepth; i++) {
        const depth = i / gridDepth;
        const scale = 1 - depth * 0.7;
        const y = canvas.height - (i * gridSize * 0.5) + (Math.sin(time + i * 0.5) * 10);

        ctx.beginPath();
        ctx.globalAlpha = 0.15 * scale;

        const leftX = centerX - (canvas.width * 0.4 * scale);
        const rightX = centerX + (canvas.width * 0.4 * scale);

        ctx.moveTo(leftX, y);
        ctx.lineTo(rightX, y);

        ctx.stroke();
      }

      // Add glowing particles
      ctx.fillStyle = '#FF4D00';
      for (let i = 0; i < 20; i++) {
        const x = centerX + Math.sin(time * 0.5 + i) * 300;
        const y = canvas.height - ((time * 50 + i * 50) % canvas.height);

        ctx.globalAlpha = 0.3 + Math.sin(time * 2 + i) * 0.2;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();

        // Glow effect
        ctx.globalAlpha = 0.1;
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Add cyan particles
      ctx.fillStyle = '#00F3FF';
      for (let i = 0; i < 15; i++) {
        const x = centerX + Math.cos(time * 0.7 + i * 0.5) * 400;
        const y = canvas.height - ((time * 70 + i * 60) % canvas.height);

        ctx.globalAlpha = 0.4 + Math.sin(time * 3 + i) * 0.2;
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Glow effect
        ctx.globalAlpha = 0.15;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
      }

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
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
