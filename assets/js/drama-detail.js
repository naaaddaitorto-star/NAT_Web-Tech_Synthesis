const DramaDetailPage = (() => {
    const PLATFORM_MAP = [
        { label: 'Netflix', url: 'https://www.netflix.com', match: /netflix/i },
        { label: 'Disney+', url: 'https://www.disneyplus.com', match: /disney\+/i },
        { label: 'iQIYI', url: 'https://www.iq.com', match: /iqiyi|iq\.com/i },
        { label: 'Youku', url: 'https://www.youku.com', match: /youku/i },
        { label: 'Prime Video', url: 'https://www.primevideo.com', match: /prime video|primevideo/i },
        { label: 'Apple TV', url: 'https://tv.apple.com', match: /apple tv/i },
        { label: 'Viki', url: 'https://www.viki.com', match: /viki/i },
        { label: 'Hulu', url: 'https://www.hulu.com', match: /hulu/i }
    ];

    function getPlatformLinks(networkText = '') {
        const text = String(networkText || '');
        const matches = PLATFORM_MAP.filter(platform => platform.match.test(text));
        return matches.length ? matches : [{ label: 'Official platform', url: '#', match: /./i }];
    }

    function getParam(name) {
        const params = new URLSearchParams(window.location.search);
        return params.get(name);
    }

    async function loadDrama() {
        const container = document.getElementById('dramaDetailContainer');
        if (!container) return;

        const dramaId = parseInt(getParam('id') || '1', 10);

        try {
            const res = await fetch('data/seed_data.json');
            const data = await res.json();
            const drama = (data.dramas || []).find(item => item.id === dramaId) || (data.dramas || [])[0];

            if (!drama) {
                container.innerHTML = '<div class="empty-state"><h3>Drama not found</h3><p>Return to the drama list and pick another title.</p></div>';
                return;
            }

            const links = getPlatformLinks(drama.network);
            const platformsHtml = links.map(platform => `
                <a class="watch-link" href="${platform.url}" target="_blank" rel="noreferrer">${App.escapeHtml(platform.label)}</a>
            `).join('');

            const genresHtml = (drama.genres || []).map(genre => `<span class="genre-tag">${App.escapeHtml(genre)}</span>`).join('');

            container.innerHTML = `
                <article class="detail-hero">
                    <div class="detail-poster-wrap">
                        <img src="${drama.poster}" alt="${App.escapeHtml(drama.title)} poster">
                    </div>
                    <div class="detail-copy">
                        <span class="section-subtitle">Featured Drama</span>
                        <h1>${App.escapeHtml(drama.title)}</h1>
                        <div class="detail-native">${App.escapeHtml(drama.native_title || '')}</div>
                        <div class="detail-meta-line">
                            <span class="rating-pill">★ ${Number(drama.rating || 0).toFixed(1)}</span>
                            <span>${drama.year}</span>
                            <span>${drama.episodes} episodes</span>
                            <span>${App.escapeHtml(drama.country)}</span>
                        </div>
                        <div class="genre-row">${genresHtml}</div>
                        <p class="detail-synopsis">${App.escapeHtml(drama.synopsis)}</p>
                        <div class="detail-actions">
                            <button class="btn-log" type="button" data-tooltip="Log your thoughts for this drama" onclick="App.openQuickLog(${drama.id}, '${App.escapeHtml(drama.title)}')">Log your thoughts</button>
                            <a class="btn-secondary" href="dramas.html" data-tooltip="Return to the drama browser">Back to dramas</a>
                        </div>
                    </div>
                </article>

                <section class="detail-panel-grid">
                    <div class="detail-panel">
                        <h2>Where to watch</h2>
                        <div class="watch-links-row">${platformsHtml}</div>
                        <p class="panel-note">${App.escapeHtml(drama.network || 'Streaming platform info available on the official service.')}</p>
                    </div>

                    <div class="detail-panel">
                        <h2>Why this one stands out</h2>
                        <p class="panel-note">${App.escapeHtml(drama.recommendation_reason || 'A must-watch pick with strong audience appeal and memorable emotional payoff.')}</p>
                    </div>
                </section>
            `;
        } catch (error) {
            console.error('Failed to load drama detail:', error);
            container.innerHTML = '<div class="empty-state"><h3>Unable to load this drama</h3><p>Please try again later.</p></div>';
        }
    }

    return {
        loadDrama
    };
})();

document.addEventListener('DOMContentLoaded', () => {
    DramaDetailPage.loadDrama();
});
