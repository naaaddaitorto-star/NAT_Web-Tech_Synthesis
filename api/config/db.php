<?php
/**
 * Database Connection & Data Provider Configuration
 * Connects to MySQL with PDO; seamlessly falls back to local JSON data
 * if MySQL is not yet configured, ensuring zero downtime during review.
 */

class Database {
    private static $host = "localhost";
    private static $db_name = "dramaboxd_db";
    private static $username = "root";
    private static $password = "";
    private static $conn = null;

    public static function getConnection() {
        if (self::$conn !== null) {
            return self::$conn;
        }

        try {
            $dsn = "mysql:host=" . self::$host . ";dbname=" . self::$db_name . ";charset=utf8mb4";
            self::$conn = new PDO($dsn, self::$username, self::$password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_TIMEOUT => 2
            ]);
            return self::$conn;
        } catch (PDOException $e) {
            // Log notice and return null to trigger JSON fallback mode gracefully
            error_log("Database connection failed (running in fallback JSON mode): " . $e->getMessage());
            self::$conn = null;
            return null;
        }
    }

    /**
     * Helper to read seed JSON fallback file
     */
    public static function getFallbackData() {
        $filePath = __DIR__ . "/../data/seed_data.json";
        if (file_exists($filePath)) {
            $jsonContent = file_get_contents($filePath);
            return json_decode($jsonContent, true);
        }
        return [
            "dramas" => [],
            "journals" => [],
            "community_threads" => []
        ];
    }
}
