<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>רבי עקיבא Pro - הגרסה הסופית</title>
    <style>
        body { margin: 0; overflow: hidden; background: #000; font-family: 'Segoe UI', sans-serif; touch-action: none; }
        #ui {
            position: absolute; top: 10px; right: 10px;
            color: #fff; background: rgba(0,0,0,0.85);
            padding: 15px; border-right: 5px solid #ffcc00; border-radius: 8px;
            pointer-events: none; z-index: 100; font-weight: bold; font-size: 16px; text-align: right;
        }
        #controls {
            position: absolute; bottom: 30px; left: 30px;
            display: grid; grid-template-columns: repeat(3, 80px); grid-gap: 10px; z-index: 100;
        }
        .btn {
            width: 80px; height: 80px; background: rgba(255,255,255,0.1);
            border: 2px solid rgba(255,255,255,0.3); border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            color: white; font-size: 35px; user-select: none;
        }
        .btn:active { transform: scale(0.9); background: rgba(255,255,255,0.2); }
        #alert {
            position: absolute; top: 20%; left: 50%; transform: translateX(-50%);
            color: #ff0000; font-size: 30px; font-weight: bold; display: none; z-index: 1000;
            text-shadow: 2px 2px #000; text-align: center; pointer-events: none;
        }
        @media (min-width: 1024px) { #controls { display: none; } }
    </style>
</head>
<body>

    <div id="alert">ניידת משטרה במרדף! 🚔</div>
    <div id="ui">
        <strong>רחוב רבי עקיבא - לילה סוער</strong><br>
        עבירות: <span id="violation-count">0</span>/3<br>
        <small>מקש רווח לצופר | זהירות על הולכי הרגל!</small>
    </div>

    <div id="controls">
        <div id="up" class="btn" style="grid-column: 2;">↑</div>
        <div id="left" class="btn" style="grid-column: 1; grid-row: 2;">←</div>
        <div id="down" class="btn" style="grid-column: 2; grid-row: 2;">↓</div>
        <div id="right" class="btn" style="grid-column: 3; grid-row: 2;">→</div>
        <div id="horn" class="btn" style="grid-column: 3; grid-row: 1;">📢</div>
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r152/three.min.js"></script>

    <script>
        // --- Setup ---
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x020205);
        scene.fog = new THREE.Fog(0x000000, 10, 400);

        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);

        const ambLight = new THREE.AmbientLight(0x202035, 0.5);
        scene.add(ambLight);

        // --- Road & Rain ---
        const road = new THREE.Mesh(new THREE.PlaneGeometry(60, 2000), new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.1 }));
        road.rotation.x = -Math.PI / 2; scene.add(road);

        const rainGeo = new THREE.BufferGeometry();
        const rainPos = new Float32Array(5000 * 3);
        for(let i=0; i<15000; i+=3) { rainPos[i]=(Math.random()-0.5)*200; rainPos[i+1]=Math.random()*100; rainPos[i+2]=(Math.random()-0.5)*600; }
        rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
        const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0x888888, size: 0.1 }));
        scene.add(rain);

        // --- Traffic & Pedestrians ---
        let violationCount = 0;
        let trafficState = "GREEN";
        const INTERSECTIONS = [-600, -300, 0, 300, 600];
        const lights = [];
        const pedestrians = [];

        function createPedestrian(z) {
            const g = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 1.2, 4, 8), new THREE.MeshStandardMaterial({color: 0x111111}));
            g.position.set(-35, 1, z + (Math.random()-0.5)*10);
            g.userData = { speed: 0.1 + Math.random()*0.05, active: false, targetZ: z };
            scene.add(g);
            pedestrians.push(g);
        }

        function createLight(z) {
            const g = new THREE.Group();
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 10), new THREE.MeshStandardMaterial({color: 0x111}));
            pole.position.y = 5; g.add(pole);
            const r = new THREE.Mesh(new THREE.SphereGeometry(0.4), new THREE.MeshBasicMaterial({color: 0x200})); r.position.set(0, 10, 0.7); g.add(r);
            const gr = new THREE.Mesh(new THREE.SphereGeometry(0.4), new THREE.MeshBasicMaterial({color: 0x020})); gr.position.set(0, 8, 0.7); g.add(gr);
            g.position.set(28, 0, z); scene.add(g);
            lights.push({r, gr});
            createPedestrian(z);
        }
        INTERSECTIONS.forEach(createLight);

        // --- Police ---
        const police = new THREE.Group();
        const pBody = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.5, 4.8), new THREE.MeshStandardMaterial({color: 0xeee}));
        pBody.position.y = 0.75; police.add(pBody);
        const pLight = new THREE.PointLight(0xff0000, 0, 40); pLight.position.y = 2; police.add(pLight);
        police.position.set(100, 0, 0); scene.add(police);

        // --- Player ---
        const player = new THREE.Group();
        const car = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 4.8), new THREE.MeshStandardMaterial({color: 0x0044ff}));
        car.position.y = 0.7; player.add(car);
        const hornLight = new THREE.PointLight(0xffff00, 0, 10); hornLight.position.set(0, 1, 2.5); player.add(hornLight);
        player.userData = { speed: 0, angle: 0 };
        scene.add(player);

        // --- Input ---
        const keys = {};
        window.onkeydown = e => keys[e.code] = true;
        window.onkeyup = e => keys[e.code] = false;

        function animate() {
            requestAnimationFrame(animate);

            // Traffic & Pedestrian Logic
            const cycle = Date.now() % 12000;
            trafficState = (cycle < 7000) ? "GREEN" : "RED";
            
            lights.forEach(l => {
                l.r.material.color.set(trafficState === "RED" ? 0xff0000 : 0x220000);
                l.gr.material.color.set(trafficState === "GREEN" ? 0x00ff00 : 0x002200);
            });

            pedestrians.forEach(p => {
                if (trafficState === "RED") {
                    p.position.x += p.userData.speed;
                    if (p.position.x > 35) p.position.x = -35;
                }
            });

            // Player movement
            if(keys['ArrowUp'] || keys['KeyW']) player.userData.speed += 0.02;
            if(keys['ArrowDown'] || keys['KeyS']) player.userData.speed -= 0.02;
            player.userData.speed *= 0.96;
            if(Math.abs(player.userData.speed) > 0.01) {
                if(keys['ArrowLeft'] || keys['KeyA']) player.userData.angle += 0.035;
                if(keys['ArrowRight'] || keys['KeyD']) player.userData.angle -= 0.035;
            }
            player.position.x += Math.sin(player.userData.angle) * player.userData.speed;
            player.position.z += Math.cos(player.userData.angle) * player.userData.speed;
            player.rotation.y = player.userData.angle;

            // Horn & Violation
            hornLight.intensity = (keys['Space'] || keys['Space']) ? 5 : 0;
            if(trafficState === "RED" && !player.userData.violated) {
                INTERSECTIONS.forEach(z => {
                    if(Math.abs(player.position.z - z) < 8) {
                        violationCount++; player.userData.violated = true;
                        document.getElementById('violation-count').innerText = Math.min(violationCount, 3);
                        setTimeout(() => player.userData.violated = false, 2000);
                    }
                });
            }

            if(violationCount >= 3) {
                document.getElementById('alert').style.display = 'block';
                police.position.lerp(new THREE.Vector3(player.position.x, 0, player.position.z - 12), 0.04);
                police.lookAt(player.position);
                pLight.intensity = Math.sin(Date.now()*0.01) > 0 ? 15 : 0;
                pLight.color.set(Math.sin(Date.now()*0.01) > 0 ? 0xff0000 : 0x0000ff);
            }

            camera.position.set(player.position.x - Math.sin(player.userData.angle)*15, 8, player.position.z - Math.cos(player.userData.angle)*15);
            camera.lookAt(player.position.x, 2, player.position.z);
            renderer.render(scene, camera);
        }
        animate();
    </script>
</body>
</html>
