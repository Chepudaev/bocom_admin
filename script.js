// Global variables
let currentUser = null;
let authToken = localStorage.getItem('authToken');
let refreshToken = localStorage.getItem('refreshToken');
const API_BASE_URL = 'http://localhost:8080';

// Система браузерной истории
let isNavigating = false; // Флаг для предотвращения записи в историю при программной навигации

// Функции для управления браузерной историей
function updateURL(path, state = {}) {
    if (isNavigating) {
        console.log('🔄 [DEBUG] Пропускаем обновление URL - программная навигация');
        return;
    }
    
    console.log(`🌐 [DEBUG] Обновление URL: ${path}`, state);
    
    // Обновляем URL без перезагрузки страницы
    const newURL = `${window.location.pathname}${path}`;
    window.history.pushState(state, '', newURL);
}

function navigateToURL(path, state = {}) {
    console.log(`🧭 [DEBUG] Навигация к URL: ${path}`, state);
    
    isNavigating = true;
    
    // Обновляем URL
    const newURL = `${window.location.pathname}${path}`;
    window.history.pushState(state, '', newURL);
    
    // Выполняем навигацию
    if (state.section) {
        showSection(state.section);
    }
    
    if (state.userId) {
        showUserProfile(state.userId);
    }
    
    if (state.viewType) {
        toggleProfileView(state.viewType, state.userId);
    }
    
    isNavigating = false;
}

// Обработчик события popstate (кнопки браузера назад/вперед)
window.addEventListener('popstate', function(event) {
    console.log('⬅️➡️ [DEBUG] Обработка popstate события:', event.state);
    
    if (event.state) {
        isNavigating = true;
        
        // Восстанавливаем состояние страницы
        if (event.state.section) {
            showSection(event.state.section);
        }
        
        if (event.state.userId) {
            showUserProfile(event.state.userId);
        }
        
        if (event.state.viewType) {
            toggleProfileView(event.state.viewType, event.state.userId);
        }
        
        isNavigating = false;
    } else {
        // Если нет состояния, возвращаемся к dashboard
        console.log('🏠 [DEBUG] Нет состояния, возврат к dashboard');
        showSection('dashboard');
    }
});

// Функции для сохранения и восстановления текущей страницы
function saveCurrentPage(pageName) {
    localStorage.setItem('currentPage', pageName);
    console.log(`💾 [DEBUG] Сохранена текущая страница: ${pageName}`);
}

function getCurrentPage() {
    const savedPage = localStorage.getItem('currentPage');
    console.log(`📖 [DEBUG] Восстановление страницы: ${savedPage || 'dashboard (по умолчанию)'}`);
    return savedPage || 'dashboard';
}

function clearCurrentPage() {
    localStorage.removeItem('currentPage');
    console.log(`🗑️ [DEBUG] Очищена сохраненная страница`);
}

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
        initializeBrowserHistory();
    } else if (authToken && isTokenExpired(authToken)) {
        // Токен истек, попытаемся его обновить
        handleTokenExpiry().then(refreshed => {
            if (refreshed) {
                showAdminPanel();
                loadDashboardData();
                startTokenMonitoring();
                initializeBrowserHistory();
            }
        });
    } else {
        showLoginPage();
    }
    
    setupEventListeners();
}

// Функция для инициализации браузерной истории
function initializeBrowserHistory() {
    console.log('🌐 [DEBUG] Инициализация браузерной истории');
    
    // Получаем текущий URL
    const currentURL = window.location.hash;
    console.log('📍 [DEBUG] Текущий URL:', currentURL);
    
    if (currentURL) {
        // Парсим URL и восстанавливаем состояние
        parseURLAndNavigate(currentURL);
    } else {
        // Если нет хеша, показываем dashboard
        console.log('🏠 [DEBUG] Нет хеша в URL, показываем dashboard');
        showSection('dashboard');
    }
}

// Функция для парсинга URL и навигации
function parseURLAndNavigate(url) {
    console.log('🔍 [DEBUG] Парсинг URL:', url);
    
    // Убираем символ # в начале
    const cleanURL = url.replace('#', '');
    
    if (cleanURL.startsWith('user/')) {
        // URL профиля пользователя: #user/123 или #user/123/cars
        const parts = cleanURL.split('/');
        const userId = parseInt(parts[1]);
        const viewType = parts[2] || 'info';
        
        console.log(`👤 [DEBUG] Навигация к профилю пользователя ${userId}, вид: ${viewType}`);
        
        isNavigating = true;
        showUserProfile(userId);
        if (viewType !== 'info') {
            toggleProfileView(viewType, userId);
        }
        isNavigating = false;
    } else {
        // Обычная секция: #dashboard, #users, etc.
        console.log(`📄 [DEBUG] Навигация к секции: ${cleanURL}`);
        
        isNavigating = true;
        showSection(cleanURL);
        isNavigating = false;
    }
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
    document.getElementById('carForm').addEventListener('submit', handleCarSubmit);
    
    // Очистка ошибок валидации при изменении полей
    const userFormFields = ['userName', 'userFirstName', 'userLastName', 'userEmail', 'userPhone', 'userPassword', 'userProfilePhotoUrl', 'userOfficialPhotoUrl'];
    userFormFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', () => clearFieldError(fieldId));
        }
    });
    
    // Очистка ошибок валидации для полей автомобиля
    const carFormFields = ['carBrand', 'carModel', 'carYear', 'carColor', 'carHorsepower'];
    carFormFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', () => clearCarFieldError(fieldId));
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
    clearCurrentPage(); // Очищаем сохраненную страницу при выходе
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
    
    // Восстановить сохраненную страницу или показать dashboard по умолчанию
    const savedPage = getCurrentPage();
    showSection(savedPage);
}

function toggleSidebar() {
    sidebar.classList.toggle('open');
}

function closeSidebar() {
    sidebar.classList.remove('open');
}

function showSection(sectionName) {
    console.log('showSection called with:', sectionName);
    
    // Сохраняем текущую страницу
    saveCurrentPage(sectionName);
    
    // Обновляем URL и добавляем в браузерную историю
    updateURL(`#${sectionName}`, {
        section: sectionName,
        type: 'section'
    });
    
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    let sectionId;
    if (sectionName === 'dashboard') {
        sectionId = 'dashboard';
    } else if (sectionName === 'userProfile') {
        sectionId = 'userProfileSection';
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
        // Если секция не найдена, показываем dashboard
        console.log('Fallback to dashboard');
        showSection('dashboard');
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

// Функция для отображения профиля пользователя
function showUserProfile(userId) {
    console.log(`👤 [DEBUG] Отображение профиля пользователя ID: ${userId}`);
    
    // Сохраняем текущую страницу
    saveCurrentPage('userProfile');
    
    // Обновляем URL и добавляем в браузерную историю
    updateURL(`#user/${userId}`, {
        section: 'userProfile',
        userId: userId,
        type: 'userProfile'
    });
    
    // Скрываем все секции
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Показываем секцию профиля
    const profileSection = document.getElementById('userProfileSection');
    if (profileSection) {
        profileSection.classList.add('active');
        loadUserProfile(userId);
    } else {
        console.error('❌ [DEBUG] Секция профиля не найдена');
    }
}

// Функция для загрузки данных профиля пользователя
async function loadUserProfile(userId) {
    try {
        console.log(`📊 [DEBUG] Загрузка данных профиля для пользователя ${userId}`);
        
        // Получаем данные пользователя
        const user = await fetchData(`/api/users/${userId}`);
        
        if (user) {
            console.log(`✅ [DEBUG] Данные пользователя загружены:`, user);
            displayUserProfile(user);
        } else {
            console.error('❌ [DEBUG] Не удалось загрузить данные пользователя');
            showMessage('Ошибка загрузки данных пользователя', 'error');
        }
    } catch (error) {
        console.error('❌ [DEBUG] Ошибка при загрузке профиля:', error);
        showMessage('Ошибка при загрузке профиля пользователя', 'error');
    }
}

// Глобальная функция для получения инициалов
function getInitials(firstName, lastName) {
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return first + last || '?';
}

// Глобальная функция для создания Instagram ссылки
function createInstagramLink(instagramHandle) {
    console.log(`📱 [DEBUG] Создание Instagram ссылки:`, {
        instagramHandle: instagramHandle
    });
    
    if (instagramHandle && instagramHandle.trim()) {
        // Убираем символ @ если он есть
        const cleanHandle = instagramHandle.replace(/^@/, '');
        const instagramUrl = `https://instagram.com/${cleanHandle}`;
        
        console.log(`✅ [DEBUG] Создаем Instagram ссылку: "${instagramUrl}"`);
        return `<a href="${instagramUrl}" target="_blank" 
                       class="instagram-link"
                       title="Открыть профиль в Instagram">
                       <i class="fab fa-instagram"></i>${instagramHandle}
                    </a>`;
    }
    
    console.log(`⚠️ [DEBUG] Instagram handle отсутствует, показываем "-"`);
    return '-';
}

// Функция для отображения данных профиля
function displayUserProfile(user) {
    console.log(`📝 [DEBUG] Отображение профиля пользователя:`, user);
    
    // Сохраняем ID текущего пользователя
    setCurrentProfileUserId(user.id);
    
    // Основная информация
    document.getElementById('profileName').textContent = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Не указано';
    document.getElementById('profileUsername').textContent = `@${user.username || 'username'}`;
    
    // Аватар
    const avatarImg = document.getElementById('profileAvatar');
    const avatarPlaceholder = document.getElementById('profileAvatarPlaceholder');
    
    if (user.profilePhotoUrl && user.profilePhotoUrl.trim()) {
        avatarImg.src = user.profilePhotoUrl;
        avatarImg.style.display = 'block';
        avatarPlaceholder.style.display = 'none';
        
        avatarImg.onerror = () => {
            avatarImg.style.display = 'none';
            avatarPlaceholder.style.display = 'flex';
            avatarPlaceholder.textContent = getInitials(user.firstName, user.lastName);
        };
    } else {
        avatarImg.style.display = 'none';
        avatarPlaceholder.style.display = 'flex';
        avatarPlaceholder.textContent = getInitials(user.firstName, user.lastName);
    }
    
    // Информация о пользователе
    document.getElementById('profileFirstName').textContent = user.firstName || '-';
    document.getElementById('profileLastName').textContent = user.lastName || '-';
    document.getElementById('profileEmail').textContent = user.email || '-';
    document.getElementById('profilePhone').textContent = user.phone || '-';
    
    // Instagram
    const instagramElement = document.getElementById('profileInstagram');
    const followersElement = document.getElementById('profileInstagramFollowers');
    
    if (user.instagram && user.instagram.trim()) {
        const instagramLink = createInstagramLink(user.instagram);
        instagramElement.innerHTML = instagramLink;
        
        // Загружаем количество подписчиков Instagram
        loadInstagramFollowers(user.instagram);
    } else {
        instagramElement.textContent = '-';
        followersElement.textContent = '-';
    }
    
    document.getElementById('profileMotto').textContent = user.motto || '-';
    document.getElementById('profileSponsors').textContent = user.sponsors || '-';
    
    // Фотографии
    displayProfilePhotos(user);
    
    // Счетчики
    updateProfileCounters(user.id);
    
    // Устанавливаем начальное состояние - показываем информацию о пользователе
    toggleProfileView('info', user.id);
}

// Функция для отображения фотографий профиля
function displayProfilePhotos(user) {
    // Фото профиля
    const profilePhotoImg = document.getElementById('profilePhotoDisplay');
    const profilePhotoPlaceholder = document.getElementById('profilePhotoPlaceholder');
    
    if (user.profilePhotoUrl && user.profilePhotoUrl.trim()) {
        profilePhotoImg.src = user.profilePhotoUrl;
        profilePhotoImg.style.display = 'block';
        profilePhotoPlaceholder.style.display = 'none';
        
        profilePhotoImg.onerror = () => {
            profilePhotoImg.style.display = 'none';
            profilePhotoPlaceholder.style.display = 'flex';
            profilePhotoPlaceholder.textContent = 'Нет';
        };
    } else {
        profilePhotoImg.style.display = 'none';
        profilePhotoPlaceholder.style.display = 'flex';
        profilePhotoPlaceholder.textContent = 'Нет';
    }
    
    // Авторизованное фото
    const officialPhotoImg = document.getElementById('officialPhotoDisplay');
    const officialPhotoPlaceholder = document.getElementById('officialPhotoPlaceholder');
    
    if (user.officialPhotoUrl && user.officialPhotoUrl.trim()) {
        officialPhotoImg.src = user.officialPhotoUrl;
        officialPhotoImg.style.display = 'block';
        officialPhotoPlaceholder.style.display = 'none';
        
        officialPhotoImg.onerror = () => {
            officialPhotoImg.style.display = 'none';
            officialPhotoPlaceholder.style.display = 'flex';
            officialPhotoPlaceholder.textContent = 'Нет';
        };
    } else {
        officialPhotoImg.style.display = 'none';
        officialPhotoPlaceholder.style.display = 'flex';
        officialPhotoPlaceholder.textContent = 'Нет';
    }
}

// Функция для обновления счетчиков профиля
async function updateProfileCounters(userId) {
    try {
        // Счетчик автомобилей
        const cars = await getUserCars(userId);
        document.getElementById('carsCount').textContent = cars.length;
        
        // Заглушки для других счетчиков
        document.getElementById('faceToFaceCount').textContent = '0'; // Пока заглушка
        document.getElementById('messagesCount').textContent = '0'; // Пока заглушка
    } catch (error) {
        console.error('❌ [DEBUG] Ошибка при обновлении счетчиков:', error);
        // Устанавливаем значения по умолчанию при ошибке
        document.getElementById('carsCount').textContent = '0';
        document.getElementById('faceToFaceCount').textContent = '0';
        document.getElementById('messagesCount').textContent = '0';
    }
}

// Функции для кнопок профиля (заглушки)
function viewUserCars() {
    showTooltip('Просмотр автомобилей будет реализован позже');
}

function viewFaceToFace() {
    showTooltip('Face to Face соревнования будут реализованы позже');
}

function viewMessages() {
    showTooltip('Сообщения будут реализованы позже');
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
        row.setAttribute('data-user-id', user.id);
        
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
                return `<img src="${photoUrl}" alt="Фото профиля ${firstName || ''} ${lastName || ''}" class="profile-photo" 
                         onload="console.log('✅ [DEBUG] Изображение загружено успешно:', '${photoUrl}');"
                         onerror="console.log('❌ [DEBUG] Ошибка загрузки изображения:', '${photoUrl}'); this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="profile-photo-placeholder" style="display: none;">${initials}</div>`;
            }
            
            console.log(`⚠️ [DEBUG] URL фото отсутствует или пустой, показываем placeholder с инициалами: "${initials}"`);
            // Создаем placeholder с инициалами пользователя
            return `<div class="profile-photo-placeholder">${initials}</div>`;
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
            <td>${createInstagramLink(user.instagram)}</td>
            <td>${user.motto || '-'}</td>
            <td>${createPhotoLink(user.officialPhotoUrl, 'Фото')}</td>
            <td>${user.sponsors || '-'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-cars" onclick="viewUserCars(${user.id})">Cars</button>
                    <button class="btn-edit" onclick="editUser(${user.id})">Изменить</button>
                    <button class="btn-delete" onclick="deleteUser(${user.id})">Удалить</button>
                </div>
            </td>
        `;
        console.log(`📝 [DEBUG] HTML для строки пользователя ${user.id}:`, row.innerHTML);
        tbody.appendChild(row);
    });
    
    console.log('✅ [DEBUG] Отображение пользователей завершено. Всего строк в таблице:', tbody.children.length);
    
    // Добавляем обработчики клика для строк пользователей
    addUserRowClickHandlers();
    
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
    
    // После фильтрации переустанавливаем обработчики клика для видимых строк
    addUserRowClickHandlers();
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

function openCarModal(userId = null) {
    console.log(`🚀 [DEBUG] openCarModal вызвана с userId: ${userId}`);
    
    const modal = document.getElementById('carModal');
    const title = document.getElementById('carModalTitle');
    
    console.log(`🔍 [DEBUG] Элементы найдены:`, {
        modal: !!modal,
        title: !!title
    });
    
    // Очищаем все ошибки валидации
    clearAllCarFieldErrors();
    
    // Если userId не передан, пытаемся получить из контекста
    if (!userId) {
        userId = getUserIdFromContext();
        console.log(`🔍 [DEBUG] userId получен из контекста: ${userId}`);
    }
    
    if (!userId) {
        console.error('❌ [DEBUG] Не удалось получить userId');
        showMessage('Ошибка: не удалось определить пользователя для добавления автомобиля', 'error');
        return;
    }
    
    // Всегда открываем в режиме "Добавить автомобиль" (не редактирование)
    title.textContent = 'Добавить автомобиль';
    document.getElementById('carForm').reset();
    
    // Сохраняем ID пользователя для создания автомобиля
    modal.setAttribute('data-user-id', userId);
    
    console.log(`✅ [DEBUG] Открытие модального окна автомобиля для пользователя ID: ${userId}`);
    console.log(`🔍 [DEBUG] Добавляем класс 'show' к модальному окну`);
    
    modal.classList.add('show');
    
    console.log(`🔍 [DEBUG] Классы модального окна после добавления:`, modal.className);
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

async function handleCarSubmit(e) {
    e.preventDefault();
    
    // Очищаем предыдущие ошибки
    clearAllCarFieldErrors();
    
    const modal = document.getElementById('carModal');
    const userId = modal.getAttribute('data-user-id');
    
    if (!userId) {
        showMessage('Ошибка: не найден ID пользователя', 'error');
        return;
    }
    
    const formData = {
        brand: document.getElementById('carBrand').value.trim(),
        model: document.getElementById('carModel').value.trim(),
        year: parseInt(document.getElementById('carYear').value),
        color: document.getElementById('carColor').value.trim(),
        color1: document.getElementById('carColor').value.trim(), // API требует color1
        horsepower: parseInt(document.getElementById('carHorsepower').value),
        userId: parseInt(userId),
        carClass: document.getElementById('carClass').value.trim(),
        color2: document.getElementById('carColor2').value.trim(),
        userPhotoUrl: document.getElementById('carUserPhotoUrl').value.trim(),
        moderatorPhotoUrl: document.getElementById('carModeratorPhotoUrl').value.trim()
    };
    
    // Валидация
    if (!formData.brand) {
        showCarFieldError('carBrand', 'Марка обязательна для заполнения');
        return;
    }
    
    if (!formData.model) {
        showCarFieldError('carModel', 'Модель обязательна для заполнения');
        return;
    }
    
    if (!formData.year || formData.year < 1900 || formData.year > 2024) {
        showCarFieldError('carYear', 'Год должен быть от 1900 до 2024');
        return;
    }
    
    if (!formData.color) {
        showCarFieldError('carColor', 'Цвет обязателен для заполнения');
        return;
    }
    
    if (!formData.horsepower || formData.horsepower < 1) {
        showCarFieldError('carHorsepower', 'Мощность должна быть больше 0');
        return;
    }
    
    try {
        // Показываем индикатор загрузки
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохранение...';
        submitBtn.disabled = true;
        
        console.log('🚀 [DEBUG] Отправляем данные автомобиля на сервер:', formData);
        console.log('🌐 [DEBUG] API_BASE_URL:', API_BASE_URL);
        console.log('🔗 [DEBUG] Полный URL:', `${API_BASE_URL}/api/cars`);
        
        // Отправляем данные на сервер
        const response = await fetchData('/api/cars', 'POST', formData);
        
        console.log('✅ [DEBUG] Автомобиль успешно создан:', response);
        
        showMessage('Автомобиль успешно добавлен', 'success');
        closeModal();
        
        // Обновляем отображение автомобилей
        const usersSection = document.getElementById('usersSection');
        if (usersSection && usersSection.classList.contains('active')) {
            // Если мы в таблице пользователей, обновляем отображение автомобилей
            const existingCarsRow = document.querySelector(`tr[data-cars-user-id="${userId}"]`);
            if (existingCarsRow) {
                // Удаляем старую строку и создаем новую с обновленными данными
                existingCarsRow.remove();
                toggleUserCarsInTable(parseInt(userId));
            }
        } else {
            // Если мы в профиле пользователя, обновляем список автомобилей
            loadUserCarsInProfile(parseInt(userId));
        }
        
        // Обновляем счетчик автомобилей
        updateProfileCounters(parseInt(userId));
        
    } catch (error) {
        console.error('❌ [DEBUG] Ошибка при создании автомобиля:', error);
        console.error('❌ [DEBUG] Тип ошибки:', error.name);
        console.error('❌ [DEBUG] Сообщение ошибки:', error.message);
        console.error('❌ [DEBUG] Стек ошибки:', error.stack);
        
        // Обработка ошибок валидации
        if (error.message && error.message.includes('400')) {
            showMessage('Проверьте правильность заполнения полей', 'error');
        } else if (error.message && error.message.includes('Failed to fetch')) {
            showMessage('Ошибка подключения к серверу. Проверьте, что API сервер запущен на порту 8080', 'error');
        } else {
            showMessage(`Ошибка при создании автомобиля: ${error.message}`, 'error');
        }
        
        // Восстанавливаем кнопку
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
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

// Функции для работы с ошибками валидации автомобилей
function showCarFieldError(fieldName, errorMessage) {
    const field = document.getElementById(fieldName);
    const errorElement = document.getElementById(fieldName + '-error');
    
    if (field && errorElement) {
        field.classList.add('error');
        errorElement.textContent = errorMessage;
    }
}

function clearCarFieldError(fieldName) {
    const field = document.getElementById(fieldName);
    const errorElement = document.getElementById(fieldName + '-error');
    
    if (field && errorElement) {
        field.classList.remove('error');
        errorElement.textContent = '';
    }
}

function clearAllCarFieldErrors() {
    const fields = ['carBrand', 'carModel', 'carYear', 'carColor', 'carHorsepower'];
    fields.forEach(field => clearCarFieldError(field));
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

// Функция для тестирования кнопки "Добавить автомобиль"
window.testAddCarButton = function() {
    console.log('🧪 [DEBUG] Тестирование кнопки "Добавить автомобиль"');
    console.log('📍 [DEBUG] Текущий URL:', window.location.hash);
    console.log('🔍 [DEBUG] ID пользователя из URL:', getCurrentProfileUserId());
    console.log('🔍 [DEBUG] ID пользователя из контекста:', getUserIdFromContext());
    
    // Проверяем, что модальное окно существует
    const modal = document.getElementById('carModal');
    console.log('🔍 [DEBUG] Модальное окно найдено:', !!modal);
    
    if (modal) {
        console.log('🔍 [DEBUG] Текущие классы модального окна:', modal.className);
    }
    
    // Симулируем клик по кнопке
    console.log('🚀 [DEBUG] Вызываем addCarToProfile()');
    addCarToProfile();
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

window.testInstagramLinks = function() {
    console.log('📱 [DEBUG] Тестирование Instagram ссылок');
    const rows = document.querySelectorAll('#usersTableBody tr');
    
    rows.forEach((row, index) => {
        const idCell = row.cells[0];
        const instagramCell = row.cells[7]; // Instagram колонка
        
        if (idCell && instagramCell) {
            const userId = idCell.textContent;
            const instagramLink = instagramCell.querySelector('.instagram-link');
            
            if (instagramLink) {
                console.log(`👤 [DEBUG] Пользователь ID ${userId}: Instagram ссылка найдена`, {
                    href: instagramLink.href,
                    text: instagramLink.textContent.trim()
                });
            } else {
                console.log(`👤 [DEBUG] Пользователь ID ${userId}: Instagram ссылка отсутствует, показывается "${instagramCell.textContent.trim()}"`);
            }
        }
    });
};

// Функция для отладки сохранения страниц
window.debugPageState = function() {
    console.log('📄 [DEBUG] Отладка состояния страниц:');
    console.log('💾 [DEBUG] Текущая сохраненная страница:', localStorage.getItem('currentPage'));
    console.log('🔍 [DEBUG] Активные секции:', Array.from(document.querySelectorAll('.content-section.active')).map(el => el.id));
    console.log('🎯 [DEBUG] Активная навигация:', document.querySelector('.nav-item.active')?.textContent?.trim());
};

// Универсальная функция для показа tooltip
function showTooltip(message, buttonElement) {
    // Удаляем предыдущий tooltip, если он есть
    const existingTooltip = document.querySelector('.tooltip');
    if (existingTooltip) {
        existingTooltip.remove();
    }
    
    // Создаем новый tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = message;
    
    // Используем координаты курсора мыши
    const mouseX = event.clientX;
    const mouseY = event.clientY;
    
    // Позиционируем tooltip относительно курсора
    tooltip.style.left = `${mouseX + 10}px`;
    tooltip.style.top = `${mouseY - 35}px`;
    tooltip.style.transform = 'none'; // Убираем transform, так как позиционируем абсолютно
    
    // Добавляем tooltip в DOM
    document.body.appendChild(tooltip);
    
    // Проверяем, не выходит ли tooltip за границы экрана
    const tooltipRect = tooltip.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Если tooltip выходит за правый край, сдвигаем влево
    if (tooltipRect.right > windowWidth) {
        tooltip.style.left = `${mouseX - tooltipRect.width - 10}px`;
    }
    
    // Если tooltip выходит за верхний край, показываем снизу от курсора
    if (tooltipRect.top < 0) {
        tooltip.style.top = `${mouseY + 10}px`;
        // Меняем стрелочку на верхнюю
        tooltip.style.setProperty('--arrow-direction', 'bottom');
    }
    
    // Показываем tooltip с анимацией
    setTimeout(() => {
        tooltip.classList.add('show');
    }, 10);
    
    // Скрываем tooltip через 3 секунды
    setTimeout(() => {
        tooltip.classList.remove('show');
        setTimeout(() => {
            if (tooltip.parentNode) {
                tooltip.remove();
            }
        }, 300);
    }, 3000);
}

// Функция для просмотра автомобилей пользователя
function viewUserCars(userId = null) {
    console.log(`🚗 [DEBUG] Просмотр автомобилей пользователя ID: ${userId || 'текущий пользователя'}`);
    
    // Если userId не передан, получаем его из контекста
    if (!userId) {
        userId = getUserIdFromContext();
    }
    
    if (!userId) {
        console.error('❌ [DEBUG] Не удалось определить ID пользователя');
        showMessage('Ошибка: не удалось определить пользователя', 'error');
        return;
    }
    
    // Если мы в таблице пользователей, показываем автомобили в таблице
    const usersSection = document.getElementById('usersSection');
    if (usersSection && usersSection.classList.contains('active')) {
        toggleUserCarsInTable(userId);
    } else {
        // Переключаем отображение в профиле
        toggleProfileView('cars', userId);
    }
}

// Функция для получения ID текущего профиля
function getCurrentProfileUserId() {
    console.log('🔍 [DEBUG] Получение ID пользователя из URL');
    
    // Сначала пытаемся получить из URL
    const currentURL = window.location.hash;
    console.log('📍 [DEBUG] Текущий URL:', currentURL);
    
    if (currentURL && currentURL.startsWith('#user/')) {
        const cleanURL = currentURL.replace('#', '');
        const parts = cleanURL.split('/');
        const userId = parseInt(parts[1]);
        
        console.log(`🔍 [DEBUG] Парсинг URL: cleanURL="${cleanURL}", parts=[${parts.join(', ')}], userId=${userId}`);
        
        if (userId && !isNaN(userId)) {
            console.log(`✅ [DEBUG] ID пользователя из URL: ${userId}`);
            return userId;
        }
    }
    
    // Если не удалось получить из URL, пытаемся из data-атрибута
    const profileSection = document.getElementById('userProfileSection');
    const userIdFromData = profileSection ? profileSection.getAttribute('data-current-user-id') : null;
    
    if (userIdFromData) {
        console.log(`✅ [DEBUG] ID пользователя из data-атрибута: ${userIdFromData}`);
        return parseInt(userIdFromData);
    }
    
    console.log('❌ [DEBUG] Не удалось получить ID пользователя ни из URL, ни из data-атрибута');
    return null;
}

// Функция для сохранения ID текущего пользователя в профиле
function setCurrentProfileUserId(userId) {
    const profileSection = document.getElementById('userProfileSection');
    if (profileSection) {
        profileSection.setAttribute('data-current-user-id', userId);
    }
}

// Функция для переключения между различными видами профиля
function toggleProfileView(viewType, userId) {
    console.log(`🔄 [DEBUG] Переключение на вид: ${viewType} для пользователя ${userId}`);
    
    // Обновляем URL для текущего вида профиля
    updateURL(`#user/${userId}/${viewType}`, {
        section: 'userProfile',
        userId: userId,
        viewType: viewType,
        type: 'profileView'
    });
    
    // Скрываем все секции профиля
    document.querySelectorAll('.profile-info-section, .profile-photos-section, .profile-cars-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Обновляем активное состояние кнопок
    document.querySelectorAll('.profile-action-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Показываем нужную секцию и активируем соответствующую кнопку
    switch (viewType) {
        case 'info':
            document.querySelector('.profile-info-section').style.display = 'block';
            document.querySelector('.profile-photos-section').style.display = 'block';
            document.querySelector('[onclick*="viewMessages"]').classList.add('active');
            break;
        case 'cars':
            document.getElementById('profileCarsSection').style.display = 'block';
            document.querySelector('[onclick*="viewUserCars"]').classList.add('active');
            loadUserCarsInProfile(userId);
            break;
        case 'faceToFace':
            // Пока заглушка
            showTooltip('Face to Face соревнования будут реализованы позже');
            break;
        case 'messages':
            // Пока заглушка
            showTooltip('Сообщения будут реализованы позже');
            break;
    }
}

// Функция для загрузки автомобилей пользователя в профиле
async function loadUserCarsInProfile(userId) {
    console.log(`🚗 [DEBUG] Загрузка автомобилей в профиле для пользователя ${userId}`);
    
    const carsList = document.getElementById('carsList');
    if (!carsList) {
        console.error('❌ [DEBUG] Контейнер для списка автомобилей не найден');
        return;
    }
    
    try {
        // Получаем автомобили пользователя
        const userCars = await getUserCars(userId);
        
        // Очищаем список
        carsList.innerHTML = '';
        
        if (userCars.length === 0) {
            carsList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #888;">
                    <i class="fas fa-car" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                    <p>У пользователя пока нет автомобилей</p>
                    <button class="btn-primary" onclick="addCarToProfile()" style="margin-top: 16px;">
                        <i class="fas fa-plus"></i>
                        Добавить первый автомобиль
                    </button>
                </div>
            `;
            return;
        }
    
    // Отображаем каждый автомобиль
    userCars.forEach((car, index) => {
        const carCard = document.createElement('div');
        carCard.className = 'car-card';
        
        // Функция для создания ссылки на фото
        const createPhotoLink = (photoUrl, text) => {
            if (photoUrl && photoUrl.trim()) {
                return `<a href="${photoUrl}" target="_blank" class="car-photo-link">${text}</a>`;
            }
            return '<span style="color: #888;">-</span>';
        };
        
        carCard.innerHTML = `
            <div class="car-card-header">
                <h4 class="car-title">${car.brand || 'Неизвестная марка'} ${car.model || 'Неизвестная модель'}</h4>
                <div class="car-actions">
                    <button class="car-action-btn" onclick="editCarInProfile(${car.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="car-action-btn" onclick="deleteCarFromProfile(${car.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            
            <div class="car-details">
                <div class="car-detail">
                    <span class="car-detail-label">Марка</span>
                    <span class="car-detail-value">${car.brand || '-'}</span>
                </div>
                <div class="car-detail">
                    <span class="car-detail-label">Модель</span>
                    <span class="car-detail-value">${car.model || '-'}</span>
                </div>
                <div class="car-detail">
                    <span class="car-detail-label">Год</span>
                    <span class="car-detail-value">${car.year || '-'}</span>
                </div>
                <div class="car-detail">
                    <span class="car-detail-label">Цвет</span>
                    <span class="car-detail-value">${car.color || '-'}</span>
                </div>
                <div class="car-detail">
                    <span class="car-detail-label">Мощность</span>
                    <span class="car-detail-value">${car.horsepower ? car.horsepower + ' л.с.' : '-'}</span>
                </div>
                <div class="car-detail">
                    <span class="car-detail-label">ID</span>
                    <span class="car-detail-value">#${car.id || '-'}</span>
                </div>
            </div>
            
            <div class="car-photos">
                ${createPhotoLink(car.photoUrl, 'Фото автомобиля')}
                ${createPhotoLink(car.officialPhotoUrl, 'Официальное фото')}
            </div>
        `;
        
        carsList.appendChild(carCard);
    });
    
    console.log(`✅ [DEBUG] Загружено ${userCars.length} автомобилей в профиле`);
    
    } catch (error) {
        console.error('❌ [DEBUG] Ошибка при загрузке автомобилей в профиле:', error);
        carsList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ff6b6b;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px;"></i>
                <p>Ошибка при загрузке автомобилей</p>
                <button class="btn-primary" onclick="loadUserCarsInProfile(${userId})" style="margin-top: 16px;">
                    <i class="fas fa-refresh"></i>
                    Попробовать снова
                </button>
            </div>
        `;
    }
}

// Функция для переключения отображения автомобилей в таблице
async function toggleUserCarsInTable(userId) {
    console.log(`🚗 [DEBUG] Переключение отображения автомобилей в таблице для пользователя ${userId}`);
    
    // Находим строку пользователя
    const userRow = document.querySelector(`tr[data-user-id="${userId}"]`);
    if (!userRow) {
        console.error(`❌ [DEBUG] Строка пользователя ${userId} не найдена`);
        return;
    }
    
    // Проверяем, есть ли уже строка с автомобилями
    const existingCarsRow = document.querySelector(`tr[data-cars-user-id="${userId}"]`);
    
    if (existingCarsRow) {
        // Если строка уже существует, удаляем её
        console.log(`🗑️ [DEBUG] Удаляем существующую строку с автомобилями для пользователя ${userId}`);
        existingCarsRow.remove();
        return;
    }
    
    try {
        // Получаем автомобили пользователя
        const userCars = await getUserCars(userId);
    
    // Создаем новую строку для автомобилей
    const carsRow = document.createElement('tr');
    carsRow.className = 'user-cars-row';
    carsRow.setAttribute('data-cars-user-id', userId);
    
    // Создаем ячейку, которая занимает всю ширину таблицы
    const carsCell = document.createElement('td');
    carsCell.colSpan = 12; // Количество колонок в таблице
    carsCell.className = 'user-cars-content';
    
    if (userCars.length === 0) {
        // Если у пользователя нет автомобилей
        carsCell.innerHTML = `
            <div class="cars-container">
                <div class="no-cars-message">
                    <i class="fas fa-car" style="font-size: 24px; color: #888; margin-bottom: 8px;"></i>
                    <p style="color: #888; margin: 0;">У этого пользователя еще нет автомобилей</p>
                </div>
            </div>
        `;
    } else {
        // Отображаем автомобили пользователя
        let carsHTML = `
            <div class="cars-container">
        `;
        
        userCars.forEach((car, index) => {
            // Функция для создания ссылки на фото
            const createPhotoLink = (photoUrl, text) => {
                if (photoUrl && photoUrl.trim()) {
                    return `<a href="${photoUrl}" target="_blank" class="car-photo-link">${text}</a>`;
                }
                return '<span style="color: #888;">-</span>';
            };
            
            carsHTML += `
                <div class="car-row">
                    <div class="car-field car-brand">${car.brand || '-'}</div>
                    <div class="car-field car-model">${car.model || '-'}</div>
                    <div class="car-field car-year">${car.year || '-'}</div>
                    <div class="car-field car-color">${car.color || '-'}</div>
                    <div class="car-field car-horsepower">${car.horsepower ? car.horsepower + ' л.с.' : '-'}</div>
                    <div class="car-field car-photo">${createPhotoLink(car.photoUrl, 'Фото')}</div>
                    <div class="car-field car-authorized">${createPhotoLink(car.officialPhotoUrl, 'Авторизованное фото')}</div>
                </div>
            `;
        });
        
        carsHTML += `</div>`;
        carsCell.innerHTML = carsHTML;
    }
    
    carsRow.appendChild(carsCell);
    
    // Вставляем строку после строки пользователя
        userRow.parentNode.insertBefore(carsRow, userRow.nextSibling);
        
        console.log(`✅ [DEBUG] Строка с автомобилями добавлена для пользователя ${userId}`);
        
    } catch (error) {
        console.error('❌ [DEBUG] Ошибка при загрузке автомобилей в таблице:', error);
        
        // Создаем строку с сообщением об ошибке
        const carsRow = document.createElement('tr');
        carsRow.className = 'user-cars-row';
        carsRow.setAttribute('data-cars-user-id', userId);
        
        const carsCell = document.createElement('td');
        carsCell.colSpan = 12;
        carsCell.className = 'user-cars-content';
        
        carsCell.innerHTML = `
            <div class="cars-container">
                <div class="cars-header">Автомобили пользователя</div>
                <div style="text-align: center; padding: 20px; color: #ff6b6b;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 8px;"></i>
                    <p style="margin: 0;">Ошибка при загрузке автомобилей</p>
                </div>
            </div>
        `;
        
        carsRow.appendChild(carsCell);
        userRow.parentNode.insertBefore(carsRow, userRow.nextSibling);
    }
}

// Функция для получения автомобилей пользователя
async function getUserCars(userId) {
    console.log(`🚗 [DEBUG] Получение автомобилей для пользователя ${userId}`);
    
    try {
        // Получаем автомобили с сервера
        const response = await fetchData(`/api/cars/user/${userId}`, 'GET');
        console.log(`✅ [DEBUG] Получено ${response.length} автомобилей с сервера`);
        return response;
    } catch (error) {
        console.error('❌ [DEBUG] Ошибка при получении автомобилей с сервера:', error);
        
        // Fallback: возвращаем моковые данные при ошибке сервера
        const mockCars = {
            6: [
                { 
                    id: 1, 
                    brand: 'Toyota', 
                    model: 'Supra', 
                    year: '2020',
                    color: 'Белый',
                    horsepower: '382',
                    photoUrl: 'https://example.com/cars/toyota-supra.jpg',
                    officialPhotoUrl: 'https://example.com/cars/toyota-supra-official.jpg'
                },
                { 
                    id: 2, 
                    brand: 'Nissan', 
                    model: 'Silvia S15', 
                    year: '2019',
                    color: 'Серебристый',
                    horsepower: '250',
                    photoUrl: 'https://example.com/cars/nissan-s15.jpg',
                    officialPhotoUrl: 'https://example.com/cars/nissan-s15-official.jpg'
                }
            ],
            7: [],
            9: [
                { 
                    id: 3, 
                    brand: 'BMW', 
                    model: 'E36', 
                    year: '1998',
                    color: 'Синий',
                    horsepower: '192',
                    photoUrl: 'https://example.com/cars/bmw-e36.jpg',
                    officialPhotoUrl: 'https://example.com/cars/bmw-e36-official.jpg'
                }
            ],
            10: []
        };
        
        const cars = mockCars[userId] || [];
        console.log(`⚠️ [DEBUG] Используем моковые данные: ${cars.length} автомобилей`);
        return cars;
    }
}

// Моковая функция для создания автомобиля
async function mockCreateCar(carData) {
    console.log('🎭 [DEBUG] Моковое создание автомобиля:', carData);
    
    // Симулируем задержку API
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Генерируем новый ID
    const newId = Date.now();
    
    // Создаем объект автомобиля
    const newCar = {
        id: newId,
        brand: carData.brand,
        model: carData.model,
        year: carData.year.toString(),
        color: carData.color,
        horsepower: carData.horsepower.toString(),
        photoUrl: carData.userPhotoUrl || '',
        officialPhotoUrl: carData.moderatorPhotoUrl || '',
        userId: carData.userId
    };
    
    // Сохраняем в localStorage для демонстрации
    const userId = carData.userId;
    const existingCars = JSON.parse(localStorage.getItem(`user_${userId}_cars`) || '[]');
    existingCars.push(newCar);
    localStorage.setItem(`user_${userId}_cars`, JSON.stringify(existingCars));
    
    console.log('✅ [DEBUG] Автомобиль сохранен в localStorage:', newCar);
    
    return newCar;
}

// Функции для работы с автомобилями
function editCar(carId) {
    console.log(`🔧 [DEBUG] Редактирование автомобиля ID: ${carId}`);
    showTooltip('Редактирование автомобиля будет реализовано позже');
}

function editCarInProfile(carId) {
    console.log(`🔧 [DEBUG] Редактирование автомобиля ID: ${carId} в профиле`);
    showTooltip('Редактирование автомобиля будет реализовано позже');
}

function deleteCarFromProfile(carId) {
    console.log(`🗑️ [DEBUG] Удаление автомобиля ID: ${carId} из профиля`);
    if (confirm('Вы уверены, что хотите удалить этот автомобиль?')) {
        showTooltip('Удаление автомобиля будет реализовано позже');
    }
}

function addCar(userId) {
    console.log(`➕ [DEBUG] Добавление автомобиля для пользователя ID: ${userId}`);
    openCarModal(userId);
}

function addCarToProfile() {
    console.log(`➕ [DEBUG] Добавление автомобиля в профиле пользователя`);
    
    // Получаем ID пользователя из URL
    const userId = getCurrentProfileUserId();
    console.log(`🔍 [DEBUG] Полученный ID пользователя: ${userId}`);
    
    if (userId) {
        console.log(`✅ [DEBUG] Открываем модальное окно для пользователя ID: ${userId}`);
        openCarModal(userId);
    } else {
        console.error('❌ [DEBUG] Не удалось получить ID пользователя из URL');
        showMessage('Ошибка: не удалось определить пользователя. Убедитесь, что вы находитесь в профиле пользователя.', 'error');
    }
}

// Универсальная функция для получения ID пользователя
function getUserIdFromContext() {
    console.log('🔍 [DEBUG] Получение ID пользователя из контекста');
    
    // Сначала пытаемся получить из URL
    const userIdFromURL = getCurrentProfileUserId();
    if (userIdFromURL) {
        return userIdFromURL;
    }
    
    // Если мы в таблице пользователей, пытаемся получить из активной строки
    const usersSection = document.getElementById('usersSection');
    if (usersSection && usersSection.classList.contains('active')) {
        const activeUserRow = document.querySelector('#usersTableBody tr[data-user-id]:hover');
        if (activeUserRow) {
            const userId = activeUserRow.getAttribute('data-user-id');
            console.log(`✅ [DEBUG] ID пользователя из активной строки таблицы: ${userId}`);
            return parseInt(userId);
        }
    }
    
    console.log('❌ [DEBUG] Не удалось получить ID пользователя из контекста');
    return null;
}

// Функции для редактирования профиля пользователя
let isEditMode = false;
let originalUserData = null;

function toggleEditMode() {
    console.log('🖊️ [DEBUG] Переключение режима редактирования');
    
    if (!isEditMode) {
        enterEditMode();
    } else {
        exitEditMode();
    }
}

function enterEditMode() {
    console.log('✏️ [DEBUG] Вход в режим редактирования');
    
    const userId = getCurrentProfileUserId();
    if (!userId) {
        showMessage('Ошибка: не найден ID пользователя', 'error');
        return;
    }
    
    // Сохраняем оригинальные данные
    originalUserData = {
        firstName: document.getElementById('profileFirstName').textContent,
        lastName: document.getElementById('profileLastName').textContent,
        email: document.getElementById('profileEmail').textContent,
        phone: document.getElementById('profilePhone').textContent,
        instagram: document.getElementById('profileInstagram').textContent,
        motto: document.getElementById('profileMotto').textContent,
        sponsors: document.getElementById('profileSponsors').textContent
    };
    
    // Заполняем поля ввода текущими значениями
    document.getElementById('editFirstName').value = originalUserData.firstName === '-' ? '' : originalUserData.firstName;
    document.getElementById('editLastName').value = originalUserData.lastName === '-' ? '' : originalUserData.lastName;
    document.getElementById('editEmail').value = originalUserData.email === '-' ? '' : originalUserData.email;
    document.getElementById('editPhone').value = originalUserData.phone === '-' ? '' : originalUserData.phone;
    
    // Обрабатываем Instagram отдельно (может содержать HTML)
    const instagramElement = document.getElementById('profileInstagram');
    let instagramValue = '';
    if (instagramElement.innerHTML !== '-') {
        // Извлекаем текст из ссылки
        const linkElement = instagramElement.querySelector('a');
        if (linkElement) {
            instagramValue = linkElement.textContent.replace('@', '');
        }
    }
    document.getElementById('editInstagram').value = instagramValue;
    
    document.getElementById('editMotto').value = originalUserData.motto === '-' ? '' : originalUserData.motto;
    document.getElementById('editSponsors').value = originalUserData.sponsors === '-' ? '' : originalUserData.sponsors;
    
    // Переключаем поля в режим редактирования
    document.querySelectorAll('.info-item').forEach(item => {
        item.classList.add('editing');
    });
    
    // Показываем кнопки сохранения/отмены
    document.getElementById('editButtons').style.display = 'flex';
    document.getElementById('editProfileBtn').style.display = 'none';
    
    isEditMode = true;
}

function exitEditMode() {
    console.log('❌ [DEBUG] Выход из режима редактирования');
    
    // Убираем класс редактирования
    document.querySelectorAll('.info-item').forEach(item => {
        item.classList.remove('editing');
    });
    
    // Скрываем кнопки сохранения/отмены
    document.getElementById('editButtons').style.display = 'none';
    document.getElementById('editProfileBtn').style.display = 'block';
    
    isEditMode = false;
}

function cancelEdit() {
    console.log('🚫 [DEBUG] Отмена редактирования');
    
    // Восстанавливаем оригинальные данные
    if (originalUserData) {
        document.getElementById('profileFirstName').textContent = originalUserData.firstName;
        document.getElementById('profileLastName').textContent = originalUserData.lastName;
        document.getElementById('profileEmail').textContent = originalUserData.email;
        document.getElementById('profilePhone').textContent = originalUserData.phone;
        document.getElementById('profileInstagram').innerHTML = originalUserData.instagram;
        document.getElementById('profileMotto').textContent = originalUserData.motto;
        document.getElementById('profileSponsors').textContent = originalUserData.sponsors;
    }
    
    exitEditMode();
}

async function saveProfileChanges() {
    console.log('💾 [DEBUG] Сохранение изменений профиля');
    
    const userId = getCurrentProfileUserId();
    if (!userId) {
        showMessage('Ошибка: не найден ID пользователя', 'error');
        return;
    }
    
    // Собираем данные из полей ввода
    const updatedData = {
        firstName: document.getElementById('editFirstName').value.trim(),
        lastName: document.getElementById('editLastName').value.trim(),
        email: document.getElementById('editEmail').value.trim(),
        phone: document.getElementById('editPhone').value.trim(),
        instagram: document.getElementById('editInstagram').value.trim(),
        motto: document.getElementById('editMotto').value.trim(),
        sponsors: document.getElementById('editSponsors').value.trim()
    };
    
    // Валидация
    if (!updatedData.firstName) {
        showMessage('Имя не может быть пустым', 'error');
        return;
    }
    
    if (!updatedData.email || !isValidEmail(updatedData.email)) {
        showMessage('Введите корректный email', 'error');
        return;
    }
    
    try {
        // Показываем индикатор загрузки
        const saveBtn = document.querySelector('.btn-save');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохранение...';
        saveBtn.disabled = true;
        
        // Отправляем данные на сервер
        const response = await fetchData(`/api/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(updatedData)
        });
        
        console.log('✅ [DEBUG] Профиль успешно обновлен:', response);
        
        // Обновляем отображение
        updateProfileDisplay(updatedData);
        
        // Выходим из режима редактирования
        exitEditMode();
        
        showMessage('Профиль успешно обновлен', 'success');
        
    } catch (error) {
        console.error('❌ [DEBUG] Ошибка при сохранении профиля:', error);
        showMessage('Ошибка при сохранении профиля', 'error');
        
        // Восстанавливаем кнопку
        const saveBtn = document.querySelector('.btn-save');
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Сохранить';
        saveBtn.disabled = false;
    }
}

function updateProfileDisplay(data) {
    console.log('🔄 [DEBUG] Обновление отображения профиля');
    
    // Обновляем значения
    document.getElementById('profileFirstName').textContent = data.firstName || '-';
    document.getElementById('profileLastName').textContent = data.lastName || '-';
    document.getElementById('profileEmail').textContent = data.email || '-';
    document.getElementById('profilePhone').textContent = data.phone || '-';
    document.getElementById('profileMotto').textContent = data.motto || '-';
    document.getElementById('profileSponsors').textContent = data.sponsors || '-';
    
    // Обновляем Instagram
    const instagramElement = document.getElementById('profileInstagram');
    if (data.instagram && data.instagram.trim()) {
        const instagramLink = createInstagramLink(data.instagram);
        instagramElement.innerHTML = instagramLink;
        
        // Перезагружаем количество подписчиков
        loadInstagramFollowers(data.instagram);
    } else {
        instagramElement.textContent = '-';
        document.getElementById('profileInstagramFollowers').textContent = '-';
    }
    
    // Обновляем имя в заголовке профиля
    const profileName = document.getElementById('profileName');
    if (profileName) {
        profileName.textContent = `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Не указано';
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Функции для работы с Instagram API
async function loadInstagramFollowers(instagramHandle) {
    console.log(`📱 [DEBUG] Загрузка подписчиков Instagram для: ${instagramHandle}`);
    
    // Показываем индикатор загрузки
    const followersElement = document.getElementById('profileInstagramFollowers');
    followersElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Загрузка...';
    
    try {
        // Очищаем handle от символа @
        const cleanHandle = instagramHandle.replace(/^@/, '');
        
        // Используем кэшированный API для получения данных Instagram
        const followersCount = await getCachedInstagramFollowers(cleanHandle);
        
        if (followersCount !== null) {
            followersElement.innerHTML = formatFollowersCount(followersCount);
            console.log(`✅ [DEBUG] Подписчики загружены: ${followersCount}`);
        } else {
            followersElement.textContent = 'Недоступно';
            console.log(`⚠️ [DEBUG] Не удалось получить данные о подписчиках`);
        }
    } catch (error) {
        console.error('❌ [DEBUG] Ошибка при загрузке подписчиков Instagram:', error);
        followersElement.textContent = 'Ошибка загрузки';
    }
}

async function getInstagramFollowersCount(username) {
    console.log(`🔍 [DEBUG] Получение количества подписчиков для @${username}`);
    
    try {
        // Используем альтернативный API для получения данных Instagram
        // В реальном проекте здесь должен быть ваш серверный endpoint
        const response = await fetch(`https://www.instagram.com/${username}/?__a=1&__d=dis`, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Парсим данные из ответа Instagram
            if (data.graphql && data.graphql.user) {
                const user = data.graphql.user;
                const followersCount = user.edge_followed_by?.count || 0;
                console.log(`📊 [DEBUG] Найдено подписчиков: ${followersCount}`);
                return followersCount;
            }
        }
        
        console.log(`⚠️ [DEBUG] Не удалось получить данные для @${username}`);
        return null;
        
    } catch (error) {
        console.error(`❌ [DEBUG] Ошибка при запросе к Instagram API:`, error);
        
        // Fallback: используем альтернативный метод через прокси
        return await getInstagramFollowersFallback(username);
    }
}

async function getInstagramFollowersFallback(username) {
    console.log(`🔄 [DEBUG] Использование fallback метода для @${username}`);
    
    try {
        // Используем публичный API сервис для Instagram
        const response = await fetch(`https://instagram.com/${username}/`, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (response.ok) {
            const html = await response.text();
            
            // Ищем данные о подписчиках в HTML
            const followersMatch = html.match(/"edge_followed_by":\{"count":(\d+)\}/);
            if (followersMatch) {
                const followersCount = parseInt(followersMatch[1]);
                console.log(`📊 [DEBUG] Fallback: найдено подписчиков: ${followersCount}`);
                return followersCount;
            }
        }
        
        return null;
    } catch (error) {
        console.error(`❌ [DEBUG] Ошибка в fallback методе:`, error);
        return null;
    }
}

function formatFollowersCount(count) {
    if (count >= 1000000) {
        return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
        return `${(count / 1000).toFixed(1)}K`;
    } else {
        return count.toString();
    }
}

// Кэширование данных Instagram
const instagramCache = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 минут

async function getCachedInstagramFollowers(username) {
    const cacheKey = `instagram_${username}`;
    const cached = instagramCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log(`💾 [DEBUG] Используем кэшированные данные для @${username}`);
        return cached.followers;
    }
    
    const followers = await getInstagramFollowersCount(username);
    
    if (followers !== null) {
        instagramCache.set(cacheKey, {
            followers: followers,
            timestamp: Date.now()
        });
    }
    
    return followers;
}

// Функция для добавления обработчиков клика по строкам пользователей
function addUserRowClickHandlers() {
    console.log('🖱️ [DEBUG] Добавление обработчиков клика по строкам пользователей');
    
    const userRows = document.querySelectorAll('#usersTableBody tr[data-user-id]');
    console.log(`📊 [DEBUG] Найдено строк пользователей: ${userRows.length}`);
    
    userRows.forEach(row => {
        // Удаляем предыдущий обработчик, если он есть
        row.removeEventListener('click', handleUserRowClick);
        
        // Добавляем новый обработчик
        row.addEventListener('click', handleUserRowClick);
        
        console.log(`✅ [DEBUG] Обработчик добавлен для строки пользователя ID: ${row.getAttribute('data-user-id')}`);
    });
}

// Функция-обработчик клика по строке пользователя
function handleUserRowClick(event) {
    console.log('🖱️ [DEBUG] Клик по строке пользователя');
    
    // Проверяем, не кликнули ли по кнопке, ссылке или изображению
    const clickedElement = event.target;
    const isClickableElement = clickedElement.closest('.action-buttons') || 
                              clickedElement.closest('a') || 
                              clickedElement.closest('img') ||
                              clickedElement.closest('button');
    
    if (isClickableElement) {
        console.log('🚫 [DEBUG] Клик по интерактивному элементу, игнорируем');
        return;
    }
    
    // Получаем ID пользователя из атрибута data-user-id
    const userId = event.currentTarget.getAttribute('data-user-id');
    
    if (userId) {
        console.log(`👤 [DEBUG] Переход на профиль пользователя ID: ${userId}`);
        showUserProfile(parseInt(userId));
    } else {
        console.error('❌ [DEBUG] Не удалось получить ID пользователя из строки');
    }
}

