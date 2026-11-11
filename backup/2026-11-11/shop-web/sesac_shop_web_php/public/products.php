<?php
declare(strict_types=1);

require __DIR__ . '/../src/View/layout.php';
layout_header('상품 목록', 'products', false);
?>
<section class="hero">
  <h1>오늘의 쇼핑</h1>
  <p>분류별로 둘러보고 바로 주문해 보세요.</p>
</section>
<div class="toolbar">
  <div class="chips" id="chips"></div>
  <label class="perpage">보기
    <select id="limit">
      <option value="20" selected>20개</option>
      <option value="40">40개</option>
      <option value="100">100개</option>
    </select>
  </label>
</div>
<p class="msg" id="msg" role="alert"></p>
<div class="grid" id="list"></div>
<div class="pager" id="pager"></div>
<?php layout_footer(); ?>