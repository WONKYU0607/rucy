// ── 언어 (2026-10-26) ──
// 기기 언어가 한국어면 한국어, 그 밖에는 전부 영어. 개발자 모드(?dev=…)에서는 ?lang=en / ?lang=ko 로 바꿔 볼 수 있다.
// 화면 글자는 한국어 원문을 그대로 키로 쓴다: T('강화') → 'Upgrade'. 숫자가 끼는 문장은 TF('{0}단계', n) 처럼.
// 사전에 없는 글자는 한국어 그대로 나온다(빠진 번역을 찾기 쉽게).
const devOn = (() => { try { return localStorage.getItem('paleoDev') === '1' || new URLSearchParams(location.search).get('dev') === 'rucy0607' } catch { return false } })()
export const LANG = (() => {
  try {
    if (devOn) { const q = new URLSearchParams(location.search); const l = q.get('lang') || q.get('intro'); if (l === 'en' || l === 'ko') return l }
    return /^ko/i.test(navigator.language || (navigator.languages || [])[0] || '') ? 'ko' : 'en'
  } catch { return 'ko' }
})()
export const EN_ON = LANG === 'en'

const EN = {
  // 게임 이름
  '오스트랄로피테쿠스 키우기': 'Australopithecus Idle RPG',
  // 패시브
  '야수의 본능': 'Beast Instinct', '기본공격 피해 증가': 'Increases basic attack damage',
  '광폭화': 'Frenzy', '공격 속도 증가': 'Increases attack speed',
  '분쇄': 'Crush', '치명타 피해 증가': 'Increases critical damage',
  '전투의 열기': 'Heat of Battle', '적 5마리 처치마다 공격력 증가(최대 5번)': 'Attack up for every 5 kills (stacks up to 5)',
  '사냥꾼의 본능': "Hunter's Instinct", '고기 획득량 증가': 'Increases meat gained',
  '경험의 축복': 'Blessing of Experience', '경험치 획득량 증가': 'Increases EXP gained',
  '전투 시작': 'Battle Cry', '보스와 싸우는 동안 10초마다 공격력 증가(최대 5번)': 'Attack up every 10s while fighting a boss (stacks up to 5)',
  '신속한 훈련': 'Swift Training', '15초마다 공격 속도 증가(최대 5번)': 'Attack speed up every 15s (stacks up to 5)',
  '기본공격 피해 +{0}%': 'Basic attack damage +{0}%', '공격 속도 +{0}%': 'Attack speed +{0}%', '치명타 피해 +{0}%p': 'Critical damage +{0}%p',
  '적 {0}마리 처치마다 공격력 +{1}% (최대 {2}번)': 'Attack +{1}% for every {0} kills (stacks up to {2})',
  '고기 획득량 +{0}%': 'Meat gained +{0}%', '경험치 획득량 +{0}%': 'EXP gained +{0}%',
  '보스와 싸우는 동안 {0}초마다 공격력 +{1}% (최대 {2}번)': 'Attack +{1}% every {0}s while fighting a boss (stacks up to {2})',
  '{0}초마다 공격 속도 +{1}% (최대 {2}번)': 'Attack speed +{1}% every {0}s (stacks up to {2})',
  // 스킬 이름
  '번개 바위': 'Thunder Rock', '전기 작살': 'Shock Harpoon', '할퀴기': 'Claw', '내려치기': 'Ground Slam', '데굴데굴': 'Rolling Charge',
  '로우킥': 'Low Kick', '바위치기': 'Rock Smash', '포효': 'Roar', '바위치기 (강화)': 'Rock Smash+', '바위 회오리': 'Rock Twister',
  '전광석화': 'Lightning Dash', '사신과 함께': 'With the Reaper', '암흑 강타': 'Dark Smash', '뇌전 질주': 'Thunder Rush',
  '회전 폭풍': 'Spinning Storm', '화염 참격': 'Flame Slash', '피폭': 'Blood Burst', '사이오닉 스톰': 'Psionic Storm',
  '궁극의 소용돌이': 'Ultimate Vortex', '회전검객': 'Whirling Blade', '파워 찌르기': 'Power Thrust', '무한검술': 'Endless Blades',
  '번개 토네이도': 'Thunder Tornado', '피의 십자가': 'Blood Cross', '환영': 'Phantoms', '연속 달빛베기': 'Moonlight Flurry',
  '단검비': 'Dagger Rain', '독검': 'Venom Blade', '난도질': 'Blade Frenzy', '순보': 'Flash Step', '불놀이야': 'Fire Dance',
  '토네이도': 'Tornado', '엑스밤': 'X-Bomb', '지각변동': 'Earthquake', '얼음도끼': 'Ice Axe', '회전 도끼': 'Spinning Axe',
  // 스킬 설명
  '적을 날카롭게 할퀸다': 'Slashes the enemy with sharp claws',
  '적에게 발차기를 한다': 'Kicks the enemy',
  '두 팔로 땅을 내리쳐 주변 적들에게 충격을 준다': 'Slams the ground with both arms, shocking nearby enemies',
  '몸을 말아 굴러 들어가 앞의 적들을 들이받는다': 'Curls up and rolls into the enemies ahead',
  '크게 포효해 주변 적들을 뒤흔든다': 'Lets out a mighty roar that shakes nearby enemies',
  '땅을 내려쳐 솟구친 바위로 주변 적들을 친다': 'Slams the ground so rocks burst up into nearby enemies',
  '땅을 내려쳐 불붙은 바위를 터뜨린다': 'Slams the ground and blasts burning rocks',
  '푸른 번개를 두르고 돌진해 앞의 적들을 휩쓴다': 'Charges wrapped in blue lightning, sweeping the enemies ahead',
  '바위를 내리쳐 주변 적들에게 벼락을 떨어뜨린다': 'Strikes a rock to call lightning down on nearby enemies',
  '전기를 두른 작살을 던져 날아가는 길의 적을 모두 꿰뚫는다': 'Hurls an electrified harpoon that pierces every enemy in its path',
  '바위 회오리를 날려 지나가는 적을 모두 휩쓴다': 'Sends a whirl of rocks through every enemy in its path',
  '등 뒤의 사신과 함께 주먹을 퍼부어 주변 적들을 몰아친다': 'Pummels nearby enemies together with the Reaper at your back',
  '번개를 두르고 질주하며 앞의 적들을 후려친다': 'Dashes wrapped in lightning, battering the enemies ahead',
  '어둠을 실은 몽둥이로 바로 앞의 적들을 내려친다': 'Smashes the enemies right in front with a club of darkness',
  '불타는 몽둥이를 연달아 휘둘러 주변 적들을 벤다': 'Swings a burning club again and again at nearby enemies',
  '몽둥이를 들고 회전해 폭풍처럼 주변 적들을 연달아 친다': 'Spins with your club, hitting nearby enemies like a storm',
  '기를 모아 먹구름을 부르고 벼락을 연달아 떨어뜨린다': 'Gathers power to summon storm clouds and rain down lightning',
  '붉은 폭발을 일으켜 화면 안의 적 모두를 휩쓴다': 'Unleashes a crimson blast that engulfs every enemy on screen',
  '불꽃 고리를 두른 도끼를 던져 지나가는 적을 모두 꿰뚫는다': 'Throws an axe ringed in fire that pierces every enemy in its path',
  '얼음 도끼를 두 번 내려찍어 얼음 파편을 터뜨린다': 'Brings an ice axe down twice, bursting into ice shards',
  '불길을 휘감고 돌며 주변 적들을 연달아 태운다': 'Whirls flames around you, burning nearby enemies again and again',
  '던져 올린 도끼가 거대한 칼날이 되어 내리꽂히며 폭발한다': 'A thrown axe becomes a giant blade that crashes down and explodes',
  '뛰어올라 도끼로 땅을 찍어 바위 가시를 솟구치게 한다': 'Leaps and strikes the ground with an axe, raising stone spikes',
  '거대한 회오리를 일으켜 주변 적들을 계속 휘감는다': 'Raises a giant tornado that keeps engulfing nearby enemies',
  '눈에 보이지 않는 속도로 오가며 주변 적들을 벤다': 'Moves faster than the eye can see, cutting down nearby enemies',
  '쌍칼을 휘몰아쳐 가까운 적들을 마구 벤다': 'Whirls twin blades, hacking at enemies up close',
  '독 묻은 칼로 주변 적들을 베고, 베인 적은 5초 동안 중독된다': 'Cuts nearby enemies with a poisoned blade, poisoning them for 5 seconds',
  '분신들을 불러내 주변 적들을 사방에서 벤다': 'Summons phantoms that strike nearby enemies from every side',
  '하늘로 던진 단검을 비처럼 쏟아부어 주변 적들을 꿰뚫는다': 'Throws daggers skyward and rains them down on nearby enemies',
  '초승달 같은 칼날로 가까운 적들을 쉴 새 없이 벤다': 'Cuts enemies up close with crescent blades, nonstop',
  '푸른 기운을 실어 앞으로 멀리 찔러 들어간다': 'Thrusts far ahead with a surge of blue energy',
  '검을 휘두르며 회전해 주변 적들을 벤다': 'Spins with your sword, cutting down nearby enemies',
  '찌르고 내려벤 자리에 피의 십자가를 터뜨린다': 'Stabs and slashes down, bursting a cross of blood',
  '번개를 모아 벤 뒤 번개 기둥으로 주변 적들을 연달아 친다': 'Slashes with gathered lightning, then strikes nearby enemies with lightning pillars',
  '한 적에게 쉴 새 없이 검을 퍼붓는다': 'Rains endless sword strikes on a single enemy',
  '소용돌이로 주변 적을 보스까지 끌어당긴 뒤 한 번에 벤다': 'Pulls nearby enemies, even bosses, into a vortex and cuts them all down',
  '스킬 {0}': 'Skill {0}',
  // 모험 대륙·공룡
  '아프리카': 'Africa', '중동': 'Middle East', '아시아': 'Asia', '유럽': 'Europe', '북아메리카': 'North America',
  '남아메리카': 'South America', '오세아니아': 'Oceania', '그린란드': 'Greenland',
  '스피노사우루스': 'Spinosaurus', '안킬로사우루스': 'Ankylosaurus', '벨로키랍토르': 'Velociraptor', '트리케라톱스': 'Triceratops',
  '티라노': 'T-Rex', '스피노': 'Spino', '스테고': 'Stego', '랩터': 'Raptor', '안킬로': 'Ankylo', '익룡': 'Pterosaur', '브라키오': 'Brachio',
  '티라노사우루스': 'Tyrannosaurus', '브라키오사우루스': 'Brachiosaurus', '프테라노돈': 'Pteranodon', '스테고사우루스': 'Stegosaurus',
  // 장비
  '무기': 'Weapon', '방어구': 'Armor', '유물': 'Relic',
  '일반': 'Common', '고급': 'Uncommon', '레어': 'Rare', '영웅': 'Hero', '전설': 'Legendary', '신화': 'Mythic',
  '공격력': 'Attack', '치명타 피해': 'Crit Damage', '최대 체력': 'Max HP', '받는 피해 감소': 'Damage Reduction', '스킬 피해': 'Skill Damage',
  '고기·경험치 획득량': 'Meat & EXP Gain', '체력 회복(초당)': 'HP Regen (per sec)',
  // 동료
  '헌터': 'Hunter', '주술사': 'Shaman', '힐러': 'Healer', '거인': 'Giant',
  // 일반 몬스터
  '토끼': 'Rabbit', '영양': 'Antelope', '사슴': 'Deer', '멧돼지': 'Boar', '늑대': 'Wolf', '하이에나': 'Hyena', '동굴곰': 'Cave Bear',
  '털코뿔소': 'Woolly Rhino', '매머드': 'Mammoth', '검치호': 'Sabertooth', '원숭이': 'Monkey', '악어': 'Crocodile', '코끼리': 'Elephant',
  '기린': 'Giraffe', '타조': 'Ostrich', '사자': 'Lion', '뱀': 'Snake', '거북이': 'Turtle', '코모도 드래곤': 'Komodo Dragon', '독수리': 'Eagle',
  '돼지': 'Pig', '닭': 'Chicken', '오리': 'Duck', '개구리': 'Frog', '박쥐': 'Bat', '펠리컨': 'Pelican', '사마귀': 'Mantis', '북극곰': 'Polar Bear',
  '알파카': 'Alpaca', '버팔로': 'Buffalo', '낙타': 'Camel', '말': 'Horse', '판다': 'Panda', '전갈': 'Scorpion', '타란툴라': 'Tarantula',
  '킹코브라': 'King Cobra', '얼룩말': 'Zebra', '치타': 'Cheetah', '코알라': 'Koala', '캥거루': 'Kangaroo', '고양이': 'Cat', '개': 'Dog',
  '하마': 'Hippo', '고릴라': 'Gorilla', '앨리게이터': 'Alligator', '다람쥐': 'Squirrel', '펭귄': 'Penguin', '물개': 'Seal', '소': 'Cow', '호랑이': 'Tiger',
  // 이벤트 던전·보스
  '수호자의 성소': "Guardian's Sanctum", '무너진 요새': 'Fallen Fortress', '잊혀진 밀림': 'Forgotten Jungle', '용암의 심장': 'Heart of Lava',
  '저주받은 검치호': 'Cursed Sabertooth', '뇌전 매머드': 'Thunder Mammoth', '암흑 고릴라': 'Dark Gorilla', '용암 곰': 'Lava Bear',
  '독왕 코브라': 'Venom King Cobra', '서리 마수': 'Frost Beast', '뇌전 기린': 'Thunder Giraffe', '수정 코뿔소': 'Crystal Rhino',
  '심연 악어': 'Abyss Crocodile', '맹독 전갈': 'Deadly Scorpion', '바위 골렘': 'Rock Golem', '숲 골렘': 'Forest Golem',
  '용암 골렘': 'Lava Golem', '얼음 골렘': 'Ice Golem', '뇌전 거인': 'Thunder Giant', '원석 골렘': 'Ore Golem',
  '고목 정령': 'Ancient Tree Spirit', '화염 골렘': 'Flame Golem', '빙정 골렘': 'Frost Crystal Golem', '폭풍 정령': 'Storm Spirit',
  // 퀘스트
  '일일 퀘스트': 'Daily', '반복 퀘스트': 'Repeat', '업적': 'Achievements',
  '일일 퀘스트 완료': 'Complete daily quests', '플레이타임': 'Play time', '장비 소환': 'Summon gear', '장비 융합': 'Fuse gear',
  '스테이지 클리어': 'Clear stages', '몬스터 처치': 'Defeat monsters', '스킬 획득': 'Learn skills', '공격력 강화': 'Upgrade Attack',
  '체력 강화': 'Upgrade HP', '치명타 공격력 강화': 'Upgrade Crit Damage', '캐릭터 레벨업': 'Level up', '캐릭터 진화': 'Evolve',
  '스킬 강화': 'Upgrade skills', '장비 강화': 'Upgrade gear', '모험 클리어': 'Clear adventures',
  // 능력치
  '체력': 'HP', '체력 회복': 'HP Regen', '%/초': '%/s', '치명타 확률': 'Crit Rate', '치명타 공격력': 'Crit Damage', '명중률': 'Accuracy',
  '공격 속도': 'Attack Speed', '이동 속도': 'Move Speed', '고기 획득량': 'Meat Gain', '경험치 획득량': 'EXP Gain', '/초': '/s',
  // 진화 단계
  '오스트랄로피테쿠스 (4족보행)': 'Australopithecus (Quadruped)', '오스트랄로피테쿠스 (직립보행)': 'Australopithecus (Upright)',
  '호모 에렉투스': 'Homo erectus', '호모 네안데르탈인': 'Neanderthal', '호모 사피엔스': 'Homo sapiens', '인간': 'Human',
  // 닉네임
  '{0}~{1}자로 정해 주세요': 'Use {0}–{1} characters', '한글·영문·숫자만 쓸 수 있어요': 'Only letters and numbers are allowed',
  '쓸 수 없는 단어가 들어 있어요': "That name contains a word that isn't allowed", '운영자처럼 보이는 닉네임은 쓸 수 없어요': "Names that look like staff aren't allowed",
  '닉네임 정하기': 'Choose Your Name', '닉네임 바꾸기': 'Change Name', '{0}~{1}자 · 한글, 영문, 숫자': '{0}–{1} characters · letters and numbers',
  '닉네임': 'Name', '로그인이 필요해요': 'Please sign in', '이미 쓰고 있는 닉네임이에요': 'That name is already taken',
  '연결이 안 돼요. 잠시 후 다시 해 주세요': "Can't connect. Please try again shortly", '확인 중…': 'Checking…',
  // 전투 알림
  '보스전 나가기': 'Left the boss battle', '시간 초과 — 보스 실패': 'Time up — boss failed', '{0} {1}단계 격파!': '{0} stage {1} cleared!',
  '던전 포기': 'Give Up', '던전 실패 — 쓰러짐': 'Dungeon failed — you fell', '던전 실패 — 시간 초과': 'Dungeon failed — time up',
  '{0} {1}단계 클리어!': '{0} stage {1} cleared!', '모험 포기': 'Adventure abandoned', '모험 실패 — 쓰러짐': 'Adventure failed — you fell',
  '모험 실패 — 시간 초과': 'Adventure failed — time up', '보스 격파!': 'Boss defeated!', '웨이브 {0} 클리어!': 'Wave {0} clear!',
  '쓰러졌다...': 'You fell...', '다시 도전': 'Try Again', '나가기': 'Exit',
  // 클라우드·로그인
  '업로드 보류 — 내 기록 {0} < 클라우드 {1}': 'Upload held — yours {0} < cloud {1}', '저장됨 {0}': 'Saved {0}', '저장 실패: {0}': 'Save failed: {0}',
  '동기화 실패: {0}': 'Sync failed: {0}', '로그인을 취소했어요': 'Sign-in canceled', '로그인 실패: {0}': 'Sign-in failed: {0}',
  '클라우드에 저장이 없어요': 'No cloud save found', '불러오기 실패: {0}': 'Load failed: {0}',
  '로그인 확인 중…': 'Checking sign-in…', 'Google 계정으로 시작': 'Sign in with Google', '저장 기록 불러오는 중…': 'Loading your save…',
  '게임 로드중… {0}%': 'Loading… {0}%',
  // 메뉴
  '클라우드에 저장': 'Save to Cloud', '클라우드 세이브를 불러와 현재 기기 데이터를 덮어씁니다. 계속할까요?': "This loads your cloud save and overwrites this device's data. Continue?",
  '클라우드에서 불러오기': 'Load from Cloud', '로그아웃': 'Sign Out', '구글 로그인 · 저장 연동': 'Sign in with Google · Cloud Save',
  // 웨이브 이동
  '웨이브 이동': 'Go to Wave', '(최고 {0})': '(Best {0})', '이동': 'Go', '최고로': 'Best',
  // 장비 상세
  '강화': 'Upgrade', '융합': 'Fuse', '{0} {1}번': '{0} #{1}', '{0}등급': 'Tier {0}', '장착 효과': 'When Equipped', '보유 효과': 'When Owned',
  '장착중': 'Equipped', '장착': 'Equip', '* 보유 {0} 5개로 다음 단계 제작': '* Fuse 5 of this {0} to craft the next one', '최종 단계 장비입니다': 'This is the final gear',
  // 스킬 상세
  '최대': 'MAX', '패시브': 'Passive', '액티브': 'Active', '강화하면 →': 'Next upgrade →',
  '{0}px 이내의 적 모두에게': 'All enemies within {0}px', '화면 전체의 적 모두에게': 'All enemies on screen', '적 1명에게': 'One enemy',
  '공격력의 {0}%를 {1}회에 나눠 공격': '{0}% of Attack over {1} hits', '공격력의 {0}%로 1회 공격': '{0}% of Attack in 1 hit',
  '쿨타임': 'Cooldown', '{0}초': '{0}s', '타격 수': 'Hits', '{0}회': '{0}', 'Lv.{0} 해금': 'Unlocks at Lv.{0}', '해제': 'Unequip',
  // 프로필
  '고기': 'Meat', '다이아': 'Diamonds', '루비': 'Ruby', '진주': 'Pearls', '강화 큐브': 'Upgrade Cubes',
  '동료 재료 1': 'Ally Material 1', '동료 재료 2': 'Ally Material 2', '동료 재료 3': 'Ally Material 3', '동료 재료 4': 'Ally Material 4',
  '기본 정보': 'Profile', '미장착': 'None', '능력치': 'Stats', '보유 재화': 'Currencies',
  // 모험 창
  '몬스터 정보': 'Monster', '지역 정보': 'Region', '탐험 보상': 'Rewards', '완료': 'Done', '진입': 'Enter', '닫기': 'Close',
  // 동료 상세
  '공격': 'Attack', '히어로 공격력의 {0}%': '{0}% of Hero Attack', '현재 피해': 'Current Damage', '공격 주기': 'Attack Interval',
  '{0}초 · 광역': '{0}s · AoE', '{0}단계': 'Tier {0}', '직접 공격 없음': 'No direct attack', '{0} {1}단계': '{0} Tier {1}', '동료 능력치': 'Ally Stats',
  '히어로에게 부여': 'Bonus to Hero', '최대 레벨': 'Max Level', '레벨 +1': 'Level +1', '재료{0} ×{1}': 'Mat {0} ×{1}', '전직': 'Promote',
  '레벨 {0} 달성 시 다음 단계로 전직할 수 있습니다 (전직 비용 없음)': 'Reach Lv.{0} to promote to the next tier (free)',
  // 이벤트 던전
  '던전 보상': 'Rewards', '진입 {0}/{1}': 'Enter {0}/{1}', '이벤트 던전': 'Event Dungeon', '도전': 'Fight',
  '배경 파일 없음': 'Background missing', '전부 404': 'all 404',
  // 카드·소환·퀘스트
  '스킬 카드 {0}장': 'Skill Cards ×{0}', '확인': 'OK', '퀘스트': 'Quests', '수령 완료': 'Claimed', '레벨 보상': 'Level Reward',
  '10회 소환': 'Summon ×10', '30회 소환': 'Summon ×30',
  // 상단·전투 화면
  '웨이브 {0}': 'Wave {0}', '보스 도전': 'Boss', '랭킹': 'Rank', '(광고 시청 {0}/3)': '(Ads {0}/3)',
  // 영웅 탭
  '성장': 'Growth', '진화': 'Evolve', '공격력 ×{0}': 'Attack ×{0}', '최종 단계': 'Final stage', '스킬포인트': 'Skill Points',
  // 스킬·장비·상점·동료 탭
  '스킬': 'Skills', '장착 {0}': 'Equipped {0}', '일괄 융합': 'Fuse All', '장비': 'Gear', '스킬 카드': 'Skill Cards',
  '스킬 카드 소환': 'Summon Skill Cards', '1회': '×1', '10회': '×10', '{0} 소환': '{0} Summon', '소환 레벨 {0}': 'Summon Lv {0}',
  '광고 (10회)': 'Ad (×10)', '동료': 'Allies',
  // 종료 창
  '게임 종료': 'Exit Game', '게임을 종료할까요?': 'Exit the game?', '취소': 'Cancel', '종료': 'Exit',
  // 오프라인 보상
  '자동 사냥 오프라인 보상': 'Offline Hunting Rewards', '{0}wave · {1}시간 {2}분 · {3}마리': 'Wave {0} · {1}h {2}m · {3} kills',
  '{0}/분': '{0}/min', '받기': 'Claim', '추가 보상': 'Bonus', '(광고)': '(Ad)',
  // 하단 탭
  '모험': 'Adventure', '상점': 'Shop', '{0}웨이브': 'Wave {0}',
}

// 같은 한국어가 자리마다 다른 영어가 돼야 할 때(예: '장착' 버튼 vs '장착' 표시)
export const L = (ko, en) => (EN_ON ? en : ko)
export const T = s => (EN_ON && s != null && EN[s] != null ? EN[s] : s)
// 숫자가 끼는 문장: TF('{0}단계', 3). 한국어는 키 문장에 그대로 채운다
export const TF = (key, ...a) => (EN_ON && EN[key] != null ? EN[key] : key).replace(/\{(\d+)\}/g, (_, i) => (a[+i] ?? ''))
// 영어 큰 숫자 단위: 1만 이상부터 K·M·B·T, 그 뒤 aa·ab…(방치형 게임 관례)
const EN_UNITS = ['', 'K', 'M', 'B', 'T']
export const enUnit = k => k < EN_UNITS.length ? EN_UNITS[k] : (i => String.fromCharCode(97 + Math.floor(i / 26) % 26) + String.fromCharCode(97 + i % 26))(k - EN_UNITS.length)
