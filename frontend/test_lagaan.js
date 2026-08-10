async function test() {
    try {
        let res = await fetch('http://127.0.0.1:8000/recommend?title=Lagaan%3A%20Once%20Upon%20a%20Time%20in%20India&n=18');
        let data = await res.json();
        console.log("Raw items:", data.recommendations?.length);
        
        const rawItems = data.recommendations || [];
        const maxRaw = rawItems.length > 0 ? (rawItems[0].final_score || rawItems[0].score || 0.7) : 0.7;

        const items = rawItems.map((m, idx) => {
            const rawScore = m.final_score ?? m.score ?? 0.75;
            const relativeRatio = rawScore / Math.max(maxRaw, 0.001);
            const naturalScore = Math.max(0.60, Math.min(0.95, 0.94 * relativeRatio - idx * 0.015));
            const avg = m.avg_rating || 4.1;

            return {
                title: m.title,
            };
        });
        
        console.log("Mapped items:", items.length);
    } catch (e) {
        console.error("Error:", e);
    }
}
test();
