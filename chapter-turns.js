/* An engraved contour separates the two real scrollports. Its geometry
   is sampled from the same progress in either direction. */
(() => {
  'use strict';
  const svgNS = 'http://www.w3.org/2000/svg';
  const plateWidth = 1000;
  const plateHeight = 150;
  // Each station gives the upper edge and the spacing to the deepest contour.
  // Grouped peaks and one broad saddle give the plate its asymmetry.
  const stations = [
    [0, 54, 22], [85, 44, 38], [171, 15, 48], [222, 27, 25],
    [290, 58, 23], [379, 66, 11], [482, 50, 26], [563, 45, 16],
    [645, 27, 33], [709, 18, 61], [777, 36, 31], [860, 51, 16],
    [929, 44, 23], [1000, 32, 35]
  ];
  function spline(points, xScale = 1, yScale = 1, yOffset = 0) {
    const coord = ([x, y]) => (x * xScale).toFixed(2) + ' ' + (y * yScale + yOffset).toFixed(2);
    // Uniform Catmull–Rom tangents expressed as cubic Bézier handles.
    let d = 'M' + coord(points[0]);
    for (let i = 1; i < points.length; i++) {
      const a = points[i-1], b = points[i];
      const prev = points[Math.max(0, i-2)], next = points[Math.min(points.length-1, i+1)];
      d += 'C' + coord([a[0]+(b[0]-prev[0])/6, a[1]+(b[1]-prev[1])/6]) + ' ' +
        coord([b[0]-(next[0]-a[0])/6, b[1]-(next[1]-a[1])/6]) + ' ' + coord(b);
    }
    return d;
  }
  function lineAt(depth, opening = 1) {
    return stations.map(([x, y, width]) => {
      // The middle contours divide around a small closed summit on the right.
      const nearSummit = Math.exp(-((x-709)**2)/1900);
      const bank = depth < .45 ? -depth*.42 : (1-depth)*.35;
      return [
        x + Math.sin(Math.PI*x/plateWidth)*Math.sin(x*.015)*depth*15,
        y + (depth + nearSummit*bank)*width*opening
      ];
    });
  }
  const crest = lineAt(0);
  function makeBand() {
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 1000 150');
    svg.setAttribute('preserveAspectRatio', 'none');
    function path(d, kind) {
      const p = document.createElementNS(svgNS, 'path');
      p.setAttribute('d', d);
      p.setAttribute('class', kind);
      p.setAttribute('vector-effect', 'non-scaling-stroke');
      svg.append(p);
      return p;
    }
    const base = lineAt(1);
    const stock = path(spline(crest) + spline(base.reverse()).replace('M','L') + 'Z', 'contour-stock');
    const lines = [];
    for (let i = 0; i <= 10; i++) {
      const kind = i === 0 || i === 6 ? 'contour-index' : i === 3 ? 'contour-copper' : 'contour-fine';
      lines.push(path(spline(lineAt(i/10)), kind));
    }
    const summit = [
      path('M668 47C678 44 688 34 701 34C712 33 726 40 742 45C728 45 718 51 706 51C694 52 682 45 668 47Z', 'contour-fine'),
      path('M687 43C694 40 697 37 703 38C711 38 719 42 725 44C717 44 712 48 704 47C698 47 692 43 687 43Z', 'contour-copper')
    ];
    return {svg, stock, lines, summit};
  }

  function create(outgoing, incoming, direction, change) {
    const originalTop = outgoing.getBoundingClientRect().top;
    change();
    const shift = originalTop - outgoing.getBoundingClientRect().top;
    const front = direction > 0 ? incoming : outgoing;
    const back = direction > 0 ? outgoing : incoming;
    const bounds = incoming.getBoundingClientRect();
    const width = bounds.width, height = bounds.height;
    const bandHeight = Math.min(235, height * .29, width * .28);
    const seam = document.createElement('div');
    seam.className = 'chapter-contour';
    seam.setAttribute('aria-hidden','true');
    Object.assign(seam.style, {
      left: bounds.left+'px', top: bounds.top+'px', width: width+'px', height: height+'px'
    });
    const engraving = makeBand();
    const band = engraving.svg;
    band.style.height = bandHeight+'px';
    seam.append(band);
    document.body.append(seam);
    front.classList.add('turn-front');
    back.classList.add('turn-back');
    document.documentElement.dataset.turnStyle = 'contour';
    return {
      paint(progress, velocity = 0) {
        const p = direction > 0 ? progress : 1-progress;
        // The controller already eases the motion. Keep page displacement
        // linear here so small wheel movements remain visible immediately.
        const t = p;
        const spread = Math.sin(Math.PI*t);
        const opening = .58+.42*Math.sqrt(spread);
        const pull = 1 + Math.min(.12,Math.abs(velocity)*.025)*spread;
        const baseline = (height+2)*(1-t)-1;
        const offset = (1-t)*Math.min(66,height*.085);
        // Local clip coordinates compensate for the moving sheet; the engraved
        // leading line and the actual page boundary coincide at any progress.
        const edge = spline(crest, width/plateWidth, spread*pull*bandHeight/plateHeight, baseline-offset);
        front.style.clipPath = 'path("'+edge+'V'+(height+2)+'H0Z")';
        front.style.transform = 'translateY('+((front===outgoing ? shift : 0)+offset)+'px)';
        back.style.transform = 'translateY('+((back===outgoing ? shift : 0)-height*.038*t)+'px)';
        band.style.transform = 'translateY('+baseline+'px) scaleY('+(spread*pull)+')';
        band.style.opacity = Math.min(1, spread*4);
        // The engraved lines fan out inside the moving edge, then compress
        // independently as the spring comes to rest.
        engraving.stock.setAttribute('d',spline(crest)+spline(lineAt(1,opening).reverse()).replace('M','L')+'Z');
        engraving.lines.forEach((line,i)=>line.setAttribute('d',spline(lineAt(i/10,opening))));
        engraving.summit.forEach(line=>line.setAttribute('transform',
          'translate(0 '+(18*(1-opening))+') scale(1 '+opening+')'));
      },
      clear() {
        seam.remove();
        front.classList.remove('turn-front');
        back.classList.remove('turn-back');
        front.style.removeProperty('clip-path');
        front.style.removeProperty('transform');
        back.style.removeProperty('transform');
        delete document.documentElement.dataset.turnStyle;
      }
    };
  }
  window.chapterTurns = {create};
})();
