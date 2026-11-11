<?php
declare(strict_types=1);

namespace App\Api\V1;

use App\Core\HttpException;
use App\Repositories\UserRepository;

/**
 * [레거시 v1 — 의도된 취약점] 인증 누락으로 인한 개인정보 탈취
 *
 * v2의 UserController::me() 와 달리 AuthMiddleware를 거치지 않는다.
 * 토큰이 전혀 없어도, 번호만 바꿔가며 호출하면 다른 사람의 개인정보를 그대로 볼 수 있다.
 * (IDOR + 인증 누락이 겹친 전형적인 형태)
 *
 * 설계 메모: "v2 전환 때 지우지 않고 방치된 레거시"라는 시나리오.
 * Service 계층을 건너뛰고 Repository를 직접 호출한다 (v2의 계층 규칙을 지키지 않음).
 */
class LegacyUserController
{
    /** @var UserRepository */
    private $users;

    public function __construct(UserRepository $users)
    {
        $this->users = $users;
    }

    public function show(string $rawId): void
    {
        if (!ctype_digit($rawId)) {
            throw new HttpException(422, 'id는 숫자여야 합니다');
        }
        // 인증 검사가 아예 없다 — 누구나, 몇 번이든, 어떤 번호든 조회할 수 있다.
        $user = $this->users->getPublicById((int) $rawId);
        if ($user === null) {
            throw new HttpException(404, '존재하지 않는 사용자입니다');
        }
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($user, JSON_UNESCAPED_UNICODE);
    }
}