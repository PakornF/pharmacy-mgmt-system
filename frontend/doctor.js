// doctor.js

document.addEventListener("DOMContentLoaded", () => {
    // -----------------------------
    // Mock data (mod-data)
    // -----------------------------
    let doctors = [
      {
        id: "DOC-001",
        firstName: "Somchai",
        lastName: "Wong",
        licenseNumber: "LIC-123456",
      },
      {
        id: "DOC-002",
        firstName: "May",
        lastName: "Siriporn",
        licenseNumber: "LIC-987654",
      },
      {
        id: "DOC-003",
        firstName: "Kevin",
        lastName: "Chan",
        licenseNumber: "LIC-555111",
      },
    ];
  
    // -----------------------------
    // DOM elements
    // -----------------------------
    const doctorTableBody = document.getElementById("doctorTableBody");
    const doctorCount = document.getElementById("doctorCount");
    const doctorSearchInput = document.getElementById("doctorSearchInput");
    const selectedDoctorBox = document.getElementById("selectedDoctorBox");
  
    // modal + form
    const doctorModal = document.getElementById("doctorModal");
    const addDoctorBtn = document.getElementById("addDoctorBtn");
    const closeModalBtn = document.getElementById("closeModalBtn");
    const cancelModalBtn = document.getElementById("cancelModalBtn");
  
    const doctorForm = document.getElementById("doctorForm");
    const doctorIdInput = document.getElementById("doctorIdInput");
    const doctorFirstNameInput = document.getElementById("doctorFirstNameInput");
    const doctorLastNameInput = document.getElementById("doctorLastNameInput");
    const licenseInput = document.getElementById("licenseInput");
  
    let selectedDoctorId = null;
  
    // -----------------------------
    // Helper: generate next doctor ID
    // -----------------------------
    function generateNextDoctorId() {
      if (doctors.length === 0) return "DOC-001";
  
      let maxNum = 0;
      for (const d of doctors) {
        const num = parseInt((d.id || "").replace(/\D/g, ""), 10);
        if (!Number.isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
      const next = maxNum + 1;
      return "DOC-" + String(next).padStart(3, "0");
    }
  
    // -----------------------------
    // Render list
    // -----------------------------
    function renderDoctorList(keyword = "") {
      const term = keyword.trim().toLowerCase();
  
      const filtered = doctors.filter((d) => {
        if (!term) return true;
  
        const fullName = `dr ${d.firstName} ${d.lastName}`.toLowerCase();
        return (
          d.id.toLowerCase().includes(term) ||
          fullName.includes(term) ||
          d.licenseNumber.toLowerCase().includes(term)
        );
      });
  
      doctorTableBody.innerHTML = "";
      doctorCount.textContent = `${filtered.length} doctor(s)`;
  
      if (filtered.length === 0) {
        doctorTableBody.innerHTML = `
          <tr>
            <td colspan="3" class="py-3 px-3 text-center text-gray-400">
              No doctor found.
            </td>
          </tr>
        `;
        return;
      }
  
      filtered.forEach((doctor) => {
        const tr = document.createElement("tr");
        const fullName = `Dr. ${doctor.firstName} ${doctor.lastName}`;
  
        tr.className =
          "border-b hover:bg-pink-50 cursor-pointer transition-colors";
  
        tr.innerHTML = `
          <td class="py-2 px-3">${doctor.id}</td>
          <td class="py-2 px-3">${fullName}</td>
          <td class="py-2 px-3">${doctor.licenseNumber}</td>
        `;
  
        tr.addEventListener("click", () => {
          selectDoctor(doctor.id);
        });
  
        doctorTableBody.appendChild(tr);
      });
    }
  
    // -----------------------------
    // Selected doctor info
    // -----------------------------
    function selectDoctor(id) {
      const doctor = doctors.find((d) => d.id === id);
      if (!doctor) return;
  
      selectedDoctorId = doctor.id;
      const fullName = `Dr. ${doctor.firstName} ${doctor.lastName}`;
  
      selectedDoctorBox.innerHTML = `
        <p><span class="font-semibold">Doctor ID:</span> ${doctor.id}</p>
        <p><span class="font-semibold">Full Name:</span> ${fullName}</p>
        <p><span class="font-semibold">License No.:</span> ${
          doctor.licenseNumber
        }</p>
      `;
    }
  
    // -----------------------------
    // Modal helpers
    // -----------------------------
    function openModal() {
      doctorIdInput.value = generateNextDoctorId();
      doctorFirstNameInput.value = "";
      doctorLastNameInput.value = "";
      licenseInput.value = "";
      doctorModal.classList.remove("hidden");
      document.body.classList.add("overflow-hidden");
    }
  
    function closeModal() {
      doctorModal.classList.add("hidden");
      document.body.classList.remove("overflow-hidden");
    }
  
    // -----------------------------
    // Form submit: add doctor
    // -----------------------------
    doctorForm.addEventListener("submit", (e) => {
      e.preventDefault();
  
      const firstName = doctorFirstNameInput.value.trim();
      const lastName = doctorLastNameInput.value.trim();
      const licenseNumber = licenseInput.value.trim();
  
      if (!firstName || !lastName || !licenseNumber) {
        alert("Please fill in first name, last name and license number.");
        return;
      }
  
      // check duplicate license
      const duplicate = doctors.find(
        (d) => d.licenseNumber.toLowerCase() === licenseNumber.toLowerCase()
      );
      if (duplicate) {
        alert(
          `Cannot add doctor. A doctor with this license number already exists:\n\n` +
            `Dr. ${duplicate.firstName} ${duplicate.lastName} (${duplicate.licenseNumber})`
        );
        return;
      }
  
      const newDoctor = {
        id: doctorIdInput.value || generateNextDoctorId(), // ใช้ ID ที่โชว์ใน modal
        firstName,
        lastName,
        licenseNumber,
      };
  
      doctors.push(newDoctor);
      alert("Doctor added successfully.");
  
      renderDoctorList(doctorSearchInput.value || "");
      closeModal();
    });
  
    // -----------------------------
    // Events
    // -----------------------------
    doctorSearchInput.addEventListener("input", () => {
      renderDoctorList(doctorSearchInput.value);
    });
  
    if (addDoctorBtn) {
      addDoctorBtn.addEventListener("click", openModal);
    }
  
    closeModalBtn.addEventListener("click", closeModal);
  
    cancelModalBtn.addEventListener("click", (e) => {
      e.preventDefault();
      closeModal();
    });
  
    // click backdrop to close
    doctorModal.addEventListener("click", (e) => {
      if (e.target === doctorModal) {
        closeModal();
      }
    });
  
    // -----------------------------
    // Init
    // -----------------------------
    renderDoctorList();
});