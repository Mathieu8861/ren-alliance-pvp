/* ============================================ */
/* Alliance REN - Machine a Sous 3D            */
/* Theme : Dieu Enutrof (richesse, or, mines)  */
/* Three.js + GSAP + Supabase RPC              */
/* ============================================ */
(function () {
    'use strict';

    console.log('[REN-SLOT] Module charge');

    /* === CONFIGURATION === */
    var SYMBOLES = ['enutrof', 'kamas', 'pelle', 'coffre', 'pepite', 'jeton'];
    var MISES = [1, 5, 10, 25, 50];
    var miseIndex = 1; /* demarre a 5 */
    var isSpinning = false;

    /* Mapping symbole -> image (placeholders, remplacables) */
    var SYMBOLE_IMAGES = {
        enutrof: 'assets/images/dieu_ecaflip.png',  /* placeholder → sera dieu_enutrof.png */
        kamas: 'assets/images/pile_de_kamas.png',
        pelle: 'assets/images/jeton.png',            /* placeholder */
        coffre: 'assets/images/pepite.png',          /* placeholder */
        pepite: 'assets/images/pepite.png',
        jeton: 'assets/images/jeton.png'
    };

    var SYMBOLE_COLORS = {
        enutrof: '#d4a017',
        kamas: '#f39c12',
        pelle: '#95a5a6',
        coffre: '#e67e22',
        pepite: '#2ecc71',
        jeton: '#e84444'
    };

    /* === THREE.JS VARIABLES === */
    var scene, camera, renderer;
    var reels = []; /* 3 groupes de rouleaux */
    var reelStrips = []; /* les bandes de symboles */
    var machineMesh; /* cadre machine */
    var clock;
    var canvasWrap;
    var animationId;

    /* Parametres rouleaux */
    var REEL_COUNT = 3;
    var SYMBOLS_PER_REEL = 12; /* nombre de symboles sur la bande */
    var SYMBOL_HEIGHT = 1.2;
    var VISIBLE_SYMBOLS = 1; /* 1 symbole visible par rouleau */

    /* Etat du spin */
    var targetSymbols = []; /* symboles cibles du serveur */
    var currentOffsets = [0, 0, 0]; /* offset Y actuel de chaque rouleau */

    document.addEventListener('ren:ready', init);

    /* ============================================ */
    /* INIT                                         */
    /* ============================================ */
    async function init() {
        console.log('[REN-SLOT] init()');
        if (!window.REN.supabase || !window.REN.currentProfile) {
            console.warn('[REN-SLOT] Supabase ou profile manquant');
            return;
        }

        canvasWrap = document.getElementById('slot-canvas-wrap');
        if (!canvasWrap) return;

        updateSoldeDisplay();
        updateMiseDisplay();
        setupControls();
        initThreeJS();
        buildMachine();
        animate();
        loadHistory();
    }

    /* ============================================ */
    /* THREE.JS SETUP                               */
    /* ============================================ */
    function initThreeJS() {
        var width = canvasWrap.clientWidth;
        var height = canvasWrap.clientHeight;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1b1e);
        scene.fog = new THREE.Fog(0x1a1b1e, 8, 20);

        camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        camera.position.set(0, 0.5, 6);
        camera.lookAt(0, 0, 0);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        canvasWrap.appendChild(renderer.domElement);

        /* Lumieres */
        var ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambientLight);

        var mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
        mainLight.position.set(2, 4, 3);
        mainLight.castShadow = true;
        scene.add(mainLight);

        /* Spots rouges REN */
        var spotLeft = new THREE.SpotLight(0xdb2929, 1.5, 12, Math.PI / 6, 0.5);
        spotLeft.position.set(-3, 3, 4);
        spotLeft.target.position.set(0, 0, 0);
        scene.add(spotLeft);
        scene.add(spotLeft.target);

        var spotRight = new THREE.SpotLight(0xdb2929, 1.5, 12, Math.PI / 6, 0.5);
        spotRight.position.set(3, 3, 4);
        spotRight.target.position.set(0, 0, 0);
        scene.add(spotRight);
        scene.add(spotRight.target);

        /* Spot dore central (Enutrof vibe) */
        var spotGold = new THREE.SpotLight(0xd4a017, 0.8, 10, Math.PI / 4, 0.6);
        spotGold.position.set(0, 4, 2);
        spotGold.target.position.set(0, 0, 0);
        scene.add(spotGold);
        scene.add(spotGold.target);

        clock = new THREE.Clock();

        /* Resize handler */
        window.addEventListener('resize', onResize);
    }

    function onResize() {
        if (!canvasWrap || !camera || !renderer) return;
        var w = canvasWrap.clientWidth;
        var h = canvasWrap.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    }

    /* ============================================ */
    /* BUILD MACHINE                                */
    /* ============================================ */
    function buildMachine() {
        /* Sol reflectif */
        var floorGeo = new THREE.PlaneGeometry(20, 20);
        var floorMat = new THREE.MeshStandardMaterial({
            color: 0x111215,
            roughness: 0.8,
            metalness: 0.2
        });
        var floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -2;
        floor.receiveShadow = true;
        scene.add(floor);

        /* Cadre de la machine */
        buildFrame();

        /* Rouleaux */
        for (var i = 0; i < REEL_COUNT; i++) {
            buildReel(i);
        }
    }

    function buildFrame() {
        var frameMat = new THREE.MeshStandardMaterial({
            color: 0x2a2a2e,
            roughness: 0.3,
            metalness: 0.9
        });

        var goldMat = new THREE.MeshStandardMaterial({
            color: 0xd4a017,
            roughness: 0.2,
            metalness: 1.0,
            emissive: 0xd4a017,
            emissiveIntensity: 0.15
        });

        /* Cadre principal */
        var frameGroup = new THREE.Group();

        /* Panneau arriere */
        var backPanel = new THREE.Mesh(
            new THREE.BoxGeometry(5.5, 3.5, 0.2),
            frameMat
        );
        backPanel.position.z = -0.6;
        backPanel.castShadow = true;
        frameGroup.add(backPanel);

        /* Montants gauche/droite */
        var sideGeo = new THREE.BoxGeometry(0.15, 3.5, 1.5);
        var sideLeft = new THREE.Mesh(sideGeo, frameMat);
        sideLeft.position.set(-2.65, 0, 0.1);
        sideLeft.castShadow = true;
        frameGroup.add(sideLeft);

        var sideRight = new THREE.Mesh(sideGeo, frameMat);
        sideRight.position.set(2.65, 0, 0.1);
        sideRight.castShadow = true;
        frameGroup.add(sideRight);

        /* Barre du haut */
        var topBar = new THREE.Mesh(
            new THREE.BoxGeometry(5.5, 0.15, 1.5),
            frameMat
        );
        topBar.position.set(0, 1.75, 0.1);
        topBar.castShadow = true;
        frameGroup.add(topBar);

        /* Barre du bas */
        var bottomBar = new THREE.Mesh(
            new THREE.BoxGeometry(5.5, 0.15, 1.5),
            frameMat
        );
        bottomBar.position.set(0, -1.75, 0.1);
        frameGroup.add(bottomBar);

        /* Bordures dorees */
        var goldTrim = new THREE.Mesh(
            new THREE.BoxGeometry(5.6, 0.08, 1.6),
            goldMat
        );
        goldTrim.position.set(0, 1.83, 0.1);
        frameGroup.add(goldTrim);

        var goldTrimBottom = new THREE.Mesh(
            new THREE.BoxGeometry(5.6, 0.08, 1.6),
            goldMat
        );
        goldTrimBottom.position.set(0, -1.83, 0.1);
        frameGroup.add(goldTrimBottom);

        /* Separateurs entre rouleaux (doré) */
        for (var i = 0; i < 2; i++) {
            var sep = new THREE.Mesh(
                new THREE.BoxGeometry(0.05, 3.0, 0.8),
                goldMat
            );
            sep.position.set(-0.85 + i * 1.7, 0, 0.3);
            frameGroup.add(sep);
        }

        /* Ligne de gain (barre horizontale doree) */
        var payline = new THREE.Mesh(
            new THREE.BoxGeometry(5.2, 0.03, 0.05),
            new THREE.MeshStandardMaterial({
                color: 0xd4a017,
                emissive: 0xd4a017,
                emissiveIntensity: 0.5
            })
        );
        payline.position.set(0, 0, 0.75);
        frameGroup.add(payline);

        scene.add(frameGroup);
        machineMesh = frameGroup;
    }

    function buildReel(index) {
        var reelGroup = new THREE.Group();
        var xPos = (index - 1) * 1.7; /* -1.7, 0, 1.7 */
        reelGroup.position.set(xPos, 0, 0);

        var strip = [];

        for (var i = 0; i < SYMBOLS_PER_REEL; i++) {
            var symbolName = SYMBOLES[i % SYMBOLES.length];
            var symbolMesh = createSymbolMesh(symbolName, i);
            var yPos = i * SYMBOL_HEIGHT;
            symbolMesh.position.y = yPos;
            reelGroup.add(symbolMesh);
            strip.push({ mesh: symbolMesh, symbol: symbolName, index: i });
        }

        scene.add(reelGroup);
        reels.push(reelGroup);
        reelStrips.push(strip);
    }

    function createSymbolMesh(symbolName) {
        var group = new THREE.Group();
        var color = SYMBOLE_COLORS[symbolName] || 0xffffff;

        /* Fond du symbole */
        var bgGeo = new THREE.PlaneGeometry(1.2, 1.0);
        var bgMat = new THREE.MeshStandardMaterial({
            color: 0x1a1b1e,
            roughness: 0.9,
            side: THREE.DoubleSide
        });
        var bg = new THREE.Mesh(bgGeo, bgMat);
        bg.position.z = 0.01;
        group.add(bg);

        /* Icone du symbole — forme geometrique coloree */
        var iconGeo;
        var iconMat = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.3,
            roughness: 0.4,
            metalness: 0.6
        });

        switch (symbolName) {
            case 'enutrof':
                /* Etoile / diamant (jackpot) */
                iconGeo = new THREE.OctahedronGeometry(0.3, 0);
                break;
            case 'kamas':
                /* Piece de monnaie */
                iconGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.06, 16);
                break;
            case 'pelle':
                /* Cube (placeholder pelle) */
                iconGeo = new THREE.BoxGeometry(0.35, 0.35, 0.1);
                break;
            case 'coffre':
                /* Coffre = boite */
                iconGeo = new THREE.BoxGeometry(0.4, 0.3, 0.2);
                break;
            case 'pepite':
                /* Pepite = dodecahedre */
                iconGeo = new THREE.DodecahedronGeometry(0.25, 0);
                break;
            case 'jeton':
                /* Jeton = torus */
                iconGeo = new THREE.TorusGeometry(0.2, 0.08, 8, 16);
                break;
            default:
                iconGeo = new THREE.SphereGeometry(0.25, 16, 16);
        }

        var icon = new THREE.Mesh(iconGeo, iconMat);
        icon.position.z = 0.15;
        icon.castShadow = true;

        /* Rotation pour les pieces */
        if (symbolName === 'kamas') {
            icon.rotation.x = Math.PI / 2;
        }

        group.add(icon);
        group.userData = { symbolName: symbolName, icon: icon };

        return group;
    }

    /* ============================================ */
    /* ANIMATION LOOP                               */
    /* ============================================ */
    function animate() {
        animationId = requestAnimationFrame(animate);

        /* Legere rotation des icones au repos */
        reelStrips.forEach(function (strip) {
            strip.forEach(function (item) {
                if (item.mesh.userData.icon && !isSpinning) {
                    item.mesh.userData.icon.rotation.y += 0.005;
                }
            });
        });

        renderer.render(scene, camera);
    }

    /* ============================================ */
    /* SPIN LOGIC                                   */
    /* ============================================ */
    async function doSpin() {
        if (isSpinning) return;

        var mise = MISES[miseIndex];
        var jetons = window.REN.currentProfile.jetons || 0;

        if (jetons < mise) {
            window.REN.toast('Pas assez de jetons ! (' + jetons + '/' + mise + ')', 'error');
            return;
        }

        isSpinning = true;
        var btn = document.getElementById('btn-spin');
        if (btn) btn.disabled = true;

        /* Cacher le resultat precedent */
        var resultEl = document.getElementById('slot-result');
        if (resultEl) resultEl.style.display = 'none';

        /* Appel RPC serveur */
        var spinResult;
        try {
            var { data, error } = await window.REN.supabase.rpc('jouer_slot', { p_mise: mise });
            if (error) throw error;
            spinResult = data;
        } catch (err) {
            console.error('[REN-SLOT] Erreur RPC:', err);
            window.REN.toast('Erreur : ' + (err.message || 'Impossible de jouer'), 'error');
            isSpinning = false;
            if (btn) btn.disabled = false;
            return;
        }

        /* Mettre a jour le solde localement */
        window.REN.currentProfile.jetons = spinResult.nouveau_solde;
        updateSoldeDisplay();

        /* Animer les rouleaux vers les symboles cibles */
        targetSymbols = spinResult.symboles;
        await animateReels(targetSymbols);

        /* Afficher le resultat */
        showResult(spinResult);

        /* Historique */
        addHistoryItem(spinResult, mise);

        /* Effets de gain */
        if (spinResult.multiplicateur >= 10) {
            showJackpotModal(spinResult);
            launchConfetti();
            animateWinGlow();
        } else if (spinResult.multiplicateur > 0) {
            animateWinGlow();
        }

        isSpinning = false;
        if (btn) btn.disabled = false;
    }

    /* ============================================ */
    /* REEL ANIMATION (GSAP)                        */
    /* ============================================ */
    function animateReels(symbols) {
        return new Promise(function (resolve) {
            var totalDuration = 0;

            symbols.forEach(function (targetSymbol, reelIndex) {
                var targetIndex = SYMBOLES.indexOf(targetSymbol);
                if (targetIndex === -1) targetIndex = 0;

                /* Calculer la position Y cible */
                var totalHeight = SYMBOLS_PER_REEL * SYMBOL_HEIGHT;
                /* Nombre de tours complets + position finale */
                var spins = 3 + reelIndex; /* plus de tours pour chaque rouleau suivant */
                var targetY = -(spins * totalHeight + targetIndex * SYMBOL_HEIGHT);

                var delay = reelIndex * 0.3;
                var duration = 1.5 + reelIndex * 0.5;

                if (delay + duration > totalDuration) {
                    totalDuration = delay + duration;
                }

                /* Animer le groupe du rouleau */
                gsap.fromTo(reels[reelIndex].position, {
                    y: 0
                }, {
                    y: targetY % totalHeight,
                    duration: duration,
                    delay: delay,
                    ease: 'back.out(1.2)',
                    onUpdate: function () {
                        /* Boucler les symboles : remettre en haut ceux qui sortent */
                        var reel = reels[reelIndex];
                        reel.children.forEach(function (child) {
                            var worldY = child.position.y + reel.position.y;
                            if (worldY < -SYMBOL_HEIGHT * 2) {
                                child.position.y += totalHeight;
                            } else if (worldY > totalHeight) {
                                child.position.y -= totalHeight;
                            }
                        });
                    }
                });

                /* Rotation rapide des icones pendant le spin */
                reelStrips[reelIndex].forEach(function (item) {
                    if (item.mesh.userData.icon) {
                        gsap.to(item.mesh.userData.icon.rotation, {
                            y: '+=' + (Math.PI * 4 * (spins + 1)),
                            duration: duration,
                            delay: delay,
                            ease: 'power2.out'
                        });
                    }
                });
            });

            setTimeout(resolve, totalDuration * 1000 + 200);
        });
    }

    /* ============================================ */
    /* WIN EFFECTS                                  */
    /* ============================================ */
    function animateWinGlow() {
        /* Flash dore sur la scene */
        var flash = new THREE.PointLight(0xffd700, 3, 10);
        flash.position.set(0, 0, 3);
        scene.add(flash);

        gsap.to(flash, {
            intensity: 0,
            duration: 1.5,
            ease: 'power2.out',
            onComplete: function () {
                scene.remove(flash);
            }
        });

        /* Camera shake */
        var origPos = { x: camera.position.x, y: camera.position.y };
        gsap.to(camera.position, {
            x: origPos.x + 0.05,
            y: origPos.y + 0.05,
            duration: 0.05,
            repeat: 10,
            yoyo: true,
            ease: 'none',
            onComplete: function () {
                camera.position.x = origPos.x;
                camera.position.y = origPos.y;
            }
        });
    }

    function showResult(result) {
        var resultEl = document.getElementById('slot-result');
        var symbolsEl = document.getElementById('slot-result-symbols');
        var gainEl = document.getElementById('slot-result-gain');
        if (!resultEl || !symbolsEl || !gainEl) return;

        /* Symboles en images 2D */
        var html = '';
        result.symboles.forEach(function (s) {
            var img = SYMBOLE_IMAGES[s] || 'assets/images/jeton.png';
            html += '<img src="' + img + '" alt="' + s + '" title="' + s + '">';
        });
        symbolsEl.innerHTML = html;

        /* Gain */
        if (result.gain > 0) {
            var cls = result.multiplicateur >= 10 ? 'slot-result__gain--jackpot' : 'slot-result__gain--win';
            gainEl.className = 'slot-result__gain ' + cls;
            gainEl.textContent = '+' + result.gain + ' jetons (x' + result.multiplicateur + ')';
        } else {
            gainEl.className = 'slot-result__gain slot-result__gain--lose';
            gainEl.textContent = 'Pas de gain';
        }

        resultEl.style.display = 'block';
    }

    /* ============================================ */
    /* JACKPOT MODAL                                */
    /* ============================================ */
    function showJackpotModal(result) {
        var overlay = document.getElementById('modal-jackpot');
        var title = document.getElementById('jackpot-title');
        var body = document.getElementById('jackpot-body');
        if (!overlay || !body) return;

        var isTriple = result.multiplicateur >= 50;
        if (title) title.textContent = isTriple ? 'JACKPOT !!!' : 'GROS GAIN !';

        var html = '';
        html += '<div class="jackpot-symbols">';
        result.symboles.forEach(function (s) {
            var img = SYMBOLE_IMAGES[s] || 'assets/images/jeton.png';
            html += '<img src="' + img + '" alt="' + s + '">';
        });
        html += '</div>';
        html += '<div class="jackpot-amount">+' + result.gain + ' jetons</div>';
        html += '<p class="text-muted">Multiplicateur x' + result.multiplicateur + '</p>';

        body.innerHTML = html;
        overlay.classList.add('active');

        /* Auto-fermeture */
        setTimeout(function () {
            overlay.classList.remove('active');
        }, 5000);

        /* Close button */
        var closeBtn = document.getElementById('jackpot-close');
        if (closeBtn) {
            closeBtn.onclick = function () {
                overlay.classList.remove('active');
            };
        }

        /* Clic overlay */
        overlay.onclick = function (e) {
            if (e.target === overlay) overlay.classList.remove('active');
        };
    }

    /* ============================================ */
    /* CONFETTI                                     */
    /* ============================================ */
    function launchConfetti() {
        var container = document.getElementById('confetti-container');
        if (!container) return;

        var colors = ['#d4a017', '#ffd700', '#db2929', '#e84444', '#ffffff', '#f39c12'];
        for (var i = 0; i < 50; i++) {
            var confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = (Math.random() * 0.8) + 's';
            confetti.style.animationDuration = (2 + Math.random() * 1.5) + 's';
            confetti.style.width = (6 + Math.random() * 6) + 'px';
            confetti.style.height = (6 + Math.random() * 6) + 'px';
            container.appendChild(confetti);
        }

        setTimeout(function () { container.innerHTML = ''; }, 5000);
    }

    /* ============================================ */
    /* CONTROLS                                     */
    /* ============================================ */
    function setupControls() {
        var btnSpin = document.getElementById('btn-spin');
        var btnUp = document.getElementById('mise-up');
        var btnDown = document.getElementById('mise-down');

        if (btnSpin) {
            btnSpin.addEventListener('click', doSpin);
        }

        if (btnUp) {
            btnUp.addEventListener('click', function () {
                if (miseIndex < MISES.length - 1) {
                    miseIndex++;
                    updateMiseDisplay();
                }
            });
        }

        if (btnDown) {
            btnDown.addEventListener('click', function () {
                if (miseIndex > 0) {
                    miseIndex--;
                    updateMiseDisplay();
                }
            });
        }
    }

    function updateMiseDisplay() {
        var el = document.getElementById('mise-value');
        if (el) el.textContent = MISES[miseIndex];
    }

    function updateSoldeDisplay() {
        var el = document.getElementById('slot-solde');
        if (el && window.REN.currentProfile) {
            el.textContent = window.REN.currentProfile.jetons || 0;
        }
    }

    /* ============================================ */
    /* HISTORIQUE                                    */
    /* ============================================ */
    async function loadHistory() {
        var container = document.getElementById('slot-history-list');
        if (!container) return;

        try {
            var { data, error } = await window.REN.supabase
                .from('slot_historique')
                .select('*')
                .eq('joueur_id', window.REN.currentProfile.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            if (!data || data.length === 0) return;

            container.innerHTML = '';
            data.forEach(function (item) {
                container.innerHTML += buildHistoryItemHtml(item);
            });
        } catch (err) {
            console.error('[REN-SLOT] Erreur historique:', err);
        }
    }

    function addHistoryItem(result, mise) {
        var container = document.getElementById('slot-history-list');
        if (!container) return;

        /* Retirer le placeholder si present */
        var placeholder = container.querySelector('.text-muted');
        if (placeholder) container.innerHTML = '';

        var item = {
            resultat: result.symboles,
            gain_jetons: result.gain,
            mise: mise,
            created_at: new Date().toISOString()
        };

        var html = buildHistoryItemHtml(item);
        container.insertAdjacentHTML('afterbegin', html);

        /* Limiter a 20 items */
        var items = container.querySelectorAll('.slot-history-item');
        if (items.length > 20) {
            items[items.length - 1].remove();
        }
    }

    function buildHistoryItemHtml(item) {
        var time = new Date(item.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        var symboles = item.resultat || [];
        var gain = item.gain_jetons || 0;

        var html = '<div class="slot-history-item">';
        html += '<div class="slot-history-item__left">';
        html += '<span class="slot-history-item__time">' + time + '</span>';
        html += '<span class="slot-history-item__symbols">';
        symboles.forEach(function (s) {
            var img = SYMBOLE_IMAGES[s] || 'assets/images/jeton.png';
            html += '<img src="' + img + '" alt="' + s + '">';
        });
        html += '</span>';
        html += '</div>';

        if (gain > 0) {
            html += '<span class="slot-history-item__gain slot-history-item__gain--win">+' + gain + '</span>';
        } else {
            html += '<span class="slot-history-item__gain slot-history-item__gain--lose">-' + (item.mise || 0) + '</span>';
        }
        html += '</div>';

        return html;
    }

    /* ============================================ */
    /* UTILS                                        */
    /* ============================================ */
    function sleep(ms) {
        return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }
})();
