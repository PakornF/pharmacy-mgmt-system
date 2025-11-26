console.log("script.js loaded");

const output = document.getElementById("output");

const getMedicinesbtn = document.getElementById("getMedicinesBtn");
const addMedicineBtn = document.getElementById("addMedicineBtn");
const addMedicineForm = document.getElementById("addMedicineForm");
const medicineForm = document.getElementById("medicineForm");
const closeFormBtn = document.getElementById("closeForm");

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
    name: document.getElementById("name").value,
    price: parseFloat(document.getElementById("price").value),
    quantity: parseInt(document.getElementById("quantity").value, 10),
    expiry_date: document.getElementById("expiry_date").value,
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
  } catch (err) {
    console.error("Error adding medicine:", err);
    output.textContent = "Error: " + err.message;
  }
});
