// Global Variables
let currentUser = null;
let currentTab = 'announcements';
let authToken = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Set up event listeners
    setupEventListeners();
    
    // Clear any existing tokens to start fresh
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    authToken = null;
    currentUser = null;
    
    // Show login page by default
    showPage('loginPage');
}

function setupEventListeners() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('showRegisterFormBtn').addEventListener('click', showRegisterForm);
    document.getElementById('showLoginFormBtn').addEventListener('click', showLoginForm);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);

    // User type change event listener
    document.getElementById('userType').addEventListener('change', toggleLoginFields);

    // Initial call to set correct fields on page load
    toggleLoginFields();

    // Logout buttons
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('adminLogoutBtn').addEventListener('click', handleLogout);

    // Navigation tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    // Search functionality
    document.getElementById('searchBtn').addEventListener('click', performSearch);
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch(); // Re-enabled manual search on Enter keypress
        }
    });

    // Filter functionality
    document.getElementById('categoryFilter').addEventListener('change', applyFilters);
    document.getElementById('dateFilter').addEventListener('change', applyFilters);

    // Admin buttons
    document.getElementById('addAnnouncementBtn').addEventListener('click', () => openModal('announcements'));
    document.getElementById('addEventBtn').addEventListener('click', () => openModal('events'));
    document.getElementById('addTimetableBtn').addEventListener('click', () => openModal('timetable'));
    document.getElementById('addResultBtn').addEventListener('click', () => openModal('results'));

    // Modal functionality
    document.getElementById('contentForm').addEventListener('submit', handleContentSubmit);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    document.querySelector('.close').addEventListener('click', closeModal);

    // Archive filter
    document.getElementById('filterArchiveBtn').addEventListener('click', filterArchive);

    // Close modal when clicking outside
    document.getElementById('contentModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeModal();
        }
    });
}

function toggleLoginFields() {
    const userType = document.getElementById('userType').value;
    const usernameGroup = document.getElementById('usernameGroup');
    const passwordGroup = document.getElementById('passwordGroup');
    const studentNameGroup = document.getElementById('studentNameGroup');
    const registrationNumberGroup = document.getElementById('registrationNumberGroup');

    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const studentNameInput = document.getElementById('studentName');
    const registrationNumberInput = document.getElementById('registrationNumber');

    if (userType === 'student') {
        usernameGroup.style.display = 'none';
        passwordGroup.style.display = 'none';
        studentNameGroup.style.display = 'block';
        registrationNumberGroup.style.display = 'block';

        studentNameInput.required = true;
        registrationNumberInput.required = true;
        usernameInput.required = false;
        passwordInput.required = false;

    } else if (userType === 'admin') {
        usernameGroup.style.display = 'block';
        passwordGroup.style.display = 'block';
        studentNameGroup.style.display = 'none';
        registrationNumberGroup.style.display = 'none';

        usernameInput.required = true;
        passwordInput.required = true;
        studentNameInput.required = false;
        registrationNumberInput.required = false;

    } else {
        // Default state when 'Select User Type' is chosen
        usernameGroup.style.display = 'block';
        passwordGroup.style.display = 'block';
        studentNameGroup.style.display = 'none';
        registrationNumberGroup.style.display = 'none';

        usernameInput.required = false;
        passwordInput.required = false;
        studentNameInput.required = false;
        registrationNumberInput.required = false;
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const userType = document.getElementById('userType').value;
    let credentials = {};

    if (userType === 'student') {
        credentials.name = document.getElementById('studentName').value;
        credentials.regNo = document.getElementById('registrationNumber').value;
    } else if (userType === 'admin') {
        credentials.username = document.getElementById('username').value;
        credentials.password = document.getElementById('password').value;
    }
    
    // Clear previous error
    document.getElementById('loginError').textContent = '';
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ...credentials, userType })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            if (currentUser.userType === 'admin') {
                showPage('adminPage');
                loadAdminContent();
            } else {
                showPage('studentPage');
                loadStudentContent();
            }
        } else {
            document.getElementById('loginError').textContent = data.error || 'Login failed';
        }
    } catch (error) {
        console.error('Login error:', error);
        document.getElementById('loginError').textContent = 'Network error. Please try again.';
    }
}

function handleLogout() {
    currentUser = null;
    authToken = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    showPage('loginPage');
    document.getElementById('loginForm').reset();
    document.getElementById('loginError').textContent = '';
}

async function verifyToken() {
    console.log('verifyToken called with authToken:', authToken); // Debug log
    
    // Only proceed if we have a token
    if (!authToken) {
        console.log('No auth token, showing login page'); // Debug log
        showPage('loginPage');
        return;
    }
    
    try {
        console.log('Making API call to verify token...'); // Debug log
        const response = await fetch('/api/announcements', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const userData = localStorage.getItem('currentUser');
            if (userData) {
                currentUser = JSON.parse(userData);
                if (currentUser.userType === 'admin') {
                    showPage('adminPage');
                    loadAdminContent();
                } else {
                    showPage('studentPage');
                    loadStudentContent();
                }
            } else {
                // No user data, clear everything
                localStorage.removeItem('authToken');
                localStorage.removeItem('currentUser');
                authToken = null;
                currentUser = null;
                showPage('loginPage');
            }
        } else {
            // Token is invalid, clear it
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            authToken = null;
            currentUser = null;
            showPage('loginPage');
        }
    } catch (error) {
        console.error('Token verification error:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        authToken = null;
        currentUser = null;
        showPage('loginPage');
    }
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

function switchTab(tabName) {
    // Only proceed if user is authenticated
    if (!currentUser || !authToken) {
        console.log('User not authenticated, cannot switch tabs');
        return;
    }
    
    // Update active tab
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update active content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');
    
    currentTab = tabName;
    
    // Load appropriate content
    if (currentUser.userType === 'student') {
        loadStudentContent();
    } else if (currentUser.userType === 'admin') {
        loadAdminContent();
    }

    // After switching tabs and loading content, apply any active filters
    // performSearch(); // Removed unnecessary automatic search
}

async function loadStudentContent() {
    await loadContent('announcements', 'announcements');
    await loadContent('events', 'events');
    await loadContent('timetable', 'timetable');
    await loadContent('results', 'results');
}

async function loadAdminContent() {
    await loadAdminContentList('adminAnnouncementsList', 'announcements');
    await loadAdminContentList('adminEventsList', 'events');
    await loadAdminContentList('adminTimetableList', 'timetable');
    await loadAdminContentList('adminResultsList', 'results');
    await loadArchive();
}

async function loadContent(containerId, apiType) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Only load content if user is authenticated
    if (!authToken) {
        console.log(`No auth token available for ${apiType} loading`);
        return;
    }
    
    try {
        const response = await fetch(`/api/${apiType}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <h3>No content available</h3>
                        <p>Check back later for updates.</p>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = data.map(item => createContentItem(item)).join('');
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error loading content</h3>
                    <p>Please try again later.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading content:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Network error</h3>
                <p>Please check your connection and try again.</p>
            </div>
        `;
    }
}

async function loadAdminContentList(containerId, apiType) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Only load content if user is authenticated
    if (!authToken) {
        console.log(`No auth token available for admin ${apiType} loading`);
        return;
    }
    
    try {
        const response = await fetch(`/api/${apiType}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <h3>No ${apiType} available</h3>
                        <p>Click "Add New" to create your first item.</p>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = data.map(item => createAdminContentItem(item, apiType)).join('');
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error loading content</h3>
                    <p>Please try again later.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading content:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Network error</h3>
                <p>Please check your connection and try again.</p>
            </div>
        `;
    }
}

function createContentItem(item) {
    const priorityClass = item.priority ? `priority-${item.priority}` : '';
    const priorityBadge = item.priority ? `<span class="priority-badge priority-${item.priority}">${item.priority}</span>` : '';
    
    return `
        <div class="content-item ${priorityClass}">
            <div class="content-header">
                <div>
                    <div class="content-title">${item.title}</div>
                    <div class="content-meta">
                        <span><i class="fas fa-calendar"></i> ${formatDate(item.date)}</span>
                        <span><i class="fas fa-user"></i> ${item.author}</span>
                        <span><i class="fas fa-tag"></i> ${item.category}</span>
                        ${item.time ? `<span><i class="fas fa-clock"></i> ${item.time}</span>` : ''}
                        ${item.location ? `<span><i class="fas fa-map-marker-alt"></i> ${item.location}</span>` : ''}
                    </div>
                </div>
                ${priorityBadge}
            </div>
            <div class="content-description">${item.description}</div>
        </div>
    `;
}

function createAdminContentItem(item, type) {
    const priorityClass = item.priority ? `priority-${item.priority}` : '';
    const priorityBadge = item.priority ? `<span class="priority-badge priority-${item.priority}">${item.priority}</span>` : '';
    
    return `
        <div class="content-item ${priorityClass}">
            <div class="content-header">
                <div>
                    <div class="content-title">${item.title}</div>
                    <div class="content-meta">
                        <span><i class="fas fa-calendar"></i> ${formatDate(item.date)}</span>
                        <span><i class="fas fa-user"></i> ${item.author}</span>
                        <span><i class="fas fa-tag"></i> ${item.category}</span>
                        ${item.time ? `<span><i class="fas fa-clock"></i> ${item.time}</span>` : ''}
                        ${item.location ? `<span><i class="fas fa-map-marker-alt"></i> ${item.location}</span>` : ''}
                    </div>
                </div>
                ${priorityBadge}
            </div>
            <div class="content-description">${item.description}</div>
            <div class="content-actions">
                <button class="btn btn-primary" onclick="editItem(${item.id}, '${type}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-warning" onclick="archiveItem(${item.id}, '${type}')">
                    <i class="fas fa-archive"></i> Archive
                </button>
                <button class="btn btn-danger" onclick="deleteItem(${item.id}, '${type}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `;
}

async function performSearch() {
    // Only proceed if user is authenticated
    const authToken = localStorage.getItem('authToken');
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    if (!authToken || !currentUser) {
        console.log('User not authenticated or user data missing, cannot perform search');
        return;
    }
    
    const searchTerm = document.getElementById('searchInput').value;
    const categoryFilter = document.getElementById('categoryFilter').value;
    const dateFilter = document.getElementById('dateFilter').value;
    
    const params = new URLSearchParams();
    if (searchTerm) params.append('q', searchTerm);
    if (categoryFilter) params.append('category', categoryFilter);
    if (dateFilter) params.append('dateFilter', dateFilter);
    
    try {
        let searchType = currentTab;
        if (searchType.startsWith('admin-')) {
            searchType = searchType.replace('admin-', '');
        }
        if (!['announcements','events','timetable','results'].includes(searchType)) {
            console.log('Invalid tab type for search:', searchType);
            return;
        }
        console.log('Search request URL:', `/api/search?type=${searchType}&${params.toString()}`);
        console.log('Search request headers:', { 'Authorization': `Bearer ${authToken}` });
        const response = await fetch(`/api/search?type=${searchType}&${params.toString()}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            loadSearchResults(currentTab, data);
        } else {
            showMessage('Search failed. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Search error:', error);
        showMessage('Network error during search.', 'error');
    }
}

function loadSearchResults(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (data.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>No results found</h3>
                <p>Try adjusting your search criteria.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = data.map(item => createContentItem(item)).join('');
}

function applyFilters() {
    // performSearch(); // Commented out to prevent automatic search on page load
}

function matchesDateFilter(itemDate, filter) {
    const item = new Date(itemDate);
    const now = new Date();
    
    switch (filter) {
        case 'today':
            return item.toDateString() === now.toDateString();
        case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return item >= weekAgo;
        case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return item >= monthAgo;
        default:
            return true;
    }
}

function openModal(type) {
    const modal = document.getElementById('contentModal');
    const modalTitle = document.getElementById('modalTitle');
    const contentType = document.getElementById('contentType');
    
    modalTitle.textContent = `Add New ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    contentType.value = type;
    
    // Clear form
    document.getElementById('contentForm').reset();
    document.getElementById('contentId').value = '';
    
    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('contentModal').classList.remove('active');
}

async function handleContentSubmit(e) {
    e.preventDefault();
    
    // Only proceed if user is authenticated
    if (!currentUser || !authToken) {
        console.log('User not authenticated, cannot submit content');
        return;
    }
    
    const contentId = document.getElementById('contentId').value;
    const contentType = document.getElementById('contentType').value;
    
    const itemData = {
        title: document.getElementById('contentTitle').value,
        description: document.getElementById('contentDescription').value,
        category: document.getElementById('contentCategory').value,
        date: document.getElementById('contentDate').value,
        time: document.getElementById('contentTime').value,
        location: document.getElementById('contentLocation').value,
        priority: document.getElementById('contentPriority').value
    };
    
    try {
        let response;
        if (contentId) {
            // Edit existing item
            response = await fetch(`/api/${contentType}/${contentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(itemData)
            });
        } else {
            // Add new item
            response = await fetch(`/api/${contentType}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(itemData)
            });
        }
        
        if (response.ok) {
            closeModal();
            await loadAdminContent();
            showMessage('Content saved successfully!', 'success');
        } else {
            const error = await response.json();
            showMessage(error.error || 'Failed to save content', 'error');
        }
    } catch (error) {
        console.error('Error saving content:', error);
        showMessage('Network error. Please try again.', 'error');
    }
}

async function editItem(id, type) {
    // Only proceed if user is authenticated
    if (!currentUser || !authToken) {
        console.log('User not authenticated, cannot edit item');
        return;
    }
    
    try {
        const response = await fetch(`/api/${type}/${id}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const item = await response.json();
            
            const modal = document.getElementById('contentModal');
            const modalTitle = document.getElementById('modalTitle');
            const contentType = document.getElementById('contentType');
            
            modalTitle.textContent = `Edit ${type.charAt(0).toUpperCase() + type.slice(1)}`;
            contentType.value = type;
            
            // Fill form with item data
            document.getElementById('contentId').value = item.id;
            document.getElementById('contentTitle').value = item.title;
            document.getElementById('contentDescription').value = item.description;
            document.getElementById('contentCategory').value = item.category;
            document.getElementById('contentDate').value = item.date;
            document.getElementById('contentTime').value = item.time || '';
            document.getElementById('contentLocation').value = item.location || '';
            document.getElementById('contentPriority').value = item.priority;
            
            modal.classList.add('active');
        } else {
            showMessage('Failed to load item for editing', 'error');
        }
    } catch (error) {
        console.error('Error loading item:', error);
        showMessage('Network error. Please try again.', 'error');
    }
}

async function archiveItem(id, type) {
    // Only proceed if user is authenticated
    if (!currentUser || !authToken) {
        console.log('User not authenticated, cannot archive item');
        return;
    }
    
    if (confirm('Are you sure you want to archive this item?')) {
        try {
            const response = await fetch(`/api/${type}/${id}/archive`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            if (response.ok) {
                await loadAdminContent();
                showMessage('Item archived successfully!', 'success');
            } else {
                const error = await response.json();
                showMessage(error.error || 'Failed to archive item', 'error');
            }
        } catch (error) {
            console.error('Error archiving item:', error);
            showMessage('Network error. Please try again.', 'error');
        }
    }
}

async function deleteItem(id, type) {
    // Only proceed if user is authenticated
    if (!currentUser || !authToken) {
        console.log('User not authenticated, cannot delete item');
        return;
    }
    
    if (confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
        try {
            const response = await fetch(`/api/${type}/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            if (response.ok) {
                await loadAdminContent();
                showMessage('Item deleted successfully!', 'success');
            } else {
                const error = await response.json();
                showMessage(error.error || 'Failed to delete item', 'error');
            }
        } catch (error) {
            console.error('Error deleting item:', error);
            showMessage('Network error. Please try again.', 'error');
        }
    }
}

async function loadArchive() {
    const container = document.getElementById('archiveList');
    if (!container) return;
    
    // Only load archive if user is authenticated
    if (!authToken) {
        return;
    }
    
    try {
        const response = await fetch('/api/archive', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-archive"></i>
                        <h3>No archived items</h3>
                        <p>Archived items will appear here.</p>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = data.map(item => createContentItem(item)).join('');
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error loading archive</h3>
                    <p>Please try again later.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading archive:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Network error</h3>
                <p>Please check your connection and try again.</p>
            </div>
        `;
    }
}

async function filterArchive() {
    // Only proceed if user is authenticated
    if (!currentUser || !authToken) {
        console.log('User not authenticated, cannot filter archive');
        return;
    }
    
    const typeFilter = document.getElementById('archiveType').value;
    const dateFrom = document.getElementById('archiveDateFrom').value;
    const dateTo = document.getElementById('archiveDateTo').value;
    
    const params = new URLSearchParams();
    if (typeFilter && typeFilter !== 'all') params.append('type', typeFilter);
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    
    try {
        const response = await fetch(`/api/archive?${params.toString()}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            loadArchiveContent(data);
        } else {
            showMessage('Failed to filter archive', 'error');
        }
    } catch (error) {
        console.error('Error filtering archive:', error);
        showMessage('Network error during filtering', 'error');
    }
}

function loadArchiveContent(data) {
    const container = document.getElementById('archiveList');
    if (!container) return;
    
    if (data.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>No items found</h3>
                <p>Try adjusting your filter criteria.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = data.map(item => createContentItem(item)).join('');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function showMessage(message, type) {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());
    
    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    // Insert at the top of main content
    const mainContent = document.querySelector('.main-content');
    mainContent.insertBefore(messageDiv, mainContent.firstChild);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

function showRegisterForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
    document.getElementById('loginError').textContent = ''; // Clear any previous login errors
}

function showLoginForm() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginError').textContent = ''; // Clear any previous login errors
}

async function handleRegister(event) {
    event.preventDefault();
    const registerUserType = document.getElementById('registerUserType').value;
    const loginError = document.getElementById('loginError');

    let payload = {};
    let url = '/api/register';

    if (registerUserType === 'student') {
        const registerStudentName = document.getElementById('registerStudentName').value;
        const registerRegistrationNumber = document.getElementById('registerRegistrationNumber').value;
        if (!registerStudentName || !registerRegistrationNumber) {
            loginError.textContent = 'Name and Registration Number are required for student registration.';
            return;
        }
        payload = {
            name: registerStudentName,
            regNo: registerRegistrationNumber,
            userType: 'student'
        };
    } else if (registerUserType === 'admin') {
        const registerUsername = document.getElementById('registerUsername').value;
        const registerPassword = document.getElementById('registerPassword').value;
        const departmentalIdToken = document.getElementById('departmentalIdToken').value;
        if (!registerUsername || !registerPassword || !departmentalIdToken) {
            loginError.textContent = 'Username, Password, and Departmental ID Token are required for admin registration.';
            return;
        }
        payload = {
            username: registerUsername,
            password: registerPassword,
            userType: 'admin',
            departmentalIdToken: departmentalIdToken
        };
    } else {
        loginError.textContent = 'Please select a user type for registration.';
        return;
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            alert(data.message);
            showLoginForm(); // Go back to login form after successful registration
            // Clear registration fields
            document.getElementById('registerUserType').value = '';
            document.getElementById('registerStudentName').value = '';
            document.getElementById('registerRegistrationNumber').value = '';
            document.getElementById('registerUsername').value = '';
            document.getElementById('registerPassword').value = '';
            document.getElementById('departmentalIdToken').value = '';
            toggleRegisterFields(); // Reset field visibility
        } else {
            loginError.textContent = data.error || 'Registration failed.';
        }
    } catch (error) {
        console.error('Registration error:', error);
        loginError.textContent = 'An error occurred during registration.';
    }
}

function toggleRegisterFields() {
    const registerUserType = document.getElementById('registerUserType').value;
    const registerStudentNameGroup = document.getElementById('registerStudentNameGroup');
    const registerRegistrationNumberGroup = document.getElementById('registerRegistrationNumberGroup');
    const registerUsernameGroup = document.getElementById('registerUsernameGroup');
    const registerPasswordGroup = document.getElementById('registerPasswordGroup');
    const adminIdTokenGroup = document.getElementById('adminIdTokenGroup');

    // Hide all fields initially
    registerStudentNameGroup.style.display = 'none';
    registerRegistrationNumberGroup.style.display = 'none';
    registerUsernameGroup.style.display = 'none';
    registerPasswordGroup.style.display = 'none';
    adminIdTokenGroup.style.display = 'none';

    // Set required to false for all fields initially
    document.getElementById('registerStudentName').required = false;
    document.getElementById('registerRegistrationNumber').required = false;
    document.getElementById('registerUsername').required = false;
    document.getElementById('registerPassword').required = false;
    document.getElementById('departmentalIdToken').required = false;

    if (registerUserType === 'student') {
        registerStudentNameGroup.style.display = 'block';
        registerRegistrationNumberGroup.style.display = 'block';
        document.getElementById('registerStudentName').required = true;
        document.getElementById('registerRegistrationNumber').required = true;
    } else if (registerUserType === 'admin') {
        registerUsernameGroup.style.display = 'block';
        registerPasswordGroup.style.display = 'block';
        adminIdTokenGroup.style.display = 'block';
        document.getElementById('registerUsername').required = true;
        document.getElementById('registerPassword').required = true;
        document.getElementById('departmentalIdToken').required = true;
    }
}

// Add event listener for registerUserType change
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('registerUserType').addEventListener('change', toggleRegisterFields);
});
