// Supabase Configuration
const SUPABASE_URL = 'https://rxlpesdvskyytbfoufvp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4bHBlc2R2c2t5eXRiZm91ZnZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4ODkwNDksImV4cCI6MjA5MjQ2NTA0OX0.esek-Q3uxOvm27NNxvvsznUtC3-hZ6hsRwhMchWyasM';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let isSignUp = false;

// Initialization
async function init() {
    await checkUser();
    await loadCategories();
    await loadListings();
}

// Auth Logic
async function checkUser() {
    const { data: { session } } = await db.auth.getSession();
    currentUser = session?.user || null;
    updateUIForUser();
}

db.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user || null;
    updateUIForUser();
    if (event === 'SIGNED_IN') {
        hideModal('auth-modal');
        checkProfileOnboarding();
    }
});

function updateUIForUser() {
    const navActions = document.getElementById('nav-actions');
    if (currentUser) {
        navActions.innerHTML = `
            <button onclick="showProfile()" class="flex items-center gap-2 hover:bg-gray-100 p-2 rounded-xl transition-colors">
                <div class="w-8 h-8 bg-winjay-orange rounded-full flex items-center justify-center text-white font-bold text-xs">
                    ${currentUser.email[0].toUpperCase()}
                </div>
            </button>
            <button onclick="checkAuthAndPost()" class="bg-winjay-orange text-white px-5 py-2 rounded-full text-sm font-bold shadow-lg shadow-winjay-orange/20 hover:scale-105 transition-transform">+ Post Ad</button>
        `;
    }
}

async function handleAuth() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (isSignUp) {
        const { error } = await db.auth.signUp({ email, password });
        if (error) alert(error.message);
        else alert('Check your email for verification!');
    } else {
        const { error } = await db.auth.signInWithPassword({ email, password });
        if (error) alert(error.message);
    }
}

async function signInWithGoogle() {
    const { error } = await db.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin + window.location.pathname
        }
    });
    if (error) alert('Error: ' + error.message);
}

function toggleAuthMode() {
    isSignUp = !isSignUp;
    document.getElementById('auth-submit-btn').innerText = isSignUp ? 'Sign Up' : 'Sign In';
    document.getElementById('auth-toggle-link').innerText = isSignUp ? 'Sign In' : 'Sign Up';
}

// Data Loading
async function loadCategories() {
    const { data: categories } = await db.from('categories').select('*');
    const container = document.getElementById('category-list');
    if (!categories) return;

    container.innerHTML = categories.map(cat => `
        <button onclick="filterByCategory('${cat.id}')" class="flex flex-col items-center gap-2 min-w-[80px] group">
            <div class="w-16 h-16 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-2xl shadow-sm group-hover:border-winjay-orange group-hover:shadow-md transition-all">
                ${cat.icon}
            </div>
            <span class="text-xs font-medium text-gray-500 group-hover:text-winjay-orange">${cat.name}</span>
        </button>
    `).join('');
}

async function loadListings(filter = {}) {
    let query = db.from('listings').select('*, profiles(username, verified)').eq('status', 'active');
    
    if (filter.category_id) query = query.eq('category_id', filter.category_id);
    if (filter.search) query = query.ilike('title', `%${filter.search}%`);
    
    const { data: listings } = await query.order('created_at', { ascending: false });
    const container = document.getElementById('listings-grid');
    
    if (!listings || listings.length === 0) {
        container.innerHTML = '<div class="col-span-full text-center py-12"><i data-lucide="package-search" class="w-12 h-12 text-gray-300 mx-auto mb-4"></i><p class="text-gray-500">No listings found matching your criteria.</p></div>';
        lucide.createIcons();
        return;
    }

    container.innerHTML = listings.map(l => `
        <div class="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group" onclick="viewListing('${l.id}')">
            <div class="relative h-48 overflow-hidden">
                <img src="${l.images?.[0] || 'https://via.placeholder.com/400x300?text=No+Image'}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
                <div class="absolute top-3 left-3 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm">
                    ${l.condition || 'Used'}
                </div>
                ${l.profiles?.verified ? `
                    <div class="absolute top-3 right-3 bg-winjay-orange text-white p-1 rounded-full shadow-lg" title="Founding Verified User">
                        <i data-lucide="check" class="w-3 h-3"></i>
                    </div>
                ` : ''}
            </div>
            <div class="p-4">
                <div class="flex justify-between items-start mb-1">
                    <h3 class="font-bold text-gray-900 truncate flex-1 mr-2">${l.title}</h3>
                    <span class="winjay-orange font-bold text-sm whitespace-nowrap">${Number(l.price).toLocaleString()} DZD</span>
                </div>
                <div class="flex items-center gap-2 text-gray-400 text-xs mb-3">
                    <i data-lucide="map-pin" class="w-3 h-3"></i>
                    <span>${l.wilaya}</span>
                    <span>•</span>
                    <span>${timeAgo(l.created_at)}</span>
                </div>
                <div class="pt-3 border-t border-gray-50 flex items-center justify-between">
                    <span class="text-xs text-gray-500 font-medium flex items-center gap-1">
                        @${l.profiles?.username || 'user'}
                        ${l.profiles?.verified ? '<i data-lucide="badge-check" class="w-3 h-3 winjay-orange"></i>' : ''}
                    </span>
                    <div class="flex gap-2">
                        <button onclick="event.stopPropagation(); window.open('https://wa.me/213${l.profiles?.phone?.replace(/^0/, '')}', '_blank')" class="text-green-500 hover:bg-green-50 p-1.5 rounded-lg transition-colors">
                            <i data-lucide="message-circle" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

function filterByCategory(id) {
    loadListings({ category_id: id });
}

// Search listener
document.querySelector('input[placeholder*="Search"]').addEventListener('input', (e) => {
    const search = e.target.value.trim();
    if (search.length > 2 || search.length === 0) {
        loadListings({ search });
    }
});

function timeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m";
    return Math.floor(seconds) + "s";
}

// Profiles & Onboarding
async function checkProfileOnboarding() {
    if (!currentUser) return;
    const { data: profile } = await db.from('profiles').select('*').eq('id', currentUser.id).single();
    if (!profile || !profile.username || !profile.phone) {
        populateWilayaSelects();
        showModal('onboarding-modal');
    }
}

const WILAYAS = [
    "01 - Adrar", "02 - Chlef", "03 - Laghouat", "04 - Oum El Bouaghi", "05 - Batna", 
    "06 - Béjaïa", "07 - Biskra", "08 - Béchar", "09 - Blida", "10 - Bouira",
    "11 - Tamanrasset", "12 - Tébessa", "13 - Tlemcen", "14 - Tiaret", "15 - Tizi Ouzou",
    "16 - Alger", "17 - Djelfa", "18 - Jijel", "19 - Sétif", "20 - Saïda",
    "21 - Skikda", "22 - Sidi Bel Abbès", "23 - Annaba", "24 - Guelma", "25 - Constantine",
    "26 - Médéa", "27 - Mostaganem", "28 - M'Sila", "29 - Mascara", "30 - Ouargla",
    "31 - Oran", "32 - El Bayadh", "33 - Illizi", "34 - Bordj Bou Arréridj", "35 - Boumerdès",
    "36 - El Tarf", "37 - Tindouf", "38 - Tissemsilt", "39 - El Oued", "40 - Khenchela",
    "41 - Souk Ahras", "42 - Tipaza", "43 - Mila", "44 - Aïn Defla", "45 - Naâma",
    "46 - Aïn Témouchent", "47 - Ghardaïa", "48 - Relizane", "49 - Timimoun", "50 - Bordj Badji Mokhtar",
    "51 - Ouled Djellal", "52 - Béni Abbès", "53 - In Salah", "54 - In Guezzam", "55 - Touggourt",
    "56 - Djanet", "57 - El M'Ghair", "58 - El Meniaa"
];

function populateWilayaSelects() {
    const selects = ['setup-wilaya', 'ad-wilaya'];
    selects.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.children.length <= 1) {
            WILAYAS.forEach(w => {
                const opt = document.createElement('option');
                opt.value = w;
                opt.innerText = w;
                el.appendChild(opt);
            });
        }
    });
}

async function saveProfile() {
    const username = document.getElementById('setup-username').value.trim();
    const full_name = document.getElementById('setup-fullname').value.trim();
    const phone = document.getElementById('setup-phone').value.trim();
    const wilaya = document.getElementById('setup-wilaya').value;

    if (!username || !phone || !wilaya) {
        alert('Please fill in all required fields.');
        return;
    }

    // Verified System (Core Differentiator)
    // Check if user qualifies for Founding Badge (First 1000 users)
    const { count } = await db.from('profiles').select('*', { count: 'exact', head: true });
    const isFoundingCandidate = count < 1000;

    const { error } = await db.from('profiles').upsert({
        id: currentUser.id,
        username,
        phone,
        wilaya,
        verified: isFoundingCandidate, // Instant verification for first 1000
        verified_type: isFoundingCandidate ? 'Founding' : null,
        updated_at: new Date()
    });

    if (error) {
        alert('Error: ' + error.message);
    } else {
        hideModal('onboarding-modal');
        alert(isFoundingCandidate ? 'Profile completed! You earned the 🟠 Founding Verified Badge!' : 'Profile completed! Welcome to Winjay.');
    }
}

// Post Ad Logic
async function checkAuthAndPost() {
    if (!currentUser) {
        showModal('auth-modal');
        return;
    }
    
    const { data: profile } = await db.from('profiles').select('*').eq('id', currentUser.id).single();
    if (!profile || !profile.username) {
        checkProfileOnboarding();
        return;
    }

    populateWilayaSelects();
    populateCategorySelect();
    showModal('post-modal');
}

async function populateCategorySelect() {
    const { data: categories } = await db.from('categories').select('*');
    const select = document.getElementById('ad-category');
    if (select.children.length === 0) {
        select.innerHTML = categories.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
    }
}

async function handlePostAd() {
    const title = document.getElementById('ad-title').value;
    const description = document.getElementById('ad-desc').value;
    const price = document.getElementById('ad-price').value;
    const category_id = document.getElementById('ad-category').value;
    const wilaya = document.getElementById('ad-wilaya').value;
    const imageFile = document.getElementById('ad-image-input').files[0];

    if (!title || !price || !wilaya) {
        alert('Please fill in title, price, and wilaya.');
        return;
    }

    // Show loading
    document.getElementById('post-btn-text').innerText = 'Uploading...';
    document.getElementById('post-loader').classList.remove('hidden');

    let imageUrl = null;
    if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { data, error } = await db.storage.from('listing-images').upload(fileName, imageFile);
        if (data) {
            const { data: { publicUrl } } = db.storage.from('listing-images').getPublicUrl(fileName);
            imageUrl = publicUrl;
        }
    }

    const { error } = await db.from('listings').insert({
        user_id: currentUser.id,
        title,
        description,
        price,
        category_id,
        wilaya,
        images: imageUrl ? [imageUrl] : [],
        status: 'active'
    });

    // Hide loading
    document.getElementById('post-btn-text').innerText = 'Publish Listing 🎉';
    document.getElementById('post-loader').classList.add('hidden');

    if (error) {
        alert('Error posting ad: ' + error.message);
    } else {
        hideModal('post-modal');
        alert('Ad posted successfully!');
        loadListings();
    }
}

async function viewListing(id) {
    const { data: l } = await db.from('listings').select('*, profiles(*)').eq('id', id).single();
    if (!l) return;

    document.getElementById('detail-img').src = l.images?.[0] || 'https://via.placeholder.com/800x600?text=No+Image';
    document.getElementById('detail-title').innerText = l.title;
    document.getElementById('detail-price').innerText = `${Number(l.price).toLocaleString()} DZD`;
    document.getElementById('detail-condition').innerText = l.condition || 'Used';
    document.getElementById('detail-wilaya').innerText = l.wilaya;
    document.getElementById('detail-date').innerText = timeAgo(l.created_at);
    document.getElementById('detail-desc').innerText = l.description || 'No description provided.';
    document.getElementById('detail-username').innerText = `@${l.profiles?.username || 'user'}`;
    document.getElementById('detail-avatar').innerText = (l.profiles?.username?.[0] || 'U').toUpperCase();
    
    const verifiedEl = document.getElementById('detail-verified');
    if (l.profiles?.verified) verifiedEl.classList.remove('hidden');
    else verifiedEl.classList.add('hidden');

    const whatsappBtn = document.getElementById('whatsapp-link');
    if (l.profiles?.phone) {
        whatsappBtn.onclick = () => window.open(`https://wa.me/213${l.profiles.phone.replace(/^0/, '')}`, '_blank');
        whatsappBtn.classList.remove('hidden');
    } else {
        whatsappBtn.classList.add('hidden');
    }

    showModal('detail-modal');
    lucide.createIcons();
}

function previewImage(input) {
    const preview = document.getElementById('image-preview');
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.querySelector('img').src = e.target.result;
            preview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
}

async function showProfile() {
    if (!currentUser) return;

    const { data: profile } = await db.from('profiles').select('*').eq('id', currentUser.id).single();
    if (!profile) {
        checkProfileOnboarding();
        return;
    }

    // Set profile info
    document.getElementById('profile-name').innerText = profile.username || 'Winjay User';
    document.getElementById('profile-username-display').innerText = `@${profile.username}`;
    document.getElementById('profile-avatar-large').innerText = (profile.username?.[0] || 'U').toUpperCase();
    document.getElementById('profile-wilaya-display').innerText = profile.wilaya;
    document.getElementById('profile-phone-display').innerText = profile.phone;

    // Set badge
    const badgeContainer = document.getElementById('profile-badge-container');
    if (profile.verified) {
        badgeContainer.innerHTML = `
            <div class="inline-flex items-center gap-1.5 bg-winjay-orange/10 text-winjay-orange px-3 py-1 rounded-full text-xs font-bold">
                <i data-lucide="badge-check" class="w-3.5 h-3.5"></i>
                ${profile.verified_type} Verified
            </div>
        `;
    } else {
        badgeContainer.innerHTML = '';
    }

    // Load my listings
    const { data: listings } = await db.from('listings').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
    const grid = document.getElementById('my-listings-grid');
    
    if (!listings || listings.length === 0) {
        grid.innerHTML = '<p class="col-span-full text-center py-8 text-gray-400 text-sm">You haven\'t posted anything yet.</p>';
    } else {
        grid.innerHTML = listings.map(l => `
            <div class="relative group rounded-xl overflow-hidden border border-gray-100">
                <img src="${l.images?.[0] || 'https://via.placeholder.com/200'}" class="w-full h-32 object-cover">
                <div class="p-2">
                    <p class="font-bold text-xs truncate">${l.title}</p>
                    <p class="winjay-orange text-xs font-bold">${Number(l.price).toLocaleString()} DZD</p>
                </div>
                <button onclick="deleteListing('${l.id}')" class="absolute top-2 right-2 bg-white/90 p-1.5 rounded-lg text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
            </div>
        `).join('');
    }

    showModal('profile-modal');
    lucide.createIcons();
}

async function handleSignOut() {
    const { error } = await db.auth.signOut();
    if (error) alert(error.message);
    else {
        hideModal('profile-modal');
        window.location.reload();
    }
}

async function deleteListing(id) {
    if (!confirm('Are you sure you want to delete this listing?')) return;
    
    const { error } = await db.from('listings').delete().eq('id', id);
    if (error) alert(error.message);
    else {
        showProfile(); // Refresh profile view
        loadListings(); // Refresh main feed
    }
}

// Start app
init();