/**
 * components/HeroParticles.jsx
 * Full-bleed immersive Three.js starry space background with soft blurred glowing particles
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function HeroParticles() {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let scene, camera, renderer, animationId;
    let points, geometry, material;

    try {
      scene = new THREE.Scene();
      const width = window.innerWidth;
      const height = window.innerHeight;

      camera = new THREE.PerspectiveCamera(60, width / height, 1, 1000);
      camera.position.z = 400;

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);

      // Starfield Particles
      const starCount = 350;
      geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(starCount * 3);
      const scales = new Float32Array(starCount);

      for (let i = 0; i < starCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 1200;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 900;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 600;
        scales[i] = Math.random() * 2 + 0.5;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      // Circular canvas texture for soft glowing bokeh stars
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.3, 'rgba(255, 235, 220, 0.7)');
      gradient.addColorStop(0.8, 'rgba(249, 115, 22, 0.15)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 32, 32);

      const texture = new THREE.CanvasTexture(canvas);

      material = new THREE.PointsMaterial({
        size: 9,
        map: texture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.85
      });

      points = new THREE.Points(geometry, material);
      scene.add(points);

      // Subtle mouse movement reactivity
      let mouseX = 0;
      let mouseY = 0;
      let targetX = 0;
      let targetY = 0;

      const onMouseMove = (e) => {
        mouseX = (e.clientX - window.innerWidth / 2) * 0.15;
        mouseY = (e.clientY - window.innerHeight / 2) * 0.15;
      };

      window.addEventListener('mousemove', onMouseMove);

      const onResize = () => {
        if (!renderer || !camera) return;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };

      window.addEventListener('resize', onResize);

      const animate = () => {
        animationId = requestAnimationFrame(animate);
        targetX += (mouseX - targetX) * 0.03;
        targetY += (mouseY - targetY) * 0.03;

        if (points) {
          points.rotation.y += 0.0003;
          points.position.x = targetX * 0.5;
          points.position.y = -targetY * 0.5;
        }

        renderer.render(scene, camera);
      };

      animate();

      return () => {
        cancelAnimationFrame(animationId);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('resize', onResize);
        if (container && renderer.domElement && container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
        if (geometry) geometry.dispose();
        if (material) material.dispose();
        if (texture) texture.dispose();
        if (renderer) renderer.dispose();
      };
    } catch (e) {
      console.warn("Three.js starfield background disabled:", e);
    }
  }, []);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden w-full h-full"
      aria-hidden="true"
    />
  );
}
