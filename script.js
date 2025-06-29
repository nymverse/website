// --- CONFIGURATION ---
// Explicit URLs for each content file, fetched directly from their repositories.
const CONTENT_URLS = {
    // Whitepapers
    'nym-whitepaper': 'https://raw.githubusercontent.com/nymverse/nym/master/docs/whitepaper.md',
    'quid-whitepaper': 'https://raw.githubusercontent.com/nymverse/quid/master/docs/whitepaper.md',
    'axon-whitepaper': 'https://raw.githubusercontent.com/nymverse/nomadnet/master/docs/whitepaper.md',
    // Roadmaps
    'nym-roadmap': 'https://raw.githubusercontent.com/nymverse/nym/master/docs/roadmap.md',
    'quid-roadmap': 'https://raw.githubusercontent.com/nymverse/quid/master/docs/roadmap.md',
    'axon-roadmap': 'https://raw.githubusercontent.com/nymverse/nomadnet/master/docs/roadmap.md'
};


// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Basic UI Setup
    setupMobileNav();
    setupPageRouting();
    setupScrollAnimations();
    initializeParticles();
    
    // Roadmap specific setup
    setupRoadmapTabs();
});


// --- UI & NAVIGATION ---

function setupMobileNav() {
    const toggleBtn = document.querySelector('.mobile-nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    const dropdowns = document.querySelectorAll('.dropdown');

    toggleBtn.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });

    dropdowns.forEach(dropdown => {
        dropdown.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                if (e.target.closest('.dropdown > a')) {
                    e.preventDefault();
                    dropdown.classList.toggle('active');
                }
            }
        });
    });
}

function setupPageRouting() {
    document.body.addEventListener('click', (e) => {
        const routeLink = e.target.closest('.nav-route');
        if (routeLink) {
            e.preventDefault();
            const pageId = routeLink.dataset.page;
            navigateTo(pageId);
        }
    });
}

function navigateTo(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
        window.scrollTo(0, 0);

        if (pageId.includes('whitepaper')) {
            loadDocument(pageId);
        } else if (pageId === 'roadmap') {
            loadAllRoadmaps();
        }
    }
    
    document.querySelectorAll('.nav-route').forEach(link => {
        link.classList.toggle('active', link.dataset.page === pageId);
    });

    document.querySelector('.nav-links').classList.remove('active');
    document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('active'));
}

// --- CONTENT LOADING (from GitHub) ---

const loadedContent = new Set();

async function fetchMarkdown(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} for ${url}`);
        }
        return await response.text();
    } catch (error) {
        console.error(`Failed to fetch markdown from ${url}:`, error);
        return `# Error\n\nCould not load content from \`${url}\`. Please check the URL and ensure the repository is public.`;
    }
}

async function loadDocument(pageId) {
    if (loadedContent.has(pageId)) return;

    const bodyEl = document.getElementById(`${pageId}-body`);
    const tocEl = document.getElementById(pageId.replace('whitepaper', 'toc'));
    const url = CONTENT_URLS[pageId];

    if (!url) {
        bodyEl.innerHTML = `<p>Error: No URL configured for ${pageId}.</p>`;
        return;
    }
    
    bodyEl.innerHTML = '<p>Loading content...</p>';
    const markdown = await fetchMarkdown(url);
    bodyEl.innerHTML = marked.parse(markdown);
    
    generateToc(bodyEl, tocEl, pageId);
    setupTocScrollSpy(bodyEl, tocEl);
    loadedContent.add(pageId);
}

// --- TABLE OF CONTENTS LOGIC ---

function generateToc(contentEl, tocEl, pageId) {
    tocEl.innerHTML = '';
    const headings = contentEl.querySelectorAll('h2, h3, h4');
    headings.forEach((heading, index) => {
        const id = `heading-${pageId}-${index}`;
        heading.id = id;
        const link = document.createElement('a');
        link.href = `#${id}`;
        link.textContent = heading.textContent;
        link.classList.add(`toc-${heading.tagName.toLowerCase()}`);
        
        const listItem = document.createElement('li');
        listItem.appendChild(link);
        tocEl.appendChild(listItem);
    });
}

function setupTocScrollSpy(contentEl, tocEl) {
    const headings = Array.from(contentEl.querySelectorAll('h2, h3, h4'));
    const tocLinks = Array.from(tocEl.querySelectorAll('a'));

    const onScroll = () => {
        let activeId = null;
        headings.forEach(heading => {
            const rect = heading.getBoundingClientRect();
            // Activate heading if it's in the top half of the viewport
            if (rect.top < window.innerHeight / 2) {
                activeId = heading.id;
            }
        });

        tocLinks.forEach(link => {
            link.classList.toggle('active', link.hash === `#${activeId}`);
        });
    };
    
    window.addEventListener('scroll', onScroll, { passive: true });
}

// --- ROADMAP LOGIC ---

function setupRoadmapTabs() {
    const tabs = document.querySelectorAll('.roadmap-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            document.querySelectorAll('.roadmap-content').forEach(content => {
                content.classList.toggle('active', content.id === tabId);
            });
        });
    });
}

async function loadAllRoadmaps() {
    if (loadedContent.has('all-roadmaps')) return;

    const roadmapIds = ['nym-roadmap', 'quid-roadmap', 'axon-roadmap'];
    for (const id of roadmapIds) {
        const container = document.getElementById(id);
        const url = CONTENT_URLS[id];
        if (!url) {
            container.innerHTML = `<p>Error: No URL configured for ${id}.</p>`;
            continue;
        }
        container.innerHTML = '<p>Loading roadmap...</p>';
        const markdown = await fetchMarkdown(url);
        container.innerHTML = parseRoadmapMarkdown(markdown);
    }

    loadedContent.add('all-roadmaps');
}

function parseRoadmapMarkdown(markdown) {
    const lines = markdown.split('\n');
    let html = '';
    let inSection = false;
    let inPhase = false;

    lines.forEach(line => {
        if (line.startsWith('## ')) { // Phase
            if (inSection) html += '</ul></div>';
            if (inPhase) html += '</div></details>';
            inSection = false;
            inPhase = true;
            html += `<details class="roadmap-phase" open><summary>${line.substring(3)}</summary><div class="roadmap-phase-body">`;
        } else if (line.startsWith('### ')) { // Section
            if (inSection) html += '</ul></div>';
            inSection = true;
            html += `<div class="roadmap-section"><h4>${line.substring(4)}</h4><ul>`;
        } else if (line.startsWith('- [')) { // Task
            const isComplete = line.includes('[x]');
            const title = line.substring(line.indexOf(']') + 2).replace('✅', '').trim();
            const iconClass = isComplete ? 'fa-solid fa-check-circle task-complete' : 'fa-regular fa-circle task-incomplete';
            html += `<li><i class="${iconClass} roadmap-task-status"></i><span class="roadmap-task-title">${title}</span></li>`;
        }
    });

    if (inSection) html += '</ul></div>';
    if (inPhase) html += '</div></details>';
    
    return html;
}

// --- SCROLL ANIMATIONS ---
function setupScrollAnimations() {
    const revealElements = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    revealElements.forEach(el => observer.observe(el));
}


// --- PARTICLE.JS BACKGROUND ---
function initializeParticles() {
    particlesJS('particles-js', {
        "particles": {
            "number": { "value": 80, "density": { "enable": true, "value_area": 800 } },
            "color": { "value": "#2a3552" },
            "shape": { "type": "circle" },
            "opacity": { "value": 0.5, "random": false },
            "size": { "value": 3, "random": true },
            "line_linked": { "enable": true, "distance": 150, "color": "#2a3552", "opacity": 0.4, "width": 1 },
            "move": { "enable": true, "speed": 2, "direction": "none", "random": false, "straight": false, "out_mode": "out", "bounce": false }
        },
        "interactivity": {
            "detect_on": "canvas",
            "events": { "onhover": { "enable": true, "mode": "repulse" }, "onclick": { "enable": true, "mode": "push" }, "resize": true },
            "modes": { "repulse": { "distance": 100, "duration": 0.4 }, "push": { "particles_nb": 4 } }
        },
        "retina_detect": true
    });
}