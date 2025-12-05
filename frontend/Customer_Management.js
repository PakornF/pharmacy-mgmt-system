// API Base URL
const API_BASE = (window.API_BASE || 'http://localhost:8000') + '/customers';

// State
let allCustomers = [];
let filteredCustomers = [];
let currentDeleteId = null;
let currentHistoryCustomerId = null;
let currentHistoryTab = 'sales';

// DOM Elements
const customerList = document.getElementById('customerList');
const searchInput = document.getElementById('searchInput');
const loadingIndicator = document.getElementById('loadingIndicator');
const emptyState = document.getElementById('emptyState');

// Modal Elements
const customerModal = document.getElementById('customerModal');
const historyModal = document.getElementById('historyModal');
const deleteModal = document.getElementById('deleteModal');
const customerForm = document.getElementById('customerForm');
const addCustomerBtn = document.getElementById('addCustomerBtn');
const closeModal = document.getElementById('closeModal');
const closeHistoryModal = document.getElementById('closeHistoryModal');
const cancelDelete = document.getElementById('cancelDelete');

// Tab Elements
const salesTab = document.getElementById('salesTab');
const prescriptionsTab = document.getElementById('prescriptionsTab');
const salesContent = document.getElementById('salesContent');
const prescriptionsContent = document.getElementById('prescriptionsContent');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadCustomers();
  setupEventListeners();
  initializeDatePicker();
});

// Flatpickr instance
let datePickerInstance = null;

// Initialize Flatpickr Date Picker
function initializeDatePicker() {
  const dateInput = document.getElementById('day_of_birth');
  if (dateInput && typeof flatpickr !== 'undefined') {
    // Destroy existing instance if any
    if (datePickerInstance) {
      datePickerInstance.destroy();
    }
    
    datePickerInstance = flatpickr(dateInput, {
      dateFormat: 'Y-m-d',
      locale: 'en',
      maxDate: 'today',
      allowInput: true,
    });
  }
}

// Setup Event Listeners
function setupEventListeners() {
  // Search
  searchInput.addEventListener('input', handleSearch);
  
  // Modal buttons
  addCustomerBtn.addEventListener('click', () => openCustomerModal());
  closeModal.addEventListener('click', () => closeCustomerModal());
  closeHistoryModal.addEventListener('click', () => closeHistoryModalFunc());
  cancelDelete.addEventListener('click', () => closeDeleteModal());
  
  // Form submission
  customerForm.addEventListener('submit', handleFormSubmit);
  
  // Delete confirmation
  document.getElementById('confirmDelete').addEventListener('click', handleDelete);
  
  // History tabs
  salesTab.addEventListener('click', () => switchHistoryTab('sales'));
  prescriptionsTab.addEventListener('click', () => switchHistoryTab('prescriptions'));
  
  // Close modals on outside click
  customerModal.addEventListener('click', (e) => {
    if (e.target === customerModal) closeCustomerModal();
  });
  historyModal.addEventListener('click', (e) => {
    if (e.target === historyModal) closeHistoryModalFunc();
  });
  deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) closeDeleteModal();
  });
}

// Load Customers from API
async function loadCustomers() {
  showLoading(true);
  try {
    const response = await fetch(API_BASE);
    if (!response.ok) throw new Error('Failed to fetch customers');
    
    allCustomers = await response.json();
    applyFilters();
  } catch (error) {
    console.error('Error loading customers:', error);
    showError('Failed to load customers: ' + error.message);
  } finally {
    showLoading(false);
  }
}

// Handle Search
function handleSearch() {
  applyFilters();
}

// Apply Filters
function applyFilters() {
  let filtered = [...allCustomers];
  
  // Search filter (search in full_name, first_name, last_name, contact, and customer_id)
  const searchTerm = searchInput.value.toLowerCase().trim();
  if (searchTerm) {
    filtered = filtered.filter(customer => {
      const fullName = customer.full_name ? customer.full_name.toLowerCase() : '';
      const nameParts = fullName.split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      return fullName.includes(searchTerm) ||
             firstName.includes(searchTerm) ||
             lastName.includes(searchTerm) ||
             customer.contact.toLowerCase().includes(searchTerm) ||
             customer.customer_id.toString().includes(searchTerm);
    });
  }
  
  filteredCustomers = filtered;
  renderCustomers();
}

// Render Customers
function renderCustomers() {
  if (filteredCustomers.length === 0) {
    customerList.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }
  
  emptyState.classList.add('hidden');
  customerList.innerHTML = filteredCustomers.map(customer => createCustomerCard(customer)).join('');
  
  // Attach event listeners to action buttons
  attachCardEventListeners();
}

// Format Date to DD/MM/YYYY (AD)
function formatDate(date) {
  if (!date) return 'N/A';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Create Customer Card
function createCustomerCard(customer) {
  const dob = customer.day_of_birth ? formatDate(customer.day_of_birth) : 'N/A';
  const age = customer.day_of_birth ? calculateAge(new Date(customer.day_of_birth)) : 'N/A';
  
  return `
    <div class="customer-card rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
      <div class="flex justify-between items-start mb-4">
        <div>
          <h3 class="text-xl font-bold mb-1" style="color: #ad1457;">${escapeHtml(customer.full_name)}</h3>
          <p class="text-sm text-gray-600">ID: ${customer.customer_id}</p>
        </div>
      </div>
      
      <div class="space-y-2 mb-4">
        <div class="flex justify-between">
          <span class="text-gray-600">Contact:</span>
          <span class="font-medium" style="color: #ad1457;">${escapeHtml(customer.contact)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">Gender:</span>
          <span class="font-medium" style="color: #ad1457;">${escapeHtml(customer.gender)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">Date of Birth:</span>
          <span class="font-medium" style="color: #ad1457;">${dob}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">Age:</span>
          <span class="font-medium" style="color: #ad1457;">${age} years</span>
        </div>
      </div>
      
      <div class="flex flex-wrap gap-2 mt-4">
        <button 
          class="edit-btn flex-1 px-4 py-2 rounded-lg text-sm font-semibold btn-secondary"
          data-id="${customer._id}"
        >
          Edit
        </button>
        <button 
          class="history-btn flex-1 px-4 py-2 rounded-lg text-sm font-semibold btn-info"
          data-id="${customer._id}"
          data-name="${escapeHtml(customer.full_name)}"
        >
          View History
        </button>
        <button 
          class="delete-btn px-4 py-2 rounded-lg text-sm font-semibold btn-danger"
          data-id="${customer._id}"
          data-name="${escapeHtml(customer.full_name)}"
        >
          Delete
        </button>
      </div>
    </div>
  `;
}

// Calculate Age
function calculateAge(birthDate) {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// Attach Card Event Listeners
function attachCardEventListeners() {
  // Edit buttons
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const customer = allCustomers.find(c => c._id === id);
      if (customer) openCustomerModal(customer);
    });
  });
  
  // History buttons
  document.querySelectorAll('.history-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentHistoryCustomerId = btn.dataset.id;
      document.getElementById('historyCustomerName').textContent = btn.dataset.name;
      switchHistoryTab('sales');
      loadCustomerHistory();
      historyModal.classList.remove('hidden');
    });
  });
  
  // Delete buttons
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentDeleteId = btn.dataset.id;
      document.getElementById('deleteCustomerName').textContent = btn.dataset.name;
      deleteModal.classList.remove('hidden');
    });
  });
}

// Open Customer Modal (Add or Edit)
function openCustomerModal(customer = null) {
  const modalTitle = document.getElementById('modalTitle');
  const form = customerForm;
  
  if (customer) {
    // Edit mode
    modalTitle.textContent = 'Edit Customer';
    document.getElementById('customerMongoId').value = customer._id;
    document.getElementById('customer_id').value = customer.customer_id;
    document.getElementById('customer_id').disabled = true; // Don't allow editing ID
    
    // Split full_name into first_name and last_name
    const nameParts = customer.full_name ? customer.full_name.trim().split(/\s+/) : ['', ''];
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    document.getElementById('first_name').value = firstName;
    document.getElementById('last_name').value = lastName;
    
    document.getElementById('contact').value = customer.contact;
    document.getElementById('gender').value = customer.gender;
    
    // Format date for input
    if (customer.day_of_birth) {
      const dob = new Date(customer.day_of_birth);
      const formattedDate = dob.toISOString().split('T')[0];
      document.getElementById('day_of_birth').value = formattedDate;
      // Update flatpickr if exists
      if (datePickerInstance) {
        datePickerInstance.setDate(formattedDate, false);
      }
    }
  } else {
    // Add mode
    modalTitle.textContent = 'Add New Customer';
    form.reset();
    document.getElementById('customerMongoId').value = '';
    document.getElementById('customer_id').disabled = false;
    // Clear flatpickr if exists
    if (datePickerInstance) {
      datePickerInstance.clear();
    }
  }
  
  customerModal.classList.remove('hidden');
  // Reinitialize date picker when modal is shown
  setTimeout(() => {
    initializeDatePicker();
  }, 100);
}

// Close Customer Modal
function closeCustomerModal() {
  customerModal.classList.add('hidden');
  customerForm.reset();
}

// Close History Modal
function closeHistoryModalFunc() {
  historyModal.classList.add('hidden');
  currentHistoryCustomerId = null;
}

// Close Delete Modal
function closeDeleteModal() {
  deleteModal.classList.add('hidden');
  currentDeleteId = null;
}

// Switch History Tab
function switchHistoryTab(tab) {
  currentHistoryTab = tab;
  
  if (tab === 'sales') {
    salesTab.classList.add('border-b-2');
    salesTab.style.borderColor = '#f48fb1';
    salesTab.style.color = '#ad1457';
    prescriptionsTab.classList.remove('border-b-2');
    prescriptionsTab.style.borderColor = 'transparent';
    prescriptionsTab.style.color = 'rgb(107, 114, 128)';
    
    salesContent.classList.remove('hidden');
    prescriptionsContent.classList.add('hidden');
  } else {
    prescriptionsTab.classList.add('border-b-2');
    prescriptionsTab.style.borderColor = '#f48fb1';
    prescriptionsTab.style.color = '#ad1457';
    salesTab.classList.remove('border-b-2');
    salesTab.style.borderColor = 'transparent';
    salesTab.style.color = 'rgb(107, 114, 128)';
    
    prescriptionsContent.classList.remove('hidden');
    salesContent.classList.add('hidden');
  }
  
  if (currentHistoryCustomerId) {
    loadCustomerHistory();
  }
}

// Load Customer History
async function loadCustomerHistory() {
  if (!currentHistoryCustomerId) return;
  
  try {
    if (currentHistoryTab === 'sales') {
      await loadSalesHistory();
    } else {
      await loadPrescriptionsHistory();
    }
  } catch (error) {
    console.error('Error loading history:', error);
    showError('Failed to load history: ' + error.message);
  }
}

// Load Sales History
async function loadSalesHistory() {
  const salesList = document.getElementById('salesList');
  const salesEmpty = document.getElementById('salesEmpty');
  
  try {
    const response = await fetch(`${API_BASE}/${currentHistoryCustomerId}/sales`);
    if (!response.ok) throw new Error('Failed to fetch sales history');
    
    const sales = await response.json();
    
    if (sales.length === 0) {
      salesList.innerHTML = '';
      salesEmpty.classList.remove('hidden');
      return;
    }
    
    salesEmpty.classList.add('hidden');
    salesList.innerHTML = sales.map(sale => createSaleCard(sale)).join('');
  } catch (error) {
    console.error('Error loading sales:', error);
    salesList.innerHTML = '<p class="text-red-500">Error loading sales history</p>';
    salesEmpty.classList.add('hidden');
  }
}

// Format DateTime to DD/MM/YYYY HH:MM (AD)
function formatDateTime(dateTime) {
  if (!dateTime) return 'N/A';
  const d = new Date(dateTime);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

// Create Sale Card
function createSaleCard(sale) {
  const saleDate = sale.sale_datetime ? formatDateTime(sale.sale_datetime) : 'N/A';
  const totalPrice = sale.total_price ? sale.total_price.toFixed(2) : '0.00';
  
  return `
    <div class="bg-white rounded-lg shadow p-4 border-l-4" style="border-color: #f48fb1;">
      <div class="flex justify-between items-start mb-2">
        <div>
          <h4 class="font-semibold" style="color: #ad1457;">Sale #${sale.sale_id}</h4>
          <p class="text-sm text-gray-600">${saleDate}</p>
        </div>
        <div class="text-right">
          <p class="text-lg font-bold" style="color: #f06292;">${totalPrice} THB</p>
        </div>
      </div>
    </div>
  `;
}

// Load Prescriptions History
async function loadPrescriptionsHistory() {
  const prescriptionsList = document.getElementById('prescriptionsList');
  const prescriptionsEmpty = document.getElementById('prescriptionsEmpty');
  
  try {
    const response = await fetch(`${API_BASE}/${currentHistoryCustomerId}/prescriptions`);
    if (!response.ok) throw new Error('Failed to fetch prescriptions history');
    
    const prescriptions = await response.json();
    
    if (prescriptions.length === 0) {
      prescriptionsList.innerHTML = '';
      prescriptionsEmpty.classList.remove('hidden');
      return;
    }
    
    prescriptionsEmpty.classList.add('hidden');
    prescriptionsList.innerHTML = prescriptions.map(prescription => createPrescriptionCard(prescription)).join('');
  } catch (error) {
    console.error('Error loading prescriptions:', error);
    prescriptionsList.innerHTML = '<p class="text-red-500">Error loading prescription history</p>';
    prescriptionsEmpty.classList.add('hidden');
  }
}

// Create Prescription Card
function createPrescriptionCard(prescription) {
  const issueDate = prescription.issue_date ? formatDate(prescription.issue_date) : 'N/A';
  const notes = prescription.notes || 'No notes';
  
  return `
    <div class="bg-white rounded-lg shadow p-4 border-l-4" style="border-color: #f06292;">
      <div class="mb-2">
        <h4 class="font-semibold" style="color: #ad1457;">Prescription #${prescription.prescription_id}</h4>
        <p class="text-sm text-gray-600">Date: ${issueDate}</p>
        ${prescription.doctor_id ? `<p class="text-sm text-gray-600">Doctor ID: ${prescription.doctor_id}</p>` : ''}
      </div>
      <div class="mt-2">
        <p class="text-sm text-gray-700"><strong>Notes:</strong> ${escapeHtml(notes)}</p>
      </div>
    </div>
  `;
}

// Handle Form Submit (Add/Edit)
async function handleFormSubmit(e) {
  e.preventDefault();
  
  const mongoId = document.getElementById('customerMongoId').value;
  const firstName = document.getElementById('first_name').value.trim();
  const lastName = document.getElementById('last_name').value.trim();
  const customerData = {
    customer_id: parseInt(document.getElementById('customer_id').value),
    full_name: `${firstName} ${lastName}`.trim(),
    contact: document.getElementById('contact').value,
    gender: document.getElementById('gender').value,
    day_of_birth: document.getElementById('day_of_birth').value,
  };
  
  try {
    let response;
    if (mongoId) {
      // Update existing
      response = await fetch(`${API_BASE}/${mongoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData),
      });
    } else {
      // Create new
      response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData),
      });
    }
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to save customer');
    }
    
    closeCustomerModal();
    await loadCustomers();
    showSuccess(mongoId ? 'Customer updated successfully' : 'Customer added successfully');
  } catch (error) {
    console.error('Error saving customer:', error);
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
      throw new Error(error.message || 'Failed to delete customer');
    }
    
    closeDeleteModal();
    await loadCustomers();
    showSuccess('Customer deleted successfully');
  } catch (error) {
    console.error('Error deleting customer:', error);
    alert('Error: ' + error.message);
  }
}

// Utility Functions
function showLoading(show) {
  if (show) {
    loadingIndicator.classList.remove('hidden');
    customerList.classList.add('hidden');
  } else {
    loadingIndicator.classList.add('hidden');
    customerList.classList.remove('hidden');
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
