<?php
require_once __DIR__ . "/../config/db.php";

class Drama {
    private $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    /**
     * Get all dramas, optionally filtered by keyword, country, or genre
     */
    public function getAll($search = null, $country = null, $genre = null) {
        if ($this->db) {
            try {
                $query = "SELECT * FROM dramas WHERE 1=1";
                $params = [];

                if (!empty($search)) {
                    $query .= " AND (title LIKE :search OR native_title LIKE :search OR synopsis LIKE :search)";
                    $params[':search'] = "%$search%";
                }
                if (!empty($country)) {
                    $query .= " AND country = :country";
                    $params[':country'] = $country;
                }
                if (!empty($genre)) {
                    $query .= " AND genres LIKE :genre";
                    $params[':genre'] = "%$genre%";
                }

                $query .= " ORDER BY rating DESC";
                $stmt = $this->db->prepare($query);
                $stmt->execute($params);
                $results = $stmt->fetchAll();

                // Format genres JSON string to array if needed
                foreach ($results as &$item) {
                    if (isset($item['genres']) && is_string($item['genres'])) {
                        $item['genres'] = json_decode($item['genres'], true) ?: explode(",", $item['genres']);
                    }
                }
                return $results;
            } catch (Exception $e) {
                // Fall back to seed data if query fails
            }
        }

        // Fallback JSON mode
        $data = Database::getFallbackData();
        $dramas = $data['dramas'] ?? [];

        if (!empty($search)) {
            $searchLower = strtolower($search);
            $dramas = array_filter($dramas, function($d) use ($searchLower) {
                return strpos(strtolower($d['title']), $searchLower) !== false
                    || strpos(strtolower($d['native_title']), $searchLower) !== false
                    || strpos(strtolower($d['synopsis']), $searchLower) !== false;
            });
        }

        if (!empty($country)) {
            $dramas = array_filter($dramas, function($d) use ($country) {
                return strtolower($d['country']) === strtolower($country)
                    || strtolower($d['country_code']) === strtolower($country);
            });
        }

        if (!empty($genre)) {
            $genreLower = strtolower($genre);
            $dramas = array_filter($dramas, function($d) use ($genreLower) {
                if (isset($d['genres']) && is_array($d['genres'])) {
                    foreach ($d['genres'] as $g) {
                        if (strtolower($g) === $genreLower) return true;
                    }
                }
                return false;
            });
        }

        return array_values($dramas);
    }

    /**
     * Get single drama by ID
     */
    public function getById($id) {
        $id = (int)$id;
        if ($this->db) {
            try {
                $stmt = $this->db->prepare("SELECT * FROM dramas WHERE id = :id LIMIT 1");
                $stmt->execute([':id' => $id]);
                $item = $stmt->fetch();
                if ($item) {
                    if (isset($item['genres']) && is_string($item['genres'])) {
                        $item['genres'] = json_decode($item['genres'], true) ?: explode(",", $item['genres']);
                    }
                    return $item;
                }
            } catch (Exception $e) {
                // Fall back
            }
        }

        $data = Database::getFallbackData();
        foreach ($data['dramas'] ?? [] as $d) {
            if ($d['id'] == $id) {
                return $d;
            }
        }
        return null;
    }

    /**
     * Get Spotlight / Featured Drama for Hero Banner
     */
    public function getSpotlight() {
        $all = $this->getAll();
        foreach ($all as $d) {
            if (!empty($d['spotlight'])) {
                return $d;
            }
        }
        return $all[0] ?? null;
    }

    /**
     * Get Trending Dramas for Home Carousel / Grid
     */
    public function getTrending($limit = 6) {
        $all = $this->getAll();
        $trending = array_filter($all, function($d) {
            return !empty($d['trending']);
        });
        if (empty($trending)) {
            $trending = $all;
        }
        return array_slice(array_values($trending), 0, $limit);
    }
}
