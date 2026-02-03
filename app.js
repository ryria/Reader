
const PASSWORD_HASH = "f2110e6cf92b93ae7b8ba2a41347889c1b864a2db67289f2d82f8d71854c24be"; // SHA-256 of the password

async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function checkPassword() {
    const input = document.getElementById('password-input').value;
    const hash = await sha256(input);
    
    if (hash === PASSWORD_HASH) {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';
        localStorage.setItem('novel_auth', hash);
        initApp();
    } else {
        document.getElementById('error-msg').style.display = 'block';
    }
}

// Auto-login if saved
(async function() {
    const saved = localStorage.getItem('novel_auth');
    if (saved === PASSWORD_HASH) {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';
        initApp();
    }
})();

let chapters = [];
let currentChapterIndex = -1;

async function initApp() {
    await loadTOC();
    
    // Check URL param
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
        const response = await fetch('data/toc.json');
        chapters = await response.json();
        renderTOC();
        renderSelect();
    } catch (e) {
        console.error("Failed to load TOC", e);
    }
}

function renderTOC() {
    const list = document.getElementById('toc-list');
    list.innerHTML = "";
    chapters.forEach((chap, idx) => {
        const div = document.createElement('div');
        div.className = 'toc-item';
        div.textContent = chap.title;
        div.onclick = () => loadChapter(idx);
        list.appendChild(div);
    });
}

function renderSelect() {
    const select = document.getElementById('chapter-select');
    select.innerHTML = "";
    chapters.forEach((chap, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = chap.title;
        select.appendChild(opt);
    });
    select.onchange = (e) => loadChapter(parseInt(e.target.value));
}

async function loadChapter(index) {
    if (index < 0 || index >= chapters.length) return;
    
    currentChapterIndex = index;
    const chapter = chapters[index];
    
    // UI Updates
    document.getElementById('chapter-title').textContent = chapter.title;
    document.getElementById('chapter-content').innerHTML = "<p>Loading...</p>";
    
    // Highlight sidebar
    document.querySelectorAll('.toc-item').forEach((el, idx) => {
        el.classList.toggle('active', idx === index);
    });
    document.getElementById('chapter-select').value = index;
    
    // Fetch Content
    try {
        const res = await fetch(`data/${chapter.id}.json`);
        const data = await res.json();
        
        // Convert Markdown to HTML if needed, or just plain text handling
        // Since we saved raw text (likely markdown-ish), we can use marked
        // But our rewriter output is usually plain text.
        // Let's assume plain text with paragraphs.
        
        // Basic formatting: double newline -> paragraph
        const formatted = data.content.split('\n\n').map(p => `<p>${p}</p>`).join('');
        document.getElementById('chapter-content').innerHTML = formatted;
        
        // Update URL
        const url = new URL(window.location);
        url.searchParams.set('chapter', chapter.id);
        window.history.pushState({}, '', url);
        
        // Scroll top
        document.getElementById('reader-container').scrollTop = 0;
        
    } catch (e) {
        document.getElementById('chapter-content').textContent = "Error loading content.";
    }
    
    updateControls();
    
    // Mobile: Close sidebar
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
    }
}

function updateControls() {
    document.getElementById('prev-btn').disabled = currentChapterIndex <= 0;
    document.getElementById('next-btn').disabled = currentChapterIndex >= chapters.length - 1;
    
    document.getElementById('prev-btn').onclick = () => loadChapter(currentChapterIndex - 1);
    document.getElementById('next-btn').onclick = () => loadChapter(currentChapterIndex + 1);
}

// Theme
function toggleTheme() {
    const current = document.body.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
}
if (localStorage.getItem('theme') === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
}

// Sidebar Toggle
document.getElementById('toggle-sidebar').onclick = () => {
    document.getElementById('sidebar').classList.add('open');
};
document.getElementById('close-sidebar').onclick = () => {
    document.getElementById('sidebar').classList.remove('open');
};
