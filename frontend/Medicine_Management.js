// API Base URL (For Medicine CRUD)
const API_BASE = (window.API_BASE || 'http://localhost:8000') + '/medicines';

// ----------------------------------------------------
// MOCK Supplier Data (ใช้สำหรับ Dropdown/Search เท่านั้น)
// ----------------------------------------------------
let mockSuppliers = [
    { id: "SUP-001", name: "Health Pharma Co., Ltd." },
    { id: "SUP-002", name: "Premium Med Supply" },
    { id: 1, name: "Bayer Co." }, 
];
// ----------------------------------------------------

// State
let allMedicines = [];
let filteredMedicines = [];
let currentFilter = 'all';
let currentDeleteId = null;
let currentStockId = null;
let currentStockQuantity = 0;

// DOM Elements
const medicineList = document.getElementById('medicineList');
const searchInput = document.getElementById('searchInput');
const filterButtons = document.querySelectorAll('.filter-btn');
const typeFilter = document.getElementById('typeFilter');
const loadingIndicator = document.getElementById('loadingIndicator');
const emptyState = document.getElementById('emptyState');

// Modal Elements
const medicineModal = document.getElementById('medicineModal');
const stockModal = document.getElementById('stockModal');
const deleteModal = document.getElementById('deleteModal');
const medicineForm = document.getElementById('medicineForm');
const addMedicineBtn = document.getElementById('addMedicineBtn');
const closeModal = document.getElementById('closeModal');
const closeStockModal = document.getElementById('closeStockModal');
const cancelDelete = document.getElementById('cancelDelete');

// Input/Select IDs
const medicineMongoIdInput = document.getElementById('medicineMongoId');
const medicineIdInput = document.getElementById('medicine_id');
const nameInput = document.getElementById('name');
const brandInput = document.getElementById('brand');
const typeInput = document.getElementById('type');
const priceInput = document.getElementById('price');
const quantityInput = document.getElementById('quantity');

// NEW Supplier Search Elements
const supplierSearchInput = document.getElementById('supplierSearchInput'); // Input สำหรับโหมด Add/Edit
const supplierSearchDropdown = document.getElementById('supplierSearchDropdown');
const supplierIdHiddenInput = document.getElementById('supplier_id'); // Hidden input สำหรับเก็บค่า ID

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadMedicines();
  setupEventListeners();
  setupSupplierSearchListeners();
});

// Helper: Generate next sequential Medicine ID (MED001, MED002, etc.)
function generateNextMedicineId() {
    if (allMedicines.length === 0) return "MED001";
    
    const maxNum = allMedicines.reduce((max, med) => {
        const idNum = parseInt((med.medicine_id || '').replace('MED', '')) || 0;
        return Math.max(max, idNum);
    }, 0);
    
    return "MED" + String(maxNum + 1).padStart(3, "0");
}

// Setup Event Listeners
function setupEventListeners() {
  searchInput.addEventListener('input', handleSearch);
  
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      currentFilter = btn.dataset.filter;
      filterButtons.forEach(b => {
        if (b === btn) {
          b.style.backgroundColor = '#f06292';
          b.style.color = 'white';
        } else {
          b.style.backgroundColor = '#f8bbd0';
          b.style.color = '#ad1457';
        }
      });
      applyFilters();
    });
  });
  
  typeFilter.addEventListener('change', applyFilters);
  
  addMedicineBtn.addEventListener('click', () => openMedicineModal());
  closeModal.addEventListener('click', () => closeMedicineModal());
  closeStockModal.addEventListener('click', () => closeStockModalFunc());
  cancelDelete.addEventListener('click', () => closeDeleteModal());
  
  medicineForm.addEventListener('submit', handleFormSubmit);
  
  document.getElementById('updateStockBtn').addEventListener('click', handleStockUpdate);
  document.getElementById('confirmDelete').addEventListener('click', handleDelete);
  
  medicineModal.addEventListener('click', (e) => {
    if (e.target === medicineModal) closeMedicineModal();
  });
  stockModal.addEventListener('click', (e) => {
    if (e.target === stockModal) closeStockModalFunc();
  });
  deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) closeDeleteModal();
  });
}

// ----------------------------------------------------------------------
// SUPPLIER AUTOCOMPLETE SEARCH LOGIC
// ----------------------------------------------------------------------

function setupSupplierSearchListeners() {
    supplierSearchInput.addEventListener('input', handleSupplierSearch);
    
    document.addEventListener('click', (e) => {
        if (!supplierSearchInput.contains(e.target) && !supplierSearchDropdown.contains(e.target)) {
            supplierSearchDropdown.classList.add('hidden');
        }
    });
    
    supplierSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !supplierSearchDropdown.classList.contains('hidden')) {
            e.preventDefault();
        }
    });
}

function handleSupplierSearch() {
    // โหมด Add เท่านั้นที่ใช้ Search (ตรวจสอบจาก disabled status)
    if (supplierSearchInput.disabled) return; 
    
    const term = supplierSearchInput.value.trim().toLowerCase();
    supplierSearchDropdown.classList.add('hidden');
    supplierIdHiddenInput.value = ''; // Clear hidden ID until one is selected

    if (term.length < 2) {
        supplierSearchDropdown.innerHTML = '';
        return;
    }

    const filtered = mockSuppliers.filter(s => 
        String(s.id).toLowerCase().includes(term) ||
        s.name.toLowerCase().includes(term)
    );

    if (filtered.length > 0) {
        supplierSearchDropdown.innerHTML = filtered.map(s => `
            <div class="px-4 py-2 hover:bg-pink-50 cursor-pointer text-sm supplier-result" data-id="${s.id}" data-name="${s.name}">
                <span class="font-semibold" style="color: #ad1457;">${s.name}</span> <span class="text-gray-500">(${s.id})</span>
            </div>
        `).join('');
        supplierSearchDropdown.classList.remove('hidden');
        attachSupplierDropdownListeners();
    } else {
        supplierSearchDropdown.innerHTML = `
            <div class="px-4 py-2 text-sm text-gray-500">No matching suppliers found.</div>
        `;
        supplierSearchDropdown.classList.remove('hidden');
    }
}

function attachSupplierDropdownListeners() {
    supplierSearchDropdown.querySelectorAll('.supplier-result').forEach(item => {
        item.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const name = e.currentTarget.dataset.name;
            
            // Set the search input value for display
            supplierSearchInput.value = `${name} (${id})`;
            
            // Set the hidden input value for form submission
            supplierIdHiddenInput.value = id; 
            
            // Hide dropdown
            supplierSearchDropdown.classList.add('hidden');
        });
    });
}

// ----------------------------------------------------------------------
// END SUPPLIER AUTOCOMPLETE SEARCH LOGIC
// ----------------------------------------------------------------------


// Load Medicines from API
async function loadMedicines() {
  showLoading(true);
  try {
    const response = await fetch(API_BASE);
    if (!response.ok) throw new Error('Failed to fetch medicines');
    
    allMedicines = await response.json();
    populateTypeFilter();
    applyFilters();
  } catch (error) {
    console.error('Error loading medicines:', error);
    showError('Failed to load medicines: ' + error.message);
  } finally {
    showLoading(false);
  }
}

// Populate Type Filter (Unchanged)
function populateTypeFilter() {
  const types = [...new Set(allMedicines.map(m => m.type))].sort();
  typeFilter.innerHTML = '<option value="">All Types</option>';
  types.forEach(type => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type;
    typeFilter.appendChild(option);
  });
}

// Handle Search (Unchanged)
function handleSearch() {
  applyFilters();
}

// Apply Filters (Unchanged)
function applyFilters() {
  let filtered = [...allMedicines];
  
  const searchTerm = searchInput.value.toLowerCase().trim();
  if (searchTerm) {
    filtered = filtered.filter(med => 
      med.name.toLowerCase().includes(searchTerm) ||
      med.type.toLowerCase().includes(searchTerm) ||
      med.brand.toLowerCase().includes(searchTerm) ||
      med.medicine_id.toLowerCase().includes(searchTerm)
    );
  }
  
  if (currentFilter === 'low-stock') {
    filtered = filtered.filter(med => med.quantity > 0 && med.quantity <= 10);
  } else if (currentFilter === 'out-of-stock') {
    filtered = filtered.filter(med => med.quantity === 0);
  }
  
  const selectedType = typeFilter.value;
  if (selectedType) {
    filtered = filtered.filter(med => med.type === selectedType);
  }
  
  filteredMedicines = filtered;
  renderMedicines();
}

// Render Medicines (Unchanged)
function renderMedicines() {
  if (filteredMedicines.length === 0) {
    medicineList.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }
  
  emptyState.classList.add('hidden');
  medicineList.innerHTML = filteredMedicines.map(med => createMedicineCard(med)).join('');
  
  attachCardEventListeners();
}

// Create Medicine Card (Unchanged)
function createMedicineCard(med) {
  const isLowStock = med.quantity > 0 && med.quantity <= 10;
  const isOutOfStock = med.quantity === 0;
  const stockClass = isOutOfStock ? 'low-stock' : (isLowStock ? 'low-stock' : '');
  
  return `
    <div class="medicine-card ${stockClass} rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
      <div class="flex justify-between items-start mb-4">
        <div>
          <h3 class="text-xl font-bold mb-1" style="color: #ad1457;">${escapeHtml(med.name)}</h3>
          <p class="text-sm text-gray-600">${escapeHtml(med.medicine_id)}</p>
        </div>
        ${isOutOfStock ? '<span class="px-3 py-1 rounded-full text-xs font-bold text-white" style="background-color: #ad1457;">Out of Stock</span>' : 
          isLowStock ? '<span class="px-3 py-1 rounded-full text-xs font-bold text-white" style="background-color: #f06292;">Low Stock</span>' : ''}
      </div>
      
      <div class="space-y-2 mb-4">
        <div class="flex justify-between">
          <span class="text-gray-600">Brand:</span>
          <span class="font-medium" style="color: #ad1457;">${escapeHtml(med.brand)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">Type:</span>
          <span class="font-medium" style="color: #ad1457;">${escapeHtml(med.type)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">Price:</span>
          <span class="font-medium" style="color: #ad1457;">${med.price.toFixed(2)} THB</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">Quantity:</span>
          <span class="font-bold text-lg" style="color: #f06292;">${med.quantity}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">Supplier ID:</span>
          <span class="font-medium" style="color: #ad1457;">${med.supplier_id}</span>
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
          class="stock-btn flex-1 px-4 py-2 rounded-lg text-sm font-semibold btn-primary"
          data-id="${med._id}"
          data-quantity="${med.quantity}"
          data-name="${escapeHtml(med.name)}"
        >
          Update Stock
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

// Attach Card Event Listeners (Unchanged)
function attachCardEventListeners() {
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const medicine = allMedicines.find(m => m._id === id);
      if (medicine) openMedicineModal(medicine);
    });
  });
  
  document.querySelectorAll('.stock-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentStockId = btn.dataset.id;
      currentStockQuantity = parseInt(btn.dataset.quantity);
      document.getElementById('stockMedicineName').textContent = btn.dataset.name;
      document.getElementById('currentStock').textContent = currentStockQuantity;
      document.getElementById('stockChange').value = '';
      stockModal.classList.remove('hidden');
    });
  });
  
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentDeleteId = btn.dataset.id;
      document.getElementById('deleteMedicineName').textContent = btn.dataset.name;
      deleteModal.classList.remove('hidden');
    });
  });
}

// Open Medicine Modal (Add or Edit) - LOGIC MODIFIED
function openMedicineModal(medicine = null) {
  const modalTitle = document.getElementById('modalTitle');
  const form = medicineForm;
  
  if (medicine) {
    // ----------------------------------------------------
    // EDIT MODE: LOCK SUPPLIER ID
    // ----------------------------------------------------
    modalTitle.textContent = 'Edit Medicine';
    medicineMongoIdInput.value = medicine._id;
    
    // PK (Medicine ID) is DISABLED/LOCKED
    medicineIdInput.value = medicine.medicine_id;
    medicineIdInput.disabled = true; 
    
    nameInput.value = medicine.name;
    brandInput.value = medicine.brand;
    typeInput.value = medicine.type;
    priceInput.value = medicine.price;
    quantityInput.value = medicine.quantity;
    
    // Find Supplier Name for display
    const supplier = mockSuppliers.find(s => String(s.id) === String(medicine.supplier_id));
    const displayValue = supplier 
        ? `${supplier.name} (${supplier.id})` 
        : `ID: ${medicine.supplier_id} (Supplier Not Found)`;
    
    // Set display value and LOCK the input
    supplierSearchInput.value = displayValue;
    supplierIdHiddenInput.value = medicine.supplier_id;
    supplierSearchInput.disabled = true; // <--- LOCK SUPPLIER INPUT IN EDIT MODE
    
  } else {
    // ----------------------------------------------------
    // ADD MODE: ENABLE SUPPLIER SEARCH
    // ----------------------------------------------------
    modalTitle.textContent = 'Add New Medicine';
    form.reset();
    medicineMongoIdInput.value = '';
    
    // Auto-generate PK and DISABLE editing
    medicineIdInput.value = generateNextMedicineId();
    medicineIdInput.disabled = true; 
    
    // Supplier Search Input: Clear and ENABLE for search
    supplierSearchInput.value = '';
    supplierIdHiddenInput.value = '';
    supplierSearchInput.disabled = false; // <--- ENABLE SUPPLIER INPUT IN ADD MODE
  }
  
  medicineModal.classList.remove('hidden');
}

// Close Medicine Modal - LOGIC MODIFIED
function closeMedicineModal() {
  medicineModal.classList.add('hidden');
  medicineForm.reset();
  
  // Ensure inputs are reset/re-enabled for the next action
  medicineIdInput.disabled = false;
  supplierSearchInput.disabled = false;
  supplierSearchDropdown.classList.add('hidden');
  supplierIdHiddenInput.value = '';
}

// Close Stock Modal (Unchanged)
function closeStockModalFunc() {
  stockModal.classList.add('hidden');
  document.getElementById('stockChange').value = '';
}

// Close Delete Modal (Unchanged)
function closeDeleteModal() {
  deleteModal.classList.add('hidden');
  currentDeleteId = null;
}

// Handle Form Submit (Add/Edit) - LOGIC MODIFIED
async function handleFormSubmit(e) {
  e.preventDefault();
  
  const mongoId = medicineMongoIdInput.value;
  
  const supplierId = supplierIdHiddenInput.value.trim();
  
  // ----------------------------------------------------
  // ** VALIDATION CHECK: Check if supplier is selected **
  // Only validate if in ADD mode (or if the field isn't disabled)
  // In EDIT mode, the field is disabled, so we trust the existing value.
  if (!mongoId && !supplierId) {
      alert("Please select a valid supplier using the search field.");
      supplierSearchInput.focus();
      return;
  }
  // ----------------------------------------------------
  
  const medicineData = {
    medicine_id: medicineIdInput.value,
    name: nameInput.value,
    brand: brandInput.value,
    type: typeInput.value,
    price: parseFloat(priceInput.value),
    quantity: parseInt(quantityInput.value),
    supplier_id: supplierId, 
  };
  
  // Convert supplier_id to integer if it appears numeric
  if (!isNaN(parseInt(medicineData.supplier_id)) && String(medicineData.supplier_id).match(/^\d+$/)) {
      medicineData.supplier_id = parseInt(medicineData.supplier_id);
  }
  
  try {
    let response;
    if (mongoId) {
      // Update existing
      response = await fetch(`${API_BASE}/${mongoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(medicineData),
      });
    } else {
      // Create new 
      response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(medicineData),
      });
    }
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to save medicine');
    }
    
    closeMedicineModal();
    await loadMedicines();
    showSuccess(mongoId ? 'Medicine updated successfully' : 'Medicine added successfully');
  } catch (error) {
    console.error('Error saving medicine:', error);
    alert('Error: ' + error.message);
  }
}

// Handle Stock Update (Unchanged)
async function handleStockUpdate() {
  const change = parseInt(document.getElementById('stockChange').value);
  
  if (isNaN(change) || change === 0) {
    alert('Please enter a valid quantity to add or subtract');
    return;
  }
  
  const newQuantity = currentStockQuantity + change;
  if (newQuantity < 0) {
    alert('Stock quantity cannot be negative');
    return;
  }
  
  try {
    const medicine = allMedicines.find(m => m._id === currentStockId);
    if (!medicine) throw new Error('Medicine not found');
    
    const response = await fetch(`${API_BASE}/${currentStockId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...medicine,
        quantity: newQuantity,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update stock');
    }
    
    closeStockModalFunc();
    await loadMedicines();
    showSuccess('Stock updated successfully');
  } catch (error) {
    console.error('Error updating stock:', error);
    alert('Error: ' + error.message);
  }
}

// Handle Delete (Unchanged)
async function handleDelete() {
  if (!currentDeleteId) return;
  
  try {
    const response = await fetch(`${API_BASE}/${currentDeleteId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete medicine');
    }
    
    closeDeleteModal();
    await loadMedicines();
    showSuccess('Medicine deleted successfully');
  } catch (error) {
    console.error('Error deleting medicine:', error);
    alert('Error: ' + error.message);
  }
}

// Utility Functions (Unchanged)
function showLoading(show) {
  if (show) {
    loadingIndicator.classList.remove('hidden');
    medicineList.classList.add('hidden');
  } else {
    loadingIndicator.classList.add('hidden');
    medicineList.classList.remove('hidden');
  }
}

function showError(message) {
  alert(message);
}

function showSuccess(message) {
  console.log(message);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}