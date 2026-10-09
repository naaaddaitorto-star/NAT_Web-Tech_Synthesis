<?php
require_once __DIR__ . "/../models/Drama.php";

class DramaController {
    private $dramaModel;

    public function __construct() {
        $this->dramaModel = new Drama();
    }

    /**
     * Handle incoming drama actions
     */
    public function handleRequest($action, $params = []) {
        switch ($action) {
            case 'spotlight':
                return $this->getSpotlight();
            case 'trending':
                $limit = isset($params['limit']) ? (int)$params['limit'] : 6;
                return $this->getTrending($limit);
            case 'detail':
                $id = isset($params['id']) ? (int)$params['id'] : 0;
                return $this->getDetail($id);
            case 'list':
            default:
                $search = $params['search'] ?? null;
                $country = $params['country'] ?? null;
                $genre = $params['genre'] ?? null;
                return $this->getList($search, $country, $genre);
        }
    }

    private function getSpotlight() {
        $item = $this->dramaModel->getSpotlight();
        return [
            'status' => 'success',
            'data' => $item
        ];
    }

    private function getTrending($limit) {
        $items = $this->dramaModel->getTrending($limit);
        return [
            'status' => 'success',
            'count' => count($items),
            'data' => $items
        ];
    }

    private function getList($search, $country, $genre) {
        $items = $this->dramaModel->getAll($search, $country, $genre);
        return [
            'status' => 'success',
            'count' => count($items),
            'data' => $items
        ];
    }

    private function getDetail($id) {
        $item = $this->dramaModel->getById($id);
        if (!$item) {
            return [
                'status' => 'error',
                'message' => 'Drama not found'
            ];
        }
        return [
            'status' => 'success',
            'data' => $item
        ];
    }
}
