// Global state
let currentUser = null;
let auctionItems = [];
let users = [];

// Constants
const DB_KEYS = {
    ITEMS: 'auctionItems',
    USERS: 'users',
    CURRENT_USER: 'currentUser'
};

// Initialize the application
async function initializeDB() {
    try {
        await Promise.all([loadUsers(), loadItems()]);
        checkCurrentUser();
        setupEventListeners();
        displayItems();
        startAuctionTimers();
    } catch (error) {
        console.error('Error initializing database:', error);
        console.log('Continuing with default data');
    }
}

// Load data functions
async function loadUsers() {
    try {
        // First try to get from localStorage
        const storedUsers = localStorage.getItem(DB_KEYS.USERS);
        if (storedUsers) {
            users = JSON.parse(storedUsers);
            console.log('Users loaded from localStorage:', users.length);
            return;
        }

        // If not in localStorage, fetch from file
        const response = await fetch('./db/users.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        users = data.users;
        localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
        console.log('Users loaded from file:', users.length);
    } catch (error) {
        console.error('Error loading users:', error);
        // Use default users if fetch fails
        users = [
            {
                id: 1,
                username: "demo",
                password: "demo123",
                email: "demo@example.com",
                bids: []
            }
        ];
        localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
        console.log('Using default users');
    }
}

async function loadItems() {
    try {
        // First try to get from localStorage
        const storedItems = localStorage.getItem(DB_KEYS.ITEMS);
        if (storedItems) {
            auctionItems = JSON.parse(storedItems);
            console.log('Items loaded from localStorage:', auctionItems.length);
            return;
        }

        // If not in localStorage, fetch from file
        const response = await fetch('./db/items.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        auctionItems = data.items;
        localStorage.setItem(DB_KEYS.ITEMS, JSON.stringify(auctionItems));
        console.log('Items loaded from file:', auctionItems.length);
    } catch (error) {
        console.error('Error loading items:', error);
        // Use default items if fetch fails
        auctionItems = [
            {
                id: 1,
                name: "Sample Item",
                description: "This is a sample item for testing",
                image: "https://via.placeholder.com/300x300?text=Sample",
                currentBid: 100,
                startingBid: 50,
                seller: "demo",
                startTime: new Date().toISOString(),
                endTime: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
                bidHistory: []
            }
        ];
        localStorage.setItem(DB_KEYS.ITEMS, JSON.stringify(auctionItems));
        console.log('Using default items');
    }
}

// Event Listeners
function setupEventListeners() {
    // Login button
    document.getElementById('loginBtn').addEventListener('click', () => {
        showModal('loginModal');
    });

    // Register button
    document.getElementById('registerBtn').addEventListener('click', () => {
        showModal('registerModal');
    });

    // Close buttons
    document.querySelectorAll('.close').forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            if (modal) closeModal(modal.id);
        });
    });

    // Login form
    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        login(username, password);
    });

    // Register form
    document.getElementById('registerForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('regUsername').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        register(username, email, password);
    });

    // Modal switching
    document.querySelectorAll('.switch-modal').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const currentModal = link.closest('.modal');
            const targetModal = link.dataset.target;
            if (currentModal) closeModal(currentModal.id);
            showModal(targetModal);
        });
    });

    // Setup search and filter
    setupSearchAndFilter();
}

// Modal functions
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeDB);
  
function displayFilteredItems(items) {
    const container = document.getElementById('itemsContainer');
    container.innerHTML = '';

    if (items.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <h3>No items found</h3>
                <p>Try adjusting your search criteria</p>
            </div>
        `;
        return;
    }

    items.forEach(item => {
        const timeLeft = calculateTimeLeft(item.endTime);
        const isEnded = timeLeft === 'Auction ended';
        
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <div class="item-image">
                <img src="${item.image}" alt="${item.name}">
            </div>
            <div class="item-details">
                <h3>${item.name}</h3>
                <p>${item.description}</p>
                <p class="price">Current Bid: $${item.currentBid.toLocaleString()}</p>
                <p class="time-left" data-end-time="${item.endTime}">${timeLeft}</p>
                ${currentUser && !isEnded ? `
                    <button onclick="showBidModal(${item.id}, ${item.currentBid})" 
                            class="bid-button btn-primary">
                        Place Bid
                    </button>
                ` : ''}
                ${isEnded ? '<p class="auction-ended">Auction Ended</p>' : ''}
                ${item.bidHistory.length > 0 ? `
                    <div class="bid-history">
                        <h4>Recent Bids</h4>
                        <ul>
                            ${item.bidHistory.slice(-3).reverse().map(bid => `
                                <li>${bid.username}: $${bid.amount.toLocaleString()} 
                                    (${new Date(bid.timestamp).toLocaleString()})</li>
                            `).join('')}
                        </ul>
                    </div>
                ` : '<p class="no-bids">No bids yet</p>'}
            </div>
        `;
        container.appendChild(card);
    });
}
  
function register(username, email, password) {
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        alert('Username already exists!');
        return;
    }

    const newUser = {
        id: users.length + 1,
        username,
        email,
        password,
        bids: []
    };

    users.push(newUser);
    localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
    
    alert('Registration successful! Please login.');
    closeModal('registerModal');
    showModal('loginModal');
}

function login(username, password) {
    const user = users.find(u => 
        u.username.toLowerCase() === username.toLowerCase() && 
        u.password === password
    );

    if (user) {
        currentUser = { ...user };
        localStorage.setItem(DB_KEYS.CURRENT_USER, JSON.stringify(currentUser));
        updateUIForLoggedInUser();
        closeModal('loginModal');
        displayItems();
        return true;
    }
    alert('Invalid username or password!');
    return false;
}

function logout() {
    currentUser = null;
    localStorage.removeItem(DB_KEYS.CURRENT_USER);
    updateUIForLoggedInUser();
    displayItems();
}

function checkCurrentUser() {
    const savedUser = localStorage.getItem(DB_KEYS.CURRENT_USER);
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUIForLoggedInUser();
    }
}

function updateUIForLoggedInUser() {
    const authButtons = document.querySelector('.auth-buttons');
    const userInfo = document.querySelector('.user-info');
    
    if (currentUser) {
        authButtons.style.display = 'none';
        userInfo.innerHTML = `
            <span>Welcome, ${currentUser.username}!</span>
            <button onclick="logout()">Logout</button>
        `;
    } else {
        authButtons.style.display = 'flex';
        userInfo.innerHTML = '';
    }
}

function displayItems() {
    displayFilteredItems(auctionItems);
}

function calculateTimeLeft(endTime) {
    const end = new Date(endTime);
    const now = new Date();
    const diff = end - now;

    if (diff <= 0) {
        return 'Auction ended';
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${days}d ${hours}h ${minutes}m`;
}

function setupSearchAndFilter() {
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');

    function filterAndSortItems() {
        let filtered = [...auctionItems];
        
        // Apply search filter
        const searchTerm = searchInput.value.toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(item => 
                item.name.toLowerCase().includes(searchTerm) ||
                item.description.toLowerCase().includes(searchTerm)
            );
        }

        // Apply sorting
        const sortValue = sortSelect.value;
        switch (sortValue) {
            case 'ending-soon':
                filtered.sort((a, b) => new Date(a.endTime) - new Date(b.endTime));
                break;
            case 'price-low':
                filtered.sort((a, b) => a.currentBid - b.currentBid);
                break;
            case 'price-high':
                filtered.sort((a, b) => b.currentBid - a.currentBid);
                break;
            case 'newest':
                filtered.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
                break;
        }

        displayFilteredItems(filtered);
    }

    searchInput.addEventListener('input', filterAndSortItems);
    sortSelect.addEventListener('change', filterAndSortItems);
}

function startAuctionTimers() {
    setInterval(() => {
        document.querySelectorAll('.time-left').forEach(element => {
            const endTime = element.dataset.endTime;
            element.textContent = calculateTimeLeft(endTime);
        });
    }, 60000); // Update every minute
}
  