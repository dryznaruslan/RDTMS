// ======================= Supabase Config =======================
const SUPABASE_URL = "https://bbmpgjwvkyafozzllrce.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Txq1RqxRKdpEqxgNqUdh6g_vfAZMh0E";

// IMPORTANT: use `sb`, not `supabase`
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ======================= DOM Elements =======================
const authCard = document.querySelector('#authCard');
const appArea = document.querySelector('#appArea');

const authEmail = document.querySelector('#authEmail');
const authPassword = document.querySelector('#authPassword');
const signUpBtn = document.querySelector('#signUpBtn');
const signInBtn = document.querySelector('#signInBtn');
const signOutBtn = document.querySelector('#signOutBtn');
const authMsg = document.querySelector('#authMsg');

const btnAdd = document.querySelector('#addBtn');
const cancelBtn = document.querySelector('#cancelBtn');
const sortSelect = document.querySelector('#sortSelect');

const tableBody = document.querySelector('#loadTable tbody');

const LoadNumberInput = document.querySelector('#Load_Number');
const PickUpStateInput = document.querySelector('#Pick_Up_State');
const DeliveryStateInput = document.querySelector('#Delivery_State');
const PickUpDateInput = document.querySelector('#Pick_Up_Date');
const DeliveryDateInput = document.querySelector('#Delivery_Date');
const PriceInput = document.querySelector('#Price');

let editingId = null;
let currentUserId = null;

// ======================= Helpers =======================
function showMessage(msg = "", type = "info") {
  authMsg.textContent = msg;
  authMsg.dataset.type = type;
}

function setSignedInUI(isSignedIn) {
  signOutBtn.classList.toggle('hidden', !isSignedIn);
  appArea.classList.toggle('hidden', !isSignedIn);
}

function formatDateMMDDYYYY(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${m}/${d}/${y}`;
}

function parseMoney(val) {
  return Number(String(val).replace(/[$,]/g, "")) || 0;
}

function formatMoney(val) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(val || 0);
}

function clearInputs() {
  LoadNumberInput.value = '';
  PickUpStateInput.value = '';
  DeliveryStateInput.value = '';
  PickUpDateInput.value = '';
  DeliveryDateInput.value = '';
  PriceInput.value = '';
}

function setAddMode() {
  editingId = null;
  btnAdd.textContent = "Add";
}

// ======================= Sorting + Rendering =======================
function sortLoads(loads) {
  const sortBy = sortSelect.value;
  return [...loads].sort((a, b) => {
    if (sortBy === "loadNumber") return Number(a.loadNumber) - Number(b.loadNumber);
    if (sortBy === "pickupDate") return new Date(a.pickUpDate) - new Date(b.pickUpDate);
    if (sortBy === "deliveryDate") return new Date(a.deliveryDate) - new Date(b.deliveryDate);
    return 0;
  });
}

function renderTable(loads) {
  tableBody.innerHTML = "";
  sortLoads(loads).forEach(load => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${load.loadNumber}</td>
      <td>${load.pickUpState}</td>
      <td>${load.deliveryState}</td>
      <td>${formatDateMMDDYYYY(load.pickUpDate)}</td>
      <td>${formatDateMMDDYYYY(load.deliveryDate)}</td>
      <td>${formatMoney(load.priceValue)}</td>
      <td>
        <button class="edit-btn" data-id="${load.id}">Edit</button>
        <button class="delete-btn" data-id="${load.id}">Delete</button>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

// ======================= Supabase CRUD =======================
async function fetchLoads() {
  if (!currentUserId) return [];

  const { data, error } = await sb
    .from('loads')
    .select('*')
    .eq('user_id', currentUserId);

  if (error) {
    showMessage(error.message, "error");
    return [];
  }

  return data.map(r => ({
    id: r.id,
    loadNumber: r.load_number,
    pickUpState: r.pickup_state,
    deliveryState: r.delivery_state,
    pickUpDate: r.pickup_date,
    deliveryDate: r.delivery_date,
    priceValue: r.price
  }));
}

async function refreshLoads() {
  const loads = await fetchLoads();
  renderTable(loads);
}

// ======================= Load Actions =======================
btnAdd.addEventListener('click', async () => {
  if (!currentUserId) return alert("Sign in first");

  const payload = {
    user_id: currentUserId,
    load_number: LoadNumberInput.value.trim(),
    pickup_state: PickUpStateInput.value.trim(),
    delivery_state: DeliveryStateInput.value.trim(),
    pickup_date: PickUpDateInput.value,
    delivery_date: DeliveryDateInput.value,
    price: parseMoney(PriceInput.value)
  };

  await sb.from('loads').insert(payload);
  clearInputs();
  refreshLoads();
});

tableBody.addEventListener('click', async e => {
  const id = e.target.dataset.id;
  if (!id) return;

  if (e.target.classList.contains("delete-btn")) {
    await sb.from('loads').delete().eq('id', id);
    refreshLoads();
  }
});

// ======================= Auth =======================
async function syncUser() {
  const { data } = await sb.auth.getUser();
  currentUserId = data?.user?.id || null;
  setSignedInUI(!!currentUserId);
}

signUpBtn.onclick = async () => {
  const { error } = await sb.auth.signUp({
    email: authEmail.value,
    password: authPassword.value
  });
  showMessage(error ? error.message : "Signed up. Now sign in.");
};

signInBtn.onclick = async () => {
  const { error } = await sb.auth.signInWithPassword({
    email: authEmail.value,
    password: authPassword.value
  });
  if (error) return showMessage(error.message, "error");
  await syncUser();
  refreshLoads();
};

signOutBtn.onclick = async () => {
  await sb.auth.signOut();
  tableBody.innerHTML = "";
  await syncUser();
};

// ======================= Init =======================
(async function init() {
  await syncUser();
  if (currentUserId) refreshLoads();
})();
