// Global variables
let currentUser = null;
let authToken = localStorage.getItem('authToken');
let refreshToken = localStorage.getItem('refreshToken');
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
    // Check if user is already logged in and token is valid
    if (authToken && !isTokenExpired(authToken)) {
        showAdminPanel();
        loadDashboardData();
        startTokenMonitoring();
    } else if (authToken && isTokenExpired(authToken)) {
        // Токен истек, попытаемся его обновить
        handleTokenExpiry().then(refreshed => {
            if (refreshed) {
                showAdminPanel();
                loadDashboardData();
                startTokenMonitoring();
            }
        });
    } else {
        showLoginPage();
    }
    
    setupEventListeners();
}

// Автоматический мониторинг токена
let tokenCheckInterval = null;

function startTokenMonitoring() {
    // Очищаем предыдущий интервал
    if (tokenCheckInterval) {
        clearInterval(tokenCheckInterval);
    }
    
    // Проверяем токен каждые 5 минут
    tokenCheckInterval = setInterval(async () => {
        if (authToken && isTokenExpired(authToken)) {
            console.log('Token expired during monitoring, attempting refresh...');
            const refreshed = await handleTokenExpiry();
            if (!refreshed) {
                clearInterval(tokenCheckInterval);
                tokenCheckInterval = null;
            }
        }
    }, 5 * 60 * 1000); // 5 минут
}

function stopTokenMonitoring() {
    if (tokenCheckInterval) {
        clearInterval(tokenCheckInterval);
        tokenCheckInterval = null;
    }
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
            console.log('Navigation clicked:', section);
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
    
    // Очистка ошибок валидации при изменении полей
    const userFormFields = ['userName', 'userFirstName', 'userLastName', 'userEmail', 'userPhone', 'userPassword', 'userProfilePhotoUrl', 'userOfficialPhotoUrl'];
    userFormFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', () => clearFieldError(fieldId));
        }
    });
    
    // Предварительный просмотр фото
    setupPhotoPreview('userProfilePhotoUrl', 'profilePhotoPreview');
    setupPhotoPreview('userOfficialPhotoUrl', 'officialPhotoPreview');
    
    // Search
    document.getElementById('userSearch').addEventListener('input', filterUsers);
    
    // Token refresh button
    const refreshTokenBtn = document.getElementById('refreshTokenBtn');
    if (refreshTokenBtn) {
        refreshTokenBtn.addEventListener('click', async () => {
            if (refreshToken) {
                const refreshed = await refreshAuthToken();
                if (refreshed) {
                    showMessage('Токен успешно обновлен', 'success');
                    loadConfig(); // Обновляем отображение токена
                } else {
                    showMessage('Ошибка обновления токена', 'error');
                }
            } else {
                showMessage('Нет refresh токена для обновления', 'error');
            }
        });
    }
    
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
    
    console.log('Attempting login with username:', username);
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Login successful:', data);
            authToken = data.accessToken;
            refreshToken = data.refreshToken;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('refreshToken', refreshToken);
            currentUser = data;
            showAdminPanel();
            loadDashboardData();
            showMessage('Успешный вход в систему', 'success');
        } else {
            const errorText = await response.text();
            console.error('Login failed:', response.status, errorText);
            showMessage(`Ошибка входа: ${response.status} - ${errorText || 'Неверные учетные данные'}`, 'error');
        }
    } catch (error) {
        console.error('Login error details:', error);
        showMessage(`Ошибка подключения к серверу: ${error.message}`, 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });
        
        if (response.ok) {
            showMessage('Регистрация прошла успешно. Теперь войдите в систему.', 'success');
            showLoginPage();
        } else {
            showMessage('Ошибка регистрации. Пользователь уже существует.', 'error');
        }
    } catch (error) {
        showMessage('Ошибка подключения к серверу', 'error');
        console.error('Register error:', error);
    }
}

function logout() {
    stopTokenMonitoring();
    authToken = null;
    refreshToken = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    currentUser = null;
    showLoginPage();
}

// Token management functions
function isTokenExpired(token) {
    if (!token) return true;
    
    try {
        // Парсим JWT токен
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        
        // Проверяем, истек ли токен (с небольшим буфером в 60 секунд)
        return payload.exp < (currentTime + 60);
    } catch (error) {
        console.error('Error parsing token:', error);
        return true;
    }
}

async function refreshAuthToken() {
    if (!refreshToken) {
        console.log('No refresh token available');
        return false;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken })
        });
        
        if (response.ok) {
            const data = await response.json();
            authToken = data.accessToken;
            refreshToken = data.refreshToken;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('refreshToken', refreshToken);
            console.log('Token refreshed successfully');
            return true;
        } else {
            console.log('Token refresh failed:', response.status);
            return false;
        }
    } catch (error) {
        console.error('Error refreshing token:', error);
        return false;
    }
}

async function handleTokenExpiry() {
    console.log('Token expired, attempting refresh...');
    
    // Попытаемся обновить токен
    const refreshed = await refreshAuthToken();
    
    if (!refreshed) {
        console.log('Token refresh failed, redirecting to login');
        showMessage('Сессия истекла. Пожалуйста, войдите в систему заново.', 'error');
        logout();
        return false;
    }
    
    return true;
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
    
    // Показать dashboard по умолчанию
    showSection('dashboard');
}

function toggleSidebar() {
    sidebar.classList.toggle('open');
}

function closeSidebar() {
    sidebar.classList.remove('open');
}

function showSection(sectionName) {
    console.log('showSection called with:', sectionName);
    
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    let sectionId;
    if (sectionName === 'dashboard') {
        sectionId = 'dashboard';
    } else {
        sectionId = sectionName + 'Section';
    }
    
    const section = document.getElementById(sectionId);
    console.log('Found section element:', section);
    
    if (section) {
        section.classList.add('active');
        loadSectionData(sectionName);
    } else {
        console.error('Section not found:', sectionId);
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
    
    console.log('🔍 [DEBUG] Начинаем отображение пользователей:', users.length);
    
    users.forEach((user, index) => {
        console.log(`👤 [DEBUG] Обрабатываем пользователя ${index + 1}:`, {
            id: user.id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            profilePhotoUrl: user.profilePhotoUrl,
            officialPhotoUrl: user.officialPhotoUrl
        });
        
        const row = document.createElement('tr');
        
        // Функция для создания фото профиля
        const createProfilePhoto = (photoUrl, firstName, lastName) => {
            const initials = getInitials(firstName, lastName);
            console.log(`🖼️ [DEBUG] Создание фото для ${firstName} ${lastName}:`, {
                photoUrl: photoUrl,
                hasUrl: !!(photoUrl && photoUrl.trim()),
                initials: initials
            });
            
            if (photoUrl && photoUrl.trim()) {
                console.log(`✅ [DEBUG] URL фото найден: "${photoUrl}"`);
                return `<div class="photo-container">
                    <img src="${photoUrl}" alt="Фото профиля ${firstName || ''} ${lastName || ''}" class="profile-photo" 
                         onload="console.log('✅ [DEBUG] Изображение загружено успешно:', '${photoUrl}');"
                         onerror="console.log('❌ [DEBUG] Ошибка загрузки изображения:', '${photoUrl}'); this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="profile-photo-placeholder" style="display: none;">${initials}</div>
                </div>`;
            }
            
            console.log(`⚠️ [DEBUG] URL фото отсутствует или пустой, показываем placeholder с инициалами: "${initials}"`);
            // Создаем placeholder с инициалами пользователя
            return `<div class="photo-container">
                <div class="profile-photo-placeholder">${initials}</div>
            </div>`;
        };
        
        // Функция для получения инициалов
        const getInitials = (firstName, lastName) => {
            const first = firstName ? firstName.charAt(0).toUpperCase() : '';
            const last = lastName ? lastName.charAt(0).toUpperCase() : '';
            return first + last || '?';
        };
        
        // Функция для создания ссылки на фото
        const createPhotoLink = (photoUrl, text) => {
            console.log(`🔗 [DEBUG] Создание ссылки на фото:`, {
                photoUrl: photoUrl,
                text: text,
                hasUrl: !!photoUrl
            });
            
            if (photoUrl) {
                console.log(`✅ [DEBUG] Создаем ссылку на: "${photoUrl}"`);
                return `<a href="${photoUrl}" target="_blank" style="color: #007bff; text-decoration: none; font-size: 12px;">${text}</a>`;
            }
            console.log(`⚠️ [DEBUG] URL отсутствует, показываем "-"`);
            return '-';
        };
        
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${createProfilePhoto(user.profilePhotoUrl, user.firstName, user.lastName)}</td>
            <td>${user.username || '-'}</td>
            <td>${user.firstName || '-'}</td>
            <td>${user.lastName || '-'}</td>
            <td>${user.email || '-'}</td>
            <td>${user.phone || '-'}</td>
            <td>${user.instagram || '-'}</td>
            <td>${user.motto || '-'}</td>
            <td>${createPhotoLink(user.officialPhotoUrl, 'Фото')}</td>
            <td>${user.sponsors || '-'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-edit" onclick="editUser(${user.id})">Изменить</button>
                    <button class="btn-delete" onclick="deleteUser(${user.id})">Удалить</button>
                </div>
            </td>
        `;
        console.log(`📝 [DEBUG] HTML для строки пользователя ${user.id}:`, row.innerHTML);
        tbody.appendChild(row);
    });
    
    console.log('✅ [DEBUG] Отображение пользователей завершено. Всего строк в таблице:', tbody.children.length);
    
    // Автоматическая отладка пользователя 9
    const user9 = users.find(user => user.id === 9);
    if (user9) {
        console.log('🎯 [DEBUG] Специальная отладка для пользователя 9 (Anton Rykov):', user9);
        debugUserPhoto(9);
        
        // Проверим доступность его фото
        if (user9.profilePhotoUrl) {
            checkImageAvailability(user9.profilePhotoUrl).then(available => {
                console.log(`🔍 [DEBUG] Фото пользователя 9 доступно: ${available}`);
            });
        }
    }
}

function filterUsers() {
    const searchTerm = document.getElementById('userSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#usersTableBody tr');
    
    rows.forEach(row => {
        // Получаем текстовое содержимое всех ячеек для поиска
        const cells = Array.from(row.cells);
        const searchableText = cells.map(cell => {
            // Исключаем ячейки с действиями и фото
            if (cell.querySelector('.action-buttons') || cell.querySelector('.profile-photo') || cell.querySelector('.profile-photo-placeholder')) {
                return '';
            }
            return cell.textContent.toLowerCase();
        }).join(' ');
        
        if (searchableText.includes(searchTerm)) {
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
    const passwordField = document.getElementById('userPassword');
    const profilePhotoField = document.getElementById('userProfilePhotoUrl');
    const officialPhotoField = document.getElementById('userOfficialPhotoUrl');
    
    // Очищаем все ошибки валидации
    clearAllFieldErrors();
    
    if (userId) {
        title.textContent = 'Изменить пользователя';
        loadUserData(userId);
        // При редактировании скрываем поле пароля
        passwordField.parentElement.style.display = 'none';
        passwordField.removeAttribute('required');
        // Показываем поля для фото
        profilePhotoField.parentElement.style.display = 'block';
        officialPhotoField.parentElement.style.display = 'block';
    } else {
        title.textContent = 'Добавить пользователя';
        document.getElementById('userForm').reset();
        // При создании показываем поле пароля
        passwordField.parentElement.style.display = 'block';
        passwordField.setAttribute('required', 'required');
        // Показываем поля для фото
        profilePhotoField.parentElement.style.display = 'block';
        officialPhotoField.parentElement.style.display = 'block';
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
    
    // Очищаем предыдущие ошибки
    clearAllFieldErrors();
    
    const userId = document.getElementById('userModalTitle').textContent.includes('Изменить') 
        ? getCurrentEditingId() 
        : null;
    
    const formData = {
        name: document.getElementById('userName').value,
        username: document.getElementById('userName').value,
        firstName: document.getElementById('userFirstName').value,
        lastName: document.getElementById('userLastName').value,
        email: document.getElementById('userEmail').value,
        phone: document.getElementById('userPhone').value,
        instagram: document.getElementById('userInstagram').value,
        motto: document.getElementById('userMotto').value,
        sponsors: document.getElementById('userSponsors').value,
        profilePhotoUrl: document.getElementById('userProfilePhotoUrl').value,
        officialPhotoUrl: document.getElementById('userOfficialPhotoUrl').value
    };
    
    // Добавляем пароль только при создании нового пользователя
    if (!userId) {
        formData.password = document.getElementById('userPassword').value;
    }
    
    try {
        let response;
        if (userId) {
            response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(formData)
            });
        } else {
            response = await fetch(`${API_BASE_URL}/api/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(formData)
            });
        }
        
        if (response.ok) {
            const successMessage = userId ? 'Пользователь обновлен' : 'Пользователь создан';
            showMessage(successMessage, 'success');
            closeModal();
            loadUsers();
            loadDashboardData();
        } else {
            // Обработка ошибок валидации
            const errorData = await response.json();
            console.error('Validation errors:', errorData);
            
            if (errorData.errors && typeof errorData.errors === 'object') {
                // Отображаем ошибки валидации для каждого поля
                Object.keys(errorData.errors).forEach(field => {
                    const fieldName = mapServerFieldToClientField(field);
                    showFieldError(fieldName, errorData.errors[field]);
                });
                
                const errorMessage = errorData.message || 'Проверьте правильность заполнения полей';
                showMessage(errorMessage, 'error');
            } else {
                // Общая ошибка
                const errorMessage = errorData.message || errorData.error || 'Ошибка сохранения пользователя';
                showMessage(errorMessage, 'error');
            }
        }
    } catch (error) {
        console.error('Error saving user:', error);
        showMessage('Ошибка подключения к серверу', 'error');
    }
}

// Маппинг полей сервера на поля клиента
function mapServerFieldToClientField(serverField) {
    const fieldMapping = {
        'username': 'userName',
        'name': 'userName',
        'firstName': 'userFirstName',
        'lastName': 'userLastName',
        'email': 'userEmail',
        'phone': 'userPhone',
        'password': 'userPassword',
        'instagram': 'userInstagram',
        'motto': 'userMotto',
        'sponsors': 'userSponsors',
        'profilePhotoUrl': 'userProfilePhotoUrl',
        'officialPhotoUrl': 'userOfficialPhotoUrl'
    };
    
    return fieldMapping[serverField] || serverField;
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
async function fetchData(url, method = 'GET', data = null, retryCount = 0) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };
    
    if (authToken) {
        // Проверяем токен перед отправкой запроса
        if (isTokenExpired(authToken)) {
            console.log('Token expired before request, attempting refresh...');
            const refreshed = await handleTokenExpiry();
            if (!refreshed) {
                throw new Error('Unauthorized - token refresh failed');
            }
        }
        options.headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    const response = await fetch(`${API_BASE_URL}${url}`, options);
    
    if (!response.ok) {
        if (response.status === 401) {
            // Если это первая попытка и у нас есть refresh token, попробуем обновить
            if (retryCount === 0 && refreshToken) {
                console.log('Received 401, attempting token refresh...');
                const refreshed = await handleTokenExpiry();
                if (refreshed) {
                    // Повторяем запрос с новым токеном
                    return fetchData(url, method, data, retryCount + 1);
                }
            }
            
            // Если обновление не удалось или это повторная попытка
            console.log('Authentication failed, redirecting to login');
            showMessage('Сессия истекла. Пожалуйста, войдите в систему заново.', 'error');
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

// Функции для работы с ошибками валидации
function showFieldError(fieldName, errorMessage) {
    const field = document.getElementById(fieldName);
    const errorElement = document.getElementById(fieldName + '-error');
    
    if (field && errorElement) {
        field.classList.add('error');
        errorElement.textContent = errorMessage;
    }
}

function clearFieldError(fieldName) {
    const field = document.getElementById(fieldName);
    const errorElement = document.getElementById(fieldName + '-error');
    
    if (field && errorElement) {
        field.classList.remove('error');
        errorElement.textContent = '';
    }
}

function clearAllFieldErrors() {
    const fields = ['userName', 'userFirstName', 'userLastName', 'userEmail', 'userPhone', 'userPassword', 'userProfilePhotoUrl', 'userOfficialPhotoUrl'];
    fields.forEach(field => clearFieldError(field));
}

// Функция для настройки предварительного просмотра фото
function setupPhotoPreview(inputId, previewId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    
    if (input && preview) {
        input.addEventListener('input', function() {
            const url = this.value.trim();
            
            if (url && isValidUrl(url)) {
                preview.src = url;
                preview.classList.add('show');
                
                // Обработка ошибки загрузки изображения
                preview.onerror = function() {
                    preview.classList.remove('show');
                    console.log('Ошибка загрузки изображения:', url);
                };
                
                preview.onload = function() {
                    console.log('Изображение загружено успешно:', url);
                };
            } else {
                preview.classList.remove('show');
                preview.src = '';
            }
        });
    }
}

// Функция для проверки валидности URL
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// Функция для проверки доступности изображения
async function checkImageAvailability(url) {
    return new Promise((resolve) => {
        if (!url || !isValidUrl(url)) {
            console.log(`❌ [DEBUG] Неверный URL: "${url}"`);
            resolve(false);
            return;
        }
        
        console.log(`🔍 [DEBUG] Проверяем доступность изображения: "${url}"`);
        const img = new Image();
        
        img.onload = () => {
            console.log(`✅ [DEBUG] Изображение доступно: "${url}"`);
            resolve(true);
        };
        
        img.onerror = (error) => {
            console.log(`❌ [DEBUG] Ошибка загрузки изображения "${url}":`, error);
            resolve(false);
        };
        
        img.src = url;
        
        // Таймаут для медленных соединений
        setTimeout(() => {
            console.log(`⏰ [DEBUG] Таймаут загрузки изображения: "${url}"`);
            resolve(false);
        }, 5000);
    });
}

// Функция для отладки конкретного пользователя
function debugUserPhoto(userId) {
    console.log(`🔍 [DEBUG] Отладка фото пользователя ID: ${userId}`);
    
    // Найдем пользователя в таблице
    const rows = document.querySelectorAll('#usersTableBody tr');
    rows.forEach((row, index) => {
        const idCell = row.cells[0];
        if (idCell && idCell.textContent === userId.toString()) {
            console.log(`👤 [DEBUG] Найден пользователь в строке ${index + 1}`);
            
            const photoCell = row.cells[1];
            if (photoCell) {
                console.log(`🖼️ [DEBUG] Ячейка с фото:`, photoCell);
                
                const img = photoCell.querySelector('.profile-photo');
                const placeholder = photoCell.querySelector('.profile-photo-placeholder');
                
                if (img) {
                    console.log(`📸 [DEBUG] Найдено изображение:`, {
                        src: img.src,
                        alt: img.alt,
                        style: img.style.cssText,
                        display: img.style.display,
                        naturalWidth: img.naturalWidth,
                        naturalHeight: img.naturalHeight
                    });
                }
                
                if (placeholder) {
                    console.log(`🎭 [DEBUG] Найден placeholder:`, {
                        textContent: placeholder.textContent,
                        style: placeholder.style.cssText,
                        display: placeholder.style.display
                    });
                }
            }
        }
    });
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
    
    const tokenField = document.getElementById('authToken');
    if (authToken) {
        const isExpired = isTokenExpired(authToken);
        tokenField.value = isExpired ? 'Истек (требует обновления)' : 'Действителен';
        tokenField.style.color = isExpired ? '#ff6b6b' : '#51cf66';
    } else {
        tokenField.value = 'Не авторизован';
        tokenField.style.color = '#868e96';
    }
}

// Функция для тестирования валидации (можно удалить в продакшене)
function testValidation() {
    showFieldError('userName', 'Имя пользователя обязательно для заполнения');
    showFieldError('userEmail', 'Некорректный формат email');
    showFieldError('userPassword', 'Пароль должен содержать минимум 6 символов');
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        closeModal();
    }
});

// Глобальные функции для отладки (доступны в консоли)
window.debugUser = function(userId) {
    console.log(`🔍 [DEBUG] Ручная отладка пользователя ID: ${userId}`);
    debugUserPhoto(userId);
};

window.debugAllUsers = function() {
    console.log('🔍 [DEBUG] Отладка всех пользователей в таблице');
    const rows = document.querySelectorAll('#usersTableBody tr');
    console.log(`📊 [DEBUG] Найдено строк в таблице: ${rows.length}`);
    
    rows.forEach((row, index) => {
        const idCell = row.cells[0];
        const photoCell = row.cells[1];
        if (idCell && photoCell) {
            console.log(`👤 [DEBUG] Строка ${index + 1} - ID: ${idCell.textContent}`);
            
            const img = photoCell.querySelector('.profile-photo');
            const placeholder = photoCell.querySelector('.profile-photo-placeholder');
            
            if (img) {
                console.log(`  📸 Изображение: src="${img.src}", display="${img.style.display}"`);
            }
            if (placeholder) {
                console.log(`  🎭 Placeholder: text="${placeholder.textContent}", display="${placeholder.style.display}"`);
            }
        }
    });
};

window.testImageUrl = function(url) {
    console.log(`🔍 [DEBUG] Тестирование URL изображения: "${url}"`);
    checkImageAvailability(url).then(available => {
        console.log(`📊 [DEBUG] Результат тестирования "${url}": ${available ? '✅ Доступно' : '❌ Недоступно'}`);
    });
};

