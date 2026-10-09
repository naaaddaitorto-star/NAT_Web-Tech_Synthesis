<?php
/**
 * Journals & Blogs API Router
 * Dispatches requests to JournalController and returns JSON
 */
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . "/controllers/JournalController.php";

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? ($method === 'POST' ? 'create' : 'recent');

$params = [
    'drama_id' => $_GET['drama_id'] ?? null,
    'limit' => $_GET['limit'] ?? 6
];

$payload = [];
if ($method === 'POST') {
    $rawInput = file_get_contents("php://input");
    $decoded = json_decode($rawInput, true);
    $payload = is_array($decoded) ? $decoded : $_POST;
}

$controller = new JournalController();
$response = $controller->handleRequest($action, $params, $payload);

echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
