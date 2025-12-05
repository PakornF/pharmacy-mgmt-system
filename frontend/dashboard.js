document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = (window.API_BASE || "http://localhost:8000") + "/api";

  //-----------------------------------------
  // 1) SIDEBAR PAGE SWITCHING
  //-----------------------------------------
  const links = document.querySelectorAll(".sidebar-link");
  const pages = document.querySelectorAll("section[data-page]");

  const ROUTE_MAP = {
    "": "overview",
    overview: "overview",
    medicine: "medicine",
    sales: "sales",
    customer: "customer",
    doctor: "doctor",
    supplier: "supplier",
    "supply-order": "supply-order",
  };

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
    pages.forEach((page) => {
      if (page.dataset.page === target) {
        page.classList.remove("hidden");
      } else {
        page.classList.add("hidden");
      }
    });

    // update active button
    links.forEach((btn) => {
      const isActive = btn.dataset.target === target;

      if (isActive) {
        btn.classList.add(
          "bg-rose-200",
          "rounded-full",
          "font-semibold",
          "pl-6",          
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

    if (!skipPush) {
      pushPathForPage(target);
    }

    // Load dashboard only when switching to Overview
    if (target === "overview") {
      loadDashboard();
    }
  }

  // Attach event
  links.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.target;
      showPage(target);
    });
  });

  // Handle back/forward
  window.addEventListener("popstate", () => {
    const page = pathnameToPage(window.location.pathname);
    showPage(page, true);
  });

  //-----------------------------------------
  // 2) DASHBOARD DATA FETCHING
  //-----------------------------------------

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
    if (!cardStatusText) return; 

    cardStatusText.textContent = "Loading data from server...";

    try {
      const res = await fetch(`${API_BASE}/dashboard/summary`);
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }

      const data = await res.json();
      if (debugOutput) {
        debugOutput.textContent = JSON.stringify(data, null, 2);
      }

      // Top cards
      if (cardTotalMeds) cardTotalMeds.textContent = data.totalMedicineItems ?? 0;
      if (cardTotalQty) cardTotalQty.textContent = data.totalQuantityInStock ?? 0;
      if (cardAwaitPresc) cardAwaitPresc.textContent = data.awaitedPrescriptions ?? 0;

      if (cardSalesTotal) {
        cardSalesTotal.textContent =
          data.todaySalesTotal != null
            ? `${data.todaySalesTotal.toFixed(2)} ฿`
            : "0 ฿";
      }

      if (cardSalesCount) {
        cardSalesCount.textContent = `${data.todaySalesCount ?? 0} sales today`;
      }

      // Status
      const lowCount = data.lowStockMeds?.length || 0;
      const expCount = data.expiredMeds?.length || 0;
      if (cardStatusText) {
        cardStatusText.textContent =
          `System OK. ${lowCount} low-stock item(s), ${expCount} expired item(s).`;
      }

      // Tables
      renderLowStock(data.lowStockMeds || []);
      renderExpired(data.expiredMeds || []);

    } catch (err) {
      console.error("Error loading dashboard:", err);
      if (cardStatusText) {
        cardStatusText.textContent = "Error loading dashboard: " + err.message;
      }
      if (debugOutput) {
        debugOutput.textContent = err.stack || err.message;
      }
    }
  }

  function renderLowStock(items) {
    if (!lowStockBody) return;

    lowStockBody.innerHTML = "";
    if (lowStockCount) {
      lowStockCount.textContent = `${items.length} item(s)`;
    }

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
    if (!expiredBody) return;

    expiredBody.innerHTML = "";
    if (expiredCount) {
      expiredCount.textContent = `${items.length} item(s)`;
    }

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

  //-----------------------------------------
  // 3) Start at current path (normalized)
  //-----------------------------------------
  // Always land on Overview when hitting the app root
  const initialPage = "overview";
  window.history.replaceState({ page: initialPage }, "", "/");
  showPage(initialPage, true);
});
