// supply-order.js

document.addEventListener("DOMContentLoaded", () => {
  // ---------------------------
  // Data stores (fetched from API)
  // ---------------------------
  let suppliers = []; // { supplier_id, name, ... }
  let medicines = []; // { id, name, supplier_id, price, quantity, unit, ... }

  let supplyOrders = [];

  // ---------------------------
  // DOM elements
  // ---------------------------
  const newOrderBtn = document.getElementById("newOrderBtn");
  const orderTableBody = document.getElementById("orderTableBody");

  const orderForm = document.getElementById("orderForm");
  const orderFormTitle = document.getElementById("orderFormTitle");
  const orderIdInput = document.getElementById("orderIdInput");
  const orderSupplierSelect = document.getElementById("orderSupplierSelect");
  const orderStatusDisplay = document.getElementById("orderStatusDisplay");
  const orderDateDisplay = document.getElementById("orderDateDisplay");

  const orderItemsBody = document.getElementById("orderItemsBody");
  const orderItemsSummary = document.getElementById("orderItemsSummary");

  const itemMedicineSelect = document.getElementById("itemMedicineSelect");
  const itemUnitSelect = document.getElementById("itemUnitSelect");
  const itemQtyInput = document.getElementById("itemQtyInput");
  const addItemBtn = document.getElementById("addItemBtn");

  const resetOrderBtn = document.getElementById("resetOrderBtn");

  const stockTableBody = document.getElementById("stockTableBody");

  // --- modal for Mark as received ---
  const receiveBackdrop = document.getElementById("receiveModalBackdrop");
  const receiveTitle = document.getElementById("receiveModalTitle");
  const receiveSubtitle = document.getElementById("receiveModalSubtitle");
  const receiveExpiryInput = document.getElementById("receiveExpiryInput");
  const receiveUnitsPerBoxGroup = document.getElementById(
    "receiveUnitsPerBoxGroup"
  );
  const receiveUnitsPerBoxInput = document.getElementById(
    "receiveUnitsPerBoxInput"
  );
  const receiveSizeGroup = document.getElementById("receiveSizeGroup");
  const receiveSizeSelect = document.getElementById("receiveSizeSelect");
  const receiveCancelBtn = document.getElementById("receiveCancelBtn");
  const receiveOkBtn = document.getElementById("receiveOkBtn");

  let currentOrderItems = []; // { medicineId, quantity, unit, expiryDate?, unitsPerPack?, size? }

  // for resolve promise of modal
  let receiveResolve = null;

  // ---------------------------
  // Helpers
  // ---------------------------
  function findSupplierName(id) {
    const s = suppliers.find(
      (sup) => String(sup.supplier_id) === String(id)
    );
    return s ? s.name : "-";
  }

  function findMedicine(id) {
    return medicines.find((m) => String(m.id) === String(id));
  }

  function unitLabel(u) {
    const lower = (u || "").toLowerCase();
    if (lower === "box") return "Box(es)";
    if (lower === "bottle") return "Bottle(s)";
    if (lower === "tube") return "Tube(s)";
    return u || "Unit";
  }

  function unitOptionsForType(type, fallbackUnit) {
    const t = (type || "").toLowerCase();
    if (["tablet", "capsule"].includes(t)) return ["box"];
    if (["bottle", "spray", "syrup"].includes(t)) return ["bottle"];
    if (["injectable", "cream"].includes(t)) return ["tube"];
    if (fallbackUnit) return [fallbackUnit];
    return ["box", "bottle", "tube"];
  }

  function renderUnitSelectForMedicine(med) {
    const options = unitOptionsForType(med?.type, med?.unit);
    const optionsHtml =
      `<option value="">Select unit...</option>` +
      options.map((u) => `<option value="${u}">${unitLabel(u)}</option>`).join("");
    itemUnitSelect.innerHTML = optionsHtml;
    // Preselect the first option to reduce clicks
    itemUnitSelect.value = options[0] || "";
  }

  function formatDateTime(d) {
    return new Date(d).toLocaleString();
  }

  // format date (YYYY-MM-DD) -> DD/MM/YYYY
  function prettyDate(iso) {
    if (!iso) return "-";
    const [y, m, d] = iso.split("-");
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y}`;
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function formatStockForOrderItem(med) {
    if (!med) return "-";
    const qty = Number(med.quantity ?? 0);
    const typeRaw = med.type || med.medicine_type || "";
    const typeLower = typeRaw.toLowerCase();
    const isPill = typeLower.includes("capsule") || typeLower.includes("tablet");
    if (isPill) {
      const label = typeRaw || "tablets";
      return `${qty} ${label}`;
    }
    return `${qty}`;
  }

  // ---------------------------
  // Render stock table
  // ---------------------------
  function renderStockTable() {
    if (medicines.length === 0) {
      stockTableBody.innerHTML =
        `<tr><td colspan="4" class="py-2 px-2 text-center text-gray-400 text-sm">No medicines.</td></tr>`;
      return;
    }

    stockTableBody.innerHTML = medicines
      .map((m) => {
        const supplierName = findSupplierName(m.supplier_id);
        const priceUnitLabel = m.unit ? ` / ${m.unit}` : "";
        const stockUnitLabel = m.displayUnit || m.unit || "";

        return `
          <tr>
            <td class="py-2 px-2 text-left w-1/4">${m.name}</td>
            <td class="py-2 px-2 text-left w-1/4">${supplierName}</td>
            <td class="py-2 px-2 text-right w-1/4">
              ${m.price.toFixed(2)}${priceUnitLabel}
            </td>
            <td class="py-2 px-2 text-right w-1/4">
              ${m.quantity} ${stockUnitLabel}
            </td>
          </tr>
        `;
      })
      .join("");
  }

  // ---------------------------
  // Supplier & Medicine selects
  // ---------------------------
  function renderSupplierSelect() {
    orderSupplierSelect.innerHTML =
      `<option value="">Select supplier...</option>` +
      suppliers
        .map((s) => `<option value="${s.supplier_id}">${s.name}</option>`)
        .join("");
  }

  function renderMedicineSelect() {
    const supId = orderSupplierSelect.value;
    if (!supId) {
      itemMedicineSelect.innerHTML =
        `<option value="">Select supplier first...</option>`;
      itemUnitSelect.innerHTML = `<option value="">Select unit...</option>`;
      return;
    }

    const meds = medicines.filter(
      (m) => String(m.supplier_id) === String(supId)
    );
    if (meds.length === 0) {
      itemMedicineSelect.innerHTML =
        `<option value="">No medicines for this supplier</option>`;
      itemUnitSelect.innerHTML = `<option value="">Select unit...</option>`;
      return;
    }

    itemMedicineSelect.innerHTML =
      `<option value="">Select medicine...</option>` +
      meds.map((m) => `<option value="${m.id}">${m.name}</option>`).join("");

    // Reset unit select when changing supplier
    itemUnitSelect.innerHTML = `<option value="">Select unit...</option>`;
  }

  // ---------------------------
  // Render order items (right panel)
  // ---------------------------
  function renderOrderItems() {
    if (currentOrderItems.length === 0) {
      orderItemsBody.innerHTML =
        `<tr><td colspan="5" class="py-2 px-2 text-center text-gray-400 text-sm">No items in this order.</td></tr>`;
      orderItemsSummary.textContent = "No items.";
      return;
    }

    let totalQty = 0;

    orderItemsBody.innerHTML = currentOrderItems
      .map((it, index) => {
        const med = findMedicine(it.medicineId);
        const stock = med ? med.quantity : 0;
        totalQty += it.quantity;
        return `
          <tr>
            <td class="py-1 px-2 text-left w-2/5">${med ? med.name : "Unknown"}</td>
            <td class="py-1 px-2 text-right w-1/6">
              <input
                type="number"
                min="1"
                data-idx="${index}"
                value="${it.quantity}"
                class="w-16 border rounded px-1 py-0.5 text-right text-sm item-qty-input"
              />
            </td>
            <td class="py-1 px-2 text-center w-1/6">${it.unit || "-"}</td>
            <td class="py-1 px-2 text-right w-1/6">
              ${formatStockForOrderItem(med)}
            </td>
            <td class="py-1 px-2 text-right w-1/6">
              <button
                type="button"
                class="text-xs text-red-500"
                data-remove-idx="${index}"
              >
                ✕
              </button>
            </td>
          </tr>
        `;
      })
      .join("");

    orderItemsSummary.textContent = `${currentOrderItems.length} item(s), total qty ${totalQty}`;
  }

  // ---------------------------
  // Render order list (left table)
  // ---------------------------
  function renderOrderList() {
    if (supplyOrders.length === 0) {
      orderTableBody.innerHTML =
        `<tr><td colspan="5" class="py-2 px-2 text-center text-gray-400 text-sm">No supply orders yet.</td></tr>`;
      return;
    }

    orderTableBody.innerHTML = supplyOrders
      .map((o) => {
        const supplierName = findSupplierName(o.supplier_id);
        const statusBadge =
          (o.status || "").toUpperCase() === "DELIVERED"
            ? `<span class="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">received</span>`
            : `<span class="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700">pending</span>`;

        return `
          <tr class="hover:bg-pink-50">
            <td class="py-2 px-2 text-left w-1/5">${o.order_id}</td>
            <td class="py-2 px-2 text-left w-1/5">${supplierName}</td>
            <td class="py-2 px-2 text-left w-1/5">${statusBadge}</td>
            <td class="py-2 px-2 text-left w-1/5">${formatDateTime(
              o.order_date
            )}</td>
            <td class="py-2 px-2 text-right w-1/5 space-x-2">
              <button
                class="text-xs text-blue-600 hover:underline"
                data-edit-order="${o.order_id}"
              >
                Edit
              </button>
              <button
                class="text-xs text-pink-600 hover:underline"
                data-mark-received="${o.order_id}"
              >
                Mark as received
              </button>
              <button
                class="text-xs text-red-600 hover:underline"
                data-delete-order="${o.order_id}"
              >
                Delete
              </button>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  // ---------------------------
  // Modal: รับของทีละ item
  // ---------------------------
  function openReceiveModal({ med, item, needsUnitsPerBox }) {
    return new Promise((resolve) => {
      receiveResolve = resolve;
  
      receiveTitle.textContent = `Receive: ${med.name}`;
      receiveSubtitle.textContent = `Ordered: ${item.quantity} ${item.unit}`;
  
      receiveExpiryInput.value = item.expiryDate || "";
      receiveExpiryInput.min = todayISO();
  
      if (needsUnitsPerBox) {
        receiveUnitsPerBoxGroup.classList.remove("hidden");
        receiveUnitsPerBoxInput.value =
          item.units_per_pack != null
            ? String(item.units_per_pack)
            : item.unitsPerPack != null
            ? String(item.unitsPerPack)
            : "";
      } else {
        receiveUnitsPerBoxGroup.classList.add("hidden");
        receiveUnitsPerBoxInput.value = "";
      }
  
      // เราไม่ใช้ size/volume แล้ว → ซ่อน size ไว้เสมอ
      receiveSizeGroup.classList.add("hidden");
      receiveSizeSelect.value = "";
  
      receiveBackdrop.classList.remove("hidden");
    });
  }

  function closeReceiveModal() {
    receiveBackdrop.classList.add("hidden");
  }

  receiveCancelBtn.addEventListener("click", () => {
    if (receiveResolve) {
      receiveResolve(null);
      receiveResolve = null;
    }
    closeReceiveModal();
  });

  receiveOkBtn.addEventListener("click", () => {
    if (!receiveResolve) return;

    const exp = receiveExpiryInput.value;
    const today = todayISO();
    if (!exp) {
      alert("Please select expiry date.");
      return;
    }
    if (exp < today) {
      alert("Expiry date cannot be in the past.");
      return;
    }

    let unitsPerBox = null;
    if (!receiveUnitsPerBoxGroup.classList.contains("hidden")) {
      const val = parseInt(receiveUnitsPerBoxInput.value, 10);
      if (!Number.isFinite(val) || val <= 0) {
        alert("Please enter valid units per box (> 0).");
        return;
      }
      unitsPerBox = val;
    }

    const payload = { expiryDate: exp, unitsPerBox, size: null, volume: null };
    receiveResolve(payload);
    receiveResolve = null;
    closeReceiveModal();
  });

  // ---------------------------
  // Mark as received helper (calls backend to update stock)
  async function handleMarkAsReceived(order) {
    if ((order.status || "").toUpperCase() === "DELIVERED") {
      alert("This order is already marked as received.");
      return;
    }

    const itemPayloads = [];

    // Collect receiving info per item
    for (let i = 0; i < order.items.length; i++) {
      const it = order.items[i];
      const med = findMedicine(it.medicine_id || it.medicineId);
      if (!med) continue;

      const orderUnitRaw = it.unit || med.unit || "";
      const unitLower = orderUnitRaw.toLowerCase();

      const isBox = unitLower.startsWith("box"); // "box" or "box(es)"
      const isBottleOrTube =
        unitLower.startsWith("bottle") || unitLower.startsWith("tube");

      // units per box - only needed for box units; bottle/tube need only expiry
      const needsUnitsPerBox = isBox;
      const needsSizeAndVolume = false;

      const info = await openReceiveModal({
        med,
        item: it,
        needsUnitsPerBox,
      });

      if (!info) {
        alert("Receive process cancelled. No stock updated.");
        return;
      }

      const { expiryDate, unitsPerBox } = info;

      // For box units, use the entered unitsPerBox; for others, use 1 as default
      itemPayloads.push({
        order_item_id: it.order_item_id,
        medicine_id: it.medicine_id || it.medicineId,
        ordered_quantity: it.ordered_quantity || it.quantity,
        units_per_pack: needsUnitsPerBox ? (unitsPerBox ?? it.units_per_pack ?? 1) : (it.units_per_pack ?? 1),
        expiry_date: expiryDate,
      });
    }

    try {
      const res = await fetch(`http://localhost:8000/supply-orders/${order.order_id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DELIVERED", items: itemPayloads }),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = data && data.message ? `: ${data.message}` : "";
        throw new Error(`Failed to mark as received${detail}`);
      }

      await loadSupplyOrders();
      await refreshMedicines();
      alert(`Order ${order.order_id} marked as received.`);
    } catch (err) {
      console.error("Mark received error:", err);
      alert(err.message || "Failed to mark order as received.");
    }
  }

  // ---------------------------
  // Form helpers
  // ---------------------------
  function resetOrderForm() {
    orderIdInput.value = "";
    orderSupplierSelect.value = "";
    orderStatusDisplay.value = "pending";
    orderDateDisplay.value = "";
    currentOrderItems = [];
    itemMedicineSelect.value = "";
    itemUnitSelect.value = "";
    itemQtyInput.value = "";
    renderMedicineSelect();
    renderOrderItems();
    orderFormTitle.textContent = "New Supply Order";
  }

  function loadOrderIntoForm(orderId) {
    const o = supplyOrders.find((ord) => String(ord.order_id) === String(orderId));
    if (!o) return;

    orderIdInput.value = o.order_id;
    orderSupplierSelect.value = o.supplier_id;
    orderStatusDisplay.value = o.status;
    orderDateDisplay.value = formatDateTime(o.order_date);
    currentOrderItems = o.items.map((it) => ({
      medicineId: it.medicine_id || it.medicineId,
      quantity: it.ordered_quantity || it.quantity,
      unit: it.unit || "",
    }));
    orderFormTitle.textContent = `Edit Order ${o.order_id}`;
    renderMedicineSelect();
    renderOrderItems();
  }

  // ---------------------------
  // Events
  // ---------------------------

  // New order button
  newOrderBtn.addEventListener("click", () => {
    resetOrderForm();
  });

  // Change supplier → reload medicine options
  orderSupplierSelect.addEventListener("change", () => {
    renderMedicineSelect();
    currentOrderItems = [];
    renderOrderItems();
  });

  // Change medicine → update unit options based on type
  itemMedicineSelect.addEventListener("change", () => {
    const medId = itemMedicineSelect.value;
    const med = findMedicine(medId);
    renderUnitSelectForMedicine(med);
  });

  // Add item to current order
  addItemBtn.addEventListener("click", () => {
    const medId = itemMedicineSelect.value;
    const qtyVal = Number(itemQtyInput.value);
    let unitVal = itemUnitSelect.value;
    const unitsPerPackVal = 1;

    if (!orderSupplierSelect.value) {
      alert("Please select supplier first.");
      return;
    }

    if (!medId) {
      alert("Please select medicine.");
      return;
    }

    const med = findMedicine(medId);
    if (!med) {
      alert("Medicine not found.");
      return;
    }

    if (!unitVal) {
      // ถ้าไม่เลือก unit → ใช้ base unit ตาม medicine
      unitVal = med.unit || "";
    }

    if (!qtyVal || qtyVal <= 0) {
      alert("Please enter quantity.");
      return;
    }

    const existing = currentOrderItems.find(
      (it) => it.medicineId === medId && it.unit === unitVal
    );
    if (existing) {
      existing.quantity += qtyVal;
    } else {
      currentOrderItems.push({
        medicineId: medId,
        quantity: qtyVal,
        unit: unitVal,
        units_per_pack: unitsPerPackVal,
      });
    }

    itemMedicineSelect.value = "";
    itemUnitSelect.value = "";
    itemQtyInput.value = "";
    renderOrderItems();
  });

  // Change qty / remove item in items table
  orderItemsBody.addEventListener("input", (e) => {
    if (!e.target.classList.contains("item-qty-input")) return;
    const idx = Number(e.target.dataset.idx);
    if (idx < 0 || idx >= currentOrderItems.length) return;

    let val = Number(e.target.value);
    if (!val || val <= 0) {
      val = 1;
    }
    currentOrderItems[idx].quantity = val;
    e.target.value = val;
    renderOrderItems();
  });

  orderItemsBody.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-remove-idx]");
    if (!btn) return;
    const idx = Number(btn.dataset.removeIdx);
    if (idx < 0 || idx >= currentOrderItems.length) return;
    currentOrderItems.splice(idx, 1);
    renderOrderItems();
  });

  // คลิกปุ่มในตารางด้านซ้าย (Edit / Mark as received / Delete)
  orderTableBody.addEventListener("click", async (e) => {
    const editBtn = e.target.closest("button[data-edit-order]");
    const markBtn = e.target.closest("button[data-mark-received]");
    const deleteBtn = e.target.closest("button[data-delete-order]");

    if (editBtn) {
      const id = editBtn.dataset.editOrder;
      loadOrderIntoForm(id);
      return;
    }

    if (deleteBtn) {
      const id = deleteBtn.dataset.deleteOrder;
      const o = supplyOrders.find((ord) => String(ord.order_id) === String(id));
      if (!o) return;
      const ok = confirm(`Delete order ${id}?`);
      if (!ok) return;

      try {
        const res = await fetch(`http://localhost:8000/supply-orders/${id}`, {
          method: "DELETE",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const detail = data && data.message ? `: ${data.message}` : "";
          throw new Error(`Failed to delete order${detail}`);
        }
        alert(`Order ${id} deleted.`);
        if (String(orderIdInput.value) === String(id)) {
          resetOrderForm();
        }
        await loadSupplyOrders();
      } catch (err) {
        console.error("Delete order error:", err);
        alert(err.message || "Failed to delete order.");
      }
      return;
    }

    if (markBtn) {
      const id = markBtn.dataset.markReceived;
      const o = supplyOrders.find((ord) => String(ord.order_id) === String(id));
      if (!o) return;
      handleMarkAsReceived(o);
      return;
    }
  });

  // Reset form button
  resetOrderBtn.addEventListener("click", () => {
    resetOrderForm();
  });

  // Submit order (create / update)
  function nextOrderId() {
    const maxId = supplyOrders.reduce(
      (max, o) => Math.max(max, Number(o.order_id) || 0),
      0
    );
    return maxId + 1;
  }

  function buildOrderPayload(orderId, supplierId) {
    const items = currentOrderItems.map((it, idx) => {
      const med = findMedicine(it.medicineId);
      return {
        order_item_id: Date.now() + idx,
        medicine_id: med ? med.medicine_id || med.id : it.medicineId,
        ordered_quantity: it.quantity,
        cost_per_unit: med ? med.price : 0,
        units_per_pack: it.units_per_pack || 1,
        unit: it.unit || med?.unit || "",
      };
    });

    const totalCost = items.reduce(
      (sum, i) => sum + Number(i.ordered_quantity || 0) * Number(i.cost_per_unit || 0),
      0
    );

    return {
      order_id: orderId,
      supplier_id: Number(supplierId),
      order_date: new Date().toISOString(),
      status: "PENDING",
      total_cost: totalCost,
      items,
    };
  }

  orderForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const supplierId = orderSupplierSelect.value;
    if (!supplierId) {
      alert("Supplier is required.");
      return;
    }

    if (currentOrderItems.length === 0) {
      alert("Please add at least one medicine to the order.");
      return;
    }

    const existingId = orderIdInput.value ? Number(orderIdInput.value) : null;
    const orderId = existingId || nextOrderId();
    const payload = buildOrderPayload(orderId, supplierId);

    try {
      const url = existingId
        ? `http://localhost:8000/supply-orders/${orderId}`
        : "http://localhost:8000/supply-orders";
      const method = existingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = data && data.message ? `: ${data.message}` : "";
        throw new Error(`Failed to save order${detail}`);
      }
      alert(existingId ? "Order updated." : "Order created.");
      await loadSupplyOrders();
      resetOrderForm();
    } catch (err) {
      console.error("Save order error:", err);
      alert(err.message || "Failed to save order.");
    }
  });

  // ---------------------------
  // Init
  // ---------------------------
  async function loadSupplyOrders() {
    try {
      const res = await fetch("http://localhost:8000/supply-orders");
      if (!res.ok) throw new Error("Failed to load supply orders");
      const data = await res.json();
      supplyOrders = data.map((o) => ({
        ...o,
        items: (o.items || []).map((it) => ({
          ...it,
          order_item_id: it.order_item_id,
          medicineId: it.medicine_id,
          quantity: it.ordered_quantity,
          unit: it.unit || "",
          units_per_pack: it.units_per_pack,
          expiry_date: it.expiry_date,
        })),
      }));
      renderOrderList();
    } catch (err) {
      console.error("Failed to load supply orders:", err);
      supplyOrders = [];
      renderOrderList();
    }
  }

  async function refreshMedicines() {
    try {
      const medRes = await fetch("http://localhost:8000/medicines");
      if (!medRes.ok) throw new Error("Failed to load medicines");
      const medData = await medRes.json();
      medicines = medData.map((m) => ({
        id: m.medicine_id || m._id,
        medicine_id: m.medicine_id || m._id,
        name: m.name,
        brand: m.brand,
        price: m.price,
        quantity: m.quantity,
        unit: m.unit || "",
        type: m.type || m.medicine_type || "",
        supplier_id: m.supplier_id,
      }));
      renderMedicineSelect();
      renderStockTable();
    } catch (err) {
      console.error("Failed to refresh medicines:", err);
    }
  }

  async function initSupplyOrderPage() {
    try {
      // Fetch suppliers
      const supRes = await fetch("http://localhost:8000/suppliers");
      if (!supRes.ok) throw new Error("Failed to load suppliers");
      const supData = await supRes.json();
      suppliers = supData.map((s) => ({
        supplier_id: s.supplier_id,
        name: s.supplier_name,
        contact: s.contact_person,
      }));

      // Fetch medicines
      const medRes = await fetch("http://localhost:8000/medicines");
      if (!medRes.ok) throw new Error("Failed to load medicines");
      const medData = await medRes.json();
      medicines = medData.map((m) => ({
        id: m.medicine_id || m._id,
        medicine_id: m.medicine_id || m._id,
        name: m.name,
        brand: m.brand,
        price: m.price,
        quantity: m.quantity,
        unit: m.unit || "",
        type: m.type || m.medicine_type || "",
        supplier_id: m.supplier_id,
      }));

      renderSupplierSelect();
      renderMedicineSelect();
      renderOrderItems();
      await loadSupplyOrders();
      renderStockTable();
    } catch (err) {
      console.error("Failed to load suppliers/medicines:", err);
      alert("Failed to load suppliers/medicines from server.");
      renderSupplierSelect();
      renderMedicineSelect();
      renderOrderItems();
      renderOrderList();
      renderStockTable();
    }
  }

  initSupplyOrderPage();
});