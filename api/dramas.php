<?php
/**
 * Dramas API Router
 * Dispatches requests to DramaController and returns JSON
 */
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . "/controllers/DramaController.php";

$action = $_GET['action'] ?? 'list';
$params = [
    'id' => $_GET['id'] ?? null,
    'search' => $_GET['search'] ?? null,
    'country' => $_GET['country'] ?? null,
    'genre' => $_GET['genre'] ?? null,
    'limit' => $_GET['limit'] ?? 6
];

$controller = new DramaController();
$response = $controller->handleRequest($action, $params);

echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
