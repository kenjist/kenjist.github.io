// --- State Management ---
let database = [];
let currentChallenge = [];
let score = { total: 0, correct: 0, error: 0, matchedPairs: 0 };
let gameStartTime = null;
let timerInterval = null;
let currentGameMode = null; // 'association' or 'translation'

// Association state
let leftSelected = null;
let rightSelected = null;

// Translation state
let currentTransItem = null;
let currentTransDuration = 0;
let currentTransIndex = 0;
let currentTransSubMode = 'max';
let transOverallStartTime = null;
let transPerItemTimerInterval = null;
let transPerItemTimeRemaining = 0;

let currentFilterType = 'todos';

function formatTime(secs) {
    if (secs === null || secs === undefined) return "--:--";
    const s = parseInt(secs, 10);
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const rs = (s % 60).toString().padStart(2, '0');
    return `${m}:${rs}`;
}

const getVal = (id, def) => document.getElementById(id) ? document.getElementById(id).value : def;

function updateBestTimeDisplay() {
    // Association Best Times
    const aItemCount = getVal('item-count', 'todos');
    const aLeftCol = getVal('left-column', 'original').toLowerCase();
    const aRightCol = getVal('right-column', 'portugues').toLowerCase();
    const assocPrefix = `nihongoAssocBest_${aItemCount}_${aLeftCol}_${aRightCol}_`;

    const aTodosTime = localStorage.getItem(assocPrefix + 'todos');
    const aPalavraTime = localStorage.getItem(assocPrefix + 'palavra');
    const aFraseTime = localStorage.getItem(assocPrefix + 'frase');

    const homeTodos = document.getElementById('best-time-todos');
    if (homeTodos) homeTodos.innerText = formatTime(aTodosTime);
    
    const homePalavra = document.getElementById('best-time-palavra');
    if (homePalavra) homePalavra.innerText = formatTime(aPalavraTime);
    
    const homeFrase = document.getElementById('best-time-frase');
    if (homeFrase) homeFrase.innerText = formatTime(aFraseTime);

    const assocFilter = getVal('filter-type', 'todos');
    ['todos', 'palavra', 'frase'].forEach(type => {
        const row = document.getElementById(`assoc-record-row-${type}`);
        if (row) {
            row.style.opacity = type === assocFilter ? '1' : '0.3';
            row.style.fontWeight = type === assocFilter ? 'bold' : 'normal';
        }
    });

    const gameEl = document.getElementById('best-time');
    if (gameEl && currentGameMode === 'association') {
        const currentTime = localStorage.getItem(`${assocPrefix}${currentFilterType}`);
        gameEl.innerText = formatTime(currentTime);
    }

    // Translation Best Scores (Records)
    const isFast = currentTransSubMode === 'fast';
    const tDuration = getVal('trans-duration', '5');
    const tItemCount = getVal('trans-item-count', 'todos');
    const tMaxTime = getVal('trans-max-time', '0');
    const tLeftCol = getVal('trans-left-column', 'original').toLowerCase();
    const tRightCol = getVal('trans-right-column', 'portugues').toLowerCase();
    
    const modePrefix = isFast 
        ? `nihongoTransFast_${tItemCount}_${tMaxTime}_${tLeftCol}_${tRightCol}_` 
        : `nihongoTransBest_${tDuration}_${tLeftCol}_${tRightCol}_`;
        
    const defaultDisplay = isFast ? '--:--' : '0';

    const transTodos = localStorage.getItem(modePrefix + 'todos') || defaultDisplay;
    const transPalavra = localStorage.getItem(modePrefix + 'palavra') || defaultDisplay;
    const transFrase = localStorage.getItem(modePrefix + 'frase') || defaultDisplay;

    const tHomeTodos = document.getElementById('trans-best-todos');
    if (tHomeTodos) tHomeTodos.innerText = transTodos;
    const tHomePalavra = document.getElementById('trans-best-palavra');
    if (tHomePalavra) tHomePalavra.innerText = transPalavra;
    const tHomeFrase = document.getElementById('trans-best-frase');
    if (tHomeFrase) tHomeFrase.innerText = transFrase;

    const transFilter = getVal('trans-filter-type', 'todos');
    ['todos', 'palavra', 'frase'].forEach(type => {
        const row = document.getElementById(`trans-record-row-${type}`);
        if (row) {
            row.style.opacity = type === transFilter ? '1' : '0.3';
            row.style.fontWeight = type === transFilter ? 'bold' : 'normal';
        }
    });

    const tGameEl = document.getElementById('trans-best');
    if (tGameEl && currentGameMode === 'translation') {
        const currentScore = localStorage.getItem(`${modePrefix}${currentFilterType}`) || defaultDisplay;
        tGameEl.innerText = currentScore;
    }
}

// --- DOM Elements ---
const screens = {
    mainMenu: document.getElementById('main-menu-screen'),
    setupAssoc: document.getElementById('setup-association-screen'),
    setupTrans: document.getElementById('setup-translation-screen'),
    gameAssoc: document.getElementById('game-screen'),
    gameTrans: document.getElementById('game-translation-screen')
};
const modal = document.getElementById('result-modal');

// Menu Buttons
const btnMenuAssoc = document.getElementById('btn-menu-association');
const btnMenuTransMax = document.getElementById('btn-menu-trans-max');
const btnMenuTransFast = document.getElementById('btn-menu-trans-fast');

// Setup Buttons
const btnStartAssoc = document.getElementById('btn-start');
const btnStartTrans = document.getElementById('btn-start-trans');

// Translation game elements
const transDisplay = document.getElementById('trans-display');
const transInput = document.getElementById('trans-input');
const btnTransSubmit = document.getElementById('btn-trans-submit');

const dbStatus = document.getElementById('db-status');
const fileInput = document.getElementById('file-upload');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    updateBestTimeDisplay();
    loadDatabaseFromStorage();
    
    if (fileInput) fileInput.addEventListener('change', handleFileUpload);
    if (btnStartAssoc) btnStartAssoc.addEventListener('click', () => startAssociationGame());
    if (btnStartTrans) btnStartTrans.addEventListener('click', () => startTranslationGame());

    if (btnTransSubmit) btnTransSubmit.addEventListener('click', submitTranslationAnswer);
    if (transInput) transInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') submitTranslationAnswer();
    });

    const leftSelect = document.getElementById('left-column');
    const rightSelect = document.getElementById('right-column');
    if (leftSelect && rightSelect) {
        leftSelect.addEventListener('change', () => {
            updateColumnsOptions('left-column', 'right-column');
            updateBestTimeDisplay();
        });
        rightSelect.addEventListener('change', () => {
            updateColumnsOptions('left-column', 'right-column');
            updateBestTimeDisplay();
        });
        updateColumnsOptions('left-column', 'right-column');
    }

    const tLeftSelect = document.getElementById('trans-left-column');
    const tRightSelect = document.getElementById('trans-right-column');
    if (tLeftSelect && tRightSelect) {
        tLeftSelect.addEventListener('change', () => {
            updateColumnsOptions('trans-left-column', 'trans-right-column');
            updateBestTimeDisplay();
        });
        tRightSelect.addEventListener('change', () => {
            updateColumnsOptions('trans-left-column', 'trans-right-column');
            updateBestTimeDisplay();
        });
        updateColumnsOptions('trans-left-column', 'trans-right-column');
    }

    const simpleFields = ['item-count', 'trans-duration', 'trans-item-count', 'trans-max-time', 'filter-type', 'trans-filter-type'];
    simpleFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', updateBestTimeDisplay);
    });
});

function updateColumnsOptions(leftId, rightId) {
    const leftSelect = document.getElementById(leftId);
    const rightSelect = document.getElementById(rightId);
    
    if (!leftSelect || !rightSelect) return;

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

// --- Navigation ---
function switchScreen(screenName) {
    Object.values(screens).forEach(screen => {
        if (screen) screen.classList.remove('active');
    });
    if (screens[screenName]) screens[screenName].classList.add('active');
}

window.showMainMenu = () => {
    if (timerInterval) clearInterval(timerInterval);
    modal.classList.remove('active');
    const subtitle = document.getElementById('app-subtitle');
    if (subtitle) subtitle.innerText = "";
    switchScreen('mainMenu');
};

window.showAssociationSetup = () => {
    const subtitle = document.getElementById('app-subtitle');
    if (subtitle) subtitle.innerText = "翻訳マッチ (Honyaku Match)";
    switchScreen('setupAssoc');
};

window.showTranslationSetup = (mode = 'max') => {
    const subtitle = document.getElementById('app-subtitle');
    if (subtitle) {
        subtitle.innerText = mode === 'max' 
            ? "翻訳マラソン (Honyaku Marathon)" 
            : "翻訳スピード (Honyaku Speed)";
    }
    
    currentTransSubMode = mode;
    
    window.toggleTransMode();
    switchScreen('setupTrans');
};

window.toggleTransMode = () => {
    const isFast = currentTransSubMode === 'fast';
    const durationSelect = document.getElementById('trans-duration');
    const maxTimeSelect = document.getElementById('trans-max-time');
    const timeLabel = document.getElementById('trans-time-label');
    const itemCountRow = document.getElementById('trans-item-count-row');
    const recordTitle = document.getElementById('trans-record-title');

    if (isFast) {
        durationSelect.style.display = 'none';
        maxTimeSelect.style.display = '';
        timeLabel.innerText = "Tempo Máximo para cada Item";
        itemCountRow.style.display = '';
        recordTitle.innerText = "Menor Tempo";
    } else {
        durationSelect.style.display = '';
        maxTimeSelect.style.display = 'none';
        timeLabel.innerText = "Duração do Desafio";
        itemCountRow.style.display = 'none';
        recordTitle.innerText = "Recorde de Acertos";
    }
    updateBestTimeDisplay();
};

// --- Database Logic ---
function loadDatabaseFromStorage() {
    const saved = localStorage.getItem('nihongoMatchDB');
    if (saved) {
        try {
            database = JSON.parse(saved);
            updateStatusText(`Base carregada: ${database.length} itens encontrados.`);
            enableMenuButtons();
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
                enableMenuButtons();
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
    if (dbStatus) {
        dbStatus.innerText = msg;
        dbStatus.style.color = isError ? 'var(--danger)' : 'var(--success)';
    }
}

function enableMenuButtons() {
    if (btnMenuAssoc) btnMenuAssoc.disabled = false;
    if (btnMenuTransMax) btnMenuTransMax.disabled = false;
    if (btnMenuTransFast) btnMenuTransFast.disabled = false;
    if (btnStartAssoc) btnStartAssoc.disabled = false;
    if (btnStartTrans) btnStartTrans.disabled = false;
}

// --- Helpers ---
function shuffleArray(array) {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
}

// ==========================================
// GAME 1: ASSOCIATION
// ==========================================
function startAssociationGame() {
    currentGameMode = 'association';
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
    updateAssocScoreBoard();

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

    switchScreen('gameAssoc');
    setTimeout(syncBoxHeights, 50);
}

function updateAssocScoreBoard() {
    document.getElementById('score-total').innerText = score.total;
    document.getElementById('score-correct').innerText = score.correct;
    document.getElementById('score-error').innerText = score.error;
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
    if (!container) return;
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
    if (element.classList.contains('correct')) return;

    if (side === 'left') {
        if (leftSelected && leftSelected.element === element) {
            element.classList.remove('selected');
            leftSelected = null;
            return;
        }
        if (leftSelected) leftSelected.element.classList.remove('selected');
        leftSelected = { id, element };
        element.classList.add('selected');
    } else {
        if (rightSelected && rightSelected.element === element) {
            element.classList.remove('selected');
            rightSelected = null;
            return;
        }
        if (rightSelected) rightSelected.element.classList.remove('selected');
        rightSelected = { id, element };
        element.classList.add('selected');
    }

    if (leftSelected && rightSelected) {
        checkMatch();
    }
}

function checkMatch() {
    const left = leftSelected;
    const right = rightSelected;
    
    leftSelected = null;
    rightSelected = null;

    left.element.classList.remove('selected');
    right.element.classList.remove('selected');

    if (left.id === right.id) {
        score.correct++;
        score.matchedPairs++;
        
        left.element.classList.add('correct');
        right.element.classList.add('correct');
        
        updateAssocScoreBoard();
        checkAssocWinCondition();
    } else {
        score.error++;
        left.element.classList.add('error');
        right.element.classList.add('error');
        
        updateAssocScoreBoard();

        setTimeout(() => {
            left.element.classList.remove('error');
            right.element.classList.remove('error');
        }, 500);
    }
}

function checkAssocWinCondition() {
    if (score.matchedPairs === score.total) {
        clearInterval(timerInterval);
        const timeElapsedSecs = Math.floor((Date.now() - gameStartTime) / 1000);
        
        const aItemCount = getVal('item-count', 'todos');
        const aLeftCol = getVal('left-column', 'original').toLowerCase();
        const aRightCol = getVal('right-column', 'portugues').toLowerCase();
        const assocPrefix = `nihongoAssocBest_${aItemCount}_${aLeftCol}_${aRightCol}_`;
        const bestKey = `${assocPrefix}${currentFilterType}`;
        
        const storedBest = localStorage.getItem(bestKey);
        
        if (storedBest === null || timeElapsedSecs < parseInt(storedBest, 10)) {
            localStorage.setItem(bestKey, timeElapsedSecs);
            updateBestTimeDisplay();
        }

        setTimeout(() => showResultModal(timeElapsedSecs), 600);
    }
}


// ==========================================
// GAME 2: TRANSLATION
// ==========================================
function startTranslationGame() {
    currentGameMode = 'translation';
    const filterType = document.getElementById('trans-filter-type').value;
    const isFast = currentTransSubMode === 'fast';

    currentFilterType = filterType;
    updateBestTimeDisplay();

    if (filterType === 'todos') {
        currentChallenge = [...database];
    } else {
        currentChallenge = database.filter(item => item.type === filterType);
    }

    if (currentChallenge.length === 0) {
        alert("Nenhum item encontrado com esse filtro.");
        return;
    }

    currentChallenge = shuffleArray(currentChallenge);
    
    if (isFast) {
        const itemCountStr = document.getElementById('trans-item-count').value;
        const targetCount = itemCountStr === 'todos' ? currentChallenge.length : parseInt(itemCountStr, 10);
        score = { total: targetCount, correct: 0, error: 0, matchedPairs: 0 };
    } else {
        score = { total: 0, correct: 0, error: 0, matchedPairs: 0 };
    }

    currentTransIndex = 0;
    updateTransScoreBoard();
    
    const transInput = document.getElementById('trans-input');
    const btnTransSubmit = document.getElementById('btn-trans-submit');
    transInput.disabled = false;
    transInput.value = '';
    btnTransSubmit.disabled = false;

    if (timerInterval) clearInterval(timerInterval);
    if (transPerItemTimerInterval) clearInterval(transPerItemTimerInterval);
    
    transOverallStartTime = Date.now();

    const container = document.getElementById('trans-item-timer-container');
    const bar = document.getElementById('trans-item-timer-bar');

    if (isFast) {
        document.getElementById('trans-live-time').innerText = "00:00";
        timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - transOverallStartTime) / 1000);
            updateTransTimerDisplay(elapsed);
        }, 1000);
    } else {
        const durationMins = parseInt(document.getElementById('trans-duration').value, 10);
        currentTransDuration = durationMins * 60;
        updateTransTimerDisplay(currentTransDuration);
        
        container.style.display = 'block';
        bar.style.transition = 'none';
        bar.style.width = '100%';
        
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                bar.style.transition = `width ${currentTransDuration}s linear`;
                bar.style.width = '0%';
            });
        });
        
        let timeRemaining = currentTransDuration;
        timerInterval = setInterval(() => {
            timeRemaining--;
            if (timeRemaining <= 0) {
                document.getElementById('trans-live-time').innerText = "00:00";
                endTranslationGame();
            } else {
                updateTransTimerDisplay(timeRemaining);
            }
        }, 1000);
    }

    switchScreen('gameTrans');
    showNextTranslationItem();
}

function updateTransTimerDisplay(secs) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    document.getElementById('trans-live-time').innerText = `${m}:${s}`;
}

function updateTransScoreBoard() {
    document.getElementById('trans-score-total').innerText = score.total;
    document.getElementById('trans-score-correct').innerText = score.correct;
    document.getElementById('trans-score-error').innerText = score.error;
}

function showNextTranslationItem() {
    if (currentTransSubMode === 'fast') {
        if (score.correct >= score.total) {
            endTranslationGame();
            return;
        }
    }
    
    // Reshuffle if exhausted to allow continuous play
    if (currentTransIndex >= currentChallenge.length) {
        currentChallenge = shuffleArray([...currentChallenge]);
        currentTransIndex = 0;
    }

    const item = currentChallenge[currentTransIndex];
    const leftColType = document.getElementById('trans-left-column').value.toLowerCase();
    
    const transDisplay = document.getElementById('trans-display');
    const isJp = leftColType === 'original';
    transDisplay.className = `translation-display ${isJp ? 'jp-text' : ''}`;
    transDisplay.innerText = item[leftColType];
    
    const transInput = document.getElementById('trans-input');
    transInput.value = '';
    transInput.focus();

    const container = document.getElementById('trans-item-timer-container');
    const bar = document.getElementById('trans-item-timer-bar');
    
    if (transPerItemTimerInterval) clearInterval(transPerItemTimerInterval);
    
    if (currentTransSubMode === 'fast') {
        const maxSecs = parseInt(document.getElementById('trans-max-time').value, 10);
        if (maxSecs > 0) {
            container.style.display = 'block';
            bar.style.transition = 'none';
            bar.style.width = '100%';
            
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    bar.style.transition = `width ${maxSecs}s linear`;
                    bar.style.width = '0%';
                });
            });
            
            transPerItemTimeRemaining = maxSecs;
            transPerItemTimerInterval = setInterval(() => {
                transPerItemTimeRemaining--;
                if (transPerItemTimeRemaining <= 0) {
                    clearInterval(transPerItemTimerInterval);
                    handleTranslationError();
                }
            }, 1000);
        } else {
            container.style.display = 'none';
        }
    }
}

function handleTranslationError() {
    score.error++;
    const transDisplay = document.getElementById('trans-display');
    transDisplay.style.borderColor = 'var(--danger)';
    transDisplay.style.boxShadow = '0 0 15px rgba(231, 111, 81, 0.4)';
    updateTransScoreBoard();
    
    setTimeout(() => {
        transDisplay.style.borderColor = 'var(--glass-border)';
        transDisplay.style.boxShadow = 'none';
    }, 300);

    currentTransIndex++;
    showNextTranslationItem();
}

function submitTranslationAnswer() {
    const transInput = document.getElementById('trans-input');
    const userInputRaw = transInput.value;
    if (userInputRaw.trim() === '') return;

    const item = currentChallenge[currentTransIndex];
    const rightColType = document.getElementById('trans-right-column').value.toLowerCase();
    
    const normalizeStr = (s) => s ? s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : '';
    
    const userInput = normalizeStr(userInputRaw);
    const correctAnswers = (item[rightColType] || '').split(/[,\/]/).map(normalizeStr);

    let isCorrect = false;
    
    // Tratamento para evitar que apenas 1 letra seja considerada correta, a menos que seja um caractere japonês
    const isJapaneseChar = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]/.test(userInputRaw);
    if (userInput.length <= 1 && !isJapaneseChar) {
        isCorrect = false;
    } else {
        if (rightColType === 'portugues') {
            isCorrect = correctAnswers.some(ans => ans.includes(userInput));
        } else {
            isCorrect = correctAnswers.includes(userInput);
        }
    }

    const transDisplay = document.getElementById('trans-display');
    if (isCorrect) {
        score.correct++;
        transDisplay.style.borderColor = 'var(--success)';
        transDisplay.style.boxShadow = '0 0 15px rgba(42, 157, 143, 0.4)';
        updateTransScoreBoard();
        
        setTimeout(() => {
            transDisplay.style.borderColor = 'var(--glass-border)';
            transDisplay.style.boxShadow = 'none';
        }, 300);
        
        currentTransIndex++;
        showNextTranslationItem();
    } else {
        handleTranslationError();
    }
}

function endTranslationGame() {
    if (timerInterval) clearInterval(timerInterval);
    if (transPerItemTimerInterval) clearInterval(transPerItemTimerInterval);
    
    const bar = document.getElementById('trans-item-timer-bar');
    if (bar) {
        const currentWidth = window.getComputedStyle(bar).width;
        bar.style.transition = 'none';
        bar.style.width = currentWidth;
    }
    
    const transInput = document.getElementById('trans-input');
    const btnTransSubmit = document.getElementById('btn-trans-submit');
    transInput.disabled = true;
    btnTransSubmit.disabled = true;

    let timeElapsedSecs = 0;
    if (currentTransSubMode === 'max') {
        const timeParts = document.getElementById('trans-live-time').innerText.split(':');
        timeElapsedSecs = currentTransDuration - (parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]));
        
        const tDuration = getVal('trans-duration', '5');
        const tLeftCol = getVal('trans-left-column', 'original').toLowerCase();
        const tRightCol = getVal('trans-right-column', 'portugues').toLowerCase();
        const modePrefix = `nihongoTransBest_${tDuration}_${tLeftCol}_${tRightCol}_`;
        const bestKey = `${modePrefix}${currentFilterType}`;
        
        const storedBest = parseInt(localStorage.getItem(bestKey) || '0', 10);
        
        if (score.correct > storedBest) {
            localStorage.setItem(bestKey, score.correct);
            updateBestTimeDisplay();
        }
    } else {
        timeElapsedSecs = Math.floor((Date.now() - transOverallStartTime) / 1000);
        const totalItemsPlayed = score.correct + score.error;
        const formattedTime = document.getElementById('trans-live-time').innerText;
        const recordValue = `${formattedTime} (${totalItemsPlayed} itens)`;
        
        const tItemCount = getVal('trans-item-count', 'todos');
        const tMaxTime = getVal('trans-max-time', '0');
        const tLeftCol = getVal('trans-left-column', 'original').toLowerCase();
        const tRightCol = getVal('trans-right-column', 'portugues').toLowerCase();
        const modePrefix = `nihongoTransFast_${tItemCount}_${tMaxTime}_${tLeftCol}_${tRightCol}_`;
        const bestKey = `${modePrefix}${currentFilterType}`;
        
        const storedBest = localStorage.getItem(bestKey);
        
        let isNewRecord = false;
        if (!storedBest || storedBest === '--:--') {
            isNewRecord = true;
        } else {
            const parts = storedBest.split(' ')[0].split(':');
            const storedSecs = parseInt(parts[0])*60 + parseInt(parts[1]);
            if (timeElapsedSecs < storedSecs) {
                isNewRecord = true;
            }
        }
        
        if (isNewRecord) {
            localStorage.setItem(bestKey, recordValue);
            updateBestTimeDisplay();
        }
    }

    setTimeout(() => showResultModal(timeElapsedSecs), 500);
}


// ==========================================
// SHARED MODAL LOGIC
// ==========================================
function showResultModal(timeElapsedSecs) {
    document.getElementById('final-total').innerText = score.total;
    document.getElementById('final-correct').innerText = score.correct;
    document.getElementById('final-error').innerText = score.error;
    
    // Calculate Time
    const mins = Math.floor(timeElapsedSecs / 60).toString().padStart(2, '0');
    const secs = (timeElapsedSecs % 60).toString().padStart(2, '0');
    document.getElementById('final-time').innerText = `${mins}:${secs}`;
    
    const totalAttempted = score.correct + score.error;
    const accuracy = totalAttempted > 0 ? Math.round((score.correct / totalAttempted) * 100) : 0;
    document.getElementById('final-accuracy').innerText = `${accuracy}%`;

    modal.classList.add('active');
}

window.restartGame = () => {
    modal.classList.remove('active');
    setTimeout(() => {
        if (currentGameMode === 'association') {
            startAssociationGame();
        } else {
            startTranslationGame();
        }
    }, 300);
};

window.restartTranslationGame = () => {
    startTranslationGame();
};

window.goSetup = () => {
    modal.classList.remove('active');
    if (timerInterval) clearInterval(timerInterval);
    setTimeout(() => {
        if (currentGameMode === 'association') {
            showAssociationSetup();
        } else {
            showTranslationSetup(currentTransSubMode);
        }
    }, 300);
};
