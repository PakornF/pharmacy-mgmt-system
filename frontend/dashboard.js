document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "http://localhost:8000";

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
    cardStatusText.textContent = "Loading data from server...";

    try {
      const res = await fetch(`${API_BASE}/dashboard/summary`);
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }

      const data = await res.json();
      debugOutput.textContent = JSON.stringify(data, null, 2);

      // Top cards
      cardTotalMeds.textContent = data.totalMedicineItems ?? 0;
      cardTotalQty.textContent = data.totalQuantityInStock ?? 0;
      cardAwaitPresc.textContent = data.awaitedPrescriptions ?? 0;

      cardSalesTotal.textContent =
        data.todaySalesTotal != null ? `${data.todaySalesTotal.toFixed(2)} ฿` : "0 ฿";
      cardSalesCount.textContent = `${data.todaySalesCount ?? 0} sales today`;

      // Status text
      const lowCount = data.lowStockMeds?.length || 0;
      const expCount = data.expiredMeds?.length || 0;
      cardStatusText.textContent =
        `System OK. ${lowCount} low-stock item(s), ${expCount} expired item(s).`;

      // Low stock table
      renderLowStock(data.lowStockMeds || []);
      // Expired table
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

  loadDashboard();
});