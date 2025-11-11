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
    echo json_encode(['error' => 'Method not allowed.']);
    exit;
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON payload.']);
    exit;
}

$deck = $data['deck'] ?? [];
$matchedIndices = $data['matchedIndices'] ?? [];
$flippedIndices = $data['flippedIndices'] ?? [];
$moves = $data['moves'] ?? 0;

$apiKey = getenv('OPENAI_API_KEY');
if (!$apiKey) {
    http_response_code(500);
    echo json_encode(['error' => 'OPENAI_API_KEY environment variable is not set.']);
    exit;
}

$prompt = buildPrompt($deck, $matchedIndices, $flippedIndices, (int) $moves);

try {
    $hint = requestHintFromOpenAI($apiKey, $prompt);
    echo json_encode(['hint' => $hint], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to fetch hint from OpenAI.',
        'details' => $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}

die();

function buildPrompt(array $deck, array $matchedIndices, array $flippedIndices, int $moves): string
{
    $totalCards = count($deck);
    $matchedCount = count($matchedIndices);
    $flippedCount = count($flippedIndices);

    $stateSummary = sprintf(
        'Total cards: %d, matched cards: %d, currently flipped: %d, moves: %d',
        $totalCards,
        $matchedCount,
        $flippedCount,
        $moves
    );

    $faceMap = [];
    foreach ($deck as $index => $face) {
        $faceMap[] = sprintf('#%d:%s', $index, $face);
    }

    $matchedList = implode(', ', array_map('strval', $matchedIndices));
    $flippedList = implode(', ', array_map('strval', $flippedIndices));

    return <<<PROMPT
You are a helpful assistant for a memory card game. Give the player a short strategy tip in Korean (2-3 sentences). Follow the rules:
- Identical cards remain face up when matched.
- The goal is to minimise the number of moves.

Game state summary: {$stateSummary}
Deck (index:face): {$faceMap}
Matched indices: {$matchedList}
Currently flipped indices: {$flippedList}

Provide one practical hint that helps the player remember or reason about the remaining cards.
PROMPT;
}

function requestHintFromOpenAI(string $apiKey, string $prompt): string
{
    $payload = [
        'model' => 'gpt-4o',
        'messages' => [
            ['role' => 'system', 'content' => 'You give concise, encouraging card-matching tips. Reply in Korean.'],
            ['role' => 'user', 'content' => $prompt],
        ],
        'max_tokens' => 200,
        'temperature' => 0.7,
    ];

    $ch = curl_init('https://api.openai.com/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey,
        ],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
        CURLOPT_TIMEOUT => 20,
    ]);

    $response = curl_exec($ch);

    if ($response === false) {
        throw new RuntimeException('cURL error: ' . curl_error($ch));
    }

    $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($statusCode < 200 || $statusCode >= 300) {
        throw new RuntimeException('OpenAI status code: ' . $statusCode . ' | ' . $response);
    }

    $data = json_decode($response, true);
    if (!isset($data['choices'][0]['message']['content'])) {
        throw new RuntimeException('No message content in OpenAI response.');
    }

    return trim($data['choices'][0]['message']['content']);
}
