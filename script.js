// ดึงข้อมูลคำศัพท์เริ่มต้นจากไฟล์ vocab.js
let currentSetKey = 'set1';
let vocabData = vocabSets[currentSetKey];

// ตัวแปรควบคุมระบบเกมทั่วไป
let currentCardIndex = 0;
let score = 0;
let currentQuizWord = {};
let quizAnswered = false;
let currentMode = 'flashcard';

// ================= ตัวแปรสำหรับระบบ RUNNER MODE =================
let runnerLoopInterval = null;
let runnerTimerInterval = null;
let runnerLives = 3;
let runnerScore = 0;
let runnerCombo = 0;
let isSlowMo = false;
let isRunnerPlaying = false;

let obstacleX = 100;         // ตำแหน่ง % แกน X ของสิ่งกีดขวาง (เริ่มจากขวาสุด)
let obstacleDirection = 0;   // ทิศทาง/ระดับความสูง (0: พื้น, 1: กลางอากาศ, 2: มุมสูง)
let obstacleEmoji = '🪨';
let runnerTimeLeft = 10;
let runnerMaxTime = 10;

// อาร์เรย์สิ่งกีดขวางแยกตามทิศทางระดับความสูง
const obstaclesPool = [
    { emoji: '🪨', dir: 0, cssBottom: '8px' },   // ระดับพื้น (เช่น ก้อนหิน)
    { emoji: '🦅', dir: 1, cssBottom: '50px' },  // ระดับกลาง (เช่น นกบินชน)
    { emoji: '⚡', dir: 2, cssBottom: '95px' }   // ระดับสูง/ทิศทางเบื้องบน (เช่น สายฟ้าพุ่งลงมา)
];

// --- ระบบเปลี่ยนชุดคำศัพท์ ---
function changeVocabSet(setKey) {
    currentSetKey = setKey;
    vocabData = vocabSets[setKey];
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
    
    // ล้าง Interval ของโหมดวิ่งก่อนเพื่อป้องกันโค้ดค้างหลังย้ายโหมด
    clearInterval(runnerLoopInterval);
    clearInterval(runnerTimerInterval);
    isRunnerPlaying = false;

    // เคลียร์แท็ก Active บนสไตล์และปุ่มคีย์หลัก
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

// --- [ระบบเดิม] โหมด Flashcard ---
function loadFlashcard() {
    const card = document.getElementById('flashcard');
    card.classList.remove('is-flipped');
    setTimeout(() => {
        document.getElementById('fc-word').innerText = vocabData[currentCardIndex].word;
        document.getElementById('fc-meaning').innerText = vocabData[currentCardIndex].meaning;
        document.getElementById('fc-counter').innerText = `${currentCardIndex + 1}/${vocabData.length}`;
    }, 150);
}
function flipCard() { document.getElementById('flashcard').classList.toggle('is-flipped'); }
function nextCard() { currentCardIndex = (currentCardIndex < vocabData.length - 1) ? currentCardIndex + 1 : 0; loadFlashcard(); }
function prevCard() { currentCardIndex = (currentCardIndex > 0) ? currentCardIndex - 1 : vocabData.length - 1; loadFlashcard(); }

// --- [ระบบเดิม] โหมด Quiz ---
function loadQuiz() {
    quizAnswered = false;
    document.getElementById('next-quiz').style.display = 'none';
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


// ================= ระบบหลักของโหมดใหม่: TIME RUNNER =================

function startRunnerGame() {
    clearInterval(runnerLoopInterval);
    clearInterval(runnerTimerInterval);
    
    // รีเซ็ตค่าสเตตัสเริ่มต้นตามเงื่อนไขของผู้ใช้
    runnerLives = 3;
    runnerScore = 0;
    runnerCombo = 0;
    isSlowMo = false;
    isRunnerPlaying = true;
    runnerMaxTime = 10; // เริ่มต้นให้เวลาเยอะ (10 วินาที)

    document.getElementById('runner-lives').innerText = '❤️❤️❤️';
    document.getElementById('runner-score').innerText = '0';
    document.getElementById('runner-multiplier').style.display = 'none';
    document.getElementById('runner-gameover').style.display = 'none';
    document.getElementById('runner-quiz-box').style.display = 'none';
    document.getElementById('slow-mo-overlay').style.display = 'none';

    spawnObstacle();
    
    // รัน Loop ติ๊กการเคลื่อนที่ของเกมทุกๆ 30 มิลลิวินาที
    runnerLoopInterval = setInterval(updateRunnerFrame, 30);
}

function spawnObstacle() {
    obstacleX = 100; // กลับไปจุดเริ่มต้นขวาสุด
    
    // สุ่มเลือกสิ่งกีดขวางและทิศทางความสูง (พื้น/กลาง/สูง) เพื่อให้มาได้หลายทิศทาง
    const randomObstacle = obstaclesPool[Math.floor(Math.random() * obstaclesPool.length)];
    obstacleDirection = randomObstacle.dir;
    obstacleEmoji = randomObstacle.emoji;

    const container = document.getElementById('obstacle-container');
    container.innerHTML = `<div id="active-obstacle" class="obstacle" style="bottom: ${randomObstacle.cssBottom};">${randomObstacle.emoji}</div>`;
}

function updateRunnerFrame() {
    if (!isRunnerPlaying || isSlowMo) return; // หากอยู่ในช่วงสโลว์โมชั่นให้หยุดเคลื่อนที่ชั่วคราว

    // ความเร็ววิ่งปกติ (ยิ่งคะแนนเยอะ ยิ่งวิ่งเข้าหาไวขึ้นเล็กน้อย)
    let currentSpeed = 1.6 + (runnerScore / 200);
    obstacleX -= currentSpeed;

    const obsElem = document.getElementById('active-obstacle');
    if (obsElem) {
        obsElem.style.left = obstacleX + '%';
    }

    // จุด Trigger: เมื่อสิ่งกีดขวางพุ่งเข้ามาใกล้ตัวเรา (พิกัด X ประมาณ 28% และตัวละครอยู่ฝั่งซ้ายมือ)
    if (obstacleX <= 28 && obstacleX > 15) {
        triggerSlowMotion();
    }
    
    // หากหลุดหน้าจอฝั่งซ้ายไปโดยไม่ได้ตัดสเตตัสสโลว์โมชั่น (กรณีบั๊กเซฟโซน) ให้เคลียร์ตัวใหม่
    if (obstacleX < -5) {
        spawnObstacle();
    }
}

function triggerSlowMotion() {
    isSlowMo = true;
    document.getElementById('slow-mo-overlay').style.display = 'block';
    document.getElementById('runner-quiz-box').style.display = 'block';
    
    // คำนวณความยาก: ยิ่งคะแนนเยอะ เวลาตอบยิ่งลดลง (ต่ำสุดไม่เกิน 2.5 วินาที เพื่อความท้าทาย)
    runnerMaxTime = Math.max(2.5, 10 - (runnerScore / 40));
    runnerTimeLeft = runnerMaxTime;

    loadRunnerQuiz();

    // ลูปแถบเวลาถอยหลัง (อัปเดตหลอดสีแดงทุกๆ 100ms)
    clearInterval(runnerTimerInterval);
    runnerTimerInterval = setInterval(() => {
        runnerTimeLeft -= 0.1;
        const widthPercent = (runnerTimeLeft / runnerMaxTime) * 100;
        document.getElementById('timer-bar').style.width = Math.max(0, widthPercent) + '%';

        if (runnerTimeLeft <= 0) {
            // หมดเวลาตอบ! ถือว่าโดนชน
            handleRunnerHit();
        }
    }, 100);
}

function loadRunnerQuiz() {
    const randomIndex = Math.floor(Math.random() * vocabData.length);
    currentQuizWord = vocabData[randomIndex];
    document.getElementById('runner-quiz-word').innerText = currentQuizWord.word;

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
        // ตอบถูกต่อเนื่อง: เพิ่มคอมโบ
        runnerCombo++;
        
        // มีเอฟเฟกต์แอนิเมชันหลบตามทิศทางสิ่งกีดขวาง
        const charElem = document.getElementById('runner-character');
        if (obstacleDirection === 0) {
            charElem.classList.add('character-jump'); // ก้อนหินมา -> กระโดดหลบ
        } else {
            charElem.classList.add('character-duck');  // นกหรือสายฟ้ามา -> ก้มหลบ
        }
        
        // ล้างแอนิเมชันหลบหลังจากขยับเสร็จ
        setTimeout(() => {
            charElem.classList.remove('character-jump', 'character-duck');
        }, 300);

        // ระบบตัวคูณ x2 เมื่อถูกต่อเนื่องตั้งแต่ 3 ข้อขึ้นไป
        let multiplier = 1;
        if (runnerCombo >= 3) {
            multiplier = 2;
            document.getElementById('runner-multiplier').style.display = 'inline-block';
        }

        runnerScore += 10 * multiplier;
        document.getElementById('runner-score').innerText = runnerScore;

        // ปิดโหมดสโลว์โมชั่นและปล่อยตัวถัดไปพุ่งมาทันที
        resumeRunnerGame();
    } else {
        // ตอบผิด -> โดนสิ่งกีดขวางชนล้ม
        handleRunnerHit();
    }
}

function handleRunnerHit() {
    clearInterval(runnerTimerInterval);
    runnerLives--;
    runnerCombo = 0; // รีเซ็ตคอมโบเริ่มใหม่หมดเมื่อโดนชน
    document.getElementById('runner-multiplier').style.display = 'none';

    // อัปเดตหัวใจบนหน้าจอตามจำนวนชีวิตที่เหลือ
    let heartsText = '';
    for(let i=0; i<3; i++) {
        heartsText += (i < runnerLives) ? '❤️' : '🖤';
    }
    document.getElementById('runner-lives').innerText = heartsText;

    // เอฟเฟกต์จอกะพริบสีแดงเตือนความเสียหาย
    const arena = document.getElementById('game-arena');
    arena.style.backgroundColor = '#fca5a5';
    setTimeout(() => { arena.style.background = ''; }, 200);

    if (runnerLives <= 0) {
        // หัวใจหมด 3 ดวง -> GAME OVER
        isRunnerPlaying = false;
        clearInterval(runnerLoopInterval);
        document.getElementById('final-runner-score').innerText = runnerScore;
        document.getElementById('runner-gameover').style.display = 'flex';
    } else {
        // ยังมีชีวิตเหลืออยู่ ให้ข้ามอุปสรรคตัวนี้แล้ววิ่งต่อ
        resumeRunnerGame();
    }
}

function resumeRunnerGame() {
    isSlowMo = false;
    document.getElementById('slow-mo-overlay').style.display = 'none';
    document.getElementById('runner-quiz-box').style.display = 'none';
    spawnObstacle();
}

window.onload = () => {
    loadFlashcard();
};