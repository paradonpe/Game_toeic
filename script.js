// ดึงข้อมูลคำศัพท์เริ่มต้นจากไฟล์ vocab.js
let currentSetKey = 'set1';
let vocabData = vocabSets[currentSetKey];

// ตัวแปรควบคุมระบบเกม
let currentCardIndex = 0;
let score = 0;
let currentQuizWord = {};
let quizAnswered = false;
let currentMode = 'flashcard';

// --- ระบบเปลี่ยนชุดคำศัพท์ ---
function changeVocabSet(setKey) {
    currentSetKey = setKey;
    vocabData = vocabSets[setKey];
    currentCardIndex = 0;
    
    if (currentMode === 'flashcard') {
        loadFlashcard();
    } else {
        score = 0;
        document.getElementById('score').innerText = score;
        loadQuiz();
    }
}

// --- ระบบสลับโหมดการเล่น ---
function switchMode(mode) {
    currentMode = mode;
    document.getElementById('flashcard-mode').classList.remove('active');
    document.getElementById('quiz-mode').classList.remove('active');
    document.getElementById('btn-flashcard').classList.remove('active');
    document.getElementById('btn-quiz').classList.remove('active');

    if (mode === 'flashcard') {
        document.getElementById('flashcard-mode').classList.add('active');
        document.getElementById('btn-flashcard').classList.add('active');
        loadFlashcard();
    } else {
        document.getElementById('quiz-mode').classList.add('active');
        document.getElementById('btn-quiz').classList.add('active');
        score = 0;
        document.getElementById('score').innerText = score;
        loadQuiz();
    }
}

// --- ระบบโหมด Flashcard ---
function loadFlashcard() {
    const card = document.getElementById('flashcard');
    card.classList.remove('is-flipped');
    
    setTimeout(() => {
        document.getElementById('fc-word').innerText = vocabData[currentCardIndex].word;
        document.getElementById('fc-meaning').innerText = vocabData[currentCardIndex].meaning;
        document.getElementById('fc-counter').innerText = `${currentCardIndex + 1}/${vocabData.length}`;
    }, 150);
}

function flipCard() {
    document.getElementById('flashcard').classList.toggle('is-flipped');
}

function nextCard() {
    if (currentCardIndex < vocabData.length - 1) {
        currentCardIndex++;
    } else {
        currentCardIndex = 0;
    }
    loadFlashcard();
}

function prevCard() {
    if (currentCardIndex > 0) {
        currentCardIndex--;
    } else {
        currentCardIndex = vocabData.length - 1;
    }
    loadFlashcard();
}

// --- ระบบโหมด Quiz ---
function loadQuiz() {
    quizAnswered = false;
    document.getElementById('next-quiz').style.display = 'none';
    
    const randomIndex = Math.floor(Math.random() * vocabData.length);
    currentQuizWord = vocabData[randomIndex];
    document.getElementById('quiz-word').innerText = currentQuizWord.word;

    let choices = [currentQuizWord.meaning];
    
    while (choices.length < 4) {
        const randomWrongIndex = Math.floor(Math.random() * vocabData.length);
        const wrongMeaning = vocabData[randomWrongIndex].meaning;
        if (!choices.includes(wrongMeaning)) {
            choices.push(wrongMeaning);
        }
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

    const allBtns = document.querySelectorAll('.choice-btn');

    if (selectedMeaning === currentQuizWord.meaning) {
        btn.classList.add('correct');
        score += 10;
        document.getElementById('score').innerText = score;
    } else {
        btn.classList.add('wrong');
        allBtns.forEach(b => {
            if (b.innerText === currentQuizWord.meaning) {
                b.classList.add('correct');
            }
        });
    }
    document.getElementById('next-quiz').style.display = 'block';
}

function nextQuiz() {
    loadQuiz();
}

window.onload = () => {
    loadFlashcard();
};