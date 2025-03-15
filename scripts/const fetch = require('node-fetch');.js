const fetch = require('node-fetch');

async function fetchWithRetry(url, maxRetries = 3, timeout = 10000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            const response = await fetch(url, { 
                signal: controller.signal,
                timeout: timeout
            });
            
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            console.warn(`Retry ${i + 1}/${maxRetries} for ${url} failed, retrying...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
}