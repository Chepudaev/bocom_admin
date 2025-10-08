// Global variables
let currentUser = null;
let authToken = localStorage.getItem('authToken');
const API_BASE_URL = 'http://localhost:8080';

// DOM Elements
const loginPage = document.getElementById('loginPage');
const registerPage = document.getElementById('registerPage');
const adminPanel = document.getElementById('adminPanel');
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const mainContent = document.getElementById('mainContent');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Check if user is already logged in
    if (authToken) {
        showAdminPanel();
        loadDashboardData();
    } else {
        showLoginPage();
    }
    
    setupEventListeners();
}

function setupEventListeners() {
    // Authentication
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    document.getElementById('showRegister').addEventListener('click', showRegisterPage);
    document.getElementById('showLogin').addEventListener('click', showLoginPage);
    
    // Navigation
    menuToggle.addEventListener('click', toggleSidebar);
    
    // Sidebar navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            showSection(section);
            closeSidebar();
        });
    });
    
    // Modal controls
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });
    
    // Add buttons
    document.getElementById('addUserBtn').addEventListener('click', () => openUserModal());
    document.getElementById('addEventBtn').addEventListener('click', () => openEventModal());
    document.getElementById('addTrackBtn').addEventListener('click', () => openTrackModal());
    document.getElementById('addFaceToFaceBtn').addEventListener('click', () => openFaceToFaceModal());
    
    // Forms
    document.getElementById('userForm').addEventListener('submit', handleUserSubmit);
    document.getElementById('eventForm').addEventListener('submit', handleEventSubmit);
    document.getElementById('trackForm').addEventListener('submit', handleTrackSubmit);
    document.getElementById('faceToFaceForm').addEventListener('submit', handleFaceToFaceSubmit);
    
    // Search
    document.getElementById('userSearch').addEventListener('input', filterUsers);
    
    // Close sidebar when clicking outside
    document.addEventListener('click', function(e) {
        if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
            closeSidebar();
        }
    });
}

// Authentication Functions
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        console.log('Attempting login for user:', username);
        console.log('API URL:', `${API_BASE_URL}/api/auth/login`);
        
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            mode: 'cors',
            credentials: 'omit',
            body: JSON.stringify({ username, password }),
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', [...response.headers.entries()]);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Login successful, received data:', data);
            authToken = data.accessToken;
            localStorage.setItem('authToken', authToken);
            currentUser = data;
            showAdminPanel();
            loadDashboardData();
            showMessage('Успешный вход в систему', 'success');
        } else {
            const errorText = await response.text();
            console.error('Login failed:', response.status, errorText);
            
            if (response.status === 403) {
                showMessage('Доступ запрещен. Проверьте настройки CORS на сервере.', 'error');
            } else if (response.status === 401) {
                showMessage('Неверные учетные данные', 'error');
            } else {
                showMessage(`Ошибка сервера: ${response.status}`, 'error');
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            showMessage('Не удается подключиться к серверу. Проверьте, что сервер запущен.', 'error');
        } else {
            showMessage('Ошибка подключения к серверу', 'error');
        }
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    
    try {
        console.log('Attempting registration for user:', username);
        
        const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            mode: 'cors',
            credentials: 'omit',
            body: JSON.stringify({ username, password }),
        });
        
        console.log('Registration response status:', response.status);
        
        if (response.ok) {
            showMessage('Регистрация прошла успешно. Теперь войдите в систему.', 'success');
            showLoginPage();
        } else {
            const errorText = await response.text();
            console.error('Registration failed:', response.status, errorText);
            
            if (response.status === 403) {
                showMessage('Доступ запрещен. Проверьте настройки CORS на сервере.', 'error');
            } else if (response.status === 400) {
                showMessage('Ошибка регистрации. Пользователь уже существует или неверные данные.', 'error');
            } else {
                showMessage(`Ошибка сервера: ${response.status}`, 'error');
            }
        }
    } catch (error) {
        console.error('Register error:', error);
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            showMessage('Не удается подключиться к серверу. Проверьте, что сервер запущен.', 'error');
        } else {
            showMessage('Ошибка подключения к серверу', 'error');
        }
    }
}

function logout() {
    authToken = null;
    localStorage.removeItem('authToken');
    currentUser = null;
    showLoginPage();
}

// UI Functions
function showLoginPage() {
    loginPage.classList.remove('hidden');
    registerPage.classList.add('hidden');
    adminPanel.classList.add('hidden');
}

function showRegisterPage() {
    loginPage.classList.add('hidden');
    registerPage.classList.remove('hidden');
    adminPanel.classList.add('hidden');
}

function showAdminPanel() {
    loginPage.classList.add('hidden');
    registerPage.classList.add('hidden');
    adminPanel.classList.remove('hidden');
}

function toggleSidebar() {
    sidebar.classList.toggle('open');
}

function closeSidebar() {
    sidebar.classList.remove('open');
}

function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const section = document.getElementById(sectionName + 'Section');
    if (section) {
        section.classList.add('active');
        loadSectionData(sectionName);
    }
}

function loadSectionData(sectionName) {
    switch (sectionName) {
        case 'users':
            loadUsers();
            break;
        case 'events':
            loadEvents();
            break;
        case 'face-to-face':
            loadFaceToFace();
            break;
        case 'tracks':
            loadTracks();
            break;
        case 'config':
            loadConfig();
            break;
        default:
            loadDashboardData();
    }
}

// Dashboard Functions
async function loadDashboardData() {
    try {
        const [users, events, faceToFace, tracks] = await Promise.all([
            fetchData('/api/users'),
            fetchData('/api/events'),
            fetchData('/api/face-to-face'),
            fetchData('/api/tracks')
        ]);
        
        document.getElementById('usersCount').textContent = users.length || 0;
        document.getElementById('eventsCount').textContent = events.length || 0;
        document.getElementById('faceToFaceCount').textContent = faceToFace.length || 0;
        document.getElementById('tracksCount').textContent = tracks.length || 0;
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Users Functions
async function loadUsers() {
    try {
        const users = await fetchData('/api/users');
        displayUsers(users);
    } catch (error) {
        console.error('Error loading users:', error);
        showMessage('Ошибка загрузки пользователей', 'error');
    }
}

function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.phone || '-'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-edit" onclick="editUser(${user.id})">Изменить</button>
                    <button class="btn-delete" onclick="deleteUser(${user.id})">Удалить</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function filterUsers() {
    const searchTerm = document.getElementById('userSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#usersTableBody tr');
    
    rows.forEach(row => {
        const name = row.cells[1].textContent.toLowerCase();
        const email = row.cells[2].textContent.toLowerCase();
        
        if (name.includes(searchTerm) || email.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

async function deleteUser(userId) {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) {
        return;
    }
    
    try {
        await fetchData(`/api/users/${userId}`, 'DELETE');
        showMessage('Пользователь удален', 'success');
        loadUsers();
        loadDashboardData();
    } catch (error) {
        console.error('Error deleting user:', error);
        showMessage('Ошибка удаления пользователя', 'error');
    }
}

// Events Functions
async function loadEvents() {
    try {
        const events = await fetchData('/api/events');
        displayEvents(events);
    } catch (error) {
        console.error('Error loading events:', error);
        showMessage('Ошибка загрузки событий', 'error');
    }
}

function displayEvents(events) {
    const tbody = document.getElementById('eventsTableBody');
    tbody.innerHTML = '';
    
    events.forEach(event => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${event.id}</td>
            <td>${new Date(event.date).toLocaleDateString('ru-RU')}</td>
            <td>${event.eventType}</td>
            <td>${event.track?.address || '-'}</td>
            <td>$${event.driverPrice}</td>
            <td>$${event.spectatorPrice}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-edit" onclick="editEvent(${event.id})">Изменить</button>
                    <button class="btn-delete" onclick="deleteEvent(${event.id})">Удалить</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function deleteEvent(eventId) {
    if (!confirm('Вы уверены, что хотите удалить это событие?')) {
        return;
    }
    
    try {
        await fetchData(`/api/events/${eventId}`, 'DELETE');
        showMessage('Событие удалено', 'success');
        loadEvents();
        loadDashboardData();
    } catch (error) {
        console.error('Error deleting event:', error);
        showMessage('Ошибка удаления события', 'error');
    }
}

// Face-to-Face Functions
async function loadFaceToFace() {
    try {
        const faceToFace = await fetchData('/api/face-to-face');
        displayFaceToFace(faceToFace);
    } catch (error) {
        console.error('Error loading face-to-face:', error);
        showMessage('Ошибка загрузки соревнований', 'error');
    }
}

function displayFaceToFace(faceToFaceList) {
    const tbody = document.getElementById('faceToFaceTableBody');
    tbody.innerHTML = '';
    
    faceToFaceList.forEach(competition => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${competition.id}</td>
            <td>${new Date(competition.startTime).toLocaleString('ru-RU')}</td>
            <td>Пользователь ${competition.user1Id}</td>
            <td>Пользователь ${competition.user2Id}</td>
            <td>Событие ${competition.eventId}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-edit" onclick="editFaceToFace(${competition.id})">Изменить</button>
                    <button class="btn-delete" onclick="deleteFaceToFace(${competition.id})">Удалить</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function deleteFaceToFace(faceToFaceId) {
    if (!confirm('Вы уверены, что хотите удалить это соревнование?')) {
        return;
    }
    
    try {
        await fetchData(`/api/face-to-face/${faceToFaceId}`, 'DELETE');
        showMessage('Соревнование удалено', 'success');
        loadFaceToFace();
        loadDashboardData();
    } catch (error) {
        console.error('Error deleting face-to-face:', error);
        showMessage('Ошибка удаления соревнования', 'error');
    }
}

// Tracks Functions
async function loadTracks() {
    try {
        const tracks = await fetchData('/api/tracks');
        displayTracks(tracks);
    } catch (error) {
        console.error('Error loading tracks:', error);
        showMessage('Ошибка загрузки треков', 'error');
    }
}

function displayTracks(tracks) {
    const tbody = document.getElementById('tracksTableBody');
    tbody.innerHTML = '';
    
    tracks.forEach(track => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${track.id}</td>
            <td>${track.state}</td>
            <td>${track.address}</td>
            <td>${track.trackConfigs?.length || 0}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-edit" onclick="editTrack(${track.id})">Изменить</button>
                    <button class="btn-delete" onclick="deleteTrack(${track.id})">Удалить</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function deleteTrack(trackId) {
    if (!confirm('Вы уверены, что хотите удалить этот трек?')) {
        return;
    }
    
    try {
        await fetchData(`/api/tracks/${trackId}`, 'DELETE');
        showMessage('Трек удален', 'success');
        loadTracks();
        loadDashboardData();
    } catch (error) {
        console.error('Error deleting track:', error);
        showMessage('Ошибка удаления трека', 'error');
    }
}

// Modal Functions
function openUserModal(userId = null) {
    const modal = document.getElementById('userModal');
    const title = document.getElementById('userModalTitle');
    
    if (userId) {
        title.textContent = 'Изменить пользователя';
        loadUserData(userId);
    } else {
        title.textContent = 'Добавить пользователя';
        document.getElementById('userForm').reset();
    }
    
    modal.classList.add('show');
}

function openEventModal(eventId = null) {
    const modal = document.getElementById('eventModal');
    const title = document.getElementById('eventModalTitle');
    
    if (eventId) {
        title.textContent = 'Изменить событие';
        loadEventData(eventId);
    } else {
        title.textContent = 'Добавить событие';
        document.getElementById('eventForm').reset();
        loadEventFormData();
    }
    
    modal.classList.add('show');
}

function openTrackModal(trackId = null) {
    const modal = document.getElementById('trackModal');
    const title = document.getElementById('trackModalTitle');
    
    if (trackId) {
        title.textContent = 'Изменить трек';
        loadTrackData(trackId);
    } else {
        title.textContent = 'Добавить трек';
        document.getElementById('trackForm').reset();
    }
    
    modal.classList.add('show');
}

function openFaceToFaceModal(faceToFaceId = null) {
    const modal = document.getElementById('faceToFaceModal');
    const title = document.getElementById('faceToFaceModalTitle');
    
    if (faceToFaceId) {
        title.textContent = 'Изменить соревнование';
        loadFaceToFaceData(faceToFaceId);
    } else {
        title.textContent = 'Добавить соревнование';
        document.getElementById('faceToFaceForm').reset();
        loadFaceToFaceFormData();
    }
    
    modal.classList.add('show');
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('show');
    });
}

// Form Handlers
async function handleUserSubmit(e) {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('userName').value,
        firstName: document.getElementById('userFirstName').value,
        lastName: document.getElementById('userLastName').value,
        email: document.getElementById('userEmail').value,
        phone: document.getElementById('userPhone').value,
        instagram: document.getElementById('userInstagram').value,
        motto: document.getElementById('userMotto').value,
        sponsors: document.getElementById('userSponsors').value
    };
    
    try {
        const userId = document.getElementById('userModalTitle').textContent.includes('Изменить') 
            ? getCurrentEditingId() 
            : null;
            
        if (userId) {
            await fetchData(`/api/users/${userId}`, 'PUT', formData);
            showMessage('Пользователь обновлен', 'success');
        } else {
            await fetchData('/api/users', 'POST', formData);
            showMessage('Пользователь создан', 'success');
        }
        
        closeModal();
        loadUsers();
        loadDashboardData();
    } catch (error) {
        console.error('Error saving user:', error);
        showMessage('Ошибка сохранения пользователя', 'error');
    }
}

async function handleEventSubmit(e) {
    e.preventDefault();
    
    const formData = {
        date: document.getElementById('eventDate').value,
        eventType: document.getElementById('eventType').value,
        trackId: parseInt(document.getElementById('eventTrackId').value),
        scheduleId: parseInt(document.getElementById('eventScheduleId').value),
        driverLimit: parseInt(document.getElementById('eventDriverLimit').value),
        spectatorLimit: parseInt(document.getElementById('eventSpectatorLimit').value),
        driverPrice: parseFloat(document.getElementById('eventDriverPrice').value),
        spectatorPrice: parseFloat(document.getElementById('eventSpectatorPrice').value)
    };
    
    try {
        const eventId = document.getElementById('eventModalTitle').textContent.includes('Изменить') 
            ? getCurrentEditingId() 
            : null;
            
        if (eventId) {
            await fetchData(`/api/events/${eventId}`, 'PATCH', formData);
            showMessage('Событие обновлено', 'success');
        } else {
            await fetchData('/api/events', 'POST', formData);
            showMessage('Событие создано', 'success');
        }
        
        closeModal();
        loadEvents();
        loadDashboardData();
    } catch (error) {
        console.error('Error saving event:', error);
        showMessage('Ошибка сохранения события', 'error');
    }
}

async function handleTrackSubmit(e) {
    e.preventDefault();
    
    const formData = {
        state: document.getElementById('trackState').value,
        address: document.getElementById('trackAddress').value,
        thumbnailUrl: document.getElementById('trackThumbnailUrl').value,
        instructionUrl: document.getElementById('trackInstructionUrl').value,
        notes: document.getElementById('trackNotes').value
    };
    
    try {
        const trackId = document.getElementById('trackModalTitle').textContent.includes('Изменить') 
            ? getCurrentEditingId() 
            : null;
            
        if (trackId) {
            await fetchData(`/api/tracks/${trackId}`, 'PATCH', formData);
            showMessage('Трек обновлен', 'success');
        } else {
            await fetchData('/api/tracks', 'POST', formData);
            showMessage('Трек создан', 'success');
        }
        
        closeModal();
        loadTracks();
        loadDashboardData();
    } catch (error) {
        console.error('Error saving track:', error);
        showMessage('Ошибка сохранения трека', 'error');
    }
}

async function handleFaceToFaceSubmit(e) {
    e.preventDefault();
    
    const formData = {
        startTime: document.getElementById('faceToFaceStartTime').value,
        eventId: parseInt(document.getElementById('faceToFaceEventId').value),
        user1Id: parseInt(document.getElementById('faceToFaceUser1Id').value),
        user2Id: parseInt(document.getElementById('faceToFaceUser2Id').value),
        autoUser1Id: parseInt(document.getElementById('faceToFaceAutoUser1Id').value),
        autoUser2Id: parseInt(document.getElementById('faceToFaceAutoUser2Id').value),
        userPhoto1: document.getElementById('faceToFaceUserPhoto1').value,
        userPhoto2: document.getElementById('faceToFaceUserPhoto2').value,
        autoPhoto1: document.getElementById('faceToFaceAutoPhoto1').value,
        autoPhoto2: document.getElementById('faceToFaceAutoPhoto2').value
    };
    
    try {
        const faceToFaceId = document.getElementById('faceToFaceModalTitle').textContent.includes('Изменить') 
            ? getCurrentEditingId() 
            : null;
            
        if (faceToFaceId) {
            await fetchData(`/api/face-to-face/${faceToFaceId}`, 'PATCH', formData);
            showMessage('Соревнование обновлено', 'success');
        } else {
            await fetchData('/api/face-to-face', 'POST', formData);
            showMessage('Соревнование создано', 'success');
        }
        
        closeModal();
        loadFaceToFace();
        loadDashboardData();
    } catch (error) {
        console.error('Error saving face-to-face:', error);
        showMessage('Ошибка сохранения соревнования', 'error');
    }
}

// Helper Functions
async function fetchData(url, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };
    
    if (authToken) {
        options.headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    const response = await fetch(`${API_BASE_URL}${url}`, options);
    
    if (!response.ok) {
        if (response.status === 401) {
            logout();
            throw new Error('Unauthorized');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    if (method === 'DELETE') {
        return null;
    }
    
    return await response.json();
}

function showMessage(message, type = 'success') {
    // Remove existing messages
    document.querySelectorAll('.message').forEach(msg => msg.remove());
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    const mainContent = document.getElementById('mainContent');
    mainContent.insertBefore(messageDiv, mainContent.firstChild);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Load form data for dropdowns
async function loadEventFormData() {
    try {
        const [tracks, schedules] = await Promise.all([
            fetchData('/api/tracks'),
            fetchData('/api/schedules')
        ]);
        
        const trackSelect = document.getElementById('eventTrackId');
        const scheduleSelect = document.getElementById('eventScheduleId');
        
        trackSelect.innerHTML = '<option value="">Выберите трек</option>';
        scheduleSelect.innerHTML = '<option value="">Выберите расписание</option>';
        
        tracks.forEach(track => {
            const option = document.createElement('option');
            option.value = track.id;
            option.textContent = `${track.state} - ${track.address}`;
            trackSelect.appendChild(option);
        });
        
        schedules.forEach(schedule => {
            const option = document.createElement('option');
            option.value = schedule.id;
            option.textContent = schedule.name;
            scheduleSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading form data:', error);
    }
}

async function loadFaceToFaceFormData() {
    try {
        const [events, users, cars] = await Promise.all([
            fetchData('/api/events'),
            fetchData('/api/users'),
            fetchData('/api/cars')
        ]);
        
        const eventSelect = document.getElementById('faceToFaceEventId');
        const user1Select = document.getElementById('faceToFaceUser1Id');
        const user2Select = document.getElementById('faceToFaceUser2Id');
        const car1Select = document.getElementById('faceToFaceAutoUser1Id');
        const car2Select = document.getElementById('faceToFaceAutoUser2Id');
        
        // Clear existing options
        [eventSelect, user1Select, user2Select, car1Select, car2Select].forEach(select => {
            select.innerHTML = select.id.includes('Event') ? '<option value="">Выберите событие</option>' : 
                              select.id.includes('User') ? '<option value="">Выберите участника</option>' :
                              '<option value="">Выберите автомобиль</option>';
        });
        
        events.forEach(event => {
            const option = document.createElement('option');
            option.value = event.id;
            option.textContent = `${event.eventType} - ${new Date(event.date).toLocaleDateString('ru-RU')}`;
            eventSelect.appendChild(option);
        });
        
        users.forEach(user => {
            const option1 = document.createElement('option');
            const option2 = document.createElement('option');
            option1.value = option2.value = user.id;
            option1.textContent = option2.textContent = user.name;
            user1Select.appendChild(option1);
            user2Select.appendChild(option2);
        });
        
        cars.forEach(car => {
            const option1 = document.createElement('option');
            const option2 = document.createElement('option');
            option1.value = option2.value = car.id;
            option1.textContent = option2.textContent = `${car.brand} ${car.model} (${car.horsepower}hp)`;
            car1Select.appendChild(option1);
            car2Select.appendChild(option2);
        });
    } catch (error) {
        console.error('Error loading face-to-face form data:', error);
    }
}

// Edit functions (placeholder - would need to load data from API)
function editUser(userId) {
    openUserModal(userId);
    // In a real implementation, you would load the user data here
}

function editEvent(eventId) {
    openEventModal(eventId);
    // In a real implementation, you would load the event data here
}

function editTrack(trackId) {
    openTrackModal(trackId);
    // In a real implementation, you would load the track data here
}

function editFaceToFace(faceToFaceId) {
    openFaceToFaceModal(faceToFaceId);
    // In a real implementation, you would load the face-to-face data here
}

function getCurrentEditingId() {
    // This would need to be implemented to track which item is being edited
    // For now, return null
    return null;
}

// Config functions
function loadConfig() {
    document.getElementById('apiBaseUrl').value = API_BASE_URL;
    document.getElementById('authToken').value = authToken ? '***' : 'Не авторизован';
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        closeModal();
    }
});

