<?php
declare(strict_types=1);

// [레거시 v1] 전용 프런트 컨트롤러. v2(public/api/index.php)와 완전히 분리되어 있다.
// 공식 API 문서(openapi.yaml)에는 포함하지 않는다.
// 반드시 격리 환경에서만 켜둔다 — 인터넷 비노출, 팀 IP만 접근 허용.

require __DIR__ . '/../../../vendor/autoload.php';

use App\Api\V1\DiagnosticsController;
use App\Api\V1\LegacyUserController;
use App\Core\Database;
use App\Core\HttpException;
use App\Core\Logger;
use App\Repositories\UserRepository;

ini_set('display_errors', '0');
date_default_timezone_set('Asia/Seoul');

$startedAt = microtime(true);
$requestId = $_SERVER['UNIQUE_ID'] ?? bin2hex(random_bytes(8));
header('X-Request-Id: ' . $requestId);

$config = require __DIR__ . '/../../../config/config.php';
$logger = new Logger(__DIR__ . '/../../../logs/app.log');
$status = 200;

// v2와 같은 모양으로 로그를 남긴다. path 에 공격 문자열이 그대로 찍혀서 탐지에 쓸 수 있다.
register_shutdown_function(function () use ($logger, &$status, $requestId, $startedAt) {
    $logger->write([
        'timestamp'      => date('c', (int) $startedAt),
        'request_id'     => $requestId,
        'client_ip'      => $_SERVER['REMOTE_ADDR'] ?? '',
        'method'         => $_SERVER['REQUEST_METHOD'] ?? '',
        'path'           => Logger::cut($_SERVER['REQUEST_URI'] ?? '', 2000),
        'status'         => http_response_code() ?: $status,
        'response_bytes' => 0,
        'user_id'        => null,   // v1은 인증이 없어 항상 null
        'duration_ms'    => round((microtime(true) - $startedAt) * 1000, 1),
        'user_agent'     => Logger::cut($_SERVER['HTTP_USER_AGENT'] ?? '', 300),
    ]);
});

try {
    $path   = rtrim((string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH), '/');
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

    $db = Database::connect($config['db']);

    if ($method === 'GET' && preg_match('#^/api/v1/users/([^/]+)$#', $path, $m)) {
        (new LegacyUserController(new UserRepository($db)))->show($m[1]);
    } elseif ($method === 'GET' && $path === '/api/v1/diagnostics/ping') {
        $host = $_GET['host'] ?? '';
        (new DiagnosticsController())->ping((string) $host);
    } else {
        $status = 404;
        http_response_code(404);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['detail' => '존재하지 않는 경로입니다'], JSON_UNESCAPED_UNICODE);
    }
} catch (HttpException $e) {
    $status = $e->getStatus();
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['detail' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
} catch (\Throwable $e) {
    $status = 500;
    error_log('[shop-api-v1] ' . get_class($e) . ': ' . $e->getMessage());
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['detail' => '서버 내부 오류'], JSON_UNESCAPED_UNICODE);
}