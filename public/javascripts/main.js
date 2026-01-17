document.addEventListener('DOMContentLoaded', () => {
  const loader = document.querySelector('[data-loader]');
  if (loader) {
    const tilesWrap = loader.querySelector('[data-loader-tiles]');
    const tileSize = 128;
    if (tilesWrap) {
      const cols = Math.ceil(window.innerWidth / tileSize);
      const rows = Math.ceil(window.innerHeight / tileSize);
      tilesWrap.style.gridTemplateColumns = `repeat(${cols}, ${tileSize}px)`;
      tilesWrap.style.gridTemplateRows = `repeat(${rows}, ${tileSize}px)`;
      const count = cols * rows;
      for (let i = 0; i < count; i++) {
        const tile = document.createElement('div');
        tile.className = 'loader-tile';
        tile.style.setProperty('--delay', `${Math.random() * 2}s`);
        tilesWrap.appendChild(tile);
      }
    }
    setTimeout(() => loader.classList.add('is-text-fade'), 1000);
    setTimeout(() => loader.classList.add('is-tiles'), 2000);
    setTimeout(() => {
      loader.classList.add('is-hidden');
      setTimeout(() => loader.remove(), 200);
    }, 5000);
  }

  const bgCanvas = document.querySelector('[data-bg-gl]');
  if (bgCanvas && window.THREE) {
    const BG_CONFIG = {
      minCount: 40,
      maxCount: 120,
      density: 22000,
      maxPixelRatio: 1.8,
      colors: [0x0a0f1a, 0xe7edf5, 0x1a2f86],
      clearColor: 0x05070c,
      fogColor: 0x05070c,
      fogNear: 12,
      fogFar: 32,
      coreRadius: 0.32,
      armRadius: 0.24,
      armLength: 1.1,
      driftSpeed: 0.12,
      rotationSpeed: 0.18,
      bounds: { x: 8.5, y: 6, z: 7.5 },
      cameraRadius: 10,
      cameraSpeed: 0.08,
      cameraBob: 0.35,
    };

    const renderer = new window.THREE.WebGLRenderer({
      canvas: bgCanvas,
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, BG_CONFIG.maxPixelRatio));
    renderer.setClearColor(BG_CONFIG.clearColor, 1);
    renderer.outputColorSpace = window.THREE.SRGBColorSpace;

    const scene = new window.THREE.Scene();
    scene.fog = new window.THREE.Fog(BG_CONFIG.fogColor, BG_CONFIG.fogNear, BG_CONFIG.fogFar);

    const camera = new window.THREE.PerspectiveCamera(35, 1, 0.1, 60);

    const ambient = new window.THREE.AmbientLight(0xffffff, 0.35);
    scene.add(ambient);
    const keyLight = new window.THREE.DirectionalLight(0x9bb3ff, 1.1);
    keyLight.position.set(6, 6, 4);
    scene.add(keyLight);
    const rimLight = new window.THREE.PointLight(0x4b6bff, 1.2, 30);
    rimLight.position.set(-6, -3, -4);
    scene.add(rimLight);

    const count = Math.min(
      BG_CONFIG.maxCount,
      Math.max(
        BG_CONFIG.minCount,
        Math.floor((window.innerWidth * window.innerHeight) / BG_CONFIG.density)
      )
    );

    const material = new window.THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.6,
      roughness: 0.18,
      vertexColors: true,
    });

    const coreGeometry = new window.THREE.SphereGeometry(BG_CONFIG.coreRadius, 16, 16);
    const armGeometry = new window.THREE.CylinderGeometry(
      BG_CONFIG.armRadius,
      BG_CONFIG.armRadius,
      BG_CONFIG.armLength,
      16,
      1
    );
    const armGeometryX = armGeometry.clone();
    armGeometryX.rotateZ(Math.PI / 2);
    const armGeometryZ = armGeometry.clone();
    armGeometryZ.rotateX(Math.PI / 2);

    const coreMesh = new window.THREE.InstancedMesh(coreGeometry, material, count);
    const armMeshY = new window.THREE.InstancedMesh(armGeometry, material, count);
    const armMeshX = new window.THREE.InstancedMesh(armGeometryX, material, count);
    const armMeshZ = new window.THREE.InstancedMesh(armGeometryZ, material, count);
    [coreMesh, armMeshX, armMeshY, armMeshZ].forEach((mesh) => {
      mesh.instanceMatrix.setUsage(window.THREE.DynamicDrawUsage);
      scene.add(mesh);
    });

    const palette = BG_CONFIG.colors.map((hex) => new window.THREE.Color(hex));
    const states = [];
    const dummy = new window.THREE.Object3D();

    for (let i = 0; i < count; i += 1) {
      const color = palette[Math.floor(Math.random() * palette.length)];
      coreMesh.setColorAt(i, color);
      armMeshX.setColorAt(i, color);
      armMeshY.setColorAt(i, color);
      armMeshZ.setColorAt(i, color);

      states.push({
        position: new window.THREE.Vector3(
          (Math.random() - 0.5) * BG_CONFIG.bounds.x * 2,
          (Math.random() - 0.5) * BG_CONFIG.bounds.y * 2,
          (Math.random() - 0.5) * BG_CONFIG.bounds.z * 2
        ),
        velocity: new window.THREE.Vector3(
          (Math.random() - 0.5) * BG_CONFIG.driftSpeed,
          (Math.random() - 0.5) * BG_CONFIG.driftSpeed,
          (Math.random() - 0.5) * BG_CONFIG.driftSpeed
        ),
        rotation: new window.THREE.Euler(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        ),
        rotationSpeed: new window.THREE.Vector3(
          (Math.random() - 0.5) * BG_CONFIG.rotationSpeed,
          (Math.random() - 0.5) * BG_CONFIG.rotationSpeed,
          (Math.random() - 0.5) * BG_CONFIG.rotationSpeed
        ),
      });
    }
    coreMesh.instanceColor.needsUpdate = true;
    armMeshX.instanceColor.needsUpdate = true;
    armMeshY.instanceColor.needsUpdate = true;
    armMeshZ.instanceColor.needsUpdate = true;

    const resize = () => {
      const { clientWidth, clientHeight } = bgCanvas;
      renderer.setSize(clientWidth, clientHeight, false);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize);

    const clock = new window.THREE.Clock();
    let animationId = null;

    const animate = () => {
      const delta = Math.min(clock.getDelta(), 0.05);
      const time = clock.getElapsedTime();

      const orbit = time * BG_CONFIG.cameraSpeed;
      camera.position.set(
        Math.cos(orbit) * BG_CONFIG.cameraRadius,
        Math.sin(time * 0.3) * BG_CONFIG.cameraBob + 0.5,
        Math.sin(orbit) * BG_CONFIG.cameraRadius
      );
      camera.lookAt(0, 0, 0);

      states.forEach((state, index) => {
        state.position.addScaledVector(state.velocity, delta * 60);
        state.rotation.x += state.rotationSpeed.x * delta;
        state.rotation.y += state.rotationSpeed.y * delta;
        state.rotation.z += state.rotationSpeed.z * delta;

        if (state.position.x > BG_CONFIG.bounds.x) state.position.x = -BG_CONFIG.bounds.x;
        if (state.position.x < -BG_CONFIG.bounds.x) state.position.x = BG_CONFIG.bounds.x;
        if (state.position.y > BG_CONFIG.bounds.y) state.position.y = -BG_CONFIG.bounds.y;
        if (state.position.y < -BG_CONFIG.bounds.y) state.position.y = BG_CONFIG.bounds.y;
        if (state.position.z > BG_CONFIG.bounds.z) state.position.z = -BG_CONFIG.bounds.z;
        if (state.position.z < -BG_CONFIG.bounds.z) state.position.z = BG_CONFIG.bounds.z;

        dummy.position.copy(state.position);
        dummy.rotation.set(state.rotation.x, state.rotation.y, state.rotation.z);
        dummy.updateMatrix();
        coreMesh.setMatrixAt(index, dummy.matrix);
        armMeshX.setMatrixAt(index, dummy.matrix);
        armMeshY.setMatrixAt(index, dummy.matrix);
        armMeshZ.setMatrixAt(index, dummy.matrix);
      });

      coreMesh.instanceMatrix.needsUpdate = true;
      armMeshX.instanceMatrix.needsUpdate = true;
      armMeshY.instanceMatrix.needsUpdate = true;
      armMeshZ.instanceMatrix.needsUpdate = true;

      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };
    animate();

    const cleanup = () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      coreGeometry.dispose();
      armGeometry.dispose();
      armGeometryX.dispose();
      armGeometryZ.dispose();
      material.dispose();
      renderer.dispose();
    };
    window.addEventListener('beforeunload', cleanup);
  }

  const images = Array.from(document.querySelectorAll('.hero-bg-image'));
  let imageIndex = 0;
  let phraseIndex = 0;

  if (images.length > 1) {
    setInterval(() => {
      images[imageIndex].classList.remove('is-active');
      imageIndex = (imageIndex + 1) % images.length;
      images[imageIndex].classList.add('is-active');
    }, 3000);
  }

  const heroBoxes = Array.from(document.querySelectorAll('.hero-boxes .hero-box'));
  const heroBoxesWrap = document.querySelector('.hero-boxes');
  if (heroBoxesWrap) {
    const phrases = JSON.parse(heroBoxesWrap.dataset.phrases || '[]');
    if (phrases.length) {
      const faceOrder = ['front', 'right', 'back', 'left', 'top', 'bottom'];
      const rotations = [
        { x: 0, y: 0 },
        { x: 0, y: -90 },
        { x: 0, y: -180 },
        { x: 0, y: -270 },
        { x: -90, y: 0 },
        { x: 90, y: 0 },
      ];
      const baseTilt = { x: -10, y: 10, z: 0 };
      const setXYRotation = (inner, rotX, rotY, baseY, immediate) => {
        if (immediate) {
          inner.style.transition = 'none';
        } else {
          inner.style.transition = 'transform 0.7s ease';
        }
        inner.style.transform = `rotateX(${baseTilt.x + rotX}deg) rotateY(${baseY + rotY}deg)`;
        if (immediate) {
          inner.offsetHeight;
          inner.style.transition = 'transform 0.7s ease';
        }
      };
      const setZRotation = (inner, rotZ, duration) => {
        inner.style.transition = `transform ${duration}ms ease`;
        inner.style.transform = `rotateZ(${baseTilt.z + rotZ}deg)`;
      };
      const faceState = heroBoxes.map(() => 0);

      heroBoxes.forEach((box, index) => {
        box.style.zIndex = String(100 - index);
      });

      const setBoxesForPhrase = (phrase) => {
        const chars = Array.from(phrase || '');
        heroBoxes.forEach((box, index) => {
          const char = chars[index] || '';
          const inner = box.querySelector('.hero-box-inner');
          const rotator = box.querySelector('.hero-box-rot');
          if (!inner || !rotator) {
            return;
          }
          const prevFace = faceState[index];
          const nextFace = (prevFace + 1) % faceOrder.length;
          const faceClass = `.hero-box-${faceOrder[nextFace]} span`;
          const target = box.querySelector(faceClass);
          if (target) {
            target.textContent = char;
          }
          faceState[index] = nextFace;
          const rot = rotations[nextFace];
          const prevRot = rotations[prevFace];
          const movingToX = rot.x !== 0 || prevRot.x !== 0;
          const isXFace = rot.x !== 0;
          const isBottomFace = nextFace === 5;
          const baseZ = isBottomFace ? -10 : (isXFace ? 10 : baseTilt.z);
          const baseY = isXFace ? 0 : baseTilt.y;
          const isZFadeStep =
            (prevFace === 3 && nextFace === 4) ||
            (prevFace === 4 && nextFace === 5) ||
            (prevFace === 5 && nextFace === 0);
          const zDuration = isZFadeStep ? 900 : 700;

          if (movingToX) {
            setXYRotation(inner, prevRot.x, 0, baseY, true);
            requestAnimationFrame(() => {
              setXYRotation(inner, rot.x, 0, baseY, false);
            });
          } else {
            setXYRotation(inner, 0, prevRot.y, baseY, true);
            requestAnimationFrame(() => {
              setXYRotation(inner, 0, rot.y, baseY, false);
            });
          }
          setZRotation(rotator, baseZ, zDuration);
        });
      };

      setBoxesForPhrase(phrases[0]);
      setInterval(() => {
        phraseIndex = (phraseIndex + 1) % phrases.length;
        setBoxesForPhrase(phrases[phraseIndex]);
      }, 3000);
    }

  }

  const categorySelect = document.querySelector('[data-filter-category]');
  const tagSelect = document.querySelector('[data-filter-tag]');
  const topicCards = Array.from(document.querySelectorAll('[data-topic-card]'));
  const topicsMoreButton = document.querySelector('[data-target="#topics-list"]');

  const applyFilter = () => {
    const categoryValue = categorySelect ? categorySelect.value.toLowerCase() : 'all';
    const tagValue = tagSelect ? tagSelect.value.toLowerCase() : 'all';
    const isFiltered = categoryValue !== 'all' || tagValue !== 'all';

    topicCards.forEach((card) => {
      const cardCategory = (card.dataset.category || '').toLowerCase();
      const cardTags = (card.dataset.tags || '')
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean);

      const categoryMatch = categoryValue === 'all' || categoryValue === cardCategory;
      const tagMatch = tagValue === 'all' || cardTags.includes(tagValue);
      card.style.display = categoryMatch && tagMatch ? '' : 'none';
    });

    if (topicsMoreButton) {
      const collapsible = document.querySelectorAll('#topics-list [data-collapsible="true"]');
      if (isFiltered) {
        collapsible.forEach((item) => item.classList.remove('is-collapsed'));
        topicsMoreButton.style.display = 'none';
      } else {
        topicsMoreButton.style.display = collapsible.length ? '' : 'none';
        if (topicsMoreButton.getAttribute('data-expanded') !== 'true') {
          collapsible.forEach((item) => item.classList.add('is-collapsed'));
        }
      }
    }
  };

  if (categorySelect || tagSelect) {
    if (categorySelect) {
      categorySelect.addEventListener('change', applyFilter);
    }
    if (tagSelect) {
      tagSelect.addEventListener('change', applyFilter);
    }
  }

  document.querySelectorAll('[data-show-more]').forEach((button) => {
    button.addEventListener('click', () => {
      const targetSelector = button.getAttribute('data-target');
      const target = targetSelector ? document.querySelector(targetSelector) : null;
      if (!target) {
        return;
      }
      const isExpanded = button.getAttribute('data-expanded') === 'true';
      if (isExpanded) {
        target.querySelectorAll('[data-collapsible="true"]').forEach((item) => {
          item.classList.add('is-collapsed');
        });
        button.textContent = 'さらに表示↓';
        button.setAttribute('data-expanded', 'false');
        return;
      }
      target.querySelectorAll('[data-collapsible="true"]').forEach((item) => {
        item.classList.remove('is-collapsed');
      });
      button.textContent = 'さらに表示↑';
      button.setAttribute('data-expanded', 'true');
    });
  });

  const heroCanvas = document.querySelector('[data-hero-gl]');
  if (heroCanvas && window.THREE) {
    const renderer = new window.THREE.WebGLRenderer({
      canvas: heroCanvas,
      alpha: true,
      antialias: true,
    });
    const scene = new window.THREE.Scene();
    const camera = new window.THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new window.THREE.PlaneGeometry(2, 2);
    const trailSize = 18;
    const trail = Array.from({ length: trailSize }, () => new window.THREE.Vector2(0.5, 0.5));
    const strengths = Array.from({ length: trailSize }, () => 0);
    const uniforms = {
      uTime: { value: 0 },
      uMouse: { value: new window.THREE.Vector2(0.5, 0.5) },
      uResolution: { value: new window.THREE.Vector2(1, 1) },
      uTrail: { value: trail },
      uStrength: { value: strengths },
    };

    const material = new window.THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform float uTime;
        uniform vec2 uMouse;
        uniform vec2 uResolution;
        uniform vec2 uTrail[18];
        uniform float uStrength[18];

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }

        float segmentDistance(vec2 p, vec2 a, vec2 b) {
          vec2 pa = p - a;
          vec2 ba = b - a;
          float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
          return length(pa - ba * h);
        }

        vec3 hsv2rgb(vec3 c) {
          vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
          rgb = rgb * rgb * (3.0 - 2.0 * rgb);
          return c.z * mix(vec3(1.0), rgb, c.y);
        }

        void main() {
          vec2 uv = vUv;
          float minDist = 10.0;
          float strength = 0.0;
          for (int i = 0; i < 17; i++) {
            float d = segmentDistance(uv, uTrail[i], uTrail[i + 1]);
            minDist = min(minDist, d);
            strength += uStrength[i];
          }
          strength /= 17.0;

          float width = mix(0.02, 0.04, strength);
          float edge = smoothstep(width, 0.0, minDist);
          float n = noise(uv * 8.0 + uTime * 0.2);
          float shimmer = smoothstep(0.5, 1.0, n) * 0.25;
          float alpha = edge * (0.6 + shimmer);
          if (strength < 0.02) {
            alpha = 0.0;
          }
          float hue = mod(uTime * 0.5 + uv.x * 0.2, 1.0);
          vec3 base = hsv2rgb(vec3(hue, 0.6, 0.9));
          vec3 highlight = hsv2rgb(vec3(mod(hue + 0.08, 1.0), 0.2, 1.0));
          vec3 color = mix(base, highlight, edge + shimmer * 0.6);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
    });

    const mesh = new window.THREE.Mesh(geometry, material);
    scene.add(mesh);

    const resize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      renderer.setSize(width, height);
      uniforms.uResolution.value.set(width, height);
    };
    resize();
    window.addEventListener('resize', resize);

    let targetMouse = new window.THREE.Vector2(0.5, 0.5);
    let currentMouse = new window.THREE.Vector2(0.5, 0.5);
    let velocity = new window.THREE.Vector2(0, 0);
    let lastMove = 0;
    window.addEventListener('mousemove', (event) => {
      targetMouse.set(event.clientX / window.innerWidth, 1.0 - event.clientY / window.innerHeight);
      lastMove = Date.now();
    });

    const clock = new window.THREE.Clock();
    const animate = () => {
      uniforms.uTime.value = clock.getElapsedTime();
      const toTarget = targetMouse.clone().sub(currentMouse);
      velocity.add(toTarget.multiplyScalar(0.18));
      velocity.multiplyScalar(0.85);
      currentMouse.add(velocity);
      uniforms.uMouse.value.copy(currentMouse);
      const isMoving = Date.now() - lastMove < 140;
      if (isMoving) {
        trail.unshift(currentMouse.clone());
        trail.pop();
        strengths.unshift(1);
        strengths.pop();
      } else {
        strengths.unshift(0);
        strengths.pop();
      }
      for (let i = 0; i < strengths.length; i += 1) {
        strengths[i] *= 0.92;
      }
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();
  }

  const tetrapodWrap = document.querySelector('[data-tetrapod-wrap]');
  const tetrapodCanvas = document.querySelector('[data-tetrapod]');
  if (tetrapodWrap && tetrapodCanvas && window.THREE) {
    const renderer = new window.THREE.WebGLRenderer({
      canvas: tetrapodCanvas,
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const scene = new window.THREE.Scene();
    const camera = new window.THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 6);

    scene.add(new window.THREE.AmbientLight(0xffffff, 0.6));
    const keyLight = new window.THREE.DirectionalLight(0xffffff, 0.8);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight);
    const rimLight = new window.THREE.PointLight(0x9bb8ff, 0.6, 12);
    rimLight.position.set(-3, -2, 4);
    scene.add(rimLight);

    const material = new window.THREE.MeshStandardMaterial({
      color: 0xd8e7f5,
      metalness: 0.35,
      roughness: 0.3,
    });
    const holeMaterial = new window.THREE.MeshStandardMaterial({
      color: 0x0f1420,
      metalness: 0.1,
      roughness: 0.7,
    });
    const coreRadius = 0.35;
    const armRadius = coreRadius;
    const armTotalLength = 0.8;
    const bevel = Math.max(armTotalLength * 0.22, 0.12);
    const armMidLength = Math.max(armTotalLength - bevel * 2, 0.2);
    const armMidGeometry = new window.THREE.CylinderGeometry(
      armRadius,
      armRadius,
      armMidLength,
      24,
      1
    );
    const armEndGeometry = new window.THREE.CylinderGeometry(
      armRadius * 0.7,
      armRadius,
      bevel,
      24,
      1
    );
    const armHoleGeometry = new window.THREE.CylinderGeometry(
      armRadius * 0.35,
      armRadius * 0.35,
      bevel * 0.5,
      20,
      1,
      true
    );
    const armOffset = coreRadius + armTotalLength * 0.25;
    const directions = [
      new window.THREE.Vector3(1, 1, 1),
      new window.THREE.Vector3(-1, -1, 1),
      new window.THREE.Vector3(-1, 1, -1),
      new window.THREE.Vector3(1, -1, -1),
    ];
    const up = new window.THREE.Vector3(0, 1, 0);
    const tetrapods = [];
    const tipOffsetsLocal = directions.map((dir) =>
      dir.clone().normalize().multiplyScalar(armOffset)
    );
    const baseConfigs = [
      { x: -0.9, y: 0.4, z: 0, scale: 0.9, speed: 0.18 },
      { x: 0.7, y: -0.2, z: 0.2, scale: 1.1, speed: 0.14 },
      { x: 0.1, y: 0.7, z: -0.3, scale: 0.75, speed: 0.22 },
    ];
    const tetrapodConfigs = [];
    const offsetPattern = [
      { x: 0, y: 0, z: 0 },
      { x: 0.45, y: -0.35, z: 0.2 },
      { x: -0.4, y: 0.3, z: -0.25 },
    ];
    baseConfigs.forEach((base, index) => {
      offsetPattern.forEach((offset, offsetIndex) => {
        tetrapodConfigs.push({
          x: base.x + offset.x,
          y: base.y + offset.y,
          z: base.z + offset.z,
          scale: base.scale * (0.9 + offsetIndex * 0.08),
          speed: base.speed + offsetIndex * 0.03 + index * 0.01,
        });
      });
    });

    const buildTetrapod = () => {
      const group = new window.THREE.Group();
      const core = new window.THREE.Mesh(
        new window.THREE.SphereGeometry(coreRadius, 32, 32),
        material
      );
      group.add(core);
      directions.forEach((direction) => {
        const arm = new window.THREE.Group();
        const mid = new window.THREE.Mesh(armMidGeometry, material);
        const endA = new window.THREE.Mesh(armEndGeometry, material);
        const endB = new window.THREE.Mesh(armEndGeometry, material);
        const holeA = new window.THREE.Mesh(armHoleGeometry, holeMaterial);
        const holeB = new window.THREE.Mesh(armHoleGeometry, holeMaterial);
        endA.position.y = armMidLength * 0.5 + bevel * 0.5;
        endB.position.y = -armMidLength * 0.5 - bevel * 0.5;
        endB.rotation.x = Math.PI;
        holeA.position.y = endA.position.y + bevel * 0.08;
        holeB.position.y = endB.position.y - bevel * 0.08;
        holeB.rotation.x = Math.PI;
        arm.add(mid, endA, endB, holeA, holeB);

        const dir = direction.clone().normalize();
        arm.position.copy(dir.clone().multiplyScalar(armOffset));
        arm.quaternion.setFromUnitVectors(up, dir);
        group.add(arm);
      });
      return group;
    };

    tetrapodConfigs.forEach((config) => {
      const group = buildTetrapod();
      group.position.set(config.x, config.y, config.z);
      group.scale.setScalar(config.scale);
      group.rotation.set(config.y * 0.3, config.x * 0.4, config.z * 0.2);
      scene.add(group);
      tetrapods.push({
        group,
        config,
        velocity: new window.THREE.Vector3(0, 0, 0),
        angularVelocity: new window.THREE.Vector3(0, 0, 0),
        tipOffsetsLocal,
        radius: (coreRadius + armTotalLength * 0.65) * config.scale,
        collided: false,
      });
    });

    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let lastPointer = { x: 0, y: 0, time: 0 };
    let pointerSpeed = 0;
    let hasPointer = false;

    const handlePointer = (event) => {
      const rect = tetrapodWrap.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      const now = performance.now();
      const dx = x - lastPointer.x;
      const dy = y - lastPointer.y;
      const dt = Math.max(now - lastPointer.time, 16);
      pointerSpeed = Math.min(Math.hypot(dx, dy) / dt, 0.02);
      lastPointer = { x, y, time: now };
      target.x = (x - 0.5) * 2;
      target.y = (y - 0.5) * 2;
      hasPointer = true;
    };

    tetrapodWrap.addEventListener('pointermove', handlePointer);
    tetrapodWrap.addEventListener('pointerleave', () => {
      target.x = 0;
      target.y = 0;
      pointerSpeed = 0;
      hasPointer = false;
    });

    const resize = () => {
      const { clientWidth, clientHeight } = tetrapodWrap;
      renderer.setSize(clientWidth, clientHeight, false);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize);

    const clock = new window.THREE.Clock();
    const resolveCollisions = () => {
      tetrapods.forEach((tetrapod) => {
        tetrapod.collided = false;
      });
      for (let i = 0; i < tetrapods.length; i += 1) {
        for (let j = i + 1; j < tetrapods.length; j += 1) {
          const a = tetrapods[i];
          const b = tetrapods[j];
          const delta = b.group.position.clone().sub(a.group.position);
          const dist = Math.max(delta.length(), 0.0001);
          const minDist = a.radius + b.radius;
          if (dist >= minDist) {
            continue;
          }
          const overlap = minDist - dist;
          const normal = delta.multiplyScalar(1 / dist);
          const relativeVel = b.velocity.clone().sub(a.velocity);
          const velAlongNormal = relativeVel.dot(normal);
          const spring = overlap * 0.05;
          const restitution = 0.25;
          const impulse = spring - velAlongNormal * restitution;
          a.velocity.addScaledVector(normal, -impulse);
          b.velocity.addScaledVector(normal, impulse);
          const softCorrection = normal.clone().multiplyScalar(overlap * 0.05);
          a.group.position.addScaledVector(softCorrection, -1);
          b.group.position.add(softCorrection);
          const contactA = normal.clone().multiplyScalar(-a.radius * 0.6);
          const contactB = normal.clone().multiplyScalar(b.radius * 0.6);
          const torqueA = contactA.clone().cross(normal).multiplyScalar(impulse * 0.12);
          const torqueB = contactB.clone().cross(normal).multiplyScalar(-impulse * 0.12);
          a.angularVelocity.add(torqueA);
          b.angularVelocity.add(torqueB);
          a.collided = true;
          b.collided = true;
        }
      }
    };

    const animate = () => {
      const delta = 0.08;
      current.x += (target.x - current.x) * delta;
      current.y += (target.y - current.y) * delta;

      const time = clock.getElapsedTime();
      const center = tetrapods.reduce(
        (acc, item) => acc.add(item.group.position),
        new window.THREE.Vector3(0, 0, 0)
      ).multiplyScalar(1 / tetrapods.length);

      tetrapods.forEach(({ group, config, velocity, angularVelocity, tipOffsetsLocal, collided }, index) => {
        const offset = time * config.speed + index * 1.3;
        const attraction = group.position
          .clone()
          .multiplyScalar(-0.0005);

        let repulsion = new window.THREE.Vector3(0, 0, 0);
        if (hasPointer) {
          const pointerPos = new window.THREE.Vector3(current.x, current.y, 0);
          const toPointer = group.position.clone().sub(pointerPos);
          const distance = Math.max(toPointer.length(), 0.001);
          const norm = Math.min(distance / 1.4, 1);
          const proximity = 1 - norm;
          const logBoost = -Math.log(Math.max(1 - proximity * 0.95, 0.001));
          repulsion = toPointer
            .normalize()
            .multiplyScalar(logBoost * 0.05);
        }

        const netForce = attraction.clone().add(repulsion);
        if (pointerSpeed > 0) {
          netForce.z += pointerSpeed * 2.2;
        }
        const maxForce = 0.03;
        if (netForce.length() > maxForce) {
          netForce.setLength(maxForce);
        }
        velocity.add(netForce);
        velocity.multiplyScalar(0.9);
        group.position.add(velocity);

        if (netForce.lengthSq() > 0.00001) {
          let maxTorque = new window.THREE.Vector3(0, 0, 0);
          let maxMag = 0;
          tipOffsetsLocal.forEach((tipOffset) => {
            const tipWorld = tipOffset.clone().applyQuaternion(group.quaternion);
            const candidate = tipWorld.clone().cross(netForce);
            const mag = candidate.lengthSq();
            if (mag > maxMag) {
              maxMag = mag;
              maxTorque.copy(candidate);
            }
          });
          const speedBoost = 1 + pointerSpeed * 100;
          angularVelocity.add(maxTorque.multiplyScalar(0.32 * speedBoost));
        }
        angularVelocity.multiplyScalar(collided || hasPointer ? 0.965 : 0.99);

        group.rotation.x += angularVelocity.x;
        group.rotation.y += angularVelocity.y;
        group.rotation.z += angularVelocity.z;
        group.position.z = config.z + Math.sin(offset * 0.7) * 0.15;
      });
      resolveCollisions();

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();
  }
});
