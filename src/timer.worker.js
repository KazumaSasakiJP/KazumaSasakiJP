/**********************************************************************
 *  タイマーのワーカ
 *  filename : timer.warker.js
 *  create : 2024/04/11 Kazuma.Sasaki
 **********************************************************************/
var timerId = 0;
onmessage = function(e) {
    // console.log('worker recved : ', e.data);
    var remainTime = e.data.interval;
    if (remainTime === 0 && timerId !== 0) {
        // console.log('cleanup Intervaltimer');
        clearInterval(timerId);
        timerId = 0;
    }
    if (timerId === 0 && remainTime > 0) {
        // console.log('Generate Intervaltimer : ', remainTime);
        timerId = setInterval(function() {
            postMessage({timerId:timerId});
        }, remainTime);
    }
  };