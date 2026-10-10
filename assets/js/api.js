/**
 * Dramaboxd — Client-Side Data & Service Layer (MVC Model)
 * Pure JavaScript, HTML5, and CSS implementation.
 * Replaces PHP backend with async JSON fetch and localStorage persistence.
 */

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

    /**
     * Vibe & Mood Recommendation Matcher
     */
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

        // Sort by match rate or rating descending
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
