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
});
