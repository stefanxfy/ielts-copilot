/* 截图脚本：切无图认词卡(纯文字主卡更适合截图) → 点不认识 → 辐射全展开后停住 */
setTimeout(() => {
  const t = [...document.querySelectorAll('#typeChips .chip')].find(c => c.dataset.t === 'recogPlain');
  t.click();
  setTimeout(() => {
    document.querySelector('.rate-btn.rate-again').click();
    // 等 2.5s 让动画完全展开（截图用）
  }, 400);
}, 600);
