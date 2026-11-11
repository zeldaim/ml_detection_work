<?php
declare(strict_types=1);

require __DIR__ . '/../src/View/layout.php';
layout_header('내 주문', 'orders');
?>
<p class="msg" id="msg" role="alert"></p>
<div id="list"></div>
<div class="pager" id="pager"></div>
<?php layout_footer(); ?>