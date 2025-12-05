// frontend/sales.js

// -----------------------------
// API base
// -----------------------------
const API_BASE = "http://localhost:8000";
const PRESCRIPTION_API_BASE = `${API_BASE}/prescriptions`;
const CUSTOMER_API_BASE = `${API_BASE}/customers`;
const SALES_API_BASE = `${API_BASE}/sales`;


// -----------------------------
// Prescription helpers
// -----------------------------

async function loadLatestPrescriptionForCustomer(customerId) {
  latestPrescription = null;
  latestPrescriptionItems = [];

  // Reset UI ก่อน
  latestPrescriptionBox.classList.add("hidden");
  latestPrescriptionMeta.textContent = "";
  latestPrescriptionTag.textContent = "";
  latestPrescriptionItemsBody.innerHTML =
    `<tr><td colspan="4" class="py-2 text-center text-gray-400 text-xs">Loading latest prescription...</td></tr>`;

  try {
    const res = await fetch(
      `${PRESCRIPTION_API_BASE}/customer/${customerId}/latest-items`
    );
    if (!res.ok) {
      throw new Error("Failed to load latest prescription");
    }
    const data = await res.json();

    latestPrescription = data.prescription;
    latestPrescriptionItems = Array.isArray(data.items) ? data.items : [];

    if (!latestPrescription || latestPrescriptionItems.length === 0) {
      latestPrescriptionItemsBody.innerHTML =
        `<tr><td colspan="4" class="py-2 text-center text-gray-400 text-xs">No prescription items found for this customer.</td></tr>`;
      latestPrescriptionBox.classList.remove("hidden");
      latestPrescriptionTag.textContent = "No items";
      latestPrescriptionTag.className =
        "text-[10px] px-2 py-1 rounded-full bg-gray-100 text-gray-600";
      latestPrescriptionMeta.textContent = "";
      // ไม่มีรายการ แต่ยังให้ search จาก mock ได้
      renderSearchResults(searchInput.value || "");
      return;
    }

    // มีใบสั่งยา
    const issueDate = latestPrescription.issue_date
      ? new Date(latestPrescription.issue_date).toLocaleDateString()
      : "-";

    latestPrescriptionMeta.textContent = `Prescription #${
      latestPrescription.prescription_id
    } • Issue Date: ${issueDate}`;
    latestPrescriptionTag.textContent = "From Doctor";
    latestPrescriptionTag.className =
      "text-[10px] px-2 py-1 rounded-full bg-pink-100 text-pink-700";
    latestPrescriptionBox.classList.remove("hidden");

    // เติมตารางด้านบน (ชื่อยา / dosage / qty / ปุ่ม Add)
    latestPrescriptionItemsBody.innerHTML = latestPrescriptionItems
      .map((it, idx) => {
        const dosageText =
          it.dosage && it.dosage.trim() !== "" ? it.dosage.trim() : "-";
        return `
          <tr class="border-b text-[11px]">
            <td class="py-1 px-2">${it.medicine_name || it.medicine_id}</td>
            <td class="py-1 px-2">${dosageText}</td>
            <td class="py-1 px-1 text-center">${it.quantity}</td>
            <td class="py-1 px-1 text-center">
              <button
                type="button"
                class="text-[10px] px-2 py-1 rounded-lg bg-pink-500 text-white hover:bg-pink-600"
                data-add-prescription-idx="${idx}"
              >
                Add
              </button>
            </td>
          </tr>
        `;
      })
      .join("");

    // อัปเดตตาราง Search ด้านล่างให้ใช้ items จากใบสั่งยาเป็น source หลัก
    renderSearchResults(searchInput.value || "");
  } catch (err) {
    console.error("Error loading latest prescription:", err);
    latestPrescriptionItemsBody.innerHTML =
      `<tr><td colspan="4" class="py-2 text-center text-red-500 text-xs">Error loading latest prescription.</td></tr>`;
    latestPrescriptionBox.classList.remove("hidden");
    latestPrescriptionTag.textContent = "Error";
    latestPrescriptionTag.className =
      "text-[10px] px-2 py-1 rounded-full bg-red-100 text-red-600";
  }
}

// -----------------------------
// Constants & DOM references
// -----------------------------

const UNIT_CHOICES = [
  "tablets",
  "capsules",
  "boxes",
  "bottles",
  "tubes",
  "blisters",
];

const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("searchResults");
const selectedSummaryEl = document.getElementById("selectedSummary");

const billItemsTbody = document.getElementById("billItems");
const grandTotalEl = document.getElementById("grandTotal");

const customerSearchInput = document.getElementById("customerSearchInput");
const selectedCustomerInfo = document.getElementById("selectedCustomerInfo");
const customerErrorEl = document.getElementById("customerError");

const submitSaleBtn = document.getElementById("submitSaleBtn");
const salesHistoryTbody = document.getElementById("salesHistory");

// ใบสั่งยาล่าสุดของลูกค้าคนที่เลือก
const latestPrescriptionBox = document.getElementById("latestPrescriptionBox");
const latestPrescriptionMeta = document.getElementById("latestPrescriptionMeta");
const latestPrescriptionTag = document.getElementById("latestPrescriptionTag");
const latestPrescriptionItemsBody = document.getElementById(
  "latestPrescriptionItemsBody"
);

let allMedicines = [];
let allCustomers = [];
// latestPrescriptionItems: ข้อมูลจาก backend /prescriptions/customer/:id/latest-items
// { medicine_id, medicine_name, unit, dosage, quantity, price, stock, ... }
let latestPrescription = null;
let latestPrescriptionItems = [];

// billItems: รายการในบิล
// { medicineId, name, price, quantity, unit, dosage, lineTotal, fromPrescription: boolean }
let billItems = [];
let selectedCustomer = null; // mock: { customer_id, full_name, contact }

// -----------------------------
// Helpers
// -----------------------------
function updateSelectedSummary() {
  if (billItems.length === 0) {
    selectedSummaryEl.textContent = "Selected medicines: none";
    return;
  }
  const names = billItems.map(
    (it) => `${it.name} x${it.quantity} ${it.unit || ""}`
  );
  selectedSummaryEl.textContent = "Selected medicines: " + names.join(", ");
}

// stock ของยาแต่ละตัว (ถ้ามาจากใบสั่งยาจะใช้ stock จาก backend ก่อน)
function getStockFor(id) {
  const pItem = latestPrescriptionItems.find(
    (it) => it.medicine_id === id || it.medicineId === id
  );
  if (pItem && typeof pItem.stock === "number") {
    return pItem.stock;
  }
  const med = allMedicines.find((m) => m.medicine_id === id);
  return med ? med.quantity : Infinity;
}

// render options ของ unit select
function renderUnitOptions(selectedUnit) {
  return UNIT_CHOICES.map(
    (u) =>
      `<option value="${u}" ${u === selectedUnit ? "selected" : ""}>${u}</option>`
  ).join("");
}

// -----------------------------
// LOAD MEDICINES จาก backend
// -----------------------------
async function fetchMedicines() {
  try {
    const res = await fetch(`${API_BASE}/medicines`);
    if (!res.ok) {
      throw new Error("Failed to load medicines");
    }
    allMedicines = await res.json();
  } catch (err) {
    console.error("Error loading medicines:", err);
    allMedicines = [];
  }
  renderSearchResults("");
}

// -----------------------------
// Search result table (with checkbox)
// แสดงรายการยา: ถ้ามี latestPrescriptionItems ให้ใช้เป็นแหล่งหลัก
// ถ้าไม่มีใบสั่งยา → fallback ไปใช้ allMedicines (mock)
// -----------------------------
function renderSearchResults(keyword) {
  const q = (keyword || "").toLowerCase();
  const source =
    latestPrescriptionItems.length > 0
      ? latestPrescriptionItems
      : allMedicines;

  const filtered = source.filter((m) => {
    const name = (m.medicine_name || m.name || "").toLowerCase();
    const brand = (m.brand || "").toLowerCase();
    return name.includes(q) || brand.includes(q);
  });

  if (filtered.length === 0) {
    searchResults.innerHTML =
      `<tr><td colspan="4" class="py-1 text-gray-400 text-center">No medicines found.</td></tr>`;
    return;
  }

  searchResults.innerHTML = filtered
    .map((m) => {
      const id = m.medicine_id || m._id;
      const name = m.medicine_name || m.name || "";
      const price = typeof m.price === "number" ? m.price : m.priceUnit;
      const stock =
        typeof m.stock === "number"
          ? m.stock
          : m.quantity !== undefined
          ? m.quantity
          : 0;
      const unit = m.unit || "";

      const inBill = billItems.some((it) => it.medicineId === id);
      const unitLabel = unit ? ` / ${unit}` : "";
      return `
        <tr class="border-b">
          <td class="py-1">${name}</td>
          <td class="py-1 text-right">${Number(price || 0).toFixed(
            2
          )}${unitLabel}</td>
          <td class="py-1 text-right">${stock} ${unit}</td>
          <td class="py-1 text-center">
            <input
              type="checkbox"
              data-select="${id}"
              ${inBill ? "checked" : ""}
            />
          </td>
        </tr>
      `;
    })
    .join("");
}

// -----------------------------
// CURRENT BILL
// -----------------------------
function renderBill() {
  if (billItems.length === 0) {
    billItemsTbody.innerHTML =
      `<tr><td colspan="7" class="py-1 text-gray-400 text-center">No items in bill.</td></tr>`;
    grandTotalEl.textContent = "0.00";
    updateSelectedSummary();
    renderSearchResults(searchInput.value || "");
    return;
  }

  billItemsTbody.innerHTML = billItems
    .map(
      (item, idx) => `
      <tr class="border-b">
        <td class="py-1">${item.name}</td>
        <td class="py-1 text-left text-xs">
          ${
            item.dosage && item.dosage.trim() !== ""
              ? item.dosage
              : "-"
          }
        </td>
        <td class="py-1 text-right">${item.price.toFixed(2)}</td>
        <td class="py-1 text-center">
          <input
            type="number"
            min="1"
            value="${item.quantity}"
            data-idx="${idx}"
            class="w-16 border rounded px-1 py-0.5 text-center text-sm qty-input"
          />
        </td>
        <td class="py-1 text-center">
          <select
            data-idx="${idx}"
            class="border rounded px-1 py-0.5 text-xs unit-select"
          >
            ${renderUnitOptions(item.unit || "")}
          </select>
        </td>
        <td class="py-1 text-right">${item.lineTotal.toFixed(2)}</td>
        <td class="py-1 text-center">
          <button
            class="text-xs text-red-500"
            data-remove="${idx}"
          >
            ✕
          </button>
        </td>
      </tr>
    `
    )
    .join("");

  const total = billItems.reduce((sum, it) => sum + it.lineTotal, 0);
  grandTotalEl.textContent = total.toFixed(2);
  updateSelectedSummary();
  renderSearchResults(searchInput.value || "");
}

function addToBill(med) {
  const id = med.medicine_id || med._id;
  const name = med.medicine_name || med.name || "";
  const unit = med.unit || "";
  const dosage = med.dosage || "";
  const price = typeof med.price === "number" ? med.price : med.priceUnit || 0;

  const existing = billItems.find((it) => it.medicineId === id);
  const stock = getStockFor(id);
  const currentQty = existing ? existing.quantity : 0;

  if (currentQty + 1 > stock) {
    alert(`Not enough stock for ${med.name}. Max = ${stock}`);
    return;
  }

  if (existing) {
    existing.quantity += 1;
    existing.lineTotal = existing.quantity * existing.price;
  } else {
    billItems.push({
      medicineId: id,
      name,
      price,
      // ถ้ามี quantity จากใบสั่งยาให้ใช้เป็นค่าเริ่มต้น ไม่งั้น = 1
      quantity: med.quantity && med.quantity > 0 ? med.quantity : 1,
      unit,
      dosage,
      lineTotal:
        (med.quantity && med.quantity > 0 ? med.quantity : 1) * price,
      fromPrescription: !!med.prescription_id,
    });
  }
  renderBill();
}

function removeFromBillById(id) {
  const idx = billItems.findIndex((it) => it.medicineId === id);
  if (idx !== -1) {
    billItems.splice(idx, 1);
    renderBill();
  }
}

// -----------------------------
// LOAD CUSTOMERS จาก backend
// -----------------------------
async function fetchCustomers() {
  try {
    const res = await fetch(CUSTOMER_API_BASE);
    if (!res.ok) {
      throw new Error("Failed to load customers");
    }
    allCustomers = await res.json();
  } catch (err) {
    console.error("Error loading customers:", err);
    allCustomers = [];
  }
}

// -----------------------------
// CUSTOMER SEARCH (ใช้ข้อมูลจริงจาก backend)
// -----------------------------
function findCustomer() {
  const qRaw = customerSearchInput.value.trim();
  const q = qRaw.toLowerCase();

  customerErrorEl.classList.add("hidden");

  if (!q) {
    selectedCustomer = null;
    selectedCustomerInfo.textContent = "No customer selected.";
    return;
  }

  const onlyDigits = (s) => (s || "").replace(/\D/g, "");

  // 1) ถ้าพิมพ์มาเป็นเลขล้วน เช่น "2" ให้ลองแมตช์ customer_id ตรงเป๊ะก่อน
  const qDigits = onlyDigits(qRaw);
  if (qDigits && allCustomers.length > 0) {
    const byId = allCustomers.filter(
      (c) => String(c.customer_id) === qDigits
    );
    if (byId.length === 1) {
      selectedCustomer = byId[0];
      const id = selectedCustomer.customer_id;
      const name = selectedCustomer.full_name || "-";
      const contact = selectedCustomer.contact || "";
      selectedCustomerInfo.textContent =
        `Selected: [${id}] ${name}` + (contact ? ` (${contact})` : "");

      if (selectedCustomer && selectedCustomer.customer_id) {
        loadLatestPrescriptionForCustomer(selectedCustomer.customer_id);
      }
      return;
    }
  }

  // 2) ไม่เข้าเคสข้างบน หรือหา id ไม่เจอ → ค่อยใช้การค้นหาแบบกว้างเหมือนเดิม
  const matches = allCustomers.filter((c) => {
    const idStr = String(c.customer_id || "").toLowerCase();
    const nameStr = (c.full_name || "").toLowerCase();
    const contactStr = (c.contact || "").toLowerCase();
    const contactDigits = onlyDigits(c.contact);

    return (
      idStr.includes(q) ||
      nameStr.includes(q) ||
      contactStr.includes(q) ||
      (qDigits && contactDigits && contactDigits.includes(qDigits))
    );
  });

  if (matches.length === 0) {
    selectedCustomer = null;
    selectedCustomerInfo.textContent = "No customer found.";
    return;
  }

  if (matches.length > 1) {
    selectedCustomer = null;
    selectedCustomerInfo.textContent =
      `Found ${matches.length} customers — please type more specific (e.g. full ID or phone).`;
    return;
  }

  selectedCustomer = matches[0];
  const id = selectedCustomer.customer_id || "-";
  const name = selectedCustomer.full_name || "-";
  const contact = selectedCustomer.contact || "";

  selectedCustomerInfo.textContent =
    `Selected: [${id}] ${name}` + (contact ? ` (${contact})` : "");

  // เมื่อเลือก customer สำเร็จ → ดึงใบสั่งยาล่าสุดของลูกค้าคนนี้มาแสดง
  if (selectedCustomer && selectedCustomer.customer_id) {
    loadLatestPrescriptionForCustomer(selectedCustomer.customer_id);
  }
}

// -----------------------------
// SALES HISTORY จาก backend
// -----------------------------
async function fetchSales() {
  try {
    const res = await fetch(SALES_API_BASE);
    if (!res.ok) {
      throw new Error("Failed to load sales");
    }
    const sales = await res.json();

    if (!Array.isArray(sales) || sales.length === 0) {
      salesHistoryTbody.innerHTML =
        `<tr><td colspan="5" class="py-1 text-gray-400 text-center">No sales yet.</td></tr>`;
      return;
    }

    salesHistoryTbody.innerHTML = sales
      .map((s) => {
        const detail = (s.items || [])
          .map((it) => {
            const dosageText =
              it.dosage && it.dosage.trim() !== ""
                ? it.dosage.trim()
                : "-";
            const name = it.medicine_name || it.medicine_id || "Unknown";
            return `${name} x${it.quantity} (Dosage: ${dosageText})`;
          })
          .join(", ");

        const cid = s.customer_id ?? "-";
        const customer =
          allCustomers.find((c) => c.customer_id === cid) || null;
        const cname = customer ? customer.full_name : "-";

        const total =
          typeof s.total_price === "number" ? s.total_price : 0;
        const date = s.sale_datetime
          ? new Date(s.sale_datetime).toLocaleString()
          : "-";

        return `
          <tr class="border-b">
            <td class="py-2 px-2 text-left w-1/5">${date}</td>
            <td class="py-2 px-2 text-left w-1/5">[${cid}] ${cname}</td>
            <td class="py-2 px-2 text-right w-1/5">${total.toFixed(
              2
            )}</td>
            <td class="py-1 px-2 text-center w-1/5">${(s.items || []).length}</td>
            <td class="py-2 px-2 text-left w-1/5">${detail}</td>
          </tr>
        `;
      })
      .join("");
  } catch (err) {
    console.error("Error loading sales:", err);
    salesHistoryTbody.innerHTML =
      `<tr><td colspan="5" class="py-1 text-red-500 text-center">Error loading sales.</td></tr>`;
  }
}

// -----------------------------
// CONFIRM SALE (ยิงเข้า backend /sales จริง)
// -----------------------------
async function submitSale() {
  if (billItems.length === 0) {
    alert("No items in bill.");
    return;
  }

  if (!selectedCustomer) {
    customerErrorEl.classList.remove("hidden");
    customerSearchInput.focus();
    return;
  }

  const customerId = selectedCustomer.customer_id;

  const payload = {
    customer_id: customerId,
    prescription_id: latestPrescription
      ? latestPrescription.prescription_id
      : null,
    items: billItems.map((it) => ({
      medicine_id: it.medicineId,
      quantity: it.quantity,
      dosage: it.dosage || "",
    })),
  };

  try {
    const res = await fetch(SALES_API_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const msg =
        errBody.message || "Failed to create sale. Please try again.";
      alert(msg);
      return;
    }

    alert("Sale created successfully!");

    // เคลียร์ฟอร์ม
    billItems = [];
    selectedCustomer = null;
    customerSearchInput.value = "";
    selectedCustomerInfo.textContent = "No customer selected.";
    customerErrorEl.classList.add("hidden");
    latestPrescriptionBox.classList.add("hidden");
    latestPrescription = null;
    latestPrescriptionItems = [];

    renderBill();
    await fetchMedicines();
    await fetchSales();
  } catch (err) {
    console.error("Error creating sale:", err);
    alert("Error creating sale: " + err.message);
  }
}

// -----------------------------
// EVENT LISTENERS
// -----------------------------
searchInput.addEventListener("input", (e) => {
  renderSearchResults(e.target.value);
});

// ติ๊ก checkbox เพื่อเลือก / ยกเลิกเลือกยา
searchResults.addEventListener("change", (e) => {
  const checkbox = e.target.closest("input[data-select]");
  if (!checkbox) return;
  const id = checkbox.getAttribute("data-select");
  // พยายามหาใน latestPrescriptionItems ก่อน (ข้อมูลสมบูรณ์กว่า: dosage, quantity ที่หมอสั่ง)
  let med =
    latestPrescriptionItems.find((m) => m.medicine_id === id) || null;
  if (!med) {
    med = allMedicines.find((m) => m._id === id) || null;
  }
  if (!med) return;

  if (checkbox.checked) {
    addToBill(med);
  } else {
    removeFromBillById(id);
  }
});

// กดปุ่ม Add ในกล่อง Latest Prescription
latestPrescriptionItemsBody.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-add-prescription-idx]");
  if (!btn) return;
  const idx = Number(btn.getAttribute("data-add-prescription-idx"));
  if (
    Number.isNaN(idx) ||
    idx < 0 ||
    idx >= latestPrescriptionItems.length
  ) {
    return;
  }
  const item = latestPrescriptionItems[idx];
  addToBill(item);
});

// เปลี่ยนจำนวนในบิล
billItemsTbody.addEventListener("input", (e) => {
  if (!e.target.classList.contains("qty-input")) return;

  const idx = Number(e.target.dataset.idx);
  if (idx < 0 || idx >= billItems.length) return;

  let raw = e.target.value;
  if (raw === "") {
    return;
  }

  let val = Number(raw);
  if (isNaN(val) || val <= 0) {
    val = 1;
  }

  const item = billItems[idx];
  const stock = getStockFor(item.medicineId);

  if (val > stock) {
    alert(`Not enough stock for ${item.name}. Max = ${stock}`);
    val = stock;
  }

  item.quantity = val;
  item.lineTotal = item.quantity * item.price;
  e.target.value = val;

  renderBill();
});

// เปลี่ยน unit ในบิล
billItemsTbody.addEventListener("change", (e) => {
  if (!e.target.classList.contains("unit-select")) return;
  const idx = Number(e.target.dataset.idx);
  if (idx < 0 || idx >= billItems.length) return;
  billItems[idx].unit = e.target.value;
  updateSelectedSummary();
});

// ลบรายการออกจากบิล
billItemsTbody.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-remove]");
  if (!btn) return;
  const idx = Number(btn.getAttribute("data-remove"));
  billItems.splice(idx, 1);
  renderBill();
});

// ค้นหา customer เมื่อ blur หรือกด Enter (ใช้ mock)
customerSearchInput.addEventListener("blur", () => {
  findCustomer();
});

customerSearchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    findCustomer();
  }
});

// ปุ่ม Confirm Sale
submitSaleBtn.addEventListener("click", submitSale);

// -----------------------------
// INIT
// -----------------------------
(async function init() {
  try {
    billItems = [];
    renderBill();
    await fetchCustomers();
    await fetchMedicines();
    await fetchSales();
    selectedCustomerInfo.textContent = "No customer selected.";
  } catch (err) {
    console.error(err);
    alert("Failed to init sales page: " + err.message);
  }
})();