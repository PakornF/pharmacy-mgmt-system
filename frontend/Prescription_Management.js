// API Base URLs
const API_BASE = window.API_BASE || 'http://localhost:8000';
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
let itemCounter = 0;

// DOM Elements
const prescriptionList = document.getElementById('prescriptionList');
const searchInput = document.getElementById('searchInput');
const loadingIndicator = document.getElementById('loadingIndicator');
const emptyState = document.getElementById('emptyState');

// Modal Elements
const prescriptionModal = document.getElementById('prescriptionModal');
const viewModal = document.getElementById('viewModal');
const prescriptionForm = document.getElementById('prescriptionForm');
const addPrescriptionBtn = document.getElementById('addPrescriptionBtn');
const closeModal = document.getElementById('closeModal');
const closeViewModal = document.getElementById('closeViewModal');

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
  
  // Form submission
  prescriptionForm.addEventListener('submit', handleFormSubmit);
  
  // Add item button
  document.getElementById('addItemBtn').addEventListener('click', addPrescriptionItem);
  
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
    const doctors = await response.json();
    // สร้าง doctor_full_name จาก first_name + last_name
    allDoctors = doctors.map(d => ({
      ...d,
      doctor_full_name: `${d.doctor_first_name || ''} ${d.doctor_last_name || ''}`.trim() || 'Unknown'
    }));
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
  const searchTerm = document.getElementById('doctor_search').value.trim();
  const dropdown = document.getElementById('doctor_dropdown');
  
  if (searchTerm.length === 0) {
    dropdown.classList.add('hidden');
    return;
  }
  
  const searchLower = searchTerm.toLowerCase();
  const onlyDigits = (s) => (s || "").replace(/\D/g, "");
  const qDigits = onlyDigits(searchTerm);
  
  // ค้นหาจาก ID (ถ้าพิมพ์เป็นตัวเลข) หรือชื่อ หรือ license
  const filtered = allDoctors.filter(doctor => {
    const name = (doctor.doctor_full_name || '').toLowerCase();
    const firstName = (doctor.doctor_first_name || '').toLowerCase();
    const lastName = (doctor.doctor_last_name || '').toLowerCase();
    const license = (doctor.license_no || '').toString().toLowerCase();
    const docId = (doctor.doctor_id || '').toString();
    const docIdStr = docId.toLowerCase();
    
    // ถ้าพิมพ์เป็นตัวเลขล้วน ให้ลอง match กับ doctor_id ตรงเป๊ะก่อน
    if (qDigits && docId === qDigits) {
      return true;
    }
    
    // ค้นหาจากชื่อ, license, หรือ ID
    return (
      name.includes(searchLower) ||
      firstName.includes(searchLower) ||
      lastName.includes(searchLower) ||
      license.includes(searchLower) ||
      docIdStr.includes(searchLower)
    );
  });
  
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
      <div class="text-xs text-gray-600">
        ID: ${doctor.doctor_id} | License: ${doctor.license_no || '-'}
      </div>
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
  
  return `
    <div class="prescription-card rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
      <div class="flex justify-between items-start mb-4">
        <div>
          <h3 class="text-xl font-bold mb-1" style="color: #ad1457;">Prescription #${prescription.prescription_id}</h3>
          <p class="text-sm text-gray-600">${issueDate}</p>
        </div>
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

// Initialize Date Field (set to today, no picker needed)
function initializeDatePicker() {
  const dateInput = document.getElementById('issue_date');
  if (dateInput) {
    // Set to today's date in YYYY-MM-DD format
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    dateInput.value = `${year}-${month}-${day}`;
  }
}

// Open Prescription Modal
function openPrescriptionModal() {
  prescriptionItems = [];
  itemCounter = 0;
  document.getElementById('modalTitle').textContent = 'Add New Prescription';
  prescriptionForm.reset();
  document.getElementById('prescriptionMongoId').value = '';
  const prescriptionIdInput = document.getElementById('prescription_id');
  if (prescriptionIdInput) prescriptionIdInput.value = 'Auto-generated';
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
  const prescriptionIdInput = document.getElementById('prescription_id');
  if (prescriptionIdInput) prescriptionIdInput.value = 'Auto-generated';
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
  
  // Use items already loaded with the prescription (no extra fetch)
  const items = Array.isArray(prescription.items) ? prescription.items : [];
  let itemsHtml = '<p class="text-gray-500">No items found</p>';

  if (items.length > 0) {
    itemsHtml = items.map(item => {
      const medicine =
        item.medicine ||
        allMedicines.find(m => m.medicine_id === item.medicine_id);
      const medName = medicine
        ? escapeHtml(medicine.name || medicine.medicine_name || '')
        : item.medicine_id;
      return `
        <div class="bg-gray-50 p-3 rounded-lg mb-2">
          <div class="flex justify-between">
            <span class="font-medium">${medName}</span>
            <span class="text-sm text-gray-600">Qty: ${item.quantity}</span>
          </div>
          <p class="text-sm text-gray-600 mt-1">Dosage: ${escapeHtml(item.dosage || '')}</p>
        </div>
      `;
    }).join('');
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
  
  // ถ้า user พิมพ์ชื่อหมอหรือ ID ไว้ แต่ hidden doctor_id ยังว่าง
  // ให้ลอง match จาก allDoctors อัตโนมัติก่อน (เหมือน customer)
  let doctorId = document.getElementById('doctor_id').value;
  const doctorSearchVal = document.getElementById('doctor_search').value.trim();
  if (!doctorId && doctorSearchVal && allDoctors.length > 0) {
    const searchLower = doctorSearchVal.toLowerCase();
    const onlyDigits = (s) => (s || "").replace(/\D/g, "");
    const qDigits = onlyDigits(doctorSearchVal);

    // helper ตัดคำขึ้นต้น "dr." / "dr " ออก เพื่อให้ match ได้ง่ายขึ้น
    const normalizeName = (name) => {
      if (!name) return '';
      let n = name.trim();
      if (n.toLowerCase().startsWith('dr. ')) {
        n = n.slice(4);
      } else if (n.toLowerCase().startsWith('dr ')) {
        n = n.slice(3);
      }
      return n.trim();
    };

    let matchedDoctor = null;

    // 1) ถ้าพิมพ์เป็นตัวเลขล้วน ให้ลอง match กับ doctor_id ตรงเป๊ะก่อน
    if (qDigits) {
      matchedDoctor = allDoctors.find((d) => String(d.doctor_id) === qDigits);
    }

    // 2) ถ้ายังไม่เจอ ให้ลองหาแบบชื่อเต็มตรงกัน
    if (!matchedDoctor) {
      matchedDoctor = allDoctors.find((d) => {
        const full = (d.doctor_full_name || '').toLowerCase();
        const norm = normalizeName(d.doctor_full_name).toLowerCase();
        return full === searchLower || norm === searchLower;
      });
    }

    // 3) ถ้ายังไม่เจอ ให้ลองหาแบบ includes (user พิมพ์มาแค่บางส่วน)
    if (!matchedDoctor) {
      matchedDoctor = allDoctors.find((d) => {
        const full = (d.doctor_full_name || '').toLowerCase();
        const norm = normalizeName(d.doctor_full_name).toLowerCase();
        const firstName = (d.doctor_first_name || '').toLowerCase();
        const lastName = (d.doctor_last_name || '').toLowerCase();
        return (
          full.includes(searchLower) ||
          norm.includes(searchLower) ||
          firstName.includes(searchLower) ||
          lastName.includes(searchLower)
        );
      });
    }

    if (matchedDoctor) {
      doctorId = String(matchedDoctor.doctor_id);
      document.getElementById('doctor_id').value = doctorId;
      // sync ช่อง text ให้เป็นชื่อเต็มจากระบบด้วย
      document.getElementById('doctor_search').value =
        matchedDoctor.doctor_full_name || doctorSearchVal;
    }
  }

  const customerId = document.getElementById('customer_id').value;
  
  if (!doctorId) {
    alert('Please select a doctor');
    return;
  }
  
  if (!customerId) {
    alert('Please select a customer');
    return;
  }
  
  const prescriptionIdInput = document.getElementById('prescription_id');
  const parsedPrescriptionId = prescriptionIdInput
    ? parseInt(prescriptionIdInput.value, 10)
    : NaN;

  const prescriptionData = {
    customer_id: parseInt(customerId),
    doctor_id: parseInt(doctorId),
    issue_date: document.getElementById('issue_date').value,
    notes: document.getElementById('notes').value || '',
    items: items,
  };

  if (!Number.isNaN(parsedPrescriptionId)) {
    prescriptionData.prescription_id = parsedPrescriptionId;
  }
  
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
