(() => {
  'use strict';

  const english = {
    skip: 'Skip to content', announcement: 'No service fee on your first order', announcementCta: 'Ask our team', brandSub: 'Family fashion store', openMenu: 'Open menu',
    navHome: 'Home', navShop: 'Collections', navStory: 'Our Story', navWhy: 'Why Us', navContact: 'Contact', cart: 'Cart',
    heroEyebrow: 'For the little moments that mean the most', heroTitle: 'Warm stories,<br><em>worn in style.</em>', heroLead: 'Comfortable collections for mothers, children, and families—chosen to make every moment together feel a little more special.',
    shopNow: 'Shop the collection', meetUs: 'Meet our story', statCollection: 'Curated pieces', statRating: 'Warm experience', statResponse: 'Admin response',
    heroNoteTitle: 'Made for closeness', heroNoteText: 'Soft & comfortable', heroPickTitle: 'Family favourite', heroPickText: 'Couple Collection',
    promiseQuality: 'Thoughtful quality', promiseQualityText: 'Curated for family comfort', promiseCare: 'Packed with care', promiseCareText: 'Neat, safe, and gift-ready', promiseDelivery: 'Trackable delivery', promiseDeliveryText: 'Trusted couriers across Indonesia', promiseHelp: 'Helpful humans', promiseHelpText: 'Size advice via WhatsApp',
    shopEyebrow: 'Our collections', shopTitle: 'Find what feels like <em>you.</em>', shopIntro: 'Clothing and accessories that are easy to style for everyday life, celebrations, and every story in between.', searchLabel: 'Search products', searchPlaceholder: 'Search collections...', loading: 'Preparing the collection...', emptyTitle: 'Nothing found just yet', emptyText: 'Try another phrase or browse our complete collection.', showAll: 'Show all',
    storyQuote: '“Because the ones we love most deserve to feel comfortable.”', storyEyebrow: 'The Apple of My Eye story', storyTitle: 'Born from a love worth <em>carrying everywhere.</em>', storyP1: 'Apple of My Eye began with a simple thought: family clothing should feel comfortable, look distinctive, and make moments together more memorable.', storyP2: 'We curate each collection with care for fabric, freedom of movement, and how every piece fits into real family life.', storyCta: 'See how we curate each collection',
    whyEyebrow: 'Why shop with us', whyTitle: 'Small details that make a <em>big difference.</em>', valueOne: 'Comfort comes first', valueOneText: 'Pieces are selected to move comfortably with the family all day.', valueTwo: 'Style that feels close', valueTwoText: 'Easy to combine, personal, and made to keep its story.', valueThree: 'Clear information', valueThreeText: 'Prices, sizes, stock, and order totals are calculated transparently.', valueFour: 'Served by humans', valueFourText: 'Our team helps with sizing and confirms every order.',
    testimonialEyebrow: 'From our community', testimonialTitle: 'Stories that travel home with <em>our collection.</em>', reviewOne: '“The fabric is comfortable and the mother-and-child set looks sweet without being too much. The admin was patient in helping with sizing.”', reviewOneMeta: 'Jakarta · Couple Collection', reviewTwo: '“The packaging was so neat, ready to be gifted right away. Confirmation was quick too.”', reviewTwoMeta: 'Bandung · Kids Collection', reviewThree: '“I love that pricing and shipping are clear before ordering. The style works for many occasions.”', reviewThreeMeta: 'Tangerang · Accessories', testimonialNote: 'Sample testimonials for the initial design—replace them with verified customer reviews before publishing.',
    faqEyebrow: 'Frequently asked questions', faqTitle: 'Before your favourite piece <em>comes home.</em>', faqIntro: 'Still unsure about sizing or delivery? Our team is happy to help on WhatsApp.', askAdmin: 'Ask our team', faqOneQ: 'How do I choose a size?', faqOneA: 'Open a product detail to see available sizes. For personal advice, send the wearer’s age and approximate measurements via WhatsApp.', faqTwoQ: 'When will my order be processed?', faqTwoA: 'Orders are processed after payment and stock availability are confirmed by our team.', faqThreeQ: 'Can I exchange a size?', faqThreeA: 'Please confirm the exchange policy before purchase. Products must be unworn with tags still attached.', faqFourQ: 'Is the shipping fee final?', faqFourA: 'The checkout fee is an initial estimate. Our team confirms it based on the address, package weight, and courier service.',
    contactEyebrow: 'We are here to help', contactTitle: 'Choose with ease.<br><em>We are with you.</em>', contactText: 'Ask about sizing, stock, gift packages, or family couple needs directly with our team.', chatWhatsapp: 'Chat on WhatsApp', responseTime: 'Monday–Saturday · 9 AM–6 PM WIB',
    footerAbout: 'Thoughtful collections for families and every moment worth remembering.', footerExplore: 'Explore', footerHelp: 'Help', sizeGuide: 'Size guide', shippingInfo: 'Shipping', exchangeInfo: 'Exchanges', footerContact: 'Contact us', rights: 'All rights reserved.', footerNote: 'Built with care, just like our collection.',
    yourSelection: 'Your selection', shoppingCart: 'Shopping cart', cartEmptyTitle: 'Your cart is still waiting', cartEmptyText: 'Find a collection you would love to bring home.', startShopping: 'Start shopping', subtotal: 'Subtotal', shippingAtCheckout: 'Estimated shipping is calculated at checkout.', continueCheckout: 'Continue to checkout', remove: 'Remove',
    chooseSize: 'Choose size', quantity: 'Quantity', addToCart: 'Add to cart', productMicrocopy: 'Need sizing advice? Chat with our team before ordering.', inStock: 'in stock', viewDetails: 'View details',
    secureOrder: 'Your order is recorded securely', checkoutTitle: 'Complete your order', checkoutIntro: 'Our team will confirm stock, payment, and final shipping via WhatsApp.', successTitle: 'Order successfully created', confirmWhatsapp: 'Confirm on WhatsApp', contactDetails: 'Recipient details', fullName: 'Full name', optional: '(optional)', address: 'Full address', city: 'City / Regency', postalCode: 'Postal code', deliveryPayment: 'Delivery & payment', shippingMethod: 'Shipping method', paymentMethod: 'Payment method', notes: 'Notes', orderSummary: 'Order summary', shippingEstimate: 'Estimated shipping', estimatedTotal: 'Estimated total', placeOrder: 'Place order', checkoutMicrocopy: 'Automated payment is not yet enabled. Bank details are sent after our team confirms your order.', orderCreated: 'Your order {id} has been recorded. Continue to WhatsApp so our team can confirm it.',
    added: '{name} was added to your cart.', loadError: 'The collection could not be loaded. Start the Node.js server with “npm start”, then refresh this page.', submitting: 'Creating order...', orderError: 'We could not create your order. Please review the form and try again.'
  };

  const state = {
    lang: localStorage.getItem('aome-language') === 'en' ? 'en' : 'id',
    store: null,
    products: [],
    category: 'all',
    query: '',
    cart: readCart(),
    selectedProduct: null
  };

  const elements = {
    productGrid: document.querySelector('[data-product-grid]'),
    filters: document.querySelector('[data-category-filters]'),
    search: document.querySelector('[data-product-search]'),
    catalogStatus: document.querySelector('[data-catalog-status]'),
    emptyState: document.querySelector('[data-empty-state]'),
    productTemplate: document.querySelector('#product-card-template'),
    cartTemplate: document.querySelector('#cart-item-template'),
    cartDrawer: document.querySelector('[data-cart-drawer]'),
    drawerBackdrop: document.querySelector('[data-drawer-backdrop]'),
    cartItems: document.querySelector('[data-cart-items]'),
    cartEmpty: document.querySelector('[data-cart-empty]'),
    cartFooter: document.querySelector('[data-cart-footer]'),
    cartSubtotal: document.querySelector('[data-cart-subtotal]'),
    productDialog: document.querySelector('[data-product-dialog]'),
    checkoutDialog: document.querySelector('[data-checkout-dialog]'),
    checkoutForm: document.querySelector('[data-checkout-form]'),
    checkoutSuccess: document.querySelector('[data-checkout-success]'),
    shippingSelect: document.querySelector('[data-shipping-select]'),
    paymentSelect: document.querySelector('[data-payment-select]'),
    formError: document.querySelector('[data-form-error]'),
    toast: document.querySelector('[data-toast]'),
    menu: document.querySelector('#primary-nav'),
    menuToggle: document.querySelector('.menu-toggle')
  };

  function readCart() {
    try {
      const value = JSON.parse(localStorage.getItem('aome-cart') || '[]');
      return Array.isArray(value) ? value.filter((item) => item && typeof item.productId === 'string') : [];
    } catch {
      return [];
    }
  }

  function saveCart() {
    localStorage.setItem('aome-cart', JSON.stringify(state.cart));
  }

  function idText(key) {
    const element = document.querySelector(`[data-i18n="${key}"]`);
    return element?.dataset.idText || element?.textContent?.trim() || key;
  }

  function translate(key, replacements = {}) {
    const base = state.lang === 'en' ? (english[key] || idText(key)) : idText(key);
    return Object.entries(replacements).reduce((text, [name, value]) => text.replace(`{${name}}`, value), base);
  }

  function applyTranslations() {
    document.documentElement.lang = state.lang;
    document.querySelectorAll('[data-i18n]').forEach((element) => {
      if (!element.dataset.idText) {
        element.dataset.idText = element.textContent.trim();
        if (element.children.length) element.dataset.idHtml = element.innerHTML;
      }
      const key = element.dataset.i18n;
      if (element.dataset.idHtml) {
        element.innerHTML = state.lang === 'en' && english[key] ? english[key] : element.dataset.idHtml;
      } else {
        element.textContent = state.lang === 'en' && english[key] ? english[key] : element.dataset.idText;
      }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
      if (!element.dataset.idPlaceholder) element.dataset.idPlaceholder = element.placeholder;
      const key = element.dataset.i18nPlaceholder;
      element.placeholder = state.lang === 'en' ? (english[key] || element.dataset.idPlaceholder) : element.dataset.idPlaceholder;
    });
    document.querySelectorAll('[data-lang]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.lang === state.lang)));
    renderFilters();
    renderProducts();
    renderCart();
    populateCheckoutOptions();
  }

  function productName(product) { return state.lang === 'en' ? product.nameEn : product.nameId; }
  function productDescription(product) { return state.lang === 'en' ? product.descriptionEn : product.descriptionId; }
  function productCategory(product) { return state.lang === 'en' ? product.categoryEn : product.categoryId; }
  function productBadge(product) { return state.lang === 'en' ? product.badgeEn : product.badgeId; }
  function formatMoney(amount) { return new Intl.NumberFormat(state.lang === 'en' ? 'en-ID' : 'id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount); }

  function renderFilters() {
    if (!elements.filters || !state.products.length) return;
    const categories = [{ id: 'all', label: state.lang === 'en' ? 'All' : 'Semua' }];
    const found = new Set();
    state.products.forEach((product) => {
      if (!found.has(product.category)) {
        found.add(product.category);
        categories.push({ id: product.category, label: productCategory(product) });
      }
    });
    elements.filters.replaceChildren(...categories.map((category) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = category.label;
      button.dataset.category = category.id;
      button.setAttribute('aria-pressed', String(state.category === category.id));
      button.addEventListener('click', () => {
        state.category = category.id;
        renderFilters();
        renderProducts();
      });
      return button;
    }));
  }

  function filteredProducts() {
    const query = state.query.toLocaleLowerCase(state.lang === 'en' ? 'en' : 'id');
    return state.products.filter((product) => {
      const categoryMatch = state.category === 'all' || product.category === state.category;
      const searchable = `${productName(product)} ${productDescription(product)} ${productCategory(product)}`.toLocaleLowerCase(state.lang === 'en' ? 'en' : 'id');
      return categoryMatch && (!query || searchable.includes(query));
    });
  }

  function renderProducts() {
    if (!elements.productGrid) return;
    const products = filteredProducts();
    elements.productGrid.replaceChildren();
    products.forEach((product) => {
      const card = elements.productTemplate.content.firstElementChild.cloneNode(true);
      const image = card.querySelector('img');
      image.src = product.image;
      image.alt = productName(product);
      card.querySelector('.product-card__badge').textContent = productBadge(product);
      card.querySelector('.product-card__view').textContent = state.lang === 'en' ? english.viewDetails : 'Lihat detail';
      card.querySelector('.product-card__category').textContent = productCategory(product);
      card.querySelector('h3').textContent = productName(product);
      card.querySelector('.product-card__price strong').textContent = formatMoney(product.price);
      const compare = card.querySelector('.product-card__price del');
      compare.textContent = product.compareAtPrice ? formatMoney(product.compareAtPrice) : '';
      const viewButton = card.querySelector('[data-view-product]');
      viewButton.setAttribute('aria-label', `${state.lang === 'en' ? english.viewDetails : 'Lihat detail'} ${productName(product)}`);
      viewButton.addEventListener('click', () => openProduct(product.id));
      const addButton = card.querySelector('[data-card-add]');
      addButton.setAttribute('aria-label', `${state.lang === 'en' ? english.addToCart : 'Tambah ke keranjang'}: ${productName(product)}`);
      addButton.addEventListener('click', () => addToCart(product.id, product.sizes[0], 1));
      elements.productGrid.append(card);
    });
    elements.emptyState.hidden = products.length !== 0;
    elements.catalogStatus.textContent = state.lang === 'en' ? `${products.length} pieces found` : `${products.length} koleksi ditemukan`;
  }

  function openProduct(productId) {
    const product = state.products.find((item) => item.id === productId);
    if (!product) return;
    state.selectedProduct = product;
    const dialog = elements.productDialog;
    const image = dialog.querySelector('[data-detail-image]');
    image.src = product.image;
    image.alt = productName(product);
    dialog.querySelector('[data-detail-category]').textContent = productCategory(product);
    dialog.querySelector('[data-detail-name]').textContent = productName(product);
    dialog.querySelector('[data-detail-price]').textContent = formatMoney(product.price);
    dialog.querySelector('[data-detail-compare]').textContent = product.compareAtPrice ? formatMoney(product.compareAtPrice) : '';
    dialog.querySelector('[data-detail-description]').textContent = productDescription(product);
    dialog.querySelector('[data-detail-stock]').textContent = state.lang === 'en' ? `${product.stock} ${english.inStock}` : `Stok tersedia: ${product.stock}`;
    const select = dialog.querySelector('[data-detail-size]');
    select.replaceChildren(...product.sizes.map((size) => new Option(size, size)));
    dialog.querySelector('[data-detail-quantity]').value = 1;
    dialog.showModal();
  }

  function addToCart(productId, size, quantity) {
    const product = state.products.find((item) => item.id === productId);
    if (!product) return;
    const safeQuantity = Math.min(Math.max(Number(quantity) || 1, 1), Math.min(10, product.stock));
    const existing = state.cart.find((item) => item.productId === productId && item.size === size);
    if (existing) existing.quantity = Math.min(existing.quantity + safeQuantity, Math.min(10, product.stock));
    else state.cart.push({ productId, size, quantity: safeQuantity });
    saveCart();
    renderCart();
    showToast(state.lang === 'en' ? english.added.replace('{name}', productName(product)) : `${productName(product)} ditambahkan ke keranjang.`);
  }

  function cartDetails() {
    return state.cart.map((item) => {
      const product = state.products.find((entry) => entry.id === item.productId);
      return product ? { ...item, product, lineTotal: product.price * item.quantity } : null;
    }).filter(Boolean);
  }

  function renderCart() {
    const details = cartDetails();
    const count = details.reduce((sum, item) => sum + item.quantity, 0);
    document.querySelectorAll('[data-cart-count]').forEach((element) => { element.textContent = count; });
    elements.cartItems.replaceChildren();
    details.forEach((item) => {
      const row = elements.cartTemplate.content.firstElementChild.cloneNode(true);
      const image = row.querySelector('img');
      image.src = item.product.image;
      image.alt = productName(item.product);
      row.querySelector('h3').textContent = productName(item.product);
      row.querySelector('.cart-item__variant').textContent = `${state.lang === 'en' ? 'Size' : 'Ukuran'}: ${item.size}`;
      row.querySelector('.cart-item__controls span').textContent = item.quantity;
      row.querySelector('.cart-item__price').textContent = formatMoney(item.lineTotal);
      const remove = row.querySelector('[data-remove]');
      remove.textContent = state.lang === 'en' ? english.remove : 'Hapus';
      row.querySelector('[data-decrease]').addEventListener('click', () => changeCart(item, -1));
      row.querySelector('[data-increase]').addEventListener('click', () => changeCart(item, 1));
      remove.addEventListener('click', () => removeCart(item));
      elements.cartItems.append(row);
    });
    const subtotal = details.reduce((sum, item) => sum + item.lineTotal, 0);
    elements.cartSubtotal.textContent = formatMoney(subtotal);
    elements.cartEmpty.hidden = details.length > 0;
    elements.cartFooter.hidden = details.length === 0;
  }

  function changeCart(item, direction) {
    const target = state.cart.find((entry) => entry.productId === item.productId && entry.size === item.size);
    if (!target) return;
    target.quantity = Math.min(target.quantity + direction, Math.min(10, item.product.stock));
    if (target.quantity <= 0) removeCart(item);
    else { saveCart(); renderCart(); }
  }

  function removeCart(item) {
    state.cart = state.cart.filter((entry) => !(entry.productId === item.productId && entry.size === item.size));
    saveCart();
    renderCart();
  }

  function openCart() {
    elements.cartDrawer.classList.add('is-open');
    elements.cartDrawer.setAttribute('aria-hidden', 'false');
    elements.drawerBackdrop.hidden = false;
    document.body.classList.add('drawer-open');
    elements.cartDrawer.querySelector('[data-close-cart]').focus();
  }

  function closeCart() {
    elements.cartDrawer.classList.remove('is-open');
    elements.cartDrawer.setAttribute('aria-hidden', 'true');
    elements.drawerBackdrop.hidden = true;
    document.body.classList.remove('drawer-open');
  }

  function populateCheckoutOptions() {
    if (!state.store) return;
    const selectedShipping = elements.shippingSelect.value;
    const selectedPayment = elements.paymentSelect.value;
    elements.shippingSelect.replaceChildren(...state.store.shipping.map((item) => new Option(`${item.name} — ${item.fee ? formatMoney(item.fee) : (state.lang === 'en' ? 'Free' : 'Gratis')}`, item.id)));
    elements.paymentSelect.replaceChildren(...state.store.payments.map((item) => new Option(state.lang === 'en' ? item.nameEn : item.nameId, item.id)));
    if (state.store.shipping.some((item) => item.id === selectedShipping)) elements.shippingSelect.value = selectedShipping;
    if (state.store.payments.some((item) => item.id === selectedPayment)) elements.paymentSelect.value = selectedPayment;
  }

  function renderCheckoutSummary() {
    const details = cartDetails();
    const wrapper = document.querySelector('[data-checkout-items]');
    wrapper.replaceChildren(...details.map((item) => {
      const row = document.createElement('div');
      row.className = 'checkout-summary-item';
      const name = document.createElement('span');
      name.textContent = `${productName(item.product)} · ${item.size} × ${item.quantity}`;
      const price = document.createElement('strong');
      price.textContent = formatMoney(item.lineTotal);
      row.append(name, price);
      return row;
    }));
    const subtotal = details.reduce((sum, item) => sum + item.lineTotal, 0);
    const shipping = state.store.shipping.find((item) => item.id === elements.shippingSelect.value) || state.store.shipping[0];
    document.querySelector('[data-checkout-subtotal]').textContent = formatMoney(subtotal);
    document.querySelector('[data-checkout-shipping]').textContent = formatMoney(shipping.fee);
    document.querySelector('[data-checkout-total]').textContent = formatMoney(subtotal + shipping.fee);
  }

  function openCheckout() {
    if (!cartDetails().length || !state.store) return;
    closeCart();
    elements.checkoutSuccess.hidden = true;
    elements.checkoutForm.hidden = false;
    elements.formError.hidden = true;
    populateCheckoutOptions();
    renderCheckoutSummary();
    elements.checkoutDialog.showModal();
  }

  async function submitOrder(event) {
    event.preventDefault();
    elements.formError.hidden = true;
    const submitButton = document.querySelector('[data-submit-order]');
    const originalText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = state.lang === 'en' ? english.submitting : 'Membuat pesanan...';
    const data = new FormData(elements.checkoutForm);
    const payload = {
      customer: {
        name: data.get('name'), whatsapp: data.get('whatsapp'), email: data.get('email'),
        address: data.get('address'), city: data.get('city'), postalCode: data.get('postalCode'), notes: data.get('notes')
      },
      shippingId: data.get('shippingId'), paymentId: data.get('paymentId'),
      items: state.cart.map((item) => ({ productId: item.productId, size: item.size, quantity: item.quantity }))
    };
    try {
      const response = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error([result.error, ...(result.details || [])].join(' '));
      state.cart = [];
      saveCart();
      renderCart();
      elements.checkoutForm.hidden = true;
      elements.checkoutSuccess.hidden = false;
      document.querySelector('[data-order-success-text]').textContent = state.lang === 'en'
        ? english.orderCreated.replace('{id}', result.order.id)
        : `Pesanan ${result.order.id} sudah tercatat. Lanjutkan ke WhatsApp agar admin dapat mengonfirmasinya.`;
      document.querySelector('[data-order-whatsapp]').href = result.whatsappUrl;
      elements.checkoutForm.reset();
    } catch (error) {
      elements.formError.textContent = error.message || (state.lang === 'en' ? english.orderError : 'Pesanan belum dapat dibuat. Periksa kembali formulir dan coba lagi.');
      elements.formError.hidden = false;
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  }

  let toastTimer;
  function showToast(message) {
    clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.hidden = false;
    toastTimer = setTimeout(() => { elements.toast.hidden = true; }, 2800);
  }

  function applyStoreDetails() {
    if (!state.store) return;
    const whatsappUrl = `https://wa.me/${state.store.whatsapp}?text=${encodeURIComponent(state.lang === 'en' ? 'Hello Apple of My Eye, I would like to ask about your collection.' : 'Halo Apple of My Eye, saya ingin bertanya tentang koleksinya.')}`;
    document.querySelectorAll('[data-whatsapp-link]').forEach((link) => { link.href = whatsappUrl; });
    document.querySelectorAll('[data-store-email]').forEach((element) => {
      element.textContent = state.store.email;
      if (element.tagName === 'A') element.href = `mailto:${state.store.email}`;
    });
    document.querySelectorAll('[data-store-location]').forEach((element) => { element.textContent = state.store.location; });
    document.querySelectorAll('[data-store-instagram]').forEach((element) => { element.textContent = state.store.instagram; });
  }

  function bindEvents() {
    document.querySelectorAll('[data-open-cart]').forEach((button) => button.addEventListener('click', openCart));
    document.querySelector('[data-close-cart]').addEventListener('click', closeCart);
    elements.drawerBackdrop.addEventListener('click', closeCart);
    document.querySelector('[data-cart-shop]').addEventListener('click', () => { closeCart(); document.querySelector('#shop').scrollIntoView(); });
    document.querySelector('[data-open-checkout]').addEventListener('click', openCheckout);
    document.querySelector('[data-close-product]').addEventListener('click', () => elements.productDialog.close());
    document.querySelector('[data-close-checkout]').addEventListener('click', () => elements.checkoutDialog.close());
    document.querySelector('[data-detail-add]').addEventListener('click', () => {
      if (!state.selectedProduct) return;
      const size = elements.productDialog.querySelector('[data-detail-size]').value;
      const quantity = elements.productDialog.querySelector('[data-detail-quantity]').value;
      addToCart(state.selectedProduct.id, size, quantity);
      elements.productDialog.close();
      openCart();
    });
    elements.productDialog.addEventListener('click', (event) => { if (event.target === elements.productDialog) elements.productDialog.close(); });
    elements.checkoutDialog.addEventListener('click', (event) => { if (event.target === elements.checkoutDialog) elements.checkoutDialog.close(); });
    elements.checkoutForm.addEventListener('submit', submitOrder);
    elements.shippingSelect.addEventListener('change', renderCheckoutSummary);
    elements.search.addEventListener('input', (event) => { state.query = event.target.value.trim(); renderProducts(); });
    document.querySelector('[data-reset-filter]').addEventListener('click', () => { state.category = 'all'; state.query = ''; elements.search.value = ''; renderFilters(); renderProducts(); });
    document.querySelectorAll('[data-lang]').forEach((button) => button.addEventListener('click', () => {
      state.lang = button.dataset.lang;
      localStorage.setItem('aome-language', state.lang);
      applyTranslations();
      applyStoreDetails();
    }));
    elements.menuToggle.addEventListener('click', () => {
      const open = !elements.menu.classList.contains('is-open');
      elements.menu.classList.toggle('is-open', open);
      elements.menuToggle.setAttribute('aria-expanded', String(open));
    });
    elements.menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
      elements.menu.classList.remove('is-open');
      elements.menuToggle.setAttribute('aria-expanded', 'false');
    }));
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && elements.cartDrawer.classList.contains('is-open')) closeCart(); });
  }

  async function init() {
    document.querySelector('[data-current-year]').textContent = new Date().getFullYear();
    document.querySelectorAll('[data-i18n]').forEach((element) => {
      element.dataset.idText = element.textContent.trim();
      if (element.children.length) element.dataset.idHtml = element.innerHTML;
    });
    bindEvents();
    renderCart();
    try {
      const response = await fetch('/api/store');
      if (!response.ok) throw new Error('Store API unavailable');
      const payload = await response.json();
      state.store = payload.store;
      state.products = payload.products;
      state.cart = state.cart.filter((item) => state.products.some((product) => product.id === item.productId));
      saveCart();
      applyTranslations();
      applyStoreDetails();
    } catch {
      elements.catalogStatus.textContent = state.lang === 'en' ? english.loadError : 'Koleksi belum dapat dimuat. Jalankan server Node.js dengan “npm start”, lalu muat ulang halaman ini.';
      elements.catalogStatus.classList.add('form-error');
    }
  }

  init();
})();
