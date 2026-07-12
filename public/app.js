const app = document.getElementById('app');
const params = new URLSearchParams(window.location.search);
const locationId = params.get('locationId');

let pollTimer = null;

function renderMissingLocation() {
  app.innerHTML = `
    <div class="state-icon">⚠️</div>
    <h1>Missing location</h1>
    <p class="sub">This page must be opened from inside your GHL sub-account menu.</p>
  `;
}

function renderForm() {
  app.innerHTML = `
    <h1>Get started with ProjectScoutIQ</h1>
    <p class="sub">Fill in your details to request access. We'll review and confirm shortly.</p>
    <form id="access-form">
      <label>Name</label>
      <input type="text" name="name" required />
      <label>Email</label>
      <input type="email" name="email" required />
      <label>Phone</label>
      <input type="tel" name="phone" />
      <label>Website</label>
      <input type="url" name="website" placeholder="https://" />
      <button type="submit">Submit request</button>
      <p class="error" id="form-error">Something went wrong. Please try again.</p>
    </form>
  `;

  document.getElementById('access-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    btn.textContent = 'Submitting...';

    const formData = new FormData(e.target);
    const payload = {
      locationId,
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      website: formData.get('website')
    };

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('submit failed');
      renderPending();
      startPolling();
    } catch (err) {
      document.getElementById('form-error').style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Submit request';
    }
  });
}

function renderPending() {
  app.innerHTML = `
    <div class="spinner"></div>
    <h1>Reviewing your details</h1>
    <p class="sub">We're checking your request. This page will update automatically once there's a decision - no need to refresh.</p>
  `;
}

function renderRejected() {
  app.innerHTML = `
    <div class="state-icon">🚫</div>
    <h1>Access not approved</h1>
    <p class="sub">Sorry, you're not approved to use this app right now. Contact us if you think this is a mistake.</p>
  `;
}

async function renderApproved() {
  app.innerHTML = `<div class="spinner"></div>`;
  try {
    const res = await fetch('/api/config');
    const { calculatorUrl } = await res.json();
    app.innerHTML = `<iframe class="calculator" src="${calculatorUrl}?locationId=${encodeURIComponent(locationId)}"></iframe>`;
  } catch (err) {
    app.innerHTML = `<p class="sub">Approved, but we couldn't load the calculator. Please refresh.</p>`;
  }
}

async function checkStatus() {
  try {
    const res = await fetch(`/api/status?locationId=${encodeURIComponent(locationId)}`);
    const data = await res.json();

    if (data.status === 'none') {
      stopPolling();
      renderForm();
    } else if (data.status === 'pending') {
      renderPending();
    } else if (data.status === 'approved') {
      stopPolling();
      renderApproved();
    } else if (data.status === 'rejected') {
      stopPolling();
      renderRejected();
    }
  } catch (err) {
    console.error('Status check failed', err);
  }
}

function startPolling() {
  stopPolling();
  pollTimer = setInterval(checkStatus, 15000);
}

function stopPolling() {
  if (pollTimer) clearInterval(pollTimer);
}

if (!locationId) {
  renderMissingLocation();
} else {
  checkStatus().then(() => {
    fetch(`/api/status?locationId=${encodeURIComponent(locationId)}`)
      .then(r => r.json())
      .then(d => { if (d.status === 'pending') startPolling(); });
  });
}
