<?php
declare(strict_types=1);

require __DIR__ . '/../src/View/layout.php';
layout_header('내 정보', 'me');
?>
<p class="msg" id="msg" role="alert"></p>
<div class="card" id="me"><p class="muted">불러오는 중...</p></div>
<?php layout_footer(); ?>