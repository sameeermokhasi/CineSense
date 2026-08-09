/**
 * components/Hero3D.jsx
 * Interactive Three.js 3D Cinema Constellation & Orbital Rings with safe mounting guards
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function Hero3D() {
  const mountRef = useRef(null);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    let scene, camera, renderer, animationId;
    let particles, ringGroup, geometry, material;

    try {
      scene = new THREE.Scene();
      const width = currentMount.clientWidth || window.innerWidth || 800;
      const height = currentMount.clientHeight || window.innerHeight || 600;

      camera = new THREE.PerspectiveCamera(60, width / Math.max(height, 1), 0.1, 1000);
      camera.position.z = 30;

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(width, Math.max(height, 1));
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      currentMount.appendChild(renderer.domElement);

      // 1. Particle Cloud (Latent Space Data Points)
      const particleCount = 600;
      geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);

      const color1 = new THREE.Color(0x06b6d4); // Cyan
      const color2 = new THREE.Color(0x8b5cf6); // Violet
      const color3 = new THREE.Color(0xf59e0b); // Amber

      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 60;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 40;

        const mixedColor = i % 3 === 0 ? color1 : i % 3 === 1 ? color2 : color3;
        colors[i * 3] = mixedColor.r;
        colors[i * 3 + 1] = mixedColor.g;
        colors[i * 3 + 2] = mixedColor.b;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      material = new THREE.PointsMaterial({
        size: 0.28,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending
      });

      particles = new THREE.Points(geometry, material);
      scene.add(particles);

      // 2. Orbital Cinema Rings
      ringGroup = new THREE.Group();

      const createRing = (radius, tubeRadius, colorHex, rotX, rotY) => {
        const ringGeo = new THREE.TorusGeometry(radius, tubeRadius, 16, 80);
        const ringMat = new THREE.MeshBasicMaterial({
          color: colorHex,
          wireframe: true,
          transparent: true,
          opacity: 0.25,
          blending: THREE.AdditiveBlending
        });
        const mesh = new THREE.Mesh(ringGeo, ringMat);
        mesh.rotation.x = rotX;
        mesh.rotation.y = rotY;
        return mesh;
      };

      const ring1 = createRing(14, 0.08, 0x06b6d4, Math.PI / 4, 0);
      const ring2 = createRing(18, 0.06, 0x8b5cf6, -Math.PI / 3, Math.PI / 6);
      const ring3 = createRing(10, 0.05, 0xf59e0b, Math.PI / 6, -Math.PI / 4);

      ringGroup.add(ring1);
      ringGroup.add(ring2);
      ringGroup.add(ring3);
      scene.add(ringGroup);

      // Mouse Interaction
      let mouseX = 0;
      let mouseY = 0;
      let targetX = 0;
      let targetY = 0;

      const onMouseMove = (e) => {
        const w = window.innerWidth || 1000;
        const h = window.innerHeight || 800;
        mouseX = (e.clientX / w) * 2 - 1;
        mouseY = -(e.clientY / h) * 2 + 1;
      };

      window.addEventListener('mousemove', onMouseMove);

      // Resize Handler
      const onResize = () => {
        if (!currentMount || !renderer || !camera) return;
        const w = currentMount.clientWidth || window.innerWidth;
        const h = currentMount.clientHeight || window.innerHeight;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      };

      window.addEventListener('resize', onResize);

      // Animation Loop
      const clock = new THREE.Clock();

      const animate = () => {
        animationId = requestAnimationFrame(animate);
        const elapsedTime = clock.getElapsedTime();

        targetX += (mouseX - targetX) * 0.05;
        targetY += (mouseY - targetY) * 0.05;

        if (particles) {
          particles.rotation.y = elapsedTime * 0.04 + targetX * 0.4;
          particles.rotation.x = elapsedTime * 0.02 + targetY * 0.3;
        }

        ring1.rotation.z = elapsedTime * 0.15;
        ring2.rotation.z = -elapsedTime * 0.12;
        ring3.rotation.z = elapsedTime * 0.2;

        if (ringGroup) {
          ringGroup.rotation.y = targetX * 0.3;
          ringGroup.rotation.x = targetY * 0.2;
        }

        renderer.render(scene, camera);
      };

      animate();

      // Cleanup
      return () => {
        cancelAnimationFrame(animationId);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('resize', onResize);
        if (currentMount && renderer.domElement && currentMount.contains(renderer.domElement)) {
          currentMount.removeChild(renderer.domElement);
        }
        if (geometry) geometry.dispose();
        if (material) material.dispose();
        if (renderer) renderer.dispose();
      };
    } catch (err) {
      console.warn('Three.js Hero3D initialization error:', err);
    }
  }, []);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-65"
      aria-hidden="true"
    />
  );
}
