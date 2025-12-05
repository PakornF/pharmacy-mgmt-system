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

const supplierForm = document.getElementById("supplierForm");
const supplierSearchInput = document.getElementById("supplierSearchInput");
const supplierNameInput = document.getElementById("supplierNameInput");
const contactNameInput = document.getElementById("contactNameInput");
const phoneInput = document.getElementById("phoneInput");
const emailInput = document.getElementById("emailInput");
const addressInput = document.getElementById("addressInput");
const notesInput = document.getElementById("notesInput");

const cancelEditBtn = document.getElementById("cancelEditBtn");
const formTitle = document.getElementById("formTitle");
const supplierIdHidden = document.getElementById("supplierId");

let allSuppliers = [];

const supplierTableBody = document.getElementById("supplierTableBody"); // Added supplier table body reference

// -----------------------------
// Fetch suppliers from backend
// -----------------------------
async function fetchAndStoreSuppliers() {
  try {
    const response = await fetch("http://localhost:8000/suppliers"); // Fetch from backend API
    if (!response.ok) {
      throw new Error("Failed to fetch suppliers");
    }
    allSuppliers = await response.json();
    renderSupplierList(allSuppliers, ""); // Initial render with all suppliers
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    alert("Error fetching suppliers from the server.");
  }
}

function clearSupplierForm() {
  supplierIdHidden.value = "";
  supplierNameInput.value = "";
  contactNameInput.value = "";
  phoneInput.value = "";
  emailInput.value = "";
  addressInput.value = "";
  notesInput.value = "";
  formTitle.textContent = "Add Supplier";
}

function fillFormForEdit(supplier) {
  supplierIdHidden.value = supplier._id;
  supplierNameInput.value = supplier.supplier_name || "";
  contactNameInput.value = supplier.contact_person || "";
  phoneInput.value = supplier.phone || "";
  emailInput.value = supplier.email || "";
  addressInput.value = supplier.address || "";
  notesInput.value = supplier.notes || "";
  formTitle.textContent = "Edit Supplier";
}

// -----------------------------
// Render Supplier List
// -----------------------------
function renderSupplierList(suppliers, keyword = "") {
  const q = keyword.toLowerCase();

  const filtered = suppliers.filter(
    (s) =>
      s.supplier_name.toLowerCase().includes(q) ||
      s.contact_person.toLowerCase().includes(q) ||
      String(s.supplier_id).includes(q)
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
          <td class="py-2 px-2 text-left">${s.supplier_name}</td>
          <td class="py-2 px-2 text-left">${s.contact_person || "-"}</td>
          <td class="py-2 px-2 text-left">${s.phone || "-"}</td>
          <td class="py-2 px-2 text-right space-x-2">
            <button
              class="text-xs text-pink-600 hover:underline"
              data-view="${s._id}"
            >
              View
            </button>
            <button
              class="text-xs text-blue-600 hover:underline"
              data-edit="${s._id}"
            >
              Edit
            </button>
            <button
              class="text-xs text-red-600 hover:underline"
              data-delete="${s._id}"
            >
              Delete
            </button>
          </td>
        </tr>
      `
    )
    .join("");
}

// -----------------------------
// Render Medicines of Supplier
// -----------------------------
async function renderSupplierMedicines(supplierId) {
  try {
    const response = await fetch(`http://localhost:8000/suppliers/${supplierId}/medicines`); // Fetch medicines for a supplier
    if (!response.ok) {
      throw new Error('Failed to fetch medicines');
    }
    const medicines = await response.json();

    const supplierMedicinesBody = document.getElementById("supplierMedicinesBody");
    if (medicines.length === 0) {
      supplierMedicinesBody.innerHTML =
        `<tr><td colspan="4" class="py-2 px-2 text-center text-gray-400 text-sm">No medicines from this supplier.</td></tr>`;
      return;
    }

    supplierMedicinesBody.innerHTML = medicines
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
  } catch (error) {
    console.error("Error fetching medicines:", error);
  }
}

// -----------------------------
// Handle form submission
// -----------------------------
async function submitSupplierForm(event) {
  event.preventDefault();

  const supplierData = {
    supplier_name: supplierNameInput.value.trim(),
    contact_person: contactNameInput.value.trim(),
    phone: phoneInput.value.trim(),
    email: emailInput.value.trim(),
    address: addressInput.value.trim(),
    notes: notesInput.value.trim(),
  };

  try {
    const isEdit = Boolean(supplierIdHidden.value);
    const url = isEdit
      ? `http://localhost:8000/suppliers/${supplierIdHidden.value}`
      : "http://localhost:8000/suppliers";
    const method = isEdit ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(supplierData),
    });

    const result = await response.json();
    if (!response.ok) {
      const detail = result && result.message ? `: ${result.message}` : "";
      alert(`Error creating supplier${detail}`);
      return;
    }

    alert(isEdit ? "Supplier updated successfully!" : "Supplier created successfully!");
    clearSupplierForm();
    await fetchAndStoreSuppliers();
  } catch (error) {
    console.error("Error creating supplier:", error);
    alert("Failed to create supplier.");
  }
}

// -----------------------------
// Table actions (view / edit / delete)
// -----------------------------
supplierTableBody.addEventListener("click", async (event) => {
  const viewBtn = event.target.closest("button[data-view]");
  const editBtn = event.target.closest("button[data-edit]");
  const deleteBtn = event.target.closest("button[data-delete]");

  if (viewBtn) {
    const id = viewBtn.getAttribute("data-view");
    const supplier = allSuppliers.find((s) => s._id === id);
    if (!supplier) return;
    alert(
      [
        `Name: ${supplier.supplier_name}`,
        `Contact: ${supplier.contact_person}`,
        `Phone: ${supplier.phone}`,
        `Email: ${supplier.email}`,
        `Address: ${supplier.address}`,
        `Notes: ${supplier.notes || "-"}`,
      ].join("\n")
    );
    return;
  }

  if (editBtn) {
    const id = editBtn.getAttribute("data-edit");
    const supplier = allSuppliers.find((s) => s._id === id);
    if (!supplier) return;
    fillFormForEdit(supplier);
    return;
  }

  if (deleteBtn) {
    const id = deleteBtn.getAttribute("data-delete");
    const supplier = allSuppliers.find((s) => s._id === id);
    if (!supplier) return;
    const confirmed = confirm(`Delete supplier "${supplier.supplier_name}"?`);
    if (!confirmed) return;

    try {
      const response = await fetch(`http://localhost:8000/suppliers/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok) {
        const detail = result && result.message ? `: ${result.message}` : "";
        alert(`Error deleting supplier${detail}`);
        return;
      }
      alert("Supplier deleted.");
      await fetchAndStoreSuppliers();
    } catch (error) {
      console.error("Error deleting supplier:", error);
      alert("Failed to delete supplier.");
    }
  }
});

// -----------------------------
// INIT
// -----------------------------
document.addEventListener("DOMContentLoaded", () => {
  fetchAndStoreSuppliers(); // Fetch the supplier list on page load
  supplierForm.addEventListener("submit", submitSupplierForm);
  supplierSearchInput.addEventListener("input", (e) =>
    renderSupplierList(allSuppliers, e.target.value || "")
  );
  cancelEditBtn.addEventListener("click", clearSupplierForm);
});
