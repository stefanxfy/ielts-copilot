/* 冒烟 v4：五卡辐射 + 音节解析卡 —— 点不认识 → 主卡保持原拼写 → 5 卡辐射 → 音节卡含色块+音标 */
setTimeout(() => {
  const btn = document.querySelector('.rate-btn.rate-again');
  if (!btn) { document.title = 'SMOKE-FAIL no-rate-btn'; return; }
  btn.click();
  setTimeout(() => {
    // 主卡单词应保持原拼写（不再原地变形）
    const hubWord = document.querySelector('.recog-word');
    const hubPlain = hubWord && hubWord.textContent === 'abandon' && !hubWord.classList.contains('is-syl');
    const sylCard = document.querySelector('.mn-card[data-mn="syl"]');
    const cards = document.querySelectorAll('.mn-card.show').length;
    const wires = document.querySelectorAll('#wiresSvg .wire').length;
    setTimeout(() => {
      const cards2 = document.querySelectorAll('.mn-card.show').length;
      const wires2 = document.querySelectorAll('#wiresSvg .wire').length;
      const sylBlocks = sylCard ? sylCard.querySelectorAll('.syl-block').length : 0;
      const stressBlocks = sylCard ? sylCard.querySelectorAll('.syl-block.stress').length : 0;
      const ipaUnits = sylCard ? sylCard.querySelectorAll('.syl-unit-ipa').length : 0;
      const sylTitle = sylCard ? (sylCard.querySelector('.mn-title') || {}).textContent || '' : '';
      const ok = hubPlain && cards2 === 5 && wires2 === 5 &&
        sylBlocks === 3 && stressBlocks === 1 && ipaUnits === 3 &&
        sylTitle.indexOf('音节解析') >= 0;
      document.title = (ok ? 'SMOKE-PASS' : 'SMOKE-FAIL') +
        ' hub[plain=' + hubPlain + ' txt=' + (hubWord ? hubWord.textContent : 'null') + ']' +
        ' syl[blk=' + sylBlocks + ' str=' + stressBlocks + ' ipa=' + ipaUnits + ' title=' + sylTitle + ']' +
        ' cards=' + cards + '->' + cards2 + ' wires=' + wires + '->' + wires2;
    }, 1300);
  }, 500);
}, 800);
