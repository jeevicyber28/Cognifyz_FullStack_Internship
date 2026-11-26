document.addEventListener("DOMContentLoaded", () => {
  const navbar = document.querySelector(".fp-navbar");
  window.addEventListener("scroll", () => {
    navbar.classList.toggle("scrolled", window.scrollY > 12);
  });

  const filterButtons = document.querySelectorAll(".fp-filter-btn");
  const roastItems = document.querySelectorAll(".roast-item");

  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const target = btn.dataset.filter;
      roastItems.forEach((item) => {
        const matches = target === "all" || item.dataset.profile === target;
        item.classList.toggle("is-hidden", !matches);
        item.classList.toggle("is-visible", matches);
      });
    });
  });

  const brewModalEl = document.getElementById("brewModal");
  const brewModal = brewModalEl && window.bootstrap ? new window.bootstrap.Modal(brewModalEl) : null;

  function setDefaultBookingDate() {
    const dateInput = document.getElementById("bookDate");
    if (dateInput) {
      const soon = new Date();
      soon.setDate(soon.getDate() + 3);
      dateInput.value = soon.toISOString().slice(0, 10);
    }
  }

  document.querySelectorAll(".brew-modal-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.getElementById("modalCoffeeName").textContent = btn.dataset.name;
      document.getElementById("modalDose").textContent = btn.dataset.dose;
      document.getElementById("modalWater").textContent = btn.dataset.water;
      document.getElementById("modalTemp").textContent = btn.dataset.temp;
      document.getElementById("modalTime").textContent = btn.dataset.time;
      if (brewModal) {
        brewModal.show();
      }
    });
  });

  setDefaultBookingDate();

  const tastingForm = document.getElementById("tastingForm");
  const feedback = document.getElementById("bookingFeedback");

  tastingForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    feedback.textContent = "Submitting request...";
    feedback.className = "small text-muted";

    try {
      const response = await fetch("/api/tasting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: document.getElementById("bookName").value,
          email: document.getElementById("bookEmail").value,
          date: document.getElementById("bookDate").value,
          guests: Number(document.getElementById("bookGuests").value),
          roastPreference: document.getElementById("bookPref").value
        })
      });

      const data = await response.json();
      if (!response.ok) {
        feedback.textContent = data.message || "Could not reserve seat.";
        feedback.className = "small text-danger fw-semibold";
        return;
      }

      feedback.textContent = data.message;
      feedback.className = "small text-success fw-semibold";
      tastingForm.reset();
      setDefaultBookingDate();
    } catch {
      feedback.textContent = "Network error while contacting server.";
      feedback.className = "small text-danger fw-semibold";
    }
  });
});
