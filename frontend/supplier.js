let mockSuppliers = [
    {
      id: "sup1",
      name: "Health Pharma Co., Ltd.",
      contactName: "Somchai Wong",
      phone: "081-111-2222",
      email: "somchai@healthpharma.com",
      address: "Bangkok, Thailand",
      notes: "Main generic drug supplier",
    },
    {
      id: "sup2",
      name: "Premium Med Supply",
      contactName: "Ms. May",
      phone: "089-333-4444",
      email: "may@premiummed.com",
      address: "Chiang Mai, Thailand",
      notes: "Skin care products",
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
  
  const supplierSearchInput = document.getElementById("supplierSearchInput");
  const supplierTableBody = document.getElementById("supplierTableBody");
  
  const addSupplierBtn = document.getElementById("addSupplierBtn");
  const cancelEditBtn = document.getElementById("cancelEditBtn");
  const supplierForm = document.getElementById("supplierForm");
  const formTitle = document.getElementById("formTitle");
  
  const supplierIdInput = document.getElementById("supplierId");
  const supplierNameInput = document.getElementById("supplierNameInput");
  const contactNameInput = document.getElementById("contactNameInput");
  const phoneInput = document.getElementById("phoneInput");
  const emailInput = document.getElementById("emailInput");
  const addressInput = document.getElementById("addressInput");
  const notesInput = document.getElementById("notesInput");
  
  const selectedSupplierLabel = document.getElementById("selectedSupplierLabel");
  const supplierMedicinesBody = document.getElementById("supplierMedicinesBody");
  
  let selectedSupplierId = null;
  
  // render supplier list 
  function renderSupplierList(keyword = "") {
    const q = keyword.toLowerCase();
  
    const filtered = mockSuppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.contactName && s.contactName.toLowerCase().includes(q))
    );
  
    if (filtered.length === 0) {
      supplierTableBody.innerHTML =
        `<tr><td colspan="4" class="py-2 px-2 text-center text-gray-400 text-sm">No suppliers found.</td></tr>`;
      return;
    }
  
    supplierTableBody.innerHTML = filtered
      .map(
        (s) => `
        <tr class="hover:bg-pink-50">
          <td class="py-2 px-2 text-left">${s.name}</td>
          <td class="py-2 px-2 text-left">${s.contactName || "-"}</td>
          <td class="py-2 px-2 text-left">${s.phone || "-"}</td>
          <td class="py-2 px-2 text-right space-x-2">
            <button
              class="text-xs text-pink-600 hover:underline"
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
  
  // render medicines of selected supplier 
  function renderSupplierMedicines(supplierId) {
    const supplier = mockSuppliers.find((s) => s.id === supplierId);
    if (!supplier) {
      selectedSupplierLabel.textContent = "No supplier selected";
      supplierMedicinesBody.innerHTML =
        `<tr><td colspan="4" class="py-2 px-2 text-sm text-gray-400 text-center">Select a supplier to see medicines.</td></tr>`;
      return;
    }
  
    selectedSupplierLabel.textContent = `Selected: ${supplier.name}`;
  
    const meds = mockMedicines.filter((m) => m.supplierId === supplierId);
  
    if (meds.length === 0) {
      supplierMedicinesBody.innerHTML =
        `<tr><td colspan="4" class="py-2 px-2 text-sm text-gray-400 text-center">No medicines from this supplier.</td></tr>`;
      return;
    }
  
    supplierMedicinesBody.innerHTML = meds
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
  
  function fillFormForEdit(id) {
    const s = mockSuppliers.find((sup) => sup.id === id);
    if (!s) return;
  
    supplierIdInput.value = s.id;
    supplierNameInput.value = s.name;
    contactNameInput.value = s.contactName || "";
    phoneInput.value = s.phone || "";
    emailInput.value = s.email || "";
    addressInput.value = s.address || "";
    notesInput.value = s.notes || "";
  
    formTitle.textContent = "Edit Supplier";
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
  
    if (viewBtn) {
      const id = viewBtn.getAttribute("data-view");
      selectedSupplierId = id;
      renderSupplierMedicines(id);
      return;
    }
  
    if (editBtn) {
      const id = editBtn.getAttribute("data-edit");
      fillFormForEdit(id);
      formTitle.textContent = "Edit Supplier";
      return;
    }
  
    if (deleteBtn) {
      const id = deleteBtn.getAttribute("data-delete");
      const s = mockSuppliers.find((sup) => sup.id === id);
      if (!s) return;
      if (!confirm(`Delete supplier "${s.name}" ?`)) return;
  
      mockSuppliers = mockSuppliers.filter((sup) => sup.id !== id);
      if (selectedSupplierId === id) {
        selectedSupplierId = null;
        renderSupplierMedicines(null);
      }
      renderSupplierList(supplierSearchInput.value || "");
      return;
    }
  });
  
  // event: add supplier button
  addSupplierBtn.addEventListener("click", () => {
    clearForm();
    formTitle.textContent = "Add Supplier";
  });
  
  // event: cancel edit
  cancelEditBtn.addEventListener("click", () => {
    clearForm();
    formTitle.textContent = "Add Supplier";
  });
  
  // event: submit form
  supplierForm.addEventListener("submit", (e) => {
    e.preventDefault();
  
    const id = supplierIdInput.value || null;
  
    const name = supplierNameInput.value.trim();
    const contact = contactNameInput.value.trim();
    const phone = phoneInput.value.trim();
    const email = emailInput.value.trim();
    const address = addressInput.value.trim();
    const notes = notesInput.value.trim();
  
    // VALIDATION
    if (!name) {
      alert("Supplier name is required.");
      supplierNameInput.focus();
      return;
    }
  
    if (!contact) {
      alert("Contact Person is required.");
      contactNameInput.focus();
      return;
    }
  
    if (!phone) {
      alert("Phone is required.");
      phoneInput.focus();
      return;
    }
  
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 6) {
      alert("Please enter a valid phone number.");
      phoneInput.focus();
      return;
    }
  
    if (!email) {
      alert("Email is required.");
      emailInput.focus();
      return;
    }
  
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      alert("Please enter a valid email address.");
      emailInput.focus();
      return;
    }
  
    if (!address) {
      alert("Address is required.");
      addressInput.focus();
      return;
    }
    // END VALIDATION
  
    const payload = {
      name,
      contactName: contact,
      phone,
      email,
      address,
      notes,
    };
  
    if (id) {
      const idx = mockSuppliers.findIndex((s) => s.id === id);
      if (idx !== -1) {
        mockSuppliers[idx] = { ...mockSuppliers[idx], ...payload };
      }
      alert("Supplier updated.");
    } else {
      const newId = "sup" + (mockSuppliers.length + 1);
      mockSuppliers.push({ id: newId, ...payload });
      alert("Supplier added.");
    }
  
    clearForm();
    formTitle.textContent = "Add Supplier";
    renderSupplierList(supplierSearchInput.value || "");
  });
  
  // init
  function initSupplierPage() {
    renderSupplierList();
    renderSupplierMedicines(null);
  }
  
  document.addEventListener("DOMContentLoaded", initSupplierPage);