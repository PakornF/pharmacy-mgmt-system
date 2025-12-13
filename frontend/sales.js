// API base (Kept for structure, but not used for fetching)
const API_BASE = "http://localhost:8000";
const PRESCRIPTION_API_BASE = `${API_BASE}/prescriptions`;
const CUSTOMER_API_BASE = `${API_BASE}/customers`;
const SALES_API_BASE = `${API_BASE}/sales`;

// ----------------------------------------------------
// 1. PLACEHOLDER DATA (prescriptions only)
// ----------------------------------------------------

// Prescriptions mock kept for now (used in UI flows); other data comes from APIs
const mockPrescriptions = [];


// ----------------------------------------------------
// 2. CONSTANTS & DOM references (Unchanged)
// ----------------------------------------------------

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
const customerDropdown = document.getElementById('customer_dropdown');

const doctorSearchInput = document.getElementById("doctor_search");
const selectedDoctorInfo = document.getElementById("selectedDoctorInfo");
const doctorLicenseEl = document.getElementById("doctor_license");
const doctorErrorEl = document.getElementById("doctorError");
const issueDateInput = document.getElementById("issueDateInput");
const doctorIdHiddenInput = document.getElementById('doctor_id'); 
const doctorDropdown = document.getElementById('doctor_dropdown');
const findPrescriptionBtn = document.getElementById("findPrescriptionBtn");

const submitSaleBtn = document.getElementById("submitSaleBtn");
const salesHistoryTbody = document.getElementById("salesHistory");

// Latest prescription of selected customer
const latestPrescriptionBox = document.getElementById("latestPrescriptionBox");
const latestPrescriptionMeta = document.getElementById("latestPrescriptionMeta");
const latestPrescriptionTag = document.getElementById("latestPrescriptionTag");
const prescriptionResults = document.getElementById("prescriptionResults");

let allMedicines = [];
let allCustomers = [];
let allDoctors = [];

let latestPrescription = null; 
let latestPrescriptionItems = []; 
let latestPrescriptionList = []; // store filtered list for current view

let billItems = [];
let selectedCustomer = null; 
let selectedDoctor = null; 
let selectedPrescriptionId = null;
let prescriptionsCache = [];

// Flatpickr instance
let datePickerInstance = null;

const getSearchTerm = () => (searchInput ? searchInput.value : "");

// ----------------------------------------------------
// 3. HELPERS (Updated normalizeUnit)
// ----------------------------------------------------

function normalizeUnit(unit) {
  const lowerUnit = (unit || "").toLowerCase();
  
  if (lowerUnit === "boxes" || lowerUnit === "tablets" || lowerUnit === "blisters") {
      return "capsules"; // Everything that is 'pill-like' becomes capsules
  }
  if (lowerUnit === "bottles") {
      return "bottles";
  }
  if (lowerUnit === "tubes") {
      return "tubes";
  }
  // Default fallback if a new unit type is introduced
  return "capsules";
}

function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function updateSelectedSummary() {
  if (!selectedSummaryEl) return;
  if (billItems.length === 0) {
    selectedSummaryEl.textContent = "Selected medicines: none";
    return;
  }
  const names = billItems.map(
    (it) => `${it.name} x${it.quantity} ${normalizeUnit(it.unit || "")}`
  );
  selectedSummaryEl.textContent = "Selected medicines: " + names.join(", ");
}

function getStockFor(id) {
    const idStr = String(id);
    const med = allMedicines.find((m) => String(m.medicine_id) === idStr);
    return med ? med.quantity : 0; 
}

function getMedicineNameById(id) {
  const med = allMedicines.find((m) => String(m.medicine_id) === String(id));
  return med ? med.name : null;
}

async function fetchPrescriptionsFromServer(params = {}) {
  const query = new URLSearchParams();
  if (params.customer_id) query.append("customer_id", params.customer_id);
  if (params.doctor_id) query.append("doctor_id", params.doctor_id);
  if (params.issue_date) query.append("issue_date", params.issue_date);

  const url = query.toString()
    ? `${PRESCRIPTION_API_BASE}?${query.toString()}`
    : PRESCRIPTION_API_BASE;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch prescriptions (status ${res.status})`);
  return res.json();
}

function decoratePrescriptionItem(item) {
  const medDetails = allMedicines.find((m) => m.medicine_id === item.medicine_id);
  const medName =
    item.medicine_name ||
    (medDetails && (medDetails.name || medDetails.medicine_name)) ||
    "";
  const price =
    typeof item.price === "number"
      ? item.price
      : typeof (medDetails && medDetails.price) === "number"
        ? medDetails.price
        : item.priceUnit || 0;
  const stockVal =
    typeof item.stock === "number"
      ? item.stock
      : typeof (medDetails && medDetails.quantity) === "number"
        ? medDetails.quantity
        : 0;
  const unitVal = item.unit || (medDetails && medDetails.unit) || "";

  return {
    ...item,
    medicine_name: medName,
    price,
    stock: stockVal,
    unit: unitVal,
  };
}

function isPrescriptionFullyInBill(prescription) {
  const items = prescription.items || [];
  if (items.length === 0) return false;
  return items.every((item) => {
    const billItem = billItems.find(
      (it) => String(it.medicineId) === String(item.medicine_id)
    );
    const requiredQty = Number(item.quantity) || 0;
    return billItem && billItem.quantity >= requiredQty;
  });
}

function isPrescriptionPresentInBill(prescriptionId) {
  return billItems.some(
    (it) =>
      Array.isArray(it.prescriptionIds) &&
      it.prescriptionIds.some((pid) => String(pid) === String(prescriptionId))
  );
}

function buildPrescriptionSection(prescription) {
  const doctor = allDoctors.find((d) => d.doctor_id === prescription.doctor_id);
  const doctorName = doctor ? doctor.doctor_full_name : `Doctor ID: ${prescription.doctor_id}`;
  const issue = prescription.issue_date ? new Date(prescription.issue_date).toLocaleDateString() : "N/A";
  const items = (prescription.items || []).map(decoratePrescriptionItem);

  const itemBlocks = items
    .map((item) => {
      const displayUnit = normalizeUnit(item.unit);
      const meta = [
        item.medicine_id || "-",
        item.dosage || "-",
        `${item.quantity || 0} ${displayUnit}`,
      ].join(" • ");
      return `
        <div class="px-3 py-2 border-b last:border-b-0 border-pink-50">
          <div class="text-sm font-semibold text-gray-800">${item.medicine_name || "-"}</div>
          <div class="text-[11px] text-gray-600">${meta}</div>
        </div>
      `;
    })
    .join("");

  const alreadyAdded = isPrescriptionFullyInBill(prescription);
  const inBill = isPrescriptionPresentInBill(prescription.prescription_id);
  const buttonLabel = alreadyAdded ? "Added" : "Add All";
  const buttonDisabled = alreadyAdded ? "disabled" : "";
  const buttonStateClasses = alreadyAdded ? "opacity-60 cursor-not-allowed" : "";
  const removeDisabled = inBill ? "" : "disabled";
  const removeStateClasses = inBill ? "" : "opacity-60 cursor-not-allowed";
  const paddleLabel = alreadyAdded ? "Added" : inBill ? "Partial" : "Not added";
  const paddleClasses = alreadyAdded
    ? "bg-green-100 text-green-700"
    : inBill
      ? "bg-yellow-100 text-yellow-700"
      : "bg-gray-100 text-gray-500";

  return `
    <div class="border border-pink-100 rounded-xl bg-white/60">
      <div class="flex items-center justify-between border-b px-3 py-2 text-xs text-pink-700 gap-2">
        <div class="flex items-center gap-2">
          Prescription #${prescription.prescription_id} • ${doctorName} • Issue Date: ${issue}
          <span class="text-[10px] px-2 py-1 rounded-full ${paddleClasses}" data-prescription-paddle="${prescription.prescription_id}">
            ${paddleLabel}
          </span>
        </div>
      </div>
      <div class="max-h-40 overflow-y-auto divide-y divide-transparent">
        ${itemBlocks}
      </div>
      <div class="flex justify-end gap-2 px-3 py-2 border-t border-pink-100">
        <button
          class="text-[10px] px-3 py-1.5 rounded-lg bg-pink-500 text-white hover:bg-pink-600 ${buttonStateClasses}"
          data-add-prescription="${prescription.prescription_id}"
          ${buttonDisabled}
        >
          ${buttonLabel}
        </button>
        <button
          class="text-[10px] px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:text-red-700 hover:bg-red-50 ${removeStateClasses}"
          data-remove-prescription="${prescription.prescription_id}"
          ${removeDisabled}
        >
          X
        </button>
      </div>
    </div>
  `;
}

// ----------------------------------------------------
// 4. DATA FETCH FUNCTIONS
// ----------------------------------------------------

async function fetchMedicines() {
    try {
        const res = await fetch(`${API_BASE}/medicines`);
        if (!res.ok) throw new Error(`Failed to fetch medicines (status ${res.status})`);
        allMedicines = await res.json();
    } catch (err) {
        console.error("Error fetching medicines:", err);
        allMedicines = [];
    }
}

async function fetchCustomers() {
    try {
        const res = await fetch(CUSTOMER_API_BASE);
        if (!res.ok) {
            throw new Error(`Failed to fetch customers (status ${res.status})`);
        }
        allCustomers = await res.json();
    } catch (err) {
        console.error("Error fetching customers:", err);
        allCustomers = [];
    }
}

async function fetchDoctors() {
    try {
        const res = await fetch(`${API_BASE}/doctors`);
        if (!res.ok) throw new Error(`Failed to fetch doctors (status ${res.status})`);
        const docs = await res.json();
        allDoctors = (docs || []).map((d) => ({
            ...d,
            doctor_full_name: d.doctor_full_name || `${d.doctor_first_name || ""} ${d.doctor_last_name || ""}`.trim(),
        }));
    } catch (err) {
        console.error("Error fetching doctors:", err);
        allDoctors = [];
    }
}

async function fetchSales() {
    try {
        const res = await fetch(SALES_API_BASE);
        if (!res.ok) throw new Error(`Failed to fetch sales (status ${res.status})`);
        const sales = await res.json();

        const latestSales = (Array.isArray(sales) ? sales : [])
          .slice()
          .sort((a, b) => new Date(b.sale_datetime) - new Date(a.sale_datetime))
          .slice(0, 5);

        // Enrich each sale with fresh items from the database to ensure medicines reflect the actual sale
        const enrichedSales = await Promise.all(
          latestSales.map(async (sale) => {
            try {
              const detailRes = await fetch(`${SALES_API_BASE}/${sale.sale_id}`);
              if (detailRes.ok) {
                const detail = await detailRes.json();
                // use only detail items; skip stale summary items
                const detailItems = Array.isArray(detail.items) ? detail.items : [];
                const detailSale = detail.sale ? detail.sale : sale;
                // Guard: if the detail sale_id does not match, discard to avoid mixing data
                if (detailSale.sale_id !== sale.sale_id) {
                  console.warn(`Sale detail mismatch: summary sale_id=${sale.sale_id} detail sale_id=${detailSale.sale_id}`);
                  return null;
                }
                return { ...detailSale, items: detailItems };
              }
            } catch (err) {
              console.error(`Error fetching sale detail for sale_id ${sale.sale_id}:`, err);
            }
            return null; // avoid showing stale data if detail fetch fails
          })
        );

        const filteredSales = enrichedSales.filter(Boolean);

        if (filteredSales.length === 0) {
          salesHistoryTbody.innerHTML =
            `<tr><td colspan="6" class="py-1 text-gray-400 text-center">None</td></tr>`;
          return;
        }

        salesHistoryTbody.innerHTML = filteredSales
          .map((s) => {
            const detail = (s.items || [])
              .map((it) => {
                const dosageText =
                  it.dosage && it.dosage.trim() !== ""
                    ? it.dosage.trim()
                    : "-";
                const name =
                  it.medicine_name ||
                  (it.medicine && (it.medicine.name || it.medicine.medicine_name)) ||
                  getMedicineNameById(it.medicine_id) ||
                  "Unknown";
                const medId = it.medicine_id ? String(it.medicine_id) : "N/A";
                return `[${medId}] ${name} x${it.quantity} (Dosage: ${dosageText})`;
              })
              .join(", ");

            const cid = s.customer_id ?? "-";
            const customer =
              allCustomers.find((c) => c.customer_id === cid) || null;
            const cname = customer ? customer.full_name : "-";
            
            const total =
              typeof s.total_price === "number" ? s.total_price : 0;
            const date = s.sale_datetime
              ? new Date(s.sale_datetime).toLocaleString('en-GB', { 
                    day: '2-digit', month: '2-digit', year: 'numeric', 
                    hour: '2-digit', minute: '2-digit', second: '2-digit', 
                    hour12: false 
                })
              : "-";

            return `
              <tr class="border-b">
                <td class="py-2 px-2 text-left w-1/6">${date}</td>
                <td class="py-2 px-2 text-left w-1/6">[${cid}] ${cname}</td>
                <td class="py-2 px-2 text-right w-1/6">${total.toFixed(
                  2
                )}</td>
                <td class="py-1 px-2 text-center w-1/6">${(s.items || []).length}</td>
                <td class="py-2 px-2 text-left w-2/6">${detail}</td>
              </tr>
            `;
          })
          .join("");
      } catch (err) {
        console.error("Error fetching sales:", err);
        salesHistoryTbody.innerHTML =
          `<tr><td colspan="6" class="py-1 text-gray-400 text-center">None</td></tr>`;
      }
}

// ----------------------------------------------------
// 5. SEARCH RESULTS & BILL
// ----------------------------------------------------

function renderSearchResults(keyword) {
  if (!searchResults) return;
  // Require a loaded prescription (matched by customer+doctor+date)
  if (!latestPrescriptionItems || latestPrescriptionItems.length === 0) {
    searchResults.innerHTML = "";
    return;
  }

  const q = (keyword || "").toLowerCase();
  const source = latestPrescriptionItems;

  const filtered = source.filter((m) => {
    const name = (m.medicine_name || m.name || "").toLowerCase();
    return name.includes(q);
  });

  if (filtered.length === 0) {
    searchResults.innerHTML = "";
    return;
  }

  searchResults.innerHTML = filtered
    .map((m) => {
      const id = m.medicine_id;
      const name = m.medicine_name || m.name || "";
      const price = typeof m.price === "number" ? m.price : m.priceUnit || 0;
      const stock = getStockFor(id); 
      const unit = m.unit || "";
      const dosage = m.dosage || "-";

      const inBill = billItems.some((it) => it.medicineId === id);
      const displayUnit = normalizeUnit(unit);

      return `
        <tr class="border-b">
          <td class="py-1">${name}</td>
          <td class="py-1 text-right">${Number(price || 0).toFixed(2)} / ${displayUnit}</td>
          <td class="py-1 text-right">${stock} ${displayUnit}</td>
          <td class="py-1 text-left text-xs">${dosage}</td>
          <td class="py-1 text-center">
            <input
              type="checkbox"
              data-select="${id}"
              ${inBill ? "checked" : ""}
              ${stock <= 0 ? "disabled" : ""}
            />
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderBill() {
  if (billItems.length === 0) {
    // Colspan is 6 (Name, Dosage, Price, Qty, Unit, Total)
    billItemsTbody.innerHTML =
      `<tr><td colspan="6" class="py-1 text-gray-400 text-center">No items in bill.</td></tr>`; 
    grandTotalEl.textContent = "0.00";
    updateSelectedSummary();
    syncPrescriptionAddButtons();
    return;
  }

  billItemsTbody.innerHTML = billItems
    .map(
      (item, idx) => {
        const displayUnit = normalizeUnit(item.unit || "");
        return `
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
        <td class="py-1 text-center">${item.quantity || 0}</td>
        <td class="py-1 text-center">${displayUnit}</td>
        <td class="py-1 text-right">${item.lineTotal.toFixed(2)}</td>
      </tr>
    `;
      }
    )
    .join("");

  const total = billItems.reduce((sum, it) => sum + it.lineTotal, 0);
  grandTotalEl.textContent = total.toFixed(2);
  updateSelectedSummary();
  syncPrescriptionAddButtons();
}

function addToBill(med) {
  const id = med.medicine_id;
  const name = med.medicine_name || med.name || "";
  const unit = med.unit || "";
  const dosage = med.dosage || "";
  const medDetails = allMedicines.find((m) => String(m.medicine_id) === String(id));
  const price = typeof med.price === "number"
    ? med.price
    : typeof (medDetails && medDetails.price) === "number"
      ? medDetails.price
      : med.priceUnit || 0;

  const existing = billItems.find((it) => it.medicineId === id);
  const stock = getStockFor(id);
  let requestedQty = 1;
  
  if (!existing && med.quantity && med.quantity > 0) {
      requestedQty = med.quantity;
  } else if (existing) {
      requestedQty = existing.quantity + 1;
  }

  if (requestedQty > stock) {
    alert(`Cannot add/increase item: Not enough stock for ${med.name}. Available = ${stock}`);
    return;
  }

  if (existing) {
    existing.quantity += 1;
    existing.lineTotal = existing.quantity * existing.price;
  } else {
    const prescribedLimit = Number.isFinite(med.prescriptionQty ?? med.prescription_quantity ?? med.prescribedQuantity)
      ? Number(med.prescriptionQty ?? med.prescription_quantity ?? med.prescribedQuantity)
      : Infinity;

    billItems.push({
      medicineId: id,
      name,
      price,
      quantity: requestedQty,
      unit, 
      dosage,
      lineTotal: requestedQty * price,
      fromPrescription: !!med.prescription_id,
      prescriptionQty: prescribedLimit,
      prescriptionIds: med.prescription_id ? [med.prescription_id] : [],
    });
  }
  renderBill();
}

// Add to bill from prescription (only add, don't increase quantity if exists)
function addToBillFromPrescription(med) {
  const id = med.medicine_id;
  const name = med.medicine_name || med.name || "";
  const unit = med.unit || "";
  const dosage = med.dosage || "";
  const medDetails = allMedicines.find((m) => String(m.medicine_id) === String(id));
  const price = typeof med.price === "number"
    ? med.price
    : typeof (medDetails && medDetails.price) === "number"
      ? medDetails.price
      : med.priceUnit || 0;

  // Use quantity from prescription, or default to 1
  const requestedQty = (med.quantity && med.quantity > 0) ? med.quantity : 1;
  const stock = med.stock && med.stock > 0 ? med.stock : getStockFor(id);
  if (stock <= 0) {
    alert(`Cannot add item: ${name} is out of stock.`);
    return;
  }
  const medQtyAllowance = (med.quantity && med.quantity > 0) ? med.quantity : Infinity;
  const medPrescId = med.prescription_id || null;

  // If item already exists in bill, expand its allowance and optionally bump quantity
  const existing = billItems.find((it) => it.medicineId === id);
  if (existing) {
    const prevCap = Number.isFinite(existing.prescriptionQty) ? existing.prescriptionQty : Infinity;
    const addCap = Number.isFinite(medQtyAllowance) ? medQtyAllowance : Infinity;
    const newCap = (prevCap === Infinity || addCap === Infinity) ? Infinity : Math.max(prevCap, addCap);
    existing.prescriptionQty = newCap;

    // Track prescription IDs involved
    existing.prescriptionIds = existing.prescriptionIds || [];
    if (medPrescId && !existing.prescriptionIds.includes(medPrescId)) {
      existing.prescriptionIds.push(medPrescId);
    }

    // Set quantity to min(current + new allowance chunk, cap, stock)
    const desiredQty = existing.quantity + (Number.isFinite(addCap) ? addCap : 0);
    const cappedQty = Math.min(
      newCap === Infinity ? desiredQty : Math.min(desiredQty, newCap),
      stock
    );
    if (cappedQty <= existing.quantity) {
      alert(`Cannot add more ${name}. Limit reached (Stock: ${stock}, Prescription total: ${newCap === Infinity ? '∞' : newCap}).`);
    } else {
      existing.quantity = cappedQty;
      existing.lineTotal = existing.quantity * existing.price;
    }
    renderBill();
    return true;
  }

  // Add new item to bill
  billItems.push({
    medicineId: id,
    name,
    price,
    quantity: Math.min(requestedQty, stock),
    unit, 
    dosage,
    lineTotal: Math.min(requestedQty, stock) * price,
    fromPrescription: true,
    prescriptionQty: medQtyAllowance,
    prescriptionIds: medPrescId ? [medPrescId] : [],
  });
  
  renderBill();
  return true;
}

function addPrescriptionToBill(prescriptionId) {
  const target = latestPrescriptionList.find(
    (p) => String(p.prescription_id) === String(prescriptionId)
  );
  if (!target) {
    alert("Prescription not found.");
    return;
  }

  const items = (target.items || []).map((item) =>
    decoratePrescriptionItem({
      ...item,
      prescription_id: target.prescription_id,
    })
  );

  let addedAny = false;
  items.forEach((item) => {
    const added = addToBillFromPrescription(item);
    if (added) {
      addedAny = true;
    }
  });

  if (addedAny && prescriptionResults) {
    const btn = prescriptionResults.querySelector(
      `button[data-add-prescription="${prescriptionId}"]`
    );
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Added";
      btn.classList.add("opacity-60", "cursor-not-allowed");
    }
  }
  syncPrescriptionAddButtons();
}

function syncPrescriptionAddButtons() {
  if (!prescriptionResults) return;
  prescriptionResults.querySelectorAll("button[data-add-prescription]").forEach((btn) => {
    const pid = btn.dataset.addPrescription;
    const pres = latestPrescriptionList.find(
      (p) => String(p.prescription_id) === String(pid)
    );
    const fullyAdded = pres ? isPrescriptionFullyInBill(pres) : false;
    btn.disabled = fullyAdded;
    btn.textContent = fullyAdded ? "Added" : "Add All";
    btn.classList.toggle("opacity-60", fullyAdded);
    btn.classList.toggle("cursor-not-allowed", fullyAdded);
  });

  prescriptionResults.querySelectorAll("button[data-remove-prescription]").forEach((btn) => {
    const pid = btn.dataset.removePrescription;
    const inBill = isPrescriptionPresentInBill(pid);
    btn.disabled = !inBill;
    btn.classList.toggle("opacity-60", !inBill);
    btn.classList.toggle("cursor-not-allowed", !inBill);
  });

  // Update paddle text/state
  prescriptionResults.querySelectorAll("[data-prescription-paddle]").forEach((paddle) => {
    const pid = paddle.dataset.prescriptionPaddle;
    const pres = latestPrescriptionList.find((p) => String(p.prescription_id) === String(pid));
    const fullyAdded = pres ? isPrescriptionFullyInBill(pres) : false;
    const partially = pres ? isPrescriptionPresentInBill(pid) && !fullyAdded : false;
    let label = "Not added";
    let classes = "bg-gray-100 text-gray-500";
    if (fullyAdded) {
      label = "Added";
      classes = "bg-green-100 text-green-700";
    } else if (partially) {
      label = "Partial";
      classes = "bg-yellow-100 text-yellow-700";
    }
    paddle.textContent = label;
    paddle.className = `text-[10px] px-2 py-1 rounded-full ${classes}`;
  });
}

function removeFromBillById(id) {
  const idx = billItems.findIndex((it) => it.medicineId === id);
  if (idx !== -1) {
    billItems.splice(idx, 1);
    renderBill();
  }
}

function removePrescriptionFromBill(prescriptionId) {
  const pidStr = String(prescriptionId);
  let changed = false;

  billItems = billItems
    .map((item) => {
      if (
        !Array.isArray(item.prescriptionIds) ||
        !item.prescriptionIds.some((pid) => String(pid) === pidStr)
      ) {
        return item;
      }

      const remainingIds = item.prescriptionIds.filter(
        (pid) => String(pid) !== pidStr
      );

      // If no prescription remains, drop the item entirely
      if (remainingIds.length === 0) {
        changed = true;
        return null;
      }

      // If other prescriptions remain, keep item but clear caps to avoid under-counting
      changed = true;
      return {
        ...item,
        prescriptionIds: remainingIds,
        prescriptionQty: Infinity,
        fromPrescription: true,
      };
    })
    .filter(Boolean);

  if (changed) {
    renderBill();
  }
}

// ----------------------------------------------------
// 6. CUSTOMER & PRESCRIPTION LOGIC (Updated with dropdown)
// ----------------------------------------------------

function handleCustomerSearch() {
  const searchTerm = customerSearchInput.value.trim();

  selectedCustomer = null;
  if (selectedCustomerInfo) {
    selectedCustomerInfo.textContent = "No customer selected.";
  }
  customerErrorEl.classList.add("hidden");

  // Reset all related states when search changes
  billItems = [];
  renderBill();
  latestPrescription = null;
  latestPrescriptionItems = [];
  latestPrescriptionBox.classList.add("hidden");

  if (searchTerm.length === 0) {
    customerDropdown.classList.add('hidden');
    return;
  }

  const q = searchTerm.toLowerCase();

  const filtered = allCustomers.filter((c) => {
    const idStr = String(c.customer_id || "").toLowerCase();
    const nameStr = (c.full_name || "").toLowerCase();
    return idStr.includes(q) || nameStr.includes(q);
  });

  if (filtered.length === 0) {
    customerDropdown.innerHTML = '<div class="p-3 text-gray-500 text-sm">No customers found</div>';
    customerDropdown.classList.remove('hidden');
    return;
  }

  customerDropdown.innerHTML = filtered.map(customer => `
    <div 
      class="customer-option px-4 py-2 hover:bg-pink-50 cursor-pointer border-b" 
      style="border-color: #f8bbd0;"
      data-id="${customer.customer_id}"
      data-name="${escapeHtml(customer.full_name)}"
      data-contact="${escapeHtml(customer.contact || '')}"
    >
      <div class="font-medium" style="color: #ad1457;">${escapeHtml(customer.full_name)}</div>
      <div class="text-xs text-gray-600">
        ID: ${customer.customer_id} | Contact: ${escapeHtml(customer.contact || '-')}
      </div>
    </div>
  `).join('');

  customerDropdown.classList.remove('hidden');

  customerDropdown.querySelectorAll('.customer-option').forEach(option => {
    option.onclick = () => {
      const id = Number(option.dataset.id);
      const name = option.dataset.name;
      const contact = option.dataset.contact;

      selectedCustomer = {
        customer_id: id,
        full_name: name,
        contact: contact
      };

      customerSearchInput.value = name;
      if (selectedCustomerInfo) {
        selectedCustomerInfo.textContent = `Selected: [${id}] ${name}` + (contact ? ` (${contact})` : "");
      }
      customerErrorEl.classList.add("hidden");

      customerDropdown.classList.add('hidden');

      // No auto-search; wait for Find button
    };
  });
}

// Keep findCustomer for backward compatibility (if needed)
function findCustomer() {
  handleCustomerSearch();
}

function loadAllPrescriptionsForCustomer(customerId) {
  // Fetch latest prescription for this customer from backend
  latestPrescription = null; 
  latestPrescriptionItems = [];
  latestPrescriptionList = [];
  latestPrescriptionBox.classList.add("hidden");
  selectedPrescriptionId = null;

  const currentDoctorId = selectedDoctor ? selectedDoctor.doctor_id : null;
  const currentDoctorTerm = (doctorSearchInput.value || "").trim().toLowerCase();
  const currentIssueDate = (issueDateInput.value || "").trim() || null;

  // Fetch all prescriptions and show those for this customer
  fetchPrescriptionsFromServer({
    customer_id: customerId,
    doctor_id: currentDoctorId || undefined,
    issue_date: currentIssueDate || undefined,
  })
    .then(list => {
      const matches = (list || []).filter(p => {
        const pid = Number(p.customer_id);
        if (pid !== customerId) return false;
        const did = Number(p.doctor_id);
        const doc = allDoctors.find((d) => d.doctor_id === did);
        const docName = (doc && doc.doctor_full_name) ? doc.doctor_full_name.toLowerCase() : "";
        const docMatch = currentDoctorId
          ? did === currentDoctorId
          : currentDoctorTerm
            ? docName.includes(currentDoctorTerm)
            : true;
        const issue = p.issue_date ? new Date(p.issue_date).toISOString().slice(0, 10) : "";
        const dateMatch = currentIssueDate ? issue === currentIssueDate : true;
        return docMatch && dateMatch;
      });
      latestPrescriptionList = matches;
      if (!matches || matches.length === 0) {
        if (prescriptionResults) {
          prescriptionResults.innerHTML = `<div class="text-sm text-gray-500">No prescriptions found for this customer.</div>`;
        }
        renderSearchResults(getSearchTerm());
        return;
      }

      // Use latest by issue_date as "current" for adds
      const latest = matches
        .slice()
        .sort((a, b) => new Date(b.issue_date || 0) - new Date(a.issue_date || 0))[0];

      latestPrescription = latest;
      selectedPrescriptionId = latest.prescription_id;
      latestPrescriptionItems = (latest.items || []).map(item => {
          const fullMed = allMedicines.find(m => m.medicine_id === item.medicine_id);
          const stock = fullMed ? fullMed.quantity : item.stock || 0;
          return {
              ...item,
              stock: stock, 
              unit: item.unit, 
              prescription_item_id: item.prescription_item_id || Math.random() 
          };
      });

      const doctor = allDoctors.find(d => d.doctor_id === latest.doctor_id);
      const doctorName = doctor ? doctor.doctor_full_name : 'Unknown Doctor';
      const issueDate = latest.issue_date ? new Date(latest.issue_date).toLocaleDateString() : '';
      
      latestPrescriptionMeta.textContent = "";
      latestPrescriptionMeta.classList.add("hidden");
      if (latestPrescriptionTag) {
        latestPrescriptionTag.textContent = "Latest"; 
        latestPrescriptionTag.className = "text-[10px] px-2 py-1 rounded-full bg-green-100 text-pink-700";
      }
      latestPrescriptionBox.classList.remove("hidden");

      if (prescriptionResults) {
        prescriptionResults.innerHTML = matches
          .slice()
          .sort((a, b) => new Date(b.issue_date || 0) - new Date(a.issue_date || 0))
          .map(buildPrescriptionSection)
          .join("");
      }

      renderSearchResults(getSearchTerm());
    })
    .catch(err => {
      console.error("Error fetching prescriptions:", err);
      if (prescriptionResults) {
        prescriptionResults.innerHTML = `<div class="text-sm text-red-500">Error loading prescriptions.</div>`;
      }
      renderSearchResults(getSearchTerm());
    });
}

function searchPrescriptionsByFilters() {
    
    // 1. Validation check (customer required; doctor/date optional filters)
    const customerId = selectedCustomer ? selectedCustomer.customer_id : null;
    const doctorId = selectedDoctor ? selectedDoctor.doctor_id : null;
    const doctorTerm = (doctorSearchInput.value || "").trim().toLowerCase();
    const issueDate = (issueDateInput.value || "").trim(); // YYYY-MM-DD (C.S.)

    if (!customerId) {
        return; // need customer to proceed
    }

    // 2. Reset
    latestPrescription = null;
    latestPrescriptionItems = [];
    latestPrescriptionBox.classList.add("hidden");
    if (prescriptionResults) {
      prescriptionResults.innerHTML = "";
    }
    billItems = [];
    renderBill();

    fetchPrescriptionsFromServer({
      customer_id: customerId,
      doctor_id: doctorId || undefined,
      issue_date: issueDate || undefined,
    })
      .then((prescriptions) => {
        // Only keep prescriptions that haven't been sold yet
        const matches = (prescriptions || []).filter((p) => {
          const pid = Number(p.customer_id);
          const did = Number(p.doctor_id);
          const doc = allDoctors.find((d) => d.doctor_id === did);
          const docName = (doc && doc.doctor_full_name) ? doc.doctor_full_name.toLowerCase() : "";
          const issue = p.issue_date ? new Date(p.issue_date).toISOString().slice(0, 10) : "";
          const customerMatch = pid === customerId;
          const doctorMatch = doctorId
            ? did === doctorId
            : doctorTerm
              ? docName.includes(doctorTerm)
              : true;
          const dateMatch = issueDate ? issue === issueDate : true;
          const notSold = p.is_sale !== true;
          return customerMatch && doctorMatch && dateMatch && notSold;
        });

        if (!matches || matches.length === 0) {
          if (prescriptionResults) {
            prescriptionResults.innerHTML = `<div class="text-sm text-gray-500">No prescriptions found for this customer.</div>`;
          }
          renderSearchResults(getSearchTerm());
          return;
        }

        // Keep list for rendering
        latestPrescriptionList = matches;

        // Use latest by issue_date
        const match = matches
          .slice()
          .sort((a, b) => new Date(b.issue_date || 0) - new Date(a.issue_date || 0))[0];

        latestPrescription = match;
        selectedPrescriptionId = match.prescription_id;
        latestPrescriptionItems = (match.items || []).map((item) => {
          const fullMed = allMedicines.find((m) => m.medicine_id === item.medicine_id);
          const stock = fullMed ? fullMed.quantity : 0;
          const medName = item.medicine_name || (item.medicine && item.medicine.name) || "";
          const unit = item.unit || (item.medicine && item.medicine.unit) || "";
          return {
            ...item,
            medicine_name: medName,
            unit: unit,
            stock: stock,
            prescription_item_id: item.prescription_item_id || Math.random(),
          };
        });
        
        const doctor = allDoctors.find((d) => d.doctor_id === match.doctor_id);
        const doctorName = doctor ? doctor.doctor_full_name : 'Unknown Doctor';
        const issueDateDisplay = match.issue_date ? new Date(match.issue_date).toLocaleDateString() : (issueDate || "N/A");
        
        latestPrescriptionMeta.textContent = "";
        latestPrescriptionMeta.classList.add("hidden");
        if (latestPrescriptionTag) {
          latestPrescriptionTag.textContent = (doctorId || issueDate) ? "FILTERED" : "MATCHED"; 
          latestPrescriptionTag.className = "text-[10px] px-2 py-1 rounded-full bg-pink-100 text-pink-700";
        }
        latestPrescriptionBox.classList.remove("hidden");

        if (prescriptionResults) {
          prescriptionResults.innerHTML = matches
            .slice()
            .sort((a, b) => new Date(b.issue_date || 0) - new Date(a.issue_date || 0))
            .map(buildPrescriptionSection)
            .join("");
        }

        renderSearchResults(getSearchTerm());
      })
      .catch((err) => {
        console.error("Error searching prescriptions:", err);
        if (prescriptionResults) {
          prescriptionResults.innerHTML = `<div class="text-sm text-red-500">Error loading prescriptions.</div>`;
        }
        renderSearchResults(getSearchTerm());
      });
}

// ----------------------------------------------------
// 7. DOCTOR LOGIC (Unchanged)
// ----------------------------------------------------

function handleDoctorSearch() {
  const searchTerm = doctorSearchInput.value.trim();

  selectedDoctor = null;
  doctorIdHiddenInput.value = '';
  if (selectedDoctorInfo) {
    selectedDoctorInfo.textContent = "No doctor selected.";
  }
  doctorLicenseEl.textContent = "";

  if (searchTerm.length === 0) {
    doctorDropdown.classList.add('hidden');
    checkAndSearchPrescription(); // re-filter without doctor
    return;
  }

  const filtered = allDoctors.filter(doctor => {
    const q = searchTerm.toLowerCase();
    const name = (doctor.doctor_full_name || '').toLowerCase();
    const license = (doctor.license_no || '').toString().toLowerCase();
    const docIdStr = (doctor.doctor_id || '').toString().toLowerCase();
    
    return (
      name.includes(q) ||
      license.includes(q) ||
      docIdStr.includes(q)
    );
  });

  if (filtered.length === 0) {
    doctorDropdown.innerHTML = '<div class="p-3 text-gray-500 text-sm">No doctors found</div>';
    doctorDropdown.classList.remove('hidden');
    return;
  }

  doctorDropdown.innerHTML = filtered.map(doctor => `
    <div 
      class="doctor-option px-4 py-2 hover:bg-pink-50 cursor-pointer border-b" 
      style="border-color: #f8bbd0;"
      data-id="${doctor.doctor_id}"
      data-name="${escapeHtml(doctor.doctor_full_name)}"
      data-license="${escapeHtml(doctor.license_no)}"
    >
      <div class="font-medium" style="color: #ad1457;">${escapeHtml(doctor.doctor_full_name)}</div>
      <div class="text-xs text-gray-600">
        ID: ${doctor.doctor_id} | License: ${doctor.license_no || '-'}
      </div>
    </div>
  `).join('');

  doctorDropdown.classList.remove('hidden');

  doctorDropdown.querySelectorAll('.doctor-option').forEach(option => {
    option.onclick = () => {
      const id = Number(option.dataset.id); 
      const name = option.dataset.name;
      const license = option.dataset.license;

      selectedDoctor = {
          doctor_id: id,
          doctor_full_name: name,
          license_no: license
      };
      
      doctorIdHiddenInput.value = id;
      doctorSearchInput.value = name;
      doctorLicenseEl.textContent = `License: ${license}`;

      if (selectedDoctorInfo) {
        selectedDoctorInfo.textContent = `Selected: [${id}] ${name} (${license})`;
      }

      doctorDropdown.classList.add('hidden');
      
      // No auto-search; wait for Find button
    };
  });
}

// ----------------------------------------------------
// 8. STOCK UPDATE FUNCTION
// ----------------------------------------------------

function updateLocalStock(soldItems) {
    soldItems.forEach(soldItem => {
        const med = allMedicines.find(m => m.medicine_id === soldItem.medicineId);
        if (med) {
            med.quantity = Math.max(0, med.quantity - soldItem.quantity);
        }
    });
}


// ----------------------------------------------------
// 9. SUBMIT SALE (Real API)
// ----------------------------------------------------
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
  
  // Final Stock Check
  for (const item of billItems) {
      const currentStock = getStockFor(item.medicineId);
      if (item.quantity > currentStock) {
          alert(`Error: Cannot confirm sale. Quantity of ${item.name} (${item.quantity}) exceeds current stock (${currentStock}).`);
          return;
      }
  }

  const prescriptionIds = Array.from(
    new Set(
      billItems
        .filter((it) => it.fromPrescription && Array.isArray(it.prescriptionIds))
        .flatMap((it) => it.prescriptionIds)
        .filter(Boolean)
    )
  );

  const payload = {
    customer_id: selectedCustomer.customer_id,
    prescription_id: selectedPrescriptionId || prescriptionIds[0] || null,
    prescription_ids: prescriptionIds,
    items: billItems.map((item) => ({
      medicine_id: item.medicineId,
      quantity: item.quantity,
      dosage: item.dosage || "",
    })),
  };

  try {
    const res = await fetch(SALES_API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || `Failed to create sale (status ${res.status})`);
    }

    updateLocalStock(billItems);
    alert("Sale created successfully.");
  } catch (err) {
    console.error("Error creating sale:", err);
    alert(err.message || "Failed to create sale.");
    return;
  }

  // Clear form
  billItems = [];
  selectedCustomer = null;
  customerSearchInput.value = "";
  if (selectedCustomerInfo) {
    selectedCustomerInfo.textContent = "No customer selected.";
  }
  customerErrorEl.classList.add("hidden");
  
  selectedDoctor = null;
  doctorSearchInput.value = "";
  doctorIdHiddenInput.value = "";
  if (selectedDoctorInfo) {
    selectedDoctorInfo.textContent = "No doctor selected.";
  }
  doctorLicenseEl.textContent = "";
  doctorErrorEl.classList.add("hidden");
  // Clear date picker
  if (datePickerInstance) {
    datePickerInstance.clear();
  } else {
    issueDateInput.value = "";
  }

  latestPrescriptionBox.classList.add("hidden");
  latestPrescription = null;
  latestPrescriptionItems = [];
  selectedPrescriptionId = null;

  renderBill();
  await fetchSales(); // Re-fetch sales history to update Recent Sales box
}

// ----------------------------------------------------
// 10. EVENT LISTENERS (Unchanged)
// ----------------------------------------------------
// Add prescription (all medicines) into bill

if (prescriptionResults) {
  prescriptionResults.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-add-prescription]");
    const removeBtn = e.target.closest("button[data-remove-prescription]");
    if (btn) {
      const prescId = btn.dataset.addPrescription;
      addPrescriptionToBill(prescId);
      return;
    }
    if (removeBtn) {
      const prescId = removeBtn.dataset.removePrescription;
      removePrescriptionFromBill(prescId);
      return;
    }
  });
}

// Customer search input event
customerSearchInput.addEventListener("input", handleCustomerSearch);
customerSearchInput.addEventListener('blur', () => {
    setTimeout(() => {
        customerDropdown.classList.add('hidden');
    }, 200);
});

// Doctor search input event
doctorSearchInput.addEventListener("input", handleDoctorSearch);
doctorSearchInput.addEventListener('blur', () => {
    setTimeout(() => {
        doctorDropdown.classList.add('hidden');
    }, 200);
});

// Find prescriptions button
if (findPrescriptionBtn) {
  findPrescriptionBtn.addEventListener("click", () => {
    searchPrescriptionsByFilters();
  });
}

// Confirm Sale button
submitSaleBtn.addEventListener("click", submitSale);

// Medicine search input event
if (searchInput) {
  searchInput.addEventListener("input", () => {
    renderSearchResults(getSearchTerm());
  });
}

// ----------------------------------------------------
// 10.5. AUTO-SEARCH PRESCRIPTION WHEN ALL FIELDS ARE FILLED
// ----------------------------------------------------
function checkAndSearchPrescription() {
  // No auto-search; user must click Find
  return;
}

// ----------------------------------------------------
// 11. INITIALIZE FLATPICKR DATE PICKER
// ----------------------------------------------------
function initializeDatePicker() {
  const dateInput = document.getElementById('issueDateInput');
  if (dateInput && typeof flatpickr !== 'undefined') {
    // Destroy existing instance if any
    if (datePickerInstance) {
      datePickerInstance.destroy();
    }
    
    const today = new Date().toISOString().split('T')[0];
    datePickerInstance = flatpickr(dateInput, {
      dateFormat: 'Y-m-d',
      locale: 'en',
      maxDate: today,
      allowInput: true,
      onChange: function() {}
    });
  }
}

// ----------------------------------------------------
// 12. INIT (Unchanged)
// ----------------------------------------------------
(async function init() {
  try {
    billItems = [];
    await fetchCustomers();
    await fetchDoctors();
    await fetchMedicines();
    await fetchSales();
    
    // Initialize Flatpickr with English locale
    initializeDatePicker();
    
    renderBill();
    if (selectedCustomerInfo) {
      selectedCustomerInfo.textContent = "No customer selected.";
    }
    latestPrescriptionBox.classList.add("hidden");
    renderSearchResults(getSearchTerm());

  } catch (err) {
    console.error(err);
    alert("Failed to init sales page: " + err.message);
  }
})();
