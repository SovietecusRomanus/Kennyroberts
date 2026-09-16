// ==========================================
// 1. NAVIGATION & PAGE SWITCHING LOGIC
// ==========================================

document.addEventListener("DOMContentLoaded", function() {
  const links = document.querySelectorAll("nav a[data-page]");
  const pages = document.querySelectorAll(".page");

  links.forEach(link => {
    link.addEventListener("click", function(e) {
      e.preventDefault();
      const pageID = this.getAttribute("data-page");

      pages.forEach(p => {
        p.classList.remove("active");
        p.style.display = "none";
      });

      const activePage = document.getElementById(pageID);
      if (activePage) {
        activePage.classList.add("active");
        activePage.style.display = "block";
      }

      window.scrollTo(0, 0);
    });
  });

  // Contact Form Logic (Google Sheets)
  const webAppUrl = "https://script.google.com/macros/s/AKfycbxkKqJQdVRHSN2Zjr9GRz3caRrRtXNAC-PFN-dqdSGufb2eJ0hLQEuKtPHX0rH-Dq37aQ/exec";
  const form = document.getElementById("myForm");

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      const messageEl = document.getElementById("message");
      const submitBtn = document.getElementById("submit-button");

      if (messageEl) {
        messageEl.textContent = "Submitting...";
        messageEl.style.display = "block";
        messageEl.style.color = "black";
      }
      if (submitBtn) submitBtn.disabled = true;

      let formData = new FormData(this);
      fetch(webAppUrl, { method: "POST", body: formData, mode: "no-cors" })
      .then(() => {
        if (messageEl) {
          messageEl.textContent = "Data submitted successfully!";
          messageEl.style.color = "green";
        }
        form.reset();
      })
      .catch(error => {
        console.error("Error:", error);
        if (messageEl) {
          messageEl.textContent = "Error submitting data. Please try again.";
          messageEl.style.color = "red";
        }
      })
      .finally(() => {
        if (submitBtn) submitBtn.disabled = false;
      });
    });
  }

  // Initial render checks on load & sync orders from sheet
  renderCart();
  fetchAndRenderOrders();
});

// Navigation Helper to jump back to shop
function goToShop() {
  const pages = document.querySelectorAll(".page");
  pages.forEach(p => {
    p.classList.remove("active");
    p.style.display = "none";
  });

  const homePage = document.getElementById("home");
  if (homePage) {
    homePage.classList.add("active");
    homePage.style.display = "block";
  }

  const shopSection = document.getElementById("section-Categories");
  if (shopSection) {
    shopSection.scrollIntoView({ behavior: 'smooth' });
  }
}


// ==========================================
// 2. CART & ORDERS SYSTEM (Lazada Style)
// ==========================================

const ordersAppUrl = "https://script.google.com/macros/s/AKfycby6aeagqCAt1zthXjODvWAYYPlpmmHLIATHNvmIWbVb9CBBWYhh9itoJtPlueNv9UDtdA/exec";

let cart = [];

function addToCart(itemName, priceStr) {
  let price = typeof priceStr === 'number' ? priceStr : parseFloat(priceStr.replace(/[^0-9.]/g, ''));
  let existing = cart.find(item => item.name === itemName);

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ name: itemName, price: price, qty: 1 });
  }

  renderCart();
}

function decreaseQty(itemName) {
  let item = cart.find(i => i.name === itemName);
  if (item) {
    item.qty -= 1;
    if (item.qty <= 0) {
      cart = cart.filter(i => i.name !== itemName);
    }
  }
  renderCart();
}

function removeFromCart(itemName) {
  cart = cart.filter(item => item.name !== itemName);
  renderCart();
}

function renderCart() {
  const list = document.getElementById("cart-list");
  const totalEl = document.getElementById("cart-total");
  const btn = document.getElementById("checkout-btn");

  if (!list || !totalEl || !btn) return;

  list.innerHTML = "";
  let total = 0;

  cart.forEach(item => {
    total += item.price * item.qty;
    let li = document.createElement("li");

    li.innerHTML = `
      <span>${item.name} - ₱${item.price * item.qty}</span>
      <div style="display:inline-block; margin-left: 10px;">
        <button type="button" onclick="decreaseQty('${item.name}')" style="cursor:pointer; padding: 0 6px; font-weight:bold;">-</button>
        <span style="margin: 0 5px; font-weight:bold;">${item.qty}</span>
        <button type="button" onclick="addToCart('${item.name}', ${item.price})" style="cursor:pointer; padding: 0 6px; font-weight:bold;">+</button>
        <button type="button" onclick="removeFromCart('${item.name}')" style="background:none; border:none; color:red; font-weight:bold; cursor:pointer; margin-left:8px;">✕</button>
      </div>
    `;

    list.appendChild(li);
  });

  totalEl.textContent = total;
  btn.disabled = cart.length === 0;
}

function checkoutOrder() {
  if (cart.length === 0) {
    alert("Your cart is empty!");
    return;
  }

  const nameInput = document.getElementById("customer-name");
  const customerName = (nameInput && nameInput.value.trim()) ? nameInput.value.trim() : "Guest";

  const currentCartSnapshot = JSON.parse(JSON.stringify(cart));
  let grandTotal = currentCartSnapshot.reduce((sum, item) => sum + (item.price * item.qty), 0);
  let orderId = "ORD-" + Math.floor(100000 + Math.random() * 900000);

  const formData = new FormData();
  formData.append("action", "create");
  formData.append("orderId", orderId);
  formData.append("customerName", customerName);
  formData.append("grandTotal", grandTotal);
  formData.append("itemsArray", JSON.stringify(currentCartSnapshot));

  // Save locally first for instant feedback
  saveOrderLocally(orderId, customerName, currentCartSnapshot, grandTotal);

  // Send to Google Sheets in background
  fetch(ordersAppUrl, { method: "POST", body: formData, mode: "no-cors" })
    .catch(err => console.log("Background sync note:", err));
}

function saveOrderLocally(orderId, customerName, items, total) {
  let myOrders = JSON.parse(localStorage.getItem("kenny_orders") || "[]");
  myOrders.unshift({
    orderId: orderId,
    customerName: customerName,
    items: items,
    total: total,
    status: "Pending",
    date: new Date().toLocaleDateString()
  });
  localStorage.setItem("kenny_orders", JSON.stringify(myOrders));

  cart = [];
  renderCart();
  const nameInput = document.getElementById("customer-name");
  if (nameInput) nameInput.value = "";

  document.querySelectorAll(".page").forEach(p => {
    p.classList.remove("active");
    p.style.display = "none";
  });

  const toShipPage = document.getElementById("toship-page");
  if (toShipPage) {
    toShipPage.classList.add("active");
    toShipPage.style.display = "block";
  }

  renderToShipPage();
  window.scrollTo(0, 0);

  const btn = document.getElementById("checkout-btn");
  if (btn) {
    btn.textContent = "Place Order";
    btn.disabled = true;
  }
}

function renderToShipPage() {
  const container = document.getElementById("toship-container");
  if (!container) return;

  let myOrders = JSON.parse(localStorage.getItem("kenny_orders") || "[]");
  // Filter out cancelled ones locally so they disappear from "To Ship"
  let activeOrders = myOrders.filter(order => order.status !== "Cancelled");

  if (activeOrders.length === 0) {
    container.innerHTML = `<p style="text-align: center; color: #777; padding: 20px;">You have no active orders yet.</p>`;
    return;
  }

  container.innerHTML = "";
  activeOrders.forEach((order) => {
    let orderCard = document.createElement("div");
    orderCard.style.cssText = "background: #f4fdf4; border: 1px solid #cce4cc; border-radius: 8px; padding: 15px; margin-bottom: 15px;";
    
    let itemsHtml = "";
    order.items.forEach(item => {
      itemsHtml += `<li style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dashed #ddd; font-size: 14px;">
        <span>${item.name} (x${item.qty})</span>
        <span>₱${item.price * item.qty}</span>
      </li>`;
    });

    orderCard.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
        <strong style="color: #0b6b3a;">${order.orderId}</strong>
        <span style="background: #e1f5fe; color: #01579b; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">${order.status}</span>
      </div>
      <p style="font-size: 13px; color: #555; margin-bottom: 8px;">Customer: <strong>${order.customerName}</strong> | Date: ${order.date}</p>
      <ul style="list-style: none; padding: 0; margin: 0 0 10px 0;">${itemsHtml}</ul>
      <div style="display: flex; justify-content: space-between; align-items: center; font-weight: bold;">
        <span>Total: ₱${order.total}</span>
        <button type="button" onclick="cancelLocalOrder('${order.orderId}')" style="background: #d32f2f; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">Cancel Order</button>
      </div>
    `;
    container.appendChild(orderCard);
  });
}

function cancelLocalOrder(targetOrderId) {
  if (confirm("Are you sure you want to cancel this order?")) {
    let myOrders = JSON.parse(localStorage.getItem("kenny_orders") || "[]");
    
    // Update status locally
    myOrders.forEach(order => {
      if (order.orderId === targetOrderId) {
        order.status = "Cancelled";
      }
    });
    localStorage.setItem("kenny_orders", JSON.stringify(myOrders));

    // Send cancellation signal to Google Apps Script backend
    const cancelUrl = ordersAppUrl + "?action=cancel&orderId=" + encodeURIComponent(targetOrderId);
    fetch(cancelUrl, { method: "GET", mode: "no-cors" })
      .catch(err => console.log("Sheet cancellation sync note:", err));

    renderToShipPage();
  }
}

// Optional: Fetches existing sheet orders back if local storage was cleared
function fetchAndRenderOrders() {
  fetch(ordersAppUrl + "?action=getOrders", { method: "GET" })
    .then(res => res.json())
    .then(data => {
      if (data && data.orders) {
        // You can merge backend orders here if localStorage is empty
        let localOrders = JSON.parse(localStorage.getItem("kenny_orders") || "[]");
        if (localOrders.length === 0 && data.orders.length > 0) {
          localStorage.setItem("kenny_orders", JSON.stringify(data.orders));
          renderToShipPage();
        }
      }
    })
    .catch(err => console.log("Fetch orders note:", err));
}