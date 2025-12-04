document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const errorMessage = document.getElementById("errorMessage");

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();

    // Get form values
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    // Hide error message
    errorMessage.classList.add("hidden");

    // Simple validation (for frontend only - no backend connection yet)
    if (username && password) {
      // Store login status (optional - for demo purposes)
      sessionStorage.setItem("sellerLoggedIn", "true");
      sessionStorage.setItem("sellerUsername", username);

      // Redirect to dashboard
      window.location.href = "dashboard.html";
    } else {
      // Show error message
      errorMessage.textContent = "Please fill in all fields";
      errorMessage.classList.remove("hidden");
    }
  });
});

