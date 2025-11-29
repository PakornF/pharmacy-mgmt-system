let mockSuppliers = [
    {
      id: "sup1",
      name: "Health Pharma Co., Ltd.",
    },
    {
      id: "sup2",
      name: "Premium Med Supply",
    },
  ];

  let mockMedicines = [
    {
      id: "med1",
      name: "Paracetamol 500mg",
      brand: "Tylenol",
      price: 5,
      quantity: 100,
      unit: "tablets",
      supplierId: "sup1",
    },
    {
      id: "med2",
      name: "Amoxicillin 250mg",
      brand: "Amoxi",
      price: 12,
      quantity: 50,
      unit: "capsules",
      supplierId: "sup1",
    },
    {
      id: "med3",
      name: "Cough Syrup",
      brand: "FluCare",
      price: 30,
      quantity: 30,
      unit: "bottles",
      supplierId: "sup2",
    },
  ];
  
  let mockSupplyOrders = [];
  
  //  DOM
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
  
  let currentOrderItems = []; // { medicineId, quantity, unit }
  
  // Helpers
  function findSupplierName(id) {
    const s = mockSuppliers.find((sup) => sup.id === id);
    return s ? s.name : "-";
  }
  
  function findMedicine(id) {
    return mockMedicines.find((m) => m.id === id);
  }
  
  function formatDate(d) {
    return new Date(d).toLocaleString();
  }
  
  // Render stock
  function renderStockTable() {
    if (mockMedicines.length === 0) {
      stockTableBody.innerHTML =
        `<tr><td colspan="4" class="py-2 px-2 text-center text-gray-400 text-sm">No medicines.</td></tr>`;
      return;
    }
  
    stockTableBody.innerHTML = mockMedicines
      .map((m) => {
        const supplierName = findSupplierName(m.supplierId);
        const unitLabel = m.unit ? ` / ${m.unit}` : "";
        return `
          <tr>
            <td class="py-2 px-2 text-left w-1/4">${m.name}</td>
            <td class="py-2 px-2 text-left w-1/4">${supplierName}</td>
            <td class="py-2 px-2 text-right w-1/4">${m.price.toFixed(2)}${unitLabel}</td>
            <td class="py-2 px-2 text-right w-1/4">${m.quantity} ${m.unit || ""}</td>
          </tr>
        `;
      })
      .join("");
  }
  
  // Render supplier select 
  function renderSupplierSelect() {
    orderSupplierSelect.innerHTML =
      `<option value="">Select supplier...</option>` +
      mockSuppliers
        .map((s) => `<option value="${s.id}">${s.name}</option>`)
        .join("");
  }
  
  // Render medicine select (ตาม supplier ที่เลือก)
  function renderMedicineSelect() {
    const supId = orderSupplierSelect.value;
    if (!supId) {
      itemMedicineSelect.innerHTML =
        `<option value="">Select supplier first...</option>`;
      return;
    }
  
    const meds = mockMedicines.filter((m) => m.supplierId === supId);
    if (meds.length === 0) {
      itemMedicineSelect.innerHTML =
        `<option value="">No medicines for this supplier</option>`;
      return;
    }
  
    itemMedicineSelect.innerHTML =
      `<option value="">Select medicine...</option>` +
      meds
        .map((m) => `<option value="${m.id}">${m.name}</option>`)
        .join("");
  }
  
  // Render order items
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
            <td class="py-1 px-2 text-right w-1/6">${stock} ${med?.unit || ""}</td>
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
  
  //Render order list
  function renderOrderList() {
    if (mockSupplyOrders.length === 0) {
      orderTableBody.innerHTML =
        `<tr><td colspan="5" class="py-2 px-2 text-center text-gray-400 text-sm">No supply orders yet.</td></tr>`;
      return;
    }
  
    orderTableBody.innerHTML = mockSupplyOrders
      .map((o) => {
        const supplierName = findSupplierName(o.supplierId);
        const statusBadge =
          o.status === "delivered"
            ? `<span class="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">delivered</span>`
            : `<span class="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700">pending</span>`;
  
        return `
          <tr class="hover:bg-pink-50">
            <td class="py-2 px-2 text-left w-1/5">${o.id}</td>
            <td class="py-2 px-2 text-left w-1/5">${supplierName}</td>
            <td class="py-2 px-2 text-left w-1/5">${statusBadge}</td>
            <td class="py-2 px-2 text-left w-1/5">${formatDate(o.createdAt)}</td>
            <td class="py-2 px-2 text-right w-1/5 space-x-2">
              <button
                class="text-xs text-blue-600 hover:underline"
                data-edit-order="${o.id}"
              >
                Edit
              </button>
              <button
                class="text-xs text-pink-600 hover:underline"
                data-mark-delivered="${o.id}"
              >
                Mark delivered
              </button>
              <button
                class="text-xs text-red-600 hover:underline"
                data-delete-order="${o.id}"
              >
                Delete
              </button>
            </td>
          </tr>
        `;
      })
      .join("");
  }
  
  // Form helpers 
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
    const o = mockSupplyOrders.find((ord) => ord.id === orderId);
    if (!o) return;
  
    orderIdInput.value = o.id;
    orderSupplierSelect.value = o.supplierId;
    orderStatusDisplay.value = o.status;
    orderDateDisplay.value = formatDate(o.createdAt);
    currentOrderItems = o.items.map((it) => ({ ...it }));
    orderFormTitle.textContent = `Edit Order ${o.id}`;
    renderMedicineSelect();
    renderOrderItems();
  }
  
  // Events 
  
  // new order button
  newOrderBtn.addEventListener("click", () => {
    resetOrderForm();
  });
  
  // change supplier → รีโหลด medicine select
  orderSupplierSelect.addEventListener("change", () => {
    renderMedicineSelect();
    currentOrderItems = [];
    renderOrderItems();
  });
  
  // add item
  addItemBtn.addEventListener("click", () => {
    const medId = itemMedicineSelect.value;
    const qtyVal = Number(itemQtyInput.value);
    let unitVal = itemUnitSelect.value;
  
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
      // ถ้าไม่เลือก unit ใช้ unit ตามตัวยาเป็น default
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
      currentOrderItems.push({ medicineId: medId, quantity: qtyVal, unit: unitVal });
    }
  
    itemMedicineSelect.value = "";
    itemUnitSelect.value = "";
    itemQtyInput.value = "";
    renderOrderItems();
  });
  
  // change qty / remove item in table
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
  
  // click actions in order list
  orderTableBody.addEventListener("click", (e) => {
    const editBtn = e.target.closest("button[data-edit-order]");
    const markBtn = e.target.closest("button[data-mark-delivered]");
    const deleteBtn = e.target.closest("button[data-delete-order]");
  
    if (editBtn) {
      const id = editBtn.dataset.editOrder;
      loadOrderIntoForm(id);
      return;
    }
  
    if (deleteBtn) {
      const id = deleteBtn.dataset.deleteOrder;
      const o = mockSupplyOrders.find((ord) => ord.id === id);
      if (!o) return;
      if (!confirm(`Delete order ${o.id}?`)) return;
      mockSupplyOrders = mockSupplyOrders.filter((ord) => ord.id !== id);
      renderOrderList();
      return;
    }
  
    if (markBtn) {
      const id = markBtn.dataset.markDelivered;
      const o = mockSupplyOrders.find((ord) => ord.id === id);
      if (!o) return;
  
      if (o.status === "delivered") {
        alert("This order is already delivered.");
        return;
      }
  
      // mark delivered + update stock (ไม่สน unit ใน mock นี้)
      o.status = "delivered";
      o.items.forEach((it) => {
        const med = findMedicine(it.medicineId);
        if (med) {
          med.quantity += it.quantity;
        }
      });
  
      alert(`Order ${o.id} marked as delivered and stock updated.`);
      if (orderIdInput.value === o.id) {
        orderStatusDisplay.value = o.status;
      }
      renderOrderList();
      renderStockTable();
      return;
    }
  });
  
  // reset form button
  resetOrderBtn.addEventListener("click", () => {
    resetOrderForm();
  });
  
  // submit order
  orderForm.addEventListener("submit", (e) => {
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
  
    const existingId = orderIdInput.value || null;
    if (existingId) {
      // update
      const o = mockSupplyOrders.find((ord) => ord.id === existingId);
      if (!o) return;
  
      if (o.status === "delivered") {
        alert("Delivered order cannot be edited.");
        return;
      }
  
      o.supplierId = supplierId;
      o.items = currentOrderItems.map((it) => ({ ...it }));
      alert(`Order ${o.id} updated.`);
    } else {
      // create new
      const newId = mockSupplyOrders.length + 1;
      const now = new Date().toISOString();
      mockSupplyOrders.push({
        id: newId,
        supplierId,
        status: "pending",
        createdAt: now,
        items: currentOrderItems.map((it) => ({ ...it })),
      });
      alert(`Order ${newId} created.`);
    }
  
    resetOrderForm();
    renderOrderList();
  });
  
  // ---------- Init ----------
  function initSupplyOrderPage() {
    renderSupplierSelect();
    renderMedicineSelect();
    renderOrderItems();
    renderOrderList();
    renderStockTable();
  }
  
  document.addEventListener("DOMContentLoaded", initSupplyOrderPage);