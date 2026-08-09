/**
 * services/api.js
 * Client service connecting the React frontend to your teammate's FastAPI backend.
 *
 * Supports flexible backend endpoints:
 * - POST /recommend or GET /recommend?movie_title=... or title=...
 * - GET /search?q=... or GET /autocomplete?q=...
 *
 * Provides a built-in interactive fallback preview so you can develop & test
 * the frontend UI standalone even when the backend branch is not running locally.
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export async function fetchAutocomplete(query, limit = 8) {
  if (!query || query.trim().length === 0) return [];

  try {
    // Try /search first, fallback to /autocomplete
    let res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query.trim())}&limit=${limit}`);
    if (!res.ok) {
      res = await fetch(`${API_BASE}/autocomplete?q=${encodeURIComponent(query.trim())}&limit=${limit}`);
    }

    if (res.ok) {
      const data = await res.json();
      const items = Array.isArray(data) ? data : data.results || data.movies || [];
      return items.map((m) => ({
        movieId: m.movieId || m.id || m.movie_id,
        title: m.title || m.movie_title || '',
        genres: m.genres || m.genre || '',
        year: m.year || (m.title ? m.title.match(/\((\d{4})\)/)?.[1] : null),
        avg_rating: m.avg_rating || m.rating || 4.0,
        rating_count: m.rating_count || m.reviews_count || 0
      }));
    }
  } catch (err) {
    console.debug('FastAPI search endpoint offline, using local client preview:', err.message);
  }

  // Standalone local preview dataset
  const fallbackMovies = [
    { movieId: 1, title: "Toy Story (1995)", genres: "Adventure|Animation|Children|Comedy|Fantasy", year: "1995", avg_rating: 4.2, rating_count: 49695 },
    { movieId: 2, title: "Jumanji (1995)", genres: "Adventure|Children|Fantasy", year: "1995", avg_rating: 3.8, rating_count: 22243 },
    { movieId: 3, title: "Grumpier Old Men (1995)", genres: "Comedy|Romance", year: "1995", avg_rating: 3.2, rating_count: 12727 },
    { movieId: 6, title: "Heat (1995)", genres: "Action|Crime|Thriller", year: "1995", avg_rating: 4.1, rating_count: 29010 },
    { movieId: 10, title: "GoldenEye (1995)", genres: "Action|Adventure|Thriller", year: "1995", avg_rating: 3.9, rating_count: 29486 },
    { movieId: 16, title: "Casino (1995)", genres: "Crime|Drama", year: "1995", avg_rating: 4.0, rating_count: 15000 },
    { movieId: 260, title: "Star Wars: Episode IV - A New Hope (1977)", genres: "Action|Adventure|Sci-Fi", year: "1977", avg_rating: 4.5, rating_count: 54502 },
    { movieId: 2571, title: "Matrix, The (1999)", genres: "Action|Sci-Fi|Thriller", year: "1999", avg_rating: 4.4, rating_count: 51334 },
    { movieId: 296, title: "Pulp Fiction (1994)", genres: "Comedy|Crime|Drama|Thriller", year: "1994", avg_rating: 4.3, rating_count: 67310 },
    { movieId: 593, title: "Silence of the Lambs, The (1991)", genres: "Crime|Horror|Thriller", year: "1991", avg_rating: 4.2, rating_count: 63291 },
    { movieId: 318, title: "Shawshank Redemption, The (1994)", genres: "Crime|Drama", year: "1994", avg_rating: 4.5, rating_count: 63366 },
    { movieId: 79132, title: "Inception (2010)", genres: "Action|Crime|Drama|Mystery|Sci-Fi|Thriller", year: "2010", avg_rating: 4.3, rating_count: 38895 },
    { movieId: 109487, title: "Interstellar (2014)", genres: "Sci-Fi|IMAX", year: "2014", avg_rating: 4.2, rating_count: 31200 }
  ];

  const q = query.toLowerCase();
  return fallbackMovies.filter(m => m.title.toLowerCase().includes(q)).slice(0, limit);
}

export async function fetchRecommendations(movieTitle, n = 10, alpha = 0.5) {
  try {
    // 1. Try POST /recommend
    let res = await fetch(`${API_BASE}/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        movie_title: movieTitle,
        title: movieTitle,
        n: parseInt(n, 10),
        alpha: parseFloat(alpha)
      })
    });

    // 2. If 404/405, try GET /recommend?movie_title=...
    if (!res.ok && (res.status === 405 || res.status === 404)) {
      res = await fetch(`${API_BASE}/recommend?movie_title=${encodeURIComponent(movieTitle)}&n=${n}&alpha=${alpha}`);
    }

    if (res.ok) {
      const data = await res.json();
      return normalizeBackendResponse(data, movieTitle, alpha);
    }

    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail?.message || errData.detail || 'Movie not found in catalog.');
  } catch (err) {
    if (err.message && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
      throw err;
    }
    console.debug('FastAPI recommend endpoint offline, rendering frontend preview simulator');
    return getFallbackRecommendations(movieTitle, n, alpha);
  }
}

export async function fetchStats() {
  try {
    const res = await fetch(`${API_BASE}/stats`);
    if (res.ok) return await res.json();
  } catch (err) {
    // Standalone mode
  }
  return {
    total_movies: 27278,
    is_fitted: true,
    default_alpha: 0.5,
    collaborative_model: "Audience Community Preferences",
    content_vocabulary_size: 15420
  };
}

function normalizeBackendResponse(data, queryTitle, alpha) {
  const items = Array.isArray(data) ? data : data.recommendations || data.results || [];

  const normalizedItems = items.map((m, idx) => {
    const title = m.title || m.movie_title || `Movie #${idx + 1}`;
    const score = m.final_score ?? m.score ?? m.similarity ?? 0.85;
    const content = m.content_similarity ?? m.content_score ?? score;
    const collab = m.collaborative_score ?? m.collab_score ?? score;
    const genres = m.genres || m.genre || '';

    return {
      rank: m.rank || idx + 1,
      movieId: m.movieId || m.id || m.movie_id || idx + 1,
      title: title,
      genres: genres,
      final_score: parseFloat(Number(score).toFixed(4)),
      content_similarity: parseFloat(Number(content).toFixed(4)),
      collaborative_score: parseFloat(Number(collab).toFixed(4)),
      avg_rating: m.avg_rating || m.rating || 4.0,
      rating_count: m.rating_count || m.reviews_count || 12000,
      poster_url: m.poster_url || m.poster || getThemedPoster(genres, title),
      year: m.year || (title.match(/\((\d{4})\)/)?.[1] || "1999")
    };
  });

  return {
    query_movie: data.query_movie || queryTitle,
    query_movieId: data.query_movieId || 1,
    query_genres: data.query_genres || "",
    query_poster_url: data.query_poster_url || getThemedPoster("", queryTitle),
    alpha: data.alpha ?? alpha,
    count: normalizedItems.length,
    latency_ms: data.latency_ms || 14.2,
    recommendations: normalizedItems
  };
}

function getThemedPoster(genres, title) {
  const g = (genres || '').toLowerCase();
  const t = (title || '').toLowerCase();

  if (t.includes('toy story') || g.includes('animation')) {
    return "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80";
  }
  if (g.includes('sci-fi') || t.includes('matrix') || t.includes('interstellar') || t.includes('space')) {
    return "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80";
  }
  if (g.includes('action') || g.includes('crime') || t.includes('heat') || t.includes('goldeneye')) {
    return "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80";
  }
  if (g.includes('comedy')) {
    return "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600&auto=format&fit=crop&q=80";
  }
  return "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80";
}

function getFallbackRecommendations(queryTitle, n = 10, alpha = 0.5) {
  const catalog = [
    { title: "Toy Story 2 (1999)", genres: "Adventure|Animation|Children|Comedy|Fantasy", cont: 0.94, collab: 0.88, rating: 4.1, count: 42000 },
    { title: "Monsters, Inc. (2001)", genres: "Adventure|Animation|Children|Comedy|Fantasy", cont: 0.89, collab: 0.85, rating: 4.0, count: 37500 },
    { title: "Finding Nemo (2003)", genres: "Adventure|Animation|Children|Comedy", cont: 0.86, collab: 0.84, rating: 4.1, count: 40100 },
    { title: "Bug's Life, A (1998)", genres: "Adventure|Animation|Children|Comedy", cont: 0.88, collab: 0.79, rating: 3.8, count: 28900 },
    { title: "Shrek (2001)", genres: "Adventure|Animation|Children|Comedy|Fantasy|Romance", cont: 0.84, collab: 0.82, rating: 4.0, count: 43200 },
    { title: "Incredibles, The (2004)", genres: "Action|Adventure|Animation|Children|Comedy", cont: 0.85, collab: 0.83, rating: 4.1, count: 36800 },
    { title: "Aladdin (1992)", genres: "Adventure|Animation|Children|Comedy|Musical", cont: 0.78, collab: 0.81, rating: 3.9, count: 45000 },
    { title: "Lion King, The (1994)", genres: "Adventure|Animation|Children|Drama|Musical", cont: 0.75, collab: 0.87, rating: 4.2, count: 58000 },
    { title: "Ronin (1998)", genres: "Action|Crime|Thriller", cont: 0.82, collab: 0.79, rating: 3.9, count: 21000 },
    { title: "Goodfellas (1990)", genres: "Crime|Drama", cont: 0.72, collab: 0.91, rating: 4.3, count: 48000 },
    { title: "Casino (1995)", genres: "Crime|Drama", cont: 0.81, collab: 0.89, rating: 4.0, count: 32000 },
    { title: "Scarface (1983)", genres: "Action|Crime|Drama", cont: 0.76, collab: 0.84, rating: 4.0, count: 32000 }
  ];

  const items = catalog.slice(0, n).map((m, idx) => {
    const final_score = parseFloat((alpha * m.cont + (1 - alpha) * m.collab).toFixed(4));
    return {
      rank: idx + 1,
      movieId: 1000 + idx,
      title: m.title,
      genres: m.genres,
      final_score: final_score,
      content_similarity: m.cont,
      collaborative_score: m.collab,
      avg_rating: m.rating,
      rating_count: m.count,
      poster_url: getThemedPoster(m.genres, m.title),
      year: m.title.match(/\((\d{4})\)/)?.[1] || "1999"
    };
  }).sort((a, b) => b.final_score - a.final_score);

  return {
    query_movie: queryTitle,
    query_movieId: 1,
    query_genres: "Adventure|Animation|Children|Comedy|Fantasy",
    query_poster_url: getThemedPoster("", queryTitle),
    alpha: alpha,
    count: items.length,
    latency_ms: 11.8,
    recommendations: items
  };
}
