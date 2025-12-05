// supply-order.js

document.addEventListener("DOMContentLoaded", () => {
  // ---------------------------
  // Data stores (fetched from API)
  // ---------------------------
  let suppliers = []; // { supplier_id, name, ... }
  let medicines = []; // { id, name, supplier_id, price, quantity, unit, ... }

  let mockSupplyOrders = [];

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
  const receiveVolumeGroup = document.getElementById("receiveVolumeGroup");
  const receiveVolumeInput = document.getElementById("receiveVolumeInput");
  const receiveCancelBtn = document.getElementById("receiveCancelBtn");
  const receiveOkBtn = document.getElementById("receiveOkBtn");

  let currentOrderItems = []; // { medicineId, quantity, unit, expiryDate?, unitsPerPack?, size?, volume? }

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

  // ---------------------------
  // Render stock table
  // ---------------------------
  function renderStockTable() {
    if (medicines.length === 0) {
      stockTableBody.innerHTML =
        `<tr><td colspan="5" class="py-2 px-2 text-center text-gray-400 text-sm">No medicines.</td></tr>`;
      return;
    }

    stockTableBody.innerHTML = medicines
      .map((m) => {
        const supplierName = findSupplierName(m.supplier_id);
        const expiryText = m.expiryDate ? prettyDate(m.expiryDate) : "-";

        const priceUnitLabel = m.unit ? ` / ${m.unit}` : "";
        const stockUnitLabel = m.displayUnit || m.unit || "";

        let extra = "";
        if (m.unitsPerPack) extra += `${m.unitsPerPack} per box`;
        if (m.packageSize) extra += (extra ? " · " : "") + `${m.packageSize}`;
        if (m.packageVolume) extra += (extra ? " · " : "") + m.packageVolume;

        return `
          <tr>
            <td class="py-2 px-2 text-left w-1/4">${m.name}</td>
            <td class="py-2 px-2 text-left w-1/4">${supplierName}</td>
            <td class="py-2 px-2 text-right w-1/6">
              ${m.price.toFixed(2)}${priceUnitLabel}
            </td>
            <td class="py-2 px-2 text-right w-1/6">
              ${m.quantity} ${stockUnitLabel}
            </td>
            <td class="py-2 px-2 text-right w-1/6 text-sm">
              ${expiryText}${
          extra
            ? "<br/><span class='text-xs text-gray-500'>" + extra + "</span>"
            : ""
        }
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
      return;
    }

    const meds = medicines.filter(
      (m) => String(m.supplier_id) === String(supId)
    );
    if (meds.length === 0) {
      itemMedicineSelect.innerHTML =
        `<option value="">No medicines for this supplier</option>`;
      return;
    }

    itemMedicineSelect.innerHTML =
      `<option value="">Select medicine...</option>` +
      meds.map((m) => `<option value="${m.id}">${m.name}</option>`).join("");
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
        const stockUnitLabel = med ? med.displayUnit || med.unit || "" : "";
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
              ${stock} ${stockUnitLabel}
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
    if (mockSupplyOrders.length === 0) {
      orderTableBody.innerHTML =
        `<tr><td colspan="5" class="py-2 px-2 text-center text-gray-400 text-sm">No supply orders yet.</td></tr>`;
      return;
    }

    orderTableBody.innerHTML = mockSupplyOrders
      .map((o) => {
        const supplierName = findSupplierName(o.supplierId);
        const statusBadge =
          o.status === "received"
            ? `<span class="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">received</span>`
            : `<span class="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700">pending</span>`;

        return `
          <tr class="hover:bg-pink-50">
            <td class="py-2 px-2 text-left w-1/5">${o.id}</td>
            <td class="py-2 px-2 text-left w-1/5">${supplierName}</td>
            <td class="py-2 px-2 text-left w-1/5">${statusBadge}</td>
            <td class="py-2 px-2 text-left w-1/5">${formatDateTime(
              o.createdAt
            )}</td>
            <td class="py-2 px-2 text-right w-1/5 space-x-2">
              <button
                class="text-xs text-blue-600 hover:underline"
                data-edit-order="${o.id}"
              >
                Edit
              </button>
              <button
                class="text-xs text-pink-600 hover:underline"
                data-mark-received="${o.id}"
              >
                Mark as received
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

  // ---------------------------
  // Modal: รับของทีละ item
  // ---------------------------
  function openReceiveModal({
    med,
    item,
    needsUnitsPerBox,
    needsSizeAndVolume,
  }) {
    return new Promise((resolve) => {
      receiveResolve = resolve;

      // set texts
      receiveTitle.textContent = `Receive: ${med.name}`;
      receiveSubtitle.textContent = `Ordered: ${item.quantity} ${item.unit}`;

      // set min date = วันนี้
      receiveExpiryInput.value = item.expiryDate || "";
      receiveExpiryInput.min = todayISO();

      // units/box สำหรับกล่องยาเม็ด
      if (needsUnitsPerBox) {
        receiveUnitsPerBoxGroup.classList.remove("hidden");
        receiveUnitsPerBoxInput.value =
          item.unitsPerPack != null ? String(item.unitsPerPack) : "";
      } else {
        receiveUnitsPerBoxGroup.classList.add("hidden");
        receiveUnitsPerBoxInput.value = "";
      }

      // bottle / tube → size + volume
      if (needsSizeAndVolume) {
        receiveSizeGroup.classList.remove("hidden");
        receiveVolumeGroup.classList.remove("hidden");
        receiveSizeSelect.value = item.size || "";
        receiveVolumeInput.value = item.volume || "";
      } else {
        receiveSizeGroup.classList.add("hidden");
        receiveVolumeGroup.classList.add("hidden");
        receiveSizeSelect.value = "";
        receiveVolumeInput.value = "";
      }

      // show modal
      receiveBackdrop.classList.remove("hidden");
    });
  }

  function closeReceiveModal() {
    receiveBackdrop.classList.add("hidden");
  }

  receiveCancelBtn.addEventListener("click", () => {
    if (receiveResolve) {
      receiveResolve(null); // ยกเลิก
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

    let size = null;
    let volume = null;
    if (!receiveSizeGroup.classList.contains("hidden")) {
      size = receiveSizeSelect.value;
      if (!size) {
        alert("Please select size (small / large).");
        return;
      }
      volume = receiveVolumeInput.value.trim(); // อนุโลมให้ว่างได้
    }

    const payload = { expiryDate: exp, unitsPerBox, size, volume };
    receiveResolve(payload);
    receiveResolve = null;
    closeReceiveModal();
  });

  // ---------------------------
  // Mark as received helper
  // ---------------------------
  async function handleMarkAsReceived(order) {
    if (order.status === "received") {
      alert("This order is already marked as received.");
      return;
    }

    // วนทีละ item แล้วเปิด modal ให้กรอกข้อมูล
    for (let i = 0; i < order.items.length; i++) {
      const it = order.items[i];
      const med = findMedicine(it.medicineId);
      if (!med) continue;

      // ใช้ unit ที่สั่งใน order เป็นหลัก
      const orderUnitRaw = it.unit || med.unit || "";
      const unitLower = orderUnitRaw.toLowerCase();

      const isBox = unitLower.startsWith("box"); // "box" หรือ "box(es)"
      const isBottleOrTube =
        unitLower.startsWith("bottle") || unitLower.startsWith("tube");

      // กล่อง → ถาม units per box
      const needsUnitsPerBox = isBox;
      // ขวด / หลอด → ถาม size + volume
      const needsSizeAndVolume = isBottleOrTube;

      const info = await openReceiveModal({
        med,
        item: it,
        needsUnitsPerBox,
        needsSizeAndVolume,
      });

      // ถ้ากด Cancel → ยกเลิกทั้ง order
      if (!info) {
        alert("Receive process cancelled. No stock updated.");
        return;
      }

      const { expiryDate, unitsPerBox, size, volume } = info;

      // --- อัปเดต stock ---
      let added = 0;
      if (needsUnitsPerBox && unitsPerBox) {
        // กล่องยา → แปลงเป็นจำนวนหน่วยทั้งหมด (เช่น เม็ด / แคปซูล)
        added = it.quantity * unitsPerBox;
      } else {
        // ขวด/หลอด หรือสั่งเป็นหน่วย base อยู่แล้ว
        added = it.quantity;
      }
      med.quantity += added;

      // --- เก็บข้อมูลลง item & medicine ---
      it.expiryDate = expiryDate;
      if (unitsPerBox != null) it.unitsPerPack = unitsPerBox;
      if (size) it.size = size;
      if (volume) it.volume = volume;

      // summary ที่ level medicine
      if (expiryDate) {
        // เก็บเป็นวันหมดอายุที่ใกล้หมดสุด
        if (!med.expiryDate || expiryDate < med.expiryDate) {
          med.expiryDate = expiryDate;
        }
      }
      if (unitsPerBox != null) med.unitsPerPack = unitsPerBox;
      if (size) med.packageSize = size;
      if (volume) med.packageVolume = volume;

      // ตั้งหน่วยแสดงผลใน stock ให้ตรงกับ unit ที่ใช้ตอนรับของ
      if (isBox) {
        med.displayUnit = "box(es)";
      } else if (isBottleOrTube) {
        // ถ้ามี size → เช่น "small bottle"
        med.displayUnit = size ? `${size} ${orderUnitRaw}` : orderUnitRaw;
      } else {
        med.displayUnit = orderUnitRaw || med.unit;
      }
    }

    order.status = "received";

    alert(`Order ${order.id} marked as received and stock updated.`);

    if (orderIdInput.value === String(order.id)) {
      orderStatusDisplay.value = order.status;
    }

    renderOrderList();
    renderStockTable();
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
    const o = mockSupplyOrders.find((ord) => String(ord.id) === String(orderId));
    if (!o) return;

    orderIdInput.value = o.id;
    orderSupplierSelect.value = o.supplierId;
    orderStatusDisplay.value = o.status;
    orderDateDisplay.value = formatDateTime(o.createdAt);
    currentOrderItems = o.items.map((it) => ({ ...it }));
    orderFormTitle.textContent = `Edit Order ${o.id}`;
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

  // Add item to current order
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
  orderTableBody.addEventListener("click", (e) => {
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
      const o = mockSupplyOrders.find((ord) => String(ord.id) === String(id));
      if (!o) return;
      if (!confirm(`Delete order ${o.id}?`)) return;
      mockSupplyOrders = mockSupplyOrders.filter(
        (ord) => String(ord.id) !== String(id)
      );
      renderOrderList();
      return;
    }

    if (markBtn) {
      const id = markBtn.dataset.markReceived;
      const o = mockSupplyOrders.find((ord) => String(ord.id) === String(id));
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
      const o = mockSupplyOrders.find(
        (ord) => String(ord.id) === String(existingId)
      );
      if (!o) return;

      if (o.status === "received") {
        alert("Received order cannot be edited.");
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

  // ---------------------------
  // Init
  // ---------------------------
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
        name: m.name,
        brand: m.brand,
        price: m.price,
        quantity: m.quantity,
        unit: m.unit || "",
        supplier_id: m.supplier_id,
      }));

      renderSupplierSelect();
      renderMedicineSelect();
      renderOrderItems();
      renderOrderList();
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
