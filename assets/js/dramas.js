const DramasPage = (() => {
    const state = {
        dramas: [],
        activeCountry: 'all',
        trendingOnly: false,
        query: '',
        visible: 8
    };

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
        if (matches.length) {
            return matches.map(platform => ({ ...platform }));
        }
        return [{ label: 'Official platform', url: '#', match: /./i }];
    }

    function normalizeCountry(code) {
        return (code || '').toUpperCase();
    }

    function getFilteredDramas() {
        let dramas = [...state.dramas];

        if (state.activeCountry !== 'all') {
            dramas = dramas.filter(drama => normalizeCountry(drama.country_code) === state.activeCountry);
        }

        if (state.trendingOnly) {
            dramas = dramas.filter(drama => drama.trending);
        }

        if (state.query.trim()) {
            const search = state.query.trim().toLowerCase();
            dramas = dramas.filter(drama => {
                const haystack = [
                    drama.title,
                    drama.native_title,
                    drama.country,
                    drama.synopsis,
                    drama.genres ? drama.genres.join(' ') : '',
                    drama.network || ''
                ].join(' ').toLowerCase();

                return haystack.includes(search);
            });
        }

        return dramas;
    }

    function renderResults() {
        const container = document.getElementById('dramaResultsGrid');
        const summary = document.getElementById('resultSummary');
        const loadMoreBtn = document.getElementById('loadMoreBtn');

        if (!container || !summary || !loadMoreBtn) return;

        const filtered = getFilteredDramas();
        const visible = filtered.slice(0, state.visible);

        summary.textContent = `Showing ${visible.length} of ${filtered.length} dramas`;

        if (!filtered.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No dramas match that filter</h3>
                    <p>Try switching regions or clearing the search.</p>
                </div>
            `;
            loadMoreBtn.classList.add('hidden');
            return;
        }

        const cardsHtml = visible.map(drama => {
            const platforms = getPlatformLinks(drama.network);
            const platformHtml = platforms.map(platform => `
                <a href="${platform.url}" target="_blank" rel="noreferrer" class="watch-link">
                    ${App.escapeHtml(platform.label)}
                </a>
            `).join('');

            return `
                <article class="drama-card-full">
                    <div class="drama-card-poster-wrap">
                        <img src="${drama.poster}" alt="${App.escapeHtml(drama.title)} poster" loading="lazy">
                        <div class="card-floating-badges">
                            <span class="country-pill country-${(drama.country_code || 'kr').toLowerCase()}">${drama.country_code || 'KR'}</span>
                            <span class="rating-pill">★ ${Number(drama.rating || 0).toFixed(1)}</span>
                        </div>
                    </div>

                    <div class="drama-card-content">
                        <div class="drama-card-header">
                            <div>
                                <h3>${App.escapeHtml(drama.title)}</h3>
                                <div class="drama-submeta">${drama.year} • ${drama.episodes} eps • ${App.escapeHtml(drama.country)}</div>
                            </div>
                            ${drama.trending ? '<span class="trending-pill">Trending</span>' : ''}
                        </div>

                        <p class="drama-card-synopsis">${App.escapeHtml(drama.synopsis)}</p>

                        <div class="genre-row">
                            ${(drama.genres || []).slice(0, 3).map(genre => `<span class="genre-tag">${App.escapeHtml(genre)}</span>`).join('')}
                        </div>

                        <div class="watch-links-row">
                            <span class="watch-label">Watch on</span>
                            ${platformHtml}
                        </div>

                        <div class="drama-card-actions">
                            <button class="btn-log" type="button" data-tooltip="Quick log your thoughts" onclick="App.openQuickLog(${drama.id}, '${App.escapeHtml(drama.title)}')">Quick Log</button>
                            <button class="btn-secondary" type="button" data-tooltip="Open drama details" onclick="window.location.href='drama-detail.html?id=${drama.id}'">View Details</button>
                        </div>
                    </div>
                </article>
            `;
        }).join('');

        container.innerHTML = cardsHtml;
        loadMoreBtn.classList.toggle('hidden', filtered.length <= state.visible);
    }

    function updateCounts() {
        const totalCount = document.getElementById('totalDramaCount');
        const trendingCount = document.getElementById('trendingDramaCount');

        if (totalCount) {
            totalCount.textContent = String(state.dramas.length);
        }

        if (trendingCount) {
            trendingCount.textContent = String(state.dramas.filter(drama => drama.trending).length);
        }
    }

    function attachEvents() {
        const searchInput = document.getElementById('dramaSearchInput');
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        const countryButtons = document.querySelectorAll('.country-filter');
        const trendingToggle = document.getElementById('trendingOnlyToggle');

        if (searchInput) {
            searchInput.addEventListener('input', (event) => {
                state.query = event.target.value;
                state.visible = 8;
                renderResults();
            });
        }

        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                state.visible += 8;
                renderResults();
            });
        }

        countryButtons.forEach(button => {
            button.addEventListener('click', () => {
                state.activeCountry = button.dataset.country || 'all';
                state.visible = 8;
                countryButtons.forEach(item => item.classList.toggle('active', item === button));
                renderResults();
            });
        });

        if (trendingToggle) {
            trendingToggle.addEventListener('click', () => {
                state.trendingOnly = !state.trendingOnly;
                state.visible = 8;
                trendingToggle.classList.toggle('active', state.trendingOnly);
                trendingToggle.textContent = state.trendingOnly ? 'Showing trending' : 'Trending only';
                renderResults();
            });
        }
    }

    async function loadData() {
        try {
            const res = await fetch('data/seed_data.json');
            const data = await res.json();
            state.dramas = Array.isArray(data.dramas) ? data.dramas : [];
            updateCounts();
            renderResults();
        } catch (error) {
            console.error('Failed to load dramas page data:', error);
            const container = document.getElementById('dramaResultsGrid');
            if (container) {
                container.innerHTML = '<div class="empty-state"><h3>Unable to load dramas</h3><p>Please refresh the page.</p></div>';
            }
        }
    }

    function init() {
        attachEvents();
        loadData();
    }

    return {
        init
    };
})();

document.addEventListener('DOMContentLoaded', () => {
    DramasPage.init();
});
