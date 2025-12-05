// API base (Kept for structure, but not used for fetching)
const API_BASE = "http://localhost:8000";
const PRESCRIPTION_API_BASE = `${API_BASE}/prescriptions`;
const CUSTOMER_API_BASE = `${API_BASE}/customers`;
const SALES_API_BASE = `${API_BASE}/sales`;

// ----------------------------------------------------
// 1. MOCK DATA (Units adjusted to capsules, bottles, tubes)
// ----------------------------------------------------

const mockCustomers = [
    { customer_id: 12, full_name: "natcha", contact: "0894767632" },
    { customer_id: 1, full_name: "John Doe", contact: "0991234567" },
    { customer_id: 2, full_name: "Jane Smith", contact: "0819876543" },
];

const mockDoctors = [
    { doctor_id: 101, doctor_full_name: "Dr. Somchai Klinhom", license_no: "L10001" },
    { doctor_id: 102, doctor_full_name: "Dr. Penpak Suksawat", license_no: "L10002" },
    { doctor_id: 103, doctor_full_name: "Dr. Amara Rujirat", license_no: "L10003" },
];

// Mock Medicines: quantity คือ stock ปัจจุบัน
const mockMedicines = [
    // เปลี่ยน tablets เป็น capsules
    { medicine_id: 1, medicine_name: "Amoxicillin 500mg", price: 120.00, quantity: 60, unit: "capsules", dosage: "-" },
    { medicine_id: 2, medicine_name: "Antacid Liquid", price: 120.00, quantity: 47, unit: "bottles", dosage: "2" },
    // เปลี่ยน tablets เป็น capsules
    { medicine_id: 3, medicine_name: "Aspirin 81mg", price: 20.00, quantity: 300, unit: "capsules", dosage: "-" },
    // เปลี่ยน tablets เป็น capsules
    { medicine_id: 4, medicine_name: "Atorvastatin 20mg", price: 95.00, quantity: 100, unit: "capsules", dosage: "-" },
    // boxes ถูก normalize เป็น capsules อยู่แล้ว
    { medicine_id: 5, medicine_name: "Paracetamol 500mg", price: 15.50, quantity: 500, unit: "boxes", dosage: "-" }, 
];

// Prescriptions must reference existing medicine_id and customer_id
const mockPrescriptions = [
    {
        prescription_id: 9,
        customer_id: 12,
        doctor_id: 101,
        issue_date: "2025-12-05", 
        items: [
            { medicine_id: 2, medicine_name: "Antacid Liquid", unit: "bottles", dosage: "2", quantity: 2, price: 120.00, stock: 47, prescription_item_id: 901 },
            // เปลี่ยน tablets เป็น capsules
            { medicine_id: 3, medicine_name: "Aspirin 81mg", unit: "capsules", dosage: "1", quantity: 10, price: 20.00, stock: 300, prescription_item_id: 902 },
        ],
    },
    {
        prescription_id: 8,
        customer_id: 12,
        doctor_id: 102,
        issue_date: "2025-05-10",
        items: [
            // เปลี่ยน tablets เป็น capsules
            { medicine_id: 4, medicine_name: "Atorvastatin 20mg", unit: "capsules", dosage: "1", quantity: 30, price: 95.00, stock: 100, prescription_item_id: 801 },
        ],
    },
    {
        prescription_id: 7,
        customer_id: 1,
        doctor_id: 101,
        issue_date: "2025-04-01",
        items: [
            { medicine_id: 5, medicine_name: "Paracetamol 500mg", unit: "boxes", dosage: "1", quantity: 1, price: 15.50, stock: 500, prescription_item_id: 701 },
        ],
    },
];

// Mock Sales History - Initial Data (Unchanged)
let mockSalesHistory = [
    {
        sale_id: 1003,
        customer_id: 12,
        total_price: 240.00,
        sale_datetime: "2025-05-12T14:19:09",
        items: [
            { medicine_id: 2, medicine_name: "Antacid Liquid", quantity: 2, dosage: "2" },
        ]
    },
    {
        sale_id: 1002,
        customer_id: 12,
        total_price: 480.00,
        sale_datetime: "2025-05-12T13:19:23",
        items: [
            { medicine_id: 2, medicine_name: "Antacid Liquid", quantity: 4, dosage: "2" },
        ]
    },
    {
        sale_id: 1001,
        customer_id: 1,
        total_price: 775.00,
        sale_datetime: "2024-11-28T19:10:03", 
        items: [
            { medicine_id: 1, medicine_name: "Amoxicillin 500mg", quantity: 20, dosage: "-" },
            { medicine_id: 3, medicine_name: "Aspirin 81mg", quantity: 1, dosage: "-" },
        ]
    },
];


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

const submitSaleBtn = document.getElementById("submitSaleBtn");
const salesHistoryTbody = document.getElementById("salesHistory");

// Latest prescription of selected customer
const latestPrescriptionBox = document.getElementById("latestPrescriptionBox");
const latestPrescriptionMeta = document.getElementById("latestPrescriptionMeta");
const latestPrescriptionTag = document.getElementById("latestPrescriptionTag");
const latestPrescriptionItemsBody = document.getElementById(
  "latestPrescriptionItemsBody"
);

let allMedicines = [];
let allCustomers = [];
let allDoctors = [];

let latestPrescription = null; 
let latestPrescriptionItems = []; 

let billItems = [];
let selectedCustomer = null; 
let selectedDoctor = null; 

// Flatpickr instance
let datePickerInstance = null;

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
    const med = allMedicines.find((m) => m.medicine_id === id);
    return med ? med.quantity : 0; 
}


// ----------------------------------------------------
// 4. MOCK DATA FETCH FUNCTIONS (Unchanged)
// ----------------------------------------------------

async function fetchMedicines() {
    allMedicines = mockMedicines;
}

async function fetchCustomers() {
    allCustomers = mockCustomers;
}

async function fetchDoctors() {
    allDoctors = mockDoctors;
}

async function fetchSales() {
    const sales = mockSalesHistory;

    if (sales.length === 0) {
      salesHistoryTbody.innerHTML =
        `<tr><td colspan="6" class="py-1 text-gray-400 text-center">No sales yet.</td></tr>`;
      return;
    }

    salesHistoryTbody.innerHTML = sales
      .sort((a, b) => new Date(b.sale_datetime) - new Date(a.sale_datetime))
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
}

// ----------------------------------------------------
// 5. SEARCH RESULTS & BILL (Unchanged from previous logic)
// ----------------------------------------------------

function renderSearchResults(keyword) {
  // Table removed - no longer rendering search results
}

function renderBill() {
  if (billItems.length === 0) {
    // Colspan is 7 (Name, Dosage, Price, Qty, Unit, Total, X)
    billItemsTbody.innerHTML =
      `<tr><td colspan="7" class="py-1 text-gray-400 text-center">No items in bill.</td></tr>`; 
    grandTotalEl.textContent = "0.00";
    updateSelectedSummary();
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
        <td class="py-1 text-center">
          <input
            type="number"
            min="0"
            value="${item.quantity || 0}"
            data-idx="${idx}"
            class="w-16 border rounded px-1 py-0.5 text-center text-sm qty-input"
            placeholder="0"
          />
        </td>
        <td class="py-1 text-center">${displayUnit}</td>
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
    `;
      }
    )
    .join("");

  const total = billItems.reduce((sum, it) => sum + it.lineTotal, 0);
  grandTotalEl.textContent = total.toFixed(2);
  updateSelectedSummary();
}

function addToBill(med) {
  const id = med.medicine_id;
  const name = med.medicine_name || med.name || "";
  const unit = med.unit || "";
  const dosage = med.dosage || "";
  const price = typeof med.price === "number" ? med.price : med.priceUnit || 0;

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
    billItems.push({
      medicineId: id,
      name,
      price,
      quantity: requestedQty,
      unit, 
      dosage,
      lineTotal: requestedQty * price,
      fromPrescription: !!med.prescription_id,
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
  const price = typeof med.price === "number" ? med.price : med.priceUnit || 0;

  // Check if item already exists in bill
  const existing = billItems.find((it) => it.medicineId === id);
  if (existing) {
    // If already exists, don't add or increase - just return
    return;
  }

  // Use quantity from prescription, or default to 1
  const requestedQty = (med.quantity && med.quantity > 0) ? med.quantity : 1;
  const stock = getStockFor(id);

  if (requestedQty > stock) {
    alert(`Cannot add item: Not enough stock for ${name}. Available = ${stock}, Requested = ${requestedQty}`);
    return;
  }

  // Add new item to bill
  billItems.push({
    medicineId: id,
    name,
    price,
    quantity: requestedQty,
    unit, 
    dosage,
    lineTotal: requestedQty * price,
    fromPrescription: true,
  });
  
  renderBill();
}

function removeFromBillById(id) {
  const idx = billItems.findIndex((it) => it.medicineId === id);
  if (idx !== -1) {
    billItems.splice(idx, 1);
    renderBill();
  }
}

// ----------------------------------------------------
// 6. CUSTOMER & PRESCRIPTION LOGIC (Updated with dropdown)
// ----------------------------------------------------

function handleCustomerSearch() {
  const searchTerm = customerSearchInput.value.trim();

  selectedCustomer = null;
  selectedCustomerInfo.textContent = "No customer selected.";
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

  const onlyDigits = (s) => (s || "").replace(/\D/g, "");
  const qDigits = onlyDigits(searchTerm);
  const q = searchTerm.toLowerCase();

  const filtered = allCustomers.filter((c) => {
    const idStr = String(c.customer_id || "").toLowerCase();
    const nameStr = (c.full_name || "").toLowerCase();
    const contactStr = (c.contact || "").toLowerCase();
    const contactDigits = onlyDigits(c.contact);

    return (
      idStr === q ||
      idStr.includes(q) ||
      nameStr.includes(q) ||
      contactStr.includes(q) ||
      (qDigits && contactDigits && contactDigits.includes(qDigits))
    );
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
      selectedCustomerInfo.textContent = `Selected: [${id}] ${name}` + (contact ? ` (${contact})` : "");
      customerErrorEl.classList.add("hidden");

      customerDropdown.classList.add('hidden');
      
      // Check if all three fields are filled and search automatically
      checkAndSearchPrescription();
    };
  });
}

// Keep findCustomer for backward compatibility (if needed)
function findCustomer() {
  handleCustomerSearch();
}

function loadAllPrescriptionsForCustomer(customerId) {
  
  const customerPrescriptions = mockPrescriptions.filter(p => p.customer_id === customerId);
  
  latestPrescription = null; 
  latestPrescriptionItems = [];
  latestPrescriptionBox.classList.add("hidden");

  if (customerPrescriptions.length === 0) {
    return;
  }

  const sortedPrescriptions = customerPrescriptions.sort((a, b) => new Date(b.issue_date) - new Date(a.issue_date));
  
  const latest = sortedPrescriptions[0];
  
  if (latest) {
    latestPrescription = latest;
    latestPrescriptionItems = latest.items.map(item => {
        const fullMed = allMedicines.find(m => m.medicine_id === item.medicine_id);
        const stock = fullMed ? fullMed.quantity : 0;
        return {
            ...item,
            stock: stock, 
            unit: item.unit, 
            prescription_item_id: item.prescription_item_id || Math.random() 
        };
    });

    const doctor = allDoctors.find(d => d.doctor_id === latest.doctor_id);
    const doctorName = doctor ? doctor.doctor_full_name : 'Unknown Doctor';
    const issueDate = new Date(latest.issue_date).toLocaleDateString();
    
    latestPrescriptionMeta.textContent = `Prescription #${latest.prescription_id} • Dr. ${doctorName} • Issue Date: ${issueDate}`;
    latestPrescriptionTag.textContent = "Latest"; 
    latestPrescriptionTag.className = "text-[10px] px-2 py-1 rounded-full bg-pink-100 text-pink-700";
    latestPrescriptionBox.classList.remove("hidden");

    latestPrescriptionItemsBody.innerHTML = latestPrescriptionItems.map((item, index) => {
      const displayUnit = normalizeUnit(item.unit);
      
      return `
        <tr>
          <td class="py-1 px-2 text-left">${item.medicine_name}</td>
          <td class="py-1 px-2 text-left">${item.dosage || '-'}</td>
          <td class="py-1 px-2 text-center">${item.quantity} ${displayUnit}</td>
          <td class="py-1 px-2 text-center"><button class="text-[10px] px-2 py-1 rounded-lg bg-pink-500 text-white hover:bg-pink-600" data-add-prescription-idx="${item.prescription_item_id}">Add</button></td>
        </tr>
      `;
    }).join("");
  }
}

function searchPrescriptionsByFilters() {
    
    // 1. Validation check
    const customerId = selectedCustomer ? selectedCustomer.customer_id : null;
    const doctorId = selectedDoctor ? selectedDoctor.doctor_id : null;
    const issueDate = issueDateInput.value.trim(); // YYYY-MM-DD (C.S.)

    if (!customerId || !doctorId || !issueDate) {
        return; // Return silently if not all fields are filled
    }

    // 2. Reset
    latestPrescription = null;
    latestPrescriptionItems = [];
    latestPrescriptionBox.classList.add("hidden");
    billItems = [];
    renderBill();

    // 3. Search mock data for an exact match
    const matchingPrescription = mockPrescriptions.find(p => 
        p.customer_id === customerId && 
        p.doctor_id === doctorId && 
        p.issue_date === issueDate // YYYY-MM-DD match (C.S.)
    );

    if (!matchingPrescription) {
        // Silently return if no prescription found (no alert)
        return;
    }

    // 4. Render the matching prescription
    latestPrescription = matchingPrescription;
    latestPrescriptionItems = matchingPrescription.items.map(item => {
        const fullMed = allMedicines.find(m => m.medicine_id === item.medicine_id);
        const stock = fullMed ? fullMed.quantity : 0;
        return {
            ...item,
            stock: stock,
            unit: item.unit, 
            prescription_item_id: item.prescription_item_id || Math.random() 
        };
    });
    
    const doctor = allDoctors.find(d => d.doctor_id === latestPrescription.doctor_id);
    const doctorName = doctor ? doctor.doctor_full_name : 'Unknown Doctor';
    const issueDateDisplay = new Date(latestPrescription.issue_date).toLocaleDateString();
    
    latestPrescriptionMeta.textContent = `Prescription #${latestPrescription.prescription_id} • Dr. ${doctorName} • Issue Date: ${issueDateDisplay}`;
    latestPrescriptionTag.textContent = "MATCHED"; 
    latestPrescriptionTag.className = "text-[10px] px-2 py-1 rounded-full bg-green-100 text-green-700";
    latestPrescriptionBox.classList.remove("hidden");

    latestPrescriptionItemsBody.innerHTML = latestPrescriptionItems.map((item) => {
        const displayUnit = normalizeUnit(item.unit);
        return `
          <tr>
            <td class="py-1 px-2 text-left">${item.medicine_name}</td>
            <td class="py-1 px-2 text-left">${item.dosage || '-'}</td>
            <td class="py-1 px-2 text-center">${item.quantity} ${displayUnit}</td>
            <td class="py-1 px-2 text-center"><button class="text-[10px] px-2 py-1 rounded-lg bg-pink-500 text-white hover:bg-pink-600" data-add-prescription-idx="${item.prescription_item_id}">Add</button></td>
          </tr>
        `;
    }).join("");
}

// ----------------------------------------------------
// 7. DOCTOR LOGIC (Unchanged)
// ----------------------------------------------------

function handleDoctorSearch() {
  const searchTerm = doctorSearchInput.value.trim();

  selectedDoctor = null;
  doctorIdHiddenInput.value = '';
  selectedDoctorInfo.textContent = "No doctor selected.";
  doctorLicenseEl.textContent = "";

  if (searchTerm.length === 0) {
    doctorDropdown.classList.add('hidden');
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

      selectedDoctorInfo.textContent = `Selected: [${id}] ${name} (${license})`;

      doctorDropdown.classList.add('hidden');
      
      // Check if all three fields are filled and search automatically
      checkAndSearchPrescription();
    };
  });
}

// ----------------------------------------------------
// 8. STOCK UPDATE FUNCTION (Unchanged)
// ----------------------------------------------------

function updateMockStock(soldItems) {
    soldItems.forEach(soldItem => {
        const med = mockMedicines.find(m => m.medicine_id === soldItem.medicineId);
        if (med) {
            med.quantity = Math.max(0, med.quantity - soldItem.quantity);
        }
    });
}


// ----------------------------------------------------
// 9. SUBMIT SALE (MOCK Update) (Unchanged)
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
  
  if (!selectedDoctor) {
    doctorErrorEl.classList.remove("hidden");
    doctorSearchInput.focus();
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

  // MOCK: Prepare data for new sale
  const newSale = {
    sale_id: mockSalesHistory.length + 1004,
    customer_id: selectedCustomer.customer_id,
    total_price: billItems.reduce((sum, item) => sum + item.lineTotal, 0),
    sale_datetime: new Date().toISOString(),
    items: billItems.map(item => ({
        medicine_id: item.medicineId,
        medicine_name: item.name,
        quantity: item.quantity,
        dosage: item.dosage,
    }))
  };

  // MOCK: Update Stock BEFORE clearing bill items
  updateMockStock(billItems);

  // MOCK: Add to history
  mockSalesHistory.push(newSale);
  
  alert("Sale created successfully! (MOCK)");

  // Clear form
  billItems = [];
  selectedCustomer = null;
  customerSearchInput.value = "";
  selectedCustomerInfo.textContent = "No customer selected.";
  customerErrorEl.classList.add("hidden");
  
  selectedDoctor = null;
  doctorSearchInput.value = "";
  doctorIdHiddenInput.value = "";
  selectedDoctorInfo.textContent = "No doctor selected.";
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

  renderBill();
  await fetchSales(); // Re-fetch sales history (MOCK) to update Recent Sales box
}

// ----------------------------------------------------
// 10. EVENT LISTENERS (Unchanged)
// ----------------------------------------------------
// Search input removed - table no longer exists

// Add item from Latest Prescription (only add, don't increase quantity)
latestPrescriptionItemsBody.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-add-prescription-idx]");
  if (!btn) return;
  
  const identifier = btn.getAttribute("data-add-prescription-idx");
  const item = latestPrescriptionItems.find(i => String(i.prescription_item_id) === identifier);

  if (item) {
    addToBillFromPrescription(item);
  }
});

// Change quantity in bill (Stock Check Implemented Here)
// Allow free typing, validate on blur or Enter
billItemsTbody.addEventListener("input", (e) => {
  if (!e.target.classList.contains("qty-input")) return;
  // Allow free typing - don't validate during input
});

billItemsTbody.addEventListener("blur", (e) => {
  if (!e.target.classList.contains("qty-input")) return;
  
  const idx = Number(e.target.dataset.idx);
  if (idx < 0 || idx >= billItems.length) return;

  let raw = e.target.value.trim();
  
  // If empty, set to 0
  if (raw === "" || raw === null || raw === undefined) {
    const item = billItems[idx];
    item.quantity = 0;
    item.lineTotal = 0;
    // Force update the input value immediately to show 0
    e.target.value = "0";
    // Update totals without re-rendering the whole table
    const total = billItems.reduce((sum, it) => sum + it.lineTotal, 0);
    grandTotalEl.textContent = total.toFixed(2);
    updateSelectedSummary();
    return;
  }

  let val = Number(raw);
  if (isNaN(val) || val < 0) {
    val = 0;
    e.target.value = "0";
  }

  const item = billItems[idx];
  const stock = getStockFor(item.medicineId); 

  if (val > stock) {
    alert(`Cannot set quantity: Not enough stock for ${item.name}. Max = ${stock}`);
    val = stock;
  }

  item.quantity = val;
  item.lineTotal = item.quantity * item.price;
  e.target.value = val.toString();

  // Update totals without re-rendering the whole table
  const total = billItems.reduce((sum, it) => sum + it.lineTotal, 0);
  grandTotalEl.textContent = total.toFixed(2);
  updateSelectedSummary();
});

billItemsTbody.addEventListener("keydown", (e) => {
  if (!e.target.classList.contains("qty-input")) return;
  
  // Validate on Enter key
  if (e.key === "Enter") {
    e.preventDefault();
    e.target.blur(); // Trigger blur event which will validate
  }
});

// Remove item from bill
billItemsTbody.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-remove]");
  if (!btn) return;
  const idx = Number(btn.getAttribute("data-remove"));
  billItems.splice(idx, 1);
  renderBill();
});

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

// Confirm Sale button
submitSaleBtn.addEventListener("click", submitSale);

// ----------------------------------------------------
// 10.5. AUTO-SEARCH PRESCRIPTION WHEN ALL FIELDS ARE FILLED
// ----------------------------------------------------
function checkAndSearchPrescription() {
  const customerId = selectedCustomer ? selectedCustomer.customer_id : null;
  const doctorId = selectedDoctor ? selectedDoctor.doctor_id : null;
  const issueDate = issueDateInput.value.trim();
  
  // If all three fields are filled, search automatically
  if (customerId && doctorId && issueDate) {
    searchPrescriptionsByFilters();
  }
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
      onChange: function(selectedDates, dateStr, instance) {
        // When date is selected, check if all fields are filled and search
        checkAndSearchPrescription();
      }
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
    selectedCustomerInfo.textContent = "No customer selected.";
    latestPrescriptionBox.classList.add("hidden");

  } catch (err) {
    console.error(err);
    alert("Failed to init sales page: " + err.message);
  }
})();
