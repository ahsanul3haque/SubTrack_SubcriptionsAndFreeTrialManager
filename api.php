<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type");

try {
    require 'db.php'; 

    // --- AUTOMATIC SCHEMA UPGRADE ---
    $checkColumn = $conn->query("SHOW COLUMNS FROM User_Subscriptions LIKE 'AutoRenew'");
    if ($checkColumn && $checkColumn->num_rows == 0) {
        $conn->query("ALTER TABLE User_Subscriptions ADD COLUMN AutoRenew BOOLEAN NOT NULL DEFAULT 1");
    }
    // --------------------------------

    $action = $_GET['action'] ?? '';
    $raw_input = file_get_contents("php://input");
    $data = json_decode($raw_input, true);

    if ($action == 'login') {
        $email = $conn->real_escape_string($data['email'] ?? '');
        $pass = $conn->real_escape_string($data['password'] ?? '');
        $result = $conn->query("SELECT UserID, Name, Email FROM Users WHERE Email='$email' AND PasswordHash='$pass'");
        
        if ($result->num_rows > 0) {
            echo json_encode(["success" => true, "user" => $result->fetch_assoc()]);
        } else {
            echo json_encode(["success" => false]);
        }
    }
    elseif ($action == 'getSubs') {
        $userId = intval($_GET['userId'] ?? 0);
        $query = "SELECT us.*, s.ServiceName, s.CategoryID, c.CategoryName 
                  FROM User_Subscriptions us 
                  JOIN Services s ON us.ServiceID = s.ServiceID 
                  LEFT JOIN Categories c ON s.CategoryID = c.CategoryID
                  WHERE us.UserID = $userId";
                  
        $result = $conn->query($query);
        $subs = [];
        while($row = $result->fetch_assoc()) {
            $subs[] = $row;
        }
        echo json_encode($subs);
    }
    elseif ($action == 'createSub') {
        $userId = intval($data['userId'] ?? 0);
        $amount = floatval($data['amount'] ?? 0);
        $cycle = $conn->real_escape_string($data['cycle'] ?? '');
        $date = $conn->real_escape_string($data['nextDate'] ?? '');
        $status = $conn->real_escape_string($data['status'] ?? '');
        $isTrial = intval($data['isTrial'] ?? 0);
        $autoRenew = intval($data['autoRenew'] ?? 1); 

        $svcId = $data['svcId'] ?? null;
        $customName = $data['customName'] ?? null;
        $customCatId = $data['customCatId'] ?? null;
        $newCategoryName = $data['newCategoryName'] ?? null;

        if ($newCategoryName !== null) {
            $catNameEscaped = $conn->real_escape_string($newCategoryName);
            $conn->query("INSERT INTO Categories (CategoryName) VALUES ('$catNameEscaped')");
            $customCatId = $conn->insert_id; 
        }
        if ($customName !== null) {
            $cName = $conn->real_escape_string($customName);
            $cCat = intval($customCatId);
            $conn->query("INSERT INTO Services (ServiceName, CategoryID) VALUES ('$cName', $cCat)");
            $svcId = $conn->insert_id; 
        } else {
            $svcId = intval($svcId);
        }

        $sql = "INSERT INTO User_Subscriptions (BillingAmount, BillingCycle, NextBillingDate, IsFreeTrial, AutoRenew, Status, UserID, ServiceID) 
                VALUES ($amount, '$cycle', '$date', $isTrial, $autoRenew, '$status', $userId, $svcId)";

        $conn->query($sql); 
        echo json_encode(["success" => true]);
    }
    // ── UPDATE: Full Edit Subscription (This is what your Save Changes button needs!) ──
    elseif ($action == 'editSub') {
        $subId = intval($data['id'] ?? 0);
        $amount = floatval($data['amount'] ?? 0);
        $cycle = $conn->real_escape_string($data['cycle'] ?? '');
        $date = $conn->real_escape_string($data['nextDate'] ?? '');
        $status = $conn->real_escape_string($data['status'] ?? '');
        $isTrial = intval($data['isTrial'] ?? 0);
        $autoRenew = intval($data['autoRenew'] ?? 1); 

        $svcId = $data['svcId'] ?? null;
        $customName = $data['customName'] ?? null;
        $customCatId = $data['customCatId'] ?? null;
        $newCategoryName = $data['newCategoryName'] ?? null;

        if ($newCategoryName !== null) {
            $catNameEscaped = $conn->real_escape_string($newCategoryName);
            $conn->query("INSERT INTO Categories (CategoryName) VALUES ('$catNameEscaped')");
            $customCatId = $conn->insert_id; 
        }
        if ($customName !== null) {
            $cName = $conn->real_escape_string($customName);
            $cCat = intval($customCatId);
            $conn->query("INSERT INTO Services (ServiceName, CategoryID) VALUES ('$cName', $cCat)");
            $svcId = $conn->insert_id; 
        } else {
            $svcId = intval($svcId);
        }

        $sql = "UPDATE User_Subscriptions SET 
                BillingAmount=$amount, 
                BillingCycle='$cycle', 
                NextBillingDate='$date', 
                IsFreeTrial=$isTrial, 
                AutoRenew=$autoRenew, 
                Status='$status', 
                ServiceID=$svcId 
                WHERE SubscriptionID=$subId";

        $conn->query($sql); 
        echo json_encode(["success" => true]);
    }
    elseif ($action == 'updateSub') {
        $subId = intval($data['id'] ?? 0);
        $status = $conn->real_escape_string($data['status'] ?? '');
        $conn->query("UPDATE User_Subscriptions SET Status='$status' WHERE SubscriptionID=$subId");
        echo json_encode(["success" => true]);
    }
    elseif ($action == 'toggleAutoRenew') {
        $subId = intval($data['id'] ?? 0);
        $autoRenew = intval($data['autoRenew'] ?? 0);
        $conn->query("UPDATE User_Subscriptions SET AutoRenew=$autoRenew WHERE SubscriptionID=$subId");
        echo json_encode(["success" => true]);
    }
    elseif ($action == 'renewSub') {
        $subId = intval($data['id'] ?? 0);
        $newDate = $conn->real_escape_string($data['newDate'] ?? '');
        $conn->query("UPDATE User_Subscriptions SET NextBillingDate='$newDate', Status='Active' WHERE SubscriptionID=$subId");
        echo json_encode(["success" => true]);
    }
    elseif ($action == 'deleteSub') {
        $subId = intval($data['id'] ?? 0);
        $conn->query("DELETE FROM User_Subscriptions WHERE SubscriptionID=$subId");
        echo json_encode(["success" => true]);
    }

} catch (Exception $e) {
    http_response_code(200); 
    echo json_encode([
        "success" => false, 
        "error_message" => $e->getMessage()
    ]);
}
?>