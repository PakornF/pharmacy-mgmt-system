// frontend/sales.js


let mockSales = [];

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
const customerSearchResults = document.getElementById("customerSearchResults");
const selectedCustomerInfo = document.getElementById("selectedCustomerInfo");
const customerErrorEl = document.getElementById("customerError");

const submitSaleBtn = document.getElementById("submitSaleBtn");
const salesHistoryTbody = document.getElementById("salesHistory");

let allMedicines = [];
let allCustomers = [];
let billItems = []; // { medicineId, name, price, quantity, unit, lineTotal }
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

// stock ของยาแต่ละตัว
function getStockFor(id) {
  const med = allMedicines.find((m) => String(m._id) === String(id));
  return med ? med.quantity : Infinity;
}

// render options ของ unit select
function renderUnitOptions(selectedUnit) {
  return UNIT_CHOICES.map(
    (u) =>
      `<option value="${u}" ${u === selectedUnit ? "selected" : ""}>${u}</option>`
  ).join("");
}

async function fetchMedicines() {
  try {
    const response = await fetch('http://localhost:8000/medicines'); // Fetch from backend API
    if (!response.ok) {
      throw new Error('Failed to fetch medicines');
    }
    const medicines = await response.json();
    allMedicines = Array.isArray(medicines) ? medicines : [];
    renderMedicineSearchResults(allMedicines, ""); // Pass the data to the render function
  } catch (error) {
    console.error("Error fetching medicines:", error);
    alert('Error fetching medicines from the server.');
  }
}

async function fetchCustomers() {
  try {
    const response = await fetch('http://localhost:8000/customers'); // Fetch customers from backend
    if (!response.ok) {
      throw new Error('Failed to fetch customers');
    }
    const customers = await response.json();
    allCustomers = Array.isArray(customers) ? customers : [];
    renderCustomerSearchResults(allCustomers, ""); // Pass the data to render function
  } catch (error) {
    console.error("Error fetching customers:", error);
    alert('Error fetching customers from the server.');
  }
}


// -----------------------------
// Search result table (with checkbox)
// -----------------------------
function renderMedicineSearchResults(medicines, keyword) {
  const list = Array.isArray(medicines) ? medicines : [];
  const q = (keyword || "").toLowerCase();
  const filtered = list.filter(
    (m) =>
      m.name.toLowerCase().includes(q) ||
      (m.brand && m.brand.toLowerCase().includes(q))
  );

  if (filtered.length === 0) {
    searchResults.innerHTML =
      `<tr><td colspan="4" class="py-1 text-gray-400 text-center">No medicines found.</td></tr>`;
    return;
  }

  searchResults.innerHTML = filtered
    .map((m) => {
      const inBill = billItems.some(
        (it) => String(it.medicineId) === String(m._id)
      );
      const unitLabel = m.unit ? ` / ${m.unit}` : "";
      return `
        <tr class="border-b">
          <td class="py-1">${m.name}</td>
          <td class="py-1 text-right">${m.price.toFixed(2)}${unitLabel}</td>
          <td class="py-1 text-right">${m.quantity} ${m.unit || ""}</td>
          <td class="py-1 text-center">
            <input
              type="checkbox"
              data-select="${m._id}"
              ${inBill ? "checked" : ""}
            />
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderCustomerSearchResults(customers, keyword) {
  if (!customerSearchResults) return;
  const list = Array.isArray(customers) ? customers : [];
  const q = (keyword || "").toLowerCase();
  const filtered = list.filter(
    (customer) =>
      (customer.full_name || "").toLowerCase().includes(q) ||
      (customer.contact || "").toLowerCase().includes(q) ||
      String(customer.customer_id).includes(q)
  );

  if (filtered.length === 0) {
    customerSearchResults.innerHTML =
      `<tr><td colspan="4" class="py-1 text-gray-400 text-center">No customers found.</td></tr>`;
    return;
  }

  customerSearchResults.innerHTML = filtered
    .map((customer) => {
      return `
        <tr class="border-b">
          <td class="py-1">${customer.customer_id}</td>
          <td class="py-1">${customer.full_name}</td>
          <td class="py-1">${customer.contact || ""}</td>
          <td class="py-1 text-center">
            <button class="select-customer-btn" data-customer-id="${customer.customer_id}">
              Select
            </button>
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
      `<tr><td colspan="6" class="py-1 text-gray-400 text-center">No items in bill.</td></tr>`;
    grandTotalEl.textContent = "0.00";
    updateSelectedSummary();
    renderMedicineSearchResults(allMedicines, searchInput.value || "");
    return;
  }

  billItemsTbody.innerHTML = billItems
    .map(
      (item, idx) => `
      <tr class="border-b">
        <td class="py-1">${item.name}</td>
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
  renderMedicineSearchResults(allMedicines, searchInput.value || "");
}

function addToBill(med) {
  const medId = String(med._id);
  const existing = billItems.find((it) => it.medicineId === medId);
  const stock = getStockFor(medId);
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
      medicineId: medId,
      name: med.name,
      price: med.price,
      quantity: 1,
      unit: med.unit || "",
      lineTotal: med.price,
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
// CUSTOMER SEARCH (ใช้ mock แทน backend)
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
  if (qDigits) {
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
}

// -----------------------------
// SALES HISTORY (mockSales)
// -----------------------------
async function fetchSales() {
  if (mockSales.length === 0) {
    salesHistoryTbody.innerHTML =
      `<tr><td colspan="5" class="py-1 text-gray-400 text-center">No sales yet.</td></tr>`;
    return;
  }

  salesHistoryTbody.innerHTML = mockSales
    .map((s) => {
      const detail = s.items
        .map((it) => `${it.name} x${it.quantity} ${it.unit || ""}`)
        .join(", ");

      const cid = s.customerId || "-";
      const cname = s.customerName || "-";

      return `
        <tr class="border-b">
          <td class="py-2 px-2 text-left w-1/5">${new Date(
            s.date
          ).toLocaleString()}</td>
          <td class="py-2 px-2 text-left w-1/5">[${cid}] ${cname}</td>
          <td class="py-2 px-2 text-right w-1/5">${s.totalAmount.toFixed(
            2
          )}</td>
          <td class="py-1 px-2 text-center w-1/5">${s.items.length}</td>
          <td class="py-2 px-2 text-left w-1/5">${detail}</td>
        </tr>
      `;
    })
    .join("");
}

// -----------------------------
// CONFIRM SALE (mock + ลด stock mock)
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

  const customerId =
    selectedCustomer.customer_id || "unknown";
  const customerName =
    selectedCustomer.full_name || "Unknown";

  const totalAmount = billItems.reduce((sum, it) => sum + it.lineTotal, 0);

  // ลด stock ในรายการยาที่โหลดมา
  billItems.forEach((it) => {
    const med = allMedicines.find((m) => String(m._id) === String(it.medicineId));
    if (med) {
      med.quantity -= it.quantity;
      if (med.quantity < 0) med.quantity = 0;
    }
  });

  // บันทึก sale ลง mockSales
  const newSale = {
    id: "sale" + (mockSales.length + 1),
    date: new Date().toISOString(),
    customerId,
    customerName,
    totalAmount,
    items: billItems.map((it) => ({
      medicineId: it.medicineId,
      name: it.name,
      quantity: it.quantity,
      price: it.price,
      unit: it.unit || "",
    })),
  };
  mockSales.unshift(newSale);

  alert("Mock sale created! (not saved to DB)");

  // เคลียร์ฟอร์ม
  billItems = [];
  selectedCustomer = null;
  customerSearchInput.value = "";
  selectedCustomerInfo.textContent = "No customer selected.";
  customerErrorEl.classList.add("hidden");

  renderBill();
  await fetchMedicines();
  await fetchSales();
}

// -----------------------------
// EVENT LISTENERS
// -----------------------------
searchInput.addEventListener("input", (e) => {
  renderMedicineSearchResults(allMedicines, e.target.value);
});

customerSearchInput.addEventListener("input", async (e) => {
  selectedCustomer = null;
  selectedCustomerInfo.textContent = "No customer selected.";
  customerErrorEl.classList.add("hidden");
  renderCustomerSearchResults(allCustomers, e.target.value);
});

if (customerSearchResults) {
  customerSearchResults.addEventListener("click", (e) => {
    const btn = e.target.closest(".select-customer-btn");
    if (!btn) return;

    const cid = btn.dataset.customerId;
    const customer = allCustomers.find(
      (c) => String(c.customer_id) === String(cid)
    );
    if (!customer) return;

    selectedCustomer = customer;
    const name = selectedCustomer.full_name || "-";
    const contact = selectedCustomer.contact || "";
    selectedCustomerInfo.textContent =
      `Selected: [${selectedCustomer.customer_id}] ${name}` +
      (contact ? ` (${contact})` : "");
    customerErrorEl.classList.add("hidden");
  });
}

// ติ๊ก checkbox เพื่อเลือก / ยกเลิกเลือกยา
searchResults.addEventListener("change", (e) => {
  const checkbox = e.target.closest("input[data-select]");
  if (!checkbox) return;
  const id = checkbox.getAttribute("data-select");
  const med = allMedicines.find((m) => String(m._id) === String(id));
  if (!med) return;

  if (checkbox.checked) {
    addToBill(med);
  } else {
    removeFromBillById(id);
  }
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
    // Fetch medicines from the database
    await fetchMedicines();
    // Fetch customers from the database
    await fetchCustomers();
    // Fetch sales history from the database
  } catch (err) {
    console.error(err);
    alert("Failed to load medicines: " + err.message);
  }
})();
