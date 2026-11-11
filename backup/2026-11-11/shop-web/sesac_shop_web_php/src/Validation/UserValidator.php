<?php
declare(strict_types=1);

namespace App\Validation;

use App\Core\HttpException;

/**
 * 요청 검증 (← app/schemas/user.py, Pydantic 대체)
 * 실패하면 422 + 메시지.
 */
class UserValidator
{
    /** @return array{name:string,email:string,password:string,phone:?string,address:?string} */
    public static function signup(array $d): array
    {
        $name     = self::requiredString($d, 'name', 50);
        $email    = self::requiredString($d, 'email', 100);
        $password = self::password($d, 4);

        if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            throw new HttpException(422, 'email 형식이 올바르지 않습니다');
        }

        return [
            'name'     => $name,
            'email'    => $email,
            'password' => $password,
            'phone'    => self::optionalString($d, 'phone', 20),
            'address'  => self::optionalString($d, 'address', 255),
        ];
    }

    /** @return array{email:string,password:string} */
    public static function login(array $d): array
    {
        return [
            'email'    => self::requiredString($d, 'email', 100),
            'password' => self::password($d, 1),
        ];
    }

    private static function requiredString(array $d, string $key, int $max): string
    {
        if (!isset($d[$key]) || !is_string($d[$key]) || trim($d[$key]) === '') {
            throw new HttpException(422, "{$key}은(는) 필수 문자열입니다");
        }
        if (mb_strlen($d[$key], 'UTF-8') > $max) {
            throw new HttpException(422, "{$key}은(는) {$max}자 이하여야 합니다");
        }
        return $d[$key];
    }

    private static function optionalString(array $d, string $key, int $max): ?string
    {
        if (!isset($d[$key]) || $d[$key] === '') {
            return null;
        }
        if (!is_string($d[$key])) {
            throw new HttpException(422, "{$key}은(는) 문자열이어야 합니다");
        }
        if (mb_strlen($d[$key], 'UTF-8') > $max) {
            throw new HttpException(422, "{$key}은(는) {$max}자 이하여야 합니다");
        }
        return $d[$key];
    }

    /** bcrypt는 72바이트까지만 보므로 바이트 길이로 검사한다. */
    private static function password(array $d, int $min): string
    {
        if (!isset($d['password']) || !is_string($d['password'])) {
            throw new HttpException(422, 'password는 필수 문자열입니다');
        }
        $len = strlen($d['password']);
        if ($len < $min) {
            throw new HttpException(422, "password는 {$min}자 이상이어야 합니다");
        }
        if ($len > 72) {
            throw new HttpException(422, 'password는 72바이트 이하여야 합니다');
        }
        return $d['password'];
    }
}
