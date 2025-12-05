document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const errorMessage = document.getElementById("errorMessage");

  const API_BASE = window.API_BASE || "http://localhost:8000";

  loginForm.addEventListener("submit", async(e) => {
    e.preventDefault();

    // Get form values
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    // Hide error message
    errorMessage.classList.add("hidden");

    // Simple validation (for frontend only - no backend connection yet)
    if (!username || !password) {
      errorMessage.textContent = "Please enter both username and password.";
      errorMessage.classList.remove("hidden");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/doctors/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.message || "Login failed";
        errorMessage.textContent = msg;
        errorMessage.classList.remove("hidden");
        return;
      }

      const data = await res.json();

      sessionStorage.setItem("doctorLoggedIn", "true");
      sessionStorage.setItem("doctorUsername", data.doctor.username);
      sessionStorage.setItem("doctorId", data.doctor.doctor_id);

      window.location.href = "Prescription_Management.html";
    } catch (err) {
      console.error("Login error:", err);
      errorMessage.textContent = "Cannot connect to server";
      errorMessage.classList.remove("hidden");
    }
  });
});
