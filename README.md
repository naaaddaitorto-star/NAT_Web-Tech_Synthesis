# NAT_Web-Tech_Synthesis

Naa Adai Torto
15022028

A personal synthesis project to create a functional Asian Drama blogging and community platform. It features a minimalist dark theme, theme personalization, drama poster hover effects, personal story journaling, and community features. It is built using HTML5, CSS, and JavaScript.

## Journals and public blogs

The Journals & Blogs page separates public blog posts from entries in the current user's journal. Every new entry requires a visibility choice: **Public** entries appear in the community feed and homepage stories, while **Private** entries appear only in that user's journal view. Authors can also select up to three genre- and mood-matched dramas to recommend alongside an entry. This prototype stores custom entries in browser `localStorage`, so private entries are local to that browser and public posts are not shared with other visitors until a backend is added.

## Community

The Community page includes seeded discussion topics with searchable, trending, and followed-member views. Visitors can post topics, add replies, like discussions, follow fans, and find journal authors with overlapping drama genres. Community activity and taste preferences are saved in browser `localStorage`, so they remain local to that browser until a shared backend is added.