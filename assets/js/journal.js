const JournalPage = (() => {
    let activeView = 'public';
    let searchQuery = '';
    let publicEntries = [];
    let myEntries = [];

    function escape(value) {
        return App.escapeHtml(value || '');
    }

    function getVisibleEntries() {
        const entries = activeView === 'mine' ? myEntries : publicEntries;
        const query = searchQuery.trim().toLowerCase();
        if (!query) return entries;

        return entries.filter(entry => [
            entry.title,
            entry.drama_title,
            entry.author,
            entry.mood_tag,
            entry.excerpt,
            entry.content,
            ...(entry.tags || [])
        ].join(' ').toLowerCase().includes(query));
    }

    function renderSimilarDramas(dramas) {
        const suggestions = Array.isArray(dramas) ? dramas.filter(drama => Number(drama.id) > 0) : [];
        if (!suggestions.length) return '';

        return `
            <div class="entry-similar-dramas">
                <h3>Similar dramas suggested</h3>
                <div class="similar-drama-links">
                    ${suggestions.map(drama => `
                        <a class="similar-drama-link" href="drama-detail.html?id=${Number(drama.id)}">
                            <img src="${escape(drama.poster)}" alt="" loading="lazy">
                            <span>${escape(drama.title)}</span>
                        </a>
                    `).join('')}
                </div>
            </div>
        `;
    }

    function renderEntries() {
        const grid = document.getElementById('journalEntriesGrid');
        if (!grid) return;

        const entries = getVisibleEntries();
        if (!entries.length) {
            const message = activeView === 'mine'
                ? 'Your journal is empty for now. Write an entry and choose whether to keep it private or share it publicly.'
                : 'No public stories match your search yet. Try another search or write the first post.';
            grid.innerHTML = `<div class="journal-empty-state"><h3>No stories to show</h3><p>${escape(message)}</p></div>`;
            return;
        }

        grid.innerHTML = entries.map(entry => {
            const visibility = entry.visibility === 'private' ? 'private' : 'public';
            const content = entry.content || entry.excerpt || '';
            const stars = '★'.repeat(Math.round(entry.rating || 5)) + '☆'.repeat(5 - Math.round(entry.rating || 5));
            const url = `journal.html?id=${encodeURIComponent(entry.id)}`;

            return `
                <article class="journal-card">
                    <div>
                        <div class="journal-author-row">
                            <div class="author-info">
                                <img src="${escape(entry.author_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80')}" alt="${escape(entry.author)}" class="author-avatar">
                                <div>
                                    <div class="author-name">${escape(entry.author || 'DramaLover')}</div>
                                    <div class="journal-date">${escape(entry.date || 'Recently')}</div>
                                </div>
                            </div>
                            <div class="journal-labels">
                                <span class="mood-badge">${escape(entry.mood_tag || 'Reflective')}</span>
                                <span class="visibility-badge ${visibility}">${visibility === 'private' ? '🔒 Private' : 'Public blog'}</span>
                            </div>
                        </div>
                        <div class="journal-entry-copy">
                            <div class="journal-drama-badge">${escape(entry.drama_title)}</div>
                            <h2 class="journal-title"><a href="${url}">${escape(entry.title || 'Drama reflection')}</a></h2>
                            <div class="journal-rating-row">
                                <span class="journal-stars">${stars}</span>
                                ${entry.rewatch_count > 1 ? `<span class="rewatch-pill">🔄 Rewatch #${Number(entry.rewatch_count)}</span>` : ''}
                            </div>
                            <p class="journal-excerpt">${escape(content)}</p>
                            <div class="journal-tags-row">
                                ${(entry.tags || []).map(tag => `<span class="journal-tag">#${escape(tag)}</span>`).join(' ')}
                            </div>
                            ${renderSimilarDramas(entry.similar_dramas)}
                        </div>
                    </div>
                    <div class="journal-footer">
                        <span class="journal-stats">${Number(entry.likes || 0)} appreciations · ${Number(entry.comments_count || 0)} comments</span>
                        <a class="journal-read-link" href="${url}">Read story →</a>
                    </div>
                </article>
            `;
        }).join('');
    }

    function setView(view) {
        activeView = view;
        const tabs = document.querySelectorAll('.journal-view-tab');
        tabs.forEach(tab => {
            const active = tab.dataset.view === view;
            tab.classList.toggle('active', active);
            tab.setAttribute('aria-selected', String(active));
        });

        const privateView = view === 'mine';
        document.getElementById('feedEyebrow').textContent = privateView ? 'Your space' : 'Community';
        document.getElementById('feedTitle').textContent = privateView ? 'My journal' : 'Public blog posts';
        document.getElementById('journalPrivacyNote').textContent = privateView
            ? 'Only entries saved in this browser under your current profile are listed here. Private entries are not shared in the public feed.'
            : 'Public posts are visible in the community feed. Private entries are never included here.';
        renderEntries();
    }

    function renderArticle(entry) {
        const target = document.getElementById('journalArticleContent');
        const listing = document.querySelector('.journal-feed-section:not(#journalArticleView)');
        const articleView = document.getElementById('journalArticleView');
        if (!target || !listing || !articleView) return;

        const visibility = entry.visibility === 'private' ? 'private' : 'public';
        const content = entry.content || entry.excerpt || '';
        const stars = '★'.repeat(Math.round(entry.rating || 5)) + '☆'.repeat(5 - Math.round(entry.rating || 5));
        target.innerHTML = `
            <div class="journal-article-meta">
                <span class="visibility-badge ${visibility}">${visibility === 'private' ? '🔒 Private entry' : 'Public blog'}</span>
                <span>${escape(entry.date || 'Recently')}</span>
            </div>
            <div class="journal-drama-badge">${escape(entry.drama_title)}</div>
            <h1>${escape(entry.title || 'Drama reflection')}</h1>
            <div class="journal-article-author">
                <img src="${escape(entry.author_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80')}" alt="${escape(entry.author)}" class="author-avatar">
                <span>${escape(entry.author || 'DramaLover')}</span>
                <span class="journal-stars">${stars}</span>
            </div>
            <p class="journal-article-content">${escape(content)}</p>
            <div class="journal-tags-row">${(entry.tags || []).map(tag => `<span class="journal-tag">#${escape(tag)}</span>`).join(' ')}</div>
            ${renderSimilarDramas(entry.similar_dramas)}
        `;
        listing.classList.add('hidden');
        articleView.classList.remove('hidden');
    }

    async function load() {
        const currentUser = App.getCurrentUser();
        const ownerId = currentUser ? currentUser.id : 'guest';
        [publicEntries, myEntries] = await Promise.all([
            JournalService.getPublicEntries(),
            Promise.resolve(JournalService.getMyEntries(ownerId))
        ]);

        const journalId = new URLSearchParams(window.location.search).get('id');
        if (journalId) {
            const entry = [...publicEntries, ...myEntries].find(item => String(item.id) === journalId);
            if (entry) {
                renderArticle(entry);
                return;
            }
            document.getElementById('journalEntriesGrid').innerHTML = `
                <div class="journal-empty-state">
                    <h3>Story unavailable</h3>
                    <p>This entry may be private or no longer available.</p>
                    <a class="journal-read-link" href="journal.html">Return to journals</a>
                </div>
            `;
            return;
        }

        renderEntries();
    }

    function init() {
        document.querySelectorAll('.journal-view-tab').forEach(tab => {
            tab.addEventListener('click', () => setView(tab.dataset.view));
        });

        const search = document.getElementById('journalSearchInput');
        if (search) {
            search.addEventListener('input', () => {
                searchQuery = search.value;
                renderEntries();
            });
        }

        document.getElementById('journalBackButton').addEventListener('click', () => {
            window.location.href = 'journal.html';
        });

        window.addEventListener('journalAdded', event => {
            const currentUser = App.getCurrentUser();
            const ownerId = currentUser ? currentUser.id : 'guest';
            myEntries = JournalService.getMyEntries(ownerId);
            if (event.detail.visibility === 'public') {
                publicEntries = [event.detail, ...publicEntries];
                setView('public');
            } else {
                setView('mine');
            }
        });

        load().catch(err => {
            console.error('Failed to load journal page:', err);
            document.getElementById('journalEntriesGrid').innerHTML = `
                <div class="journal-empty-state"><h3>Could not load stories</h3><p>Please refresh the page and try again.</p></div>
            `;
        });
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', JournalPage.init);
