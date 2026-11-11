(function () {
  'use strict';

  /* ---------- 토큰 보관 (localStorage) ---------- */
  const TOKEN_KEY = 'shop_token';

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
  }
  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
  function clearToken() {
    try { localStorage.removeItem(TOKEN_KEY); } catch (e) { /* 무시 */ }
  }
  function go(url) {
    window.location.href = url;
  }

  /* ---------- API 호출: 토큰이 있으면 헤더에 자동으로 붙인다 ---------- */
  async function api(path, options) {
    options = options || {};
    const headers = {};
    const init = { method: options.method || 'GET', headers: headers };
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(options.body);
    }
    const token = getToken();
    if (token) { headers['Authorization'] = 'Bearer ' + token; }

    const res = await fetch(path, init);
    let data = null;
    try { data = await res.json(); } catch (e) { data = null; }

    if (!res.ok) {
      const err = new Error((data && data.detail) || '요청에 실패했습니다 (' + res.status + ')');
      err.status = res.status;
      throw err;
    }
    return data;
  }

  /* ---------- 화면 그리기 도구 ----------
     서버에서 받은 값은 전부 textContent 로만 넣는다 (innerHTML 금지).
     그래야 상품 이름 등에 악성 스크립트가 섞여 있어도 실행되지 않는다. */
  function el(tag, props, children) {
    const node = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      if (k === 'text') { node.textContent = props[k]; } else { node.setAttribute(k, props[k]); }
    });
    (children || []).forEach(function (c) { node.appendChild(c); });
    return node;
  }
  function clear(node) {
    while (node.firstChild) { node.removeChild(node.firstChild); }
  }
  function won(n) {
    return Number(n).toLocaleString('ko-KR') + '원';
  }
  function showMsg(node, text, kind) {
    node.textContent = text || '';
    node.className = 'msg' + (kind ? ' ' + kind : '');
  }
  function isDigits(v) {
    return /^[0-9]+$/.test(v || '');
  }
  function query() {
    return new URLSearchParams(window.location.search);
  }
  function pick(map, key) {
    return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : undefined;
  }

  /* 401 이면 토큰을 지우고 로그인 화면으로 보낸다. 처리했으면 true */
  function handleAuthError(err, msgNode) {
    if (err.status === 401) {
      clearToken();
      go('/login.php?expired=1');
      return true;
    }
    showMsg(msgNode, err.message, 'error');
    return false;
  }
  function requireLogin() {
    if (!getToken()) { go('/login.php'); return false; }
    return true;
  }

  function renderNav() {
    const nav = document.getElementById('nav');
    if (!nav) { return; }
    clear(nav);
    const links = [['/products.php', '상품']];
    if (getToken()) {
      links.push(['/orders.php', '내 주문'], ['/me.php', '내 정보']);
    } else {
      links.push(['/login.php', '로그인'], ['/signup.php', '회원가입']);
    }
    links.forEach(function (l) {
      nav.appendChild(el('a', { href: l[0], text: l[1] }));
    });
    if (getToken()) {
      const out = el('button', { type: 'button', text: '로그아웃' });
      out.addEventListener('click', function () { clearToken(); go('/login.php'); });
      nav.appendChild(out);
    }
  }

  function renderPager(container, state, count, reload) {
    clear(container);
    const prev = el('button', { type: 'button', text: '이전' });
    const next = el('button', { type: 'button', text: '다음' });
    prev.disabled = state.offset === 0;
    next.disabled = count < state.limit;
    prev.addEventListener('click', function () {
      state.offset = Math.max(0, state.offset - state.limit);
      reload();
    });
    next.addEventListener('click', function () {
      state.offset += state.limit;
      reload();
    });
    const label = count === 0 ? '결과 없음' : (state.offset + 1) + '~' + (state.offset + count) + '번째';
    container.appendChild(prev);
    container.appendChild(el('span', { class: 'muted', text: label }));
    container.appendChild(next);
  }

  /* ---------- 상품 이미지 ----------
     서버에 사진 파일이 없으므로 분류별 색상과 아이콘으로 이미지를 직접 그린다.
     외부 주소로 나가는 요청이 없고 저작권 문제도 없다.
     진짜 사진을 쓰려면 CATEGORY_PHOTO 에 파일 경로를 적으면 된다.
     예) '의류': '/assets/img/clothes.jpg'  (파일은 public/assets/img/ 에 넣는다) */
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const CATEGORIES = ['의류', '전자기기', '생활용품', '식품', '도서'];
  const CATEGORY_HUE = { '의류': 340, '전자기기': 222, '생활용품': 172, '식품': 28, '도서': 265 };
  const CATEGORY_PHOTO = { '의류': '', '전자기기': '', '생활용품': '', '식품': '', '도서': '' };

  function svg(tag, attrs) {
    const n = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }

  const ICONS = {
    '의류': function () {
      return [svg('path', { d: 'M42 20 C46 28 74 28 78 20 L102 32 L92 54 L80 48 L80 100 L40 100 L40 48 L28 54 L18 32 Z' })];
    },
    '전자기기': function () {
      return [
        svg('path', { d: 'M24 70 V60 A36 36 0 0 1 96 60 V70', fill: 'none', stroke: 'rgba(255,255,255,0.92)', 'stroke-width': '8', 'stroke-linecap': 'round' }),
        svg('rect', { x: '14', y: '66', width: '20', height: '34', rx: '9' }),
        svg('rect', { x: '86', y: '66', width: '20', height: '34', rx: '9' })
      ];
    },
    '생활용품': function () {
      return [
        svg('path', { d: 'M38 30 H82 L76 100 Q76 104 72 104 H48 Q44 104 44 100 Z' }),
        svg('rect', { x: '34', y: '20', width: '52', height: '10', rx: '4' }),
        svg('rect', { x: '41', y: '52', width: '38', height: '14', fill: 'rgba(0,0,0,0.14)' })
      ];
    },
    '식품': function () {
      return [
        svg('path', { d: 'M60 38 C48 28 26 34 26 62 C26 86 44 104 60 98 C76 104 94 86 94 62 C94 34 72 28 60 38 Z' }),
        svg('path', { d: 'M60 36 C60 24 68 16 80 14 C80 26 72 34 60 36 Z', fill: 'rgba(255,255,255,0.7)' })
      ];
    },
    '도서': function () {
      return [
        svg('rect', { x: '28', y: '20', width: '64', height: '84', rx: '6' }),
        svg('rect', { x: '28', y: '20', width: '12', height: '84', rx: '4', fill: 'rgba(0,0,0,0.2)' }),
        svg('rect', { x: '50', y: '42', width: '30', height: '6', rx: '3', fill: 'rgba(0,0,0,0.22)' }),
        svg('rect', { x: '50', y: '56', width: '22', height: '6', rx: '3', fill: 'rgba(0,0,0,0.22)' })
      ];
    }
  };

  function defaultIcon() {
    return [
      svg('rect', { x: '30', y: '36', width: '60', height: '50', rx: '6' }),
      svg('rect', { x: '30', y: '36', width: '60', height: '14', rx: '4', fill: 'rgba(0,0,0,0.18)' })
    ];
  }

  function badgeOf(name) {
    const s = String(name);
    if (s.endsWith(' 프리미엄')) { return '프리미엄'; }
    if (s.endsWith(' 한정판')) { return '한정판'; }
    return '';
  }

  function thumbnail(p) {
    const base = pick(CATEGORY_HUE, p.category);
    const hue = (base === undefined ? 215 : base) + (Number(p.id) % 5) * 7;
    const box = el('div', { class: 'thumb' + (p.stock < 1 ? ' soldout' : '') });
    box.setAttribute('style',
      'background: linear-gradient(135deg, hsl(' + hue + ',70%,64%), hsl(' + (hue + 24) + ',68%,48%))');

    const photo = pick(CATEGORY_PHOTO, p.category);
    if (photo) {
      box.appendChild(el('img', { src: photo, alt: p.name, loading: 'lazy' }));
    } else {
      const s = svg('svg', { viewBox: '0 0 120 120', fill: 'rgba(255,255,255,0.92)', 'aria-hidden': 'true' });
      const make = pick(ICONS, p.category) || defaultIcon;
      make().forEach(function (n) { s.appendChild(n); });
      box.appendChild(s);
    }
    const badge = badgeOf(p.name);
    if (badge) { box.appendChild(el('span', { class: 'badge', text: badge })); }
    return box;
  }

  function stockNode(p) {
    if (p.stock < 1) { return el('span', { class: 'stock out', text: '품절' }); }
    if (p.stock <= 10) { return el('span', { class: 'stock low', text: '재고 ' + p.stock + '개 남음' }); }
    return null;
  }

  function productCard(p) {
    const row = [el('span', { class: 'pprice', text: won(p.price) })];
    const stock = stockNode(p);
    if (stock) { row.push(stock); }
    return el('a', { class: 'pcard', href: '/product.php?id=' + encodeURIComponent(String(p.id)) }, [
      thumbnail(p),
      el('div', { class: 'pbody' }, [
        el('div', { class: 'pcat', text: p.category || '-' }),
        el('div', { class: 'pname', text: p.name }),
        el('div', { class: 'prow' }, row)
      ])
    ]);
  }

  /* ---------- 화면별 동작 (body 의 data-page 값으로 고른다) ---------- */
  const pages = {};

  pages.login = function () {
    const form = document.getElementById('login-form');
    const msg = document.getElementById('msg');
    const q = query();
    if (q.get('joined')) { showMsg(msg, '가입이 완료되었습니다. 로그인해 주세요.', 'ok'); }
    if (q.get('expired')) { showMsg(msg, '로그인이 만료되었습니다. 다시 로그인해 주세요.', 'error'); }

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const button = form.querySelector('button');
      button.disabled = true;
      showMsg(msg, '');
      try {
        const data = await api('/api/v2/login', {
          method: 'POST',
          body: { email: form.elements['email'].value, password: form.elements['password'].value }
        });
        setToken(data.access_token);
        go('/products.php');
      } catch (err) {
        showMsg(msg, err.message, 'error');
        button.disabled = false;
      }
    });
  };

  pages.signup = function () {
    const form = document.getElementById('signup-form');
    const msg = document.getElementById('msg');

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const button = form.querySelector('button');
      button.disabled = true;
      showMsg(msg, '');
      const body = {
        name: form.elements['name'].value,
        email: form.elements['email'].value,
        password: form.elements['password'].value
      };
      if (form.elements['phone'].value) { body.phone = form.elements['phone'].value; }
      if (form.elements['address'].value) { body.address = form.elements['address'].value; }
      try {
        await api('/api/v2/signup', { method: 'POST', body: body });
        go('/login.php?joined=1');
      } catch (err) {
        showMsg(msg, err.message, 'error');
        button.disabled = false;
      }
    });
  };

  pages.products = function () {
    const chipBox = document.getElementById('chips');
    const limitSelect = document.getElementById('limit');
    const list = document.getElementById('list');
    const pager = document.getElementById('pager');
    const msg = document.getElementById('msg');
    const state = { limit: 20, offset: 0, category: '' };

    function renderChips() {
      clear(chipBox);
      [['', '전체']].concat(CATEGORIES.map(function (c) { return [c, c]; })).forEach(function (pair) {
        const chip = el('button', {
          type: 'button',
          class: 'chip' + (state.category === pair[0] ? ' active' : ''),
          text: pair[1]
        });
        chip.addEventListener('click', function () {
          state.category = pair[0];
          state.offset = 0;
          renderChips();
          load();
        });
        chipBox.appendChild(chip);
      });
    }

    function renderGrid(items) {
      clear(list);
      if (items.length === 0) {
        list.appendChild(el('p', { class: 'muted', text: '상품이 없습니다.' }));
        return;
      }
      items.forEach(function (p) { list.appendChild(productCard(p)); });
    }

    async function load() {
      showMsg(msg, '');
      const params = new URLSearchParams({ limit: String(state.limit), offset: String(state.offset) });
      if (state.category) { params.set('category', state.category); }
      try {
        const items = await api('/api/v2/products?' + params.toString());
        renderGrid(items);
        renderPager(pager, state, items.length, load);
      } catch (err) {
        showMsg(msg, err.message, 'error');
      }
    }

    limitSelect.addEventListener('change', function () {
      state.limit = parseInt(limitSelect.value, 10);
      state.offset = 0;
      load();
    });
    renderChips();
    load();
  };

  pages.product = function () {
    const box = document.getElementById('product');
    const msg = document.getElementById('msg');
    const id = query().get('id');
    if (!isDigits(id)) {
      clear(box);
      showMsg(msg, '잘못된 상품 번호입니다.', 'error');
      return;
    }

    function stockLine(p) {
      if (p.stock < 1) { return el('p', { class: 'stock out', text: '품절' }); }
      if (p.stock <= 10) { return el('p', { class: 'stock low', text: '재고 ' + p.stock + '개 남음' }); }
      return el('p', { class: 'stock', text: '재고 ' + p.stock + '개' });
    }

    function buyBox(p) {
      const wrap = el('div', { class: 'buy' });
      if (!getToken()) {
        wrap.appendChild(el('p', {}, [
          document.createTextNode('주문하려면 '),
          el('a', { href: '/login.php', text: '로그인' }),
          document.createTextNode('해 주세요.')
        ]));
        return wrap;
      }
      if (p.stock < 1) {
        wrap.appendChild(el('p', { class: 'stock out', text: '품절입니다.' }));
        return wrap;
      }

      const qty = el('input', { type: 'number', min: '1', max: '99', value: '1', 'aria-label': '수량' });
      const minus = el('button', { type: 'button', text: '−', 'aria-label': '수량 줄이기' });
      const plus = el('button', { type: 'button', text: '+', 'aria-label': '수량 늘리기' });
      const total = el('strong', { text: won(p.price) });
      const button = el('button', { type: 'submit', class: 'btn', text: '주문하기' });

      function current() {
        const n = Number(qty.value);
        return Number.isInteger(n) ? n : NaN;
      }
      function sync() {
        const n = current();
        total.textContent = won(Number.isNaN(n) || n < 1 ? p.price : p.price * n);
      }
      minus.addEventListener('click', function () {
        const n = current();
        qty.value = String(Math.max(1, (Number.isNaN(n) ? 1 : n) - 1));
        sync();
      });
      plus.addEventListener('click', function () {
        const n = current();
        qty.value = String(Math.min(99, (Number.isNaN(n) ? 0 : n) + 1));
        sync();
      });
      qty.addEventListener('input', sync);

      const form = el('form', {}, [
        el('div', { class: 'qtyrow' }, [el('span', { text: '수량' }), el('div', { class: 'qty' }, [minus, qty, plus])]),
        el('div', { class: 'total-row' }, [el('span', { text: '합계' }), total]),
        button
      ]);
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const n = current();
        if (Number.isNaN(n) || n < 1 || n > 99) {
          showMsg(msg, '수량은 1~99 사이 정수여야 합니다.', 'error');
          return;
        }
        button.disabled = true;
        showMsg(msg, '');
        try {
          const r = await api('/api/v2/orders', {
            method: 'POST',
            body: { items: [{ product_id: Number(id), quantity: n }] }
          });
          showMsg(msg, '주문이 완료되었습니다. 주문번호 ' + r.order_id + ', 합계 ' + won(r.total_price), 'ok');
          msg.appendChild(document.createTextNode(' '));
          msg.appendChild(el('a', { href: '/orders.php', text: '내 주문 보기' }));
          await load();
        } catch (err) {
          handleAuthError(err, msg);
        } finally {
          button.disabled = false;
        }
      });
      wrap.appendChild(form);
      return wrap;
    }

    async function load() {
      try {
        const p = await api('/api/v2/products/' + id);
        clear(box);
        box.appendChild(thumbnail(p));
        box.appendChild(el('div', { class: 'detail-info' }, [
          el('p', { class: 'crumb', text: p.category || '-' }),
          el('h1', { text: p.name }),
          el('div', { class: 'dprice', text: won(p.price) }),
          stockLine(p),
          el('pre', { class: 'desc', text: p.description || '-' }),
          buyBox(p)
        ]));
      } catch (err) {
        clear(box);
        showMsg(msg, err.message, 'error');
      }
    }
    load();
  };

  pages.orders = function () {
    if (!requireLogin()) { return; }
    const list = document.getElementById('list');
    const pager = document.getElementById('pager');
    const msg = document.getElementById('msg');
    const state = { limit: 10, offset: 0 };
    const STATUS_COLOR = { '결제완료': 'blue', '배송중': 'amber', '배송완료': 'green', '취소': 'gray' };

    function renderOrder(o) {
      const thead = el('thead', {}, [el('tr', {}, [
        el('th', { text: '상품' }),
        el('th', { class: 'num', text: '수량' }),
        el('th', { class: 'num', text: '주문 당시 가격' }),
        el('th', { class: 'num', text: '소계' })
      ])]);
      const tbody = el('tbody');
      o.items.forEach(function (it) {
        tbody.appendChild(el('tr', {}, [
          el('td', {}, [el('a', { href: '/product.php?id=' + encodeURIComponent(String(it.product_id)), text: it.name })]),
          el('td', { class: 'num', text: String(it.quantity) }),
          el('td', { class: 'num', text: won(it.price) }),
          el('td', { class: 'num', text: won(it.price * it.quantity) })
        ]));
      });
      return el('div', { class: 'card' }, [
        el('div', { class: 'order-head' }, [
          el('strong', { text: '주문번호 ' + o.id }),
          el('span', { class: 'status ' + (pick(STATUS_COLOR, o.status) || 'gray'), text: String(o.status) }),
          el('span', { class: 'muted', text: String(o.order_date) }),
          el('span', { class: 'total', text: '합계 ' + won(o.total_price) })
        ]),
        el('table', {}, [thead, tbody])
      ]);
    }

    async function load() {
      showMsg(msg, '');
      try {
        const orders = await api('/api/v2/orders/me?limit=' + state.limit + '&offset=' + state.offset);
        clear(list);
        if (orders.length === 0) {
          list.appendChild(el('p', { class: 'muted', text: '주문 내역이 없습니다.' }));
        }
        orders.forEach(function (o) { list.appendChild(renderOrder(o)); });
        renderPager(pager, state, orders.length, load);
      } catch (err) {
        handleAuthError(err, msg);
      }
    }
    load();
  };

  pages.me = async function () {
    if (!requireLogin()) { return; }
    const box = document.getElementById('me');
    const msg = document.getElementById('msg');
    try {
      const u = await api('/api/v2/users/me');
      clear(box);
      box.appendChild(el('div', { class: 'profile' }, [
        el('div', { class: 'avatar', text: Array.from(String(u.name))[0] || '?' }),
        el('dl', { class: 'info' }, [
          el('dt', { text: '번호' }), el('dd', { text: String(u.id) }),
          el('dt', { text: '이름' }), el('dd', { text: u.name }),
          el('dt', { text: '이메일' }), el('dd', { text: u.email }),
          el('dt', { text: '전화번호' }), el('dd', { text: u.phone || '-' }),
          el('dt', { text: '주소' }), el('dd', { text: u.address || '-' })
        ])
      ]));
    } catch (err) {
      clear(box);
      handleAuthError(err, msg);
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    renderNav();
    const page = document.body.getAttribute('data-page');
    if (pages[page]) { pages[page](); }
  });
})();