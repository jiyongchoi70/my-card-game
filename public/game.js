(() => {
  "use strict";

  const boardEl = document.getElementById("game-board");
  const startButton = document.getElementById("start-button");
  const resetButton = document.getElementById("reset-button");
  const hintButton = document.getElementById("hint-button");
  const moveCountEl = document.getElementById("move-count");
  const timerEl = document.getElementById("timer");
  const scoreListEl = document.getElementById("score-list");
  const playerNameInput = document.getElementById("player-name");
  const resultDialog = document.getElementById("result-dialog");
  const resultMessageEl = document.getElementById("result-message");
  const hintDialog = document.getElementById("hint-dialog");
  const hintMessageEl = document.getElementById("hint-message");
  const cardTemplate = document.getElementById("card-template");

  const fallBackConfig = {
    supabaseUrl: null,
    supabaseAnonKey: null,
    hintEndpoint: null
  };

  const config = window.APP_CONFIG ? { ...fallBackConfig, ...window.APP_CONFIG } : fallBackConfig;
  const canUseSupabase = Boolean(config.supabaseUrl && config.supabaseAnonKey);
  const canUseHint = Boolean(config.hintEndpoint);
  const SCORES_TABLE = "card_flip_scores";

  const CARD_FACES = [
    "\uD83C\uDF4E",
    "\uD83C\uDF4A",
    "\uD83C\uDF47",
    "\uD83C\uDF49",
    "\uD83E\uDD5D",
    "\uD83C\uDF53",
    "\uD83C\uDF4D",
    "\uD83C\uDF51"
  ];

  const gameState = {
    deck: [],
    flippedIndices: [],
    matchedIndices: new Set(),
    isBusy: false,
    moves: 0,
    startTime: null,
    timerInterval: null
  };

  function createDeck() {
    const pairFaces = [...CARD_FACES, ...CARD_FACES];
    return shuffle(pairFaces);
  }

  function shuffle(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  function resetGameState() {
    clearInterval(gameState.timerInterval);
    Object.assign(gameState, {
      deck: [],
      flippedIndices: [],
      matchedIndices: new Set(),
      isBusy: false,
      moves: 0,
      startTime: null,
      timerInterval: null
    });

    moveCountEl.textContent = "이동: 0";
    timerEl.textContent = "시간: 00:00";
    boardEl.innerHTML = "";
  }

  function startGame() {
    const playerName = playerNameInput.value.trim();
    if (!playerName) {
      alert("플레이어 이름을 먼저 입력해주세요.");
      return;
    }
    resetGameState();

    gameState.deck = createDeck();
    renderBoard();
    moveCountEl.textContent = "이동: 0";
    startTimer();

    startButton.disabled = true;
    resetButton.disabled = false;
    hintButton.disabled = !canUseHint;
    playerNameInput.disabled = true;
  }

  function startTimer() {
    gameState.startTime = Date.now();
    timerEl.textContent = "시간: 00:00";
    gameState.timerInterval = setInterval(() => {
      if (!gameState.startTime) return;
      const elapsed = Date.now() - gameState.startTime;
      timerEl.textContent = `시간: ${formatTime(elapsed)}`;
    }, 1000);
  }

  function stopTimer() {
    if (gameState.timerInterval) {
      clearInterval(gameState.timerInterval);
      gameState.timerInterval = null;
    }
  }

  function renderBoard() {
    const fragment = document.createDocumentFragment();

    gameState.deck.forEach((face, index) => {
      const cardNode = cardTemplate.content.firstElementChild.cloneNode(true);
      cardNode.dataset.index = String(index);
      cardNode.querySelector(".card-front").textContent = face;
      cardNode.addEventListener("click", onCardClick);
      fragment.appendChild(cardNode);
    });

    boardEl.innerHTML = "";
    boardEl.appendChild(fragment);
  }

  function onCardClick(event) {
    const button = event.currentTarget;
    const index = Number(button.dataset.index);

    if (gameState.isBusy || gameState.flippedIndices.includes(index) || gameState.matchedIndices.has(index)) {
      return;
    }

    flipCard(button, index);

    gameState.flippedIndices.push(index);

    if (gameState.flippedIndices.length === 2) {
      gameState.isBusy = true;
      gameState.moves += 1;
      moveCountEl.textContent = `이동: ${gameState.moves}`;

      const [firstIndex, secondIndex] = gameState.flippedIndices;
      const isMatch = gameState.deck[firstIndex] === gameState.deck[secondIndex];

      if (isMatch) {
        setMatched(firstIndex, secondIndex);
      } else {
        setTimeout(() => unflipCards(firstIndex, secondIndex), 900);
      }
    }
  }

  function flipCard(cardButton, index) {
    cardButton.classList.add("is-flipped");
    cardButton.setAttribute("aria-pressed", "true");
  }

  function getCardButton(index) {
    return boardEl.querySelector(`.card[data-index="${index}"]`);
  }

  function setMatched(firstIndex, secondIndex) {
    gameState.matchedIndices.add(firstIndex);
    gameState.matchedIndices.add(secondIndex);

    [firstIndex, secondIndex].forEach((i) => {
      const button = getCardButton(i);
      if (button) {
        button.classList.add("is-matched");
        button.classList.add("is-locked");
        button.setAttribute("aria-disabled", "true");
        button.tabIndex = -1;
      }
    });

    gameState.flippedIndices = [];
    gameState.isBusy = false;

    checkForWin();
  }

  function unflipCards(firstIndex, secondIndex) {
    [firstIndex, secondIndex].forEach((i) => {
      const button = getCardButton(i);
      if (button) {
        button.classList.remove("is-flipped");
        button.setAttribute("aria-pressed", "false");
      }
    });

    gameState.flippedIndices = [];
    gameState.isBusy = false;
  }

  function checkForWin() {
    if (gameState.matchedIndices.size === gameState.deck.length) {
      stopTimer();
      const elapsed = gameState.startTime ? Date.now() - gameState.startTime : 0;
      const playerName = playerNameInput.value.trim();
      const summary = `플레이어: ${playerName}\n이동 횟수: ${gameState.moves}\n소요 시간: ${formatTime(elapsed)}`;
      resultMessageEl.textContent = summary.replace(/\n/g, " ");
      resultDialog.showModal();

      hintButton.disabled = true;
      startButton.disabled = false;
      resetButton.disabled = true;
      playerNameInput.disabled = false;

      if (canUseSupabase) {
        submitScore({
          playerName,
          moves: gameState.moves,
          durationMs: elapsed
        });
      }
    }
  }

  async function submitScore({ playerName, moves, durationMs }) {
    try {
      const payload = {
        player_name: playerName,
        attempts: moves,
        matches: gameState.deck.length,
        elapsed_seconds: Math.round(durationMs / 1000)
      };

      const response = await fetch(`${config.supabaseUrl}/rest/v1/${SCORES_TABLE}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: config.supabaseAnonKey,
          Authorization: `Bearer ${config.supabaseAnonKey}`,
          Prefer: "return=minimal"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Supabase insert failed (${response.status})`);
      }

      fetchScores();
    } catch (error) {
      console.error(error);
      alert("점수 저장 중 오류가 발생했습니다. 콘솔을 확인해주세요.");
    }
  }

  async function fetchScores() {
    if (!canUseSupabase) {
      scoreListEl.innerHTML = "<li class=\"empty\">Supabase를 설정하면 기록이 표시됩니다.</li>";
      return;
    }

    try {
      scoreListEl.innerHTML = "<li class=\"empty\">기록을 불러오는 중...</li>";
      const url = new URL(`${config.supabaseUrl}/rest/v1/${SCORES_TABLE}`);
      url.searchParams.set("select", "*");
      url.searchParams.set("order", "completed_at.desc");
      url.searchParams.set("limit", "10");

      const response = await fetch(url, {
        headers: {
          apikey: config.supabaseAnonKey,
          Authorization: `Bearer ${config.supabaseAnonKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Supabase fetch failed (${response.status})`);
      }

      const rows = await response.json();
      renderScores(rows);
    } catch (error) {
      console.error(error);
      scoreListEl.innerHTML = "<li class=\"empty\">기록을 불러오지 못했습니다.</li>";
    }
  }

  function renderScores(rows) {
    if (!rows.length) {
      scoreListEl.innerHTML = "<li class=\"empty\">아직 기록이 없습니다. 첫 승리를 기록해보세요!</li>";
      return;
    }

    const fragment = document.createDocumentFragment();
    rows.forEach((row) => {
      const li = document.createElement("li");
      const attempts = typeof row.attempts === "number" ? row.attempts : (typeof row.moves === "number" ? row.moves : "-");
      const matches = typeof row.matches === "number" ? row.matches : "-";
      const elapsedSeconds = typeof row.elapsed_seconds === "number" ? row.elapsed_seconds : null;
      const duration = elapsedSeconds !== null ? formatTime(elapsedSeconds * 1000) : "-";
      const completedAt = row.completed_at || row.created_at || null;
      const created = completedAt ? new Date(completedAt).toLocaleString() : "-";

      const nameEl = document.createElement("strong");
      nameEl.textContent = row.player_name;

      const metaEl = document.createElement("span");
      metaEl.className = "meta";

      const statsLine = document.createElement("span");
      statsLine.textContent = `시도 ${attempts} • 매치 ${matches} • 시간 ${duration}`;

      const dateLine = document.createElement("span");
      dateLine.textContent = created;

      metaEl.append(statsLine, dateLine);
      li.append(nameEl, metaEl);
      fragment.appendChild(li);
    });

    scoreListEl.innerHTML = "";
    scoreListEl.appendChild(fragment);
  }

  async function requestHint() {
    if (!canUseHint) {
      return;
    }

    try {
      hintButton.disabled = true;
      hintButton.textContent = "요청 중...";

      const payload = {
        deck: gameState.deck,
        matchedIndices: Array.from(gameState.matchedIndices),
        flippedIndices: [...gameState.flippedIndices],
        moves: gameState.moves
      };

      const response = await fetch(config.hintEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Hint request failed (${response.status})`);
      }

      const data = await response.json();
      const message = data.hint || data.message || "힌트를 받아오지 못했습니다.";
      hintMessageEl.textContent = message;
      hintDialog.showModal();
    } catch (error) {
      console.error(error);
      alert("힌트를 가져오는 중 문제가 발생했습니다.");
    } finally {
      hintButton.disabled = false;
      hintButton.textContent = "힌트";
    }
  }

  function resetGame() {
    stopTimer();
    resetGameState();
    renderBoard();
    startButton.disabled = false;
    resetButton.disabled = true;
    hintButton.disabled = true;
    playerNameInput.disabled = false;
  }

  function initialize() {
    resetGameState();
    renderBoard();

    startButton.addEventListener("click", startGame);
    resetButton.addEventListener("click", resetGame);
    hintButton.addEventListener("click", requestHint);

    if (canUseSupabase) {
      fetchScores();
    } else {
      scoreListEl.innerHTML = "<li class=\"empty\">Supabase를 설정하면 기록이 표시됩니다.</li>";
    }

    if (!canUseHint) {
      hintButton.title = "힌트를 사용하려면 config.js에서 hintEndpoint를 설정하세요.";
    }
  }

  document.addEventListener("DOMContentLoaded", initialize);
})();
