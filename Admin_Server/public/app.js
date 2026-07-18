const API_BASE = '/api/admin';
const tokenKey = 'proconnect_admin_token';

const state = {
  token: localStorage.getItem(tokenKey),
  filter: 'all',
  search: '',
  accounts: [],
  view: 'accounts',
  bookings: [],
  complaints: []
};

const loginView = document.getElementById('loginView');
const dashboardView = document.getElementById('dashboardView');
const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');
const adminName = document.getElementById('adminName');
const summaryGrid = document.getElementById('summaryGrid');
const accountsBody = document.getElementById('accountsBody');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const refreshButton = document.getElementById('refreshButton');
const logoutButton = document.getElementById('logoutButton');
const bookingsHeader = document.getElementById('bookingsHeader');
const bookingsTotal = document.getElementById('bookingsTotal');
const deleteAllBookings = document.getElementById('deleteAllBookings');
const backToAccounts = document.getElementById('backToAccounts');
const complaintsHeader = document.getElementById('complaintsHeader');
const complaintsTotal = document.getElementById('complaintsTotal');
const deleteAllComplaints = document.getElementById('deleteAllComplaints');
const backToAccountsFromComplaints = document.getElementById('backToAccountsFromComplaints');
const toast = document.getElementById('toast');
const navItems = document.querySelectorAll('.nav-item');
const topbarTitle = document.querySelector('.topbar h1');
const tableHead = document.querySelector('.table-panel thead');

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(data.Message || 'Request failed');
  }

  return data;
};

const showToast = (message) => {
  toast.textContent = message;
  toast.classList.remove('hidden');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.add('hidden'), 3200);
};

const setView = (isLoggedIn) => {
  loginView.classList.toggle('hidden', isLoggedIn);
  dashboardView.classList.toggle('hidden', !isLoggedIn);
  if (window.lucide) {
    window.lucide.createIcons();
  }
};

const formatDate = (value) => {
  if (!value) return 'N/A';
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  }).format(new Date(value));
};

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const renderSummary = (summary = {}) => {
  const items = [
    ['Users', summary.users || 0],
    ['Providers', summary.providers || 0],
    ['Pending Providers', summary.pendingProviders || 0],
    ['Bookings', summary.bookings || 0]
  ];

  summaryGrid.innerHTML = items.map(([label, value]) => `
    <article class="summary-item">
      <span>${label}</span>
      <strong>${value}</strong>
    </article>
  `).join('');
};

const roleBadge = (account) => {
  const role = account.type === 'provider' ? 'provider' : account.role || 'user';
  return `<span class="badge ${escapeHtml(role)}">${escapeHtml(role.toUpperCase())}</span>`;
};

const statusBadge = (account) => {
  if (account.type !== 'provider') {
    return '<span class="muted">N/A</span>';
  }

  return account.isActive
    ? '<span class="badge provider">ACTIVE</span>'
    : '<span class="badge pending">PENDING</span>';
};

const bookingStatusBadge = (value = '') => {
  const status = String(value || 'Pending');
  const className = status === 'Completed' || status === 'Released'
    ? 'provider'
    : status === 'Cancelled' || status === 'Disputed' || status === 'Refunded'
      ? 'danger'
      : 'pending';

  return `<span class="badge ${className}">${escapeHtml(status.toUpperCase())}</span>`;
};

const actionButtons = (account) => {
  const deleteAction = account.type === 'provider' ? 'delete-provider' : 'delete-user';
  const canDelete = account.role !== 'admin';
  const accountId = escapeHtml(account._id);
  const providerAction = account.type === 'provider'
    ? account.isActive
      ? `<button class="action-button" type="button" title="Deactivate provider" data-action="deactivate-provider" data-id="${accountId}"><i data-lucide="pause-circle"></i></button>`
      : `<button class="action-button success" type="button" title="Activate provider" data-action="activate-provider" data-id="${accountId}"><i data-lucide="check-circle"></i></button>`
    : '';
  const deleteButton = canDelete
    ? `<button class="action-button danger" type="button" title="Delete account" data-action="${deleteAction}" data-id="${accountId}"><i data-lucide="trash-2"></i></button>`
    : '';

  return `<div class="actions">${providerAction}${deleteButton}</div>`;
};

const renderAccounts = () => {
  if (state.view !== 'accounts') return;
  accountsBody.innerHTML = state.accounts.map((account) => `
    <tr>
      <td>
        <div class="account-name">${escapeHtml(account.name || 'Unnamed account')}</div>
        <div class="muted">${escapeHtml(account.phone || 'No phone')}</div>
      </td>
      <td>${escapeHtml(account.email || 'N/A')}</td>
      <td>${roleBadge(account)}</td>
      <td>${statusBadge(account)}</td>
      <td>${formatDate(account.createdAt)}</td>
      <td>${actionButtons(account)}</td>
    </tr>
  `).join('');

  emptyState.classList.toggle('hidden', state.accounts.length > 0);

  if (window.lucide) {
    window.lucide.createIcons();
  }
};

const renderBookings = () => {
  if (state.view !== 'bookings') return;
  accountsBody.innerHTML = state.bookings.map((b) => `
    <tr>
      <td>
        <div class="account-name">${escapeHtml(b.customerId?.name || b.customerId || 'Unknown')}</div>
        <div class="muted">${escapeHtml(b.customerId?.email || '')}</div>
      </td>
      <td>
        <div class="account-name">${escapeHtml(b.providerId?.name || b.providerId || 'Unknown')}</div>
        <div class="muted">${escapeHtml(b.providerId?.email || '')}</div>
      </td>
      <td>${escapeHtml(b.serviceCategory || '')}</td>
      <td>${formatDate(b.scheduledDate)}</td>
      <td>${bookingStatusBadge(b.status)}</td>
      <td>${bookingStatusBadge(b.paymentStatus)}</td>
      <td>${b.customerCompletionConfirmed ? '<span class="badge provider">CONFIRMED</span>' : '<span class="badge pending">WAITING</span>'}</td>
      <td>${b.paymentRelease?.releasedAmount ? `PKR ${escapeHtml(String(b.paymentRelease.releasedAmount))}` : '<span class="muted">Not released</span>'}</td>
      <td>${escapeHtml(String(b.charges || 0))}</td>
    </tr>
  `).join('');

  emptyState.classList.toggle('hidden', state.bookings.length > 0);
  if (window.lucide) window.lucide.createIcons();
};

const renderComplaints = () => {
  if (state.view !== 'complaints') return;
  
  // Calculate complaints per provider
  const complaintsPerProvider = {};
  state.complaints.forEach(c => {
    const pId = c.providerId ? String(c.providerId._id || c.providerId) : null;
    if (pId && pId !== 'undefined' && pId !== 'null') {
      complaintsPerProvider[pId] = (complaintsPerProvider[pId] || 0) + 1;
    }
  });

  accountsBody.innerHTML = state.complaints.map((c) => {
    const pId = c.providerId ? String(c.providerId._id || c.providerId) : null;
    const complaintCount = pId ? complaintsPerProvider[pId] : 0;
    
    return `
    <tr>
      <td>
        <div class="account-name">${escapeHtml(c.customerId?.name || c.customerId || 'Unknown')}</div>
        <div class="muted">Customer</div>
      </td>
      <td>
        <div class="account-name">${escapeHtml(c.providerId?.name || c.providerId || 'Unknown')}</div>
        <div class="muted">Provider</div>
      </td>
      <td><span class="badge ${c.TypeOfComplaint === 'other' ? 'pending' : 'danger'}">${escapeHtml(c.TypeOfComplaint)}</span></td>
      <td>${escapeHtml(c.message)}</td>
      <td>${bookingStatusBadge(c.status)}</td>
      <td>${formatDate(c.createdAt)}</td>
      <td>
        <div class="actions">
          ${pId ? `<button class="action-button danger" type="button" title="Warn Provider" data-action="warn-provider" data-id="${pId}" data-complaint-id="${c._id}"><i data-lucide="alert-triangle"></i></button>` : ''}
          ${pId && complaintCount >= 2 ? `<button class="action-button danger" type="button" title="Ban Provider (>= 2 complaints)" data-action="ban-provider" data-id="${pId}" style="margin-left:5px;"><i data-lucide="slash"></i></button>` : ''}
        </div>
      </td>
    </tr>
  `}).join('');

  emptyState.classList.toggle('hidden', state.complaints.length > 0);
  if (window.lucide) window.lucide.createIcons();
};

const loadDashboard = async () => {
  const query = new URLSearchParams({
    type: state.filter,
    search: state.search
  });

  const [meResult, summaryResult, accountsResult] = await Promise.all([
    request('/me'),
    request('/summary'),
    request(`/accounts?${query.toString()}`)
  ]);

  adminName.textContent = meResult.admin?.name ? `Admin: ${meResult.admin.name}` : 'Admin';
  renderSummary(summaryResult.summary);
  state.accounts = accountsResult.accounts || [];
  state.view = 'accounts';
  topbarTitle.textContent = 'Account Management';
  tableHead.innerHTML = `
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th class="actions-header">Actions</th>
                </tr>
  `;
  bookingsHeader?.classList.add('hidden');
  complaintsHeader?.classList.add('hidden');
  renderAccounts();
  setView(true);
};

const loadBookings = async () => {
  const data = await request('/allbooking');
  state.bookings = data.bookings || [];
  state.view = 'bookings';
  topbarTitle.textContent = 'Bookings';
  bookingsHeader?.classList.remove('hidden');
  if (bookingsTotal) {
    bookingsTotal.textContent = `Total: ${state.bookings.length}`;
  }
  tableHead.innerHTML = `
                <tr>
                  <th>Customer</th>
                  <th>Provider</th>
                  <th>Service</th>
                  <th>Scheduled</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Customer</th>
                  <th>Released</th>
                  <th>Charges</th>
                </tr>
  `;
  renderBookings();
  setView(true);
};

const loadComplaints = async () => {
  const data = await request('/complaints');
  state.complaints = data.complaints || [];
  state.view = 'complaints';
  topbarTitle.textContent = 'Complaints';
  bookingsHeader?.classList.add('hidden');
  complaintsHeader?.classList.remove('hidden');
  if (complaintsTotal) {
    complaintsTotal.textContent = `Total: ${state.complaints.length}`;
  }
  tableHead.innerHTML = `
                <tr>
                  <th>Customer</th>
                  <th>Provider</th>
                  <th>Issue Type</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th class="actions-header">Actions</th>
                </tr>
  `;
  renderComplaints();
  setView(true);
};

const handleDeleteAllBookings = async () => {
  if (state.bookings.length === 0) {
    showToast('No bookings to delete');
    return;
  }

  if (!window.confirm(`Delete all ${state.bookings.length} bookings? This cannot be undone.`)) {
    return;
  }

  try {
    deleteAllBookings.disabled = true;
    const data = await request('/allbooking', { method: 'DELETE' });
    state.bookings = [];
    await loadBookings();
    await loadDashboard();
    document.querySelector('.nav-item[data-view="bookings"]')?.classList.add('active');
    document.querySelector('.nav-item:not([data-view])')?.classList.remove('active');
    await loadBookings();
    showToast(data.Message || 'All bookings deleted');
  } catch (error) {
    showToast(error.message);
  } finally {
    deleteAllBookings.disabled = false;
  }
};

const handleDeleteAllComplaints = async () => {
  if (state.complaints.length === 0) {
    showToast('No complaints to delete');
    return;
  }

  if (!window.confirm(`Delete all ${state.complaints.length} complaints? This cannot be undone.`)) {
    return;
  }

  try {
    deleteAllComplaints.disabled = true;
    const data = await request('/complaints', { method: 'DELETE' });
    state.complaints = [];
    await loadComplaints();
    await loadDashboard();
    document.querySelector('.nav-item[data-view="complaints"]')?.classList.add('active');
    document.querySelector('.nav-item:not([data-view])')?.classList.remove('active');
    await loadComplaints();
    showToast(data.Message || 'All complaints deleted');
  } catch (error) {
    showToast(error.message);
  } finally {
    deleteAllComplaints.disabled = false;
  }
};

const logout = () => {
  state.token = '';
  localStorage.removeItem(tokenKey);
  setView(false);
};

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginMessage.textContent = '';

  const formData = new FormData(loginForm);
  try {
    const data = await request('/login', {
      method: 'POST',
      body: JSON.stringify({
        email: formData.get('email'),
        password: formData.get('password')
      })
    });

    state.token = data.token;
    localStorage.setItem(tokenKey, data.token);
    loginForm.reset();
    await loadDashboard();
    showToast(data.Message || 'Signed in');
  } catch (error) {
    loginMessage.textContent = error.message;
  }
});

document.querySelectorAll('.segment').forEach((button) => {
  button.addEventListener('click', async () => {
    document.querySelectorAll('.segment').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    state.filter = button.dataset.filter;
    await loadDashboard().catch((error) => showToast(error.message));
  });
});

navItems.forEach((btn) => {
  btn.addEventListener('click', async () => {
    navItems.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const view = btn.dataset.view || 'accounts';
    try {
      if (view === 'bookings') {
        await loadBookings();
      } else if (view === 'complaints') {
        await loadComplaints();
      } else {
        await loadDashboard();
      }
    } catch (error) {
      showToast(error.message);
    }
  });
});

let searchTimer;
searchInput.addEventListener('input', () => {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(async () => {
    state.search = searchInput.value.trim();
    await loadDashboard().catch((error) => showToast(error.message));
  }, 250);
});

accountsBody.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const { action, id } = button.dataset;
  const endpoints = {
    'activate-provider': ['PUT', `/providers/${id}/activate`, 'Provider activated'],
    'deactivate-provider': ['PUT', `/providers/${id}/deactivate`, 'Provider deactivated'],
    'delete-provider': ['DELETE', `/providers/${id}`, 'Provider deleted'],
    'delete-user': ['DELETE', `/users/${id}`, 'User deleted']
  };

  if (action === 'warn-provider') {
    const reason = window.prompt('Enter reason for warning this provider:', 'Violation of terms');
    if (reason === null) return; // User cancelled
    
    try {
      button.disabled = true;
      const complaintId = button.dataset.complaintId;
      await request(`/providers/${id}/warn`, { 
        method: 'PUT',
        body: JSON.stringify({ reason, complaintId })
      });
      await loadComplaints();
      showToast('Warning sent to provider');
    } catch (error) {
      showToast(error.message);
    } finally {
      button.disabled = false;
    }
    return;
  }

  if (action === 'ban-provider') {
    const reason = window.prompt('Enter reason for banning this provider (they have multiple complaints):', 'Multiple complaints received');
    if (reason === null) return;
    
    try {
      button.disabled = true;
      await request(`/providers/${id}/ban`, { 
        method: 'PUT',
        body: JSON.stringify({ reason })
      });
      await loadComplaints();
      showToast('Provider banned and email sent');
    } catch (error) {
      showToast(error.message);
    } finally {
      button.disabled = false;
    }
    return;
  }

  const selected = endpoints[action];
  if (!selected) return;

  if (action.startsWith('delete') && !window.confirm('Delete this account?')) {
    return;
  }

  try {
    await request(selected[1], { method: selected[0] });
    await loadDashboard();
    showToast(selected[2]);
  } catch (error) {
    showToast(error.message);
  }
});

refreshButton.addEventListener('click', () => {
  const runner = state.view === 'bookings' ? loadBookings : state.view === 'complaints' ? loadComplaints : loadDashboard;
  runner()
    .then(() => showToast('Dashboard refreshed'))
    .catch((error) => showToast(error.message));
});

deleteAllBookings?.addEventListener('click', handleDeleteAllBookings);
deleteAllComplaints?.addEventListener('click', handleDeleteAllComplaints);

backToAccounts?.addEventListener('click', async (event) => {
  event.preventDefault();
  navItems.forEach((b) => b.classList.remove('active'));
  document.querySelector('.nav-item:not([data-view])')?.classList.add('active');
  await loadDashboard().catch((error) => showToast(error.message));
});

backToAccountsFromComplaints?.addEventListener('click', async (event) => {
  event.preventDefault();
  navItems.forEach((b) => b.classList.remove('active'));
  document.querySelector('.nav-item:not([data-view])')?.classList.add('active');
  await loadDashboard().catch((error) => showToast(error.message));
});

logoutButton.addEventListener('click', logout);

if (state.token) {
  loadDashboard().catch(() => logout());
} else {
  setView(false);
}
