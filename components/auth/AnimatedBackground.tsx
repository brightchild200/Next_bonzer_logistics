// components/auth/AnimatedBackground.tsx
'use client';

import React, { useEffect, useRef } from 'react';

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Animation state
    let animationId: number;
    let time = 0;

    // Particles array
    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      opacity: number;
      color: string;
    }

    const particles: Particle[] = [];

    // Initialize particles
    const initParticles = () => {
      particles.length = 0;
      const particleCount = 50;

      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * (canvas.width / window.devicePixelRatio),
          y: Math.random() * (canvas.height / window.devicePixelRatio),
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          radius: Math.random() * 2 + 1,
          opacity: Math.random() * 0.5 + 0.2,
          color: ['#f97316', '#ea580c', '#3b82f6', '#0ea5e9'][
            Math.floor(Math.random() * 4)
          ],
        });
      }
    };

    initParticles();

    // Animation loop
    const animate = () => {
      // Clear canvas
      ctx.fillStyle = 'rgba(5, 13, 26, 0.9)';
      ctx.fillRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);

      time += 0.005;

      // Draw animated waves
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.15)';
      ctx.lineWidth = 1;

      for (let wave = 0; wave < 3; wave++) {
        ctx.beginPath();
        const amplitude = 20 + wave * 10;
        const frequency = 0.005 + wave * 0.001;
        const offset = time * 50 + wave * 100;

        for (
          let x = 0;
          x < canvas.width / window.devicePixelRatio;
          x += 5
        ) {
          const y =
            (canvas.height / window.devicePixelRatio) / 2 +
            Math.sin((x + offset) * frequency) * amplitude +
            Math.cos(time * (0.5 + wave * 0.1)) * 10;

          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.stroke();
      }

      // Update and draw particles
      particles.forEach((particle) => {
        // Update position with slight attraction to center
        const centerX = (canvas.width / window.devicePixelRatio) / 2;
        const centerY = (canvas.height / window.devicePixelRatio) / 2;

        particle.x += particle.vx;
        particle.y += particle.vy;

        // Soft attraction to center
        const dx = centerX - particle.x;
        const dy = centerY - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 50) {
          particle.vx += (dx / distance) * 0.0005;
          particle.vy += (dy / distance) * 0.0005;
        }

        // Boundary wrapping
        if (particle.x < 0) particle.x = canvas.width / window.devicePixelRatio;
        if (particle.x > canvas.width / window.devicePixelRatio) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height / window.devicePixelRatio;
        if (particle.y > canvas.height / window.devicePixelRatio) particle.y = 0;

        // Friction
        particle.vx *= 0.99;
        particle.vy *= 0.99;

        // Draw particle with glow
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.opacity * (0.5 + Math.sin(time * 2) * 0.3);

        // Glow
        const gradient = ctx.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          particle.radius * 3
        );
        gradient.addColorStop(0, particle.color);
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.fillRect(
          particle.x - particle.radius * 3,
          particle.y - particle.radius * 3,
          particle.radius * 6,
          particle.radius * 6
        );

        // Core
        ctx.globalAlpha = particle.opacity;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalAlpha = 1;

      // Draw connecting lines between nearby particles
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.1)';
      ctx.lineWidth = 0.5;

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            ctx.globalAlpha = (1 - distance / 150) * 0.2;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      ctx.globalAlpha = 1;

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ display: 'block' }}
    />
  );
}