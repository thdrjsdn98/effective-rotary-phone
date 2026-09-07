// 허브 페이지는 각 과목 폴더로 이동만 시켜주는 진입점이라
// localStorage를 직접 사용하지 않습니다 (과목별 데이터는 각 폴더 앱이 관리).

if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        navigator.serviceWorker.register('./sw.js').catch(function (err) {
            console.log('SW 등록 실패:', err);
        });
    });
}
