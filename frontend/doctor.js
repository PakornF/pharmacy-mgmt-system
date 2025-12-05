// doctor.js

document.addEventListener("DOMContentLoaded", () => {
    const API_BASE = (window.API_BASE || "http://localhost:8000") + "/doctors";

    let doctors = [];
    let selectedDoctorId = null;
  
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
  
    const usernameInput = document.getElementById("usernameInput");
    const passwordInput = document.getElementById("passwordInput");
    const loadingText = document.getElementById("doctorLoadingText");
    const errorText = document.getElementById("doctorErrorText");
  
    // -----------------------------
    // Helper: generate next doctor ID
    // -----------------------------
    function formatDoctorId(num) {
      if (num === undefined || num === null) return "-";
      return `DOC-${String(num).padStart(3, "0")}`;
    }

    function generateNextDoctorId() {
      if (doctors.length === 0) return formatDoctorId(1);
      const maxNum = Math.max(...doctors.map((d) => d.doctor_id || 0));
      return formatDoctorId(maxNum + 1);
    }

    async function loadDoctors() {
      loadingText.classList.remove("hidden");
      errorText.classList.add("hidden");
      try {
        const res = await fetch(API_BASE);
        if (!res.ok) {
          throw new Error(`Failed to fetch doctors (status ${res.status})`);
        }
        doctors = await res.json();
        renderDoctorList(doctorSearchInput.value);
        // Pre-fill next ID in modal for display
        doctorIdInput.value = generateNextDoctorId();
      } catch (err) {
        console.error("Error fetching doctors:", err);
        errorText.textContent = err.message;
        errorText.classList.remove("hidden");
      } finally {
        loadingText.classList.add("hidden");
      }
    }
  
    // -----------------------------
    // Render list
    // -----------------------------
    function renderDoctorList(keyword = "") {
      const term = keyword.trim().toLowerCase();
  
      const filtered = doctors.filter((d) => {
        if (!term) return true;

        const fullName = `dr ${d.doctor_first_name || ""} ${d.doctor_last_name || ""}`.toLowerCase();
        return (
          formatDoctorId(d.doctor_id).toLowerCase().includes(term) ||
          fullName.includes(term) ||
          (d.license_no || "").toLowerCase().includes(term)
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
        const fullName = `Dr. ${doctor.doctor_first_name || ""} ${doctor.doctor_last_name || ""}`;

        tr.className =
          "border-b hover:bg-pink-50 cursor-pointer transition-colors";

        tr.innerHTML = `
          <td class="py-2 px-3">${formatDoctorId(doctor.doctor_id)}</td>
          <td class="py-2 px-3">${fullName}</td>
          <td class="py-2 px-3">${doctor.license_no || "-"}</td>
        `;

        tr.addEventListener("click", () => {
          selectDoctor(doctor._id);
        });
  
        doctorTableBody.appendChild(tr);
      });
    }
  
    // -----------------------------
    // Selected doctor info
    // -----------------------------
    function selectDoctor(id) {
      const doctor = doctors.find((d) => d._id === id);
      if (!doctor) return;

      selectedDoctorId = doctor._id;
      const fullName = `Dr. ${doctor.doctor_first_name || ""} ${doctor.doctor_last_name || ""}`;
  
      selectedDoctorBox.innerHTML = `
        <p><span class="font-semibold">Doctor ID:</span> ${formatDoctorId(doctor.doctor_id)}</p>
        <p><span class="font-semibold">Full Name:</span> ${fullName}</p>
        <p><span class="font-semibold">License No.:</span> ${
          doctor.license_no || "-"
        }</p>
        <p><span class="font-semibold">Username:</span> ${
          doctor.username || "-"
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
      usernameInput.value = "";
      passwordInput.value = "";
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
      const username = usernameInput.value.trim();
      const password = passwordInput.value.trim();

      if (!firstName || !lastName || !licenseNumber || !username || !password) {
        alert("Please fill in first name, last name, license number, username, and password.");
        return;
      }
      // check duplicate license
      const duplicate = doctors.find(
        (d) => (d.license_no || "").toLowerCase() === licenseNumber.toLowerCase()
      );
      if (duplicate) {
        alert(
          `Cannot add doctor. A doctor with this license number already exists:\n\n` +
            `Dr. ${duplicate.doctor_first_name || ""} ${duplicate.doctor_last_name || ""} (${duplicate.license_no})`
        );
        return;
      }

      const newDoctorPayload = {
        doctor_first_name: firstName,
        doctor_last_name: lastName,
        license_no: licenseNumber,
        username,
        password,
      };

      fetch(API_BASE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newDoctorPayload),
      })
        .then(async (res) => {
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.message || `Failed to create doctor (status ${res.status})`);
          }
          return res.json();
        })
        .then((created) => {
          doctors.push(created);
          renderDoctorList(doctorSearchInput.value || "");
          selectDoctor(created._id);
          closeModal();
          alert("Doctor added successfully.");
        })
        .catch((err) => {
          console.error("Error creating doctor:", err);
          alert(err.message || "Failed to create doctor.");
        });
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
    loadDoctors();
});
