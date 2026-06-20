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

function switchMode(mode) {
    // =========================================================
    // 🛑 1. ระบบตรวจสอบความปลอดภัย (เช็กเฉพาะชุดศัพท์ของฉันตาม CUSTOM_SET_KEY)
    // =========================================================
    const selectElem = document.getElementById('set-select');
    if (selectElem) {
        const currentSelectedSet = selectElem.value;

        // เช็กว่าตรงกับ Key ชุดศัพท์ของฉันหรือไม่
        if (currentSelectedSet === CUSTOM_SET_KEY) {
            
            // ดึงจำนวนคำศัพท์จากโครงสร้างข้อมูลจริงของคุณ
            const myWordsCount = (typeof vocabSets !== 'undefined' && vocabSets[CUSTOM_SET_KEY]) 
                                 ? vocabSets[CUSTOM_SET_KEY].length 
                                 : 0;
            
            // ถ้าคำศัพท์มีไม่ถึง 4 คำ และกำลังจะเข้าโหมด Quiz หรือ Runner ให้บล็อกทันที
            if ((mode === 'quiz' || mode === 'runner') && myWordsCount < 4) {
                showToast('⚠️ คำศัพท์ในคลังของคุณมีน้อยเกินไป (ต้องมีอย่างน้อย 4 คำ) กรุณาเพิ่มศัพท์ก่อนเล่นครับ', 'warning');
                return; // สั่งดีดตัวกลับ ไม่เปลี่ยนโหมดให้หน้าจอค้าง
            }
        }
    }

    // =========================================================
    // 🔄 2. เคลียร์สถานะเกมและสลับโหมดตามปกติ (โค้ดดั้งเดิมของคุณ)
    // =========================================================
    currentMode = mode;
    clearInterval(runnerLoopInterval);
    clearInterval(runnerTimerInterval);
    isSlowMo = false;
    isRunnerPlaying = false;

    // ล้างสีปุ่มแดงค้าง และปิดหน้าจอโหมดเก่า (.btn-sidebar-mode)
    document.querySelectorAll('.mode-container, .btn-sidebar-mode').forEach(el => el.classList.remove('active'));

    // เปิดหน้าจอโหมดที่เลือก และไฮไลต์สีแดงให้ถูกปุ่ม
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

        // 1. คำนวณคะแนนที่ได้ในรอบนี้
        const pointsEarned = 10 * multiplier;

        // 2. บวกคะแนนและอัปเดตบนหน้าจอหลัก
        runnerScore += pointsEarned;
        document.getElementById('runner-score').innerText = runnerScore;
        
        // 🚀 3. เรียกใช้ป๊อปอัปเอฟเฟกต์แต้มลอยตัวโชว์คะแนนแบบเรียลไทม์
        showRunnerScoreFeedback(pointsEarned);

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
// ================= 🗣️ AI-Powered IPA to Thai Karaoke Engine =================
function convertIpaToThai(ipa) {
    if (!ipa) return "";
    
    // 1. ทำความสะอาดข้อความ IPA (ลบจุด สแลช เสียงหนัก)
    let tempIpa = ipa.toLowerCase().replace(/[\/ˈˌ. ]/g, "");
    
    // 2. คลังข้อมูลหน่วยเสียง (Phonemes) สั่งสอนให้ระบบรู้จักพยัญชนะและสระ
    const phonemes = [
        // พยัญชนะคู่และสระผสม (ต้องอยู่บนสุดเพื่อให้ตรวจจับก่อน)
        { i: "tʃ", t: "ช", type: "C" }, { i: "dʒ", t: "จ", type: "C" },
        { i: "aʊ", t: "-าว", type: "V", inherent_coda: true },
        { i: "ɔɪ", t: "-อย", type: "V", inherent_coda: true },
        { i: "eɪ", t: "เ-", type: "V", inherent_coda: false },
        { i: "aɪ", t: "ไ-", type: "V", inherent_coda: false },
        { i: "oʊ", t: "โ-", type: "V", inherent_coda: false },
        { i: "əʊ", t: "โ-", type: "V", inherent_coda: false },
        { i: "ɪə", t: "เ-ีย", type: "V", inherent_coda: false },
        { i: "eə", t: "แ-ร์", type: "V", inherent_coda: true },
        { i: "ʊə", t: "-ัว", type: "V", inherent_coda: false },
        { i: "ɑː", t: "-า", type: "V", inherent_coda: false },
        { i: "iː", t: "-ี", type: "V", inherent_coda: false },
        { i: "ɔː", t: "-อ", type: "V", inherent_coda: false },
        { i: "uː", t: "-ู", type: "V", inherent_coda: false },
        { i: "ɜː", t: "เ-อ", type: "V", inherent_coda: false },
        { i: "ər", t: "เ-อร์", type: "V", inherent_coda: true },
        // สระเดี่ยว
        { i: "æ", t: "แ-", type: "V", inherent_coda: false },
        { i: "ɑ", t: "-า", type: "V", inherent_coda: false },
        { i: "ɒ", t: "-อ", type: "V", inherent_coda: false },
        { i: "ɔ", t: "-อ", type: "V", inherent_coda: false },
        { i: "ɪ", t: "-ิ", type: "V", inherent_coda: false },
        { i: "i", t: "-ิ", type: "V", inherent_coda: false },
        { i: "e", t: "เ-", type: "V", inherent_coda: false },
        { i: "ɛ", t: "เ-", type: "V", inherent_coda: false },
        { i: "ʊ", t: "-ุ", type: "V", inherent_coda: false },
        { i: "u", t: "-ุ", type: "V", inherent_coda: false },
        { i: "ʌ", t: "FLEX", type: "V", inherent_coda: false }, // สระแปลงรูป อะ/ไม้หันอากาศ
        { i: "ə", t: "FLEX", type: "V", inherent_coda: false },
        // พยัญชนะเดี่ยว
        { i: "θ", t: "ธ", type: "C" }, { i: "ð", t: "ด", type: "C" },
        { i: "ʃ", t: "ช", type: "C" }, { i: "ʒ", t: "ช", type: "C" },
        { i: "ŋ", t: "ง", type: "C" }, { i: "p", t: "พ", type: "C" },
        { i: "b", t: "บ", type: "C" }, { i: "t", t: "ท", type: "C" },
        { i: "d", t: "ด", type: "C" }, { i: "k", t: "ค", type: "C" },
        { i: "g", t: "ก", type: "C" }, { i: "ɡ", t: "ก", type: "C" },
        { i: "f", t: "ฟ", type: "C" }, { i: "v", t: "ว", t_coda: "ฟ", type: "C" }, // v ต้นคำ=ว, ท้ายคำ=ฟ
        { i: "s", t: "ส", type: "C" }, { i: "z", t: "ซ", type: "C" },
        { i: "h", t: "ฮ", type: "C" }, { i: "m", t: "ม", type: "C" },
        { i: "n", t: "น", type: "C" }, { i: "l", t: "ล", type: "C" },
        { i: "r", t: "ร", type: "C" }, { i: "ɹ", t: "ร", type: "C" },
        { i: "j", t: "ย", type: "C" }, { i: "w", t: "ว", type: "C" }
    ];

    // 3. Tokenizer: หั่น IPA ออกเป็นชิ้นๆ (ตัวอักษร)
    let tokens = [];
    while (tempIpa.length > 0) {
        let matched = false;
        for (let p of phonemes) {
            if (tempIpa.startsWith(p.i)) {
                tokens.push({...p});
                tempIpa = tempIpa.substring(p.i.length);
                matched = true; break;
            }
        }
        if (!matched) tempIpa = tempIpa.substring(1);
    }

    // 4. Syllable Parser: AI วิเคราะห์พยางค์ (จัดกลุ่ม พยัญชนะต้น-สระ-ตัวสะกด)
    const syllables = [];
    let currentOnset = [];
    
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        
        if (token.type === 'C') {
            currentOnset.push(token); // สะสมเป็นพยัญชนะต้น
        } else if (token.type === 'V') {
            const vowelToken = token;
            const codaArr = [];
            
            // Lookahead: มองข้ามไปข้างหน้าเพื่อหาตัวสะกด
            let j = i + 1;
            while (j < tokens.length && tokens[j].type === 'C') {
                const next1 = tokens[j];
                const next2 = j + 1 < tokens.length ? tokens[j+1] : null;
                const next3 = j + 2 < tokens.length ? tokens[j+2] : null;
                
                // หากตัวถัดไปติดกับสระเลย แสดงว่าเป็นพยัญชนะต้นของพยางค์ถัดไป ไม่ใช่ตัวสะกด!
                if (next2 && next2.type === 'V') break; 
                
                // หากตัวถัดไป 2 ตัวรวมกันเป็นคำควบกล้ำที่ติดกับสระ ก็ไม่ใช่ตัวสะกดเช่นกัน
                const validClusters = ['pr','br','tr','dr','kr','gr','ɡr','pl','bl','kl','gl','ɡl','fl','sl','kw','gw','ɡw','sm','sn','sp','st','sk','sw'];
                if (next2 && next2.type === 'C' && next3 && next3.type === 'V') {
                    if (validClusters.includes(next1.i + next2.i)) break;
                }
                
                codaArr.push(next1);
                j++;
            }
            
            syllables.push({ onset: currentOnset, vowel: vowelToken, coda: codaArr });
            i = j - 1; 
            currentOnset = []; // เคลียร์ค่ารอพยางค์ถัดไป
        }
    }
    
    // 5. Renderer: นำพยางค์ที่วิเคราะห์เสร็จแล้วมาประกอบร่างเป็นคำไทย
    let result = "";
    for (let syl of syllables) {
        let mainOnset = 'อ'; // ค่าพื้นฐานกรณีคำขึ้นต้นด้วยสระ
        let leadingOnset = '';
        
        if (syl.onset.length > 0) {
            const validClusters = ['pr','br','tr','dr','kr','gr','ɡr','pl','bl','kl','gl','ɡl','fl','sl','kw','gw','ɡw','sm','sn','sp','st','sk','sw'];
            if (syl.onset.length >= 2) {
                const last2 = syl.onset[syl.onset.length-2].i + syl.onset[syl.onset.length-1].i;
                if (validClusters.includes(last2)) {
                    // เป็นคำควบกล้ำแท้ ให้สระคร่อมทั้งสองตัว
                    mainOnset = syl.onset[syl.onset.length-2].t + syl.onset[syl.onset.length-1].t;
                    leadingOnset = syl.onset.slice(0, syl.onset.length-2).map(c=>c.t).join('');
                } else {
                    // ไม่ใช่ควบกล้ำแท้ ให้สระคร่อมแค่ตัวเดียว
                    mainOnset = syl.onset[syl.onset.length-1].t;
                    leadingOnset = syl.onset.slice(0, syl.onset.length-1).map(c=>c.t).join('');
                }
            } else {
                mainOnset = syl.onset[0].t;
            }
        }
        
        // จัดการสระดิ้นได้ (เช่น เสียง อะ ถ่ามีตัวสะกดจะเป็น ไม้หันอากาศ ทันที)
        let template = syl.vowel.t;
        if (template === "FLEX") {
            template = syl.coda.length > 0 ? "-ั" : "-ะ";
        }
        
        let vStr = template.replace("-", mainOnset); // ใส่พยัญชนะต้นเข้าไปในรูปร่างสระ
        
        // จัดการตัวสะกดและการันต์ (ฉลาดพอที่จะรู้ว่าตัวไหนควรใส่การันต์)
        let codaStr = "";
        syl.coda.forEach((c, idx) => {
            let char = c.t_coda || c.t; // ถ้ามีตัวสะกดเฉพาะ (เช่น v -> ฟ) ให้ใช้ตัวนั้น
            if (syl.vowel.inherent_coda) {
                codaStr += char + '์'; // ถ้าสระมีเสียงตัวสะกดในตัวอยู่แล้ว (เช่น อาว) ตัวสะกดถัดมาต้องเป็นการันต์
            } else {
                if (idx === 0) codaStr += char; // ตัวสะกดตัวแรกปกติ
                else codaStr += char + '์';     // ตัวสะกดตัวที่สองขึ้นไปใส่การันต์
            }
        });
        
        result += leadingOnset + vStr + codaStr;
    }
    
    return result;
}
// ================= วางไว้ที่นอกสุดของไฟล์ script.js =================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    // สร้างกล่องข้อความ
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // เลือกไอคอนตามประเภท
    let icon = '✨';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';
    if (type === 'info') icon = 'ℹ️';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    // ลบตัวเองออกจากหน้าจอหลังผ่านไป 3 วินาที
    setTimeout(() => {
        toast.remove();
    }, 3000);
}   
// ================= 🧠 ระบบดึงข้อมูลคำศัพท์อัจฉริยะ (AI Smart Auto-Fill API) =================
async function fetchSmartVocab() {
    const wordInput = document.getElementById('add-word');
    const fetchBtn = document.querySelector('.btn-smart-fetch');
    const word = wordInput.value.trim();

    // ป้องกันกรณีไม่ได้กรอกคำศัพท์แล้วกดปุ่ม
    if (!word) { 
        showToast('กรุณากรอกคำศัพท์ภาษาอังกฤษก่อนกดดึงข้อมูลครับ', 'warning'); 
        return; 
    }

    // แสดงสถานะการโหลดและเปลี่ยนสีปุ่มชั่วคราว
    showToast('กำลังค้นหาและวิเคราะห์คำศัพท์จากคลังข้อมูล...', 'info');
    fetchBtn.classList.add('loading');
    fetchBtn.innerText = '⏳ กำลังดึงข้อมูล...';

    try {
        // [จุดที่ 1] ดึงประเภทคำ ศัพท์สากล และประโยคตัวอย่างจาก Free Dictionary API
        const dictResponse = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        
        let detectedPos = 'n.'; // ค่าเริ่มต้นหากหาไม่เจอ
        let detectedExample = '';
        let detectedPhonetic = '';

        if (dictResponse.ok) {
            const dictData = await dictResponse.json();
            if (dictData && dictData[0]) {
                
                // 🔍 [แก้ไขบั๊กคำอ่านมั่ว] วนลูปหาตัวที่มีข้อความคำอ่านสากล (Phonetics) ที่ไม่ว่างจริงๆ
                if (dictData[0].phonetic) {
                    detectedPhonetic = dictData[0].phonetic;
                } else if (dictData[0].phonetics && dictData[0].phonetics.length > 0) {
                    // กรองเอาเฉพาะออบเจกต์ที่มีฟิลด์ text และไม่เป็นค่าว่าง
                    const validPhoneticObj = dictData[0].phonetics.find(p => p.text && p.text.trim() !== "");
                    if (validPhoneticObj) {
                        detectedPhonetic = validPhoneticObj.text;
                    }
                }
                
                if (dictData[0].meanings && dictData[0].meanings.length > 0) {
                    const firstMeaning = dictData[0].meanings[0];
                    
                    // แปลงค่าประเภทคำให้อยู่ในฟอร์มย่อของระบบเกมคุณ
                    const apiPos = firstMeaning.partOfSpeech;
                    if (apiPos === 'noun') detectedPos = 'n.';
                    else if (apiPos === 'verb') detectedPos = 'v.';
                    else if (apiPos === 'adjective') detectedPos = 'adj.';
                    else if (apiPos === 'adverb') detectedPos = 'adv.';

                    // วนลูปค้นหาประโยคตัวอย่างแรกที่มีบันทึกไว้ในพจนานุกรม
                    for (let meaningObj of dictData[0].meanings) {
                        for (let def of meaningObj.definitions) {
                            if (def.example) {
                                detectedExample = def.example;
                                break;
                            }
                        }
                        if (detectedExample) break;
                    }
                }
            }
        }

        // [จุดที่ 2] ดึงคำแปลภาษาไทยโดยเฉพาะผ่าน MyMemory API (ฟรี ไม่ต้องคีย์)
        const translateResponse = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|th`);
        let detectedMeaning = '';

        if (translateResponse.ok) {
            const transData = await translateResponse.json();
            if (transData && transData.responseData) {
                detectedMeaning = transData.responseData.translatedText;
                
                // เคลียร์ความสะอาดข้อความ (กรณี API ส่งคำแปลแบบเป็นประโยคยาวๆ หรือมีคำซ้ำ)
                if(detectedMeaning.toLowerCase() === word.toLowerCase()) {
                    detectedMeaning = ''; // แปลไม่ออก
                }
            }
        }

        // ================= [จุดที่ 3] ประกอบร่างและกรอกลงฟอร์มอัตโนมัติ =================
        if (detectedMeaning) {
            document.getElementById('add-meaning').value = detectedMeaning;
        } else {
            document.getElementById('add-meaning').value = '';
            showToast('ค้นหาคำแปลไทยไม่พบ คุณสามารถพิมพ์เติมเองได้เลยครับ', 'warning');
        }

        document.getElementById('add-pos').value = detectedPos;
        document.getElementById('add-example').value = detectedExample || `The manager approved the ${word} immediately.`; // สร้างประโยคจำลองถ้าไม่มีจากระบบ
        
        // กรอกคำอ่านสากลที่สแกนเจออย่างถูกต้อง หากหาไม่เจอจริงๆ ถึงจะใช้ฟอลแบ็กสแลชครอบ
        // นำข้อความ IPA ที่ได้เข้ากระบวนการแปลงร่างเป็นภาษาไทยก่อนนำไปกรอกลงกล่องข้อความ
        if (detectedPhonetic) {
            document.getElementById('add-read').value = convertIpaToThai(detectedPhonetic);
        } else {
            document.getElementById('add-read').value = `/${word}/`; // ฟอลแบ็กกรณีหาเสียงอ่านไม่เจอจริงๆ
        }

        showToast('🎯 ดึงข้อมูลอัจฉริยะเสร็จสิ้น! ตรวจสอบความถูกต้องแล้วกดบันทึกได้เลยครับ', 'success');

    } catch (error) {
        console.error("Smart Fetch Error:", error);
        showToast('การเชื่อมต่อขัดข้อง ไม่สามารถดึงข้อมูลอัตโนมัติได้ในขณะนี้', 'error');
    } finally {
        // คืนค่าปุ่มให้กลับมาทำงานปกติ
        fetchBtn.classList.remove('loading');
        fetchBtn.innerText = '✨ ดึงข้อมูลคำศัพท์';
    }
}

// ================= ปรับปรุงป๊อปอัปหน้าต่างลอยล็อกอิน (Auth Modals Setup) =================
function openAuthModal() {
    document.getElementById('authModal').style.display = 'flex';
}
function closeAuthModal() {
    document.getElementById('authModal').style.display = 'none';
}

// ================= ปรับปรุงตรรกะระบบให้หันมาใช้งานระบบแจ้งเตือนตัวใหม่ =================

function handleRegister() {
    const uInput = document.getElementById('auth-username').value.trim();
    const pInput = document.getElementById('auth-password').value.trim();

    if (!uInput || !pInput) { 
        showToast('กรุณากรอกข้อมูลให้ครบถ้วนครับ', 'warning'); 
        return; 
    }

    const users = JSON.parse(localStorage.getItem('game_users') || '{}');
    if (users[uInput]) { 
        showToast('ชื่อผู้ใช้นี้ถูกใช้งานไปแล้ว', 'error'); 
        return; 
    }

    users[uInput] = pInput;
    localStorage.setItem('game_users', JSON.stringify(users));
    showToast('สมัครสมาชิกสำเร็จ! สามารถเข้าสู่ระบบได้เลย', 'success');
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
        closeAuthModal(); 
        showToast(`ยินดีต้อนรับกลับมา คุณ ${currentUser} 🎉`, 'success');
    } else {
        showToast('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 'error');
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
    showToast('ออกจากระบบเรียบร้อยแล้ว', 'info');
}

function addNewCustomWord() {
    if (!currentUser) { showToast('โปรดล็อกอินก่อนจัดการคลังคำศัพท์', 'warning'); return; }

    const wordText = document.getElementById('add-word').value.trim();
    const readText = document.getElementById('add-read').value.trim();
    const posType = document.getElementById('add-pos').value;
    const meaningText = document.getElementById('add-meaning').value.trim();
    const exampleText = document.getElementById('add-example').value.trim();

    if (!wordText || !meaningText || !readText) {
        showToast('จำเป็นต้องกรอกคำศัพท์ คำอ่าน และคำแปลครับ', 'warning');
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

    // ล้างฟิลด์ในฟอร์ม
    document.getElementById('add-word').value = '';
    document.getElementById('add-read').value = '';
    document.getElementById('add-meaning').value = '';
    document.getElementById('add-example').value = '';

    if (currentSetKey === CUSTOM_SET_KEY) {
        changeVocabSet(CUSTOM_SET_KEY);
    }

    showToast(`เพิ่มคำศัพท์ "${wordText}" ลงคลังส่วนตัวแล้ว!`);
}

function deleteCustomWord(index) {
    if (!currentUser) return;
    
    const currentUserList = JSON.parse(localStorage.getItem(`vocab_${currentUser}`) || '[]');
    const targetWord = currentUserList[index] ? currentUserList[index].word : '';

    // สำหรับปุ่มลบสำคัญๆ ยังแนะนำให้ใช้ Confirm ของเบราว์เซอร์เพื่อกันการลั่นนิ้วไปโดนโดยไม่ตั้งใจครับ
    if (!confirm(`คุณต้องการลบคำว่า "${targetWord}" ใช่หรือไม่?`)) return;

    currentUserList.splice(index, 1);
    localStorage.setItem(`vocab_${currentUser}`, JSON.stringify(currentUserList));

    loadCustomUserVocab();

    if (currentSetKey === CUSTOM_SET_KEY) {
        if (currentUserList.length === 0) {
            changeVocabSet('set1');
            document.getElementById('set-select').value = 'set1';
        } else {
            changeVocabSet(CUSTOM_SET_KEY);
            document.getElementById('set-select').value = CUSTOM_SET_KEY;
        }
    }
    showToast(`ลบ "${targetWord}" ออกเรียบร้อย`, 'info');
}
// ================= 🎯 ฟังก์ชันสร้างป๊อปอัปคะแนนลอยตัว (Non-blocking Game Popup) =================
function showRunnerScoreFeedback(points) {
    const arena = document.getElementById('game-arena');
    if (!arena) return;

    // สร้าง Element ตัวป๊อปอัปแจ้งเตือนคะแนน
    const feedback = document.createElement('div');
    feedback.className = 'floating-score-feedback';
    feedback.innerHTML = `🔥 ถูกต้อง! +${points} แต้ม`;

    // ยัดเข้าไปในลานวิ่งของเกม
    arena.appendChild(feedback);

    // ทำลายตัวเองทิ้งเมื่อแอนิเมชันจบลง (800 มิลลิวินาที) เพื่อป้องกันไม่ให้โค้ดขยะสะสมในหน้าจอ
    setTimeout(() => {
        feedback.remove();
    }, 800);
}
// ================= 📱 ฟังก์ชันสลับการเปิด/ปิด แถบเมนูด้านข้าง (Sidebar Toggle) =================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    // ใช้คลาส .active ในการควบคุมการสไลด์และเปิดม่านหลัง
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}