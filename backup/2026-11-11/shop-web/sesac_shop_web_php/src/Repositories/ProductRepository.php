<?php
declare(strict_types=1);

namespace App\Repositories;

use PDO;

/**
 * 상품 SQL 실행만 담당. 모든 쿼리는 prepared statement.
 */
class ProductRepository
{
    /** @var PDO */
    private $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    /** 상품 목록 (목록에는 설명을 싣지 않는다) */
    public function findAll(int $limit, int $offset, ?string $category): array
    {
        $sql = 'SELECT id, name, price, stock, category FROM products';
        if ($category !== null) {
            $sql .= ' WHERE category = :category';
        }
        $sql .= ' ORDER BY id LIMIT :limit OFFSET :offset';

        $stmt = $this->db->prepare($sql);
        if ($category !== null) {
            $stmt->bindValue(':category', $category, PDO::PARAM_STR);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        $rows = [];
        foreach ($stmt->fetchAll() as $row) {
            $rows[] = self::normalize($row);
        }
        return $rows;
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT id, name, price, stock, description, category, created_at
               FROM products WHERE id = :id'
        );
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();

        $row = $stmt->fetch();
        return $row === false ? null : self::normalize($row);
    }

    /** 숫자 컬럼을 문자열이 아닌 숫자로 돌려준다. */
    private static function normalize(array $row): array
    {
        foreach (['id', 'price', 'stock'] as $key) {
            if (isset($row[$key])) {
                $row[$key] = (int) $row[$key];
            }
        }
        return $row;
    }
}