const layout = document.getElementById('app');
const params = new URLSearchParams(window.location.search);
const locationId = params.get('locationId');

const POLL_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

let pollTimer = null;

const brandHeader = `
  <div class="brand-row">
    <div class="brand-logo">LOGO</div>
    <div class="brand-label">Builder Logo</div>
  </div>
`;

const dotsLoader = `<div class="dots"><span></span><span></span><span></span></div>`;

const reviewIcon = `
  <div class="review-icon-wrap">
    <div class="review-ring"></div>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 3.5h6a1 1 0 0 1 1 1V5h1.5A1.5 1.5 0 0 1 19 6.5v13A1.5 1.5 0 0 1 17.5 21h-11A1.5 1.5 0 0 1 5 19.5v-13A1.5 1.5 0 0 1 6.5 5H8v-0.5a1 1 0 0 1 1-1Z"/>
      <path d="M8 5h8"/>
      <circle cx="12" cy="13.5" r="4"/>
      <path d="M12 11.7v1.8l1.3 1.1"/>
    </svg>
  </div>
`;

function renderMissingLocation() {
  layout.innerHTML = `
    <div class="panel status-panel">
      <div class="card-header">${brandHeader}
        <h1>Missing location</h1>
        <p class="sub">This page must be opened from inside your GHL sub-account menu.</p>
      </div>
    </div>
  `;
}

function ensureLayout() {
  if (document.getElementById('preview-panel')) return;
  layout.innerHTML = `
    <div class="panel status-panel" id="status-panel"></div>
    <div class="panel preview-panel" id="preview-panel">
      <div class="preview-loading">${dotsLoader}</div>
    </div>
  `;
  loadPreview();
}

async function loadPreview() {
  const preview = document.getElementById('preview-panel');
  try {
    const res = await fetch('/api/config');
    const { calculatorUrl } = await res.json();
    preview.innerHTML = `<iframe src="${calculatorUrl}?locationId=${encodeURIComponent(locationId)}"></iframe>`;
  } catch (err) {
    preview.innerHTML = `<p class="sub" style="padding:20px;text-align:center;margin:auto;">Preview unavailable right now.</p>`;
  }
}

function renderForm() {
  ensureLayout();
  document.getElementById('status-panel').innerHTML = `
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
      btn.textContent = 'Continue →';
    }
  });
}

function renderPending() {
  ensureLayout();
  document.getElementById('status-panel').innerHTML = `
    <div class="card-header">${brandHeader}
      <h1>Reviewing your details</h1>
      <p class="sub">We're reviewing your details now. Once approved, we'll send you the embed code for your live website.</p>
    </div>
    <div class="card-body">
      <div class="steps">
        <div class="step-dot">1</div>
        <div class="step-line"></div>
        <div class="step-dot active">2</div>
        <div class="step-label">Review</div>
      </div>
      <div class="center-state">
        ${reviewIcon}
        <p class="sub" style="margin-top:4px;">Checking your details</p>
      </div>
      <div class="footer-row">
        <span class="footer-note">This updates automatically - no need to refresh.</span>
        <span class="powered-by">Powered by <strong>ProjectScoutIQ</strong></span>
      </div>
    </div>
  `;
}

function renderApproved() {
  ensureLayout();
  document.getElementById('status-panel').innerHTML = `
    <div class="card-header">${brandHeader}
      <h1>You're approved</h1>
      <p class="sub">We'll send the embed code for your live website to your email shortly.</p>
    </div>
    <div class="card-body">
      <div class="center-state">
        <div class="state-icon">✅</div>
        <p class="sub">Try the preview on the right - that's exactly what your visitors will see.</p>
      </div>
    </div>
  `;
}

function renderRejected() {
  ensureLayout();
  document.getElementById('status-panel').innerHTML = `
    <div class="card-header">${brandHeader}
      <h1>Access not approved</h1>
      <p class="sub">Sorry, you're not approved to use this right now.</p>
    </div>
    <div class="card-body">
      <div class="center-state">
        <div class="state-icon">🚫</div>
        <p class="sub">Contact us if you think this is a mistake.</p>
      </div>
    </div>
  `;
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
  pollTimer = setInterval(checkStatus, POLL_INTERVAL_MS);
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