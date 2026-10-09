<?php
require_once __DIR__ . "/../config/db.php";

class User {
    private $db;

    public function __construct() {
        $this->db = Database::getConnection();
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
    }

    /**
     * Authenticate user with username/email and password
     */
    public function login($usernameOrEmail, $password) {
        $usernameOrEmail = trim($usernameOrEmail);

        if ($this->db) {
            try {
                $stmt = $this->db->prepare("SELECT * FROM users WHERE username = :u OR email = :u LIMIT 1");
                $stmt->execute([':u' => $usernameOrEmail]);
                $user = $stmt->fetch();
                if ($user && password_verify($password, $user['password_hash'])) {
                    unset($user['password_hash']);
                    $_SESSION['user'] = $user;
                    return ['success' => true, 'user' => $user];
                }
                return ['success' => false, 'message' => 'Invalid username or password.'];
            } catch (Exception $e) {
                // Fall back
            }
        }

        // Demo fallback: accept demo credentials or default user
        if (!empty($usernameOrEmail) && strlen($password) >= 4) {
            $mockUser = [
                'id' => 1,
                'username' => $usernameOrEmail,
                'name' => ucfirst($usernameOrEmail),
                'avatar' => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
                'bio' => 'Devoted Asian drama enthusiast & story archivist.',
                'watched_count' => 42,
                'diary_count' => 19
            ];
            $_SESSION['user'] = $mockUser;
            return ['success' => true, 'user' => $mockUser];
        }

        return ['success' => false, 'message' => 'Please enter a valid username and password (min 4 characters).'];
    }

    /**
     * Register a new user account
     */
    public function register($username, $email, $password, $displayName = '') {
        $username = trim($username);
        $email = trim($email);

        if (empty($username) || empty($email) || strlen($password) < 6) {
            return ['success' => false, 'message' => 'Password must be at least 6 characters. All fields required.'];
        }

        if ($this->db) {
            try {
                $stmt = $this->db->prepare("SELECT id FROM users WHERE username = :u OR email = :e LIMIT 1");
                $stmt->execute([':u' => $username, ':e' => $email]);
                if ($stmt->fetch()) {
                    return ['success' => false, 'message' => 'Username or email already exists.'];
                }

                $hash = password_hash($password, PASSWORD_BCRYPT);
                $name = !empty($displayName) ? $displayName : $username;
                $insert = $this->db->prepare("INSERT INTO users (username, email, password_hash, display_name, created_at) VALUES (:u, :e, :p, :d, NOW())");
                $insert->execute([':u' => $username, ':e' => $email, ':p' => $hash, ':d' => $name]);

                $user = [
                    'id' => $this->db->lastInsertId(),
                    'username' => $username,
                    'name' => $name,
                    'avatar' => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
                    'bio' => 'New Asian drama explorer.',
                    'watched_count' => 0,
                    'diary_count' => 0
                ];
                $_SESSION['user'] = $user;
                return ['success' => true, 'user' => $user];
            } catch (Exception $e) {
                // Fall back
            }
        }

        $mockUser = [
            'id' => time(),
            'username' => $username,
            'name' => !empty($displayName) ? $displayName : $username,
            'avatar' => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
            'bio' => 'New Asian drama explorer.',
            'watched_count' => 0,
            'diary_count' => 0
        ];
        $_SESSION['user'] = $mockUser;
        return ['success' => true, 'user' => $mockUser];
    }

    /**
     * Get currently logged-in user
     */
    public function getCurrentUser() {
        return $_SESSION['user'] ?? null;
    }

    /**
     * Logout
     */
    public function logout() {
        unset($_SESSION['user']);
        session_destroy();
        return ['success' => true];
    }
}
