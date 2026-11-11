<?php
declare(strict_types=1);

namespace App\Services;

use App\Repositories\ProductRepository;

/**
 * 상품 업무 규칙. HTTP는 알지 못한다.
 */
class ProductService
{
    /** @var ProductRepository */
    private $products;

    public function __construct(ProductRepository $products)
    {
        $this->products = $products;
    }

    public function list(int $limit, int $offset, ?string $category): array
    {
        return $this->products->findAll($limit, $offset, $category);
    }

    public function get(int $id): array
    {
        $product = $this->products->findById($id);
        if ($product === null) {
            throw new ProductNotFound();
        }
        return $product;
    }
}