// API Base URLs
const API_BASE = 'http://localhost:8000';
const PRESCRIPTION_API = `${API_BASE}/prescriptions`;
const DOCTOR_API = `${API_BASE}/doctors`;
const CUSTOMER_API = `${API_BASE}/customers`;
const MEDICINE_API = `${API_BASE}/medicines`;

// State
let allPrescriptions = [];
let filteredPrescriptions = [];
let allDoctors = [];
let allCustomers = [];
let allMedicines = [];
let prescriptionItems = [];
let currentPrescriptionId = null;
let currentStatusId = null;
let itemCounter = 0;

// DOM Elements
const prescriptionList = document.getElementById('prescriptionList');
const searchInput = document.getElementById('searchInput');
const loadingIndicator = document.getElementById('loadingIndicator');
const emptyState = document.getElementById('emptyState');

// Modal Elements
const prescriptionModal = document.getElementById('prescriptionModal');
const viewModal = document.getElementById('viewModal');
const statusModal = document.getElementById('statusModal');
const prescriptionForm = document.getElementById('prescriptionForm');
const addPrescriptionBtn = document.getElementById('addPrescriptionBtn');
const closeModal = document.getElementById('closeModal');
const closeViewModal = document.getElementById('closeViewModal');
const closeStatusModal = document.getElementById('closeStatusModal');

// Flatpickr instance
let datePickerInstance = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadAllData();
  setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
  // Search
  searchInput.addEventListener('input', handleSearch);
  
  // Modal buttons
  addPrescriptionBtn.addEventListener('click', () => openPrescriptionModal());
  closeModal.addEventListener('click', () => closePrescriptionModal());
  closeViewModal.addEventListener('click', () => closeViewModalFunc());
  closeStatusModal.addEventListener('click', () => closeStatusModalFunc());
  
  // Form submission
  prescriptionForm.addEventListener('submit', handleFormSubmit);
  
  // Add item button
  document.getElementById('addItemBtn').addEventListener('click', addPrescriptionItem);
  
  // Status update
  document.getElementById('updateStatusBtn').addEventListener('click', handleStatusUpdate);
  
  // Doctor search
  const doctorSearch = document.getElementById('doctor_search');
  doctorSearch.addEventListener('input', () => handleDoctorSearch());
  doctorSearch.addEventListener('focus', () => handleDoctorSearch());
  
  // Customer search
  const customerSearch = document.getElementById('customer_search');
  customerSearch.addEventListener('input', () => handleCustomerSearch());
  customerSearch.addEventListener('focus', () => handleCustomerSearch());
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.relative')) {
      document.getElementById('doctor_dropdown').classList.add('hidden');
      document.getElementById('customer_dropdown').classList.add('hidden');
    }
  });
  
  // Close modals on outside click
  prescriptionModal.addEventListener('click', (e) => {
    if (e.target === prescriptionModal) closePrescriptionModal();
  });
  viewModal.addEventListener('click', (e) => {
    if (e.target === viewModal) closeViewModalFunc();
  });
  statusModal.addEventListener('click', (e) => {
    if (e.target === statusModal) closeStatusModalFunc();
  });
}

// Load All Data
async function loadAllData() {
  showLoading(true);
  try {
    await Promise.all([
      loadPrescriptions(),
      loadDoctors(),
      loadCustomers(),
      loadMedicines()
    ]);
  } catch (error) {
    console.error('Error loading data:', error);
    showError('Failed to load data: ' + error.message);
  } finally {
    showLoading(false);
  }
}

// Load Prescriptions
async function loadPrescriptions() {
  try {
    const response = await fetch(PRESCRIPTION_API);
    if (!response.ok) throw new Error('Failed to fetch prescriptions');
    allPrescriptions = await response.json();
    applyFilters();
  } catch (error) {
    console.error('Error loading prescriptions:', error);
    showError('Failed to load prescriptions: ' + error.message);
  }
}

// Load Doctors
async function loadDoctors() {
  try {
    const response = await fetch(DOCTOR_API);
    if (!response.ok) throw new Error('Failed to fetch doctors');
    allDoctors = await response.json();
  } catch (error) {
    console.error('Error loading doctors:', error);
  }
}

// Load Customers
async function loadCustomers() {
  try {
    const response = await fetch(CUSTOMER_API);
    if (!response.ok) throw new Error('Failed to fetch customers');
    allCustomers = await response.json();
  } catch (error) {
    console.error('Error loading customers:', error);
  }
}

// Load Medicines
async function loadMedicines() {
  try {
    const response = await fetch(MEDICINE_API);
    if (!response.ok) throw new Error('Failed to fetch medicines');
    allMedicines = await response.json();
  } catch (error) {
    console.error('Error loading medicines:', error);
  }
}

// Handle Doctor Search
function handleDoctorSearch() {
  const searchTerm = document.getElementById('doctor_search').value.toLowerCase().trim();
  const dropdown = document.getElementById('doctor_dropdown');
  
  if (searchTerm.length === 0) {
    dropdown.classList.add('hidden');
    return;
  }
  
  const filtered = allDoctors.filter(doctor => 
    doctor.doctor_full_name.toLowerCase().includes(searchTerm) ||
    doctor.license_no.toString().includes(searchTerm)
  );
  
  if (filtered.length === 0) {
    dropdown.innerHTML = '<div class="p-3 text-gray-500 text-sm">No doctors found</div>';
    dropdown.classList.remove('hidden');
    return;
  }
  
  dropdown.innerHTML = filtered.map(doctor => `
    <div 
      class="doctor-option px-4 py-2 hover:bg-pink-50 cursor-pointer border-b" 
      style="border-color: #f8bbd0;"
      data-id="${doctor.doctor_id}"
      data-name="${escapeHtml(doctor.doctor_full_name)}"
    >
      <div class="font-medium" style="color: #ad1457;">${escapeHtml(doctor.doctor_full_name)}</div>
      <div class="text-xs text-gray-600">License: ${doctor.license_no}</div>
    </div>
  `).join('');
  
  dropdown.classList.remove('hidden');
  
  // Attach click listeners
  dropdown.querySelectorAll('.doctor-option').forEach(option => {
    option.addEventListener('click', () => {
      const id = option.dataset.id;
      const name = option.dataset.name;
      document.getElementById('doctor_id').value = id;
      document.getElementById('doctor_search').value = name;
      dropdown.classList.add('hidden');
    });
  });
}

// Handle Customer Search
function handleCustomerSearch() {
  const searchTerm = document.getElementById('customer_search').value.toLowerCase().trim();
  const dropdown = document.getElementById('customer_dropdown');
  
  if (searchTerm.length === 0) {
    dropdown.classList.add('hidden');
    return;
  }
  
  const filtered = allCustomers.filter(customer => 
    customer.full_name.toLowerCase().includes(searchTerm) ||
    customer.customer_id.toString().includes(searchTerm) ||
    customer.contact.includes(searchTerm)
  );
  
  if (filtered.length === 0) {
    dropdown.innerHTML = '<div class="p-3 text-gray-500 text-sm">No customers found</div>';
    dropdown.classList.remove('hidden');
    return;
  }
  
  dropdown.innerHTML = filtered.map(customer => `
    <div 
      class="customer-option px-4 py-2 hover:bg-pink-50 cursor-pointer border-b" 
      style="border-color: #f8bbd0;"
      data-id="${customer.customer_id}"
      data-name="${escapeHtml(customer.full_name)}"
    >
      <div class="font-medium" style="color: #ad1457;">${escapeHtml(customer.full_name)}</div>
      <div class="text-xs text-gray-600">ID: ${customer.customer_id} | Contact: ${escapeHtml(customer.contact)}</div>
    </div>
  `).join('');
  
  dropdown.classList.remove('hidden');
  
  // Attach click listeners
  dropdown.querySelectorAll('.customer-option').forEach(option => {
    option.addEventListener('click', () => {
      const id = option.dataset.id;
      const name = option.dataset.name;
      document.getElementById('customer_id').value = id;
      document.getElementById('customer_search').value = name;
      dropdown.classList.add('hidden');
    });
  });
}

// Handle Search
function handleSearch() {
  applyFilters();
}

// Apply Filters
function applyFilters() {
  let filtered = [...allPrescriptions];
  
  // Search filter by customer name
  const searchTerm = searchInput.value.toLowerCase().trim();
  if (searchTerm) {
    filtered = filtered.filter(prescription => {
      const customer = allCustomers.find(c => c.customer_id === prescription.customer_id);
      if (customer && customer.full_name.toLowerCase().includes(searchTerm)) {
        return true;
      }
      return prescription.prescription_id.toString().includes(searchTerm);
    });
  }
  
  filteredPrescriptions = filtered;
  renderPrescriptions();
}

// Render Prescriptions
function renderPrescriptions() {
  if (filteredPrescriptions.length === 0) {
    prescriptionList.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }
  
  emptyState.classList.add('hidden');
  prescriptionList.innerHTML = filteredPrescriptions.map(prescription => createPrescriptionCard(prescription)).join('');
  
  // Attach event listeners
  attachCardEventListeners();
}

// Create Prescription Card
function createPrescriptionCard(prescription) {
  const customer = allCustomers.find(c => c.customer_id === prescription.customer_id);
  const doctor = allDoctors.find(d => d.doctor_id === prescription.doctor_id);
  const issueDate = prescription.issue_date ? formatDate(prescription.issue_date) : 'N/A';
  const status = prescription.status || 'incomplete';
  const statusClass = status === 'complete' ? 'status-complete' : 'status-incomplete';
  const statusText = status === 'complete' ? 'Complete' : 'Not Complete';
  
  return `
    <div class="prescription-card rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
      <div class="flex justify-between items-start mb-4">
        <div>
          <h3 class="text-xl font-bold mb-1" style="color: #ad1457;">Prescription #${prescription.prescription_id}</h3>
          <p class="text-sm text-gray-600">${issueDate}</p>
        </div>
        <span class="px-3 py-1 rounded-full text-xs font-bold ${statusClass}">${statusText}</span>
      </div>
      
      <div class="space-y-2 mb-4">
        <div class="flex justify-between">
          <span class="text-gray-600">Customer:</span>
          <span class="font-medium" style="color: #ad1457;">${customer ? `${escapeHtml(customer.full_name)} (ID: ${customer.customer_id})` : `N/A (ID: ${prescription.customer_id})`}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">Doctor:</span>
          <span class="font-medium" style="color: #ad1457;">${doctor ? `${escapeHtml(doctor.doctor_full_name)} (ID: ${doctor.doctor_id})` : `N/A (ID: ${prescription.doctor_id})`}</span>
        </div>
        ${prescription.notes ? `
        <div class="flex justify-between">
          <span class="text-gray-600">Notes:</span>
          <span class="font-medium text-sm" style="color: #ad1457;">${escapeHtml(prescription.notes.substring(0, 30))}${prescription.notes.length > 30 ? '...' : ''}</span>
        </div>
        ` : ''}
      </div>
      
      <div class="flex flex-wrap gap-2 mt-4">
        <button 
          class="view-btn flex-1 px-4 py-2 rounded-lg text-sm font-semibold btn-secondary"
          data-id="${prescription._id}"
        >
          View
        </button>
        <button 
          class="status-btn flex-1 px-4 py-2 rounded-lg text-sm font-semibold btn-primary"
          data-id="${prescription._id}"
          data-prescription-id="${prescription.prescription_id}"
          data-status="${status}"
        >
          Update Status
        </button>
      </div>
    </div>
  `;
}

// Attach Card Event Listeners
function attachCardEventListeners() {
  // View buttons
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const prescription = allPrescriptions.find(p => p._id === id);
      if (prescription) viewPrescriptionDetails(prescription);
    });
  });
  
  // Status buttons
  document.querySelectorAll('.status-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentStatusId = btn.dataset.id;
      document.getElementById('statusPrescriptionId').textContent = btn.dataset.prescriptionId;
      document.getElementById('statusSelect').value = btn.dataset.status;
      statusModal.classList.remove('hidden');
    });
  });
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

// Initialize Flatpickr Date Picker
function initializeDatePicker() {
  const dateInput = document.getElementById('issue_date');
  if (dateInput && typeof flatpickr !== 'undefined') {
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

// Open Prescription Modal
function openPrescriptionModal() {
  prescriptionItems = [];
  itemCounter = 0;
  document.getElementById('modalTitle').textContent = 'Add New Prescription';
  prescriptionForm.reset();
  document.getElementById('prescriptionMongoId').value = '';
  document.getElementById('doctor_id').value = '';
  document.getElementById('customer_id').value = '';
  document.getElementById('doctor_search').value = '';
  document.getElementById('customer_search').value = '';
  document.getElementById('doctor_dropdown').classList.add('hidden');
  document.getElementById('customer_dropdown').classList.add('hidden');
  document.getElementById('itemsList').innerHTML = '';
  prescriptionModal.classList.remove('hidden');
  setTimeout(() => {
    initializeDatePicker();
  }, 100);
}

// Close Prescription Modal
function closePrescriptionModal() {
  prescriptionModal.classList.add('hidden');
  prescriptionForm.reset();
  document.getElementById('doctor_id').value = '';
  document.getElementById('customer_id').value = '';
  document.getElementById('doctor_search').value = '';
  document.getElementById('customer_search').value = '';
  document.getElementById('doctor_dropdown').classList.add('hidden');
  document.getElementById('customer_dropdown').classList.add('hidden');
  prescriptionItems = [];
  document.getElementById('itemsList').innerHTML = '';
}

// Add Prescription Item
function addPrescriptionItem() {
  itemCounter++;
  const itemHtml = `
    <div class="item-row bg-gray-50 p-4 rounded-lg border-2" style="border-color: #f8bbd0;" data-item-id="${itemCounter}">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium mb-2" style="color: #ad1457;">Medicine *</label>
          <select 
            class="item-medicine w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:border-pink-400"
            style="border-color: #f8bbd0;"
            required
          >
            <option value="">Select Medicine</option>
            ${allMedicines.map(med => `<option value="${med.medicine_id}">${escapeHtml(med.name)} - ${escapeHtml(med.brand)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium mb-2" style="color: #ad1457;">Dosage *</label>
          <input 
            type="text" 
            class="item-dosage w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:border-pink-400"
            style="border-color: #f8bbd0;"
            placeholder="e.g., 1 tablet 3 times daily"
            required
          />
        </div>
        <div class="flex items-end">
          <div class="flex-1 mr-2">
            <label class="block text-sm font-medium mb-2" style="color: #ad1457;">Quantity *</label>
            <input 
              type="number" 
              class="item-quantity w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:border-pink-400"
              style="border-color: #f8bbd0;"
              min="1"
              required
            />
          </div>
          <button 
            type="button"
            class="remove-item-btn px-4 py-2 rounded-lg text-sm font-semibold btn-danger"
            data-item-id="${itemCounter}"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  `;
  
  const itemsList = document.getElementById('itemsList');
  itemsList.insertAdjacentHTML('beforeend', itemHtml);
  
  // Attach remove button listener
  document.querySelector(`.remove-item-btn[data-item-id="${itemCounter}"]`).addEventListener('click', function() {
    this.closest('.item-row').remove();
  });
}

// View Prescription Details
async function viewPrescriptionDetails(prescription) {
  const customer = allCustomers.find(c => c.customer_id === prescription.customer_id);
  const doctor = allDoctors.find(d => d.doctor_id === prescription.doctor_id);
  const issueDate = prescription.issue_date ? formatDate(prescription.issue_date) : 'N/A';
  const status = prescription.status || 'incomplete';
  const statusText = status === 'complete' ? 'Complete' : 'Not Complete';
  
  // Load prescription items
  let itemsHtml = '<p class="text-gray-500">Loading items...</p>';
  try {
    const response = await fetch(`${PRESCRIPTION_API}/${prescription._id}/items`);
    if (response.ok) {
      const items = await response.json();
      if (items.length > 0) {
        itemsHtml = items.map(item => {
          const medicine = allMedicines.find(m => m.medicine_id === item.medicine_id);
          return `
            <div class="bg-gray-50 p-3 rounded-lg mb-2">
              <div class="flex justify-between">
                <span class="font-medium">${medicine ? escapeHtml(medicine.name) : item.medicine_id}</span>
                <span class="text-sm text-gray-600">Qty: ${item.quantity}</span>
              </div>
              <p class="text-sm text-gray-600 mt-1">Dosage: ${escapeHtml(item.dosage)}</p>
            </div>
          `;
        }).join('');
      } else {
        itemsHtml = '<p class="text-gray-500">No items found</p>';
      }
    }
  } catch (error) {
    itemsHtml = '<p class="text-red-500">Error loading items</p>';
  }
  
  const detailsHtml = `
    <div class="space-y-4">
      <div>
        <h3 class="text-lg font-semibold mb-2" style="color: #ad1457;">Prescription #${prescription.prescription_id}</h3>
        <div class="space-y-2">
          <div class="flex justify-between">
            <span class="text-gray-600">Issue Date:</span>
            <span class="font-medium" style="color: #ad1457;">${issueDate}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Status:</span>
            <span class="font-medium ${status === 'complete' ? 'status-complete' : 'status-incomplete'} px-3 py-1 rounded-full text-xs">${statusText}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Customer:</span>
            <span class="font-medium" style="color: #ad1457;">${customer ? `${escapeHtml(customer.full_name)} (ID: ${customer.customer_id})` : `N/A (ID: ${prescription.customer_id})`}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Doctor:</span>
            <span class="font-medium" style="color: #ad1457;">${doctor ? `${escapeHtml(doctor.doctor_full_name)} (ID: ${doctor.doctor_id})` : `N/A (ID: ${prescription.doctor_id})`}</span>
          </div>
          ${prescription.notes ? `
          <div class="flex justify-between">
            <span class="text-gray-600">Notes:</span>
            <span class="font-medium text-sm" style="color: #ad1457;">${escapeHtml(prescription.notes)}</span>
          </div>
          ` : ''}
        </div>
      </div>
      
      <div>
        <h3 class="text-lg font-semibold mb-2" style="color: #ad1457;">Prescription Items</h3>
        <div>${itemsHtml}</div>
      </div>
    </div>
  `;
  
  document.getElementById('prescriptionDetails').innerHTML = detailsHtml;
  viewModal.classList.remove('hidden');
}

// Close View Modal
function closeViewModalFunc() {
  viewModal.classList.add('hidden');
}

// Handle Status Update
async function handleStatusUpdate() {
  const status = document.getElementById('statusSelect').value;
  
  try {
    const response = await fetch(`${PRESCRIPTION_API}/${currentStatusId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update status');
    }
    
    closeStatusModalFunc();
    await loadPrescriptions();
    showSuccess('Status updated successfully');
  } catch (error) {
    console.error('Error updating status:', error);
    alert('Error: ' + error.message);
  }
}

// Close Status Modal
function closeStatusModalFunc() {
  statusModal.classList.add('hidden');
  currentStatusId = null;
}

// Handle Form Submit
async function handleFormSubmit(e) {
  e.preventDefault();
  
  // Collect prescription items
  const items = [];
  document.querySelectorAll('.item-row').forEach(row => {
    const medicineId = row.querySelector('.item-medicine').value;
    const dosage = row.querySelector('.item-dosage').value;
    const quantity = row.querySelector('.item-quantity').value;
    
    if (medicineId && dosage && quantity) {
      items.push({
        medicine_id: medicineId,
        dosage: dosage,
        quantity: parseInt(quantity),
      });
    }
  });
  
  if (items.length === 0) {
    alert('Please add at least one prescription item');
    return;
  }
  
  const doctorId = document.getElementById('doctor_id').value;
  const customerId = document.getElementById('customer_id').value;
  
  if (!doctorId) {
    alert('Please select a doctor');
    return;
  }
  
  if (!customerId) {
    alert('Please select a customer');
    return;
  }
  
  const prescriptionData = {
    prescription_id: parseInt(document.getElementById('prescription_id').value),
    customer_id: parseInt(customerId),
    doctor_id: parseInt(doctorId),
    issue_date: document.getElementById('issue_date').value,
    notes: document.getElementById('notes').value || '',
    items: items,
  };
  
  try {
    const response = await fetch(PRESCRIPTION_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prescriptionData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to save prescription');
    }
    
    closePrescriptionModal();
    await loadPrescriptions();
    showSuccess('Prescription added successfully');
  } catch (error) {
    console.error('Error saving prescription:', error);
    alert('Error: ' + error.message);
  }
}

// Utility Functions
function showLoading(show) {
  if (show) {
    loadingIndicator.classList.remove('hidden');
    prescriptionList.classList.add('hidden');
  } else {
    loadingIndicator.classList.add('hidden');
    prescriptionList.classList.remove('hidden');
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

