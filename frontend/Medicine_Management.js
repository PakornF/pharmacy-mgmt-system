// API Base URL
const API_BASE = (window.API_BASE || 'http://localhost:8000') + '/medicines';

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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadMedicines();
  setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
  // Search
  searchInput.addEventListener('input', handleSearch);
  
  // Filter buttons
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
  
  // Type filter
  typeFilter.addEventListener('change', applyFilters);
  
  // Modal buttons
  addMedicineBtn.addEventListener('click', () => openMedicineModal());
  closeModal.addEventListener('click', () => closeMedicineModal());
  closeStockModal.addEventListener('click', () => closeStockModalFunc());
  cancelDelete.addEventListener('click', () => closeDeleteModal());
  
  // Form submission
  medicineForm.addEventListener('submit', handleFormSubmit);
  
  // Stock update
  document.getElementById('updateStockBtn').addEventListener('click', handleStockUpdate);
  
  // Delete confirmation
  document.getElementById('confirmDelete').addEventListener('click', handleDelete);
  
  // Close modals on outside click
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

// Populate Type Filter
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

// Handle Search
function handleSearch() {
  applyFilters();
}

// Apply Filters
function applyFilters() {
  let filtered = [...allMedicines];
  
  // Search filter
  const searchTerm = searchInput.value.toLowerCase().trim();
  if (searchTerm) {
    filtered = filtered.filter(med => 
      med.name.toLowerCase().includes(searchTerm) ||
      med.type.toLowerCase().includes(searchTerm) ||
      med.brand.toLowerCase().includes(searchTerm) ||
      med.medicine_id.toLowerCase().includes(searchTerm)
    );
  }
  
  // Stock filter
  if (currentFilter === 'low-stock') {
    filtered = filtered.filter(med => med.quantity > 0 && med.quantity <= 10);
  } else if (currentFilter === 'out-of-stock') {
    filtered = filtered.filter(med => med.quantity === 0);
  }
  
  // Type filter
  const selectedType = typeFilter.value;
  if (selectedType) {
    filtered = filtered.filter(med => med.type === selectedType);
  }
  
  filteredMedicines = filtered;
  renderMedicines();
}

// Render Medicines
function renderMedicines() {
  if (filteredMedicines.length === 0) {
    medicineList.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }
  
  emptyState.classList.add('hidden');
  medicineList.innerHTML = filteredMedicines.map(med => createMedicineCard(med)).join('');
  
  // Attach event listeners to action buttons
  attachCardEventListeners();
}

// Create Medicine Card
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

// Attach Card Event Listeners
function attachCardEventListeners() {
  // Edit buttons
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const medicine = allMedicines.find(m => m._id === id);
      if (medicine) openMedicineModal(medicine);
    });
  });
  
  // Stock buttons
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
  
  // Delete buttons
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentDeleteId = btn.dataset.id;
      document.getElementById('deleteMedicineName').textContent = btn.dataset.name;
      deleteModal.classList.remove('hidden');
    });
  });
}

// Open Medicine Modal (Add or Edit)
function openMedicineModal(medicine = null) {
  const modalTitle = document.getElementById('modalTitle');
  const form = medicineForm;
  
  if (medicine) {
    // Edit mode
    modalTitle.textContent = 'Edit Medicine';
    document.getElementById('medicineMongoId').value = medicine._id;
    document.getElementById('medicine_id').value = medicine.medicine_id;
    document.getElementById('medicine_id').disabled = true; // Don't allow editing ID
    document.getElementById('name').value = medicine.name;
    document.getElementById('brand').value = medicine.brand;
    document.getElementById('type').value = medicine.type;
    document.getElementById('price').value = medicine.price;
    document.getElementById('quantity').value = medicine.quantity;
    document.getElementById('supplier_id').value = medicine.supplier_id;
  } else {
    // Add mode
    modalTitle.textContent = 'Add New Medicine';
    form.reset();
    document.getElementById('medicineMongoId').value = '';
    document.getElementById('medicine_id').disabled = false;
  }
  
  medicineModal.classList.remove('hidden');
}

// Close Medicine Modal
function closeMedicineModal() {
  medicineModal.classList.add('hidden');
  medicineForm.reset();
}

// Close Stock Modal
function closeStockModalFunc() {
  stockModal.classList.add('hidden');
  document.getElementById('stockChange').value = '';
}

// Close Delete Modal
function closeDeleteModal() {
  deleteModal.classList.add('hidden');
  currentDeleteId = null;
}

// Handle Form Submit (Add/Edit)
async function handleFormSubmit(e) {
  e.preventDefault();
  
  const mongoId = document.getElementById('medicineMongoId').value;
  const medicineData = {
    medicine_id: document.getElementById('medicine_id').value,
    name: document.getElementById('name').value,
    brand: document.getElementById('brand').value,
    type: document.getElementById('type').value,
    price: parseFloat(document.getElementById('price').value),
    quantity: parseInt(document.getElementById('quantity').value),
    supplier_id: parseInt(document.getElementById('supplier_id').value),
  };
  
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

// Handle Stock Update
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

// Handle Delete
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

// Utility Functions
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
  // Simple error display - can be enhanced with a toast notification
  alert(message);
}

function showSuccess(message) {
  // Simple success display - can be enhanced with a toast notification
  console.log(message);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
