// ดึงข้อมูลคำศัพท์เริ่มต้นจากไฟล์ vocab.js
let currentSetKey = 'set1';
let vocabData = vocabSets[setKeyHelper(currentSetKey)];

// ตัวแปรควบคุมระบบเกมทั่วไป
let currentCardIndex = 0;
let score = 0;
let currentQuizWord = {};
let quizAnswered = false;
let currentMode = 'flashcard';

// ตัวแปรสำหรับระบบ RUNNER MODE
let runnerLoopInterval = null;
let runnerTimerInterval = null;
let runnerLives = 3;
let runnerScore = 0;
let runnerCombo = 0;
let isSlowMo = false;
let isRunnerPlaying = false;

let obstacleX = 100;         
let obstacleDirection = 0;   
let obstacleEmoji = '🪨';
let runnerTimeLeft = 10;
let runnerMaxTime = 10;

const obstaclesPool = [
    { emoji: '🪨', dir: 0, cssBottom: '8px' },   
    { emoji: '🦅', dir: 1, cssBottom: '50px' },  
    { emoji: '⚡', dir: 2, cssBottom: '95px' }   
];

// ฟังก์ชันช่วยตรวจสอบและดักจับหากยังไม่ได้ใส่ข้อมูลในเซ็ตอื่นๆ ป้องกันแอปพัง
function setKeyHelper(key) { return vocabSets[key] ? key : 'set1'; }

// --- ระบบเปลี่ยนชุดคำศัพท์ ---
function changeVocabSet(setKey) {
    currentSetKey = setKey;
    vocabData = vocabSets[setKeyHelper(setKey)];
    currentCardIndex = 0;
    
    if (currentMode === 'flashcard') {
        loadFlashcard();
    } else if (currentMode === 'quiz') {
        score = 0;
        document.getElementById('score').innerText = score;
        loadQuiz();
    } else if (currentMode === 'runner') {
        startRunnerGame();
    }
}

// --- ระบบสลับโหมดการเล่น ---
function switchMode(mode) {
    currentMode = mode;
    clearInterval(runnerLoopInterval);
    clearInterval(runnerTimerInterval);
    isSlowMo = false;
    isRunnerPlaying = false;

    document.querySelectorAll('.mode-container, .nav-buttons button').forEach(el => el.classList.remove('active'));

    if (mode === 'flashcard') {
        document.getElementById('flashcard-mode').classList.add('active');
        document.getElementById('btn-flashcard').classList.add('active');
        loadFlashcard();
    } else if (mode === 'quiz') {
        document.getElementById('quiz-mode').classList.add('active');
        document.getElementById('btn-quiz').classList.add('active');
        score = 0;
        document.getElementById('score').innerText = score;
        loadQuiz();
    } else if (mode === 'runner') {
        document.getElementById('runner-mode').classList.add('active');
        document.getElementById('btn-runner').classList.add('active');
        startRunnerGame();
    }
}

// --- โหมด Flashcard ---
function loadFlashcard() {
    const card = document.getElementById('flashcard');
    card.classList.remove('is-flipped');
    
    const currentItem = vocabData[currentCardIndex];
    setTimeout(() => {
        document.getElementById('fc-word').innerText = currentItem.word;
        document.getElementById('fc-read').innerText = currentItem.read ? `/${currentItem.read}/` : '';
        document.getElementById('fc-pos').innerText = currentItem.pos ? `[ประเภทคำ: ${currentItem.pos}]` : '[n.]';
        document.getElementById('fc-meaning').innerText = currentItem.meaning;
        document.getElementById('fc-counter').innerText = `${currentCardIndex + 1}/${vocabData.length}`;
        
        // บันทึกคำปัจจุบันไว้ผูกกับ Modal ประโยคตัวอย่าง
        currentQuizWord = currentItem;
    }, 150);
}
function flipCard() { document.getElementById('flashcard').classList.toggle('is-flipped'); }
function nextCard() { currentCardIndex = (currentCardIndex < vocabData.length - 1) ? currentCardIndex + 1 : 0; loadFlashcard(); }
function prevCard() { currentCardIndex = (currentCardIndex > 0) ? currentCardIndex - 1 : vocabData.length - 1; loadFlashcard(); }

// --- โหมด Quiz ---
function loadQuiz() {
    quizAnswered = false;
    document.getElementById('next-quiz').style.display = 'none';
    document.getElementById('quiz-review-box').style.display = 'none';
    document.getElementById('quiz-read').innerText = ''; // ซ่อนคำอ่านตอนยังไม่ตอบเพื่อไม่ให้ใบ้เกินไป
    
    const randomIndex = Math.floor(Math.random() * vocabData.length);
    currentQuizWord = vocabData[randomIndex];
    document.getElementById('quiz-word').innerText = currentQuizWord.word;

    let choices = [currentQuizWord.meaning];
    while (choices.length < 4) {
        const wrongMeaning = vocabData[Math.floor(Math.random() * vocabData.length)].meaning;
        if (!choices.includes(wrongMeaning)) choices.push(wrongMeaning);
    }
    choices.sort(() => Math.random() - 0.5);

    const container = document.getElementById('choices-container');
    container.innerHTML = '';
    choices.forEach(choice => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.innerText = choice;
        btn.onclick = () => checkAnswer(btn, choice);
        container.appendChild(btn);
    });
}
function checkAnswer(btn, selectedMeaning) {
    if (quizAnswered) return;
    quizAnswered = true;
    
    // เฉลยคำอ่านและประเภทคำทันทีหลังส่งคำตอบ
    document.getElementById('quiz-read').innerText = currentQuizWord.read ? `/${currentQuizWord.read}/` : '';
    document.getElementById('quiz-pos').innerText = currentQuizWord.pos || 'n.';
    document.getElementById('quiz-review-box').style.display = 'block';

    if (selectedMeaning === currentQuizWord.meaning) {
        btn.classList.add('correct');
        score += 10;
        document.getElementById('score').innerText = score;
    } else {
        btn.classList.add('wrong');
        document.querySelectorAll('.choice-btn').forEach(b => { if (b.innerText === currentQuizWord.meaning) b.classList.add('correct'); });
    }
    document.getElementById('next-quiz').style.display = 'block';
}
function nextQuiz() { loadQuiz(); }

// --- โหมด TIME RUNNER ---
function startRunnerGame() {
    clearInterval(runnerLoopInterval);
    clearInterval(runnerTimerInterval);
    runnerLives = 3; runnerScore = 0; runnerCombo = 0; isSlowMo = false; isRunnerPlaying = true; runnerMaxTime = 10;

    document.getElementById('runner-lives').innerText = '❤️❤️❤️';
    document.getElementById('runner-score').innerText = '0';
    document.getElementById('runner-multiplier').style.display = 'none';
    document.getElementById('runner-gameover').style.display = 'none';
    document.getElementById('runner-quiz-box').style.display = 'none';
    document.getElementById('slow-mo-overlay').style.display = 'none';

    spawnObstacle();
    runnerLoopInterval = setInterval(updateRunnerFrame, 30);
}

function spawnObstacle() {
    obstacleX = 100;
    const randomObstacle = obstaclesPool[Math.floor(Math.random() * obstaclesPool.length)];
    obstacleDirection = randomObstacle.dir;
    obstacleEmoji = randomObstacle.emoji;

    const container = document.getElementById('obstacle-container');
    container.innerHTML = `<div id="active-obstacle" class="obstacle" style="bottom: ${randomObstacle.cssBottom};">${randomObstacle.emoji}</div>`;
}

function updateRunnerFrame() {
    if (!isRunnerPlaying || isSlowMo) return;
    let currentSpeed = 1.6 + (runnerScore / 200);
    obstacleX -= currentSpeed;

    const obsElem = document.getElementById('active-obstacle');
    if (obsElem) obsElem.style.left = obstacleX + '%';

    if (obstacleX <= 28 && obstacleX > 15) triggerSlowMotion();
    if (obstacleX < -5) spawnObstacle();
}

function triggerSlowMotion() {
    isSlowMo = true;
    document.getElementById('slow-mo-overlay').style.display = 'block';
    document.getElementById('runner-quiz-box').style.display = 'block';
    
    runnerMaxTime = Math.max(2.5, 10 - (runnerScore / 40));
    runnerTimeLeft = runnerMaxTime;

    loadRunnerQuiz();

    clearInterval(runnerTimerInterval);
    runnerTimerInterval = setInterval(() => {
        runnerTimeLeft -= 0.1;
        const widthPercent = (runnerTimeLeft / runnerMaxTime) * 100;
        document.getElementById('timer-bar').style.width = Math.max(0, widthPercent) + '%';
        if (runnerTimeLeft <= 0) handleRunnerHit();
    }, 100);
}

function loadRunnerQuiz() {
    const randomIndex = Math.floor(Math.random() * vocabData.length);
    currentQuizWord = vocabData[randomIndex];
    document.getElementById('runner-quiz-word').innerText = currentQuizWord.word;
    
    // บอกใบ้ประเภทของคำ (Part of speech) ในโหมดวิ่ง เพื่อช่วยผู้เล่นตัดสินใจเร็วขึ้น
    document.getElementById('runner-hint').innerText = currentQuizWord.pos ? `ประเภทคำ: ${currentQuizWord.pos}` : '';

    let choices = [currentQuizWord.meaning];
    while (choices.length < 4) {
        const wrongMeaning = vocabData[Math.floor(Math.random() * vocabData.length)].meaning;
        if (!choices.includes(wrongMeaning)) choices.push(wrongMeaning);
    }
    choices.sort(() => Math.random() - 0.5);

    const container = document.getElementById('runner-choices-container');
    container.innerHTML = '';
    choices.forEach(choice => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.innerText = choice;
        btn.onclick = () => checkRunnerAnswer(choice);
        container.appendChild(btn);
    });
}

function checkRunnerAnswer(selectedMeaning) {
    clearInterval(runnerTimerInterval);

    if (selectedMeaning === currentQuizWord.meaning) {
        runnerCombo++;
        const charElem = document.getElementById('runner-character');
        if (obstacleDirection === 0) charElem.classList.add('character-jump');
        else charElem.classList.add('character-duck');
        
        setTimeout(() => { charElem.classList.remove('character-jump', 'character-duck'); }, 300);

        let multiplier = 1;
        if (runnerCombo >= 3) {
            multiplier = 2;
            document.getElementById('runner-multiplier').style.display = 'inline-block';
        }

        runnerScore += 10 * multiplier;
        document.getElementById('runner-score').innerText = runnerScore;
        resumeRunnerGame();
    } else {
        handleRunnerHit();
    }
}

function handleRunnerHit() {
    clearInterval(runnerTimerInterval);
    runnerLives--;
    
    // หากแพ้ในโหมดวิ่ง (โดนชน) เกมจะหยุดชั่วคราวและเปิดหน้าต่างตัวอย่างประโยคโชว์ เพื่อให้จดจำคำศัพท์ที่ผิดได้แม่นยำขึ้น!
    openExampleModal(null); 

    runnerCombo = 0;
    document.getElementById('runner-multiplier').style.display = 'none';

    let heartsText = '';
    for(let i=0; i<3; i++) heartsText += (i < runnerLives) ? '❤️' : '🖤';
    document.getElementById('runner-lives').innerText = heartsText;

    const arena = document.getElementById('game-arena');
    arena.style.backgroundColor = '#fca5a5';
    setTimeout(() => { arena.style.background = ''; }, 200);

    if (runnerLives <= 0) {
        isRunnerPlaying = false;
        clearInterval(runnerLoopInterval);
        document.getElementById('final-runner-score').innerText = runnerScore;
        document.getElementById('runner-gameover').style.display = 'flex';
    }
}

function resumeRunnerGame() {
    isSlowMo = false;
    document.getElementById('slow-mo-overlay').style.display = 'none';
    document.getElementById('runner-quiz-box').style.display = 'none';
    if (runnerLives > 0 && isRunnerPlaying) spawnObstacle();
}

// --- ฟังก์ชันควบคุมหน้าต่างตัวอย่างประโยค (Global Modal) ---
function openExampleModal(event) {
    if (event) event.stopPropagation(); // กันไม่ให้การ์ดในโหมด Flashcard หมุนสลับด้านตอนกดปุ่ม
    
    // หยุดตัวนับเวลาของโหมด Runner ไว้ชั่วคราวถ้าเปิดป๊อปอัปขึ้นมาดู
    if (currentMode === 'runner') {
        clearInterval(runnerTimerInterval);
    }

    document.getElementById('modal-word').innerText = currentQuizWord.word || 'ไม่มีข้อมูล';
    document.getElementById('modal-read').innerText = currentQuizWord.read ? `/${currentQuizWord.read}/` : 'ไม่มีข้อมูล';
    document.getElementById('modal-pos').innerText = currentQuizWord.pos || 'n.';
    document.getElementById('modal-meaning').innerText = currentQuizWord.meaning || 'ไม่มีข้อมูล';
    document.getElementById('modal-example').innerText = currentQuizWord.example || 'Sorry, no example sentence available for this word yet.';

    document.getElementById('exampleModal').style.display = 'flex';
}

function closeExampleModal() {
    document.getElementById('exampleModal').style.display = 'none';
    
    // ถ้าปิดหน้าต่างประโยคในโหมดวิ่ง ให้วิ่งตัวถัดไปต่อทันที
    if (currentMode === 'runner' && runnerLives > 0) {
        resumeRunnerGame();
    }
}

window.onload = () => { loadFlashcard(); };

// ================= ตัวแปรหลักสำหรับฟังก์ชันธีมและล็อกอิน =================
let currentUser = null; 
const CUSTOM_SET_KEY = 'custom_user_set';

// โหลดการตั้งค่าธีมเริ่มต้นจาก localStorage
if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
}

// เช็กสถานะการเข้าสู่ระบบเบื้องต้นตอนเปิดแอปพลิเคชัน
document.addEventListener("DOMContentLoaded", () => {
    checkUserSession();
});

// ================= 1. ระบบสลับธีม (Theme Management) =================
function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    const toggleBtn = document.getElementById('theme-toggle-btn');
    if(toggleBtn) toggleBtn.innerText = isDark ? '☀️' : '🌓';
}

// ================= 2. ระบบควมคุมหน้าต่างล็อกอินลอย (Auth Modal Control) =================
function openAuthModal() {
    document.getElementById('authModal').style.display = 'flex';
}

function closeAuthModal() {
    document.getElementById('authModal').style.display = 'none';
}

// ================= 3. ระบบจำลองการเข้าสู่ระบบ (Authentication Logic) =================
function handleRegister() {
    const uInput = document.getElementById('auth-username').value.trim();
    const pInput = document.getElementById('auth-password').value.trim();

    if (!uInput || !pInput) { alert('กรุณากรอกข้อมูลผู้ใช้และรหัสผ่านให้ครบถ้วน'); return; }

    const users = JSON.parse(localStorage.getItem('game_users') || '{}');
    if (users[uInput]) { alert('ชื่อผู้ใช้นี้ถูกใช้งานไปแล้ว'); return; }

    users[uInput] = pInput;
    localStorage.setItem('game_users', JSON.stringify(users));
    alert('🎉 สมัครสมาชิกสำเร็จ! คุณสามารถกดปุ่มเข้าสู่ระบบได้ทันที');
}

function handleLogin() {
    const uInput = document.getElementById('auth-username').value.trim();
    const pInput = document.getElementById('auth-password').value.trim();
    const users = JSON.parse(localStorage.getItem('game_users') || '{}');

    if (users[uInput] && users[uInput] === pInput) {
        currentUser = uInput;
        localStorage.setItem('active_session', currentUser);
        updateAuthUI();
        loadCustomUserVocab();
        closeAuthModal(); // ปิดหน้าต่าง Popup ล็อกอินทันทีเมื่อสำเร็จ
        alert(`🔓 เข้าสู่ระบบสำเร็จ ยินดีต้อนรับคุณ ${currentUser}`);
    } else {
        alert('❌ ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง โปรดลองอีกครั้ง');
    }
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('active_session');
    
    delete vocabSets[CUSTOM_SET_KEY];
    removeCustomOptionFromDropdown();
    
    updateAuthUI();
    changeVocabSet('set1'); 
    document.getElementById('set-select').value = 'set1';
    alert('🔒 ออกจากระบบเรียบร้อยแล้ว');
}

function checkUserSession() {
    const session = localStorage.getItem('active_session');
    if (session) {
        currentUser = session;
        updateAuthUI();
        loadCustomUserVocab();
    }
}

function updateAuthUI() {
    const loggedOutDiv = document.getElementById('auth-status-logged-out');
    const loggedInDiv = document.getElementById('auth-status-logged-in');
    const customVocabDiv = document.getElementById('custom-vocab-section');

    if (currentUser) {
        loggedOutDiv.style.display = 'none';
        loggedInDiv.style.display = 'block';
        customVocabDiv.style.display = 'block';
        document.getElementById('display-username').innerText = currentUser;
    } else {
        loggedOutDiv.style.display = 'block';
        loggedInDiv.style.display = 'none';
        customVocabDiv.style.display = 'none';
        document.getElementById('auth-username').value = '';
        document.getElementById('auth-password').value = '';
    }
}

// ================= 4. ระบบจัดการคำศัพท์ส่วนตัว (สร้างคำ / ลบคำ) =================
function loadCustomUserVocab() {
    if (!currentUser) return;
    
    const allUserData = JSON.parse(localStorage.getItem(`vocab_${currentUser}`) || '[]');
    
    if (allUserData.length > 0) {
        vocabSets[CUSTOM_SET_KEY] = allUserData;
        addCustomOptionToDropdown();
    } else {
        delete vocabSets[CUSTOM_SET_KEY];
        removeCustomOptionFromDropdown();
    }

    // แสดงผลรายการคำศัพท์ในส่วนจัดการด้านล่างฟอร์มเสมอ
    renderCustomWordsList();
}

function addNewCustomWord() {
    if (!currentUser) { alert('โปรดล็อกอินก่อนเพิ่มคำศัพท์'); return; }

    const wordText = document.getElementById('add-word').value.trim();
    const readText = document.getElementById('add-read').value.trim();
    const posType = document.getElementById('add-pos').value;
    const meaningText = document.getElementById('add-meaning').value.trim();
    const exampleText = document.getElementById('add-example').value.trim();

    if (!wordText || !meaningText || !readText) {
        alert('⚠️ จำเป็นต้องกรอก คำศัพท์, คำอ่าน และคำแปล เป็นอย่างน้อยครับ');
        return;
    }

    const newVocabObj = {
        word: wordText,
        read: readText,
        pos: posType,
        meaning: meaningText,
        example: exampleText || "No example sentence provided for this word."
    };

    const currentUserList = JSON.parse(localStorage.getItem(`vocab_${currentUser}`) || '[]');
    currentUserList.push(newVocabObj);
    localStorage.setItem(`vocab_${currentUser}`, JSON.stringify(currentUserList));

    loadCustomUserVocab();

    // ล้างช่องกรอกข้อมูลเดิมออก
    document.getElementById('add-word').value = '';
    document.getElementById('add-read').value = '';
    document.getElementById('add-meaning').value = '';
    document.getElementById('add-example').value = '';

    // ถ้ากำลังเล่นในหมวดคำศัพท์ตัวเอง ให้รีเฟรชหน้าเกมให้เห็นคำใหม่ทันที
    if (currentSetKey === CUSTOM_SET_KEY) {
        changeVocabSet(CUSTOM_SET_KEY);
    }

    alert(`✨ เพิ่มคำว่า "${wordText}" เข้าสู่คลังสำเร็จแล้ว!`);
}

// ฟังก์ชันเรนเดอร์รายชื่อคำศัพท์ของฉันลงในกล่องตัวจัดการเพื่อคลิกลบ (Custom Words Manager)
function renderCustomWordsList() {
    const listContainer = document.getElementById('custom-words-manager-list');
    if (!listContainer) return;

    const words = vocabSets[CUSTOM_SET_KEY] || [];
    listContainer.innerHTML = '';

    if (words.length === 0) {
        listContainer.innerHTML = '<div style="text-align:center; color:var(--text-muted); font-size:13px; padding:12px;">คลังศัพท์ของคุณยังว่างอยู่ ลองเพิ่มคำแรกด้านบนดูสิ! 📝</div>';
        return;
    }

    words.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'custom-word-item';
        row.innerHTML = `
            <div class="custom-word-info">
                <strong>${item.word}</strong> <span style="font-size:12px; color:var(--text-muted);">(${item.pos})</span> : ${item.meaning}
            </div>
            <button class="btn-delete-word" onclick="deleteCustomWord(${index})">❌ ลบ</button>
        `;
        listContainer.appendChild(row);
    });
}

// ฟังก์ชันสำหรับลบคำศัพท์ส่วนตัว
function deleteCustomWord(index) {
    if (!currentUser) return;
    
    const currentUserList = JSON.parse(localStorage.getItem(`vocab_${currentUser}`) || '[]');
    const targetWord = currentUserList[index] ? currentUserList[index].word : '';

    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบคำว่า "${targetWord}" ออกจากคลัง?`)) return;

    // ลบข้อมูลคำนั้นออกจาก Array ตามลำดับ Index
    currentUserList.splice(index, 1);
    localStorage.setItem(`vocab_${currentUser}`, JSON.stringify(currentUserList));

    // โหลดคลังข้อมูลระบบใหม่เพื่ออัปเดต UI ทั้งหมด
    loadCustomUserVocab();

    // จัดการความปลอดภัยหน้าจอเกมกรณีผู้ใช้ลบคำศัพท์ขณะกำลังเลือกเล่นชุดคำศัพท์ของตัวเองอยู่
    if (currentSetKey === CUSTOM_SET_KEY) {
        if (currentUserList.length === 0) {
            // ถ้าคำศัพท์ในคลังหมดเกลี้ยง ให้ดีดผู้เล่นกลับไปเล่นเซ็ต 1 อัตโนมัติ ป้องกันเกมพัง
            changeVocabSet('set1');
            document.getElementById('set-select').value = 'set1';
        } else {
            // ถ้ายังมีคำเหลืออยู่ ให้รีเฟรชอัปเดตเซ็ตเกมในโหมดนั้นๆ ทันที
            changeVocabSet(CUSTOM_SET_KEY);
            document.getElementById('set-select').value = CUSTOM_SET_KEY;
        }
    }
}

function addCustomOptionToDropdown() {
    const selectElem = document.getElementById('set-select');
    let exist = false;
    for (let i = 0; i < selectElem.options.length; i++) {
        if (selectElem.options[i].value === CUSTOM_SET_KEY) exist = true;
    }

    if (!exist) {
        const opt = document.createElement('option');
        opt.value = CUSTOM_SET_KEY;
        opt.innerText = `🌟 ชุดศัพท์ของฉัน (${vocabSets[CUSTOM_SET_KEY].length} คำ)`;
        selectElem.appendChild(opt);
    } else {
        const opt = selectElem.querySelector(`option[value="${CUSTOM_SET_KEY}"]`);
        opt.innerText = `🌟 ชุดศัพท์ของฉัน (${vocabSets[CUSTOM_SET_KEY].length} คำ)`;
    }
}

function removeCustomOptionFromDropdown() {
    const selectElem = document.getElementById('set-select');
    for (let i = 0; i < selectElem.options.length; i++) {
        if (selectElem.options[i].value === CUSTOM_SET_KEY) {
            selectElem.remove(i);
            break;
        }
    }
}

// ================= ฟังก์ชันควบคุมหน้าต่างป๊อปอัปคำศัพท์ (Vocab Modal Control) =================
function openVocabModal() {
    document.getElementById('vocabModal').style.display = 'flex';
    // ทุกครั้งที่เปิด Popup ให้ดึงรายการคำศัพท์ล่าสุดมาโชว์เสมอ
    renderCustomWordsList(); 
}

function closeVocabModal() {
    document.getElementById('vocabModal').style.display = 'none';
}

// ================= ปรับปรุงฟังก์ชันเดิมให้สอดคล้องกับระบบ Popup =================

function updateAuthUI() {
    const loggedOutDiv = document.getElementById('auth-status-logged-out');
    const loggedInDiv = document.getElementById('auth-status-logged-in');
    
    // หมายเหตุ: เราไม่ต้องสั่งดึง id='custom-vocab-section' แบบเดิมแล้ว เพราะย้ายไปอยู่ใน Modal เรียบร้อยแล้วครับ

    if (currentUser) {
        loggedOutDiv.style.display = 'none';
        loggedInDiv.style.display = 'block';
        document.getElementById('display-username').innerText = currentUser;
    } else {
        loggedOutDiv.style.display = 'block';
        loggedInDiv.style.display = 'none';
        // ล้างข้อมูลช่องพิมพ์ในล็อกอินฟอร์ม
        document.getElementById('auth-username').value = '';
        document.getElementById('auth-password').value = '';
        
        // ปิดหน้าต่างคลังคำศัพท์กรณีค้างอยู่แล้วผู้ใช้กด Logout
        closeVocabModal();
    }
}