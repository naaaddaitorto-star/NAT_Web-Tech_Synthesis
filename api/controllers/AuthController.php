<?php
require_once __DIR__ . "/../models/User.php";

class AuthController {
    private $userModel;

    public function __construct() {
        $this->userModel = new User();
    }

    public function handleRequest($action, $payload = []) {
        switch ($action) {
            case 'login':
                $username = $payload['username'] ?? '';
                $password = $payload['password'] ?? '';
                return $this->userModel->login($username, $password);

            case 'register':
                $username = $payload['username'] ?? '';
                $email = $payload['email'] ?? '';
                $password = $payload['password'] ?? '';
                $displayName = $payload['display_name'] ?? '';
                return $this->userModel->register($username, $email, $password, $displayName);

            case 'logout':
                return $this->userModel->logout();

            case 'me':
            default:
                $currentUser = $this->userModel->getCurrentUser();
                return [
                    'authenticated' => $currentUser !== null,
                    'user' => $currentUser
                ];
        }
    }
}
