const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const uiElements = {
    start: document.getElementById('start-screen'),
    gameOver: document.getElementById('game-over-screen'),
    leaderboard: document.getElementById('leaderboard-screen'),
    pause: document.getElementById('pause-screen'),
    hud: document.getElementById('hud'),
    score: document.getElementById('score'),
    healthFill: document.getElementById('health-bar-fill'),
    finalScore: document.getElementById('final-score'),
    leaderboardList: document.getElementById('leaderboard-list'),
    playerNameInput: document.getElementById('player-name'),
    playerShapeInput: document.getElementById('player-shape')
};

// Resize Canvas
function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const keys = {};
window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'Escape') {
        if (game.state === 'PLAYING') {
            game.pause();
        } else if (game.state === 'PAUSED') {
            game.resume();
        }
    }
});
window.addEventListener('keyup', e => keys[e.code] = false);

// Utility
const randomRange = (min, max) => Math.random() * (max - min) + min;

// Entities
class Player {
    constructor() {
        this.width = 30;
        this.height = 40;
        this.x = canvas.width / 2;
        this.y = canvas.height - 80;
        this.speed = 300; // pixels per second
        this.color = '#00f3ff';
        this.health = 100;
        this.maxHealth = 100;
        this.weaponLevel = 0; // 0: Laser, 1: Dual, 2: Plasma
        this.lastShot = 0;
        this.shotCooldown = 250; // ms
        this.boostTimer = 0;
        this.shape = uiElements.playerShapeInput ? uiElements.playerShapeInput.value : 'triangle';
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = this.color;
        
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;

        // Draw Spaceship
        ctx.beginPath();
        if (this.shape === 'circle') {
            ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
        } else if (this.shape === 'square') {
            ctx.rect(-this.width / 2, -this.height / 2, this.width, this.height);
        } else {
            // Triangle
            ctx.moveTo(0, -this.height / 2);
            ctx.lineTo(this.width / 2, this.height / 2);
            ctx.lineTo(-this.width / 2, this.height / 2);
        }
        ctx.closePath();
        ctx.fill();

        // Engine glow
        ctx.fillStyle = '#ff1818';
        ctx.beginPath();
        ctx.arc(0, this.height / 2 + 5, 5 + Math.random() * 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();

        if (this.boostTimer > 0) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.strokeStyle = '#ffe100';
            ctx.lineWidth = 4;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ffe100';
            ctx.beginPath();
            ctx.arc(0, 0, this.width, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    update(dt) {
        if (this.boostTimer > 0) {
            this.boostTimer -= dt;
        }
        let currentSpeed = this.boostTimer > 0 ? this.speed * 2 : this.speed;

        if ((keys['KeyA'] || keys['ArrowLeft']) && this.x > this.width / 2) this.x -= currentSpeed * dt;
        if ((keys['KeyD'] || keys['ArrowRight']) && this.x < canvas.width - this.width / 2) this.x += currentSpeed * dt;
        if ((keys['KeyW'] || keys['ArrowUp']) && this.y > this.height / 2) this.y -= currentSpeed * dt;
        if ((keys['KeyS'] || keys['ArrowDown']) && this.y < canvas.height - this.height / 2) this.y += currentSpeed * dt;

        // Weapon switching
        if (keys['Digit1']) this.setWeapon(0);
        if (keys['Digit2']) this.setWeapon(1);
        if (keys['Digit3']) this.setWeapon(2);

        // Shooting
        if (keys['Space']) this.shoot();
    }

    setWeapon(level) {
        this.weaponLevel = level;
        document.querySelectorAll('.weapon').forEach(el => el.classList.remove('active'));
        const wpns = ['wpn-laser', 'wpn-dual', 'wpn-plasma'];
        document.getElementById(wpns[level]).classList.add('active');
        
        if (level === 0) this.shotCooldown = 250;
        if (level === 1) this.shotCooldown = 200;
        if (level === 2) this.shotCooldown = 400;
    }

    shoot() {
        const now = Date.now();
        if (now - this.lastShot > this.shotCooldown) {
            this.lastShot = now;
            if (this.weaponLevel === 0) {
                game.projectiles.push(new Projectile(this.x, this.y - this.height/2, 0, -500, '#00f3ff', 1, false));
            } else if (this.weaponLevel === 1) {
                game.projectiles.push(new Projectile(this.x - 10, this.y - this.height/2, 0, -600, '#ff00ea', 1, false));
                game.projectiles.push(new Projectile(this.x + 10, this.y - this.height/2, 0, -600, '#ff00ea', 1, false));
            } else if (this.weaponLevel === 2) {
                game.projectiles.push(new Projectile(this.x, this.y - this.height/2, 0, -400, '#39ff14', 3, true));
            }
        }
    }
}

class Projectile {
    constructor(x, y, vx, vy, color, damage, piercing) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = piercing ? 8 : 4;
        this.color = color;
        this.damage = damage;
        this.piercing = piercing;
        this.markedForDeletion = false;
        this.hitEnemies = new Set(); // For piercing
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        if (this.y < -50 || this.y > canvas.height + 50 || this.x < -50 || this.x > canvas.width + 50) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Enemy {
    constructor(type) {
        this.type = type; // 0 = Basic, 1 = Zigzag, 2 = Tank
        this.radius = type === 2 ? 25 : 15;
        this.x = randomRange(this.radius, canvas.width - this.radius);
        this.y = -50;
        this.time = randomRange(0, 100);
        this.markedForDeletion = false;

        if (type === 0) {
            this.hp = 1;
            this.speed = randomRange(100, 200);
            this.color = '#ff1818';
            this.score = 10;
        } else if (type === 1) {
            this.hp = 2;
            this.speed = 150;
            this.color = '#ff00ea';
            this.score = 20;
            this.amplitude = randomRange(30, 80);
            this.frequency = randomRange(2, 5);
            this.startX = this.x;
        } else if (type === 2) {
            this.hp = 5;
            this.speed = 60;
            this.color = '#ffa500';
            this.score = 50;
        }
    }

    update(dt) {
        this.time += dt;
        this.y += this.speed * dt;

        if (this.type === 1) {
            this.x = this.startX + Math.sin(this.time * this.frequency) * this.amplitude;
        }

        if (this.y > canvas.height + 50) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;

        ctx.beginPath();
        if (this.type === 0) {
            ctx.moveTo(0, this.radius);
            ctx.lineTo(-this.radius, -this.radius);
            ctx.lineTo(this.radius, -this.radius);
            ctx.closePath();
        } else if (this.type === 1) {
            // Diamond
            ctx.moveTo(0, -this.radius);
            ctx.lineTo(this.radius, 0);
            ctx.lineTo(0, this.radius);
            ctx.lineTo(-this.radius, 0);
            ctx.closePath();
        } else if (this.type === 2) {
            // Hexagon
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i;
                const px = Math.cos(angle) * this.radius;
                const py = Math.sin(angle) * this.radius;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
        }
        ctx.stroke();
        
        // HP indicator for tank
        if (this.type === 2) {
             ctx.fillStyle = '#fff';
             ctx.font = '12px Orbitron';
             ctx.textAlign = 'center';
             ctx.textBaseline = 'middle';
             ctx.fillText(this.hp, 0, 0);
        }

        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = randomRange(-100, 100);
        this.vy = randomRange(-100, 100);
        this.size = randomRange(2, 5);
        this.color = color;
        this.life = 1; // 1 second
        this.maxLife = 1;
        this.markedForDeletion = false;
    }
    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= dt;
        if (this.life <= 0) this.markedForDeletion = true;
    }
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
    }
}

class Star {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speed = this.size * 20;
    }
    update(dt) {
        this.y += this.speed * dt;
        if (this.y > canvas.height) {
            this.y = 0;
            this.x = Math.random() * canvas.width;
        }
    }
    draw(ctx) {
        ctx.fillStyle = 'rgba(255, 255, 255, ' + (this.size / 3) + ')';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI*2);
        ctx.fill();
    }
}

class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        // 0: Heal, 1: Weapon Upgrade, 2: Boost
        this.type = type;
        this.radius = 12;
        this.vy = 80;
        this.color = type === 0 ? '#39ff14' : type === 1 ? '#00f3ff' : '#ffe100';
        this.markedForDeletion = false;
        this.angle = 0;
    }
    update(dt) {
        this.y += this.vy * dt;
        this.angle += 3 * dt;
        if (this.y > canvas.height + 20) this.markedForDeletion = true;
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = 'transparent';
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.rect(-this.radius, -this.radius, this.radius*2, this.radius*2);
        ctx.stroke();

        ctx.fillStyle = this.color;
        ctx.font = '14px Orbitron';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.rotate(-this.angle); // keep text upright
        ctx.fillText(this.type === 0 ? 'H' : this.type === 1 ? 'W' : 'B', 0, 0);
        ctx.restore();
    }
}

// Game State
class Game {
    constructor() {
        this.player = new Player();
        this.projectiles = [];
        this.enemies = [];
        this.particles = [];
        this.powerups = [];
        this.stars = Array.from({length: 100}, () => new Star());
        
        this.score = 0;
        this.state = 'MENU'; // MENU, PLAYING, GAMEOVER
        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = 1.0; 
        
        this.lastTime = performance.now();
        requestAnimationFrame(t => this.loop(t));
    }

    pause() {
        this.state = 'PAUSED';
        uiElements.pause.classList.remove('hidden');
    }

    resume() {
        this.state = 'PLAYING';
        this.lastTime = performance.now();
        uiElements.pause.classList.add('hidden');
    }

    start() {
        this.player = new Player();
        this.projectiles = [];
        this.enemies = [];
        this.particles = [];
        this.powerups = [];
        this.score = 0;
        this.enemySpawnInterval = 1.5;
        this.state = 'PLAYING';
        
        uiElements.score.innerText = this.score;
        this.updateHealthBar();
        
        uiElements.start.classList.add('hidden');
        uiElements.gameOver.classList.add('hidden');
        uiElements.leaderboard.classList.add('hidden');
        uiElements.hud.classList.remove('hidden');
    }

    loop(timestamp) {
        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        // Cap dt to prevent massive jumps if tab is inactive
        if (dt < 0.1) {
            this.update(dt);
            this.draw();
        }
        
        requestAnimationFrame(t => this.loop(t));
    }

    update(dt) {
        this.stars.forEach(s => s.update(dt));

        if (this.state !== 'PLAYING') return;

        this.player.update(dt);

        // Spawn Enemies
        this.enemySpawnTimer += dt;
        if (this.enemySpawnTimer >= this.enemySpawnInterval) {
            this.enemySpawnTimer = 0;
            this.enemySpawnInterval = Math.max(0.3, this.enemySpawnInterval - 0.01);
            
            let type = 0;
            const r = Math.random();
            if (r > 0.8) type = 2;
            else if (r > 0.5) type = 1;
            this.enemies.push(new Enemy(type));
        }

        this.projectiles.forEach(p => p.update(dt));
        this.enemies.forEach(e => e.update(dt));
        this.particles.forEach(p => p.update(dt));
        this.powerups.forEach(p => p.update(dt));

        this.checkCollisions();

        this.projectiles = this.projectiles.filter(p => !p.markedForDeletion);
        this.enemies = this.enemies.filter(e => !e.markedForDeletion);
        this.particles = this.particles.filter(p => !p.markedForDeletion);
        this.powerups = this.powerups.filter(p => !p.markedForDeletion);
    }

    createExplosion(x, y, color, count = 10) {
        for(let i=0; i<count; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    }

    checkCollisions() {
        // Projectiles hits enemies
        this.projectiles.forEach(p => {
            if (p.markedForDeletion) return;
            this.enemies.forEach(e => {
                if (e.markedForDeletion) return;
                if (p.piercing && p.hitEnemies.has(e)) return;

                const dx = p.x - e.x;
                const dy = p.y - e.y;
                const dist = Math.hypot(dx, dy);

                if (dist < p.radius + e.radius) {
                    e.hp -= p.damage;
                    this.createExplosion(p.x, p.y, p.color, 5);
                    
                    if (p.piercing) {
                        p.hitEnemies.add(e);
                    } else {
                        p.markedForDeletion = true;
                    }

                    if (e.hp <= 0) {
                        e.markedForDeletion = true;
                        this.score += e.score;
                        uiElements.score.innerText = this.score;
                        this.createExplosion(e.x, e.y, e.color, 20);

                        // Drop powerup from every destroyed enemy
                        let rnd = Math.random();
                        let pType = rnd < 0.4 ? 0 : rnd < 0.8 ? 1 : 2;
                        this.powerups.push(new PowerUp(e.x, e.y, pType));
                    }
                }
            });
        });

        // Player hits enemies
        this.enemies.forEach(e => {
            if (e.markedForDeletion) return;
            const dx = this.player.x - e.x;
            const dy = this.player.y - e.y;
            const dist = Math.hypot(dx, dy);
            if (dist < this.player.width/2 + e.radius) {
                e.markedForDeletion = true;
                this.createExplosion(e.x, e.y, e.color, 20);
                if (this.player.boostTimer > 0) {
                    this.score += e.score;
                    uiElements.score.innerText = this.score;
                } else {
                    this.takeDamage(20);
                }
            }
        });

        // Player hits powerup
        this.powerups.forEach(p => {
            if (p.markedForDeletion) return;
            const dx = this.player.x - p.x;
            const dy = this.player.y - p.y;
            if (Math.hypot(dx, dy) < this.player.width/2 + p.radius) {
                p.markedForDeletion = true;
                if (p.type === 0) {
                    this.player.health = Math.min(this.player.maxHealth, this.player.health + 30);
                    this.updateHealthBar();
                } else if (p.type === 1) {
                    this.player.setWeapon((this.player.weaponLevel + 1) % 3);
                } else if (p.type === 2) {
                    this.player.boostTimer = 5.0; // 5 seconds of boost
                }
                this.createExplosion(p.x, p.y, p.color, 15);
            }
        });
    }

    takeDamage(amount) {
        this.player.health -= amount;
        this.updateHealthBar();
        // Screen shake or flash could go here

        if (this.player.health <= 0) {
            this.gameOver();
        }
    }

    updateHealthBar() {
        const pct = Math.max(0, (this.player.health / this.player.maxHealth) * 100);
        uiElements.healthFill.style.width = pct + '%';
    }

    gameOver() {
        this.state = 'GAMEOVER';
        this.createExplosion(this.player.x, this.player.y, this.player.color, 50);
        
        uiElements.hud.classList.add('hidden');
        uiElements.gameOver.classList.remove('hidden');
        uiElements.finalScore.innerText = this.score;

        this.submitScore();
    }

    async submitScore() {
        let name = uiElements.playerNameInput.value.trim() || 'Anonymous';
        try {
            await fetch('/api/scores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, score: this.score })
            });
        } catch (err) {
            console.error('Failed to submit score', err);
        }
    }

    async showLeaderboard() {
        this.state = 'MENU';
        uiElements.start.classList.add('hidden');
        uiElements.gameOver.classList.add('hidden');
        uiElements.hud.classList.add('hidden');
        uiElements.leaderboard.classList.remove('hidden');

        uiElements.leaderboardList.innerHTML = '<li>Loading...</li>';
        
        try {
            const res = await fetch('/api/scores');
            const scores = await res.json();
            uiElements.leaderboardList.innerHTML = '';
            scores.forEach((s, idx) => {
                const li = document.createElement('li');
                li.innerHTML = `<span>${idx + 1}. ${s.name}</span><span>${s.score}</span>`;
                uiElements.leaderboardList.appendChild(li);
            });
        } catch (err) {
            uiElements.leaderboardList.innerHTML = '<li>Error loading scores</li>';
        }
    }

    draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        this.stars.forEach(s => s.draw(ctx));
        if (this.state === 'PLAYING' && this.player.health > 0) {
            this.player.draw(ctx);
        }
        
        this.powerups.forEach(p => p.draw(ctx));
        this.projectiles.forEach(p => p.draw(ctx));
        this.enemies.forEach(e => e.draw(ctx));
        this.particles.forEach(p => p.draw(ctx));
    }
}

const game = new Game();

// Setup UI Buttons
document.getElementById('start-btn').addEventListener('click', () => game.start());
document.getElementById('restart-btn').addEventListener('click', () => game.start());
document.getElementById('view-leaderboard-btn').addEventListener('click', () => game.showLeaderboard());
document.getElementById('go-leaderboard-btn').addEventListener('click', () => game.showLeaderboard());
document.getElementById('resume-btn').addEventListener('click', () => game.resume());
document.getElementById('pause-leaderboard-btn').addEventListener('click', () => game.showLeaderboard());
document.getElementById('back-btn').addEventListener('click', () => {
    uiElements.leaderboard.classList.add('hidden');
    uiElements.pause.classList.add('hidden');
    uiElements.start.classList.remove('hidden');
});
