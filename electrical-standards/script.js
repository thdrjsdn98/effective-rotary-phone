/* ============================================================
   전기기사 - 회로이론 + 전기설비기준 통합 웹앱
   ⚠️ 저장소 독립성:
   - 공용 UI 설정(글자크기/다크모드/타이머 등): electric_app_ prefix
   - 회로이론 데이터(진도/북마크/오답/메모): electric_circuit_ prefix
   - 전기설비기준 데이터: electric_standards_ prefix
   과목별로 prefix를 분리해 서로 데이터가 섞이지 않으며,
   다른 GitHub Pages 프로젝트(제어공학 등)와도 독립적입니다.
   localStorage.clear()는 사용하지 않고, 초기화는 이 3개
   prefix로 시작하는 키만 선별 삭제합니다.
============================================================ */
var APP_PREFIX = 'electric_app_';
function APK(key) { return APP_PREFIX + key; }

var subjects = {
    circuit: {
        label: "회로이론",
        total: 13,
        prefix: 'electric_circuit_',
        bookmarks: [],
        completes: [],
        wrongNotes: {},
        currentSubPage: 0,
        unitTitles: {
            1: "01. 전기이론", 2: "02. 정현파 교류", 3: "03. R-L-C 교류회로",
            4: "04. 교류전력", 5: "05. 인덕턴스 및 벡터궤적", 6: "06. 회로망",
            7: "07. 대칭 n상 교류", 8: "08. 대칭좌표법", 9: "09. 비정현파 교류",
            10: "10. 단자망", 11: "11. 라플라스 변환", 12: "12. 과도현상", 13: "13. 전달함수"
        }
    },
    standards: {
        label: "전기설비기준",
        total: 6,
        prefix: 'electric_standards_',
        bookmarks: [],
        completes: [],
        wrongNotes: {},
        currentSubPage: 0,
        unitTitles: {
            1: "01. 공통사항", 2: "02. 전선로", 3: "03. 저압 전기설비",
            4: "04. 고압·특고압 전기설비", 5: "05. 전기철도설비", 6: "06. 분산형 전원설비"
        }
    }
};
var currentSubject = 'circuit';

function SK(subject, key) { return subjects[subject].prefix + key; }

function loadSubjectData(subject) {
    var s = subjects[subject];
    s.bookmarks = JSON.parse(localStorage.getItem(SK(subject, 'user_bookmarks')) || '[]');
    s.completes = JSON.parse(localStorage.getItem(SK(subject, 'user_completes')) || '[]');
    s.wrongNotes = JSON.parse(localStorage.getItem(SK(subject, 'user_wrong_notes')) || '{}');
}

var currentFontSize = parseInt(localStorage.getItem(APK('user_font_size')) || '14', 10);
var memorizeTimerSec = parseInt(localStorage.getItem(APK('user_timer_sec')) || '3', 10);
var quizAnswerState = {};
var isChosungMode = false;
var originalElementsData = [];
var lastSearchQuery = "";

var studyQuotes = [
    { text: "이해하지 못한 공식은 반드시 두 번째 회독에서 걸린다. 오늘 헷갈리면 오늘 정리하자.", ref: "학습 습관" },
    { text: "공식을 외우지 말고 유도 과정을 한 번은 손으로 따라가 보자. 그게 진짜 암기다.", ref: "전기기사 합격 전략" },
    { text: "필기는 5과목 중 40점 미만이 하나라도 있으면 과락이다. 약한 과목부터 채우자.", ref: "합격 기준 안내" },
    { text: "오늘 틀린 문제는 내일의 실력이다. 오답노트를 피하지 말자.", ref: "학습 루틴" },
    { text: "전기설비기준은 숫자(수치기준) 암기가 관건이다. 헷갈리는 수치는 표로 따로 정리하자.", ref: "학습 팁" },
    { text: "작은 진도라도 매일 쌓이면 시험 전날 여유가 생긴다.", ref: "꾸준함의 힘" },
    { text: "기출을 반복해서 풀다 보면 출제 패턴이 보인다.", ref: "기출 활용법" },
    { text: "모르는 건 부끄러운 게 아니라 아직 안 외운 것뿐이다.", ref: "마음가짐" },
    { text: "시험 직전 벼락치기보다 매일 30분이 더 오래 남는다.", ref: "학습 루틴" },
    { text: "포기하고 싶을 때가 합격에 가장 가까워진 때일 수 있다.", ref: "응원의 한마디" }
];

document.addEventListener("DOMContentLoaded", function () {
    loadSubjectData('circuit');
    loadSubjectData('standards');
    loadSavedStates();
    setupMemorizeClickEvents();
    updateProgress('circuit');
    updateProgress('standards');
    calculateDDay();
    renderHourlyQuote();
    setupMiniEnterKeys();
    renderWrongNotes('circuit');
    renderWrongNotes('standards');
    checkDailyNotify();
    switchSubject(currentSubject, true);

    var searchResults = document.getElementById("search-results");
    if (searchResults) {
        searchResults.addEventListener('mousedown', function (e) {
            if (e.target === searchResults) e.preventDefault();
        });
    }
});

/* ===================== 뒤로가기 종료 확인 ===================== */
var exitTrapArmed = false;
function armExitTrap() {
    if (location.hash !== '#studying') history.pushState({ exitTrap: true }, '', '#studying');
    exitTrapArmed = true;
}
function handleBackAttempt() {
    if (exitTrapArmed) {
        exitTrapArmed = false;
        var overlay = document.getElementById('exit-confirm-overlay');
        if (overlay) overlay.style.display = 'flex';
    }
}
window.addEventListener('popstate', handleBackAttempt);
window.addEventListener('hashchange', handleBackAttempt);
function cancelExitApp() {
    var overlay = document.getElementById('exit-confirm-overlay');
    if (overlay) overlay.style.display = 'none';
    armExitTrap();
}
function confirmExitApp() {
    var overlay = document.getElementById('exit-confirm-overlay');
    if (overlay) overlay.style.display = 'none';
    window.close();
}
armExitTrap();
document.addEventListener('DOMContentLoaded', armExitTrap);

/* ===================== 매일 알림 ===================== */
function toggleDailyNotify() {
    var btn = document.getElementById('notify-toggle-btn');
    var isEnabled = localStorage.getItem(APK('user_notify_enabled')) === 'true';
    if (!isEnabled) {
        if (!('Notification' in window)) { alert('이 브라우저는 알림 기능을 지원하지 않아요.'); return; }
        Notification.requestPermission().then(function (permission) {
            if (permission === 'granted') {
                localStorage.setItem(APK('user_notify_enabled'), 'true');
                btn.innerText = '🔕 매일 알림 끄기';
                btn.classList.add('active');
                new Notification('알림이 켜졌어요! 🔔', { body: '이제 앱을 열 때마다 오늘 공부 여부를 확인해드릴게요.' });
            } else {
                alert('알림 권한이 거부되었어요. 폰 설정에서 이 사이트의 알림 권한을 허용해주세요.');
            }
        });
    } else {
        localStorage.setItem(APK('user_notify_enabled'), 'false');
        btn.innerText = '🔔 매일 알림 켜기';
        btn.classList.remove('active');
    }
}
function checkDailyNotify() {
    var isEnabled = localStorage.getItem(APK('user_notify_enabled')) === 'true';
    var btn = document.getElementById('notify-toggle-btn');
    if (isEnabled && btn) { btn.innerText = '🔕 매일 알림 끄기'; btn.classList.add('active'); }
    if (!isEnabled || !('Notification' in window) || Notification.permission !== 'granted') return;
    var today = new Date().toDateString();
    var lastNotifyDate = localStorage.getItem(APK('last_notify_date'));
    if (lastNotifyDate !== today) {
        localStorage.setItem(APK('last_notify_date'), today);
        new Notification('전기기사 학습 앱 ⚡', { body: '오늘 아직 공부 안 하셨죠? 지금 잠깐이라도 시작해볼까요?' });
    }
}

/* ===================== 상단 도구 패널 ===================== */
function toggleTopPanel() {
    var content = document.getElementById("collapsible-control-content");
    var btnText = document.getElementById("panel-toggle-btn-text");
    var isCollapsed = content.classList.toggle("collapsed");
    btnText.innerText = isCollapsed ? "▼ 메뉴 펼치기" : "▲ 메뉴 접기";
    localStorage.setItem(APK("user_top_panel_collapsed"), isCollapsed ? "true" : "false");
}

function calculateDDay() {
    var saved = localStorage.getItem(APK("user_exam_date"));
    var badgeEl = document.getElementById("exam-dday-badge");
    if (!badgeEl) return;
    if (!saved) { badgeEl.innerText = "시험일 미설정 (⚙️ 학습 도구에서 설정)"; return; }
    var targetDate = new Date(saved + "T00:00:00+09:00");
    var diff = targetDate.getTime() - new Date().getTime();
    var days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    var text = days > 0 ? "D-" + days : (days === 0 ? "D-DAY 🔥" : "D+" + Math.abs(days));
    badgeEl.innerText = "필기시험 " + text;
}
function setExamDate() {
    var input = document.getElementById("exam-date-input");
    if (!input || !input.value) return;
    localStorage.setItem(APK("user_exam_date"), input.value);
    calculateDDay();
}

function renderHourlyQuote() {
    var now = new Date();
    var currentHourKey = now.getFullYear() + "-" + (now.getMonth() + 1) + "-" + now.getDate() + "-" + now.getHours();
    var savedHourKey = localStorage.getItem(APK("last_quote_hour_key"));
    var savedQuoteIndex = localStorage.getItem(APK("current_quote_index"));
    var chosenIndex = 0;
    if (savedHourKey === currentHourKey && savedQuoteIndex !== null) {
        chosenIndex = parseInt(savedQuoteIndex, 10);
    } else {
        chosenIndex = Math.floor(Math.random() * studyQuotes.length);
        localStorage.setItem(APK("last_quote_hour_key"), currentHourKey);
        localStorage.setItem(APK("current_quote_index"), chosenIndex);
    }
    var q = studyQuotes[chosenIndex] || studyQuotes[0];
    var box = document.getElementById("daily-quote-box");
    if (box) box.innerHTML = '"' + q.text + '" <span>- ' + q.ref + '</span>';
}

function applyFontSize() {
    document.documentElement.style.setProperty('--base-font-size', currentFontSize + 'px');
    localStorage.setItem(APK('user_font_size'), currentFontSize);
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
    localStorage.setItem(APK('user_dark_mode'), isDark);
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
        targets.forEach(function (el, idx) { originalElementsData[idx] = el.innerText; el.innerText = getChosung(el.innerText); });
    } else {
        targets.forEach(function (el, idx) { if (originalElementsData[idx] !== undefined) el.innerText = originalElementsData[idx]; });
    }
}

function setTimerSec(sec) {
    memorizeTimerSec = sec;
    localStorage.setItem(APK('user_timer_sec'), sec);
    updateTimerUI();
}
function updateTimerUI() {
    document.getElementById('timer-btn-3').classList.toggle('active', memorizeTimerSec === 3);
    document.getElementById('timer-btn-5').classList.toggle('active', memorizeTimerSec === 5);
    document.getElementById('timer-btn-0').classList.toggle('active', memorizeTimerSec === 0);
    document.body.classList.toggle('press-mode', memorizeTimerSec === 0);
}

function setupMemorizeClickEvents() {
    var targets = document.querySelectorAll('.red, .blue, .yellow, .mint, .orange, .highlight');
    targets.forEach(function (el) {
        el.addEventListener('click', function () {
            if (!document.body.classList.contains('memorize-mode')) return;
            if (memorizeTimerSec === 0) return;
            if (el.dataset.timerId) clearTimeout(parseInt(el.dataset.timerId, 10));
            el.classList.add('revealed');
            var timerId = setTimeout(function () { el.classList.remove('revealed'); delete el.dataset.timerId; }, memorizeTimerSec * 1000);
            el.dataset.timerId = timerId;
        });
    });
}

/* ===================== 과목 전환 ===================== */
function switchSubject(subject, isInit) {
    currentSubject = subject;
    localStorage.setItem(APK('current_subject'), subject);

    document.querySelectorAll('.subject-btn').forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.subject === subject);
    });
    document.querySelectorAll('.subject-panel').forEach(function (panel) {
        panel.style.display = (panel.dataset.subject === subject) ? '' : 'none';
    });

    var label = subjects[subject].label;
    var titleEls = document.querySelectorAll('.subject-title-label');
    titleEls.forEach(function (el) { el.innerText = label; });

    // 각 탭의 표시를 현재 과목 기준으로 리셋
    showSubMenu(subject);
    backToRandomSelect(subject);
    if (!isInit) window.scrollTo({ top: 0, behavior: 'instant' });
}

/* ===================== 메모 / 백업 / 초기화 ===================== */
function savePageMemo(subject, pageNum) {
    var memoText = document.getElementById("memo-input-" + subject + "-" + pageNum).value;
    localStorage.setItem(SK(subject, "user_memo_page_" + pageNum), memoText);
}

async function exportUserData() {
    var backupData = {
        examDate: localStorage.getItem(APK("user_exam_date")) || "",
        subjects: {}
    };
    ['circuit', 'standards'].forEach(function (subject) {
        var s = subjects[subject];
        var memos = {};
        for (var i = 1; i <= s.total; i++) {
            var memo = localStorage.getItem(SK(subject, "user_memo_page_" + i));
            if (memo) memos[i] = memo;
        }
        backupData.subjects[subject] = { bookmarks: s.bookmarks, completes: s.completes, wrongNotes: s.wrongNotes, memos: memos };
    });

    var now = new Date();
    var pad = function (n) { return String(n).padStart(2, '0'); };
    var timestamp = String(now.getFullYear()).slice(2) + pad(now.getMonth() + 1) + pad(now.getDate()) + pad(now.getHours()) + pad(now.getMinutes());
    var filename = "전기기사_회로이론_전기설비기준_백업_" + timestamp + ".json";
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
    var a = document.createElement('a');
    a.setAttribute("href", dataStr);
    a.setAttribute("download", filename);
    document.body.appendChild(a);
    a.click();
    a.remove();
    alert("💾 두 과목의 학습 진도·오답노트가 백업 파일로 다운로드되었습니다!");
}

function importUserData(event) {
    var file = event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
        try {
            var data = JSON.parse(e.target.result);
            if (data.examDate) localStorage.setItem(APK('user_exam_date'), data.examDate);
            if (data.subjects) {
                ['circuit', 'standards'].forEach(function (subject) {
                    var sd = data.subjects[subject];
                    if (!sd) return;
                    if (sd.bookmarks) localStorage.setItem(SK(subject, 'user_bookmarks'), JSON.stringify(sd.bookmarks));
                    if (sd.completes) localStorage.setItem(SK(subject, 'user_completes'), JSON.stringify(sd.completes));
                    if (sd.wrongNotes) localStorage.setItem(SK(subject, 'user_wrong_notes'), JSON.stringify(sd.wrongNotes));
                    if (sd.memos) { for (var key in sd.memos) localStorage.setItem(SK(subject, "user_memo_page_" + key), sd.memos[key]); }
                });
            }
            alert("✅ 백업 복원이 완료되었습니다. 새로고침합니다.");
            location.reload();
        } catch (err) {
            alert("❌ 올바른 백업 파일이 아닙니다.");
        }
    };
    reader.readAsText(file);
}

function resetAppData() {
    if (!confirm("이 앱의 모든 학습 데이터(회로이론 + 전기설비기준, 설정 포함)를 초기화할까요?\n다른 전기 과목 앱(제어공학 등)의 데이터에는 영향이 없습니다.")) return;
    Object.keys(localStorage)
        .filter(function (key) { return key.startsWith('electric_app_') || key.startsWith('electric_circuit_') || key.startsWith('electric_standards_'); })
        .forEach(function (key) { localStorage.removeItem(key); });
    alert("🗑️ 초기화되었습니다. 새로고침합니다.");
    location.reload();
}

/* ===================== 진도 / 북마크 ===================== */
function updateProgress(subject) {
    var s = subjects[subject];
    var doneCount = s.completes.length;
    var percent = Math.round((doneCount / s.total) * 100);
    var textEl = document.getElementById('progress-text-' + subject);
    var fillEl = document.getElementById('progress-fill-' + subject);
    if (textEl) textEl.innerText = doneCount + " / " + s.total + " (" + percent + "%)";
    if (fillEl) fillEl.style.width = percent + "%";
    for (var i = 1; i <= s.total; i++) {
        var doneBadge = document.getElementById("card-done-" + subject + "-" + i);
        if (doneBadge) doneBadge.style.display = s.completes.includes(i) ? "inline-block" : "none";
    }
}

function toggleComplete(subject, pageNum) {
    var s = subjects[subject];
    var chk = document.getElementById("check-page-" + subject + "-" + pageNum);
    if (chk.checked) { if (!s.completes.includes(pageNum)) s.completes.push(pageNum); }
    else { var idx = s.completes.indexOf(pageNum); if (idx > -1) s.completes.splice(idx, 1); }
    localStorage.setItem(SK(subject, 'user_completes'), JSON.stringify(s.completes));
    updateProgress(subject);
}

function toggleBookmark(subject, pageNum) {
    var s = subjects[subject];
    var index = s.bookmarks.indexOf(pageNum);
    if (index > -1) s.bookmarks.splice(index, 1); else s.bookmarks.push(pageNum);
    localStorage.setItem(SK(subject, 'user_bookmarks'), JSON.stringify(s.bookmarks));
    updateBookmarkUI(subject);
}

function updateBookmarkUI(subject) {
    var s = subjects[subject];
    for (var i = 1; i <= s.total; i++) {
        var btn = document.getElementById("star-btn-" + subject + "-" + i);
        var cardStar = document.getElementById("card-star-" + subject + "-" + i);
        var isBookmarked = s.bookmarks.includes(i);
        if (btn) { btn.innerText = isBookmarked ? "★" : "☆"; btn.classList.toggle('active', isBookmarked); }
        if (cardStar) { cardStar.innerText = isBookmarked ? " ★" : ""; cardStar.style.color = "#f59e0b"; }
    }
}

function filterBookmarks(subject) {
    var s = subjects[subject];
    if (s.bookmarks.length === 0) { alert("등록된 북마크가 없습니다."); return; }
    var cards = document.querySelectorAll("#main-menu-grid-" + subject + " .sub-nav-card");
    cards.forEach(function (card, idx) {
        var pageNum = idx + 1;
        card.style.display = s.bookmarks.includes(pageNum) ? "flex" : "none";
    });
}

/* ===================== 탭 전환 (표지/단원학습/모의고사/오답노트) ===================== */
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
function toggleTabDropdown() { document.getElementById('tab-dropdown-list').classList.toggle('open'); }
function toggleTabMenuStyle() {
    var isFlat = document.body.classList.toggle('flat-tab-menu');
    localStorage.setItem(APK('user_tab_menu_flat'), isFlat);
    document.getElementById('tab-menu-style-btn').innerText = isFlat ? "☰ 탭 메뉴: 일자형" : "▾ 탭 메뉴: 드롭다운형";
}

/* ===================== 챕터(단원) 서브페이지 ===================== */
function showSubPage(subject, pageNum) {
    subjects[subject].currentSubPage = pageNum;
    document.getElementById("sub-page-menu-" + subject).style.display = "none";
    for (var i = 1; i <= subjects[subject].total; i++) {
        var page = document.getElementById("sub-page-" + subject + "-" + i);
        if (page) page.style.display = "none";
    }
    var targetPage = document.getElementById("sub-page-" + subject + "-" + pageNum);
    if (targetPage) targetPage.style.display = "block";
    document.getElementById("page-nav-bar-" + subject).style.display = "flex";
    updateNavButtons(subject);
    window.scrollTo({ top: 0, behavior: 'instant' });
}

function showSubMenu(subject) {
    subjects[subject].currentSubPage = 0;
    for (var i = 1; i <= subjects[subject].total; i++) {
        var page = document.getElementById("sub-page-" + subject + "-" + i);
        if (page) page.style.display = "none";
    }
    var cards = document.querySelectorAll("#main-menu-grid-" + subject + " .sub-nav-card");
    cards.forEach(function (card) { card.style.display = "flex"; });
    var menuEl = document.getElementById("sub-page-menu-" + subject);
    if (menuEl) menuEl.style.display = "block";
    var navBar = document.getElementById("page-nav-bar-" + subject);
    if (navBar) navBar.style.display = "none";
}

function prevSubPage(subject) { if (subjects[subject].currentSubPage > 1) showSubPage(subject, subjects[subject].currentSubPage - 1); }
function nextSubPage(subject) { if (subjects[subject].currentSubPage < subjects[subject].total) showSubPage(subject, subjects[subject].currentSubPage + 1); }

function updateNavButtons(subject) {
    document.getElementById("btn-prev-" + subject).disabled = (subjects[subject].currentSubPage <= 1);
    document.getElementById("btn-next-" + subject).disabled = (subjects[subject].currentSubPage >= subjects[subject].total);
}

/* ===================== 퀴즈 채점 ===================== */
// qid 규칙: 회로이론 = "u{chapter}-{n}" 또는 "examC-{n}", 전기설비기준 = "s{chapter}-{n}" 또는 "examS-{n}"
function subjectOfQid(qId) {
    if (qId.indexOf('examC') === 0 || qId.indexOf('u') === 0) return 'circuit';
    if (qId.indexOf('examS') === 0 || qId.indexOf('s') === 0) return 'standards';
    return null;
}
function chapterOfQid(qId) {
    var m = qId.match(/^[us](\d+)-/);
    return m ? parseInt(m[1], 10) : null;
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
    var subject = subjectOfQid(qId);
    var chapter = chapterOfQid(qId);

    if (isCorrect) {
        if (resultEl) resultEl.innerHTML = "<span style='color:" + (isDark ? "#4ade80" : "#16a34a") + ";'>정답입니다! 🎉</span>";
        clickedBtn.style.backgroundColor = isDark ? "#064e3b" : "#dcfce7";
        clickedBtn.style.color = isDark ? "#86efac" : "#166534";
        if (subject && subjects[subject].wrongNotes[qId]) {
            delete subjects[subject].wrongNotes[qId];
            localStorage.setItem(SK(subject, 'user_wrong_notes'), JSON.stringify(subjects[subject].wrongNotes));
            renderWrongNotes(subject);
        }
    } else {
        if (resultEl) resultEl.innerHTML = "<span style='color:" + (isDark ? "#f87171" : "#dc2626") + ";'>오답입니다! (정답: " + correctText + ")</span>";
        clickedBtn.style.backgroundColor = isDark ? "#7f1d1d" : "#fee2e2";
        clickedBtn.style.color = isDark ? "#fca5a5" : "#991b1b";
        if (subject) {
            var typeLabel = chapter ? subjects[subject].unitTitles[chapter] : "랜덤모의고사(" + subjects[subject].label + ")";
            subjects[subject].wrongNotes[qId] = { id: qId, title: qTitle, correct: correctText.trim(), wrongChoice: selectedText, expl: qExpl, type: typeLabel };
            localStorage.setItem(SK(subject, 'user_wrong_notes'), JSON.stringify(subjects[subject].wrongNotes));
            renderWrongNotes(subject);
        }
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
    var subject = subjectOfQid(qId);
    var chapter = chapterOfQid(qId);

    if (isCorrect) {
        if (resultEl) resultEl.innerHTML = "<span style='color:" + (isDark ? "#4ade80" : "#16a34a") + ";'>정답입니다! 🎉</span>";
        if (subject && subjects[subject].wrongNotes[qId]) {
            delete subjects[subject].wrongNotes[qId];
            localStorage.setItem(SK(subject, 'user_wrong_notes'), JSON.stringify(subjects[subject].wrongNotes));
            renderWrongNotes(subject);
        }
    } else {
        if (resultEl) resultEl.innerHTML = "<span style='color:" + (isDark ? "#f87171" : "#dc2626") + ";'>오답입니다! (정답: " + correctText + ")</span>";
        if (subject) {
            var typeLabel = chapter ? subjects[subject].unitTitles[chapter] : "랜덤모의고사(" + subjects[subject].label + ")";
            subjects[subject].wrongNotes[qId] = { id: qId, title: qTitle, correct: correctText, wrongChoice: inputEl.value.trim() || "(빈칸)", expl: qExpl, type: typeLabel };
            localStorage.setItem(SK(subject, 'user_wrong_notes'), JSON.stringify(subjects[subject].wrongNotes));
            renderWrongNotes(subject);
        }
    }
    updateUnitScore(qId);
}

function resetAnswer(qId) {
    var box = document.getElementById("box-" + qId);
    if (!box) return;
    delete quizAnswerState[qId];
    box.querySelectorAll('.opt-btn').forEach(function (btn) { btn.style.backgroundColor = ""; btn.style.color = ""; btn.style.borderColor = ""; });
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
    wrap.querySelectorAll('.quiz-box').forEach(function (box) { resetAnswer(box.dataset.qid); });
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
function startRandomExam(subject, n) {
    var pool = (subject === 'circuit') ? questionPoolCircuit : questionPoolStandards;
    var examPrefix = (subject === 'circuit') ? 'examC' : 'examS';
    var shuffled = pool.slice();
    for (var i = shuffled.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp;
    }
    var picked = shuffled.slice(0, Math.min(n, shuffled.length));

    var html = "";
    picked.forEach(function (q, idx) {
        var num = idx + 1;
        var qid = examPrefix + "-" + num;
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

    var containerId = 'exam-questions-wrap-' + subject;
    var container = document.getElementById(containerId);
    container.innerHTML = html;
    document.getElementById('exam-select-' + subject).style.display = 'none';
    document.getElementById('exam-quiz-area-' + subject).style.display = 'block';

    for (var key in quizAnswerState) { if (key.indexOf(examPrefix + '-') === 0) delete quizAnswerState[key]; }
    container.setAttribute('data-scoreboard', 'true');
    updateScoreBoard(containerId);
    setupMiniEnterKeys();
    window.scrollTo({ top: 0, behavior: 'instant' });
}

function backToRandomSelect(subject) {
    var selectEl = document.getElementById('exam-select-' + subject);
    var areaEl = document.getElementById('exam-quiz-area-' + subject);
    if (selectEl) selectEl.style.display = 'block';
    if (areaEl) areaEl.style.display = 'none';
}

/* ===================== 오답노트 ===================== */
function renderWrongNotes(subject) {
    var listEl = document.getElementById('wrong-notes-list-' + subject);
    var summaryEl = document.getElementById('wrong-unit-summary-' + subject);
    if (!listEl) return;
    var wrongNotes = subjects[subject].wrongNotes;
    var keys = Object.keys(wrongNotes);
    if (keys.length === 0) {
        listEl.innerHTML = '<div class="box" style="text-align:center; color:var(--text-sub);">🎉 아직 틀린 문제가 없어요! 퀴즈를 풀어보세요.</div>';
        if (summaryEl) summaryEl.innerHTML = "";
        return;
    }
    var byType = {};
    keys.forEach(function (k) { var note = wrongNotes[k]; var t = note.type || "기타"; byType[t] = (byType[t] || 0) + 1; });
    if (summaryEl) {
        var summaryHtml = '<div class="box" style="display:flex; flex-wrap:wrap; gap:6px; padding:12px;">';
        for (var t in byType) summaryHtml += '<span class="dday-capsule" style="background-color:var(--primary-light); color:var(--primary);">' + t + ' ' + byType[t] + '개</span>';
        summaryHtml += '</div>';
        summaryEl.innerHTML = summaryHtml;
    }
    var html = "";
    keys.slice().reverse().forEach(function (k) {
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

function clearAllWrongNotes(subject) {
    if (!confirm(subjects[subject].label + " 오답노트를 전체 비우시겠어요? 되돌릴 수 없습니다.")) return;
    subjects[subject].wrongNotes = {};
    localStorage.setItem(SK(subject, 'user_wrong_notes'), '{}');
    renderWrongNotes(subject);
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
    ['circuit', 'standards'].forEach(function (subject) {
        for (var i = 1; i <= subjects[subject].total; i++) {
            var pageEl = document.getElementById("sub-page-" + subject + "-" + i);
            if (pageEl && getSearchableBodyText(pageEl).includes(query)) {
                var title = pageEl.querySelector("h2").innerText;
                matches.push({ subject: subject, pageNum: i, title: title });
            }
        }
    });

    if (matches.length > 0) {
        matches.forEach(function (m) {
            var div = document.createElement("div");
            div.className = "search-result-item";
            div.innerHTML = "<b>[" + subjects[m.subject].label + " " + m.pageNum + "단원]</b> " + m.title;
            div.onclick = function () {
                switchSubject(m.subject);
                openTab(null, 'tab-study');
                showSubPage(m.subject, m.pageNum);
                highlightSearchMatch(document.getElementById("sub-page-" + m.subject + "-" + m.pageNum), query);
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
    document.querySelectorAll('.mini-text-input').forEach(function (inp) {
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
    if (localStorage.getItem(APK('user_dark_mode')) === 'true') {
        document.body.classList.add('dark-mode');
        document.getElementById('darkmode-toggle-btn').innerText = "☀️ 주간";
    }
    if (localStorage.getItem(APK('user_top_panel_collapsed')) === 'false') {
        var panelContent = document.getElementById('collapsible-control-content');
        var panelBtnText = document.getElementById('panel-toggle-btn-text');
        if (panelContent) panelContent.classList.remove('collapsed');
        if (panelBtnText) panelBtnText.innerText = "▲ 메뉴 접기";
    }
    if (localStorage.getItem(APK('user_tab_menu_flat')) === 'true') {
        document.body.classList.add('flat-tab-menu');
        var tabMenuBtn = document.getElementById('tab-menu-style-btn');
        if (tabMenuBtn) tabMenuBtn.innerText = "☰ 탭 메뉴: 일자형";
    }
    var savedExamDate = localStorage.getItem(APK('user_exam_date'));
    if (savedExamDate) {
        var dateInput = document.getElementById('exam-date-input');
        if (dateInput) dateInput.value = savedExamDate;
    }
    var savedSubject = localStorage.getItem(APK('current_subject'));
    if (savedSubject && subjects[savedSubject]) currentSubject = savedSubject;

    ['circuit', 'standards'].forEach(function (subject) {
        var s = subjects[subject];
        s.completes.forEach(function (pageNum) {
            var chk = document.getElementById("check-page-" + subject + "-" + pageNum);
            if (chk) chk.checked = true;
        });
        for (var i = 1; i <= s.total; i++) {
            var savedMemo = localStorage.getItem(SK(subject, "user_memo_page_" + i));
            if (savedMemo) {
                var memoInput = document.getElementById("memo-input-" + subject + "-" + i);
                if (memoInput) memoInput.value = savedMemo;
            }
        }
        updateBookmarkUI(subject);
    });

    applyFontSize();
    updateTimerUI();
}

function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }
window.addEventListener('scroll', function () {
    var btn = document.getElementById('top-btn');
    if (btn) btn.style.display = (window.scrollY > 300) ? 'flex' : 'none';
});

// 서비스워커 등록 (PWA)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        navigator.serviceWorker.register('./sw.js').catch(function (err) { console.log('SW 등록 실패:', err); });
    });
}
