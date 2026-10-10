/**
 * Dramaboxd — Client Services & Global Application Core
 * Pure JavaScript, HTML5, and CSS.
 * Provides DramaService, JournalService, AuthService, Theme Switcher, Modals, and Toasts.
 */

/* ==========================================================================
   1. CLIENT DATA & SERVICE LAYER (MVC Model)
   ========================================================================== */

const DramaService = (() => {
    let dramasCache = null;

    async function loadData() {
        if (dramasCache) return dramasCache;
        try {
            const res = await fetch('data/seed_data.json');
            const data = await res.json();
            dramasCache = data.dramas || [];
            return dramasCache;
        } catch (err) {
            console.error('Failed to load seed dramas:', err);
            return [];
        }
    }

    async function getAll() {
        return await loadData();
    }

    async function getSpotlight() {
        const dramas = await loadData();
        return dramas.find(d => d.spotlight) || dramas[0];
    }

    async function getTrending(limit = 8) {
        const dramas = await loadData();
        const trending = dramas.filter(d => d.trending);
        return (trending.length ? trending : dramas).slice(0, limit);
    }

    async function getById(id) {
        const dramas = await loadData();
        return dramas.find(d => d.id === parseInt(id, 10)) || null;
    }

    async function search(query) {
        if (!query || query.trim().length < 2) return [];
        const dramas = await loadData();
        const q = query.toLowerCase().trim();
        return dramas.filter(d => 
            d.title.toLowerCase().includes(q) ||
            (d.native_title && d.native_title.toLowerCase().includes(q)) ||
            (d.synopsis && d.synopsis.toLowerCase().includes(q)) ||
            (d.genres && d.genres.some(g => g.toLowerCase().includes(q)))
        );
    }

    async function getSimilar(dramaId, limit = 8) {
        const dramas = await loadData();
        const source = dramas.find(drama => drama.id === parseInt(dramaId, 10));
        if (!source) return [];

        const sourceGenres = (source.genres || []).map(genre => genre.toLowerCase());
        const sourceVibes = (source.vibes || []).map(vibe => vibe.toLowerCase());

        return dramas
            .filter(drama => drama.id !== source.id)
            .map(drama => {
                const genres = (drama.genres || []).map(genre => genre.toLowerCase());
                const vibes = (drama.vibes || []).map(vibe => vibe.toLowerCase());
                const sharedGenres = genres.filter(genre => sourceGenres.includes(genre)).length;
                const sharedVibes = vibes.filter(vibe => sourceVibes.includes(vibe)).length;
                const sameCountry = drama.country_code === source.country_code;
                const score = sharedGenres * 3 + sharedVibes * 2 + (sameCountry ? 1 : 0);
                return { drama, score };
            })
            .filter(match => match.score > 0)
            .sort((a, b) => b.score - a.score || b.drama.rating - a.drama.rating)
            .slice(0, limit)
            .map(match => match.drama);
    }

    async function getRecommendations(vibe = 'all', limit = 6) {
        const dramas = await loadData();
        let list = [...dramas];

        if (vibe && vibe !== 'all') {
            const v = vibe.toLowerCase();
            list = list.filter(d => {
                if (d.vibes && d.vibes.includes(v)) return true;
                const genresLower = (d.genres || []).map(g => g.toLowerCase());
                if (v === 'tearjerker' && genresLower.includes('melodrama')) return true;
                if (v === 'healing' && genresLower.includes('slice of life')) return true;
                if (v === 'butterflies' && genresLower.includes('romance')) return true;
                if (v === 'adrenaline' && (genresLower.includes('thriller') || genresLower.includes('action'))) return true;
                if (v === 'timeloop' && genresLower.includes('time travel')) return true;
                return false;
            });
            if (!list.length) list = [...dramas];
        }

        list.sort((a, b) => (b.match_rate || (b.rating * 20)) - (a.match_rate || (a.rating * 20)));
        return list.slice(0, limit);
    }

    return {
        getAll,
        getSpotlight,
        getTrending,
        getById,
        search,
        getSimilar,
        getRecommendations
    };
})();

const JournalService = (() => {
    const STORAGE_KEY = 'dramaboxd_custom_journals';
    let seedCache = null;

    async function loadSeed() {
        if (seedCache) return seedCache;
        try {
            const res = await fetch('data/seed_data.json');
            const data = await res.json();
            seedCache = data.journals || [];
            return seedCache;
        } catch (err) {
            return [];
        }
    }

    function getLocalCustomJournals() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch (e) {
            return [];
        }
    }

    async function getPublicEntries() {
        const seeds = await loadSeed();
        const custom = getLocalCustomJournals();
        return [...custom.filter(entry => entry.visibility === 'public'), ...seeds];
    }

    async function getRecent(limit = 6) {
        const entries = await getPublicEntries();
        return entries.slice(0, limit);
    }

    function getMyEntries(ownerId = 'guest') {
        const owner = String(ownerId);
        return getLocalCustomJournals().filter(entry =>
            String(entry.owner_id || 'guest') === owner
        );
    }

    async function create(payload) {
        if (!['public', 'private'].includes(payload.visibility)) {
            throw new Error('Choose whether this entry should be public or private.');
        }

        const custom = getLocalCustomJournals();
        const newEntry = {
            id: Date.now(),
            drama_id: parseInt(payload.drama_id || 1, 10),
            drama_title: payload.drama_title || 'Featured Drama',
            author: payload.author || 'DramaLover',
            author_avatar: payload.author_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
            owner_id: String(payload.owner_id || 'guest'),
            visibility: payload.visibility,
            title: payload.title || 'Personal Drama Reflection',
            content: payload.content || payload.excerpt || '',
            excerpt: payload.content || payload.excerpt || '',
            similar_dramas: Array.isArray(payload.similar_dramas) ? payload.similar_dramas.slice(0, 3) : [],
            rating: parseFloat(payload.rating || 5.0),
            rewatch_count: parseInt(payload.rewatch_count || 1, 10),
            mood_tag: payload.mood_tag || 'Heartfelt ❤️',
            tags: payload.tags || ['PersonalLog'],
            likes: 1,
            comments_count: 0,
            date: 'Just now'
        };

        custom.unshift(newEntry);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
        return newEntry;
    }

    return {
        getPublicEntries,
        getMyEntries,
        getRecent,
        create
    };
})();

const AuthService = (() => {
    const USER_KEY = 'dramaboxd_logged_user';

    function getCurrentUser() {
        try {
            return JSON.parse(localStorage.getItem(USER_KEY)) || null;
        } catch (e) {
            return null;
        }
    }

    function login(username, password) {
        if (!username || password.length < 4) {
            return { success: false, message: 'Please enter valid credentials (min 4 characters).' };
        }
        const user = {
            id: Date.now(),
            username: username.trim(),
            name: username.trim().charAt(0).toUpperCase() + username.trim().slice(1),
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
            bio: 'Devoted Asian drama enthusiast & story archivist.',
            watched_count: 14,
            diary_count: 6
        };
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        return { success: true, user };
    }

    function register(username, email, password) {
        if (!username || !email || password.length < 6) {
            return { success: false, message: 'Password must be at least 6 characters. All fields required.' };
        }
        const user = {
            id: Date.now(),
            username: username.trim(),
            name: username.trim(),
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
            bio: 'New Asian drama explorer.',
            watched_count: 0,
            diary_count: 0
        };
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        return { success: true, user };
    }

    function logout() {
        localStorage.removeItem(USER_KEY);
        return { success: true };
    }

    return {
        getCurrentUser,
        login,
        register,
        logout
    };
})();

/* ==========================================================================
   2. APP CORE (UI Controller)
   ========================================================================== */

const App = (() => {
    let currentUser = null;

    function init() {
        initTheme();
        initAuth();
        initSearch();
        initModals();
        initStarRating();
    }

    /* Theme Management */
    function initTheme() {
        const savedTheme = localStorage.getItem('dramaboxd_theme') || 'obsidian';
        applyTheme(savedTheme);

        const themeBtn = document.getElementById('themeToggleBtn');
        const themeDropdown = document.getElementById('themeDropdown');

        if (themeBtn && themeDropdown) {
            themeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                themeDropdown.classList.toggle('open');
            });

            document.addEventListener('click', () => {
                themeDropdown.classList.remove('open');
            });

            const options = document.querySelectorAll('.theme-option');
            options.forEach(opt => {
                opt.addEventListener('click', () => {
                    const themeName = opt.getAttribute('data-theme-set');
                    applyTheme(themeName);
                    themeDropdown.classList.remove('open');
                    showToast(`Theme changed to ${opt.textContent.trim()}`);
                });
            });
        }
    }

    function applyTheme(themeName) {
        document.documentElement.setAttribute('data-theme', themeName);
        localStorage.setItem('dramaboxd_theme', themeName);

        document.querySelectorAll('.theme-option').forEach(opt => {
            if (opt.getAttribute('data-theme-set') === themeName) {
                opt.classList.add('active');
            } else {
                opt.classList.remove('active');
            }
        });

        const currentThemeLabel = document.getElementById('currentThemeLabel');
        if (currentThemeLabel) {
            const labels = {
                'obsidian': 'Obsidian Dark',
                'twilight': 'Twilight Neon',
                'blossom': 'Blossom Rose',
                'matcha': 'Matcha Sage'
            };
            currentThemeLabel.textContent = labels[themeName] || 'Theme';
        }
    }

    /* Live Search */
    function initSearch() {
        const searchInput = document.getElementById('globalSearchInput');
        const resultsBox = document.getElementById('searchResultsDropdown');

        if (!searchInput || !resultsBox) return;

        let debounceTimer;
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            const query = searchInput.value.trim();

            if (query.length < 2) {
                resultsBox.classList.remove('active');
                resultsBox.innerHTML = '';
                return;
            }

            debounceTimer = setTimeout(async () => {
                const results = await DramaService.search(query);
                if (results && results.length > 0) {
                    resultsBox.innerHTML = results.slice(0, 5).map(drama => `
                        <div class="search-result-item" onclick="App.openQuickLog(${drama.id}, '${escapeHtml(drama.title)}')">
                            <img src="${drama.poster}" alt="${drama.title}" class="search-result-poster">
                            <div>
                                <div style="font-weight: 700; font-size: 0.9rem;">${drama.title}</div>
                                <div style="font-size: 0.75rem; color: var(--text-muted);">${drama.year} • ${drama.country} • ★ ${drama.rating}</div>
                            </div>
                        </div>
                    `).join('');
                    resultsBox.classList.add('active');
                } else {
                    resultsBox.innerHTML = `<div style="padding: 1rem; font-size: 0.85rem; color: var(--text-muted); text-align: center;">No dramas found matching "${escapeHtml(query)}"</div>`;
                    resultsBox.classList.add('active');
                }
            }, 250);
        });

        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !resultsBox.contains(e.target)) {
                resultsBox.classList.remove('active');
            }
        });
    }

    /* Modals & Quick Log */
    function initModals() {
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove('open');
                }
            });
        });

        document.querySelectorAll('.modal-close-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal-overlay');
                if (modal) modal.classList.remove('open');
            });
        });

        const quickLogForm = document.getElementById('quickLogForm');
        if (quickLogForm) {
            const similarChoices = document.getElementById('logSimilarDramaChoices');
            if (similarChoices) {
                similarChoices.addEventListener('change', updateSimilarDramaChoiceLimit);
            }

            quickLogForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const dramaId = document.getElementById('logDramaId').value;
                const dramaTitle = document.getElementById('logDramaTitle').value;
                const rating = document.getElementById('logRatingValue').value;
                const moodTag = document.getElementById('logMoodTag').value;
                const rewatchCount = document.getElementById('logRewatchCount').value;
                const reflection = document.getElementById('logReflection').value;
                const logTitle = document.getElementById('logTitle').value || `Reflections on ${dramaTitle}`;
                const visibility = document.getElementById('logVisibility').value;
                const similarDramas = Array.from(document.querySelectorAll('input[name="logSimilarDrama"]:checked')).map(option => ({
                    id: Number(option.value),
                    title: option.dataset.title,
                    poster: option.dataset.poster,
                    country: option.dataset.country
                }));

                const payload = {
                    drama_id: dramaId,
                    drama_title: dramaTitle,
                    title: logTitle,
                    content: reflection,
                    rating: parseFloat(rating),
                    mood_tag: moodTag,
                    rewatch_count: parseInt(rewatchCount, 10),
                    author: currentUser ? currentUser.name : 'DramaLover',
                    author_avatar: currentUser ? currentUser.avatar : undefined,
                    owner_id: currentUser ? currentUser.id : 'guest',
                    visibility,
                    similar_dramas: similarDramas
                };

                try {
                    const created = await JournalService.create(payload);
                    showToast(visibility === 'public'
                        ? 'Your public blog post is live in the community feed! 📖'
                        : 'Your private journal entry was saved. 🔒');
                    document.getElementById('quickLogModal').classList.remove('open');
                    quickLogForm.reset();
                    updateSimilarDramaChoiceLimit();

                    window.dispatchEvent(new CustomEvent('journalAdded', { detail: created }));
                } catch (err) {
                    console.error('Failed to save journal entry:', err);
                    showToast(err.message || 'Could not save your journal entry.', true);
                }
            });
        }
    }

    function initStarRating() {
        const starContainer = document.getElementById('interactiveStarRating');
        const hiddenRatingInput = document.getElementById('logRatingValue');
        if (!starContainer || !hiddenRatingInput) return;

        const stars = starContainer.querySelectorAll('.star');
        stars.forEach(star => {
            star.addEventListener('click', () => {
                const val = parseInt(star.getAttribute('data-val'), 10);
                hiddenRatingInput.value = val;
                stars.forEach(s => {
                    const sVal = parseInt(s.getAttribute('data-val'), 10);
                    if (sVal <= val) {
                        s.classList.add('active');
                    } else {
                        s.classList.remove('active');
                    }
                });
            });
        });
    }

    function openQuickLog(dramaId = 1, dramaTitle = 'Queen of Tears') {
        const modal = document.getElementById('quickLogModal');
        const dramaIdInput = document.getElementById('logDramaId');
        const dramaTitleInput = document.getElementById('logDramaTitle');
        const subtitle = document.getElementById('logModalSubtitle');

        if (modal && dramaIdInput && dramaTitleInput) {
            dramaIdInput.value = dramaId;
            dramaTitleInput.value = dramaTitle;
            if (subtitle) subtitle.textContent = `Journaling your experience for: ${dramaTitle}`;
            updateSimilarDramaChoices(dramaId);
            modal.classList.add('open');
        }
    }

    async function updateSimilarDramaChoices(dramaId) {
        const container = document.getElementById('logSimilarDramaChoices');
        if (!container) return;
        container.innerHTML = '<p class="similar-drama-loading">Finding dramas with similar genres and moods…</p>';

        const candidates = await DramaService.getSimilar(dramaId);
        if (String(document.getElementById('logDramaId').value) !== String(dramaId)) return;
        if (!candidates.length) {
            container.innerHTML = '<p class="similar-drama-loading">No similar dramas were found for this title.</p>';
            return;
        }

        container.innerHTML = candidates.map(drama => `
            <label class="similar-drama-option">
                <input type="checkbox" name="logSimilarDrama" value="${drama.id}"
                    data-title="${escapeHtml(drama.title)}"
                    data-poster="${escapeHtml(drama.poster)}"
                    data-country="${escapeHtml(drama.country || '')}">
                <img src="${escapeHtml(drama.poster)}" alt="" loading="lazy">
                <span>
                    <strong>${escapeHtml(drama.title)}</strong>
                    <small>${escapeHtml((drama.genres || []).slice(0, 2).join(' · '))}</small>
                </span>
            </label>
        `).join('');
        updateSimilarDramaChoiceLimit();
    }

    function updateSimilarDramaChoiceLimit() {
        const options = Array.from(document.querySelectorAll('input[name="logSimilarDrama"]'));
        const selectedCount = options.filter(option => option.checked).length;
        options.forEach(option => {
            option.disabled = !option.checked && selectedCount >= 3;
            option.closest('.similar-drama-option').classList.toggle('selected', option.checked);
        });
        const count = document.getElementById('similarDramaCount');
        if (count) count.textContent = `${selectedCount}/3 selected`;
    }

    /* Auth */
    function initAuth() {
        currentUser = AuthService.getCurrentUser();
        updateAuthUI();

        const tabs = document.querySelectorAll('.modal-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const target = tab.getAttribute('data-tab');
                document.getElementById('signInTabContent').style.display = target === 'signin' ? 'block' : 'none';
                document.getElementById('registerTabContent').style.display = target === 'register' ? 'block' : 'none';
            });
        });

        const signInForm = document.getElementById('signInForm');
        if (signInForm) {
            signInForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const username = document.getElementById('loginUsername').value;
                const password = document.getElementById('loginPassword').value;

                const res = AuthService.login(username, password);
                if (res.success) {
                    currentUser = res.user;
                    updateAuthUI();
                    showToast(`Welcome back, ${currentUser.name}! 🎉`);
                    document.getElementById('authModal').classList.remove('open');
                } else {
                    showToast(res.message, true);
                }
            });
        }

        const regForm = document.getElementById('registerForm');
        if (regForm) {
            regForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const username = document.getElementById('regUsername').value;
                const email = document.getElementById('regEmail').value;
                const password = document.getElementById('regPassword').value;

                const res = AuthService.register(username, email, password);
                if (res.success) {
                    currentUser = res.user;
                    updateAuthUI();
                    showToast(`Account created! Welcome, ${currentUser.name}! 🌟`);
                    document.getElementById('authModal').classList.remove('open');
                } else {
                    showToast(res.message, true);
                }
            });
        }
    }

    function updateAuthUI() {
        const authPill = document.getElementById('userAuthPill');
        if (!authPill) return;

        if (currentUser) {
            authPill.innerHTML = `
                <img src="${currentUser.avatar}" class="user-avatar-thumb" alt="Avatar">
                <span>${escapeHtml(currentUser.name || currentUser.username)}</span>
            `;
            authPill.onclick = () => {
                if (confirm(`Logged in as ${currentUser.name}. Do you want to sign out?`)) {
                    AuthService.logout();
                    currentUser = null;
                    updateAuthUI();
                    showToast('Signed out successfully.');
                }
            };
        } else {
            authPill.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                <span>Sign In</span>
            `;
            authPill.onclick = () => {
                document.getElementById('authModal').classList.add('open');
            };
        }
    }

    /* Toasts */
    function showToast(message, isError = false) {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = 'toast';
        if (isError) {
            toast.style.borderColor = '#ef4444';
        }
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 300);
        }, 3200);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    return {
        init,
        showToast,
        openQuickLog,
        getCurrentUser: () => currentUser,
        escapeHtml
    };
})();

document.addEventListener('DOMContentLoaded', App.init);
