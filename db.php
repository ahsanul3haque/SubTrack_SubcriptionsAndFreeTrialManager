<?php
// 1. Allow the frontend to talk to the backend securely
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json"); 

// 2. Database Credentials (Default XAMPP settings)
$host = "localhost";
$username = "root"; 
$password = "";     
$database = "SubTrack"; // Matches the database we just created

// 3. Make the Connection
$conn = new mysqli($host, $username, $password, $database);

// 4. Check if it worked
if ($conn->connect_error) {
    die(json_encode(["error" => "Database connection failed: " . $conn->connect_error]));
}
?>