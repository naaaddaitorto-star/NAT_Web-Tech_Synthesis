/**
 * Dramaboxd — Home Page Controller
 * Pure JavaScript, HTML, and CSS.
 * Loads Spotlight Drama, Trending Grid, Vibe Recommendations, and Story Journals.
 */

document.addEventListener('DOMContentLoaded', () => {
    loadHeroSpotlight();
    loadTrendingDramas();
    initRecommendationMatcher();
    loadRecentJournals();

    // Listen for real-time journal additions from the Quick Log modal
    window.addEventListener('journalAdded', (e) => {
        const newJournal = e.detail;
        prependJournalCard(newJournal);
    });
});

/**
 * 1. Load Hero Spotlight Drama
 */
async function loadHeroSpotlight() {
    const heroContainer = document.getElementById('heroSpotlightContainer');
    if (!heroContainer) return;

    try {
        const drama = await DramaService.getSpotlight();
        if (!drama) return;

        heroContainer.innerHTML = `
            <div class="hero-backdrop-container">
                <img src="${drama.backdrop}" alt="${App.escapeHtml(drama.title)} Backdrop" class="hero-backdrop-img">
                <div class="hero-gradient-overlay"></div>
            </div>
            <div class="container hero-content">
                <div class="hero-poster-wrapper">
                    <img src="${drama.poster}" alt="${App.escapeHtml(drama.title)}" class="hero-poster-img">
                </div>
                <div>
                    <div class="spotlight-badge">
                        <span>★</span> Spotlight Masterpiece
                    </div>
                    <div class="hero-title-group">
                        <h1 class="hero-title">${App.escapeHtml(drama.title)}</h1>
                        <div class="hero-native-title">${App.escapeHtml(drama.native_title)}</div>
                    </div>
                    <div class="hero-meta-bar">
                        <div class="rating-badge">★ ${drama.rating.toFixed(1)}</div>
                        <span>•</span>
                        <span>${drama.year}</span>
                        <span>•</span>
                        <span class="country-pill country-${(drama.country_code || 'kr').toLowerCase()}">${drama.country}</span>
                        <span>•</span>
                        <span>${drama.episodes} Episodes</span>
                        <span>•</span>
                        <div class="genre-tags">
                            ${(drama.genres || []).map(g => `<span class="genre-tag">${App.escapeHtml(g)}</span>`).join('')}
                        </div>
                    </div>
                    <p class="hero-synopsis">${App.escapeHtml(drama.synopsis)}</p>
                    ${drama.featured_quote ? `
                        <div class="hero-quote-box">
                            "${App.escapeHtml(drama.featured_quote)}"
                        </div>
                    ` : ''}
                    <div class="hero-actions">
                        <button class="btn-log" onclick="App.openQuickLog(${drama.id}, '${App.escapeHtml(drama.title)}')">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            Log & Journal Drama
                        </button>
                        <button class="btn-secondary" onclick="toggleWatchlist(${drama.id}, '${App.escapeHtml(drama.title)}')">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                            Add to Watchlist
                        </button>
                    </div>
                </div>
            </div>
        `;
    } catch (err) {
        console.error("Failed to load hero spotlight:", err);
    }
}

/**
 * 2. Load Trending Dramas Poster Grid (Letterboxd inspired)
 */
async function loadTrendingDramas() {
    const grid = document.getElementById('trendingDramasGrid');
    if (!grid) return;

    try {
        const dramas = await DramaService.getTrending(8);

        if (!dramas || dramas.length === 0) {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">No trending dramas found.</div>`;
            return;
        }

        grid.innerHTML = dramas.map(d => `
            <div class="drama-card" onclick="goToDramaDetail(${d.id})">
                <div class="poster-container">
                    <img src="${d.poster}" alt="${App.escapeHtml(d.title)}" class="poster-img" loading="lazy">
                    <div class="card-overlay" onclick="event.stopPropagation()">
                        <div class="overlay-top-tags">
                            <span class="country-pill country-${(d.country_code || 'kr').toLowerCase()}">${d.country_code || 'KR'}</span>
                            <span class="overlay-rating">★ ${d.rating.toFixed(1)}</span>
                        </div>
                        <div class="overlay-actions">
                            <button class="icon-action-btn" title="Quick Log / Diary" onclick="App.openQuickLog(${d.id}, '${App.escapeHtml(d.title)}')">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <button class="icon-action-btn" title="Mark as Watched" onclick="markWatched(${d.id}, '${App.escapeHtml(d.title)}')">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </button>
                            <button class="icon-action-btn" title="Add to Watchlist" onclick="toggleWatchlist(${d.id}, '${App.escapeHtml(d.title)}')">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="drama-card-info">
                    <div class="drama-card-title" title="${App.escapeHtml(d.title)}">${App.escapeHtml(d.title)}</div>
                    <div class="drama-card-meta">
                        <span>${d.year}</span>
                        <span>${d.episodes} eps</span>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error("Failed to load trending dramas:", err);
    }
}

/**
 * 3. Curated Recommendations & Vibe Matcher
 */
async function loadRecommendations(vibe = 'all') {
    const grid = document.getElementById('recommendationsGrid');
    if (!grid) return;

    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem 0;">Finding your matches...</div>`;

    try {
        const dramas = await DramaService.getRecommendations(vibe, 6);

        if (!dramas || dramas.length === 0) {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem 0;">No dramas found for this vibe. Try selecting another mood!</div>`;
            return;
        }

        grid.innerHTML = dramas.map(d => `
            <div class="rec-card" onclick="goToDramaDetail(${d.id})">
                <div class="rec-card-body">
                    <div class="rec-poster-box">
                        <img src="${d.poster}" alt="${App.escapeHtml(d.title)}" class="rec-poster-img" loading="lazy">
                    </div>
                    <div class="rec-info">
                        <div class="rec-match-badge">
                            <span>⚡</span> ${d.match_rate || Math.round(d.rating * 20)}% Match
                        </div>
                        <h3 class="rec-title">${App.escapeHtml(d.title)}</h3>
                        <div class="rec-meta">
                            <span class="country-pill country-${(d.country_code || 'kr').toLowerCase()}">${d.country_code || 'KR'}</span>
                            <span>•</span>
                            <span>${d.year}</span>
                            <span>•</span>
                            <span style="color: var(--rating-star); font-weight: 700;">★ ${d.rating.toFixed(1)}</span>
                        </div>
                        <div class="rec-genres">
                            ${(d.genres || []).slice(0, 3).map(g => `<span class="rec-genre-pill">${App.escapeHtml(g)}</span>`).join('')}
                        </div>
                    </div>
                </div>
                ${d.recommendation_reason ? `
                    <div class="rec-reason-box">
                        <span class="rec-reason-icon">💡</span>
                        <span>${App.escapeHtml(d.recommendation_reason)}</span>
                    </div>
                ` : ''}
                <div class="rec-card-footer" onclick="event.stopPropagation()">
                    <button class="rec-action-btn" onclick="App.openQuickLog(${d.id}, '${App.escapeHtml(d.title)}')">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        Log / Journal
                    </button>
                    <button class="rec-action-btn" onclick="toggleWatchlist(${d.id}, '${App.escapeHtml(d.title)}')">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                        Watchlist
                    </button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error("Failed to load recommendations:", err);
    }
}

function initRecommendationMatcher() {
    const filterBar = document.getElementById('vibeFilterBar');
    if (!filterBar) return;

    loadRecommendations('all');

    const chips = filterBar.querySelectorAll('.vibe-chip');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const vibe = chip.getAttribute('data-vibe');
            loadRecommendations(vibe);
        });
    });
}

/**
 * 4. Load Recent Journal Entries & Reflections
 */
async function loadRecentJournals() {
    const grid = document.getElementById('recentJournalsGrid');
    if (!grid) return;

    try {
        const journals = await JournalService.getRecent(3);

        if (!journals || journals.length === 0) {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">No journal entries yet. Be the first to log a drama reflection!</div>`;
            return;
        }

        grid.innerHTML = journals.map(j => renderJournalCardHTML(j)).join('');
    } catch (err) {
        console.error("Failed to load recent journals:", err);
    }
}

function renderJournalCardHTML(j) {
    const stars = '★'.repeat(Math.round(j.rating || 5)) + '☆'.repeat(5 - Math.round(j.rating || 5));
    return `
        <article class="journal-card" id="journalCard-${j.id}">
            <div>
                <div class="journal-author-row">
                    <div class="author-info">
                        <img src="${j.author_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'}" alt="${App.escapeHtml(j.author)}" class="author-avatar">
                        <div>
                            <div class="author-name">${App.escapeHtml(j.author)}</div>
                            <div class="journal-date">${App.escapeHtml(j.date || 'Recently')}</div>
                        </div>
                    </div>
                    <span class="mood-badge">${App.escapeHtml(j.mood_tag || 'Reflective')}</span>
                </div>
                <div style="margin-top: 1rem;">
                    <div class="journal-drama-badge">${App.escapeHtml(j.drama_title)}</div>
                    <h3 class="journal-title">${App.escapeHtml(j.title)}</h3>
                    <div class="journal-rating-row">
                        <span style="color: var(--rating-star); font-size: 0.95rem;">${stars}</span>
                        ${j.rewatch_count > 1 ? `<span class="rewatch-pill">🔄 Rewatch #${j.rewatch_count}</span>` : ''}
                    </div>
                    <p class="journal-excerpt">${App.escapeHtml(j.excerpt || j.content)}</p>
                    <div class="journal-tags-row">
                        ${(j.tags || []).map(t => `<span class="journal-tag">#${App.escapeHtml(t)}</span>`).join(' ')}
                    </div>
                </div>
            </div>
            <div class="journal-footer">
                <div class="journal-stats">
                    <span style="display: flex; align-items: center; gap: 0.3rem;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                        ${j.likes || 1}
                    </span>
                    <span style="display: flex; align-items: center; gap: 0.3rem;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                        ${j.comments_count || 0}
                    </span>
                </div>
                <button style="color: var(--accent); font-size: 0.85rem; font-weight: 600;" onclick="viewFullJournal(${j.id})">
                    Read Story →
                </button>
            </div>
        </article>
    `;
}

function prependJournalCard(journal) {
    const grid = document.getElementById('recentJournalsGrid');
    if (!grid) return;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = renderJournalCardHTML(journal);
    const cardEl = tempDiv.firstElementChild;
    cardEl.style.borderColor = 'var(--accent)';
    grid.prepend(cardEl);
}

/**
 * Interactive Helpers
 */
function toggleWatchlist(dramaId, title) {
    App.showToast(`"${title}" added to your Watchlist! 📌`);
}

function markWatched(dramaId, title) {
    App.showToast(`Marked "${title}" as watched! 👁️`);
}

function goToDramaDetail(dramaId) {
    window.location.href = `drama-detail.html?id=${dramaId}`;
}

function viewFullJournal(journalId) {
    window.location.href = `journal.html?id=${journalId}`;
}
