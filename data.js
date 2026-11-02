// data.js - Centralized Data Management for Portfolio

const defaultData = {
    "hero": {
        "firstName": "Anurag",
        "lastName": "Singh",
        "badge": "Available for freelance work",
        "initials": "AS",
        "description": "I am a Backend Developer focused on building scalable and efficient web applications using the MERN stack. I work with Node.js, Express.js, and MongoDB to design and develop RESTful APIs, manage databases, and implement robust backend logic.",
        "typewriterTexts": [
            "MERN Full Stack Developer",
            "React.js Enthusiast",
            "Node.js Backend Architect",
            "MongoDB Database Expert",
            "UI/UX Developer",
            "Open Source Contributor"
        ],
        "statProjects": 5,
        "statExperience": 1,
        "statClients": 2
    },
    "about": {
        "title": "Turning Ideas Into Digital Reality",
        "bio1": "I'm a dedicated MERN Full Stack Developer with a passion for creating elegant, efficient, and user-centric web applications. With a strong foundation in both frontend and backend technologies, I bridge the gap between design and functionality.",
        "bio2": "My approach combines clean code principles with modern design patterns, ensuring every project is scalable, maintainable, and delivers an exceptional user experience.",
        "highlights": [
            {
                "icon": "🎯",
                "text": "Problem Solver"
            },
            {
                "icon": "🚀",
                "text": "Fast Learner"
            },
            {
                "icon": "🤝",
                "text": "Team Player"
            },
            {
                "icon": "💡",
                "text": "Creative Thinker"
            }
        ],
        "codeWindow": {
            "name": "Anurag Singh",
            "role": "MERN Full Stack Developer",
            "location": "India 🇮🇳",
            "education": "B.Tech in Computer Science",
            "languages": [
                "JavaScript",
                "TypeScript",
                "Python"
            ],
            "passion": "Building scalable web apps",
            "hobbies": [
                "Open Source",
                "Tech Blogs",
                "Gaming"
            ]
        }
    },
    "skills": [
        {
            "id": "skill_1",
            "category": "Frontend",
            "icon": "🎨",
            "desc": "Building beautiful interfaces",
            "tags": [
                "React.js",
                "TypeScript",
                "JavaScript (ES6+)",
                "HTML5",
                "CSS3 / SASS",
                "Tailwind CSS",
                "Material UI",
                "Framer Motion"
            ],
            "color": "#61dafb",
            "bg": "rgba(97,218,251,0.1)"
        },
        {
            "id": "skill_2",
            "category": "Backend",
            "icon": "⚙️",
            "desc": "Powering server-side logic",
            "tags": [
                "Node.js",
                "Express.js",
                "REST APIs",
                "Socket.io",
                "JWT Auth",
                "Middleware"
            ],
            "color": "#68a838",
            "bg": "rgba(104,159,56,0.1)"
        },
        {
            "id": "skill_3",
            "category": "Database",
            "icon": "🗄️",
            "desc": "Managing data efficiently",
            "tags": [
                "MongoDB",
                "Mongoose",
                "Redis",
                "Firebase"
            ],
            "color": "#4db050",
            "bg": "rgba(77,175,80,0.1)"
        },
        {
            "id": "skill_4",
            "category": "DevOps & Tools",
            "icon": "🛠️",
            "desc": "Streamlining development",
            "tags": [
                "Git / GitHub",
                "Docker",
                "AWS",
                "Postman",
                "Figma",
                "VS Code"
            ],
            "color": "#ff6b9d",
            "bg": "rgba(255,107,157,0.1)"
        }
    ],
    "experience": [
        {
            "id": "exp_1",
            "role": "HighSchool",
            "company": "Jai  Narayan Saraswati Vidya Mandir Inter College Bareilly",
            "date": "2021 -2022",
            "desc": "Completed My High School Education",
            "tech": [
                "Science"
            ]
        },
        {
            "id": "exp_2",
            "role": "Intermediate",
            "company": "Jai  Narayan Saraswati Vidya Mandir Inter College Bareilly",
            "date": "2023 - 2024",
            "desc": "Completed my Intermediate Education.",
            "tech": [
                "Physics",
                "Chemistry",
                "Math"
            ]
        },
        {
            "id": "exp_3",
            "role": "B. Tech",
            "company": "Shri Ram Murti Smarak College Of Engineering And Technology Bareilly",
            "date": "Aug -2024 to present",
            "desc": "Currently I am Pursuing B. Tech in Computer Science & Engineering  from Shri Ram Murti Smarak College Of Engineering And Technology Bareilly.",
            "tech": [
                "Computer Science & Engineering"
            ]
        }
    ],
    "projects": [
        {
            "id": "proj_1784657897375",
            "name": "MediTrack",
            "category": "fullstack",
            "type": "Full Stack Web Application",
            "desc": "Hospital Inventory  Management System",
            "tech": [
                "HTML",
                "CSS",
                "JS",
                "Django",
                "MySQL",
                "Jinja2"
            ],
            "demoLink": "#",
            "codeLink": "#",
            "svg": "<svg width=\"80\" height=\"80\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"rgba(108,99,255,0.5)\" stroke-width=\"1\"><polygon points=\"12 2 2 7 12 12 22 7 12 2\"/><polyline points=\"2 17 12 22 22 17\"/><polyline points=\"2 12 12 17 22 12\"/></svg>",
            "bgGradient": "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)"
        },
        {
            "id": "proj_1784657790024",
            "name": "IDMS",
            "category": "fullstack",
            "type": "Full Stack Web Application",
            "desc": "AI Powered Document Management System",
            "tech": [
                "HTML",
                "CSS",
                "JS",
                "Node.js",
                "Express.js",
                "MongoDB",
                "EJS"
            ],
            "demoLink": "#",
            "codeLink": "#",
            "svg": "<svg width=\"80\" height=\"80\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"rgba(108,99,255,0.5)\" stroke-width=\"1\"><polygon points=\"12 2 2 7 12 12 22 7 12 2\"/><polyline points=\"2 17 12 22 22 17\"/><polyline points=\"2 12 12 17 22 12\"/></svg>",
            "bgGradient": "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)"
        }
    ],
    "services": [
        {
            "id": "svc_1",
            "icon": "🌐",
            "name": "Full Stack Web Development",
            "desc": "Complete web applications built with the MERN stack, from database design to responsive frontend, ensuring seamless end-to-end functionality."
        },
        {
            "id": "svc_2",
            "name": "REST  APIs",
            "icon": "🔌",
            "desc": "Scalable, well-documented APIs with authentication, validation, rate limiting, and comprehensive error handling for any use case."
        },
        {
            "id": "svc_3",
            "icon": "🎨",
            "name": "UI/UX Development",
            "desc": "Pixel-perfect, responsive interfaces with smooth animations, accessibility standards, and intuitive user experiences that convert."
        },
        {
            "id": "svc_4",
            "name": "Deployment & DevOps",
            "icon": "☁️",
            "desc": "Cloud deployment on AWS, Docker containerization and performance monitoring for production-ready applications."
        }
    ],
    "contact": {
        "email": "anurag.singh.ls011@gmail.com",
        "location": "India 🇮🇳",
        "availability": "Open to opportunities",
        "github": "https://github.com/anuragsinghls011-webdeveloper",
        "linkedin": "https://www.linkedin.com/in/anurag-singh-04ab39378/",
        "twitter": "#",
        "website": "#"
    }
};

// API_BASE_URL can be set to your backend's deployed URL if the frontend is hosted separately (e.g. 'https://my-backend.onrender.com')
const API_BASE_URL = '';

let portfolioDataCache = null;

async function getPortfolioData() {
    if (portfolioDataCache) return portfolioDataCache;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/portfolio`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' }
        });
        const json = await response.json();
        if (json.success && json.data && Object.keys(json.data).length > 0 && Array.isArray(json.data.skills)) {
            portfolioDataCache = json.data;
            return portfolioDataCache;
        }
    } catch (err) {
        console.error('Failed to fetch live portfolio data. Using default data fallback.', err);
    }
    
    portfolioDataCache = defaultData;
    return defaultData;
}

function getActiveToken() {
    return sessionStorage.getItem('cms_token') || localStorage.getItem('cms_token');
}

function clearActiveToken() {
    sessionStorage.removeItem('cms_token');
    localStorage.removeItem('cms_token');
}

function savePortfolioData(data) {
    portfolioDataCache = data;
    const token = getActiveToken();
    return fetch(`${API_BASE_URL}/api/save`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(data)
    }).then(res => {
        if (res.status === 401 || res.status === 403) {
            clearActiveToken();
            location.reload();
            return { success: false, error: 'Unauthorized' };
        }
        return res.json();
    }).then(res => {
        if (!res.success) console.error('Failed to save data dynamically:', res.error);
        return res;
    }).catch(err => {
        console.error('Save network error:', err);
        return { success: false, error: err.message };
    });
}

function resetPortfolioData() {
    const token = getActiveToken();
    fetch(`${API_BASE_URL}/api/reset`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token }
    }).then(res => {
        if (res.status === 401 || res.status === 403) {
            clearActiveToken();
        }
        location.reload();
    });
}
