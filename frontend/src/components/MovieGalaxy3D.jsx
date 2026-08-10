/**
 * components/MovieGalaxy3D.jsx
 * Interactive 3D Movie Universe Visualizer using Three.js.
 * Renders recommended movies orbiting the query movie with clear, consumer-friendly labels.
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Orbit, Sparkles, X } from 'lucide-react';

export default function MovieGalaxy3D({ recommendations, queryMovie, onSelectMovie, onClose }) {
  const mountRef = useRef(null);
  const [hoveredMovie, setHoveredMovie] = useState(null);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount || !recommendations || recommendations.length === 0) return;

    let scene, camera, renderer, animationId;
    const raycastMeshes = [];

    try {
      const width = currentMount.clientWidth || 800;
      const height = currentMount.clientHeight || 500;

      scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x06070a, 0.03);

      camera = new THREE.PerspectiveCamera(50, width / Math.max(height, 1), 0.1, 1000);
      camera.position.set(0, 10, 22);
      camera.lookAt(0, 0, 0);

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(width, Math.max(height, 1));
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      currentMount.appendChild(renderer.domElement);

      // 1. Central Query Movie Node (Golden Glowing Sun)
      const centerGeo = new THREE.SphereGeometry(1.2, 32, 32);
      const centerMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
      const centerMesh = new THREE.Mesh(centerGeo, centerMat);
      scene.add(centerMesh);

      // Center Halo
      const haloGeo = new THREE.RingGeometry(1.4, 1.8, 32);
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      haloMesh.rotation.x = Math.PI / 2;
      scene.add(haloMesh);

      // 2. Satellite Nodes (Recommended Movies)
      const movieNodes = [];
      const numRecs = recommendations.length;

      recommendations.forEach((rec, i) => {
        const distance = 5 + (1 - (rec.final_score || 0.5)) * 8;
        const angle = (i / numRecs) * Math.PI * 2;
        const heightOffset = Math.sin(i * 1.5) * 2.5;

        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        const y = heightOffset;

        const size = 0.5 + (rec.final_score || 0.5) * 0.4;
        const nodeGeo = new THREE.SphereGeometry(size, 24, 24);

        const isStoryDominant = (rec.content_similarity || 0) >= (rec.collaborative_score || 0);
        const nodeColor = isStoryDominant ? 0x06b6d4 : 0x8b5cf6;

        const nodeMat = new THREE.MeshBasicMaterial({ color: nodeColor });
        const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
        nodeMesh.position.set(x, y, z);
        nodeMesh.userData = { movie: rec, originalColor: nodeColor, index: i };
        scene.add(nodeMesh);

        movieNodes.push({ mesh: nodeMesh, angle, distance, heightOffset, speed: 0.15 + (10 - i) * 0.02 });
        raycastMeshes.push(nodeMesh);

        // Laser Beam
        const lineMat = new THREE.LineBasicMaterial({
          color: nodeColor,
          transparent: true,
          opacity: 0.35 * (rec.final_score || 0.5)
        });
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(x, y, z)
        ]);
        const line = new THREE.Line(lineGeo, lineMat);
        scene.add(line);
      });

      // 3. Ambient Starfield
      const starCount = 250;
      const starGeo = new THREE.BufferGeometry();
      const starPos = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount * 3; i++) {
        starPos[i] = (Math.random() - 0.5) * 60;
      }
      starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
      const starMat = new THREE.PointsMaterial({ size: 0.15, color: 0xffffff, transparent: true, opacity: 0.6 });
      const stars = new THREE.Points(starGeo, starMat);
      scene.add(stars);

      // Raycasting
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2(-100, -100);

      const onMouseMove = (e) => {
        if (!currentMount) return;
        const rect = currentMount.getBoundingClientRect();
        const w = rect.width || 800;
        const h = rect.height || 500;
        mouse.x = ((e.clientX - rect.left) / w) * 2 - 1;
        mouse.y = -(((e.clientY - rect.top) / h) * 2 - 1);
      };

      const onClick = () => {
        if (!camera) return;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(raycastMeshes);
        if (intersects.length > 0) {
          const clickedMovie = intersects[0].object.userData.movie;
          if (onSelectMovie) onSelectMovie(clickedMovie);
        }
      };

      currentMount.addEventListener('mousemove', onMouseMove);
      currentMount.addEventListener('click', onClick);

      // Animation Loop
      const clock = new THREE.Clock();

      const animate = () => {
        animationId = requestAnimationFrame(animate);
        const elapsed = clock.getElapsedTime();

        haloMesh.rotation.z = elapsed * 0.2;
        centerMesh.rotation.y = elapsed * 0.3;

        movieNodes.forEach((item) => {
          const curAngle = item.angle + elapsed * (item.speed * 0.3);
          item.mesh.position.x = Math.cos(curAngle) * item.distance;
          item.mesh.position.z = Math.sin(curAngle) * item.distance;
          item.mesh.position.y = item.heightOffset + Math.sin(elapsed * 2 + item.angle) * 0.5;
        });

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(raycastMeshes);

        if (intersects.length > 0) {
          const target = intersects[0].object;
          target.material.color.setHex(0xffffff);
          setHoveredMovie(target.userData.movie);
          if (currentMount) currentMount.style.cursor = 'pointer';
        } else {
          raycastMeshes.forEach(mesh => mesh.material.color.setHex(mesh.userData.originalColor));
          setHoveredMovie(null);
          if (currentMount) currentMount.style.cursor = 'default';
        }

        renderer.render(scene, camera);
      };

      animate();

      return () => {
        cancelAnimationFrame(animationId);
        if (currentMount) {
          currentMount.removeEventListener('mousemove', onMouseMove);
          currentMount.removeEventListener('click', onClick);
          currentMount.style.cursor = 'default';
          if (renderer && renderer.domElement && currentMount.contains(renderer.domElement)) {
            currentMount.removeChild(renderer.domElement);
          }
        }
        if (renderer) renderer.dispose();
      };
    } catch (err) {
      console.warn('MovieGalaxy3D initialization error:', err);
    }
  }, [recommendations]);

  return (
    <div className="relative w-full h-[520px] rounded-2xl overflow-hidden glass-panel-glow border border-cinema-accent/30 my-8">
      {/* Header Controls */}
      <div className="absolute top-4 left-6 right-6 z-10 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-cinema-accent/10 border border-cinema-accent/30 text-cinema-accent">
            <Orbit className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              3D Movie Universe
            </h3>
            <p className="text-xs text-slate-400">
              Center: <span className="text-cinema-amber font-semibold">{queryMovie}</span> • Orbiting films connected by story and audience match
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-cinema-800/80 hover:bg-cinema-700 text-slate-400 hover:text-white transition-colors border border-white/10"
          title="Close 3D View"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Hover Info Tooltip */}
      {hoveredMovie && (
        <div className="absolute bottom-6 left-6 z-10 glass-panel p-4 rounded-xl border border-cinema-accent/40 shadow-neon-cyan max-w-sm pointer-events-none animate-fade-in">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-mono font-bold text-cinema-accent">#{hoveredMovie.rank} Match</span>
            <span className="text-xs font-mono text-cinema-amber">{((hoveredMovie.final_score || 0.85) * 100).toFixed(0)}% Match</span>
          </div>
          <h4 className="text-sm font-bold text-white truncate">{hoveredMovie.title}</h4>
          <p className="text-xs text-slate-400 mt-1 line-clamp-1">{(hoveredMovie.genres || '').replace(/\|/g, ', ')}</p>
          <div className="flex gap-2 mt-2 pt-2 border-t border-white/10 text-[10px] text-slate-300">
            <span>Story Match: {((hoveredMovie.content_similarity || 0.8) * 100).toFixed(0)}%</span>
            <span>•</span>
            <span>Audience Match: {((hoveredMovie.collaborative_score || 0.8) * 100).toFixed(0)}%</span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-6 right-6 z-10 glass-panel px-3 py-2 rounded-xl text-[11px] flex items-center gap-3 text-slate-400 pointer-events-none border border-white/5">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-cinema-amber inline-block"></span> Selected Movie</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-cinema-accent inline-block"></span> Story-Aligned</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-cinema-violet inline-block"></span> Audience Choice</span>
      </div>

      {/* 3D Canvas Mount */}
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
}
