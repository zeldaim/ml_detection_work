<?php
declare(strict_types=1);

namespace App\Validation;

use App\Core\HttpException;

/**
 * 상품 요청 검증. 실패하면 422 + 메시지.
 */
class ProductValidator
{
    const DEFAULT_LIMIT = 20;
    const MAX_LIMIT     = 100;   // 한 번에 가져갈 수 있는 상한 (레거시 v1의 "무제한"과 대비)
    const MAX_OFFSET    = 1000000;

    /** @return array{limit:int,offset:int,category:?string} */
    public static function listParams(array $query): array
    {
        $limit = self::DEFAULT_LIMIT;
        if (isset($query['limit'])) {
            $limit = self::intInRange($query['limit'], 1, self::MAX_LIMIT, 'limit은 1~' . self::MAX_LIMIT . ' 사이 숫자여야 합니다');
        }

        $offset = 0;
        if (isset($query['offset'])) {
            $offset = self::intInRange($query['offset'], 0, self::MAX_OFFSET, 'offset은 0 이상의 숫자여야 합니다');
        }

        $category = null;
        if (isset($query['category']) && $query['category'] !== '') {
            if (!is_string($query['category']) || mb_strlen($query['category'], 'UTF-8') > 50) {
                throw new HttpException(422, 'category는 50자 이하 문자열이어야 합니다');
            }
            $category = $query['category'];
        }

        return ['limit' => $limit, 'offset' => $offset, 'category' => $category];
    }

    /** 경로의 {id} 검증: 숫자만 허용 */
    public static function id(string $raw): int
    {
        if (!ctype_digit($raw) || strlen($raw) > 18) {
            throw new HttpException(422, 'id는 숫자여야 합니다');
        }
        return (int) $raw;
    }

    /** @param mixed $value */
    private static function intInRange($value, int $min, int $max, string $message): int
    {
        if (!is_string($value) || !ctype_digit($value) || strlen($value) > 9) {
            throw new HttpException(422, $message);
        }
        $n = (int) $value;
        if ($n < $min || $n > $max) {
            throw new HttpException(422, $message);
        }
        return $n;
    }
}