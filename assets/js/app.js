/**
 * Dramaboxd — Global Core Application Script
 * Pure JavaScript, HTML, and CSS.
 * Handles Theme Switching, Client Services, Modals, Auth State, and Toasts.
 */

const App = (() => {
    let currentUser = null;

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

    /* -------------------------------------------------------------------------
       LIVE SEARCH (Pure JavaScript)
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

    /* -------------------------------------------------------------------------
       MODAL CONTROLLERS & QUICK LOG
       ------------------------------------------------------------------------- */
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
                    author: currentUser ? currentUser.name : 'DramaLover'
                };

                const created = await JournalService.create(payload);
                showToast('Drama story logged to your journal! 📖');
                document.getElementById('quickLogModal').classList.remove('open');
                quickLogForm.reset();

                // Dispatch event so home page updates immediately
                window.dispatchEvent(new CustomEvent('journalAdded', { detail: created }));
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

    /* -------------------------------------------------------------------------
       TOAST NOTIFICATIONS
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

    return {
        init,
        showToast,
        openQuickLog,
        getCurrentUser: () => currentUser,
        escapeHtml
    };
})();

document.addEventListener('DOMContentLoaded', App.init);
