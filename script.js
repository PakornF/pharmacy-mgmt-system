console.log("script.js loaded");

const output = document.getElementById("output");

const getMedicinesbtn = document.getElementById("getMedicinesBtn");

const addMedicineBtn = document.getElementById("addMedicineBtn");
const addMedicineForm = document.getElementById("addMedicineForm");
const medicineForm = document.getElementById("medicineForm");
const closeFormBtn = document.getElementById("closeForm");

const deleteMedicineBtn = document.getElementById("deleteMedicineBtn");
const deleteMedicineForm = document.getElementById("deleteMedicineForm");
const deleteForm = document.getElementById("deleteForm");
const closeDeleteFormBtn = document.getElementById("closeDeleteForm");

getMedicinesbtn.addEventListener("click", async () => {
  console.log("Button clicked");
  output.textContent = "Loading...";

  try {
    const res = await fetch("http://localhost:8000/medicines");
    if (!res.ok) {
      throw new Error("Request failed with status " + res.status);
    }
    const data = await res.json();
    console.log("Data received:", data);
    output.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    console.error("Error fetching medicines:", err);
    output.textContent = "Error: " + err.message;
  }
});

addMedicineBtn.addEventListener("click", () => {
  addMedicineForm.classList.remove("hidden"); // Show the form
});

closeFormBtn.addEventListener("click", () => {
  addMedicineForm.classList.add("hidden"); // Hide the form
});

medicineForm.addEventListener("submit", async (event) => {
  event.preventDefault(); // Prevent default form submission behavior
  
  const medicineData = {
    medicine_id: document.getElementById("medicine_id").value,
    name: document.getElementById("medicine_name").value,
    brand: document.getElementById("medicine_brand").value,
    type: document.getElementById("medicine_type").value,
    price: parseFloat(document.getElementById("medicine_price").value),
    quantity: parseInt(document.getElementById("medicine_quantity").value, 10),
    supplier_id: parseInt(document.getElementById("medicine_supplier_id").value, 10),
  };

try {
    const res = await fetch("http://localhost:8000/medicines", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(medicineData),
    });

    if (!res.ok) {
      throw new Error("Failed to add medicine.");
    }

    const result = await res.json();
    console.log("Medicine added:", result);
    output.textContent = "Medicine added: " + JSON.stringify(result, null, 2);

    // Optionally, hide the form and clear the fields
    addMedicineForm.classList.add("hidden");
    medicineForm.reset();
  }
  catch (err) {
    console.error("Error adding medicine:", err);
    output.textContent = "Error: " + err.message;
  }
});

deleteMedicineBtn.addEventListener("click", () => {
  deleteMedicineForm.classList.remove("hidden");
});
closeDeleteFormBtn.addEventListener("click", () => {
  deleteMedicineForm.classList.add("hidden");
});
deleteForm.addEventListener("submit", async (event) => {event.preventDefault();
  const id = document.getElementById("delete_id").value.trim();
  if (!id) {
    alert("Please enter a valid Medicine ID.");
    return;
  }
  try {
    const res = await fetch(`http://localhost:8000/medicines/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      throw new Error("Failed to delete medicine.");
    }
    const result = await res.json();
    console.log("Medicine deleted:", result);
    output.textContent = "Medicine deleted: " + JSON.stringify(result, null, 2);
    deleteMedicineForm.classList.add("hidden");
    deleteForm.reset();
  }
  catch (err) {
    console.error("Error deleting medicine:", err);
    output.textContent = "Error: " + err.message;
  }
});
