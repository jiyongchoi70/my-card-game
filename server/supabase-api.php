<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$configPath = __DIR__ . '/supabase-config.php';
if (!file_exists($configPath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Supabase configuration missing']);
    exit;
}

$config = require $configPath;
$supabaseUrl = rtrim($config['url'] ?? '', '/');
$serviceRoleKey = $config['service_role_key'] ?? '';
$scoresTable = $config['scores_table'] ?? 'card_flip_scores';

if (!$supabaseUrl || !$serviceRoleKey) {
    http_response_code(500);
    echo json_encode(['error' => 'Supabase configuration invalid']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON payload']);
    exit;
}

$action = $input['action'] ?? '';

try {
    if ($action === 'submitScore') {
        $payload = [
            'player_name' => $input['player_name'] ?? '',
            'attempts' => (int)($input['attempts'] ?? 0),
            'matches' => (int)($input['matches'] ?? 0),
            'elapsed_seconds' => (int)($input['elapsed_seconds'] ?? 0),
        ];

        $curl = curl_init(sprintf('%s/rest/v1/%s', $supabaseUrl, $scoresTable));
        curl_setopt_array($curl, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'apikey: ' . $serviceRoleKey,
                'Authorization: Bearer ' . $serviceRoleKey,
                'Prefer: return=minimal',
            ],
            CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
            CURLOPT_RETURNTRANSFER => true,
        ]);
        $response = curl_exec($curl);
        $status = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        if ($response === false || $status >= 400) {
            throw new RuntimeException('Supabase insert failed', $status ?: 500);
        }
        curl_close($curl);

        echo json_encode(['ok' => true]);
        exit;
    }

    if ($action === 'fetchScores') {
        $query = http_build_query([
            'select' => '*',
            'order' => 'completed_at.desc',
            'limit' => 10,
        ]);

        $curl = curl_init(sprintf('%s/rest/v1/%s?%s', $supabaseUrl, $scoresTable, $query));
        curl_setopt_array($curl, [
            CURLOPT_HTTPHEADER => [
                'apikey: ' . $serviceRoleKey,
                'Authorization: Bearer ' . $serviceRoleKey,
            ],
            CURLOPT_RETURNTRANSFER => true,
        ]);
        $response = curl_exec($curl);
        $status = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        if ($response === false || $status >= 400) {
            throw new RuntimeException('Supabase fetch failed', $status ?: 500);
        }
        curl_close($curl);

        echo $response;
        exit;
    }

    http_response_code(400);
    echo json_encode(['error' => 'Unknown action']);
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode([
        'error' => $error->getMessage(),
        'code' => $error->getCode(),
    ]);
}

