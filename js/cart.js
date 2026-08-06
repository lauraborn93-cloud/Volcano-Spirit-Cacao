(function () {
  "use strict";

  var CART_KEY = "vsc_cart_v1";

  function getCart() {
    try {
      var raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function setCart(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    updateBadges();
    window.dispatchEvent(new CustomEvent("vsc:cart-changed", { detail: { items: items } }));
  }

  function addToCart(product, qty) {
    qty = Math.max(1, parseInt(qty, 10) || 1);
    var items = getCart();
    var existing = items.find(function (i) { return i.id === product.id; });
    if (existing) {
      existing.qty += qty;
    } else {
      items.push({
        id: product.id,
        name: product.name,
        price: product.price,
        currency: product.currency,
        image: product.image,
        qty: qty,
      });
    }
    setCart(items);
    return items;
  }

  function updateQty(id, qty) {
    qty = parseInt(qty, 10) || 0;
    var items = getCart();
    if (qty <= 0) {
      items = items.filter(function (i) { return i.id !== id; });
    } else {
      items = items.map(function (i) { return i.id === id ? Object.assign({}, i, { qty: qty }) : i; });
    }
    setCart(items);
  }

  function removeFromCart(id) {
    setCart(getCart().filter(function (i) { return i.id !== id; }));
  }

  function cartCount() {
    return getCart().reduce(function (n, i) { return n + i.qty; }, 0);
  }

  function cartTotal() {
    return getCart().reduce(function (sum, i) { return sum + i.qty * i.price; }, 0);
  }

  function formatMoney(amount, currency) {
    currency = currency || (window.VSC && VSC.product && VSC.product.currency) || "USD";
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: currency }).format(amount);
    } catch (e) {
      return "$" + amount.toFixed(2);
    }
  }

  function updateBadges() {
    var count = cartCount();
    document.querySelectorAll(".cart-badge").forEach(function (el) {
      el.textContent = count;
      el.setAttribute("data-count", count);
    });
  }

  var toastTimer;
  function showToast(message) {
    var toast = document.querySelector(".cart-toast");
    if (!toast) return;
    toast.querySelector(".cart-toast-msg").textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("is-visible"); }, 3800);
  }

  /* ---------- Product page: add-to-cart wiring ---------- */
  function initBuyBox() {
    var box = document.querySelector("[data-buy-box]");
    if (!box || !window.VSC) return;
    var priceEl = box.querySelector("[data-price]");
    if (priceEl) priceEl.textContent = formatMoney(VSC.product.price, VSC.product.currency);
    var qtyInput = box.querySelector("[data-qty]");
    var minus = box.querySelector("[data-qty-minus]");
    var plus = box.querySelector("[data-qty-plus]");
    var addBtn = box.querySelector("[data-add-to-cart]");

    minus.addEventListener("click", function () {
      qtyInput.value = Math.max(1, (parseInt(qtyInput.value, 10) || 1) - 1);
    });
    plus.addEventListener("click", function () {
      qtyInput.value = (parseInt(qtyInput.value, 10) || 1) + 1;
    });
    addBtn.addEventListener("click", function () {
      addToCart(VSC.product, qtyInput.value);
      showToast(qtyInput.value + " × " + VSC.product.name + " added to your bag.");
    });
  }

  /* ---------- Cart page rendering ---------- */
  function initCartPage() {
    var root = document.querySelector("[data-cart-root]");
    if (!root) return;

    function render() {
      var items = getCart();
      var emptyEl = root.querySelector("[data-cart-empty]");
      var filledEl = root.querySelector("[data-cart-filled]");
      var tbody = root.querySelector("[data-cart-rows]");

      if (!items.length) {
        emptyEl.style.display = "block";
        filledEl.style.display = "none";
        return;
      }
      emptyEl.style.display = "none";
      filledEl.style.display = "grid";

      tbody.innerHTML = items.map(function (i) {
        return (
          '<tr data-row="' + i.id + '">' +
          '<td><div class="cart-item-info"><img src="' + i.image + '" alt="" width="72" height="72" loading="lazy" />' +
          '<div><h3>' + i.name + "</h3><span>" + formatMoney(i.price, i.currency) + " each</span></div></div></td>" +
          '<td><div class="qty-stepper"><button type="button" data-row-minus>−</button>' +
          '<input type="number" min="1" value="' + i.qty + '" data-row-qty aria-label="Quantity" />' +
          "<button type=\"button\" data-row-plus>+</button></div></td>" +
          '<td class="cart-line-total">' + formatMoney(i.price * i.qty, i.currency) + "</td>" +
          '<td><button type="button" class="cart-remove" data-row-remove>Remove</button></td>' +
          "</tr>"
        );
      }).join("");

      var subtotal = cartTotal();
      root.querySelectorAll("[data-summary-subtotal]").forEach(function (el) { el.textContent = formatMoney(subtotal); });
      root.querySelectorAll("[data-summary-total]").forEach(function (el) { el.textContent = formatMoney(subtotal); });
      root.querySelectorAll("[data-summary-count]").forEach(function (el) { el.textContent = cartCount(); });
    }

    root.addEventListener("click", function (e) {
      var row = e.target.closest("tr[data-row]");
      if (!row) return;
      var id = row.getAttribute("data-row");
      if (e.target.matches("[data-row-remove]")) {
        removeFromCart(id);
        render();
      } else if (e.target.matches("[data-row-minus]") || e.target.matches("[data-row-plus]")) {
        var input = row.querySelector("[data-row-qty]");
        var val = parseInt(input.value, 10) || 1;
        val = e.target.matches("[data-row-plus]") ? val + 1 : Math.max(1, val - 1);
        updateQty(id, val);
        render();
      }
    });

    root.addEventListener("change", function (e) {
      if (e.target.matches("[data-row-qty]")) {
        var row = e.target.closest("tr[data-row]");
        updateQty(row.getAttribute("data-row"), e.target.value);
        render();
      }
    });

    render();
    window.addEventListener("vsc:cart-changed", render);
  }

  /* ---------- Checkout page: summary + hidden order field ---------- */
  function initCheckoutPage() {
    var summary = document.querySelector("[data-checkout-summary]");
    if (!summary) return;
    var items = getCart();

    if (!items.length) {
      window.location.href = "cart.html";
      return;
    }

    summary.innerHTML = items.map(function (i) {
      return (
        '<div class="summary-row"><span>' + i.qty + " × " + i.name + "</span><span>" +
        formatMoney(i.price * i.qty, i.currency) + "</span></div>"
      );
    }).join("");

    var subtotal = cartTotal();
    document.querySelectorAll("[data-summary-subtotal]").forEach(function (el) { el.textContent = formatMoney(subtotal); });
    document.querySelectorAll("[data-summary-total]").forEach(function (el) { el.textContent = formatMoney(subtotal); });

    var orderField = document.querySelector("[name=order_details]");
    if (orderField) {
      var lines = items.map(function (i) { return i.qty + " × " + i.name + " (" + formatMoney(i.price, i.currency) + " each) = " + formatMoney(i.price * i.qty, i.currency); });
      lines.push("Order total: " + formatMoney(subtotal));
      orderField.value = lines.join("\n");
    }

    var form = document.querySelector("[data-checkout-form]");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var action = form.getAttribute("action") || "";
        var status = form.querySelector(".form-status");
        var submitBtn = form.querySelector('[type="submit"]');

        if (action.indexOf("YOUR_ORDER_FORM_ID") !== -1) {
          if (status) {
            status.textContent = "Online order submission isn't connected yet — please email your order to " + (window.VSC ? VSC.contactEmail : "us") + " using the button below, and we'll confirm pricing, shipping and payment with you directly.";
            status.className = "form-status show err";
          }
          return;
        }

        if (submitBtn) submitBtn.disabled = true;
        fetch(action, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } })
          .then(function (res) {
            if (!res.ok) throw new Error("submit failed");
            localStorage.removeItem(CART_KEY);
            updateBadges();
            window.location.href = "order-received.html";
          })
          .catch(function () {
            if (status) {
              status.textContent = "Something went wrong sending your order. Please try again, or email it to us using the button below.";
              status.className = "form-status show err";
            }
            if (submitBtn) submitBtn.disabled = false;
          });
      });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    updateBadges();
    initBuyBox();
    initCartPage();
    initCheckoutPage();
  });

  window.VSCCart = {
    getCart: getCart,
    addToCart: addToCart,
    updateQty: updateQty,
    removeFromCart: removeFromCart,
    cartCount: cartCount,
    cartTotal: cartTotal,
    formatMoney: formatMoney,
  };
})();
