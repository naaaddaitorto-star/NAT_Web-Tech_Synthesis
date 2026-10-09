<?php
/**
 * Auth API Router
 * Handles user login, registration, and session checking via AJAX
 */
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . "/controllers/AuthController.php";

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? ($method === 'POST' ? 'login' : 'me');

$payload = [];
if ($method === 'POST') {
    $rawInput = file_get_contents("php://input");
    $decoded = json_decode($rawInput, true);
    $payload = is_array($decoded) ? $decoded : $_POST;
}

$controller = new AuthController();
$response = $controller->handleRequest($action, $payload);

echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
