<?php
require_once __DIR__ . "/../config/db.php";

class Journal {
    private $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    /**
     * Get recent journal entries
     */
    public function getRecent($limit = 6) {
        if ($this->db) {
            try {
                $stmt = $this->db->prepare("SELECT * FROM journals ORDER BY created_at DESC LIMIT :limit");
                $stmt->bindValue(':limit', (int)$limit, PDO::PARAM_INT);
                $stmt->execute();
                $entries = $stmt->fetchAll();
                foreach ($entries as &$entry) {
                    if (isset($entry['tags']) && is_string($entry['tags'])) {
                        $entry['tags'] = json_decode($entry['tags'], true) ?: explode(",", $entry['tags']);
                    }
                }
                return $entries;
            } catch (Exception $e) {
                // Fall back
            }
        }

        $data = Database::getFallbackData();
        $journals = $data['journals'] ?? [];
        return array_slice($journals, 0, $limit);
    }

    /**
     * Get journals for a specific drama
     */
    public function getByDramaId($dramaId) {
        $dramaId = (int)$dramaId;
        if ($this->db) {
            try {
                $stmt = $this->db->prepare("SELECT * FROM journals WHERE drama_id = :drama_id ORDER BY created_at DESC");
                $stmt->execute([':drama_id' => $dramaId]);
                $entries = $stmt->fetchAll();
                foreach ($entries as &$entry) {
                    if (isset($entry['tags']) && is_string($entry['tags'])) {
                        $entry['tags'] = json_decode($entry['tags'], true) ?: explode(",", $entry['tags']);
                    }
                }
                return $entries;
            } catch (Exception $e) {
                // Fall back
            }
        }

        $data = Database::getFallbackData();
        $journals = array_filter($data['journals'] ?? [], function($j) use ($dramaId) {
            return ($j['drama_id'] ?? 0) == $dramaId;
        });
        return array_values($journals);
    }

    /**
     * Create a new journal entry (from quick log or journal page)
     */
    public function create($payload) {
        $title = trim($payload['title'] ?? 'Drama Log Reflection');
        $dramaId = (int)($payload['drama_id'] ?? 1);
        $dramaTitle = trim($payload['drama_title'] ?? 'Featured Drama');
        $author = trim($payload['author'] ?? 'DramaLover');
        $excerpt = trim($payload['content'] ?? ($payload['excerpt'] ?? ''));
        $rating = (float)($payload['rating'] ?? 5.0);
        $rewatchCount = (int)($payload['rewatch_count'] ?? 1);
        $moodTag = trim($payload['mood_tag'] ?? 'Heartfelt ❤️');
        $tags = isset($payload['tags']) && is_array($payload['tags']) ? $payload['tags'] : ['PersonalLog'];

        $newEntry = [
            'id' => time(),
            'drama_id' => $dramaId,
            'drama_title' => $dramaTitle,
            'author' => $author,
            'author_avatar' => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
            'title' => $title,
            'excerpt' => $excerpt,
            'rating' => $rating,
            'rewatch_count' => $rewatchCount,
            'mood_tag' => $moodTag,
            'tags' => $tags,
            'likes' => 1,
            'comments_count' => 0,
            'date' => 'Just now'
        ];

        if ($this->db) {
            try {
                $stmt = $this->db->prepare("INSERT INTO journals (drama_id, drama_title, author, title, content, rating, rewatch_count, mood_tag, tags, created_at) VALUES (:drama_id, :drama_title, :author, :title, :content, :rating, :rewatch_count, :mood_tag, :tags, NOW())");
                $stmt->execute([
                    ':drama_id' => $dramaId,
                    ':drama_title' => $dramaTitle,
                    ':author' => $author,
                    ':title' => $title,
                    ':content' => $excerpt,
                    ':rating' => $rating,
                    ':rewatch_count' => $rewatchCount,
                    ':mood_tag' => $moodTag,
                    ':tags' => json_encode($tags)
                ]);
                $newEntry['id'] = $this->db->lastInsertId();
                return $newEntry;
            } catch (Exception $e) {
                // Return generated in-memory record
            }
        }

        return $newEntry;
    }
}
