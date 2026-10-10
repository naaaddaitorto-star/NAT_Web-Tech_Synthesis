const CommunityPage = (() => {
    const STORAGE_KEYS = {
        threads: 'dramaboxd_community_threads',
        replies: 'dramaboxd_community_replies',
        likes: 'dramaboxd_community_likes',
        follows: 'dramaboxd_community_follows',
        tastes: 'dramaboxd_community_tastes'
    };
    const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80';
    const MEMBER_BIOS = [
        'Here for the big feelings, brilliant performances, and the conversations after the finale.',
        'Collecting comfort watches and soundtracks that stay with me long after the credits.',
        'Always ready to talk character arcs, gentle romances, and the details you almost missed.'
    ];
    const THREAD_MEMBER_TASTES = {
        'k-club_moderator': {
            genres: ['Romance', 'Melodrama', 'Family'],
            bio: 'Bringing drama fans together for watch parties, rewatches, and big feelings.'
        },
        melodyhunter: {
            genres: ['Music', 'Youth', 'Romance'],
            bio: 'Always searching for the next unforgettable drama soundtrack.'
        },
        cinemaphilosopher: {
            genres: ['Sci-Fi', 'Time Loop', 'Family', 'Mystery'],
            bio: 'Here for thoughtful theories, clever mysteries, and stories with heart.'
        }
    };

    let dramas = [];
    let threads = [];
    let members = [];
    let activeFilter = 'all';
    let searchQuery = '';
    let selectedGenres = [];

    function escape(value) {
        return App.escapeHtml(value || '');
    }

    function readStorage(key, fallback) {
        try {
            const value = JSON.parse(localStorage.getItem(key));
            return value === null ? fallback : value;
        } catch (error) {
            console.error(`Could not read community data "${key}":`, error);
            return fallback;
        }
    }

    function writeStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Could not save community data "${key}":`, error);
            App.showToast('Your change could not be saved in this browser.', true);
            return false;
        }
    }

    function getViewerId() {
        const user = App.getCurrentUser();
        return user ? String(user.id) : 'guest';
    }

    function getViewerName() {
        const user = App.getCurrentUser();
        return user ? (user.name || user.username) : 'DramaLover';
    }

    function getFollowedAuthors() {
        const follows = readStorage(STORAGE_KEYS.follows, {});
        return Array.isArray(follows[getViewerId()]) ? follows[getViewerId()] : [];
    }

    function getThreadReplies(threadId) {
        const replies = readStorage(STORAGE_KEYS.replies, {});
        return Array.isArray(replies[String(threadId)]) ? replies[String(threadId)] : [];
    }

    function getThreadLikes(threadId) {
        const likes = readStorage(STORAGE_KEYS.likes, {});
        return Array.isArray(likes[String(threadId)]) ? likes[String(threadId)] : [];
    }

    function getVisibleThreads() {
        const followedAuthors = getFollowedAuthors();
        const query = searchQuery.trim().toLowerCase();
        return threads.filter(thread => {
            if (activeFilter === 'hot' && !thread.hot) return false;
            if (activeFilter === 'following' && !followedAuthors.includes(thread.author)) return false;
            if (!query) return true;
            return [thread.title, thread.body, thread.category, thread.author]
                .join(' ')
                .toLowerCase()
                .includes(query);
        });
    }

    function renderThreads() {
        const list = document.getElementById('communityThreadList');
        if (!list) return;

        const visibleThreads = getVisibleThreads();
        if (!visibleThreads.length) {
            const message = activeFilter === 'following' && !getFollowedAuthors().length
                ? 'Visit Find your people and follow a fan to see their discussions here.'
                : 'No discussions match this view yet. Start a topic or try a different search.';
            list.innerHTML = `<div class="community-empty-state"><h3>No conversations to show</h3><p>${escape(message)}</p></div>`;
            return;
        }

        list.innerHTML = visibleThreads.map(thread => {
            const likes = getThreadLikes(thread.id);
            const replies = getThreadReplies(thread.id);
            const isLiked = likes.includes(getViewerId());
            const isOpen = document.querySelector(`[data-reply-panel="${Number(thread.id)}"]`)?.classList.contains('open') || false;
            return `
                <article class="community-thread-card">
                    <div class="community-thread-main">
                        <div class="community-thread-topline">
                            <span class="community-category">${escape(thread.category || 'General Chat')}</span>
                            ${thread.hot ? '<span class="community-hot-badge">Trending</span>' : ''}
                            <span class="community-thread-date">${escape(thread.date || 'Community topic')}</span>
                        </div>
                        <h3>${escape(thread.title)}</h3>
                        ${thread.body ? `<p class="community-thread-body">${escape(thread.body)}</p>` : ''}
                        <div class="community-thread-byline">
                            <span>Started by <strong>${escape(thread.author || 'DramaLover')}</strong></span>
                            <span>${Number(thread.replies || 0) + replies.length} replies</span>
                        </div>
                        <div class="community-thread-actions">
                            <button class="community-action-button ${isLiked ? 'liked' : ''}" type="button" data-action="like" data-thread-id="${Number(thread.id)}" aria-pressed="${isLiked}">
                                <span aria-hidden="true">${isLiked ? '♥' : '♡'}</span> ${Number(thread.likes || 0) + likes.length}
                            </button>
                            <button class="community-action-button" type="button" data-action="replies" data-thread-id="${Number(thread.id)}" aria-expanded="${isOpen}">
                                <span aria-hidden="true">▢</span> ${isOpen ? 'Close replies' : 'Join the conversation'}
                            </button>
                        </div>
                        <div class="community-reply-panel ${isOpen ? 'open' : ''}" data-reply-panel="${Number(thread.id)}">
                            ${replies.length ? `
                                <div class="community-reply-list">
                                    ${replies.map(reply => `
                                        <div class="community-reply">
                                            <strong>${escape(reply.author)}</strong>
                                            <p>${escape(reply.text)}</p>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : '<p class="community-reply-empty">Be the first to add a reply in this browser.</p>'}
                            <form class="community-reply-form" data-thread-id="${Number(thread.id)}">
                                <label class="visually-hidden" for="reply-${Number(thread.id)}">Write a reply</label>
                                <input id="reply-${Number(thread.id)}" name="reply" type="text" maxlength="300" placeholder="Add your take..." required>
                                <button class="btn-secondary" type="submit">Reply</button>
                            </form>
                        </div>
                    </div>
                </article>
            `;
        }).join('');
    }

    function getTasteKey() {
        return `${STORAGE_KEYS.tastes}_${getViewerId()}`;
    }

    function getInferredViewerGenres() {
        const user = App.getCurrentUser();
        const ownEntries = JournalService.getMyEntries(user ? user.id : 'guest');
        const watchedGenres = ownEntries.flatMap(entry => {
            const drama = dramas.find(item => Number(item.id) === Number(entry.drama_id));
            return drama ? drama.genres || [] : [];
        });
        return [...new Set(watchedGenres)];
    }

    function getSelectedGenres() {
        const saved = readStorage(getTasteKey(), null);
        if (Array.isArray(saved)) return saved;
        const inferred = getInferredViewerGenres();
        return inferred.length ? inferred : ['Romance', 'Melodrama'];
    }

    function renderGenrePicker() {
        const picker = document.getElementById('tasteGenrePicker');
        if (!picker) return;

        const genres = [...new Set(dramas.flatMap(drama => drama.genres || []))]
            .sort((left, right) => left.localeCompare(right));
        document.getElementById('tasteGenreCount').textContent = `${selectedGenres.length} ${selectedGenres.length === 1 ? 'genre' : 'genres'}`;
        picker.innerHTML = genres.map(genre => {
            const selected = selectedGenres.includes(genre);
            return `<button class="taste-genre-chip ${selected ? 'selected' : ''}" type="button" data-genre="${escape(genre)}" aria-pressed="${selected}">${escape(genre)}</button>`;
        }).join('');
    }

    function buildMembers(entries, communityThreads) {
        const grouped = new Map();
        entries.forEach(entry => {
            const name = entry.author || 'DramaLover';
            const key = name.toLowerCase();
            const drama = dramas.find(item => Number(item.id) === Number(entry.drama_id));
            if (!grouped.has(key)) {
                grouped.set(key, {
                    id: String(entry.owner_id || `member:${key}`),
                    name,
                    avatar: entry.author_avatar || DEFAULT_AVATAR,
                    entries: [],
                    genres: new Set(),
                    dramas: new Set(),
                    tags: new Set()
                });
            }
            const member = grouped.get(key);
            member.entries.push(entry);
            (drama?.genres || []).forEach(genre => member.genres.add(genre));
            if (drama) member.dramas.add(drama.title);
            (entry.tags || []).slice(0, 3).forEach(tag => member.tags.add(tag));
        });

        communityThreads.forEach(thread => {
            const name = thread.author || 'DramaLover';
            const key = name.toLowerCase();
            if (grouped.has(key)) return;

            const profile = THREAD_MEMBER_TASTES[key];
            grouped.set(key, {
                id: `member:${key}`,
                name,
                avatar: DEFAULT_AVATAR,
                entries: [],
                genres: new Set(profile ? profile.genres : []),
                dramas: new Set(),
                tags: new Set(),
                bio: profile ? profile.bio : 'A fellow drama fan who loves sharing recommendations and theories.'
            });
        });

        return [...grouped.values()]
            .filter(member => member.id !== getViewerId() && member.name.toLowerCase() !== getViewerName().toLowerCase())
            .map((member, index) => ({
                ...member,
                genres: [...member.genres],
                dramas: [...member.dramas],
                tags: [...member.tags],
                bio: member.bio || MEMBER_BIOS[index % MEMBER_BIOS.length]
            }));
    }

    function renderMembers() {
        const grid = document.getElementById('communityMemberGrid');
        if (!grid) return;

        const followed = getFollowedAuthors();
        const ranked = members.map(member => {
            const overlap = member.genres.filter(genre => selectedGenres.includes(genre));
            const match = selectedGenres.length ? Math.round((overlap.length / selectedGenres.length) * 100) : 0;
            return { member, overlap, match };
        }).sort((left, right) => right.match - left.match || left.member.name.localeCompare(right.member.name));
        const matches = ranked.filter(item => item.match > 0);
        document.getElementById('memberMatchSummary').textContent = selectedGenres.length
            ? `${matches.length} fan${matches.length === 1 ? '' : 's'} share at least one of your favorite genres`
            : 'Choose a few genres to see who shares your taste';

        if (!matches.length) {
            grid.innerHTML = '<div class="community-empty-state"><h3>No taste matches yet</h3><p>Pick a few genres above and we’ll find fans who enjoy the same kinds of dramas.</p></div>';
            return;
        }

        grid.innerHTML = matches.map(({ member, overlap, match }) => {
            const followedByViewer = followed.includes(member.name);
            const sharedTitles = member.dramas.slice(0, 2).map(title => escape(title)).join(' · ');
            return `
                <article class="community-member-card">
                    <div class="community-member-card-head">
                        <img class="community-member-avatar" src="${escape(member.avatar)}" alt="${escape(member.name)}" loading="lazy">
                        <div>
                            <h3>${escape(member.name)}</h3>
                            <span class="member-match-pill">${match}% taste match</span>
                        </div>
                    </div>
                    <p class="community-member-bio">${escape(member.bio)}</p>
                    <div class="community-member-likes">
                        <span>Shared genres</span>
                        <div class="community-member-tags">${overlap.map(genre => `<span class="journal-tag">#${escape(genre)}</span>`).join('')}</div>
                    </div>
                    ${sharedTitles ? `<p class="community-member-drama">Lately: ${sharedTitles}</p>` : ''}
                    <button class="btn-secondary community-follow-button ${followedByViewer ? 'following' : ''}" type="button" data-action="follow" data-member="${escape(member.name)}" aria-pressed="${followedByViewer}">
                        ${followedByViewer ? 'Following ✓' : '＋ Follow fan'}
                    </button>
                </article>
            `;
        }).join('');
    }

    function setActivePanel(panel) {
        document.querySelectorAll('.community-tab').forEach(tab => {
            const active = tab.dataset.panel === panel;
            tab.classList.toggle('active', active);
            tab.setAttribute('aria-selected', String(active));
        });
        document.getElementById('discussionsPanel').classList.toggle('hidden', panel !== 'discussions');
        document.getElementById('fansPanel').classList.toggle('hidden', panel !== 'fans');
    }

    function openComposer() {
        setActivePanel('discussions');
        activeFilter = 'all';
        document.querySelectorAll('.community-feed-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.filter === activeFilter);
        });
        document.getElementById('discussionComposer').classList.remove('hidden');
        renderThreads();
        document.getElementById('discussionTitle').focus();
    }

    async function load() {
        const response = await fetch('data/seed_data.json');
        if (!response.ok) throw new Error(`Community data request failed (${response.status}).`);
        const data = await response.json();
        dramas = await DramaService.getAll();
        const entries = await JournalService.getPublicEntries();
        const savedThreads = readStorage(STORAGE_KEYS.threads, []);
        threads = [...savedThreads, ...(data.community_threads || [])];
        members = buildMembers(entries, data.community_threads || []);
        selectedGenres = getSelectedGenres();

        document.getElementById('communityThreadCount').textContent = threads.length;
        document.getElementById('communityMemberCount').textContent = members.length;
        renderThreads();
        renderGenrePicker();
        renderMembers();
    }

    function addThread(event) {
        event.preventDefault();
        const titleInput = document.getElementById('discussionTitle');
        const bodyInput = document.getElementById('discussionBody');
        const newThread = {
            id: Date.now(),
            category: document.getElementById('discussionCategory').value,
            title: titleInput.value.trim(),
            body: bodyInput.value.trim(),
            author: getViewerName(),
            replies: 0,
            likes: 0,
            hot: false,
            date: 'Just now'
        };
        if (!newThread.title) return;

        const savedThreads = readStorage(STORAGE_KEYS.threads, []);
        if (!writeStorage(STORAGE_KEYS.threads, [newThread, ...savedThreads])) return;
        threads.unshift(newThread);
        event.currentTarget.reset();
        document.getElementById('discussionComposer').classList.add('hidden');
        activeFilter = 'all';
        document.querySelectorAll('.community-feed-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.filter === activeFilter);
        });
        document.getElementById('communityThreadCount').textContent = threads.length;
        renderThreads();
        App.showToast('Your discussion is live in this browser.');
    }

    function toggleLike(threadId) {
        const likes = readStorage(STORAGE_KEYS.likes, {});
        const threadLikes = Array.isArray(likes[String(threadId)]) ? likes[String(threadId)] : [];
        const viewerId = getViewerId();
        likes[String(threadId)] = threadLikes.includes(viewerId)
            ? threadLikes.filter(id => id !== viewerId)
            : [...threadLikes, viewerId];
        if (writeStorage(STORAGE_KEYS.likes, likes)) renderThreads();
    }

    function toggleFollow(memberName) {
        const follows = readStorage(STORAGE_KEYS.follows, {});
        const followed = Array.isArray(follows[getViewerId()]) ? follows[getViewerId()] : [];
        follows[getViewerId()] = followed.includes(memberName)
            ? followed.filter(name => name !== memberName)
            : [...followed, memberName];
        if (writeStorage(STORAGE_KEYS.follows, follows)) {
            renderMembers();
            renderThreads();
            App.showToast(follows[getViewerId()].includes(memberName)
                ? `You're now following ${memberName}.`
                : `Unfollowed ${memberName}.`);
        }
    }

    function addReply(event) {
        event.preventDefault();
        const form = event.target;
        const threadId = form.dataset.threadId;
        const input = form.elements.reply;
        const text = input.value.trim();
        if (!text) return;

        const allReplies = readStorage(STORAGE_KEYS.replies, {});
        const replies = Array.isArray(allReplies[String(threadId)]) ? allReplies[String(threadId)] : [];
        allReplies[String(threadId)] = [...replies, {
            id: Date.now(),
            author: getViewerName(),
            text
        }];
        if (!writeStorage(STORAGE_KEYS.replies, allReplies)) return;
        renderThreads();
        document.querySelector(`[data-reply-panel="${Number(threadId)}"]`)?.classList.add('open');
        const toggle = document.querySelector(`[data-action="replies"][data-thread-id="${Number(threadId)}"]`);
        if (toggle) {
            toggle.setAttribute('aria-expanded', 'true');
            toggle.innerHTML = '<span aria-hidden="true">▢</span> Close replies';
        }
        App.showToast('Reply added.');
    }

    function init() {
        document.querySelectorAll('.community-tab').forEach(tab => {
            tab.addEventListener('click', () => setActivePanel(tab.dataset.panel));
        });
        document.querySelectorAll('.community-feed-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                activeFilter = tab.dataset.filter;
                document.querySelectorAll('.community-feed-tab').forEach(item => {
                    item.classList.toggle('active', item === tab);
                });
                renderThreads();
            });
        });
        document.getElementById('communitySearchInput').addEventListener('input', event => {
            searchQuery = event.currentTarget.value;
            renderThreads();
        });
        document.getElementById('newDiscussionButton').addEventListener('click', openComposer);
        document.getElementById('closeDiscussionComposer').addEventListener('click', () => {
            document.getElementById('discussionComposer').classList.add('hidden');
        });
        document.getElementById('discussionComposer').addEventListener('submit', addThread);
        document.getElementById('communityThreadList').addEventListener('click', event => {
            const button = event.target.closest('button[data-action]');
            if (!button) return;
            if (button.dataset.action === 'like') {
                toggleLike(button.dataset.threadId);
            } else if (button.dataset.action === 'replies') {
                const panel = document.querySelector(`[data-reply-panel="${Number(button.dataset.threadId)}"]`);
                const open = panel.classList.toggle('open');
                button.setAttribute('aria-expanded', String(open));
                button.innerHTML = `<span aria-hidden="true">▢</span> ${open ? 'Close replies' : 'Join the conversation'}`;
            }
        });
        document.getElementById('communityThreadList').addEventListener('submit', addReply);
        document.getElementById('tasteGenrePicker').addEventListener('click', event => {
            const button = event.target.closest('button[data-genre]');
            if (!button) return;
            const genre = button.dataset.genre;
            selectedGenres = selectedGenres.includes(genre)
                ? selectedGenres.filter(item => item !== genre)
                : [...selectedGenres, genre];
            if (!writeStorage(getTasteKey(), selectedGenres)) return;
            renderGenrePicker();
            renderMembers();
        });
        document.getElementById('communityMemberGrid').addEventListener('click', event => {
            const button = event.target.closest('button[data-action="follow"]');
            if (button) toggleFollow(button.dataset.member);
        });

        load().catch(error => {
            console.error('Failed to load the community page:', error);
            document.getElementById('communityThreadList').innerHTML = '<div class="community-empty-state"><h3>Community is unavailable</h3><p>Please refresh the page and try again.</p></div>';
            document.getElementById('communityMemberGrid').innerHTML = '<div class="community-empty-state"><h3>Could not find fans</h3><p>Please refresh the page and try again.</p></div>';
        });
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', CommunityPage.init);
