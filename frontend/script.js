console.log("script.js loaded");

const btn = document.getElementById("getMedicinesBtn");
const output = document.getElementById("output");

btn.addEventListener("click", async () => {
  console.log("Button clicked");
  output.textContent = "Loading...";

  try {
    const res = await fetch("http://localhost:3000/medicines");
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