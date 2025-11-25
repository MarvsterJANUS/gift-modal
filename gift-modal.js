(function(){
  const modal = document.getElementById('giftModal');
  const openModalBtn = document.getElementById('openGift');
  const closeEls = modal.querySelectorAll('[data-close]');
  const stage = document.getElementById('stage');
  const scratch = document.getElementById('scratch');
  const ctx = scratch.getContext('2d');

  const prize = document.getElementById('prize');
  const lidEl = document.getElementById('lid');
  const prizeLink = document.getElementById('prizeLink');
  const progressEl = document.getElementById('progress');
  const openBtn = document.getElementById('openBtn');

  openModalBtn.addEventListener('click', () => {
    modal.setAttribute('open','');
    requestAnimationFrame(initCanvas);
  });
  closeEls.forEach(el=>el.addEventListener('click', ()=>modal.removeAttribute('open')));

  // Reward: open animation + show prize
  openBtn.addEventListener('click', ()=>{
    if (openBtn.disabled) return;
    lidEl.classList.add('open');
    scratch.style.transition = 'opacity .45s ease';
    scratch.style.opacity = 0;
    setTimeout(()=>{ scratch.remove(); prize.style.display='block'; }, 460);
  });

  // --- Snow image draw (no pixel reads needed anymore) ---
  const snowImg = new Image();
  snowImg.src = 'gift_snow.png';

  // bounds for snow area (centered rectangle that matches your images)
  let dx=0, dy=0, gw=0, gh=0;

  // grid-based progress tracking (no CORS issues)
  const CELL = 16;           // grid cell size in px
  const BRUSH = 28;          // erase brush radius in px
  const UNLOCK = 65;         // % to unlock
  let cols=0, rows=0, totalCells=0, clearedMap=null, clearedCount=0;

  function initCanvas(){
    const rect = stage.getBoundingClientRect();
    scratch.width  = Math.max(10, Math.round(rect.width));
    scratch.height = Math.max(10, Math.round(rect.height));

    const w = scratch.width, h = scratch.height;
    const scale = parseFloat(getComputedStyle(stage).getPropertyValue('--gift-scale')) || 0.9;
    gw = w * scale;
    gh = h * scale;
    dx = (w - gw) / 2;
    dy = (h - gh) / 2;

    // Setup progress grid for the snow box
    cols = Math.ceil(gw / CELL);
    rows = Math.ceil(gh / CELL);
    totalCells = cols * rows;
    clearedMap = new Uint8Array(totalCells);
    clearedCount = 0;

    drawSnow();
    updateProgressGrid();  // shows 0%
    attachScratchHandlers();
  }

  function drawSnow(){
    const w = scratch.width, h = scratch.height;
    ctx.clearRect(0,0,w,h);
    if (snowImg.complete) ctx.drawImage(snowImg, dx, dy, gw, gh);
    else snowImg.onload = ()=>ctx.drawImage(snowImg, dx, dy, gw, gh);
  }

  // ---- scratching ----
  let isDown = false;

  function getPos(e){
    const rect = scratch.getBoundingClientRect();
    const cx = (e.touches? e.touches[0].clientX : e.clientX) - rect.left;
    const cy = (e.touches? e.touches[0].clientY : e.clientY) - rect.top;
    return {x: cx, y: cy};
  }

  function erase(x,y){
    // draw transparent circle
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, BRUSH, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    // mark grid cells overlapped by the brush (only inside snow box)
    const left   = Math.max(0, Math.floor((x - BRUSH - dx) / CELL));
    const right  = Math.min(cols-1, Math.floor((x + BRUSH - dx) / CELL));
    const top    = Math.max(0, Math.floor((y - BRUSH - dy) / CELL));
    const bottom = Math.min(rows-1, Math.floor((y + BRUSH - dy) / CELL));

    for (let r = top; r <= bottom; r++){
      for (let c = left; c <= right; c++){
        const cx = dx + c*CELL + CELL/2;
        const cy = dy + r*CELL + CELL/2;
        const dist2 = (cx - x)*(cx - x) + (cy - y)*(cy - y);
        if (dist2 <= BRUSH*BRUSH){
          const idx = r*cols + c;
          if (!clearedMap[idx]){
            clearedMap[idx] = 1;
            clearedCount++;
          }
        }
      }
    }
    updateProgressGrid();
  }

  function attachScratchHandlers(){
    scratch.onpointerdown = e=>{
      isDown = true;
      if(e.pointerId) scratch.setPointerCapture(e.pointerId);
      const p = getPos(e); erase(p.x, p.y);
    };
    scratch.onpointermove = e=>{
      if(!isDown) return;
      const p = getPos(e); erase(p.x, p.y);
    };
    window.addEventListener('pointerup', ()=>{ isDown = false; });

    // touch fallback
    scratch.addEventListener('touchstart', e=>{ const p = getPos(e); erase(p.x, p.y); }, {passive:true});
    scratch.addEventListener('touchmove',  e=>{ const p = getPos(e); erase(p.x, p.y); }, {passive:true});
  }

  // --- Progress via grid ---
  function updateProgressGrid(){
    const percent = Math.max(0, Math.min(100, Math.round((clearedCount/totalCells)*100)));
    if (percent >= UNLOCK){
      openBtn.disabled = false;
      progressEl.textContent = `Genug freigerubbelt! (${percent}%)`;
    } else {
      openBtn.disabled = true;
      progressEl.textContent = `Rubbel den Schnee frei… (${percent}%)`;
    }
  }
})();


