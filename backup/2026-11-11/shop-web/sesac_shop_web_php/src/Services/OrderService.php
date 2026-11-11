<?php
declare(strict_types=1);

namespace App\Services;

use App\Repositories\OrderRepository;

/**
 * 주문 업무 규칙. HTTP는 알지 못한다.
 *  - 가격은 항상 DB 값을 쓴다 (요청에서 받지 않는다)
 *  - 재고 차감, 주문, 주문 상세 저장은 한 트랜잭션: 하나라도 실패하면 전부 취소
 */
class OrderService
{
    /** @var OrderRepository */
    private $orders;

    public function __construct(OrderRepository $orders)
    {
        $this->orders = $orders;
    }

    /**
     * @param array $items [['product_id' => int, 'quantity' => int], ...]
     * @return array{order_id:int,total_price:int}
     */
    public function create(int $userId, array $items): array
    {
        // 항상 같은 순서(상품 번호순)로 잠가서, 동시에 주문해도 서로 기다리다 멈추는 일을 줄인다.
        usort($items, function (array $a, array $b): int {
            return $a['product_id'] <=> $b['product_id'];
        });

        $this->orders->begin();
        try {
            $total = 0;
            $lines = [];

            foreach ($items as $item) {
                $product = $this->orders->lockProduct($item['product_id']);
                if ($product === null) {
                    throw new OrderProductNotFound();
                }
                if ($product['stock'] < $item['quantity']) {
                    throw new InsufficientStock();
                }

                $this->orders->decreaseStock($product['id'], $item['quantity']);
                $total   += $product['price'] * $item['quantity'];
                $lines[] = [
                    'product_id' => $product['id'],
                    'quantity'   => $item['quantity'],
                    'price'      => $product['price'],   // DB 값
                ];
            }

            $orderId = $this->orders->insertOrder($userId, $total);
            foreach ($lines as $line) {
                $this->orders->insertItem($orderId, $line['product_id'], $line['quantity'], $line['price']);
            }

            $this->orders->commit();
        } catch (\Throwable $e) {
            $this->orders->rollBack();
            throw $e;
        }

        return ['order_id' => $orderId, 'total_price' => $total];
    }

    public function listMine(int $userId, int $limit, int $offset): array
    {
        return $this->orders->findByUser($userId, $limit, $offset);
    }
}