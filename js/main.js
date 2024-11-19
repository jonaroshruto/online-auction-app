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

// Update the initialization approach
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    loadItems();
    setupEventListeners();
    setupPasswordToggles();
    updateUserInterface();
}

function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    searchInput.removeEventListener('input', handleSearch); // Remove existing listener
    searchInput.addEventListener('input', handleSearch);
    
    // Sort functionality
    const sortSelect = document.getElementById('sortSelect');
    sortSelect.removeEventListener('change', handleSort); // Remove existing listener
    sortSelect.addEventListener('change', handleSort);
    
    // Modal handlers
    setupModalHandlers();
    setupPasswordToggles();
}

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

// Update the submitBid function
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
        // Initialize bid history if it doesn't exist
        if (!item.bidHistory) {
            item.bidHistory = [];
        }

        // Add new bid
        item.bidHistory.push({
            username: user.username,
            amount: bidAmount,
            timestamp: new Date().toISOString()
        });
        item.currentBid = bidAmount;
        
        // Save to localStorage
        localStorage.setItem('auctionItems', JSON.stringify(allItems));
        
        // Save to user's bid history
        saveUserBid(itemId, bidAmount);
        
        // Update UI
        updateItemUI(item);
        displayFilteredItems(allItems);
        
        showToast(`Bid of KES ${bidAmount.toLocaleString()} placed successfully on ${item.name}`, 'success');
    } catch (error) {
        console.error('Error placing bid:', error);
        showToast('Failed to place bid. Please try again.', 'error');
    }
}

// Update the updateItemUI function
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
        const bidHistoryHTML = `
            <button onclick="showBidHistory('${item.id}')" 
                    class="bid-history-button ${item.bidHistory?.length === 0 ? 'no-bids-button' : ''}">
                <div class="bid-count-wrapper">
                    <span class="bid-count">${item.bidHistory?.length || 0}</span>
                    <span class="bid-text">${item.bidHistory?.length === 1 ? 'Bid' : 'Bids'}</span>
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

// Update the showBidHistory function
function showBidHistory(itemId) {
    if (!isLoggedIn()) {
        showLoginPrompt();
        return;
    }

    const item = allItems.find(item => item.id === parseInt(itemId));
    if (!item) return;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content bid-history-modal">
            <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <h2>Bid History - ${item.name}</h2>
            <div class="bid-history-container">
                <div class="current-price">
                    Current Bid: KES ${item.currentBid.toLocaleString()}
                </div>
                ${item.bidHistory?.length === 0 ? 
                    '<p class="no-bids-message">No bids have been placed yet. Be the first to bid!</p>' :
                    `<div class="bid-list">
                        ${item.bidHistory
                            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                            .map(bid => `
                                <div class="bid-entry">
                                    <div class="bid-info-main">
                                        <span class="bid-amount">KES ${bid.amount.toLocaleString()}</span>
                                        <span class="bidder">${bid.username}</span>
                                    </div>
                                    <div class="bid-info-secondary">
                                        <span class="bid-time">${new Date(bid.timestamp).toLocaleString()}</span>
                                    </div>
                                </div>
                            `).join('')}
                    </div>`
                }
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    showModal(modal);

    // Add event listener for modal removal
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            hideModal(modal);
            setTimeout(() => modal.remove(), 300); // Remove after animation
        }
    });
}

// Update displayFilteredItems to properly set up item cards
function displayFilteredItems(items) {
    const container = document.getElementById('itemsContainer');
    
    if (items.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <h3>No items found</h3>
                <p>Try adjusting your search criteria</p>
            </div>
        `;
        return;
    }

    container.innerHTML = items.map(item => {
        const timeLeft = calculateTimeLeft(item.endTime);
        const isEnded = timeLeft === 'Auction ended';
        
        return `
            <div class="item-card ${isEnded ? 'auction-ended-card' : ''}" data-item-id="${item.id}">
                <div class="item-image">
                    <img src="${item.image}" alt="${item.name}">
                </div>
                <div class="item-details">
                    <h3>${item.name}</h3>
                    <p class="description">${item.description}</p>
                    <div class="bid-info-wrapper">
                        <div class="current-bid">
                            <span class="bid-label">Current Bid</span>
                            <span class="bid-amount">KES ${item.currentBid.toLocaleString()}</span>
                        </div>
                        <div class="time-wrapper ${calculateTimeLeft(item.endTime) === 'Auction ended' ? 'ended' : ''}">
                            <span class="time-label">Time Left</span>
                            <span class="time-left" data-end-time="${item.endTime}">
                                ${calculateTimeLeft(item.endTime)}
                            </span>
                        </div>
                    </div>
                    <div class="action-buttons">
                        ${calculateTimeLeft(item.endTime) !== 'Auction ended' ? 
                            `<button class="bid-button" onclick="showBidModal(${item.id})">
                                Place Bid
                            </button>` : 
                            '<div class="auction-ended">Auction Ended</div>'
                        }
                        <button class="view-details-btn" onclick="showBidDetails(${item.id})">
                            More Info
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Remove the setupItemCardListeners call since we're using onclick attributes
}

// Update showBidModal function
function showBidModal(itemId) {
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
    updateBidModal(item);
    showModal(bidModal);

    // Add click handler for closing modal by clicking outside
    bidModal.onclick = (e) => {
        if (e.target === bidModal) {
            hideModal(bidModal);
        }
    };
}

// Update updateBidModal function
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
        <form id="bidForm" data-item-id="${item.id}">
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

    // Update close button handler
    const closeButton = modalContent.querySelector('.close');
    closeButton.onclick = () => {
        hideModal(document.getElementById('bidModal'));
    };

    // Add form submission handler
    const bidForm = modalContent.querySelector('#bidForm');
    bidForm.onsubmit = async (e) => {
        e.preventDefault();
        const bidAmount = parseInt(document.getElementById('bidAmount').value);
        const itemId = bidForm.getAttribute('data-item-id');
        
        try {
            await submitBid(itemId, bidAmount);
            hideModal(document.getElementById('bidModal'));
            // Check if no other modals are visible before restoring scroll
            const visibleModals = document.querySelectorAll('.modal.visible');
            if (visibleModals.length === 0) {
                document.body.style.overflow = '';
            }
        } catch (error) {
            console.error('Bid error:', error);
            showToast('Failed to place bid. Please try again.', 'error');
        }
    };
}

function isLoggedIn() {
    return !!localStorage.getItem('user');
}

// Update showLoginPrompt function
function showLoginPrompt() {
    // Close any existing modals first
    document.querySelectorAll('.modal.visible').forEach(modal => {
        hideModal(modal);
        // If it's a dynamically created modal, remove it from DOM
        if (!modal.id) {
            modal.remove();
        }
    });

    // Show login modal
    const loginModal = document.getElementById('loginModal');
    showModal(loginModal);
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
    
    // Remove existing event listeners if any
    loginBtn.replaceWith(loginBtn.cloneNode(true));
    registerBtn.replaceWith(registerBtn.cloneNode(true));
    
    // Get the fresh elements
    const newLoginBtn = document.getElementById('loginBtn');
    const newRegisterBtn = document.getElementById('registerBtn');
    
    // Setup login button
    newLoginBtn.onclick = () => {
        const loginModal = document.getElementById('loginModal');
        const loginButton = loginModal.querySelector('button[type="submit"]');
        if (loginButton) loginButton.textContent = 'Login';
        showModal(loginModal);
        hideModal(document.getElementById('registerModal'));
    };

    // Setup register button
    newRegisterBtn.onclick = () => {
        const registerModal = document.getElementById('registerModal');
        const registerButton = registerModal.querySelector('button[type="submit"]');
        if (registerButton) registerButton.textContent = 'Create Account';
        showModal(registerModal);
        hideModal(document.getElementById('loginModal'));
    };
    
    // Setup close buttons
    document.querySelectorAll('.close').forEach(button => {
        button.onclick = function() {
            hideModal(this.closest('.modal'));
        };
    });
    
    // Setup modal switch links with button text preservation
    document.querySelectorAll('.switch-modal').forEach(link => {
        link.onclick = (e) => {
            e.preventDefault();
            const targetModal = document.getElementById(link.getAttribute('data-target'));
            const currentModal = link.closest('.modal');
            
            // Ensure correct button text before switching
            const loginButton = document.querySelector('#loginForm button[type="submit"]');
            const registerButton = document.querySelector('#registerForm button[type="submit"]');
            if (loginButton) loginButton.textContent = 'Login';
            if (registerButton) registerButton.textContent = 'Create Account';
            
            hideModal(currentModal);
            showModal(targetModal);
            setupPasswordToggles();
        };
    });
    
    // Close modal when clicking outside
    window.onclick = (event) => {
        if (event.target.classList.contains('modal')) {
            hideModal(event.target);
        }
    };

    // Setup login form submission
    const loginForm = document.getElementById('loginForm');
    loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const submitButton = loginForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Logging in...';

        try {
            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;

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
                hideModal(loginModal);
                updateUserInterface();
                showToast(`Welcome back, ${user.username}!`, 'success');
            } else {
                showToast('Invalid username or password. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showToast('Unable to process login. Please try again later.', 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    };

    // Setup register form submission
    const registerForm = document.getElementById('registerForm');
    registerForm.onsubmit = async (e) => {
        e.preventDefault();
        const submitButton = registerForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent; // Store original text
        submitButton.disabled = true;
        submitButton.textContent = 'Creating Account...';

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
            hideModal(registerModal);
            showModal(loginModal);
            registerForm.reset();
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;  // Restore original text
        }
    };

    // Update bid form submission
    const bidForm = document.getElementById('bidForm');
    bidForm.onsubmit = async (e) => {
        e.preventDefault();
        const bidAmount = parseInt(document.getElementById('bidAmount').value);
        const itemId = bidForm.getAttribute('data-item-id');
        
        try {
            // Add loading state
            const submitButton = bidForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Placing Bid...';

            await submitBid(itemId, bidAmount);
            hideModal(document.getElementById('bidModal'));
            ensureScrollRestored();
        } catch (error) {
            console.error('Bid error:', error);
            showToast('Failed to place bid. Please try again.', 'error');
        } finally {
            // Reset form and button state
            const submitButton = bidForm.querySelector('button[type="submit"]');
            submitButton.disabled = false;
            submitButton.textContent = 'Place Bid';
        }
    };

    // Add cleanup for dynamically created modals
    window.addEventListener('beforeunload', () => {
        document.body.style.overflow = '';
    });
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
            <button onclick="showMyBids()" class="my-bids-button">My Bids</button>
            ${user.isAdmin ? '<button onclick="resetAuctionData()" id="resetAuctionsBtn">Reset Auctions</button>' : ''}
            <button onclick="logout()" id="logoutBtn">Logout</button>
        `;
        userInfo.style.display = 'flex';
    } else {
        // Show logged out state
        authButtons.style.display = 'flex';
        userInfo.style.display = 'none';
    }

    // Refresh the items display
    displayFilteredItems(allItems);
}

// Logout function
function logout() {
    const user = JSON.parse(localStorage.getItem('user'));
    localStorage.removeItem('user');
    updateUserInterface();
    
    // Re-initialize all event listeners and UI
    initializeApp();
    
    showToast(`Goodbye, ${user.username}! You've been logged out successfully`, 'info');
}

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
            <span class="close">&times;</span>
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
    showModal(modal);

    // Update close button handler
    const closeButton = modal.querySelector('.close');
    closeButton.onclick = () => {
        hideModal(modal);
        setTimeout(() => {
            modal.remove();
            ensureScrollRestored();
        }, 300);
    };

    // Update click outside handler
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            hideModal(modal);
            setTimeout(() => {
                modal.remove();
                ensureScrollRestored();
            }, 300);
        }
    });
}

// Update setupPasswordToggles function
function setupPasswordToggles() {
    const passwordToggles = document.querySelectorAll('.password-toggle');
    passwordToggles.forEach(toggle => {
        // Remove existing listener if any
        const newToggle = toggle.cloneNode(true);
        toggle.parentNode.replaceChild(newToggle, toggle);
        
        newToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const input = this.previousElementSibling;
            const type = input.type === 'password' ? 'text' : 'password';
            input.type = type;
            
            // Update icon based on password visibility
            const path = this.querySelector('path');
            if (type === 'text') {
                // Eye icon with line through it (hidden password)
                path.setAttribute('d', 'M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z');
            } else {
                // Regular eye icon (visible password)
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

// Update the updateBidMetrics function for better calculations
function updateBidMetrics(item) {
    if (!item.bidHistory || item.bidHistory.length === 0) {
        item.bidMetrics = {
            totalBids: 0,
            uniqueBidders: 0,
            averageBidIncrement: 0,
            highestBid: 0,
            lowestBid: 0,
            bidRange: 0
        };
        return;
    }

    // Sort bids by amount for calculations
    const sortedBids = [...item.bidHistory].sort((a, b) => a.amount - b.amount);
    
    // Calculate bid increments between consecutive bids
    const bidIncrements = [];
    for (let i = 1; i < item.bidHistory.length; i++) {
        const increment = item.bidHistory[i].amount - item.bidHistory[i-1].amount;
        bidIncrements.push(increment);
    }

    // Calculate metrics
    const metrics = {
        totalBids: item.bidHistory.length,
        uniqueBidders: new Set(item.bidHistory.map(bid => bid.userId)).size,
        averageBidIncrement: bidIncrements.length > 0 
            ? Math.round(bidIncrements.reduce((a, b) => a + b, 0) / bidIncrements.length) 
            : 0,
        highestBid: sortedBids[sortedBids.length - 1].amount,
        lowestBid: sortedBids[0].amount,
        bidRange: sortedBids[sortedBids.length - 1].amount - sortedBids[0].amount,
        lastBidTime: new Date(Math.max(...item.bidHistory.map(bid => new Date(bid.timestamp)))),
        bidFrequency: calculateBidFrequency(item.bidHistory)
    };

    item.bidMetrics = metrics;
}

// Add helper function to calculate bid frequency
function calculateBidFrequency(bidHistory) {
    if (bidHistory.length < 2) return 0;
    
    const timestamps = bidHistory.map(bid => new Date(bid.timestamp));
    const timeIntervals = [];
    
    for (let i = 1; i < timestamps.length; i++) {
        const interval = timestamps[i] - timestamps[i-1];
        timeIntervals.push(interval);
    }
    
    // Average time between bids in minutes
    return Math.round(timeIntervals.reduce((a, b) => a + b, 0) / timeIntervals.length / 60000);
}

// Update the showBidDetails function
function showBidDetails(itemId) {
    const item = allItems.find(item => item.id === parseInt(itemId));
    if (!item) return;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content bid-history-modal">
            <span class="close" onclick="this.closest('.modal').remove(); document.body.style.overflow = '';">&times;</span>
            <h2>${item.name}</h2>
            <div class="item-details-content">
                <div class="item-image">
                    <img src="${item.image}" alt="${item.name}">
                </div>
                <div class="item-info">
                    <p class="description">${item.description}</p>
                    <div class="current-price">
                        Current Bid: KES ${item.currentBid.toLocaleString()}
                    </div>
                    <div class="time-info">
                        Time Left: <span class="time-left" data-end-time="${item.endTime}">${calculateTimeLeft(item.endTime)}</span>
                    </div>
                </div>
            </div>
            
            <div class="bid-metrics">
                <div class="metric-card">
                    <div class="metric-icon">📊</div>
                    <div class="metric-value">${item.bidHistory?.length || 0}</div>
                    <div class="metric-label">Total Bids</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-icon">👥</div>
                    <div class="metric-value">${new Set(item.bidHistory?.map(bid => bid.username) || []).size}</div>
                    <div class="metric-label">Unique Bidders</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-icon">💰</div>
                    <div class="metric-value">KES ${item.currentBid.toLocaleString()}</div>
                    <div class="metric-label">Current Bid</div>
                </div>
            </div>

            <div class="bid-history-container">
                <h3>Bid History</h3>
                ${!item.bidHistory || item.bidHistory.length === 0 ? 
                    '<p class="no-bids-message">No bids have been placed yet. Be the first to bid!</p>' :
                    `<div class="bid-list">
                        ${item.bidHistory
                            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                            .map(bid => `
                                <div class="bid-entry">
                                    <div class="bid-info-main">
                                        <span class="bid-amount">KES ${bid.amount.toLocaleString()}</span>
                                        <span class="bidder">${bid.username}</span>
                                    </div>
                                    <div class="bid-info-secondary">
                                        <span class="bid-time">${new Date(bid.timestamp).toLocaleString()}</span>
                                    </div>
                                </div>
                            `).join('')}
                    </div>`
                }
            </div>
            
            ${calculateTimeLeft(item.endTime) !== 'Auction ended' ? 
                `<div class="modal-actions">
                    <button onclick="closeBidDetailsAndShowBidModal(${item.id})" class="btn-primary">
                        Place Bid
                    </button>
                </div>` : 
                '<div class="auction-ended-message">This auction has ended</div>'
            }
        </div>
    `;
    document.body.appendChild(modal);
    showModal(modal);

    // Update modal click handler
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            hideModal(modal);
            setTimeout(() => {
                modal.remove();
                // Check if no other modals are visible before restoring scroll
                const visibleModals = document.querySelectorAll('.modal.visible');
                if (visibleModals.length === 0) {
                    document.body.style.overflow = '';
                }
            }, 300);
        }
    });
}

// Update the transition helper function
function closeBidDetailsAndShowBidModal(itemId) {
    const detailsModal = document.querySelector('.bid-history-modal').closest('.modal');
    
    // Start fading out the details modal
    detailsModal.style.transition = 'opacity 0.2s ease-out';
    detailsModal.style.opacity = '0';
    
    // After fade out, remove details modal and show bid modal
    setTimeout(() => {
        hideModal(detailsModal);
        detailsModal.remove();
        
        // Show bid modal immediately after
        const bidModal = document.getElementById('bidModal');
        showBidModal(itemId);
        
        // Add fade-in effect to bid modal
        bidModal.style.transition = 'opacity 0.2s ease-in';
        bidModal.style.opacity = '0';
        requestAnimationFrame(() => {
            bidModal.style.opacity = '1';
        });
    }, 200); // Match the transition duration
}

// Update showModal function to include fade effect
function showModal(modal) {
    if (!modal) return;
    
    // Set correct button text based on modal type
    if (modal.id === 'loginModal') {
        const loginButton = modal.querySelector('button[type="submit"]');
        if (loginButton) loginButton.textContent = 'Login';
    } else if (modal.id === 'registerModal') {
        const registerButton = modal.querySelector('button[type="submit"]');
        if (registerButton) registerButton.textContent = 'Create Account';
    }
    
    modal.style.display = 'block';
    modal.classList.add('visible');
    
    // Add fade-in effect
    modal.style.transition = 'opacity 0.2s ease-in';
    modal.style.opacity = '0';
    requestAnimationFrame(() => {
        modal.style.opacity = '1';
    });
    
    // Handle scroll as before
    const visibleModals = document.querySelectorAll('.modal.visible');
    if (visibleModals.length === 1) {
        document.body.style.overflow = 'hidden';
    }
}

// Update hideModal function to include fade effect
function hideModal(modal) {
    if (!modal) return;
    
    // Cancel any pending form submissions
    const forms = modal.querySelectorAll('form');
    forms.forEach(form => {
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = submitButton.getAttribute('data-original-text') || 'Submit';
        }
    });
    
    // Add fade-out effect
    modal.style.transition = 'opacity 0.2s ease-out';
    modal.style.opacity = '0';
    
    setTimeout(() => {
        modal.style.display = 'none';
        modal.classList.remove('visible');
        ensureScrollRestored();
    }, 200);
}

// Add a helper function to ensure scroll is restored
function ensureScrollRestored() {
    const visibleModals = document.querySelectorAll('.modal.visible');
    if (visibleModals.length === 0) {
        document.body.style.overflow = '';
    }
}

// Update the placeBid function
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
    
    // Update modal content
    updateBidModal(item);
    
    // Show the modal
    bidModal.style.display = 'block';
}

// Add to your existing event listeners
document.addEventListener('DOMContentLoaded', () => {
    setupPasswordToggles();
});

// Add to your modal show functions
function showLoginModal() {
    // ... existing code ...
    setupPasswordToggles();
}

function showRegisterModal() {
    // ... existing code ...
    setupPasswordToggles();
}

// Add to your modal switch function
function switchModal(from, to) {
    const fromModal = document.getElementById(from);
    const toModal = document.getElementById(to);
    
    hideModal(fromModal);
    
    setTimeout(() => {
        showModal(toModal);
        fromModal.querySelector('form').reset();
        
        // Reset button text based on form type
        if (to === 'loginModal') {
            toModal.querySelector('button[type="submit"]').textContent = 'Login';
        } else if (to === 'registerModal') {
            toModal.querySelector('button[type="submit"]').textContent = 'Create Account';
        }
        
        setupPasswordToggles();
    }, 200);
}

// Update form submission handlers
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.textContent = 'Login'; // Ensure text stays as Login
    // ... rest of login logic
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.textContent = 'Create Account'; // Ensure text stays as Create Account
    // ... rest of registration logic
});
  