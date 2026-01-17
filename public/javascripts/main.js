const PortfolioApp = (() => {
  let cleanupFns = [];

  const init = () => {
    cleanupFns.forEach((fn) => fn());
    cleanupFns = [];

    const controller = new AbortController();
    const signal = controller.signal;
    cleanupFns.push(() => controller.abort());

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
    const textTimer = setTimeout(() => loader.classList.add('is-text-fade'), 1000);
    const tilesTimer = setTimeout(() => loader.classList.add('is-tiles'), 2000);
    const hideTimer = setTimeout(() => {
      loader.classList.add('is-hidden');
      setTimeout(() => loader.remove(), 200);
    }, 5000);
    cleanupFns.push(() => {
      clearTimeout(textTimer);
      clearTimeout(tilesTimer);
      clearTimeout(hideTimer);
    });
  }

  if (window.Lenis) {
    const lenis = new window.Lenis({
      lerp: 0.08,
      smoothWheel: true,
      smoothTouch: false,
    });
    if (window.ScrollTrigger) {
      lenis.on('scroll', window.ScrollTrigger.update);
    }
    let lenisRaf = null;
    const raf = (time) => {
      lenis.raf(time);
      lenisRaf = requestAnimationFrame(raf);
    };
    lenisRaf = requestAnimationFrame(raf);
    cleanupFns.push(() => {
      cancelAnimationFrame(lenisRaf);
      lenis.destroy();
    });
  }

  if (window.gsap && window.ScrollTrigger) {
    window.gsap.registerPlugin(window.ScrollTrigger);
    const revealTargets = window.gsap.utils.toArray('[data-reveal]');
    revealTargets.forEach((el) => {
      window.gsap.fromTo(
        el,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 80%',
            once: true,
          },
        }
      );
    });

    if (document.body.dataset.page === 'works') {
      window.gsap.utils.toArray('.work-card').forEach((card, index) => {
        window.gsap.fromTo(
          card,
          { opacity: 0.2, z: -120 },
          {
            opacity: 1,
            z: 0,
            duration: 1,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: card,
              start: 'top 80%',
            },
          }
        );
      });
    }
    cleanupFns.push(() => {
      window.ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    });
  }

  const bgCanvas = document.querySelector('[data-bg-gl]');
  if (bgCanvas && window.THREE) {
    const BG_CONFIG = {
      minCount: 40,
      maxCount: 120,
      density: 20000,
      maxPixelRatio: 1.5,
      depth: 24,
      lanes: 6,
      laneRadius: 6.5,
      baseSpeed: 0.12,
      drift: 0.3,
      mouseIntensity: 1.2,
    };

    const renderer = new window.THREE.WebGLRenderer({
      canvas: bgCanvas,
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, BG_CONFIG.maxPixelRatio));
    renderer.setClearColor(0x05070c, 1);

    const scene = new window.THREE.Scene();
    const camera = new window.THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0, 14);

    const count = Math.min(
      BG_CONFIG.maxCount,
      Math.max(
        BG_CONFIG.minCount,
        Math.floor((window.innerWidth * window.innerHeight) / BG_CONFIG.density)
      )
    );

    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const lanes = new Float32Array(count);
    const phases = new Float32Array(count);
    const alphas = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      const lane = i % BG_CONFIG.lanes;
      const radius = BG_CONFIG.laneRadius * (0.5 + lane / BG_CONFIG.lanes);
      const angle = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius;
      positions[i * 3 + 2] = (Math.random() - 0.5) * BG_CONFIG.depth;
      speeds[i] = BG_CONFIG.baseSpeed * (0.6 + Math.random());
      lanes[i] = radius;
      phases[i] = Math.random() * Math.PI * 2;
      alphas[i] = 0.6 + Math.random() * 0.4;
    }

    const geometry = new window.THREE.BufferGeometry();
    geometry.setAttribute('position', new window.THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aAlpha', new window.THREE.BufferAttribute(alphas, 1));
    geometry.setAttribute('aPhase', new window.THREE.BufferAttribute(phases, 1));

    const vertexShader = `
        attribute float aAlpha;
        attribute float aPhase;
        uniform float uTime;
        uniform vec2 uMouse;
        varying float vAlpha;
        varying float vPhase;
        varying vec2 vUv;
        void main() {
          vAlpha = aAlpha;
          vPhase = aPhase;
          vUv = position.xy * 0.04 + uMouse * 0.3;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = 10.0 + 8.0 * (1.0 - abs(mvPosition.z) / 12.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `;
    const fragmentShader = `
        precision highp float;
        varying float vAlpha;
        varying float vPhase;
        varying vec2 vUv;
        uniform float uBoost;
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
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
        void main() {
          vec2 coord = gl_PointCoord - 0.5;
          float dist = length(coord);
          float mask = smoothstep(0.5, 0.15, dist);
          float n = noise(vUv * 6.0 + vPhase);
          float stripe = sin((coord.x + coord.y) * 12.0 + n * 6.0) * 0.5 + 0.5;
          vec3 base = vec3(0.15, 0.35, 0.95);
          vec3 alt = vec3(0.85, 0.9, 1.0);
          vec3 color = mix(base, alt, stripe);
          color.r += sin(n + vPhase) * 0.1;
          color.b += cos(n + vPhase) * 0.1;
          gl_FragColor = vec4(color * uBoost, mask * vAlpha);
        }
      `;

    const material = new window.THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new window.THREE.Vector2(0.5, 0.5) },
        uBoost: { value: 1.0 },
      },
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
    });

    const points = new window.THREE.Points(geometry, material);
    scene.add(points);

    const sparkCount = Math.max(30, Math.floor(count * 0.4));
    const sparkPositions = new Float32Array(sparkCount * 3);
    const sparkAlphas = new Float32Array(sparkCount);
    const sparkPhases = new Float32Array(sparkCount);
    const sparkLife = new Float32Array(sparkCount);
    const sparkGeometry = new window.THREE.BufferGeometry();
    sparkGeometry.setAttribute('position', new window.THREE.BufferAttribute(sparkPositions, 3));
    sparkGeometry.setAttribute('aAlpha', new window.THREE.BufferAttribute(sparkAlphas, 1));
    sparkGeometry.setAttribute('aPhase', new window.THREE.BufferAttribute(sparkPhases, 1));
    const sparkMaterial = new window.THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new window.THREE.Vector2(0.5, 0.5) },
        uBoost: { value: 1.6 },
      },
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
    });
    const sparks = new window.THREE.Points(sparkGeometry, sparkMaterial);
    scene.add(sparks);

    const resize = () => {
      const { clientWidth, clientHeight } = bgCanvas;
      renderer.setSize(clientWidth, clientHeight, false);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize, { signal });

    let mouse = new window.THREE.Vector2(0.5, 0.5);
    let sparkIndex = 0;
    window.addEventListener(
      'pointermove',
      (event) => {
        const mx = event.clientX / window.innerWidth;
        const my = 1 - event.clientY / window.innerHeight;
        mouse.set(mx, my);
        const ix = sparkIndex % sparkCount;
        sparkPositions[ix * 3] = (mx - 0.5) * BG_CONFIG.laneRadius * 1.2;
        sparkPositions[ix * 3 + 1] = (my - 0.5) * BG_CONFIG.laneRadius * 0.9;
        sparkPositions[ix * 3 + 2] = -4 + Math.random() * 2;
        sparkAlphas[ix] = 1;
        sparkPhases[ix] = Math.random() * Math.PI * 2;
        sparkLife[ix] = 1;
        sparkIndex += 1;
      },
      { signal }
    );

    let bgRaf = null;
    const clock = new window.THREE.Clock();
    const animate = () => {
      const time = clock.getElapsedTime();
      material.uniforms.uTime.value = time;
      material.uniforms.uMouse.value.lerp(mouse, 0.08);
      sparkMaterial.uniforms.uTime.value = time;
      sparkMaterial.uniforms.uMouse.value.lerp(mouse, 0.1);

      for (let i = 0; i < count; i += 1) {
        const radius = lanes[i];
        const angle = time * speeds[i] + phases[i];
        positions[i * 3] = Math.cos(angle) * radius + Math.sin(time * 0.2 + i) * BG_CONFIG.drift;
        positions[i * 3 + 1] = Math.sin(angle) * radius + Math.cos(time * 0.25 + i) * BG_CONFIG.drift;
        positions[i * 3 + 2] += speeds[i] * 0.3;
        if (positions[i * 3 + 2] > BG_CONFIG.depth * 0.5) {
          positions[i * 3 + 2] = -BG_CONFIG.depth * 0.5;
        }
      }

      for (let i = 0; i < sparkCount; i += 1) {
        if (sparkLife[i] <= 0) {
          sparkAlphas[i] = 0;
          continue;
        }
        sparkLife[i] -= 0.03;
        sparkAlphas[i] = Math.max(sparkLife[i], 0);
        sparkPositions[i * 3 + 2] += 0.05;
      }

      geometry.attributes.position.needsUpdate = true;
      sparkGeometry.attributes.position.needsUpdate = true;
      sparkGeometry.attributes.aAlpha.needsUpdate = true;
      renderer.render(scene, camera);
      bgRaf = requestAnimationFrame(animate);
    };
    animate();

    cleanupFns.push(() => {
      cancelAnimationFrame(bgRaf);
      window.removeEventListener('resize', resize);
      geometry.dispose();
      sparkGeometry.dispose();
      material.dispose();
      sparkMaterial.dispose();
      renderer.dispose();
    });
  }

  const images = Array.from(document.querySelectorAll('.hero-bg-image'));
  let imageIndex = 0;
  let phraseIndex = 0;

  if (images.length > 1) {
    const heroInterval = setInterval(() => {
      images[imageIndex].classList.remove('is-active');
      imageIndex = (imageIndex + 1) % images.length;
      images[imageIndex].classList.add('is-active');
    }, 3000);
    cleanupFns.push(() => clearInterval(heroInterval));
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
      const phraseInterval = setInterval(() => {
        phraseIndex = (phraseIndex + 1) % phrases.length;
        setBoxesForPhrase(phrases[phraseIndex]);
      }, 3000);
      cleanupFns.push(() => clearInterval(phraseInterval));
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

  if (categorySelect) {
    categorySelect.addEventListener('change', applyFilter, { signal });
  }
  if (tagSelect) {
    tagSelect.addEventListener('change', applyFilter, { signal });
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
    }, { signal });
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
    window.addEventListener('resize', resize, { signal });

    let targetMouse = new window.THREE.Vector2(0.5, 0.5);
    let currentMouse = new window.THREE.Vector2(0.5, 0.5);
    let velocity = new window.THREE.Vector2(0, 0);
    let lastMove = 0;
    window.addEventListener('mousemove', (event) => {
      targetMouse.set(event.clientX / window.innerWidth, 1.0 - event.clientY / window.innerHeight);
      lastMove = Date.now();
    }, { signal });

    const clock = new window.THREE.Clock();
    let rafId = null;
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
      rafId = requestAnimationFrame(animate);
    };
    animate();
    cleanupFns.push(() => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    });
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

    tetrapodWrap.addEventListener('pointermove', handlePointer, { signal });
    tetrapodWrap.addEventListener('pointerleave', () => {
      target.x = 0;
      target.y = 0;
      pointerSpeed = 0;
      hasPointer = false;
    }, { signal });

    const resize = () => {
      const { clientWidth, clientHeight } = tetrapodWrap;
      renderer.setSize(clientWidth, clientHeight, false);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize, { signal });

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

    let tetrapodRaf = null;
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
      tetrapodRaf = requestAnimationFrame(animate);
    };
    animate();
    cleanupFns.push(() => {
      cancelAnimationFrame(tetrapodRaf);
      window.removeEventListener('resize', resize);
      renderer.dispose();
    });
  }
  };

  const destroy = () => {
    cleanupFns.forEach((fn) => fn());
    cleanupFns = [];
  };

  return { init, destroy };
})();

const boot = () => {
  PortfolioApp.init();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

if (window.Swup) {
  const swup = new window.Swup({
    containers: ['#swup'],
    linkSelector: 'a[href]:not([data-no-swup])',
  });
  swup.on('contentReplaced', () => {
    PortfolioApp.init();
    if (window.ScrollTrigger) {
      window.ScrollTrigger.refresh();
    }
  });
}
