
const PASSWORD_HASH = "f2110e6cf92b93ae7b8ba2a41347889c1b864a2db67289f2d82f8d71854c24be"; 

// Utils
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function checkPassword() {
    const input = document.getElementById('password-input').value;
    const hash = await sha256(input);
    
    if (hash === PASSWORD_HASH) {
        unlockApp(hash);
    } else {
        document.getElementById('error-msg').style.display = 'block';
    }
}

function unlockApp(hash) {
    document.getElementById('login-overlay').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    localStorage.setItem('novel_auth', hash);
    initApp();
}

// Auto-login
(async function() {
    const saved = localStorage.getItem('novel_auth');
    if (saved === PASSWORD_HASH) {
        unlockApp(saved);
    }
})();

// App Logic
let chapters = [];
let currentIndex = -1;

async function initApp() {
    await loadTOC();
    
    const urlParams = new URLSearchParams(window.location.search);
    const chapterId = urlParams.get('chapter');
    
    if (chapterId) {
        const idx = chapters.findIndex(c => c.id == chapterId);
        if (idx >= 0) loadChapter(idx);
    } else if (chapters.length > 0) {
        loadChapter(0); 
    }
}

async function loadTOC() {
    try {
        const res = await fetch('data/toc.json');
        chapters = await res.json();
        renderSidebar();
        renderSelect();
    } catch (e) { console.error("TOC Load Failed", e); }
}

function renderSidebar() {
    const list = document.getElementById('toc-list');
    list.innerHTML = "";
    chapters.forEach((chap, idx) => {
        const el = document.createElement('div');
        el.className = 'toc-item';
        el.textContent = chap.title;
        el.onclick = () => {
            loadChapter(idx);
            if(window.innerWidth <= 768) toggleSidebar(false);
        };
        list.appendChild(el);
    });
}

function renderSelect() {
    const sel = document.getElementById('chapter-select');
    if(!sel) return;
    sel.innerHTML = "";
    chapters.forEach((chap, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = `Ch ${chap.id}`;
        sel.appendChild(opt);
    });
    sel.onchange = (e) => loadChapter(parseInt(e.target.value));
}

async function loadChapter(index) {
    if (index < 0 || index >= chapters.length) return;
    currentIndex = index;
    const chapter = chapters[index];
    
    // UI Updates
    document.getElementById('chapter-title').textContent = chapter.title;
    document.getElementById('chapter-content').innerHTML = '<div style="text-align:center;color:#888;">Loading...</div>';
    
    // Highlight TOC
    document.querySelectorAll('.toc-item').forEach((el, i) => {
        el.classList.toggle('active', i === index);
    });
    
    // Select dropdown sync
    const sel = document.getElementById('chapter-select');
    if(sel) sel.value = index;

    // Fetch & Parse
    try {
        const res = await fetch(`data/${chapter.id}.json`);
        const data = await res.json();
        
        // Use Marked.js for proper rendering
        // If content is plain text, we treat double newline as paragraph
        let htmlContent = "";
        if (typeof marked !== 'undefined') {
            htmlContent = marked.parse(data.content);
        } else {
            htmlContent = data.content.split('\n\n').map(p => `<p>${p}</p>`).join('');
        }
        
        document.getElementById('chapter-content').innerHTML = htmlContent;
        
        // Update History
        const url = new URL(window.location);
        url.searchParams.set('chapter', chapter.id);
        window.history.replaceState({}, '', url);
        
        // Scroll Top
        document.getElementById('reader-container').scrollTop = 0;
        
    } catch (e) {
        console.error(e);
        document.getElementById('chapter-content').textContent = "Error loading content.";
    }
    
    updateNav();
}

function updateNav() {
    document.getElementById('prev-btn').disabled = currentIndex <= 0;
    document.getElementById('next-btn').disabled = currentIndex >= chapters.length - 1;
    
    document.getElementById('prev-btn').onclick = () => loadChapter(currentIndex - 1);
    document.getElementById('next-btn').onclick = () => loadChapter(currentIndex + 1);
}

// UI Actions
function toggleTheme() {
    const current = document.body.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
}

function toggleSidebar(show) {
    const sidebar = document.getElementById('sidebar');
    if (show === undefined) {
        sidebar.classList.toggle('open');
    } else {
        if(show) sidebar.classList.add('open');
        else sidebar.classList.remove('open');
    }
}

// Setup
const savedTheme = localStorage.getItem('theme');
if (savedTheme) document.body.setAttribute('data-theme', savedTheme);

document.getElementById('toggle-sidebar').onclick = () => toggleSidebar();
document.getElementById('close-sidebar').onclick = () => toggleSidebar(false);
