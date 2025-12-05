document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = (window.API_BASE || "http://localhost:8000") + "/api";

  // 1) Sidebar page switching (History API)
  const links = document.querySelectorAll(".sidebar-link");
  const pages = document.querySelectorAll("section[data-page]");

  const ROUTE_MAP = {
    "": "overview",
    overview: "overview",
    medicine: "medicine",
    sales: "sales",
    customer: "customer",
<<<<<<< HEAD:index.js
    prescription: "prescription",
=======
    doctor: "doctor",
>>>>>>> 9ec962b7f4c6a4a6fd270d2570f97a18f65b2cc0:frontend/dashboard.js
    supplier: "supplier",
    "supply-order": "supply-order",
  };

<<<<<<< HEAD:index.js
  function pathnameToPage(pathname) {
    const slug = pathname.replace(/^\//, "").split("/")[0];
    return ROUTE_MAP[slug] || "overview";
  }

  function pushPathForPage(page) {
    const slug = page === "overview" ? "" : page;
    const newPath = `/${slug}`;
    window.history.pushState({ page }, "", newPath);
  }

  function showPage(target, skipPush = false) {
    // show / hide sections
=======
  function slugForPage(page) {
    return page === "overview" ? "" : page;
  }

  function pathnameToPage(pathname) {
    const slug = pathname.replace(/^\//, "").split("/")[0];
    const page = ROUTE_MAP[slug] || "overview";
    return page;
  }

  function pushPathForPage(page) {
    const slug = slugForPage(page);
    window.history.pushState({ page }, "", `/${slug}`);
  }

  function showPage(target, skipPush = false) {
    // hide all pages
>>>>>>> 9ec962b7f4c6a4a6fd270d2570f97a18f65b2cc0:frontend/dashboard.js
    pages.forEach((page) => {
      if (page.dataset.page === target) {
        page.classList.remove("hidden");
      } else {
        page.classList.add("hidden");
      }
    });

    // active button style
    links.forEach((btn) => {
      const isActive = btn.dataset.target === target;

      if (isActive) {
        btn.classList.add(
          "bg-rose-200",
          "rounded-full",
          "font-semibold",
<<<<<<< HEAD:index.js
          "pl-6",
=======
          "pl-6",          
>>>>>>> 9ec962b7f4c6a4a6fd270d2570f97a18f65b2cc0:frontend/dashboard.js
          "pr-6",
          "py-3",
          "text-black",
          "shadow-sm"
        );
      } else {
        btn.classList.remove(
          "bg-rose-200",
          "rounded-full",
          "font-semibold",
          "pl-6",
          "pr-6",
          "py-3",
          "text-black",
          "shadow-sm"
        );
        btn.classList.add("py-2", "px-1", "text-black");
      }
    });

<<<<<<< HEAD:index.js
    // keep url in sync so refresh/back/forward stay on the same page
=======
>>>>>>> 9ec962b7f4c6a4a6fd270d2570f97a18f65b2cc0:frontend/dashboard.js
    if (!skipPush) {
      pushPathForPage(target);
    }

<<<<<<< HEAD:index.js
=======
    // Load dashboard only when switching to Overview
>>>>>>> 9ec962b7f4c6a4a6fd270d2570f97a18f65b2cc0:frontend/dashboard.js
    if (target === "overview") {
      loadDashboard();
    }
  }

  links.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.target;
      showPage(target);
    });
  });

<<<<<<< HEAD:index.js
  // Handle browser back/forward
=======
  // Handle back/forward
>>>>>>> 9ec962b7f4c6a4a6fd270d2570f97a18f65b2cc0:frontend/dashboard.js
  window.addEventListener("popstate", () => {
    const page = pathnameToPage(window.location.pathname);
    showPage(page, true);
  });
<<<<<<< HEAD:index.js
=======

  //-----------------------------------------
  // 2) DASHBOARD DATA FETCHING
  //-----------------------------------------
>>>>>>> 9ec962b7f4c6a4a6fd270d2570f97a18f65b2cc0:frontend/dashboard.js

  // 2) Dashboard fetching
  const cardTotalMeds = document.getElementById("card-total-meds");
  const cardTotalQty = document.getElementById("card-total-qty");
  const cardAwaitPresc = document.getElementById("card-await-presc");
  const cardSalesTotal = document.getElementById("card-sales-total");
  const cardSalesCount = document.getElementById("card-sales-count");
  const cardStatusText = document.getElementById("card-status-text");

  const lowStockBody = document.getElementById("low-stock-body");
  const lowStockCount = document.getElementById("low-stock-count");

  const expiredBody = document.getElementById("expired-body");
  const expiredCount = document.getElementById("expired-count");

  const debugOutput = document.getElementById("debug-output");

  async function loadDashboard() {
<<<<<<< HEAD:index.js
    if (!cardStatusText) return;
=======
    if (!cardStatusText) return; 

>>>>>>> 9ec962b7f4c6a4a6fd270d2570f97a18f65b2cc0:frontend/dashboard.js
    cardStatusText.textContent = "Loading data from server...";

    try {
      const res = await fetch(`${API_BASE}/dashboard/summary`);
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }

      const data = await res.json();
      debugOutput.textContent = JSON.stringify(data, null, 2);

      cardTotalMeds.textContent = data.totalMedicineItems ?? 0;
      cardTotalQty.textContent = data.totalQuantityInStock ?? 0;
      cardAwaitPresc.textContent = data.awaitedPrescriptions ?? 0;

      cardSalesTotal.textContent =
        data.todaySalesTotal != null
          ? `${data.todaySalesTotal.toFixed(2)} ฿`
          : "0 ฿";

      cardSalesCount.textContent = `${data.todaySalesCount ?? 0} sales today`;

      const lowCount = data.lowStockMeds?.length || 0;
      const expCount = data.expiredMeds?.length || 0;
      cardStatusText.textContent =
        `System OK. ${lowCount} low-stock item(s), ${expCount} expired item(s).`;

      renderLowStock(data.lowStockMeds || []);
      renderExpired(data.expiredMeds || []);
    } catch (err) {
      console.error("Error loading dashboard:", err);
      cardStatusText.textContent = "Error loading dashboard: " + err.message;
      debugOutput.textContent = err.stack || err.message;
    }
  }

  function renderLowStock(items) {
    lowStockBody.innerHTML = "";
    lowStockCount.textContent = `${items.length} item(s)`;

    if (items.length === 0) {
      lowStockBody.innerHTML =
        `<tr><td colspan="4" class="py-2 text-gray-400">No low stock items 🎉</td></tr>`;
      return;
    }

    for (const med of items) {
      const tr = document.createElement("tr");
      tr.className = "border-b";

      tr.innerHTML = `
        <td class="py-2 pr-4">${med.medicine_id || "-"}</td>
        <td class="py-2 pr-4">${med.name || "-"}</td>
        <td class="py-2 pr-4">${med.brand || "-"}</td>
        <td class="py-2 text-right">${med.quantity ?? "-"}</td>
      `;
      lowStockBody.appendChild(tr);
    }
  }

  function renderExpired(items) {
    expiredBody.innerHTML = "";
    expiredCount.textContent = `${items.length} item(s)`;

    if (items.length === 0) {
      expiredBody.innerHTML =
        `<tr><td colspan="4" class="py-2 text-gray-400">No expired medicines 🎉</td></tr>`;
      return;
    }

    for (const med of items) {
      const tr = document.createElement("tr");
      tr.className = "border-b";

      const exp = med.expiry_date
        ? new Date(med.expiry_date).toLocaleDateString()
        : "-";

      tr.innerHTML = `
        <td class="py-2 pr-4">${med.medicine_id || "-"}</td>
        <td class="py-2 pr-4">${med.name || "-"}</td>
        <td class="py-2 pr-4">${med.brand || "-"}</td>
        <td class="py-2">${exp}</td>
      `;
      expiredBody.appendChild(tr);
    }
  }

<<<<<<< HEAD:index.js
  // 3) start at current path (or Overview)
  const initialPage = pathnameToPage(window.location.pathname);
=======
  //-----------------------------------------
  // 3) Start at current path (normalized)
  //-----------------------------------------
  // Always land on Overview when hitting the app root
  const initialPage = "overview";
  window.history.replaceState({ page: initialPage }, "", "/");
>>>>>>> 9ec962b7f4c6a4a6fd270d2570f97a18f65b2cc0:frontend/dashboard.js
  showPage(initialPage, true);
});
