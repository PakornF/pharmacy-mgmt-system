// API Base URL
const API_BASE = (window.API_BASE || "http://localhost:8000");
const MEDICINE_API_BASE = `${API_BASE}/medicines`;
const SUPPLIER_API_BASE = `${API_BASE}/suppliers`;

// State
let allMedicines = [];
let filteredMedicines = [];
let allSuppliers = [];

let currentFilter = "all";
let currentDeleteId = null;

// DOM Elements
const medicineList = document.getElementById("medicineList");
const searchInput = document.getElementById("searchInput");
const filterButtons = document.querySelectorAll(".filter-btn");
const typeFilter = document.getElementById("typeFilter");
const loadingIndicator = document.getElementById("loadingIndicator");
const emptyState = document.getElementById("emptyState");

// Modal Elements
const medicineModal = document.getElementById("medicineModal");
const deleteModal = document.getElementById("deleteModal");
const medicineForm = document.getElementById("medicineForm");
const addMedicineBtn = document.getElementById("addMedicineBtn");
const closeModal = document.getElementById("closeModal");
const cancelDelete = document.getElementById("cancelDelete");

// Supplier search elements
const supplierInput = document.getElementById("supplierInput");
const supplierIdHidden = document.getElementById("supplier_id");
const supplierDropdown = document.getElementById("supplier_dropdown");
const supplierError = document.getElementById("supplierError");

// ----------------------------------------------------
// INIT
// ----------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  init();
  setupEventListeners();
});

async function init() {
  showLoading(true);
  try {
    await loadSuppliers();
    await loadMedicines();
  } catch (err) {
    console.error(err);
    alert("Failed to init medicine page: " + err.message);
  } finally {
    showLoading(false);
  }
}

// Helpers
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function showLoading(show) {
  if (show) {
    loadingIndicator.classList.remove("hidden");
    medicineList.classList.add("hidden");
  } else {
    loadingIndicator.classList.add("hidden");
    medicineList.classList.remove("hidden");
  }
}

function showError(message) {
  alert(message);
}

function showSuccess(message) {
  console.log(message);
}

// generate MED ID: MED001, MED002, ...
function generateNextMedicineId() {
  if (!allMedicines || allMedicines.length === 0) {
    return "MED001";
  }

  // sort หาเลขสูงสุดตอนนี้
  const sorted = [...allMedicines].sort((a, b) => {
    // 💥 FIX: ใช้ String(a.medicine_id).replace(/\D/g, "") เพื่อดึงเฉพาะตัวเลข 💥
    const aNum = parseInt(String(a.medicine_id).replace(/\D/g, "")) || 0;
    const bNum = parseInt(String(b.medicine_id).replace(/\D/g, "")) || 0;
    return aNum - bNum;
  });

  const last = sorted[sorted.length - 1];
  // 💥 FIX: ใช้ String(last.medicine_id).replace(/\D/g, "") 💥
  const lastNum = parseInt(String(last.medicine_id).replace(/\D/g, "")) || 0;
  const nextNum = lastNum + 1;

  // เปลี่ยนจาก "MED-001" → "MED001"
  return "MED" + String(nextNum).padStart(3, "0");
}

// Load data
async function loadSuppliers() {
  try {
    const res = await fetch(SUPPLIER_API_BASE);
    if (!res.ok) throw new Error("Failed to fetch suppliers");
    allSuppliers = await res.json();
  } catch (err) {
    console.error("Error loading suppliers:", err);
    allSuppliers = [];
  }
}

async function loadMedicines() {
  try {
    const response = await fetch(MEDICINE_API_BASE);
    if (!response.ok) throw new Error("Failed to fetch medicines");

    allMedicines = await response.json();
    populateTypeFilter();
    applyFilters();
  } catch (error) {
    console.error("Error loading medicines:", error);
    showError("Failed to load medicines: " + error.message);
  }
}

// Filters / Search
function populateTypeFilter() {
  const types = [...new Set(allMedicines.map((m) => m.type))].sort();
  typeFilter.innerHTML = '<option value="">All Types</option>';
  types.forEach((type) => {
    if (!type) return;
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type;
    typeFilter.appendChild(option);
  });
}

function handleSearch() {
  applyFilters();
}

function applyFilters() {
  let filtered = [...allMedicines];

  // Search filter
  const searchTerm = searchInput.value.toLowerCase().trim();
  if (searchTerm) {
    filtered = filtered.filter((med) => {
      const name = (med.name || "").toLowerCase();
      const type = (med.type || "").toLowerCase();
      const brand = (med.brand || "").toLowerCase();
      const mid = (med.medicine_id || "").toLowerCase();
      return (
        name.includes(searchTerm) ||
        type.includes(searchTerm) ||
        brand.includes(searchTerm) ||
        mid.includes(searchTerm)
      );
    });
  }

  // Stock filter
  if (currentFilter === "low-stock") {
    filtered = filtered.filter((med) => med.quantity > 0 && med.quantity <= 10);
  } else if (currentFilter === "out-of-stock") {
    filtered = filtered.filter((med) => med.quantity === 0);
  }

  // Type filter
  const selectedType = typeFilter.value;
  if (selectedType) {
    filtered = filtered.filter((med) => med.type === selectedType);
  }

  filteredMedicines = filtered;
  renderMedicines();
}

// Rendering cards
function renderMedicines() {
  if (filteredMedicines.length === 0) {
    medicineList.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  medicineList.innerHTML = filteredMedicines
    .map((med) => createMedicineCard(med))
    .join("");

  attachCardEventListeners();
}

function createMedicineCard(med) {
  const isLowStock = med.quantity > 0 && med.quantity <= 10;
  const isOutOfStock = med.quantity === 0;
  const stockClass = isOutOfStock
    ? "low-stock"
    : isLowStock
    ? "low-stock"
    : "";

  const supplier = allSuppliers.find(
    (s) => Number(s.supplier_id) === Number(med.supplier_id)
  );
  const supplierLabel = supplier
    ? `${supplier.supplier_name} (ID: ${supplier.supplier_id})`
    : med.supplier_id ?? "-";

  return `
    <div class="medicine-card ${stockClass} rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
      <div class="flex justify-between items-start mb-4">
        <div>
          <h3 class="text-xl font-bold mb-1" style="color: #ad1457;">${escapeHtml(
            med.name
          )}</h3>
          <p class="text-sm text-gray-600">${escapeHtml(
            med.medicine_id || ""
          )}</p>
        </div>
        ${
          isOutOfStock
            ? '<span class="px-3 py-1 rounded-full text-xs font-bold text-white" style="background-color: #ad1457;">Out of Stock</span>'
            : isLowStock
            ? '<span class="px-3 py-1 rounded-full text-xs font-bold text-white" style="background-color: #f06292;">Low Stock</span>'
            : ""
        }
      </div>

      <div class="space-y-2 mb-4">
        <div class="flex justify-between">
          <span class="text-gray-600">Brand:</span>
          <span class="font-medium" style="color: #ad1457;">${escapeHtml(
            med.brand
          )}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">Type:</span>
          <span class="font-medium" style="color: #ad1457;">${escapeHtml(
            med.type
          )}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">Price:</span>
          <span class="font-medium" style="color: #ad1457;">${med.price.toFixed(
            2
          )} THB</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">Cost:</span>
          <span class="font-medium" style="color: #ad1457;">${med.cost ? med.cost.toFixed(2) : '-'} ${med.cost ? 'THB' : ''}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">Quantity:</span>
          <span class="font-bold text-lg" style="color: #f06292;">${
            med.quantity
          }</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">Supplier:</span>
          <span class="font-medium" style="color: #ad1457;">${escapeHtml(
            String(supplierLabel)
          )}</span>
        </div>
      </div>

      <div class="flex flex-wrap gap-2 mt-4">
        <button 
          class="edit-btn flex-1 px-4 py-2 rounded-lg text-sm font-semibold btn-secondary"
          data-id="${med._id}"
        >
          Edit
        </button>
        <button 
          class="delete-btn px-4 py-2 rounded-lg text-sm font-semibold btn-danger"
          data-id="${med._id}"
          data-name="${escapeHtml(med.name)}"
        >
          Delete
        </button>
      </div>
    </div>
  `;
}

// Card button events
function attachCardEventListeners() {
  // Edit
  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const medicine = allMedicines.find((m) => m._id === id);
      if (medicine) openMedicineModal(medicine);
    });
  });

  // Delete
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentDeleteId = btn.dataset.id;
      document.getElementById("deleteMedicineName").textContent =
        btn.dataset.name;
      deleteModal.classList.remove("hidden");
    });
  });
}

// Supplier search dropdown (เหมือน customer dropdown)
function handleSupplierSearch() {
  const searchTerm = supplierInput.value.trim();

  // reset hidden when พิมพ์ใหม่
  supplierIdHidden.value = "";
  supplierError.classList.add("hidden");

  if (!searchTerm) {
    supplierDropdown.classList.add("hidden");
    return;
  }

  const q = searchTerm.toLowerCase();
  const onlyDigits = (s) => (s || "").replace(/\D/g, "");
  const qDigits = onlyDigits(searchTerm);

  const filtered = allSuppliers.filter((s) => {
    const name = (s.supplier_name || "").toLowerCase();
    const idStr = String(s.supplier_id || "").toLowerCase();
    const phone = (s.phone || "").toLowerCase();
    const phoneDigits = onlyDigits(s.phone || "");

    return (
      name.includes(q) ||
      idStr.includes(q) ||
      phone.includes(q) ||
      (qDigits && phoneDigits && phoneDigits.includes(qDigits))
    );
  });

  if (filtered.length === 0) {
    supplierDropdown.innerHTML =
      '<div class="p-3 text-gray-500 text-sm">No suppliers found</div>';
    supplierDropdown.classList.remove("hidden");
    return;
  }

  supplierDropdown.innerHTML = filtered
    .map(
      (s) => `
    <div 
      class="supplier-option px-4 py-2 hover:bg-pink-50 cursor-pointer border-b"
      style="border-color:#f8bbd0;"
      data-id="${s.supplier_id}"
      data-name="${escapeHtml(s.supplier_name || "")}"
      data-phone="${escapeHtml(s.phone || "")}"
    >
      <div class="font-medium" style="color:#ad1457;">${escapeHtml(
        s.supplier_name || ""
      )}</div>
      <div class="text-xs text-gray-600">
        ID: ${s.supplier_id} | Phone: ${escapeHtml(s.phone || "-")}
      </div>
    </div>
  `
    )
    .join("");

  supplierDropdown.classList.remove("hidden");

  supplierDropdown.querySelectorAll(".supplier-option").forEach((opt) => {
    opt.onclick = () => {
      const id = opt.dataset.id;
      const name = opt.dataset.name;

      supplierInput.value = name;
      supplierIdHidden.value = id;
      supplierDropdown.classList.add("hidden");
      supplierError.classList.add("hidden");
    };
  });
}

// Modal open/close
async function openMedicineModal(medicine = null) {
  const modalTitle = document.getElementById("modalTitle");
  const form = medicineForm;
  const medIdInput = document.getElementById("medicine_id");
  const typeSelect = document.getElementById("type");

  // โหลด suppliers สดทุกครั้งที่เปิด modal เผื่อมีการเพิ่ม supplier ใหม่หน้าอื่น
  loadSuppliers().catch((err) =>
    console.error("Failed to refresh suppliers:", err)
  );

  if (medicine) {
    // EDIT MODE
    modalTitle.textContent = "Edit Medicine";
    document.getElementById("medicineMongoId").value = medicine._id;

    // Medicine ID: show & read-only
    medIdInput.value = medicine.medicine_id;
    medIdInput.readOnly = true;

    document.getElementById("name").value = medicine.name;
    document.getElementById("brand").value = medicine.brand;
    typeSelect.value = medicine.type || "";

    document.getElementById("price").value = medicine.price;
    document.getElementById("cost").value = medicine.cost || "";
    document.getElementById("quantity").value = medicine.quantity;

    // Supplier: show name, read-only, cannot change
    const supplier = allSuppliers.find(
      (s) => Number(s.supplier_id) === Number(medicine.supplier_id)
    );
    if (supplier) {
      supplierInput.value = supplier.supplier_name;
      supplierIdHidden.value = supplier.supplier_id;
    } else {
      supplierInput.value =
        medicine.supplier_id != null ? `ID: ${medicine.supplier_id}` : "";
      supplierIdHidden.value = medicine.supplier_id ?? "";
    }
    supplierInput.readOnly = true;
    supplierDropdown.classList.add("hidden");
    supplierError.classList.add("hidden");
  } else {
    // ADD MODE
    modalTitle.textContent = "Add New Medicine";
    form.reset();
    document.getElementById("medicineMongoId").value = "";

    // auto MEDxxx + read-only
    medIdInput.value = generateNextMedicineId();
    medIdInput.readOnly = true;

    typeSelect.value = "";
    supplierInput.readOnly = false;
    supplierInput.value = "";
    supplierIdHidden.value = "";
    supplierDropdown.classList.add("hidden");
    supplierError.classList.add("hidden");
  }

  medicineModal.classList.remove("hidden");
}

function closeMedicineModal() {
  medicineModal.classList.add("hidden");
  medicineForm.reset();
  supplierDropdown.classList.add("hidden");
  supplierError.classList.add("hidden");
}

// Delete modal
function closeDeleteModal() {
  deleteModal.classList.add("hidden");
  currentDeleteId = null;
}

// Form submit (add / edit)
async function handleFormSubmit(e) {
  e.preventDefault();

  const mongoId = document.getElementById("medicineMongoId").value;
  const medId = document.getElementById("medicine_id").value.trim();
  const typeVal = document.getElementById("type").value;
  let supplierIdVal = supplierIdHidden.value;
  const supplierText = supplierInput.value.trim();

  // ถ้า hidden ยังว่าง ให้ลอง match จาก text ที่พิมพ์เทียบกับ allSuppliers
  if (!supplierIdVal && supplierText) {
    const lower = supplierText.toLowerCase();
    const match = allSuppliers.find(
      (s) =>
        (s.supplier_name || "").toLowerCase() === lower ||
        String(s.supplier_id) === supplierText
    );
    if (match) {
      supplierIdVal = String(match.supplier_id);
      supplierIdHidden.value = supplierIdVal;
    }
  }

  if (!supplierIdVal) {
    supplierError.classList.remove("hidden");
    supplierInput.focus();
    return;
  }

  const parsedSupplierId = Number(supplierIdVal);
  if (Number.isNaN(parsedSupplierId)) {
    supplierError.classList.remove("hidden");
    supplierInput.focus();
    return;
  }

  const costValue = document.getElementById("cost").value.trim();
  const medicineData = {
    medicine_id: medId,
    name: document.getElementById("name").value.trim(),
    brand: document.getElementById("brand").value.trim(),
    type: typeVal,
    price: parseFloat(document.getElementById("price").value),
    cost: costValue ? parseFloat(costValue) : undefined,
    quantity: parseInt(document.getElementById("quantity").value, 10),
    supplier_id: parsedSupplierId,
  };

  try {
    let response;
    if (mongoId) {
      // Update existing
      response = await fetch(`${MEDICINE_API_BASE}/${mongoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(medicineData),
      });
    } else {
      // Create new
      response = await fetch(MEDICINE_API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(medicineData),
      });
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Failed to save medicine");
    }

    closeMedicineModal();
    await loadMedicines();
    showSuccess(
      mongoId ? "Medicine updated successfully" : "Medicine added successfully"
    );
  } catch (error) {
    console.error("Error saving medicine:", error);
    alert("Error: " + error.message);
  }
}

// Delete
async function handleDelete() {
  if (!currentDeleteId) return;

  try {
    const response = await fetch(`${MEDICINE_API_BASE}/${currentDeleteId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Failed to delete medicine");
    }

    closeDeleteModal();
    await loadMedicines();
    showSuccess("Medicine deleted successfully");
  } catch (error) {
    console.error("Error deleting medicine:", error);
    alert("Error: " + error.message);
  }
}

// Event listeners setup
function setupEventListeners() {
  // Search
  searchInput.addEventListener("input", handleSearch);

  // Filter buttons
  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      currentFilter = btn.dataset.filter;
      filterButtons.forEach((b) => {
        if (b === btn) {
          b.style.backgroundColor = "#f06292";
          b.style.color = "white";
        } else {
          b.style.backgroundColor = "#f8bbd0";
          b.style.color = "#ad1457";
        }
      });
      applyFilters();
    });
  });

  // Type filter
  typeFilter.addEventListener("change", applyFilters);

  // Modal buttons
  addMedicineBtn.addEventListener("click", () => openMedicineModal());
  closeModal.addEventListener("click", () => closeMedicineModal());
  cancelDelete.addEventListener("click", () => closeDeleteModal());

  // Form submission
  medicineForm.addEventListener("submit", handleFormSubmit);

  // Delete confirmation
  document
    .getElementById("confirmDelete")
    .addEventListener("click", handleDelete);

  // Close modals on outside click
  medicineModal.addEventListener("click", (e) => {
    if (e.target === medicineModal) closeMedicineModal();
  });
  deleteModal.addEventListener("click", (e) => {
    if (e.target === deleteModal) closeDeleteModal();
  });

  // Supplier search
  if (supplierInput) {
    supplierInput.addEventListener("input", handleSupplierSearch);
    supplierInput.addEventListener("blur", () => {
      setTimeout(() => supplierDropdown.classList.add("hidden"), 200);
    });
  }
}