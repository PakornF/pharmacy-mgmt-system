let mockSuppliers = [
  {
    id: "SUP-001", // PK format
    name: "Health Pharma Co., Ltd.",
    contactName: "Somchai Wong",
    phone: "081-111-2222",
    email: "somchai@healthpharma.com",
    address: "Bangkok, Thailand",
    notes: "Main generic drug supplier",
  },
  {
    id: "SUP-002", // PK format
    name: "Premium Med Supply",
    contactName: "Ms. May",
    phone: "089-333-4444",
    email: "may@premiummed.com",
    address: "Chiang Mai, Thailand",
    notes: "Skin care products",
  },
];

// Mock Medicines: Unit มีแค่ capsules, bottles, tubes
let mockMedicines = [
  {
    id: "med1",
    name: "Paracetamol 500mg",
    brand: "Tylenol",
    price: 5,
    quantity: 100,
    unit: "capsules", 
    supplierId: "SUP-001",
  },
  {
    id: "med2",
    name: "Amoxicillin 250mg",
    brand: "Amoxi",
    price: 12,
    quantity: 50,
    unit: "capsules",
    supplierId: "SUP-001",
  },
  {
    id: "med3",
    name: "Cough Syrup",
    brand: "FluCare",
    price: 30,
    quantity: 30,
    unit: "bottles",
    supplierId: "SUP-002",
  },
];

const supplierSearchInput = document.getElementById("supplierSearchInput");
const supplierTableBody = document.getElementById("supplierTableBody");

// Form Modal Elements
const supplierFormModal = document.getElementById("supplierFormModal");
const formModalTitle = document.getElementById("formModalTitle");
const closeFormModalBtn = document.getElementById("closeFormModalBtn");
const cancelFormModalBtn = document.getElementById("cancelFormModalBtn");
const addSupplierBtn = document.getElementById("addSupplierBtn");

// Medicine List Modal Elements
const medicineListModal = document.getElementById("medicineListModal");
const medicineModalTitle = document.getElementById("medicineModalTitle");
const closeMedicineModalBtn = document.getElementById("closeMedicineModalBtn");
const closeMedicineModalBottomBtn = document.getElementById("closeMedicineModalBottomBtn");
const medicineModalSupplierInfo = document.getElementById("medicineModalSupplierInfo");
const supplierMedicinesBodyInModal = document.getElementById("supplierMedicinesBodyInModal");

// Form Inputs
const supplierForm = document.getElementById("supplierForm");
const supplierIdInput = document.getElementById("supplierIdInput");
const supplierNameInput = document.getElementById("supplierNameInput");
const contactNameInput = document.getElementById("contactNameInput");
const phoneInput = document.getElementById("phoneInput");
const emailInput = document.getElementById("emailInput");
const addressInput = document.getElementById("addressInput");
const notesInput = document.getElementById("notesInput");
const saveSupplierBtn = document.getElementById("saveSupplierBtn");

// Required Spans
const requiredSpans = ['nameRequired', 'contactRequired', 'phoneRequired', 'emailRequired', 'addressRequired'].map(id => document.getElementById(id));

let selectedSupplierId = null;

// Helper: format next Supplier ID
function generateNextSupplierId() {
  if (mockSuppliers.length === 0) return "SUP-001";
  const maxNum = mockSuppliers.reduce((max, s) => {
      const num = parseInt(s.id.split('-')[1]) || 0;
      return Math.max(max, num);
  }, 0);
  return "SUP-" + String(maxNum + 1).padStart(3, "0");
}

// Helper: Open Modal and set mode (Form Modal: Add/Edit)
function openFormModal(mode, supplier = null) {
  supplierFormModal.classList.remove("hidden");
  supplierFormModal.classList.add("flex");
  document.body.classList.add("overflow-hidden");
  
  clearForm(); // Clear form first

  if (mode === 'add') {
      formModalTitle.textContent = "Add New Supplier";
      supplierIdInput.value = generateNextSupplierId(); // Auto-generate new ID
      saveSupplierBtn.textContent = "Save Supplier";
  } else { // edit mode
      if (!supplier) return;
      fillForm(supplier);
      formModalTitle.textContent = "Edit Supplier: " + supplier.id;
      saveSupplierBtn.textContent = "Save Changes";
  }
  
  // **Supplier ID is always read-only/disabled for PK integrity** (Handled by HTML attributes)
  saveSupplierBtn.classList.remove('hidden');
  requiredSpans.forEach(span => {
      span.classList.remove('hidden');
  });
}

function closeFormModal() {
  supplierFormModal.classList.add("hidden");
  supplierFormModal.classList.remove("flex");
  document.body.classList.remove("overflow-hidden");
  clearForm();
}

// Helper: Open Modal (Medicine List Modal: View)
function openMedicineModal(supplier) {
  medicineListModal.classList.remove("hidden");
  medicineListModal.classList.add("flex");
  document.body.classList.add("overflow-hidden");

  medicineModalTitle.textContent = `Medicines from Supplier: ${supplier.name}`;
  
  // Set Supplier Info in Modal
  medicineModalSupplierInfo.innerHTML = `
      <p><span class="font-semibold">ID:</span> ${supplier.id}</p>
      <p><span class="font-semibold">Contact:</span> ${supplier.contactName} (${supplier.phone})</p>
      <p><span class="font-semibold">Email:</span> ${supplier.email}</p>
      <p><span class="font-semibold">Address:</span> ${supplier.address}</p>
  `;

  renderSupplierMedicinesInModal(supplier.id);
}

function closeMedicineModal() {
  medicineListModal.classList.add("hidden");
  medicineListModal.classList.remove("flex");
  document.body.classList.remove("overflow-hidden");
}


// render supplier list 
function renderSupplierList(keyword = "") {
  const q = keyword.toLowerCase();

  const filtered = mockSuppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      (s.contactName && s.contactName.toLowerCase().includes(q)) ||
      (s.id && s.id.toLowerCase().includes(q))
  );

  if (filtered.length === 0) {
    // Colspan adjusted for 5 columns (ID, Name, Contact, Phone, Actions)
    supplierTableBody.innerHTML =
      `<tr><td colspan="5" class="py-2 px-2 text-center text-gray-400 text-sm">No suppliers found.</td></tr>`;
    return;
  }

  supplierTableBody.innerHTML = filtered
    .map(
      (s) => `
      <tr class="hover:bg-pink-50">
        <td class="py-2 px-2 text-left w-1/5">${s.id}</td>
        <td class="py-2 px-2 text-left w-1/4">${s.name}</td>
        <td class="py-2 px-2 text-left w-1/4">${s.contactName || "-"}</td>
        <td class="py-2 px-2 text-left w-1/5">${s.phone || "-"}</td>
        <td class="py-2 px-2 text-right space-x-2 w-1/6">
          <button
            class="text-xs text-purple-600 hover:underline"
            data-view="${s.id}"
          >
            View
          </button>
          <button
            class="text-xs text-blue-600 hover:underline"
            data-edit="${s.id}"
          >
            Edit
          </button>
          <button
            class="text-xs text-red-600 hover:underline"
            data-delete="${s.id}"
          >
            Delete
          </button>
        </td>
      </tr>
    `
    )
    .join("");
}

// render medicines in Modal
function renderSupplierMedicinesInModal(supplierId) {
  const meds = mockMedicines.filter((m) => m.supplierId === supplierId);

  if (meds.length === 0) {
    supplierMedicinesBodyInModal.innerHTML =
      `<tr><td colspan="4" class="py-2 px-2 text-sm text-gray-400 text-center">No medicines from this supplier.</td></tr>`;
    return;
  }

  supplierMedicinesBodyInModal.innerHTML = meds
  .map(
    (m) => `
      <tr>
        <td class="py-2 px-2 text-left w-1/4">${m.name}</td>
        <td class="py-2 px-2 text-left w-1/4">${m.brand || "-"}</td>
        <td class="py-2 px-2 text-right w-1/4">
          ${m.price.toFixed(2)} / ${m.unit || "unit"}
        </td>
        <td class="py-2 px-2 text-right w-1/4">
          ${m.quantity} ${m.unit || ""}
        </td>
      </tr>
    `
  )
  .join("");
}

// form helpers 
function clearForm() {
  supplierIdInput.value = "";
  supplierNameInput.value = "";
  contactNameInput.value = "";
  phoneInput.value = "";
  emailInput.value = "";
  addressInput.value = "";
  notesInput.value = "";
}

function fillForm(s) {
  supplierIdInput.value = s.id; 
  supplierNameInput.value = s.name;
  contactNameInput.value = s.contactName || "";
  phoneInput.value = s.phone || "";
  emailInput.value = s.email || "";
  addressInput.value = s.address || "";
  notesInput.value = s.notes || "";
}

// event: search
supplierSearchInput.addEventListener("input", (e) => {
  renderSupplierList(e.target.value);
});

// event: table actions
supplierTableBody.addEventListener("click", (e) => {
  const viewBtn = e.target.closest("button[data-view]");
  const editBtn = e.target.closest("button[data-edit]");
  const deleteBtn = e.target.closest("button[data-delete]");
  
  if (!viewBtn && !editBtn && !deleteBtn) return;

  const id = (viewBtn || editBtn || deleteBtn).getAttribute("data-view") || 
             (viewBtn || editBtn || deleteBtn).getAttribute("data-edit") || 
             (viewBtn || editBtn || deleteBtn).getAttribute("data-delete");
  const s = mockSuppliers.find((sup) => sup.id === id);
  if (!s) return;
  
  // View action: Show Medicine List Modal
  if (viewBtn) {
    openMedicineModal(s); 
    return;
  }

  // Edit action: Show Edit Form Modal
  if (editBtn) {
    openFormModal('edit', s); 
    return;
  }

  // Delete action
  if (deleteBtn) {
    if (!confirm(`Delete supplier "${s.name}" (${s.id})?`)) return;

    mockSuppliers = mockSuppliers.filter((sup) => sup.id !== id);
    renderSupplierList(supplierSearchInput.value || "");
    return;
  }
});

// event: add supplier button
addSupplierBtn.addEventListener("click", () => {
  openFormModal('add');
});

// event: cancel modal (Form)
cancelFormModalBtn.addEventListener("click", closeFormModal);
closeFormModalBtn.addEventListener("click", closeFormModal);

// event: close medicine modal
closeMedicineModalBtn.addEventListener("click", closeMedicineModal);
closeMedicineModalBottomBtn.addEventListener("click", closeMedicineModal);


// event: submit form (Handles both Add and Edit)
supplierForm.addEventListener("submit", (e) => {
  e.preventDefault();

  // ID comes from the read-only input
  const id = supplierIdInput.value.trim() || null;
  const isAdding = mockSuppliers.findIndex(s => s.id === id) === -1; // Check if ID already exists

  // Since Supplier ID is always set (auto-generated or existing) we proceed:
  const name = supplierNameInput.value.trim();
  const contact = contactNameInput.value.trim();
  const phone = phoneInput.value.trim();
  const email = emailInput.value.trim();
  const address = addressInput.value.trim();
  const notes = notesInput.value.trim();

  // VALIDATION (simplified for mock)
  if (!name || !contact || !phone || !email || !address) {
      alert("Please fill in all required fields.");
      return;
  }

  const payload = {
      name,
      contactName: contact,
      phone,
      email,
      address,
      notes,
  };

  if (isAdding) { // Add Mode
      if (!id || !id.startsWith('SUP-')) {
           alert("Error: Supplier ID is invalid."); // Should not happen with auto-gen
           return;
      }
      mockSuppliers.push({ id: id, ...payload });
      alert(`Supplier ${id} added.`);
  } else { // Edit Mode
      const idx = mockSuppliers.findIndex((s) => s.id === id);
      if (idx !== -1) {
          mockSuppliers[idx] = { ...mockSuppliers[idx], ...payload };
          alert(`Supplier ${id} updated.`);
      }
  }

  closeFormModal();
  renderSupplierList(supplierSearchInput.value || "");
});

// init
function initSupplierPage() {
  renderSupplierList();
}

document.addEventListener("DOMContentLoaded", initSupplierPage);