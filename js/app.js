// --- State Management ---
let database = [];
let currentChallenge = [];
let score = { total: 0, correct: 0, error: 0, matchedPairs: 0 };
let gameStartTime = null;
let timerInterval = null;

let leftSelected = null; // { id, element }
let rightSelected = null; // { id, element }

let currentFilterType = 'todos';

function formatTime(secs) {
    if (secs === null || secs === undefined) return "--:--";
    const s = parseInt(secs, 10);
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const rs = (s % 60).toString().padStart(2, '0');
    return `${m}:${rs}`;
}

function updateBestTimeDisplay() {
    const todosTime = localStorage.getItem('nihongoMatchBestTime_todos');
    const palavraTime = localStorage.getItem('nihongoMatchBestTime_palavra');
    const fraseTime = localStorage.getItem('nihongoMatchBestTime_frase');

    const homeTodos = document.getElementById('best-time-todos');
    if (homeTodos) homeTodos.innerText = formatTime(todosTime);
    
    const homePalavra = document.getElementById('best-time-palavra');
    if (homePalavra) homePalavra.innerText = formatTime(palavraTime);
    
    const homeFrase = document.getElementById('best-time-frase');
    if (homeFrase) homeFrase.innerText = formatTime(fraseTime);

    const gameEl = document.getElementById('best-time');
    if (gameEl) {
        const currentTime = localStorage.getItem(`nihongoMatchBestTime_${currentFilterType}`);
        gameEl.innerText = formatTime(currentTime);
    }
}

// --- DOM Elements ---
const screens = {
    setup: document.getElementById('setup-screen'),
    game: document.getElementById('game-screen')
};
const modal = document.getElementById('result-modal');
const btnStart = document.getElementById('btn-start');
const dbStatus = document.getElementById('db-status');
const fileInput = document.getElementById('file-upload');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    updateBestTimeDisplay();
    loadDatabaseFromStorage();
    
    fileInput.addEventListener('change', handleFileUpload);
    btnStart.addEventListener('click', startGame);

    const leftSelect = document.getElementById('left-column');
    const rightSelect = document.getElementById('right-column');
    leftSelect.addEventListener('change', updateColumnsOptions);
    rightSelect.addEventListener('change', updateColumnsOptions);
    updateColumnsOptions();
});

function updateColumnsOptions() {
    const leftSelect = document.getElementById('left-column');
    const rightSelect = document.getElementById('right-column');
    
    const leftValue = leftSelect.value;
    const rightValue = rightSelect.value;
    
    Array.from(leftSelect.options).forEach(opt => {
        opt.disabled = false;
        opt.style.display = '';
    });
    Array.from(rightSelect.options).forEach(opt => {
        opt.disabled = false;
        opt.style.display = '';
    });
    
    const optInRight = Array.from(rightSelect.options).find(opt => opt.value === leftValue);
    if (optInRight) {
        optInRight.disabled = true;
        optInRight.style.display = 'none';
    }
    
    const optInLeft = Array.from(leftSelect.options).find(opt => opt.value === rightValue);
    if (optInLeft) {
        optInLeft.disabled = true;
        optInLeft.style.display = 'none';
    }
}

// --- Database Logic ---
function loadDatabaseFromStorage() {
    const saved = localStorage.getItem('nihongoMatchDB');
    if (saved) {
        try {
            database = JSON.parse(saved);
            updateStatusText(`Base carregada: ${database.length} itens encontrados.`);
            btnStart.disabled = false;
        } catch (e) {
            console.error("Erro ao ler database do localStorage", e);
        }
    }
}

function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    updateStatusText('Lendo arquivo...');
    document.getElementById('file-name').innerText = file.name;

    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const data = evt.target.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Convert to JSON
            const json = XLSX.utils.sheet_to_json(worksheet);
            
            // Validate columns loosely
            if (json.length > 0 && json[0].Original !== undefined && json[0].Portugues !== undefined) {
                // Sanitize and map
                database = json.map((row, index) => ({
                    id: index + 1,
                    type: (row.Tipo || 'palavra').toLowerCase().trim(),
                    original: row.Original ? row.Original.toString().trim() : '',
                    romaji: row.Romaji ? row.Romaji.toString().trim() : '',
                    portugues: row.Portugues ? row.Portugues.toString().trim() : ''
                })).filter(row => row.original !== '' && row.portugues !== '');

                localStorage.setItem('nihongoMatchDB', JSON.stringify(database));
                updateStatusText(`Sucesso! ${database.length} itens importados.`);
                btnStart.disabled = false;
            } else {
                updateStatusText('Erro: Planilha não possui colunas "Original" e "Portugues".', true);
            }
        } catch (error) {
            console.error(error);
            updateStatusText('Erro ao processar a planilha.', true);
        }
    };
    reader.readAsBinaryString(file);
}

function updateStatusText(msg, isError = false) {
    dbStatus.innerText = msg;
    dbStatus.style.color = isError ? 'var(--danger)' : 'var(--success)';
}

// --- Game Logic ---

// Helper: Shuffle array
function shuffleArray(array) {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
}

function startGame() {
    const filterType = document.getElementById('filter-type').value;
    const colLeftType = document.getElementById('left-column').value.toLowerCase();
    const colRightType = document.getElementById('right-column').value.toLowerCase();
    const itemCountStr = document.getElementById('item-count').value;

    currentFilterType = filterType;
    updateBestTimeDisplay();

    // Filter DB
    if (filterType === 'todos') {
        currentChallenge = [...database];
    } else {
        currentChallenge = database.filter(item => item.type === filterType);
    }

    if (currentChallenge.length === 0) {
        alert("Nenhum item encontrado com esse filtro.");
        return;
    }

    // Shuffle and slice based on itemCount
    currentChallenge = shuffleArray(currentChallenge);
    if (itemCountStr !== 'todos') {
        const count = parseInt(itemCountStr, 10);
        if (currentChallenge.length > count) {
            currentChallenge = currentChallenge.slice(0, count);
        }
    }

    // Reset State
    score = { total: currentChallenge.length, correct: 0, error: 0, matchedPairs: 0 };
    leftSelected = null;
    rightSelected = null;
    gameStartTime = Date.now();
    updateScoreBoard();

    // Start Live Timer
    if (timerInterval) clearInterval(timerInterval);
    document.getElementById('live-time').innerText = "00:00";
    timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
        const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const s = (elapsed % 60).toString().padStart(2, '0');
        document.getElementById('live-time').innerText = `${m}:${s}`;
    }, 1000);

    // Prepare Columns
    const leftItems = shuffleArray(currentChallenge).map(item => ({ id: item.id, text: item[colLeftType], isJp: colLeftType === 'original' }));
    const rightItems = shuffleArray(currentChallenge).map(item => ({ id: item.id, text: item[colRightType], isJp: colRightType === 'original' }));

    renderColumn('col-left', leftItems, 'left');
    renderColumn('col-right', rightItems, 'right');

    // Switch Screen
    screens.setup.classList.remove('active');
    screens.game.classList.add('active');
    
    // Sync heights after rendering
    setTimeout(syncBoxHeights, 50);
}

function syncBoxHeights() {
    const boxes = document.querySelectorAll('.match-item');
    boxes.forEach(b => b.style.minHeight = '80px'); // reset
    
    let maxHeight = 80;
    boxes.forEach(b => {
        if (b.offsetHeight > maxHeight) maxHeight = b.offsetHeight;
    });
    
    boxes.forEach(b => b.style.minHeight = `${maxHeight}px`);
}

function renderColumn(containerId, items, side) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = `match-item ${item.isJp ? 'jp-text' : ''}`;
        div.innerText = item.text;
        div.dataset.id = item.id;
        div.dataset.side = side;
        
        div.addEventListener('click', () => handleItemClick(div, item.id, side));
        
        container.appendChild(div);
    });
}

function handleItemClick(element, id, side) {
    // Ignore if already matched
    if (element.classList.contains('correct')) return;

    // Deselect if clicking the same item
    if (side === 'left') {
        if (leftSelected && leftSelected.element === element) {
            element.classList.remove('selected');
            leftSelected = null;
            return;
        }
        // Deselect previous left
        if (leftSelected) leftSelected.element.classList.remove('selected');
        
        leftSelected = { id, element };
        element.classList.add('selected');
    } else {
        if (rightSelected && rightSelected.element === element) {
            element.classList.remove('selected');
            rightSelected = null;
            return;
        }
        // Deselect previous right
        if (rightSelected) rightSelected.element.classList.remove('selected');
        
        rightSelected = { id, element };
        element.classList.add('selected');
    }

    // Check match if both selected
    if (leftSelected && rightSelected) {
        checkMatch();
    }
}

function checkMatch() {
    const left = leftSelected;
    const right = rightSelected;
    
    // Lock selections temporarily
    leftSelected = null;
    rightSelected = null;

    left.element.classList.remove('selected');
    right.element.classList.remove('selected');

    if (left.id === right.id) {
        // Correct
        score.correct++;
        score.matchedPairs++;
        
        left.element.classList.add('correct');
        right.element.classList.add('correct');
        
        updateScoreBoard();
        checkWinCondition();
    } else {
        // Error
        score.error++;
        
        left.element.classList.add('error');
        right.element.classList.add('error');
        
        updateScoreBoard();

        // Remove error class after animation
        setTimeout(() => {
            left.element.classList.remove('error');
            right.element.classList.remove('error');
        }, 500);
    }
}

function updateScoreBoard() {
    document.getElementById('score-total').innerText = score.total;
    document.getElementById('score-correct').innerText = score.correct;
    document.getElementById('score-error').innerText = score.error;
}

function checkWinCondition() {
    if (score.matchedPairs === score.total) {
        clearInterval(timerInterval);
        
        const timeElapsedSecs = Math.floor((Date.now() - gameStartTime) / 1000);
        
        const bestKey = `nihongoMatchBestTime_${currentFilterType}`;
        const storedBest = localStorage.getItem(bestKey);
        
        if (storedBest === null || timeElapsedSecs < parseInt(storedBest, 10)) {
            localStorage.setItem(bestKey, timeElapsedSecs);
            updateBestTimeDisplay();
        }

        setTimeout(showResultModal, 600);
    }
}

// --- Modal & Navigation ---
function showResultModal() {
    document.getElementById('final-total').innerText = score.total;
    document.getElementById('final-correct').innerText = score.correct;
    document.getElementById('final-error').innerText = score.error;
    
    // Calculate Time
    const timeElapsedSecs = Math.floor((Date.now() - gameStartTime) / 1000);
    const mins = Math.floor(timeElapsedSecs / 60).toString().padStart(2, '0');
    const secs = (timeElapsedSecs % 60).toString().padStart(2, '0');
    document.getElementById('final-time').innerText = `${mins}:${secs}`;
    
    const accuracy = score.correct > 0 ? Math.round((score.total / (score.total + score.error)) * 100) : 0;
    document.getElementById('final-accuracy').innerText = `${accuracy}%`;

    modal.classList.add('active');
}

window.restartGame = () => {
    modal.classList.remove('active');
    setTimeout(() => {
        startGame();
    }, 300);
};

window.goSetup = () => {
    modal.classList.remove('active');
    if (timerInterval) clearInterval(timerInterval);
    setTimeout(() => {
        screens.game.classList.remove('active');
        screens.setup.classList.add('active');
    }, 300);
};
