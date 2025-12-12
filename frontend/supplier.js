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

const supplierTableBody = document.getElementById("supplierTableBody");

// -----------------------------
// Fetch suppliers from backend
// -----------------------------
async function fetchAndStoreSuppliers() {
  try {
    const response = await fetch("http://localhost:8000/suppliers");
    if (!response.ok) {
      throw new Error("Failed to fetch suppliers");
    }
    allSuppliers = await response.json();
    renderSupplierList(allSuppliers, "");
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
// Show Supplier Info + Medicine list
// -----------------------------
function showSupplierInformation(supplier, medicines = []) {
  const label = document.getElementById("selectedSupplierLabel");
  const infoBox = document.getElementById("supplierInfo");

  if (!label || !infoBox) return;

  if (!supplier) {
    label.textContent = "No supplier selected";
    infoBox.innerHTML =
      `<p class="text-sm text-gray-400">No supplier selected.</p>`;
    return;
  }

  label.textContent = `Supplier: ${supplier.supplier_name}`;

  const medicineListText = medicines.length
    ? medicines.map((m) => `• ${m.name}`).join("<br>")
    : "No medicines for this supplier.";

  infoBox.innerHTML = `
    <div class="text-sm space-y-1">
      <p><span class="font-semibold">Name:</span> ${supplier.supplier_name}</p>
      <p><span class="font-semibold">Contact:</span> ${
        supplier.contact_person || "-"
      }</p>
      <p><span class="font-semibold">Phone:</span> ${
        supplier.phone || "-"
      }</p>
      <p><span class="font-semibold">Email:</span> ${
        supplier.email || "-"
      }</p>
      <p><span class="font-semibold">Address:</span> ${
        supplier.address || "-"
      }</p>
      <p><span class="font-semibold">Notes:</span> ${
        supplier.notes || "-"
      }</p>

      <p class="mt-2 font-semibold">Medicine:</p>
      <p>${medicineListText}</p>
    </div>
  `;
}

// -----------------------------
// Render Medicines of Supplier (by supplier_id)
// -----------------------------
async function renderSupplierMedicinesByBusinessId(supplierMongoId) {
  const supplierMedicinesBody = document.getElementById(
    "supplierMedicinesBody"
  );
  const hasTable = !!supplierMedicinesBody;

  try {
    const response = await fetch(
      `http://localhost:8000/suppliers/${supplierMongoId}/medicines`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch medicines");
    }

    const medicines = await response.json();

    if (hasTable) {
      if (medicines.length === 0) {
        supplierMedicinesBody.innerHTML =
          `<tr><td colspan="4" class="py-2 px-2 text-center text-gray-400 text-sm">No medicines from this supplier.</td></tr>`;
      } else {
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
      }
    }

    return medicines;
  } catch (error) {
    console.error("Error fetching medicines:", error);
    if (hasTable) {
      supplierMedicinesBody.innerHTML =
        `<tr><td colspan="4" class="py-2 px-2 text-center text-red-400 text-sm">Failed to load medicines.</td></tr>`;
    }
    return [];
  }
}

// -----------------------------
// Handle form submission
// -----------------------------
async function submitSupplierForm(event) {
  event.preventDefault();

  // อ่านค่าจากฟอร์ม + ตัดช่องว่าง
  const supplier_name = supplierNameInput.value.trim();
  const contact_person = contactNameInput.value.trim();
  const phone = phoneInput.value.trim();
  const email = emailInput.value.trim();
  const address = addressInput.value.trim();
  const notes = notesInput.value.trim();

  // -------------------------
  // Frontend validation
  // -------------------------
  if (!supplier_name || !contact_person || !phone || !email || !address) {
    alert("กรุณากรอกข้อมูลให้ครบ: ชื่อบริษัท, ชื่อผู้ติดต่อ, เบอร์โทร, อีเมล และที่อยู่");
    return;
  }

  // เบอร์โทร 10 หลัก (ตัวเลขล้วน)
  const phoneRegex = /^\d{10}$/;
  if (!phoneRegex.test(phone)) {
    alert("กรุณากรอกเบอร์โทร 10 หลัก (ตัวเลขเท่านั้น)");
    return;
  }

  // Email format แบบทั่วไป
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    alert("กรุณากรอกอีเมลให้ถูกต้อง เช่น example@gmail.com");
    return;
  }

  const supplierData = {
    supplier_name,
    contact_person,
    phone,
    email,
    address,
    notes,
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

    alert(
      isEdit
        ? "Supplier updated successfully!"
        : "Supplier created successfully!"
    );
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

  // ----- VIEW -----
  if (viewBtn) {
    const id = viewBtn.getAttribute("data-view");
    const supplier = allSuppliers.find((s) => s._id === id);
    if (!supplier) return;

    // ใช้ supplier_id (เลขธุรกิจ) ไปดึงยา
    const medicines = await renderSupplierMedicinesByBusinessId(
      supplier._id
    );

    // แสดงข้อมูล supplier + รายชื่อยา
    showSupplierInformation(supplier, medicines);
    return;
  }

  // ----- EDIT -----
  if (editBtn) {
    const id = editBtn.getAttribute("data-edit");
    const supplier = allSuppliers.find((s) => s._id === id);
    if (!supplier) return;
    fillFormForEdit(supplier);
    return;
  }

  // ----- DELETE -----
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
  fetchAndStoreSuppliers();
  supplierForm.addEventListener("submit", submitSupplierForm);
  supplierSearchInput.addEventListener("input", (e) =>
    renderSupplierList(allSuppliers, e.target.value || "")
  );
  cancelEditBtn.addEventListener("click", clearSupplierForm);
});
