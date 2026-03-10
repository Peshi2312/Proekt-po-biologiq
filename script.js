const player = document.getElementById("player");
const gameArea = document.getElementById("gameArea");
const scoreEl = document.getElementById("score");

let playerX = 280;
let score = 0;

const trashTypes = ["пластмаса", "хартия", "органика"];
const trashColors = {
    "пластмаса": "red",
    "хартия": "yellow",
    "органика": "green"
};
let trashList = [];

// Движение на играча
document.addEventListener("keydown", (e) => {
    if(e.key === "ArrowLeft" && playerX > 0) playerX -= 20;
    if(e.key === "ArrowRight" && playerX < 550) playerX += 20;
    player.style.left = playerX + "px";
});

// Създаване на отпадъци
function addTrash() {
    const type = trashTypes[Math.floor(Math.random() * trashTypes.length)];
    const trash = document.createElement("div");
    trash.classList.add("trash");
    trash.style.backgroundColor = trashColors[type];
    trash.style.left = Math.floor(Math.random() * 570) + "px";
    trash.style.top = "0px";
    trash.dataset.type = type;
    gameArea.appendChild(trash);
    trashList.push(trash);
}

// Движение на отпадъците
function moveTrash() {
    for(let i = trashList.length - 1; i >= 0; i--) {
        const t = trashList[i];
        t.style.top = (parseInt(t.style.top) + 3) + "px";

        // Проверка за събиране
        if(parseInt(t.style.top) + 30 >= 350 && 
           parseInt(t.style.left) + 30 > playerX && 
           parseInt(t.style.left) < playerX + 50) {
            score++;
            gameArea.removeChild(t);
            trashList.splice(i, 1);
        }
        // Проверка за изпускане
        else if(parseInt(t.style.top) > 400) {
            score--;
            gameArea.removeChild(t);
            trashList.splice(i, 1);
        }
    }
    scoreEl.textContent = "Точки: " + score;
}

// Основен цикъл
setInterval(() => {
    addTrash();
}, 1500);

setInterval(() => {
    moveTrash();
}, 20);