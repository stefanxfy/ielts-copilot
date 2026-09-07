/* 冒烟 v5：五卡辐射 + 音节解析卡双层结构 —— abandon 最小音素条；切 literature 验证音素/组合/细讲抽屉 */
setTimeout(() => {
  const btn = document.querySelector('.rate-btn.rate-again');
  if (!btn) { document.title = 'SMOKE-FAIL no-rate-btn'; return; }
  btn.click();
  setTimeout(() => {
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
      const abPhChips = sylCard ? sylCard.querySelectorAll('.ph-chip').length : 0; // abandon 7 音素（无标注中性色）
      const abNoToggle = sylCard ? sylCard.querySelectorAll('.ph-toggle').length : 0; // 无 desc → 无抽屉
      const sylTitle = sylCard ? (sylCard.querySelector('.mn-title') || {}).textContent || '' : '';
      const part1ok = hubPlain && cards2 === 5 && wires2 === 5 &&
        sylBlocks === 3 && stressBlocks === 1 && ipaUnits === 3 &&
        abPhChips === 7 && abNoToggle === 0 && sylTitle.indexOf('音节解析') >= 0;

      // 第二段：切 literature 再辐射，验证双层结构
      document.querySelector('.mn-card.show'); // keep ref
      setTimeout(() => {
        const litChip = document.querySelector('#wordChips [data-w="literature"]');
        if (!litChip) { document.title = 'SMOKE-FAIL no-literature-chip'; return; }
        litChip.click();
        setTimeout(() => {
          const btn2 = document.querySelector('.rate-btn.rate-again');
          if (!btn2) { document.title = 'SMOKE-FAIL no-rate-btn-lit'; return; }
          btn2.click();
          setTimeout(() => {
            const syl2 = document.querySelector('.mn-card[data-mn="syl"]');
            const phChips = syl2 ? syl2.querySelectorAll('.ph-chip').length : 0;
            const phV = syl2 ? syl2.querySelectorAll('.ph-chip.ph-v').length : 0;
            const phC = syl2 ? syl2.querySelectorAll('.ph-chip.ph-c').length : 0;
            const rows = syl2 ? syl2.querySelectorAll('.ph-row').length : 0;
            const combos = syl2 ? syl2.querySelectorAll('.ph-combo').length : 0;
            const notes = syl2 ? syl2.querySelectorAll('.ph-note').length : 0;
            const toggle = syl2 ? syl2.querySelector('.ph-toggle') : null;
            const detail = syl2 ? syl2.querySelector('.ph-detail') : null;
            const hubLit = (document.querySelector('.recog-word') || {}).textContent === 'literature';
            const structOk = phChips === 8 && phV === 4 && phC === 4 && rows === 6 && combos === 2 && notes === 2 && hubLit;
            // 展开抽屉
            if (toggle) toggle.click();
            setTimeout(() => {
              const open = detail && detail.classList.contains('open');
              const detailVisible = detail && detail.querySelector('.ph-row');
              const ok = part1ok && structOk && !!open && !!detailVisible;
              document.title = (ok ? 'SMOKE-PASS' : 'SMOKE-FAIL') +
                ' p1[hub=' + hubPlain + ' blk=' + sylBlocks + ' str=' + stressBlocks + ' ipa=' + ipaUnits +
                ' ph=' + abPhChips + ' noToggle=' + (abNoToggle === 0) + ' cards=' + cards2 + ' wires=' + wires2 + ']' +
                ' p2[lit=' + hubLit + ' ph=' + phChips + ' v=' + phV + ' c=' + phC +
                ' rows=' + rows + ' combos=' + combos + ' notes=' + notes + ' drawer=' + !!open + ']';
            }, 350);
          }, 1300);
        }, 400);
      }, 300);
    }, 1300);
  }, 500);
}, 800);
