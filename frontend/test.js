import fetch from 'node-fetch';

async function test() {
    let res = await fetch('http://127.0.0.1:8000/recommend?title=Interstellar%20(2014)&n=18');
    if (res.ok) {
        const data = await res.json();
        console.log("Data received:", Object.keys(data));
        const rawItems = data.recommendations || [];
        console.log("Raw items count:", rawItems.length);
        if (rawItems.length > 0) {
           console.log("First item:", rawItems[0]);
        }
        
        try {
            const maxRaw = rawItems.length > 0 ? (rawItems[0].final_score || rawItems[0].score || 0.7) : 0.7;
            const items = rawItems.map((m, idx) => {
                const rawScore = m.final_score ?? m.score ?? 0.75;
                const relativeRatio = rawScore / Math.max(maxRaw, 0.001);
                const naturalScore = Math.max(0.60, Math.min(0.95, 0.94 * relativeRatio - idx * 0.015));
                const avg = m.avg_rating || 4.1;
                
                return {
                    title: m.title,
                    year: m.title.match(/\((\d{4})\)/)?.[1] || "2000"
                };
            });
            console.log("Mapped successfully. Items:", items.length);
        } catch (e) {
            console.error("Mapping error:", e);
        }
    } else {
        console.log("HTTP Error:", res.status);
    }
}
test();
