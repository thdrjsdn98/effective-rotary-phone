var currentSubPage = 0;
var totalSubPages = 22;
var bookmarks = JSON.parse(localStorage.getItem('user_bookmarks') || '[]');
var completes = JSON.parse(localStorage.getItem('user_completes') || '[]');
var currentFontSize = parseInt(localStorage.getItem('user_font_size') || '14', 10);
var memorizeTimerSec = parseInt(localStorage.getItem('user_timer_sec') || '3', 10);

var quizAnswerState = {};
var filterWrongModes = {};
var isChosungMode = false;
var originalElementsData = [];
var wrongNotes = JSON.parse(localStorage.getItem('user_wrong_notes') || '{}');
var lastSearchQuery = "";

var studyQuotes = [
    { text: "이해하지 못한 공식은 반드시 두 번째 회독에서 걸린다. 오늘 헷갈리면 오늘 정리하자.", ref: "회로이론 학습 습관" },
    { text: "공식을 외우지 말고 유도 과정을 한 번은 손으로 따라가 보자. 그게 진짜 암기다.", ref: "전기기사 합격 전략" },
    { text: "필기는 5과목 중 40점 미만이 하나라도 있으면 과락이다. 약한 과목부터 채우자.", ref: "합격 기준 안내" },
    { text: "오늘 틀린 문제는 내일의 실력이다. 오답노트를 피하지 말자.", ref: "학습 루틴" },
    { text: "회로이론은 손으로 계산해봐야 느는 과목이다. 눈으로만 읽지 말자.", ref: "학습 팁" },
    { text: "작은 진도라도 매일 쌓이면 시험 전날 여유가 생긴다.", ref: "꾸준함의 힘" },
    { text: "복소수와 페이저에 익숙해지면 교류 회로가 훨씬 쉬워진다.", ref: "핵심 포인트" },
    { text: "기출을 반복해서 풀다 보면 출제 패턴이 보인다.", ref: "기출 활용법" },
    { text: "모르는 건 부끄러운 게 아니라 아직 안 외운 것뿐이다.", ref: "마음가짐" },
    { text: "시험 직전 벼락치기보다 매일 30분이 더 오래 남는다.", ref: "학습 루틴" },
    { text: "임피던스는 저항의 확장판일 뿐이다. 겁먹지 말자.", ref: "핵심 포인트" },
    { text: "포기하고 싶을 때가 합격에 가장 가까워진 때일 수 있다.", ref: "응원의 한마디" }
];

document.addEventListener("DOMContentLoaded", function () {
    loadSavedStates();
    setupMemorizeClickEvents();
    updateProgress();
    calculateDDay();
    renderHourlyQuote();
    setupMiniEnterKeys();
    renderWrongNotes();

    var searchResults = document.getElementById("search-results");
    if (searchResults) {
        searchResults.addEventListener('mousedown', function (e) {
            if (e.target === searchResults) e.preventDefault();
        });
    }
});

/* ===================== 상단 도구 패널 ===================== */
function toggleTopPanel() {
    var content = document.getElementById("collapsible-control-content");
    var btnText = document.getElementById("panel-toggle-btn-text");
    var isCollapsed = content.classList.toggle("collapsed");
    if (isCollapsed) {
        btnText.innerText = "▼ 메뉴 펼치기";
        localStorage.setItem("user_top_panel_collapsed", "true");
    } else {
        btnText.innerText = "▲ 메뉴 접기";
        localStorage.setItem("user_top_panel_collapsed", "false");
    }
}

function calculateDDay() {
    var saved = localStorage.getItem("user_exam_date");
    var badgeEl = document.getElementById("exam-dday-badge");
    if (!badgeEl) return;
    if (!saved) {
        badgeEl.innerText = "시험일 미설정 (⚙️ 학습 도구에서 설정)";
        return;
    }
    var targetDate = new Date(saved + "T00:00:00+09:00");
    var now = new Date();
    var diff = targetDate.getTime() - now.getTime();
    var days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    var text = "";
    if (days > 0) text = "D-" + days;
    else if (days === 0) text = "D-DAY 🔥";
    else text = "D+" + Math.abs(days);
    badgeEl.innerText = "필기시험 " + text;
}

function setExamDate() {
    var input = document.getElementById("exam-date-input");
    if (!input || !input.value) return;
    localStorage.setItem("user_exam_date", input.value);
    calculateDDay();
}

function renderHourlyQuote() {
    var now = new Date();
    var currentHourKey = now.getFullYear() + "-" + (now.getMonth() + 1) + "-" + now.getDate() + "-" + now.getHours();
    var savedHourKey = localStorage.getItem("last_quote_hour_key");
    var savedQuoteIndex = localStorage.getItem("current_quote_index");
    var chosenIndex = 0;

    if (savedHourKey === currentHourKey && savedQuoteIndex !== null) {
        chosenIndex = parseInt(savedQuoteIndex, 10);
    } else {
        chosenIndex = Math.floor(Math.random() * studyQuotes.length);
        localStorage.setItem("last_quote_hour_key", currentHourKey);
        localStorage.setItem("current_quote_index", chosenIndex);
    }
    var q = studyQuotes[chosenIndex] || studyQuotes[0];
    var box = document.getElementById("daily-quote-box");
    if (box) box.innerHTML = '"' + q.text + '" <span>- ' + q.ref + '</span>';
}

function applyFontSize() {
    document.documentElement.style.setProperty('--base-font-size', currentFontSize + 'px');
    localStorage.setItem('user_font_size', currentFontSize);
}
function changeFontSize(delta) {
    currentFontSize += delta;
    if (currentFontSize < 11) currentFontSize = 11;
    if (currentFontSize > 22) currentFontSize = 22;
    applyFontSize();
}
function resetFontSize() { currentFontSize = 14; applyFontSize(); }

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    var isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('user_dark_mode', isDark);
    document.getElementById('darkmode-toggle-btn').innerText = isDark ? "☀️ 주간" : "🌙 야간";
}

function toggleMemorizeMode() {
    if (isChosungMode) toggleChosungMode();
    document.body.classList.toggle('memorize-mode');
    var isMemo = document.body.classList.contains('memorize-mode');
    var btn = document.getElementById('memorize-toggle-btn');
    btn.innerText = isMemo ? "👁️ 암기 ON" : "🙈 암기 OFF";
    btn.classList.toggle('active', isMemo);
    document.getElementById('timer-control-bar').style.display = isMemo ? "flex" : "none";
    updateTimerUI();
}

function getChosung(str) {
    var cho = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
    var result = "";
    for (var i = 0; i < str.length; i++) {
        var code = str.charCodeAt(i) - 44032;
        if (code >= 0 && code <= 11171) result += cho[Math.floor(code / 588)];
        else result += str.charAt(i);
    }
    return result;
}

function toggleChosungMode() {
    if (document.body.classList.contains('memorize-mode')) toggleMemorizeMode();
    isChosungMode = !isChosungMode;
    document.body.classList.toggle('chosung-mode', isChosungMode);
    var btn = document.getElementById('chosung-toggle-btn');
    btn.classList.toggle('active', isChosungMode);
    btn.innerText = isChosungMode ? "💡 원문 복원" : "💡 초성 퀴즈";

    var targets = document.querySelectorAll('.red, .blue, .yellow, .mint, .orange, .highlight');
    if (isChosungMode) {
        originalElementsData = [];
        targets.forEach(function (el, idx) {
            originalElementsData[idx] = el.innerText;
            el.innerText = getChosung(el.innerText);
        });
    } else {
        targets.forEach(function (el, idx) {
            if (originalElementsData[idx] !== undefined) el.innerText = originalElementsData[idx];
        });
    }
}

function setTimerSec(sec) {
    memorizeTimerSec = sec;
    localStorage.setItem('user_timer_sec', sec);
    updateTimerUI();
}
function updateTimerUI() {
    document.getElementById('timer-btn-3').classList.toggle('active', memorizeTimerSec === 3);
    document.getElementById('timer-btn-5').classList.toggle('active', memorizeTimerSec === 5);
    document.getElementById('timer-btn-0').classList.toggle('active', memorizeTimerSec === 0);
    if (memorizeTimerSec === 0) document.body.classList.add('press-mode');
    else document.body.classList.remove('press-mode');
}

function setupMemorizeClickEvents() {
    var targets = document.querySelectorAll('.red, .blue, .yellow, .mint, .orange, .highlight');
    targets.forEach(function (el) {
        el.addEventListener('click', function (e) {
            if (!document.body.classList.contains('memorize-mode')) return;
            if (memorizeTimerSec === 0) return;
            if (el.dataset.timerId) clearTimeout(parseInt(el.dataset.timerId, 10));
            el.classList.add('revealed');
            var timerId = setTimeout(function () {
                el.classList.remove('revealed');
                delete el.dataset.timerId;
            }, memorizeTimerSec * 1000);
            el.dataset.timerId = timerId;
        });
    });
}

/* ===================== 메모 / 백업 ===================== */
function savePageMemo(pageNum) {
    var memoText = document.getElementById("memo-input-" + pageNum).value;
    localStorage.setItem("user_memo_page_" + pageNum, memoText);
}

async function exportUserData() {
    var backupData = { bookmarks: bookmarks, completes: completes, wrongNotes: wrongNotes, memos: {}, examDate: localStorage.getItem("user_exam_date") || "" };
    for (var i = 1; i <= totalSubPages; i++) {
        var memo = localStorage.getItem("user_memo_page_" + i);
        if (memo) backupData.memos[i] = memo;
    }
    var now = new Date();
    var pad = function (n) { return String(n).padStart(2, '0'); };
    var timestamp = String(now.getFullYear()).slice(2) + pad(now.getMonth() + 1) + pad(now.getDate()) + pad(now.getHours()) + pad(now.getMinutes());
    var filename = "전기기사_회로이론_백업_" + timestamp + ".json";
    var jsonStr = JSON.stringify(backupData, null, 2);

    if (window.showSaveFilePicker) {
        try {
            var handle = await window.showSaveFilePicker({ suggestedName: filename, types: [{ description: 'JSON 백업 파일', accept: { 'application/json': ['.json'] } }] });
            var writable = await handle.createWritable();
            await writable.write(jsonStr);
            await writable.close();
            alert("💾 백업 파일이 저장되었습니다!");
        } catch (err) {
            if (err && err.name === 'AbortError') return;
            alert("❌ 백업 저장 중 오류가 발생했습니다.");
        }
        return;
    }
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonStr);
    var downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    alert("💾 학습 진도와 오답노트가 백업 파일로 다운로드되었습니다!");
}

function importUserData(event) {
    var file = event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
        try {
            var data = JSON.parse(e.target.result);
            if (data.bookmarks) localStorage.setItem('user_bookmarks', JSON.stringify(data.bookmarks));
            if (data.completes) localStorage.setItem('user_completes', JSON.stringify(data.completes));
            if (data.wrongNotes) localStorage.setItem('user_wrong_notes', JSON.stringify(data.wrongNotes));
            if (data.examDate) localStorage.setItem('user_exam_date', data.examDate);
            if (data.memos) {
                for (var key in data.memos) localStorage.setItem("user_memo_page_" + key, data.memos[key]);
            }
            alert("✅ 백업 복원이 완료되었습니다. 새로고침합니다.");
            location.reload();
        } catch (err) {
            alert("❌ 올바른 백업 파일이 아닙니다.");
        }
    };
    reader.readAsText(file);
}

/* ===================== 진도 / 북마크 ===================== */
function updateProgress() {
    var doneCount = completes.length;
    var percent = Math.round((doneCount / totalSubPages) * 100);
    document.getElementById('progress-text').innerText = doneCount + " / " + totalSubPages + " (" + percent + "%)";
    document.getElementById('progress-fill').style.width = percent + "%";
    for (var i = 1; i <= totalSubPages; i++) {
        var doneBadge = document.getElementById("card-done-" + i);
        if (doneBadge) doneBadge.style.display = completes.includes(i) ? "inline-block" : "none";
    }
}

function toggleComplete(pageNum) {
    var chk = document.getElementById("check-page-" + pageNum);
    if (chk.checked) { if (!completes.includes(pageNum)) completes.push(pageNum); }
    else { var idx = completes.indexOf(pageNum); if (idx > -1) completes.splice(idx, 1); }
    localStorage.setItem('user_completes', JSON.stringify(completes));
    updateProgress();
}

function toggleBookmark(pageNum) {
    var index = bookmarks.indexOf(pageNum);
    if (index > -1) bookmarks.splice(index, 1);
    else bookmarks.push(pageNum);
    localStorage.setItem('user_bookmarks', JSON.stringify(bookmarks));
    updateBookmarkUI();
}

function updateBookmarkUI() {
    for (var i = 1; i <= totalSubPages; i++) {
        var btn = document.getElementById("star-btn-" + i);
        var cardStar = document.getElementById("card-star-" + i);
        var isBookmarked = bookmarks.includes(i);
        if (btn) { btn.innerText = isBookmarked ? "★" : "☆"; btn.classList.toggle('active', isBookmarked); }
        if (cardStar) { cardStar.innerText = isBookmarked ? " ★" : ""; cardStar.style.color = "#f59e0b"; }
    }
}

function filterBookmarks() {
    if (bookmarks.length === 0) { alert("등록된 북마크가 없습니다."); return; }
    var cards = document.querySelectorAll("#main-menu-grid .sub-nav-card");
    cards.forEach(function (card, idx) {
        var pageNum = idx + 1;
        card.style.display = bookmarks.includes(pageNum) ? "flex" : "none";
    });
}

/* ===================== 탭 전환 ===================== */
function openTab(evt, tabId) {
    var contents = document.getElementsByClassName("tab-content");
    for (var i = 0; i < contents.length; i++) contents[i].classList.remove("active");
    var btns = document.getElementsByClassName("tab-btn");
    for (var j = 0; j < btns.length; j++) btns[j].classList.remove("active");

    document.getElementById(tabId).classList.add("active");
    if (evt && evt.currentTarget) evt.currentTarget.classList.add("active");

    var dropdownLabel = document.getElementById('tab-dropdown-label');
    if (dropdownLabel) {
        var labelMap = { 'tab-cover': '표지', 'tab-study': '단원학습', 'tab-exam': '랜덤모의고사', 'tab-wrong': '오답노트' };
        dropdownLabel.innerText = labelMap[tabId] || '메뉴';
    }
    var dropdownList = document.getElementById('tab-dropdown-list');
    if (dropdownList) dropdownList.classList.remove('open');

    window.scrollTo({ top: 0, behavior: 'instant' });
}

function toggleTabDropdown() {
    var list = document.getElementById('tab-dropdown-list');
    list.classList.toggle('open');
}

function toggleTabMenuStyle() {
    var isFlat = document.body.classList.toggle('flat-tab-menu');
    localStorage.setItem('user_tab_menu_flat', isFlat);
    var btn = document.getElementById('tab-menu-style-btn');
    btn.innerText = isFlat ? "☰ 탭 메뉴: 일자형" : "▾ 탭 메뉴: 드롭다운형";
}

/* ===================== 단원 서브페이지 ===================== */
function showSubPage(pageNum) {
    currentSubPage = pageNum;
    document.getElementById("sub-page-menu").style.display = "none";
    for (var i = 1; i <= totalSubPages; i++) {
        var page = document.getElementById("sub-page-" + i);
        if (page) page.style.display = "none";
    }
    var targetPage = document.getElementById("sub-page-" + pageNum);
    if (targetPage) targetPage.style.display = "block";
    document.getElementById("page-nav-bar").style.display = "flex";
    updateNavButtons();
    window.scrollTo({ top: 0, behavior: 'instant' });
}

function showSubMenu() {
    currentSubPage = 0;
    for (var i = 1; i <= totalSubPages; i++) {
        var page = document.getElementById("sub-page-" + i);
        if (page) page.style.display = "none";
    }
    var cards = document.querySelectorAll("#main-menu-grid .sub-nav-card");
    cards.forEach(function (card) { card.style.display = "flex"; });
    document.getElementById("sub-page-menu").style.display = "block";
    document.getElementById("page-nav-bar").style.display = "none";
    window.scrollTo({ top: 0, behavior: 'instant' });
}

function prevSubPage() { if (currentSubPage > 1) showSubPage(currentSubPage - 1); }
function nextSubPage() { if (currentSubPage < totalSubPages) showSubPage(currentSubPage + 1); }

function updateNavButtons() {
    document.getElementById("btn-prev").disabled = (currentSubPage <= 1);
    document.getElementById("btn-next").disabled = (currentSubPage >= totalSubPages);
}

/* ===================== 퀴즈 채점 ===================== */
var unitTitles = {
    1: "01. 직류회로의 기초", 2: "02. 회로망 해석법", 3: "03. 정현파 교류의 기초",
    4: "04. 페이저와 임피던스", 5: "05. 교류전력", 6: "06. 공진회로",
    7: "07. 상호유도와 결합회로", 8: "08. 대칭 3상 회로", 9: "09. 비대칭 3상과 대칭좌표법",
    10: "10. 비정현파 교류", 11: "11. 4단자망", 12: "12. 라플라스 변환과 과도현상",
    13: "13. 제어계의 기초", 14: "14. 전달함수", 15: "15. 블록선도와 신호흐름선도",
    16: "16. 과도응답", 17: "17. 정상상태 오차", 18: "18. 근궤적법",
    19: "19. 주파수응답과 보드선도", 20: "20. 안정도 판별법", 21: "21. 상태공간법",
    22: "22. 시퀀스제어와 논리회로"
};

function unitOfQid(qId) {
    var m = qId.match(/^u(\d+)-/);
    if (m) return parseInt(m[1], 10);
    return null;
}

function checkAnswerByText(qId, clickedBtn, correctText) {
    var box = clickedBtn.closest('.quiz-box');
    var resultEl = document.getElementById("q-result-" + qId);
    var explEl = document.getElementById("q-expl-" + qId);
    var isDark = document.body.classList.contains('dark-mode');

    var allBtns = box.querySelectorAll('.opt-btn');
    allBtns.forEach(function (btn) { btn.style.backgroundColor = ""; btn.style.color = ""; btn.style.borderColor = ""; });

    var selectedText = clickedBtn.innerText.trim();
    var isCorrect = (selectedText === correctText.trim());
    quizAnswerState[qId] = isCorrect;

    if (resultEl) resultEl.style.display = "block";
    if (explEl) explEl.style.display = "block";

    var qTitleEl = box.querySelector('.quiz-q-title');
    var qTitle = qTitleEl ? qTitleEl.innerText.trim() : "문제";
    var qExpl = explEl ? explEl.innerText.replace("💡 해설:", "").trim() : "";

    if (isCorrect) {
        if (resultEl) resultEl.innerHTML = "<span style='color:" + (isDark ? "#4ade80" : "#16a34a") + ";'>정답입니다! 🎉</span>";
        clickedBtn.style.backgroundColor = isDark ? "#064e3b" : "#dcfce7";
        clickedBtn.style.color = isDark ? "#86efac" : "#166534";
        if (wrongNotes[qId]) { delete wrongNotes[qId]; localStorage.setItem('user_wrong_notes', JSON.stringify(wrongNotes)); renderWrongNotes(); }
    } else {
        if (resultEl) resultEl.innerHTML = "<span style='color:" + (isDark ? "#f87171" : "#dc2626") + ";'>오답입니다! (정답: " + correctText + ")</span>";
        clickedBtn.style.backgroundColor = isDark ? "#7f1d1d" : "#fee2e2";
        clickedBtn.style.color = isDark ? "#fca5a5" : "#991b1b";

        var unit = unitOfQid(qId);
        wrongNotes[qId] = { id: qId, title: qTitle, correct: correctText.trim(), wrongChoice: selectedText, expl: qExpl, type: unit ? unitTitles[unit] : "랜덤모의고사" };
        localStorage.setItem('user_wrong_notes', JSON.stringify(wrongNotes));
        renderWrongNotes();
    }
    updateUnitScore(qId);
}

function checkAnswerByInput(qId, inputEl, correctAnswers) {
    var box = inputEl.closest('.quiz-box');
    var resultEl = document.getElementById("q-result-" + qId);
    var explEl = document.getElementById("q-expl-" + qId);
    var isDark = document.body.classList.contains('dark-mode');

    var userVal = inputEl.value.trim().toLowerCase().replace(/\s/g, '');
    var isCorrect = correctAnswers.some(function (a) { return a.toLowerCase().replace(/\s/g, '') === userVal; });
    quizAnswerState[qId] = isCorrect;

    if (resultEl) resultEl.style.display = "block";
    if (explEl) explEl.style.display = "block";

    var qTitleEl = box.querySelector('.quiz-q-title');
    var qTitle = qTitleEl ? qTitleEl.innerText.trim() : "문제";
    var qExpl = explEl ? explEl.innerText.replace("💡 해설:", "").trim() : "";
    var correctText = correctAnswers[0];

    if (isCorrect) {
        if (resultEl) resultEl.innerHTML = "<span style='color:" + (isDark ? "#4ade80" : "#16a34a") + ";'>정답입니다! 🎉</span>";
        if (wrongNotes[qId]) { delete wrongNotes[qId]; localStorage.setItem('user_wrong_notes', JSON.stringify(wrongNotes)); renderWrongNotes(); }
    } else {
        if (resultEl) resultEl.innerHTML = "<span style='color:" + (isDark ? "#f87171" : "#dc2626") + ";'>오답입니다! (정답: " + correctText + ")</span>";
        var unit = unitOfQid(qId);
        wrongNotes[qId] = { id: qId, title: qTitle, correct: correctText, wrongChoice: inputEl.value.trim() || "(빈칸)", expl: qExpl, type: unit ? unitTitles[unit] : "랜덤모의고사" };
        localStorage.setItem('user_wrong_notes', JSON.stringify(wrongNotes));
        renderWrongNotes();
    }
    updateUnitScore(qId);
}

function resetAnswer(qId) {
    var box = document.getElementById("box-" + qId);
    if (!box) return;
    delete quizAnswerState[qId];
    var allBtns = box.querySelectorAll('.opt-btn');
    allBtns.forEach(function (btn) { btn.style.backgroundColor = ""; btn.style.color = ""; btn.style.borderColor = ""; });
    var input = box.querySelector('.mini-text-input');
    if (input) input.value = "";
    var resultEl = document.getElementById("q-result-" + qId);
    var explEl = document.getElementById("q-expl-" + qId);
    if (resultEl) { resultEl.style.display = "none"; resultEl.innerHTML = ""; }
    if (explEl) explEl.style.display = "none";
}

function resetAllInContainer(containerId) {
    var wrap = document.getElementById(containerId);
    if (!wrap) return;
    var boxes = wrap.querySelectorAll('.quiz-box');
    boxes.forEach(function (box) { resetAnswer(box.dataset.qid); });
    updateScoreBoard(containerId);
}

function updateUnitScore(qId) {
    var box = document.getElementById("box-" + qId);
    if (!box) return;
    var wrap = box.closest('[data-scoreboard]');
    if (wrap) updateScoreBoard(wrap.id);
}

function updateScoreBoard(containerId) {
    var wrap = document.getElementById(containerId);
    if (!wrap) return;
    var scoreEl = document.getElementById('score-' + containerId);
    if (!scoreEl) return;
    var boxes = wrap.querySelectorAll('.quiz-box');
    var total = boxes.length;
    var correctCount = 0;
    boxes.forEach(function (box) { if (quizAnswerState[box.dataset.qid] === true) correctCount++; });
    var perQ = total > 0 ? Math.round(1000 / total) / 10 : 0;
    scoreEl.innerText = "점수: " + Math.round(correctCount * perQ) + " / 100점 (정답 " + correctCount + " / " + total + "문제)";
}

function shuffleSection(containerId) {
    var wrap = document.getElementById(containerId);
    if (!wrap) return;
    var boxes = Array.from(wrap.children);
    for (var i = boxes.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        wrap.appendChild(boxes[j]);
    }
    alert("🔀 문제 순서가 섞였습니다!");
}

/* ===================== 랜덤 모의고사 ===================== */
function startRandomExam(n) {
    var shuffled = questionPool.slice();
    for (var i = shuffled.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp;
    }
    var picked = shuffled.slice(0, Math.min(n, shuffled.length));

    var html = "";
    picked.forEach(function (q, idx) {
        var num = idx + 1;
        var qid = "exam-" + num;
        var unitLabel = q.unit ? ("[" + q.unit + "단원] ") : "";
        var qtext = "Q" + num + ". " + unitLabel + q.q;

        if (q.type === "mc") {
            var optsHtml = "";
            q.opts.forEach(function (opt) {
                optsHtml += '<button class="font-btn opt-btn" onclick="checkAnswerByText(\'' + qid + '\', this, \'' + q.correct.replace(/'/g, "\\'") + '\')">' + opt + '</button>';
            });
            html += '<div class="box quiz-box" id="box-' + qid + '" data-qid="' + qid + '">' +
                '<button class="font-btn" onclick="resetAnswer(\'' + qid + '\')" style="float:right; font-size:0.75em; padding:4px 8px;">🔄 초기화</button>' +
                '<p class="quiz-q-title" style="font-weight:bold; margin-top:0;">' + qtext + '</p>' +
                '<div class="quiz-opt-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:12px 0;">' + optsHtml + '</div>' +
                '<div id="q-result-' + qid + '" style="margin-top:10px; font-weight:bold; display:none;"></div>' +
                '<div id="q-expl-' + qid + '" class="note" style="display:none;">💡 해설: ' + q.expl + '</div>' +
                '</div>';
        } else {
            var answersLiteral = "[" + q.answers.map(function (a) { return "'" + a.replace(/'/g, "\\'") + "'"; }).join(", ") + "]";
            html += '<div class="box quiz-box" id="box-' + qid + '" data-qid="' + qid + '">' +
                '<button class="font-btn" onclick="resetAnswer(\'' + qid + '\')" style="float:right; font-size:0.75em; padding:4px 8px;">🔄 초기화</button>' +
                '<p class="quiz-q-title" style="font-weight:bold; margin-top:0;">' + qtext + ' <span class="blue_nb" style="font-size:0.8em;">(단답형)</span></p>' +
                '<div style="display:flex; gap:6px; margin:12px 0;">' +
                '<input type="text" id="input-' + qid + '" class="mini-text-input" placeholder="정답 입력" style="max-width:180px;">' +
                '<button class="font-btn" onclick="checkAnswerByInput(\'' + qid + '\', document.getElementById(\'input-' + qid + '\'), ' + answersLiteral + ')">확인</button>' +
                '</div>' +
                '<div id="q-result-' + qid + '" style="margin-top:10px; font-weight:bold; display:none;"></div>' +
                '<div id="q-expl-' + qid + '" class="note" style="display:none;">💡 해설: ' + q.expl + '</div>' +
                '</div>';
        }
    });

    var container = document.getElementById('exam-questions-wrap');
    container.innerHTML = html;
    container.id = 'exam-questions-wrap';
    document.getElementById('exam-select').style.display = 'none';
    document.getElementById('exam-quiz-area').style.display = 'block';

    for (var key in quizAnswerState) { if (key.indexOf('exam-') === 0) delete quizAnswerState[key]; }
    container.setAttribute('data-scoreboard', 'true');
    document.getElementById('exam-questions-wrap').id = 'exam-questions-wrap';

    updateScoreBoard('exam-questions-wrap');
    setupMiniEnterKeys();
    window.scrollTo({ top: 0, behavior: 'instant' });
}

function backToRandomSelect() {
    document.getElementById('exam-select').style.display = 'block';
    document.getElementById('exam-quiz-area').style.display = 'none';
}

/* ===================== 오답노트 ===================== */
function renderWrongNotes() {
    var listEl = document.getElementById('wrong-notes-list');
    var summaryEl = document.getElementById('wrong-unit-summary');
    if (!listEl) return;

    var keys = Object.keys(wrongNotes);
    if (keys.length === 0) {
        listEl.innerHTML = '<div class="box" style="text-align:center; color:var(--text-sub);">🎉 아직 틀린 문제가 없어요! 퀴즈를 풀어보세요.</div>';
        if (summaryEl) summaryEl.innerHTML = "";
        return;
    }

    var byType = {};
    keys.forEach(function (k) {
        var note = wrongNotes[k];
        var t = note.type || "기타";
        byType[t] = (byType[t] || 0) + 1;
    });
    if (summaryEl) {
        var summaryHtml = '<div class="box" style="display:flex; flex-wrap:wrap; gap:6px; padding:12px;">';
        for (var t in byType) {
            summaryHtml += '<span class="dday-capsule" style="background-color:var(--primary-light); color:var(--primary);">' + t + ' ' + byType[t] + '개</span>';
        }
        summaryHtml += '</div>';
        summaryEl.innerHTML = summaryHtml;
    }

    var html = "";
    keys.reverse().forEach(function (k) {
        var note = wrongNotes[k];
        html += '<div class="box wrong-note-card">' +
            '<div style="font-size:0.75em; color:var(--text-sub); margin-bottom:4px;">' + (note.type || "") + '</div>' +
            '<p style="font-weight:bold; margin:0 0 8px 0;">' + note.title + '</p>' +
            '<p style="margin:2px 0; color:#dc2626;">내가 쓴 답: ' + note.wrongChoice + '</p>' +
            '<p style="margin:2px 0; color:#16a34a;">정답: ' + note.correct + '</p>' +
            (note.expl ? '<div class="note" style="margin-top:8px;">💡 ' + note.expl + '</div>' : '') +
            '</div>';
    });
    listEl.innerHTML = html;
}

function clearAllWrongNotes() {
    if (!confirm("오답노트를 전체 비우시겠어요? 되돌릴 수 없습니다.")) return;
    wrongNotes = {};
    localStorage.setItem('user_wrong_notes', '{}');
    renderWrongNotes();
}

/* ===================== 검색 ===================== */
function highlightSearchMatch(pageEl, query) {
    var tieredSelectors = ['span', 'li', 'td', 'p', '.note', '.highlight-box', 'h2'];
    var target = null;
    for (var t = 0; t < tieredSelectors.length && !target; t++) {
        var candidates = pageEl.querySelectorAll(tieredSelectors[t]);
        for (var i = 0; i < candidates.length; i++) {
            if (candidates[i].textContent.toLowerCase().includes(query)) { target = candidates[i]; break; }
        }
    }
    if (target) {
        setTimeout(function () {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.classList.add('search-match-flash');
            setTimeout(function () { target.classList.remove('search-match-flash'); }, 1600);
        }, 150);
    }
}

function getSearchableBodyText(pageEl) {
    var clone = pageEl.cloneNode(true);
    var h2 = clone.querySelector('h2');
    if (h2) h2.parentNode.removeChild(h2);
    return (clone.innerText || clone.textContent || "").toLowerCase();
}

function handleSearch() {
    var input = document.getElementById("search-input");
    var clearBtn = document.getElementById("search-clear-btn");
    var query = input.value.trim().toLowerCase();
    var resultsContainer = document.getElementById("search-results");

    clearBtn.style.display = input.value.length > 0 ? "block" : "none";

    if (query.length < 1) { resultsContainer.style.display = "none"; resultsContainer.innerHTML = ""; lastSearchQuery = ""; return; }
    if (query === lastSearchQuery && resultsContainer.children.length > 0) return;
    lastSearchQuery = query;
    resultsContainer.innerHTML = "";

    var matches = [];
    for (var i = 1; i <= totalSubPages; i++) {
        var pageEl = document.getElementById("sub-page-" + i);
        if (pageEl && getSearchableBodyText(pageEl).includes(query)) {
            var title = pageEl.querySelector("h2").innerText;
            matches.push({ pageNum: i, title: title });
        }
    }

    if (matches.length > 0) {
        matches.forEach(function (m) {
            var div = document.createElement("div");
            div.className = "search-result-item";
            div.innerHTML = "<b>[" + m.pageNum + "단원]</b> " + m.title;
            div.onclick = function () {
                openTab(null, 'tab-study');
                showSubPage(m.pageNum);
                highlightSearchMatch(document.getElementById("sub-page-" + m.pageNum), query);
                resultsContainer.style.display = "none";
                input.value = "";
                clearBtn.style.display = "none";
                lastSearchQuery = "";
            };
            resultsContainer.appendChild(div);
        });
        resultsContainer.style.display = "block";
    } else {
        resultsContainer.style.display = "none";
    }
}

function clearSearch() {
    var input = document.getElementById("search-input");
    input.value = "";
    handleSearch();
    input.focus();
}

/* ===================== 기타 ===================== */
function setupMiniEnterKeys() {
    var inputs = document.querySelectorAll('.mini-text-input');
    inputs.forEach(function (inp) {
        inp.onkeydown = function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                var btn = this.parentElement.querySelector('button');
                if (btn) btn.click();
            }
        };
    });
}

function loadSavedStates() {
    if (localStorage.getItem('user_dark_mode') === 'true') {
        document.body.classList.add('dark-mode');
        document.getElementById('darkmode-toggle-btn').innerText = "☀️ 주간";
    }
    if (localStorage.getItem('user_top_panel_collapsed') === 'false') {
        var panelContent = document.getElementById('collapsible-control-content');
        var panelBtnText = document.getElementById('panel-toggle-btn-text');
        if (panelContent) panelContent.classList.remove('collapsed');
        if (panelBtnText) panelBtnText.innerText = "▲ 메뉴 접기";
    }
    if (localStorage.getItem('user_tab_menu_flat') === 'true') {
        document.body.classList.add('flat-tab-menu');
        var tabMenuBtn = document.getElementById('tab-menu-style-btn');
        if (tabMenuBtn) tabMenuBtn.innerText = "☰ 탭 메뉴: 일자형";
    }
    var savedExamDate = localStorage.getItem('user_exam_date');
    if (savedExamDate) {
        var dateInput = document.getElementById('exam-date-input');
        if (dateInput) dateInput.value = savedExamDate;
    }
    completes.forEach(function (pageNum) {
        var chk = document.getElementById("check-page-" + pageNum);
        if (chk) chk.checked = true;
    });
    for (var i = 1; i <= totalSubPages; i++) {
        var savedMemo = localStorage.getItem("user_memo_page_" + i);
        if (savedMemo) {
            var memoInput = document.getElementById("memo-input-" + i);
            if (memoInput) memoInput.value = savedMemo;
        }
    }
    updateBookmarkUI();
    applyFontSize();
    updateTimerUI();
    updateProgress();
}

function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }
window.addEventListener('scroll', function () {
    var btn = document.getElementById('top-btn');
    if (btn) btn.style.display = (window.scrollY > 300) ? 'flex' : 'none';
});
