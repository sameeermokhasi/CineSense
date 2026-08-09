# CineSense Frontend — React + Tailwind CSS + Three.js

A state-of-the-art cinema-grade movie discovery frontend featuring **interactive Three.js 3D elements**, real-time **autocomplete search**, and **hybrid recommendation controls**.

---

## Features

- **Three.js 3D Visuals**:
  - `Hero3D`: Interactive 3D particle constellation & orbital cinema rings that react dynamically to mouse motion.
  - `MovieGalaxy3D`: Interactive 3D latent space visualizer mapping recommended movies in orbit around the query title connected by glowing laser vectors.
- **Search with Autocomplete (`SearchBar.jsx`)**:
  - Sub-millisecond live search dropdown.
  - Full keyboard navigation ($\uparrow / \downarrow / \text{Enter} / \text{Escape}$).
  - Quick trending search chips.
- **Tunable $\alpha$ Hybrid Controller (`AlphaSlider.jsx`)**:
  - Real-time slider adjusting Content-Based (TF-IDF) vs Collaborative Filtering (SVD/ALS) weight.
  - Visual dual-color proportion bar and quick presets.
- **3D Tilt Movie Cards (`MovieCard.jsx`)**:
  - Realistic 3D perspective tilt on hover.
  - Circular SVG match score ring.
  - Score decomposition tooltips (TF-IDF % vs SVD %).
  - Star ratings and genre badges.
- **Loading Skeleton & Error Boundary (`LoadingSkeleton.jsx`, `ErrorMessage.jsx`)**:
  - Shimmering pulse cards and "Did you mean?" suggestions for missing movies.
- **Movie Details Modal (`MovieDetailsModal.jsx`)**:
  - Deep-dive radar breakdown and instant "Explore Similar" action.

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```
The application will launch at `http://localhost:5173`.

### 3. Connect to Teammate's Backend (Optional)
By default, `VITE_API_BASE` points to `http://localhost:8000`. If your teammate's backend runs on a different port or host, create a `.env` file:
```env
VITE_API_BASE=http://localhost:8000
```
*(Note: If the backend is not running, the frontend automatically falls back to an interactive client-side preview simulator, allowing you to develop and demo the UI completely standalone!)*

### 4. Production Build
```bash
npm run build
```
