const app = document.getElementById("app");
const params = new URLSearchParams(window.location.search);
const locationId = params.get("locationId");

const brandHeader = `
  <div class="brand-row">
    <div class="brand-logo">LOGO</div>
    <div class="brand-label">Builder Logo</div>
  </div>
`;

function renderMissingLocation() {
  app.innerHTML = `
    <div class="card-header">${brandHeader}
      <h1>Missing location</h1>
      <p class="sub">This page must be opened from inside your GHL sub-account menu.</p>
    </div>
  `;
}

function renderForm() {
  app.innerHTML = `
    <div class="card-header">${brandHeader}
      <h1>Get your live embed</h1>
      <p class="sub">A few quick details so we can review and set you up.</p>
    </div>
    <div class="card-body">
      <div class="steps">
        <div class="step-dot active">1</div>
        <div class="step-line"></div>
        <div class="step-dot">2</div>
        <div class="step-label">Your details</div>
      </div>
      <form id="access-form">
        <label>Name</label>
        <input type="text" name="name" required />
        <label>Email</label>
        <input type="email" name="email" required />
        <label>Phone</label>
        <input type="tel" name="phone" />
        <label>Website</label>
        <input type="url" name="website" placeholder="https://" />
        <button class="primary" type="submit">Continue →</button>
        <p class="error" id="form-error">Something went wrong. Please try again.</p>
      </form>
      <div class="footer-row">
        <span class="footer-note">We'll only use this to review your access.</span>
        <span class="powered-by">Powered by <strong>ProjectScoutIQ</strong></span>
      </div>
    </div>
  `;

  document
    .getElementById("access-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector("button");
      btn.disabled = true;
      btn.textContent = "Submitting...";

      const formData = new FormData(e.target);
      const payload = {
        locationId,
        name: formData.get("name"),
        email: formData.get("email"),
        phone: formData.get("phone"),
        website: formData.get("website"),
      };

      try {
        const res = await fetch("/api/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("submit failed");
        // Show the calculator preview right away. The owner still gets notified
        // by email in the background and approves/rejects separately - that
        // decision doesn't gate this preview screen.
        renderCalculatorPreview();
      } catch (err) {
        document.getElementById("form-error").style.display = "block";
        btn.disabled = false;
        btn.textContent = "Continue →";
      }
    });
}

async function renderCalculatorPreview() {
  // No card chrome here - the calculator's own page already has its full
  // design (header, steps, footer). We just fill the frame with it directly.
  document.body.classList.add('calc-mode');
  app.className = '';
  app.innerHTML = `<div style="text-align:center;padding-top:120px;"><div class="spinner"></div></div>`;
  try {
    const res = await fetch('/api/config');
    const { calculatorUrl } = await res.json();
    app.innerHTML = `<iframe class="calc-view" src="${calculatorUrl}?locationId=${encodeURIComponent(locationId)}"></iframe>`;
  } catch (err) {
    app.innerHTML = `<p class="sub" style="padding:20px;text-align:center;">We couldn't load the preview. Please refresh.</p>`;
  }
}

async function checkStatus() {
  try {
    const res = await fetch(
      `/api/status?locationId=${encodeURIComponent(locationId)}`,
    );
    const data = await res.json();

    if (data.status === "none") {
      renderForm();
    } else {
      // pending, approved, or rejected - all show the preview.
      // The approval decision is tracked on the backend and emailed
      // separately; it doesn't change what's shown here.
      renderCalculatorPreview();
    }
  } catch (err) {
    console.error("Status check failed", err);
  }
}

if (!locationId) {
  renderMissingLocation();
} else {
  checkStatus();
}
