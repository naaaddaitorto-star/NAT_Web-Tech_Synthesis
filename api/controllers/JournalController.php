<?php
require_once __DIR__ . "/../models/Journal.php";

class JournalController {
    private $journalModel;

    public function __construct() {
        $this->journalModel = new Journal();
    }

    /**
     * Handle incoming journal actions
     */
    public function handleRequest($action, $params = [], $payload = []) {
        switch ($action) {
            case 'create':
                return $this->createJournal($payload);
            case 'by_drama':
                $dramaId = isset($params['drama_id']) ? (int)$params['drama_id'] : 0;
                return $this->getByDrama($dramaId);
            case 'recent':
            default:
                $limit = isset($params['limit']) ? (int)$params['limit'] : 6;
                return $this->getRecent($limit);
        }
    }

    private function getRecent($limit) {
        $journals = $this->journalModel->getRecent($limit);
        return [
            'status' => 'success',
            'count' => count($journals),
            'data' => $journals
        ];
    }

    private function getByDrama($dramaId) {
        $journals = $this->journalModel->getByDramaId($dramaId);
        return [
            'status' => 'success',
            'count' => count($journals),
            'data' => $journals
        ];
    }

    private function createJournal($payload) {
        if (empty($payload['title']) || empty($payload['content'])) {
            return [
                'status' => 'error',
                'message' => 'Both a reflection title and entry content are required.'
            ];
        }

        $created = $this->journalModel->create($payload);
        return [
            'status' => 'success',
            'message' => 'Journal entry logged successfully!',
            'data' => $created
        ];
    }
}
