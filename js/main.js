let allItems = []; // Store all items globally

// Function to load items when page loads
async function loadItems() {
    try {
        // First check localStorage for saved items
        const savedItems = localStorage.getItem('auctionItems');
        if (savedItems) {
            allItems = JSON.parse(savedItems);
        } else {
            // If no saved items, load from JSON file
            const response = await fetch('db/items.json');
            const data = await response.json();
            allItems = data.items;
            // Save to localStorage
            localStorage.setItem('auctionItems', JSON.stringify(allItems));
        }
        
        displayFilteredItems(allItems);
        
        // Start the timer to update "Time Left" for all items
        setInterval(updateAllTimers, 1000);
    } catch (error) {
        console.error('Error loading items:', error);
        showToast('Unable to load auction items. Please refresh the page.', 'error');
    }
}

// Function to update all timers
function updateAllTimers() {
    const timeElements = document.querySelectorAll('.time-left');
    timeElements.forEach(element => {
        const endTime = element.dataset.endTime;
        const timeLeft = calculateTimeLeft(endTime);
        element.textContent = timeLeft;
        
        // Update ended status if needed
        const timeWrapper = element.closest('.time-wrapper');
        if (timeLeft === 'Auction ended') {
            timeWrapper?.classList.add('ended');
            const itemCard = timeWrapper?.closest('.item-card');
            itemCard?.classList.add('auction-ended-card');
            // Remove bid button if auction ended using optional chaining
            itemCard?.querySelector('.bid-button')?.remove();
        }
    });
}

// Function to calculate time left
function calculateTimeLeft(endTime) {
    const end = new Date(endTime).getTime();
    const now = new Date().getTime();
    const distance = end - now;

    if (distance < 0) {
        return 'Auction ended';
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
}

// Add event listeners when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadItems(); // Load items when page loads
    
    // Add search functionality
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', handleSearch);
    
    // Add sort functionality
    const sortSelect = document.getElementById('sortSelect');
    sortSelect.addEventListener('change', handleSort);
    
    // Add modal functionality
    setupModalHandlers();
    setupPasswordToggles();
});

// Search function
function handleSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filteredItems = allItems.filter(item => 
        item.name.toLowerCase().includes(searchTerm) ||
        item.description.toLowerCase().includes(searchTerm)
    );
    displayFilteredItems(filteredItems);
}

// Sort function
function handleSort() {
    const sortValue = document.getElementById('sortSelect').value;
    const sortedItems = [...allItems];

    switch(sortValue) {
        case 'ending-soon':
            sortedItems.sort((a, b) => new Date(a.endTime) - new Date(b.endTime));
            break;
        case 'price-low':
            sortedItems.sort((a, b) => a.currentBid - b.currentBid);
            break;
        case 'price-high':
            sortedItems.sort((a, b) => b.currentBid - a.currentBid);
            break;
        case 'newest':
            sortedItems.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
            break;
    }

    displayFilteredItems(sortedItems);
}

// Add this function to save user bid
function saveUserBid(itemId, bidAmount) {
    const user = JSON.parse(localStorage.getItem('user'));
    const userBids = JSON.parse(localStorage.getItem('userBids')) || {};
    
    if (!userBids[user.username]) {
        userBids[user.username] = [];
    }

    const item = allItems.find(item => item.id === parseInt(itemId));
    userBids[user.username].push({
        itemId: itemId,
        itemName: item.name,
        amount: bidAmount,
        timestamp: new Date().toISOString()
    });

    localStorage.setItem('userBids', JSON.stringify(userBids));
}

// Update the submitBid function to include saving user bid
async function submitBid(itemId, bidAmount) {
    if (!isLoggedIn()) {
        showToast('Please login to place a bid', 'info');
        showLoginPrompt();
        return;
    }

    const user = JSON.parse(localStorage.getItem('user'));
    const item = allItems.find(item => item.id === parseInt(itemId));

    if (!item) {
        showToast('Item not found', 'error');
        return;
    }

    if (bidAmount <= item.currentBid) {
        showToast(`Bid must be higher than current bid of KES ${item.currentBid.toLocaleString()}`, 'error');
        return;
    }

    try {
        item.bidHistory.push({
            username: user.username,
            amount: bidAmount,
            timestamp: new Date().toISOString()
        });
        item.currentBid = bidAmount;
        
        localStorage.setItem('auctionItems', JSON.stringify(allItems));
        saveUserBid(itemId, bidAmount);
        
        updateItemUI(item);
        showToast(`Bid of KES ${bidAmount.toLocaleString()} placed successfully on ${item.name}`, 'success');
    } catch (error) {
        showToast('Failed to place bid. Please try again.', 'error');
    }
}

// Add this new function to update a single item's UI
function updateItemUI(item) {
    const itemCard = document.querySelector(`.item-card[data-item-id="${item.id}"]`);
    if (!itemCard) return;

    // Update current bid amount
    const bidAmountElement = itemCard.querySelector('.bid-amount');
    if (bidAmountElement) {
        bidAmountElement.textContent = `KES ${item.currentBid.toLocaleString()}`;
    }

    // Update bid history button/count
    const bidHistoryContainer = itemCard.querySelector('.bid-status');
    if (bidHistoryContainer) {
        // First, determine the bid text
        const bidText = item.bidHistory.length === 1 ? 'Bid' : 'Bids';

        // Then use it in the template literal
        const bidHistoryHTML = `
            <button onclick="showBidHistory('${item.id}')" class="bid-history-button">
                <div class="bid-count-wrapper">
                    <span class="bid-count">${item.bidHistory.length}</span>
                    <span class="bid-text">${bidText}</span>
                </div>
                <span class="view-all">View History →</span>
            </button>
        `;
        
        // Replace the existing bid history button or no-bids span
        const existingBidHistory = itemCard.querySelector('.bid-history-button, .no-bids');
        if (existingBidHistory) {
            existingBidHistory.outerHTML = bidHistoryHTML;
        }
    }
}

// Function to load bid history
async function loadBidHistory(itemId) {
    const item = allItems.find(item => item.id === parseInt(itemId));
    if (!item) {
        showToast('Item not found', 'error');
        return;
    }

    const bidHistoryContent = document.getElementById('bidHistoryContent');
    if (item.bidHistory.length === 0) {
        bidHistoryContent.innerHTML = '<p class="no-bids-message">No bids yet</p>';
        return;
    }

    const bidsHtml = item.bidHistory
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .map((bid, index) => `
            <div class="bid-entry ${index === 0 ? 'latest-bid' : ''}">
                <div class="bid-info-main">
                    <span class="bid-amount">KES ${bid.amount.toLocaleString()}</span>
                    ${index === 0 ? '<span class="latest-badge">Latest Bid</span>' : ''}
                </div>
                <div class="bid-info-secondary">
                    <span class="bidder">${bid.username}</span>
                    <span class="bid-time">${new Date(bid.timestamp).toLocaleString()}</span>
                </div>
            </div>
        `).join('');

    bidHistoryContent.innerHTML = `
        <div class="current-price">
            Current Bid: KES ${item.currentBid.toLocaleString()}
        </div>
        ${bidsHtml}
    `;
}

// Update the displayFilteredItems function to include data-item-id
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
        card.className = `item-card ${isEnded ? 'auction-ended-card' : ''}`;
        card.setAttribute('data-item-id', item.id);
        
        // Extract the ternary operation into a separate variable
        const bidText = item.bidHistory.length === 1 ? 'Bid' : 'Bids';
        
        const bidHistoryButton = item.bidHistory.length > 0 ? `
            <button onclick="showBidHistory('${item.id}')" class="bid-history-button">
                <div class="bid-count-wrapper">
                    <span class="bid-count">${item.bidHistory.length}</span>
                    <span class="bid-text">${bidText}</span>
                </div>
                <span class="view-all">View History →</span>
            </button>
        ` : '<span class="no-bids">No bids yet</span>';

        card.innerHTML = `
            <div class="item-image">
                <img src="${item.image}" alt="${item.name}">
                ${isEnded ? '<div class="ended-overlay">Auction Ended</div>' : ''}
            </div>
            <div class="item-details">
                <h3>${item.name}</h3>
                <p class="item-description">${item.description}</p>
                <div class="bid-status">
                    <div class="bid-info-container">
                        <div class="current-bid-wrapper">
                            <span class="bid-label">Current Bid</span>
                            <span class="bid-amount">KES ${item.currentBid.toLocaleString()}</span>
                        </div>
                        <div class="time-wrapper ${isEnded ? 'ended' : ''}">
                            <span class="time-label">Time Left</span>
                            <span class="time-left" data-end-time="${item.endTime}">${timeLeft}</span>
                        </div>
                    </div>
                    ${bidHistoryButton}
                </div>
                ${!isEnded ? `
                    <button onclick="placeBid('${item.id}', ${item.currentBid})" class="bid-button">
                        Place Bid
                    </button>
                ` : ''}
            </div>
        `;
        container.appendChild(card);
    });
}

// Update the placeBid function to handle minimum bid amounts properly
function placeBid(itemId, currentBid) {
    if (!isLoggedIn()) {
        showLoginPrompt();
        return;
    }

    const item = allItems.find(item => item.id === parseInt(itemId));
    if (!item) {
        showToast('Item not found', 'error');
        return;
    }

    const bidModal = document.getElementById('bidModal');
    const bidForm = document.getElementById('bidForm');
    const bidAmountInput = document.getElementById('bidAmount');
    const bidHint = document.querySelector('.bid-hint');

    // Set minimum bid amount (1 more than current bid)
    const minimumBid = currentBid + 1;
    bidAmountInput.min = minimumBid;
    bidAmountInput.value = minimumBid;

    // Update bid hint to show minimum bid
    if (bidHint) {
        bidHint.textContent = `Minimum bid: KES ${minimumBid.toLocaleString()}`;
    }

    // Show the modal
    bidModal.style.display = 'block';

    // Handle bid submission
    bidForm.onsubmit = async (e) => {
        e.preventDefault();
        const bidAmount = Number(bidAmountInput.value);

        if (bidAmount < minimumBid) {
            showToast(`Bid must be at least KES ${minimumBid.toLocaleString()}`, 'error');
            return;
        }

        try {
            await submitBid(itemId, bidAmount);
            bidModal.style.display = 'none';
            bidForm.reset();
            showToast('Bid placed successfully!', 'success');
        } catch (error) {
            showToast('Failed to place bid: ' + error.message, 'error');
        }
    };
}

// Update the bid modal HTML to include better information
function updateBidModal(item) {
    const modalContent = document.querySelector('#bidModal .modal-content');
    modalContent.innerHTML = `
        <span class="close">&times;</span>
        <h2>Place Your Bid</h2>
        <div class="bid-info">
            <h3>${item.name}</h3>
            <div class="current-bid">Current Bid: KES ${item.currentBid.toLocaleString()}</div>
            <div class="minimum-bid">Minimum Bid: KES ${(item.currentBid + 1).toLocaleString()}</div>
        </div>
        <form id="bidForm">
            <div class="form-group">
                <label for="bidAmount">Your Bid Amount (KES):</label>
                <input type="number" 
                       id="bidAmount" 
                       required
                       min="${item.currentBid + 1}"
                       value="${item.currentBid + 1}"
                       step="1">
                <small class="bid-hint">Minimum bid: KES ${(item.currentBid + 1).toLocaleString()}</small>
            </div>
            <button type="submit" class="btn-primary">Place Bid</button>
        </form>
    `;

    // Reattach close button handler
    const closeButton = modalContent.querySelector('.close');
    closeButton.onclick = () => {
        document.getElementById('bidModal').style.display = 'none';
    };
}

function showBidHistory(itemId) {
    if (!isLoggedIn()) {
        showLoginPrompt();
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content bid-history-modal">
            <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <h2>Bid History</h2>
            <div class="bid-history-container">
                <div id="bidHistoryContent">Loading...</div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'block';

    loadBidHistory(itemId);
}

function isLoggedIn() {
    return !!localStorage.getItem('user');
}

function showLoginPrompt() {
    const loginModal = document.getElementById('loginModal');
    loginModal.style.display = 'block';
    showToast('Please login to continue', 'info');
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <span>${message}</span>
        </div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add these functions to handle modal interactions
function setupModalHandlers() {
    // Get modal elements
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    
    // Get all close buttons
    const closeButtons = document.querySelectorAll('.close');
    
    // Get modal switch links
    const switchModalLinks = document.querySelectorAll('.switch-modal');

    // Setup login button
    loginBtn.onclick = () => {
        loginModal.style.display = 'block';
        registerModal.style.display = 'none';
    };

    // Setup register button
    registerBtn.onclick = () => {
        registerModal.style.display = 'block';
        loginModal.style.display = 'none';
    };

    // Setup close buttons
    closeButtons.forEach(button => {
        button.onclick = function() {
            this.closest('.modal').style.display = 'none';
        };
    });

    // Setup modal switch links
    switchModalLinks.forEach(link => {
        link.onclick = (e) => {
            e.preventDefault();
            const targetModal = link.getAttribute('data-target');
            if (targetModal === 'loginModal') {
                loginModal.style.display = 'block';
                registerModal.style.display = 'none';
            } else {
                registerModal.style.display = 'block';
                loginModal.style.display = 'none';
            }
        };
    });

    // Close modal when clicking outside
    window.onclick = (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    };

    // Setup login form submission
    const loginForm = document.getElementById('loginForm');
    loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            // Check registered users in localStorage first
            const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers')) || [];
            let user = registeredUsers.find(u => 
                u.username === username && u.password === password
            );

            // If not found, check users.json
            if (!user) {
                const response = await fetch('db/users.json');
                const data = await response.json();
                user = data.users.find(u => 
                    u.username === username && u.password === password
                );
            }

            if (user) {
                localStorage.setItem('user', JSON.stringify({
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    isAdmin: user.isAdmin || false
                }));
                loginModal.style.display = 'none';
                updateUserInterface();
                showToast(`Welcome back, ${user.username}!`, 'success');
            } else {
                showToast('Invalid username or password. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showToast('Unable to process login. Please try again later.', 'error');
        }
    };

    // Setup register form submission
    const registerForm = document.getElementById('registerForm');
    registerForm.onsubmit = async (e) => {
        e.preventDefault();
        const username = document.getElementById('regUsername').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value;

        try {
            await validateRegistration(username, email, password);
            
            const existingUsers = JSON.parse(localStorage.getItem('registeredUsers')) || [];
            const newUser = {
                id: Date.now(),
                username,
                email,
                password,
                isAdmin: false,
                createdAt: new Date().toISOString()
            };
            
            existingUsers.push(newUser);
            localStorage.setItem('registeredUsers', JSON.stringify(existingUsers));

            showToast(`Account created successfully! Welcome, ${username}. Please login to continue.`, 'success');
            registerModal.style.display = 'none';
            loginModal.style.display = 'block';
            registerForm.reset();
        } catch (error) {
            showToast(error.message, 'error');
        }
    };
}

// Function to update UI based on login state
function updateUserInterface() {
    const user = JSON.parse(localStorage.getItem('user'));
    const authButtons = document.querySelector('.auth-buttons');
    const userInfo = document.querySelector('.user-info');

    if (user) {
        // Show logged in state
        authButtons.style.display = 'none';
        userInfo.innerHTML = `
            <span>Welcome, ${user.username}!</span>
            <button onclick="showMyBids()" class="btn-secondary my-bids-button">My Bids</button>
            ${user.isAdmin ? '<button onclick="resetAuctionData()" class="btn-secondary reset-button">Reset Auctions</button>' : ''}
            <button onclick="logout()" class="btn-secondary">Logout</button>
        `;
        userInfo.style.display = 'flex';
    } else {
        // Show logged out state
        authButtons.style.display = 'flex';
        userInfo.style.display = 'none';
    }
}

// Logout function
function logout() {
    const user = JSON.parse(localStorage.getItem('user'));
    localStorage.removeItem('user');
    updateUserInterface();
    showToast(`Goodbye, ${user.username}! You've been logged out successfully`, 'info');
}

// Call updateUserInterface when page loads
document.addEventListener('DOMContentLoaded', () => {
    updateUserInterface();
    // ... rest of your DOMContentLoaded code ...
});

// Add a function to reset the auction data (useful for testing)
function resetAuctionData() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user?.isAdmin) {
        showToast('Access denied: Only administrators can reset auction data', 'error');
        return;
    }
    
    if (confirm('Are you sure you want to reset all auction data? This cannot be undone.')) {
        localStorage.removeItem('auctionItems');
        showToast('Auction data has been reset successfully. Reloading page...', 'success');
        location.reload();
    }
}

function showMyBids() {
    const user = JSON.parse(localStorage.getItem('user'));
    const userBids = JSON.parse(localStorage.getItem('userBids')) || {};
    const myBids = userBids[user.username] || [];

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content bid-history-modal">
            <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <h2>My Bids</h2>
            <div class="bid-history-container">
                ${myBids.length === 0 ? '<p class="no-bids-message">You haven\'t placed any bids yet</p>' :
                    myBids.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                        .map(bid => `
                            <div class="bid-entry">
                                <div class="bid-info-main">
                                    <span class="item-name">${bid.itemName}</span>
                                    <span class="bid-amount">KES ${bid.amount.toLocaleString()}</span>
                                </div>
                                <div class="bid-info-secondary">
                                    <span class="bid-time">${new Date(bid.timestamp).toLocaleString()}</span>
                                </div>
                            </div>
                        `).join('')
                }
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'block';
}

// Add password toggle functionality
function setupPasswordToggles() {
    const passwordToggles = document.querySelectorAll('.password-toggle');
    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            const button = e.currentTarget;
            const input = button.parentElement.querySelector('input');
            const type = input.type === 'password' ? 'text' : 'password';
            input.type = type;
            
            // Update icon based on password visibility
            const path = button.querySelector('path');
            if (type === 'text') {
                path.setAttribute('d', 'M12 6.5c-3.79 0-7.17 2.13-8.82 5.5 1.65 3.37 5.02 5.5 8.82 5.5s7.17-2.13 8.82-5.5C19.17 8.63 15.79 6.5 12 6.5zm0 9c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5zm0-4c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z');
            } else {
                path.setAttribute('d', 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z');
            }
        });
    });
}

// Enhanced registration validation
async function validateRegistration(username, email, password) {
    // Check username length
    if (username.length < 3 || username.length > 20) {
        throw new Error('Username must be between 3 and 20 characters');
    }

    // Check username format using \w instead of [A-Za-z0-9_]
    if (!/^\w+$/.test(username)) {
        throw new Error('Username can only contain letters, numbers, and underscores');
    }

    // Check email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Please enter a valid email address');
    }

    // Check password strength
    if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
    }

    // Check for common passwords
    const commonPasswords = ['password', '123456', 'qwerty', 'letmein'];
    if (commonPasswords.includes(password.toLowerCase())) {
        throw new Error('Please choose a stronger password');
    }

    // Check for username availability
    const existingUsers = JSON.parse(localStorage.getItem('registeredUsers')) || [];
    const isUsernameTaken = existingUsers.some(user => 
        user.username.toLowerCase() === username.toLowerCase()
    );
    if (isUsernameTaken) {
        throw new Error('Username is already taken');
    }

    // Check for existing email
    const isEmailTaken = existingUsers.some(user => 
        user.email.toLowerCase() === email.toLowerCase()
    );
    if (isEmailTaken) {
        throw new Error('Email is already registered');
    }

    return true;
}
  