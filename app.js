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
        <div class="listing-card bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 cursor-pointer group" onclick="viewListing('${l.id}')">
            <div class="relative h-56 overflow-hidden">
                <img src="${l.images?.[0] || 'https://via.placeholder.com/400x300?text=No+Image'}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700">
                <div class="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider shadow-sm">
                    ${l.condition || 'New'}
                </div>
                <button onclick="event.stopPropagation(); toggleLike('${l.id}')" class="absolute top-4 right-4 p-2.5 bg-white/90 backdrop-blur-md rounded-full shadow-sm hover:scale-110 active:scale-90 transition-all group/like">
                    <i data-lucide="heart" class="w-4 h-4 transition-colors ${isLiked(l.id) ? 'fill-red-500 text-red-500' : 'text-gray-400 group-hover/like:text-red-500'}"></i>
                </button>
            </div>
            <div class="p-5">
                <div class="flex justify-between items-start mb-2">
                    <h3 class="font-bold text-gray-900 text-lg leading-tight truncate flex-1 mr-2">${l.title}</h3>
                </div>
                <div class="flex items-center gap-2 text-gray-400 text-xs mb-4">
                    <div class="flex items-center gap-1">
                        <i data-lucide="map-pin" class="w-3 h-3"></i>
                        <span>${l.wilaya.split('-')[1]?.trim() || l.wilaya}</span>
                    </div>
                    <span>•</span>
                    <span>${timeAgo(l.created_at)}</span>
                </div>
                
                <div class="flex items-center justify-between pt-4 border-t border-gray-50">
                    <div class="flex flex-col">
                        <span class="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Price</span>
                        <span class="winjay-orange font-black text-lg">${Number(l.price).toLocaleString()} <span class="text-xs">DZD</span></span>
                    </div>
                    <div class="flex gap-1">
                        <button onclick="event.stopPropagation(); shareListing('${l.id}')" class="share-btn p-2 rounded-full text-gray-400 transition-colors">
                            <i data-lucide="share-2" class="w-4 h-4"></i>
                        </button>
                        <button onclick="event.stopPropagation(); window.open('https://wa.me/213${l.profiles?.phone?.replace(/^0/, '')}', '_blank')" class="whatsapp-btn p-2 rounded-full text-gray-400 transition-colors">
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
    const fullName = document.getElementById('setup-fullname').value.trim();
    const businessType = document.getElementById('setup-business').value;
    const phone = document.getElementById('setup-phone').value.trim();
    const wilaya = document.getElementById('setup-wilaya').value;

    if (!username || !fullName || !phone || !wilaya) {
        alert('Please fill in all mandatory fields');
        return;
    }

    try {
        const profileData = {
            id: currentUser.id,
            username,
            full_name: fullName,
            business_type: businessType,
            phone,
            wilaya,
            updated_at: new Date()
        };

        const { error } = await db.from('profiles').upsert(profileData);

        if (error) {
            console.error('Supabase Error:', error);
            // If it's a schema error, try saving only the basic fields
            if (error.message.includes('column')) {
                const { error: retryError } = await db.from('profiles').upsert({
                    id: currentUser.id,
                    username,
                    phone,
                    wilaya,
                    updated_at: new Date()
                });
                if (retryError) throw retryError;
            } else {
                throw error;
            }
        }
        
        hideModal('onboarding-modal');
        showProfile(); 
    } catch (error) {
        console.error('Final Error:', error);
        alert('TECHNICAL ERROR: ' + (error.message || 'Unknown error') + '\n\nMake sure you ran the SQL in Supabase!');
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

    // Basic Info
    document.getElementById('profile-name').innerText = profile.full_name || 'Winjay User';
    document.getElementById('profile-username-display').innerText = `@${profile.username}`;
    document.getElementById('profile-business-display').innerText = profile.business_type || 'Personal';
    document.getElementById('profile-avatar-large').innerText = (profile.full_name?.[0] || 'U').toUpperCase();
    document.getElementById('profile-wilaya-display').innerText = profile.wilaya;
    document.getElementById('profile-phone-display').innerText = profile.phone;
    
    // Referral Link
    const referralLink = `${window.location.origin}?ref=${profile.username}`;
    document.getElementById('referral-link-input').value = referralLink;

    // Badge
    const badgeContainer = document.getElementById('profile-badge-container');
    if (profile.verified) {
        badgeContainer.innerHTML = `
            <div class="inline-flex items-center gap-1.5 bg-winjay-orange text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                <i data-lucide="badge-check" class="w-3.5 h-3.5 fill-white text-winjay-orange"></i>
                Founding Verified
            </div>
        `;
    } else {
        badgeContainer.innerHTML = '';
    }

    // Tasks and Progress
    updateProgress(profile);

    // Load Listings
    const { data: listings } = await db.from('listings').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
    const grid = document.getElementById('my-listings-grid');
    grid.innerHTML = listings?.length ? listings.map(l => `
        <div class="relative group rounded-2xl overflow-hidden border border-gray-100">
            <img src="${l.images?.[0] || 'https://via.placeholder.com/200'}" class="w-full h-32 object-cover">
            <div class="p-2">
                <p class="font-bold text-xs truncate">${l.title}</p>
                <p class="winjay-orange text-xs font-bold">${Number(l.price).toLocaleString()} DZD</p>
            </div>
            <button onclick="deleteListing('${l.id}')" class="absolute top-2 right-2 bg-white/90 p-1.5 rounded-lg text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
        </div>
    `).join('') : '<p class="col-span-full text-center py-8 text-gray-400 text-sm">No listings yet.</p>';

    showModal('profile-modal');
    lucide.createIcons();
}

function updateProgress(profile) {
    const tasks = [
        { name: 'Setup Username', done: !!profile.username },
        { name: 'Setup Full Name', done: !!profile.full_name },
        { name: 'Professional Profile Picture', done: true }, // Simplified for now
        { name: 'Add Mobile Phone', done: !!profile.phone },
        { name: 'Select Wilaya', done: !!profile.wilaya },
        { name: `Refer 10 Users (${profile.referral_count || 0}/10)`, done: (profile.referral_count || 0) >= 10 }
    ];

    const completed = tasks.filter(t => t.done).length;
    const percent = Math.round((completed / tasks.length) * 100);

    document.getElementById('task-percent').innerText = `${percent}%`;
    document.getElementById('task-progress-bar').style.width = `${percent}%`;

    document.getElementById('tasks-list').innerHTML = tasks.map(t => `
        <div class="flex items-center justify-between text-sm ${t.done ? 'text-gray-400' : 'text-gray-700'}">
            <div class="flex items-center gap-2">
                <div class="w-5 h-5 rounded-full flex items-center justify-center border ${t.done ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}">
                    ${t.done ? '<i data-lucide="check" class="w-3 h-3"></i>' : ''}
                </div>
                <span class="${t.done ? 'line-through' : 'font-medium'}">${t.name}</span>
            </div>
        </div>
    `).join('');
    
    lucide.createIcons();
}

function copyReferralLink() {
    const input = document.getElementById('referral-link-input');
    input.select();
    document.execCommand('copy');
    alert('Referral link copied! Share it to get verified.');
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

// Likes Logic
function isLiked(id) {
    const likes = JSON.parse(localStorage.getItem('winjay_likes') || '[]');
    return likes.includes(id);
}

function toggleLike(id) {
    let likes = JSON.parse(localStorage.getItem('winjay_likes') || '[]');
    if (likes.includes(id)) {
        likes = likes.filter(l => l !== id);
    } else {
        likes.push(id);
    }
    localStorage.setItem('winjay_likes', JSON.stringify(likes));
    loadListings(); // Refresh UI
}

function shareListing(id) {
    const url = `${window.location.origin}/listing/${id}`;
    if (navigator.share) {
        navigator.share({
            title: 'Check out this listing on Winjay',
            url: url
        });
    } else {
        navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
    }
}

// Start app
init();