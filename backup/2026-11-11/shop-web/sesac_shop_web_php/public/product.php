<?php
declare(strict_types=1);

require __DIR__ . '/../src/View/layout.php';
layout_header('상품 상세', 'product', false);
?>
<p class="msg" id="msg" role="alert"></p>
<div class="detail" id="product"><p class="muted">불러오는 중...</p></div>
<?php layout_footer(); ?>