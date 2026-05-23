/* ===== DOM ===== */
const characterListEl = document.getElementById('characterList');
const memberCountEl = document.getElementById('memberCount');
const teamCountEl = document.getElementById('teamCount');
const drawBtn = document.getElementById('drawBtn');
const autoFillBtn = document.getElementById('autoFillBtn');
const resultArea = document.getElementById('result-area');
const statusEl = document.getElementById('status');
const selectAllBtn = document.getElementById('selectAll');
const deselectAllBtn = document.getElementById('deselectAll');
const resetBtn = document.getElementById('resetBtn');
const themeBtn = document.getElementById('themeToggle');
const helpBtn = document.getElementById('helpBtn'); /* ヘルプ */
const helpDialog = document.getElementById('helpDialog'); /* ヘルプ */
const selectedCountEl = document.getElementById('selectedCount');

/* キャラ管理用配列（要素は {name, rank, el, disabled, selected} ） */
let characters = [];

/* 現在の抽選状態トラッキング */
let memberCount = 4;
let teamCountMode = 'all'; // number or 'all'
let totalTeams = 0;
let currentTeamIndex = 0;
let currentMemberIndex = 0;
let isAutoDrawing = false;

// 初期テーマ
let currentTheme = 'light';
document.documentElement.setAttribute('data-theme', currentTheme);

/* 初期化 */
function init(){

  /* ヘルプ */
  if(helpBtn && helpDialog){
    helpBtn.addEventListener('click', () => {
      helpDialog.showModal();
    });
  }

helpDialog.addEventListener('click', (e) => {
  const rect = helpDialog.getBoundingClientRect();

  const isInDialog =
    rect.top <= e.clientY &&
    e.clientY <= rect.top + rect.height &&
    rect.left <= e.clientX &&
    e.clientX <= rect.left + rect.width;

  if (!isInDialog) {
    helpDialog.close();
  }
});

  // 編成人数のプルダウン（1～3）
  for(let i=1;i<=3;i++){
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `${i}人`;
    if(i===3) opt.selected = true;
    memberCountEl.appendChild(opt);
  }

  // キャラをDOMに生成
  // const names = [...fiveStars, ...fourStars]; 並び順
  const characterData = [...fiveStars, ...fourStars];
  characterData.forEach(data=>{
  const name = data.name;
  const rank = fourStars.some(f=>f.name===name) ? 4 : 5;
    const el = document.createElement('div');
    el.className = 'character';
    el.dataset.name = name;
    el.dataset.rank = rank;
    el.innerHTML = `
  <img src="${data.img}" alt="${name}"
       style="width:100%;height:100%;object-fit:cover;border-radius:6px;">
`;

    // デフォルト選択設定（★4は選択、★5は未選択）
    if(rank===4) el.classList.add('selected');

    const obj = {
      name,
      img: data.img,
      rank,
      el,
      disabled: false,
      selected: rank===4
    };

    el.addEventListener('click', ()=>{
      if(isAutoDrawing) return;
      obj.selected = !obj.selected;
      if(obj.selected) el.classList.add('selected');
      else el.classList.remove('selected');

// 今回ONにした時だけ漂泊者チェック
if(obj.selected && obj.name.includes('漂泊者')){

  const selectedDrifters = characters.filter(c =>
    c.selected && c.name.includes('漂泊者')
  );

  if(selectedDrifters.length >= 2){
    alert('属性の異なる漂泊者が含まれています');
  }
}

      // チーム枠を即時更新
      updateSelectedCount();
      updateTeamSlots();
    });

    characters.push(obj);
    characterListEl.appendChild(el);
  });

  updateSelectedCount();
  resetDrawState();
}

function buildTeamBoards(){
  resultArea.innerHTML = '';

  memberCount = parseInt(memberCountEl.value,10);
  teamCountMode = teamCountEl.value;

  const selectedPool = characters.filter(c=>c.selected);

  totalTeams = teamCountMode === 'all'
    ? Math.ceil(selectedPool.length / memberCount)
    : parseInt(teamCountMode,10);

  if(isNaN(totalTeams) || totalTeams < 1){
    totalTeams = 1;
  }

  for(let t=0;t<totalTeams;t++){
    const teamDiv = document.createElement('div');
    teamDiv.className = 'team';

    teamDiv.innerHTML = `
      <h3>チーム ${t+1}</h3>
      <div class="team-members" data-team="${t}">
        ${'<div class="member-box"></div>'.repeat(memberCount)}
      </div>
    `;

    resultArea.appendChild(teamDiv);

    const boxes = teamDiv.querySelectorAll('.member-box');

    boxes.forEach((box,index)=>{
      box.dataset.team = t;
      box.dataset.slot = index;
    });
  }

  currentTeamIndex = 0;
  currentMemberIndex = 0;

  statusEl.textContent =
    `準備完了：編成人数 ${memberCount} / チーム数 ${
      teamCountMode === 'all'
      ? '全キャラ抽選'
      : totalTeams + ' チーム'
    }`;
}

/* チーム枠のみ再生成（選択済み状態は保持） */
function updateTeamSlots(){
  buildTeamBoards();
}

function resetCharacterState(){
  characters.forEach(c=>{
    c.disabled = false;
    c.el.classList.remove('disabled','highlight');
  });
}

/* 抽選状態のリセット */
function resetDrawState(){
  resetCharacterState();
  buildTeamBoards();
}

function isAllFilled(){
  const boxes = resultArea.querySelectorAll('.member-box');
  for(const b of boxes){
    if(b.children.length === 0) return false;
  }
  return true;
}

/* 次の空きスロットにカーソルを移動 */
function adjustCursorToNextEmpty(){
  outer:
  for(let t=0;t<totalTeams;t++){
    const teamBoxes = Array.from(resultArea.querySelectorAll(`.member-box[data-team="${t}"]`));
    for(let s=0;s<teamBoxes.length;s++){
      if(teamBoxes[s].children.length === 0){
        currentTeamIndex = t;
        currentMemberIndex = s;
        break outer;
      }
    }
  }
}

function getMembersInTeam(teamIndex){
  return Array.from(
    resultArea.querySelectorAll(`.member-box[data-team="${teamIndex}"]`)
  ).map(b => b.dataset.characterName || '');
}

/* 抽選ハイライト */
function doHighlightAnimation(candidates){
  return new Promise(resolve=>{
    let count = 8;
    const allEls = candidates.map(c=>c.el);
    const timer = setInterval(()=>{
      characters.forEach(cc=>cc.el.classList.remove('highlight'));
      const el = allEls[Math.floor(Math.random()*allEls.length)];
      el.classList.add('highlight');
      count--;
      if(count<=0){
        clearInterval(timer);
        setTimeout(()=>{characters.forEach(cc=>cc.el.classList.remove('highlight'));resolve();},100);/* 待機時間0.1秒 */
      }
    },90);/* 抽選速度0.09秒 */
  });
}

function placePickedToCurrentSlot(character){
  adjustCursorToNextEmpty();
const box = resultArea.querySelector(`.member-box[data-team="${currentTeamIndex}"][data-slot="${currentMemberIndex}"]`);
if(box){
  box.innerHTML = '';
  
  box.dataset.characterName = character.name;

  const img = document.createElement('img');
  img.src = character.img;
  img.alt = character.name;
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.objectFit = "cover";
  img.style.borderRadius = "4px";

  box.appendChild(img);

    currentMemberIndex++;
    if(currentMemberIndex >= memberCount){
      currentMemberIndex = 0;
      currentTeamIndex++;
    }
  }

  adjustCursorToNextEmpty();
}

/* ===== ドロー処理 ===== */
function getValidCandidates(){

  const selectedPool = characters.filter(c => c.selected);

  const currentTeamMembers = getMembersInTeam(currentTeamIndex)
    .filter(name => name && name.trim() !== '');

  const hasDrifterInTeam = currentTeamMembers.some(name =>
    name.includes('漂泊者')
  );

  // ===== 通常候補 =====
  let candidates = selectedPool.filter(c => !c.disabled);

  // 同キャラ禁止
  candidates = candidates.filter(c =>
    !currentTeamMembers.includes(c.name)
  );

  // 漂泊者制限
  if(hasDrifterInTeam){
    candidates = candidates.filter(c =>
      !c.name.includes('漂泊者')
    );
  }

// ===== 候補ゼロ → 再抽選 =====
if(candidates.length === 0){

  // 選択人数不足なら終了
  if(selectedPool.length < memberCount){
    return [];
  }

  // ===== 全員再有効化 =====
  selectedPool.forEach(c => {
    c.disabled = false;
    c.el.classList.remove('disabled');
  });

  // ===== 現在チーム内キャラは再度無効化 =====
  selectedPool.forEach(c => {

    // 同一キャラ禁止
    if(currentTeamMembers.includes(c.name)){
      c.disabled = true;
      c.el.classList.add('disabled');
    }

    // 漂泊者重複禁止
    if(
      hasDrifterInTeam &&
      c.name.includes('漂泊者')
    ){
      c.disabled = true;
      c.el.classList.add('disabled');
    }
  });

  // ===== 最終候補 =====
  candidates = selectedPool.filter(c => !c.disabled);
}
  return candidates;
}

/* ドロー（1人）処理 */
async function drawOne(){
  const selectedPool = characters.filter(c => c.selected);

  if(selectedPool.length === 0){
    alert('キャラクターを1名以上選択してください。');
    return false;
  }

  if(isAllFilled()){
    statusEl.textContent = 'すでに全ての枠が埋まっています。リセットしてください。';
    return;
  }

  adjustCursorToNextEmpty();
  let candidates = getValidCandidates();

  if(candidates.length === 0){

  // 次チームへ
  currentMemberIndex = 0;
  currentTeamIndex++;

  // チーム上限到達
  if(currentTeamIndex >= totalTeams){
    return false;
  }

  adjustCursorToNextEmpty();

  // 次チームで再判定
  candidates = getValidCandidates();

  if(candidates.length === 0){
    return false;
  }
}


  await doHighlightAnimation(candidates);

  const picked = candidates[Math.floor(Math.random() * candidates.length)];

  picked.disabled = true;
  picked.el.classList.add('disabled');

  placePickedToCurrentSlot(picked);

  adjustCursorToNextEmpty();

  statusEl.textContent = `${picked.name} を選出しました。次の抽選へどうぞ。`;

  if(isAllFilled()){
    statusEl.textContent = '全ての枠が埋まりました。';
  }
  return true;
}

/* 「残り一括抽選」：現在の設定の下で残り枠すべてを順に抽選する */
async function autofillRemaining(){

  if(isAutoDrawing) return;

  isAutoDrawing = true;

  drawBtn.disabled = true;
  autoFillBtn.disabled = true;
  resetBtn.disabled = true;

  try{

    while(!isAllFilled()){

      const result = await drawOne();

      if(!result){
        statusEl.textContent =
          '抽選可能なキャラクターが不足しています。';
        break;
      }

      await new Promise(r => setTimeout(r, 80));
    }

    if(isAllFilled()){
      statusEl.textContent =
        '空き枠の抽選が完了しました。';
    }

  } finally {

    isAutoDrawing = false;

    drawBtn.disabled = false;
    autoFillBtn.disabled = false;
    resetBtn.disabled = false;
  }
}

/* ===== UIボタン ===== */
drawBtn.addEventListener('click', ()=>{if(isAutoDrawing) return; drawOne().catch(e=>console.error(e)); });
autoFillBtn.addEventListener('click', ()=>{ autofillRemaining().catch(e=>console.error(e)); });
memberCountEl.addEventListener('change', ()=> { resetDrawState(); });
teamCountEl.addEventListener('change', ()=> { resetDrawState(); });

selectAllBtn.addEventListener('click', ()=>{
  if(isAutoDrawing) return;
  characters.forEach(c=>{ c.selected=true; c.el.classList.add('selected'); });
  updateSelectedCount();
  resetDrawState();
});

deselectAllBtn.addEventListener('click', ()=>{
  if(isAutoDrawing) return;
  characters.forEach(c=>{ c.selected=false; c.el.classList.remove('selected'); });
  updateSelectedCount();
  resetDrawState();
});

resetBtn.addEventListener('click', ()=>{
  if(isAutoDrawing) return;
  resetCharacterState();
  const boxes = resultArea.querySelectorAll('.member-box');

  boxes.forEach(b=>{
    b.textContent = '';
    delete b.dataset.characterName;
  });

  currentTeamIndex = 0;
  currentMemberIndex = 0;
  statusEl.textContent='抽選をリセットしました。';
});

themeBtn.addEventListener('click', () => {
  if(isAutoDrawing) return;
  if (currentTheme === 'light') {
    currentTheme = 'dark';
    themeBtn.textContent = 'ライトモード';
  } else {
    currentTheme = 'light';
    themeBtn.textContent = 'ダークモード';
  }
  document.documentElement.setAttribute('data-theme', currentTheme);
});

function updateSelectedCount(){
  const count = characters.filter(c => c.selected).length;
  selectedCountEl.textContent = count;
}

init();