// doctor.js - เชื่อมกับ backend จริง

document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "http://localhost:8000";
  const DOCTOR_API = `${API_BASE}/doctors`;

  // -----------------------------
  // State
  // -----------------------------
  let doctors = []; // ข้อมูลจาก backend

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

  let selectedDoctorId = null;

  // -----------------------------
  // Load doctors from backend
  // -----------------------------
  async function loadDoctors() {
    try {
      const response = await fetch(DOCTOR_API);
      if (!response.ok) {
        throw new Error("Failed to fetch doctors");
      }
      doctors = await response.json();
      renderDoctorList(doctorSearchInput.value || "");
    } catch (error) {
      console.error("Error loading doctors:", error);
      alert("Failed to load doctors: " + error.message);
      doctors = [];
      renderDoctorList("");
    }
  }

  // -----------------------------
  // Render list
  // -----------------------------
  function renderDoctorList(keyword = "") {
    const term = keyword.trim().toLowerCase();

    const filtered = doctors.filter((d) => {
      if (!term) return true;

      const fullName = `${d.doctor_first_name || ""} ${d.doctor_last_name || ""}`.toLowerCase();
      const docId = String(d.doctor_id || "").toLowerCase();
      const license = (d.license_no || "").toLowerCase();

      return (
        docId.includes(term) ||
        fullName.includes(term) ||
        (d.doctor_first_name || "").toLowerCase().includes(term) ||
        (d.doctor_last_name || "").toLowerCase().includes(term) ||
        license.includes(term)
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
      const fullName = `Dr. ${doctor.doctor_first_name || ""} ${doctor.doctor_last_name || ""}`.trim();

      tr.className =
        "border-b hover:bg-pink-50 cursor-pointer transition-colors";

      tr.innerHTML = `
        <td class="py-2 px-3">${doctor.doctor_id || "-"}</td>
        <td class="py-2 px-3">${fullName || "Unknown"}</td>
        <td class="py-2 px-3">${doctor.license_no || "-"}</td>
      `;

      tr.addEventListener("click", () => {
        selectDoctor(doctor.doctor_id);
      });

      doctorTableBody.appendChild(tr);
    });
  }

  // -----------------------------
  // Selected doctor info
  // -----------------------------
  function selectDoctor(id) {
    const doctor = doctors.find((d) => d.doctor_id === id);
    if (!doctor) return;

    selectedDoctorId = doctor.doctor_id;
    const fullName = `Dr. ${doctor.doctor_first_name || ""} ${doctor.doctor_last_name || ""}`.trim();

    selectedDoctorBox.innerHTML = `
      <p><span class="font-semibold">Doctor ID:</span> ${doctor.doctor_id || "-"}</p>
      <p><span class="font-semibold">Full Name:</span> ${fullName || "Unknown"}</p>
      <p><span class="font-semibold">License No.:</span> ${doctor.license_no || "-"}</p>
    `;
  }

  // -----------------------------
  // Modal helpers
  // -----------------------------
  function openModal() {
    // Doctor ID จะถูก generate โดย backend (auto-increment)
    doctorIdInput.value = "Auto-generated";
    doctorFirstNameInput.value = "";
    doctorLastNameInput.value = "";
    licenseInput.value = "";
    if (usernameInput) usernameInput.value = "";
    if (passwordInput) passwordInput.value = "";
    doctorModal.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
  }

  function closeModal() {
    doctorModal.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
  }

  // -----------------------------
  // Form submit: add doctor (ส่งไป backend)
  // -----------------------------
  doctorForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const firstName = doctorFirstNameInput.value.trim();
    const lastName = doctorLastNameInput.value.trim();
    const licenseNumber = licenseInput.value.trim();
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!firstName || !lastName || !licenseNumber || !username || !password) {
      alert("Please fill in all required fields (First name, Last name, License number, Username, and Password).");
      return;
    }

    // check duplicate license (เช็คใน doctors array ที่โหลดมาแล้ว)
    const duplicate = doctors.find(
      (d) => (d.license_no || "").toLowerCase() === licenseNumber.toLowerCase()
    );
    if (duplicate) {
      alert(
        `Cannot add doctor. A doctor with this license number already exists:\n\n` +
          `Dr. ${duplicate.doctor_first_name} ${duplicate.doctor_last_name} (${duplicate.license_no})`
      );
      return;
    }

    try {
      const response = await fetch(DOCTOR_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          doctor_first_name: firstName,
          doctor_last_name: lastName,
          license_no: licenseNumber,
          username: username,
          password: password,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create doctor");
      }

      alert("Doctor added successfully!");
      await loadDoctors(); // reload จาก backend
      closeModal();
    } catch (error) {
      console.error("Error creating doctor:", error);
      alert("Error: " + error.message);
    }
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
  // Init: Load doctors from backend
  // -----------------------------
  loadDoctors();
});
