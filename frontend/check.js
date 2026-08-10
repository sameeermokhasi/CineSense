import http from 'http';

function check(host) {
    http.get(`http://${host}:8000/recommend?title=Interiors&n=18`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log(`[${host}] Status: ${res.statusCode}`);
            try {
                const parsed = JSON.parse(data);
                console.log(`[${host}] Recommendations length:`, parsed.recommendations?.length);
            } catch (e) {
                console.log(`[${host}] Not JSON:`, data.substring(0, 100));
            }
        });
    }).on('error', err => console.log(`[${host}] Error:`, err.message));
}

check('127.0.0.1');
check('::1');
