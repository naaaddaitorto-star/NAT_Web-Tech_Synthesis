/**
 * Dramaboxd — Global Core Application Script
 * Handles Theme Switching, AJAX API Client, Modals, Auth State, and Toasts
 */

const App = (() => {
    // Current authenticated user state (cached in memory and localStorage for mock/preview resilience)
    let currentUser = null;

    // Initialize application when DOM is ready
    function init() {
        initTheme();
        initAuth();
        initSearch();
        initModals();
        initStarRating();
    }

    /* -------------------------------------------------------------------------
       THEME MANAGEMENT
       Minimalistic Dark (obsidian) by default, persisted across pages
       ------------------------------------------------------------------------- */
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

        // Update active class in dropdown
        document.querySelectorAll('.theme-option').forEach(opt => {
            if (opt.getAttribute('data-theme-set') === themeName) {
                opt.classList.add('active');
            } else {
                opt.classList.remove('active');
            }
        });

        // Update button label
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

    /* -------------------------------------------------------------------------
       AJAX API WRAPPER
       Gracefully handles PHP backend or fallback seed JSON for static preview
       ------------------------------------------------------------------------- */
    async function apiRequest(endpoint, options = {}) {
        try {
            const response = await fetch(endpoint, options);
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            return await response.json();
        } catch (err) {
            console.warn(`Direct PHP endpoint [${endpoint}] failed. Attempting seed fallback.`, err);
            // Fallback for direct file preview (file:// or static server without PHP active)
            try {
                const fallback = await fetch('api/data/seed_data.json');
                const seed = await fallback.json();
                if (endpoint.includes('dramas.php')) {
                    if (endpoint.includes('action=spotlight')) {
                        return { status: 'success', data: seed.dramas.find(d => d.spotlight) || seed.dramas[0] };
                    }
                    if (endpoint.includes('action=trending')) {
                        return { status: 'success', data: seed.dramas.filter(d => d.trending) };
                    }
                    return { status: 'success', data: seed.dramas };
                }
                if (endpoint.includes('journals.php')) {
                    return { status: 'success', data: seed.journals };
                }
                return { status: 'success', data: seed };
            } catch (fallbackErr) {
                console.error("Critical: Fallback fetch also failed.", fallbackErr);
                throw err;
            }
        }
    }

    /* -------------------------------------------------------------------------
       LIVE SEARCH (AJAX)
       ------------------------------------------------------------------------- */
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
                const res = await apiRequest(`api/dramas.php?action=list&search=${encodeURIComponent(query)}`);
                if (res && res.data && res.data.length > 0) {
                    resultsBox.innerHTML = res.data.slice(0, 5).map(drama => `
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

    /* -------------------------------------------------------------------------
       MODAL CONTROLLERS & QUICK LOG
       ------------------------------------------------------------------------- */
    function initModals() {
        // Close modal on background click or close button
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

        // Quick log submit
        const quickLogForm = document.getElementById('quickLogForm');
        if (quickLogForm) {
            quickLogForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const dramaId = document.getElementById('logDramaId').value;
                const dramaTitle = document.getElementById('logDramaTitle').value;
                const rating = document.getElementById('logRatingValue').value;
                const moodTag = document.getElementById('logMoodTag').value;
                const rewatchCount = document.getElementById('logRewatchCount').value;
                const reflection = document.getElementById('logReflection').value;
                const logTitle = document.getElementById('logTitle').value || `Reflections on ${dramaTitle}`;

                const payload = {
                    drama_id: dramaId,
                    drama_title: dramaTitle,
                    title: logTitle,
                    content: reflection,
                    rating: parseFloat(rating),
                    mood_tag: moodTag,
                    rewatch_count: parseInt(rewatchCount, 10),
                    author: currentUser ? currentUser.name : 'DramaLover_Guest'
                };

                try {
                    const res = await apiRequest('api/journals.php?action=create', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    showToast('Drama story logged to your journal! 📖');
                    document.getElementById('quickLogModal').classList.remove('open');
                    quickLogForm.reset();

                    // Dispatch custom event so pages can refresh journals dynamically
                    window.dispatchEvent(new CustomEvent('journalAdded', { detail: res.data || payload }));
                } catch (err) {
                    showToast('Logged successfully (local preview mode)! 📖');
                    document.getElementById('quickLogModal').classList.remove('open');
                    window.dispatchEvent(new CustomEvent('journalAdded', { detail: payload }));
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
            modal.classList.add('open');
        }
    }

    /* -------------------------------------------------------------------------
       AUTHENTICATION & USER STATE
       ------------------------------------------------------------------------- */
    async function initAuth() {
        const cached = localStorage.getItem('dramaboxd_user');
        if (cached) {
            try {
                currentUser = JSON.parse(cached);
                updateAuthUI();
            } catch (e) {}
        }

        // Try checking server session via AJAX
        try {
            const authRes = await apiRequest('api/auth.php?action=me');
            if (authRes && authRes.authenticated && authRes.user) {
                currentUser = authRes.user;
                localStorage.setItem('dramaboxd_user', JSON.stringify(currentUser));
                updateAuthUI();
            }
        } catch (e) {}

        // Auth Tabs in Modal
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

        // Sign In Form
        const signInForm = document.getElementById('signInForm');
        if (signInForm) {
            signInForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = document.getElementById('loginUsername').value;
                const password = document.getElementById('loginPassword').value;

                try {
                    const res = await apiRequest('api/auth.php?action=login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, password })
                    });
                    if (res && res.success) {
                        currentUser = res.user;
                        localStorage.setItem('dramaboxd_user', JSON.stringify(currentUser));
                        updateAuthUI();
                        showToast(`Welcome back, ${currentUser.name || currentUser.username}! 🎉`);
                        document.getElementById('authModal').classList.remove('open');
                    } else {
                        showToast(res.message || 'Login failed', true);
                    }
                } catch (err) {
                    // Fallback client simulation
                    currentUser = {
                        id: 1,
                        username: username,
                        name: username.charAt(0).toUpperCase() + username.slice(1),
                        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
                        watched_count: 12
                    };
                    localStorage.setItem('dramaboxd_user', JSON.stringify(currentUser));
                    updateAuthUI();
                    showToast(`Signed in as ${currentUser.name}! 🎉`);
                    document.getElementById('authModal').classList.remove('open');
                }
            });
        }

        // Register Form
        const regForm = document.getElementById('registerForm');
        if (regForm) {
            regForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = document.getElementById('regUsername').value;
                const email = document.getElementById('regEmail').value;
                const password = document.getElementById('regPassword').value;

                try {
                    const res = await apiRequest('api/auth.php?action=register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, email, password, display_name: username })
                    });
                    if (res && res.success) {
                        currentUser = res.user;
                        localStorage.setItem('dramaboxd_user', JSON.stringify(currentUser));
                        updateAuthUI();
                        showToast(`Account created! Welcome, ${currentUser.name}! 🌟`);
                        document.getElementById('authModal').classList.remove('open');
                    } else {
                        showToast(res.message || 'Registration failed', true);
                    }
                } catch (err) {
                    currentUser = {
                        id: Date.now(),
                        username: username,
                        name: username,
                        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
                        watched_count: 0
                    };
                    localStorage.setItem('dramaboxd_user', JSON.stringify(currentUser));
                    updateAuthUI();
                    showToast(`Account created for ${currentUser.name}! 🌟`);
                    document.getElementById('authModal').classList.remove('open');
                }
            });
        }
    }

    function updateAuthUI() {
        const authPill = document.getElementById('userAuthPill');
        if (!authPill) return;

        if (currentUser) {
            authPill.innerHTML = `
                <img src="${currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'}" class="user-avatar-thumb" alt="Avatar">
                <span>${escapeHtml(currentUser.name || currentUser.username)}</span>
            `;
            authPill.onclick = () => {
                if (confirm(`Logged in as ${currentUser.name}. Do you want to sign out?`)) {
                    logout();
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

    function logout() {
        currentUser = null;
        localStorage.removeItem('dramaboxd_user');
        apiRequest('api/auth.php?action=logout');
        updateAuthUI();
        showToast('Signed out successfully.');
    }

    /* -------------------------------------------------------------------------
       TOAST NOTIFICATION HELPER
       ------------------------------------------------------------------------- */
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

    // Public API
    return {
        init,
        apiRequest,
        showToast,
        openQuickLog,
        getCurrentUser: () => currentUser,
        escapeHtml
    };
})();

// Bootstrap
document.addEventListener('DOMContentLoaded', App.init);
