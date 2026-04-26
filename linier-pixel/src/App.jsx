import React, { useState, useRef, useEffect } from 'react';
import { 
  Zap, X, Image as ImageIcon, UploadCloud, Layers, 
  Settings2, Check, Copy, Terminal, FileCode2, 
  ChevronDown, Download, Clock, MonitorPlay, Palette
} from 'lucide-react';

const PixelWindow = ({ title, icon: Icon, children, rightHeader }) => (
  <div 
    className="bg-[#FFF5EB] relative flex flex-col h-full pixel-font"
    style={{
      boxShadow: `inset -4px -4px 0px 0px rgba(0,0,0,0.15), 0 0 0 4px #5A3A22, 8px 8px 0px 0px rgba(90, 58, 34, 0.4)`,
      margin: '4px'
    }}
  >
    <div className="bg-[#FFAD60] px-4 py-2 flex items-center justify-between border-b-[4px] border-[#5A3A22]">
      <div className="flex items-center gap-3">
        {Icon && <Icon size={14} className="text-[#5A3A22]" strokeWidth={3} />}
        <span className="text-[10px] text-[#5A3A22] uppercase mt-1 tracking-widest">{title}</span>
      </div>
      {rightHeader && <div>{rightHeader}</div>}
    </div>
    <div className="p-4 flex-1 flex flex-col overflow-hidden text-[#5A3A22] bg-[#FFE0B2]">
      {children}
    </div>
  </div>
);

const PixelButton = ({ children, onClick, disabled, primary, className = '' }) => (
  <button
    onClick={onClick} disabled={disabled}
    className={`relative active:translate-y-1 active:shadow-[inset_0_0_0_0_rgba(0,0,0,0)] transition-transform ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    style={{
      backgroundColor: primary ? '#FFAD60' : '#FFF5EB', color: primary ? '#5A3A22' : '#5A3A22',
      padding: '10px 16px', margin: '4px', fontSize: '10px', textTransform: 'uppercase',
      boxShadow: primary ? 'inset -4px -4px 0px 0px #D9833B, 0 0 0 4px #5A3A22' : 'inset -4px -4px 0px 0px #E5CBA8, 0 0 0 4px #5A3A22'
    }}
  >
    <div className="flex items-center justify-center gap-2 mt-1">{children}</div>
  </button>
);

export default function App() {
  const [ratio, setRatio] = useState('Auto (From SVG)');
  const [fps, setFps] = useState(30);
  const [duration, setDuration] = useState(2032);
  const [bgColor, setBgColor] = useState('#000000');
  const [opacity, setOpacity] = useState(1);
  const [includeStroke, setIncludeStroke] = useState(true);
  const [exportMode, setExportMode] = useState('hybrid'); 
  
  const [svgInput, setSvgInput] = useState('');
  const [xmlOutput, setXmlOutput] = useState('');
  const [showOutput, setShowOutput] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [parsedLayers, setParsedLayers] = useState([]);
  
  const fileInputRef = useRef(null);
  const ratios = ['Auto (From SVG)', '1:1', '16:9', '9:16', '4:5', '4:3'];

  // SHAPE DETECTOR
  const detectPathShape = (d) => {
    if (!d) return "vectorart";
    let norm = d.replace(/([a-zA-Z])/g, ' $1 ').trim().split(/\s+/);
    
    if (/[CQAcaq]/.test(d)) {
        if ((d.match(/[CQAcaq]/g) || []).length > 8) return "vectorart"; 
        return "roundrect";
    }
    
    let pts = []; let cx=0, cy=0;
    for(let i=0; i<norm.length; i++) {
        let c = norm[i].toUpperCase();
        if(c==='M' || c==='L') { cx = parseFloat(norm[i+1]); cy = parseFloat(norm[i+2]); pts.push({x:cx, y:cy}); i+=2; }
        else if(c==='H') { cx = parseFloat(norm[i+1]); pts.push({x:cx, y:cy}); i++; }
        else if(c==='V') { cy = parseFloat(norm[i+1]); pts.push({x:cx, y:cy}); i++; }
    }
    
    let uPts = [];
    pts.forEach(p => {
        if(uPts.length === 0) uPts.push(p);
        else {
            let lst = uPts[uPts.length-1];
            if(Math.abs(p.x - lst.x) > 1 || Math.abs(p.y - lst.y) > 1) {
                if(Math.abs(p.x - uPts[0].x) > 1 || Math.abs(p.y - uPts[0].y) > 1) uPts.push(p);
            }
        }
    });

    if (uPts.length === 3) return "triangle";
    if (uPts.length === 4) return "rect";
    return "vectorart";
  };

  useEffect(() => {
    if (!svgInput.trim()) { setParsedLayers([]); return; }
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgInput, "image/svg+xml");
      const elements = doc.querySelectorAll('path, rect, circle, polygon, polyline, ellipse, line');
      
      const layers = Array.from(elements).map((el, i) => {
        const tag = el.tagName.toLowerCase();
        let detectedType = "vectorart";

        if (tag === 'rect') detectedType = parseFloat(el.getAttribute('rx') || 0) > 0 ? "roundrect" : "rect";
        else if (tag === 'circle' || tag === 'ellipse') detectedType = "roundrect";
        else if (tag === 'polygon' || tag === 'polyline') {
           const pts = (el.getAttribute('points') || '').trim().split(/[\s,]+/).filter(Boolean);
           detectedType = pts.length === 6 ? "triangle" : "vectorart";
        } else if (tag === 'path') detectedType = detectPathShape(el.getAttribute('d'));
        else if (tag === 'line') detectedType = "vectorart";

        return {
          id: i, exportType: detectedType,
          name: el.getAttribute('id') || `Shape_${String(i + 1).padStart(3, '0')}`,
          included: true
        };
      });
      setParsedLayers(layers);
    } catch (e) { setParsedLayers([]); }
  }, [svgInput]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setSvgInput(event.target.result);
    reader.readAsText(file);
    e.target.value = '';
  };

  const updateLayer = (index, field, value) => {
    const newLayers = [...parsedLayers];
    newLayers[index][field] = value;
    setParsedLayers(newLayers);
  };

  // PATH CALCULATOR
  const shiftPath = (d, cx, cy, scaleX, scaleY) => {
      if (!d) return "";
      let norm = d.replace(/,/g, ' ').replace(/([a-zA-Z])/g, ' $1 ').trim().replace(/\s+/g, ' ');
      let tokens = norm.split(' ');
      let out = []; let cmd = ''; let isUpper = false;

      let i = 0;
      while (i < tokens.length) {
          let token = tokens[i];
          if (/[a-zA-Z]/.test(token)) {
              cmd = token; isUpper = cmd === cmd.toUpperCase();
              out.push(cmd); i++;
              if (cmd === 'm' && out.length === 1) isUpper = true; 
          } else {
              let c = cmd.toUpperCase();
              if (c === 'Z') {
              } else if (c === 'H') {
                  let x = parseFloat(tokens[i]) || 0;
                  out.push((isUpper ? (x * scaleX - cx) : (x * scaleX)).toFixed(4)); i++;
              } else if (c === 'V') {
                  let y = parseFloat(tokens[i]) || 0;
                  out.push((isUpper ? (y * scaleY - cy) : (y * scaleY)).toFixed(4)); i++;
              } else if (c === 'M' || c === 'L' || c === 'T') {
                  let x = parseFloat(tokens[i]) || 0, y = parseFloat(tokens[i+1]) || 0;
                  out.push((isUpper ? (x * scaleX - cx) : (x * scaleX)).toFixed(4));
                  out.push((isUpper ? (y * scaleY - cy) : (y * scaleY)).toFixed(4)); i += 2;
              } else if (c === 'Q' || c === 'S') {
                  let x1 = parseFloat(tokens[i])||0, y1 = parseFloat(tokens[i+1])||0;
                  let x = parseFloat(tokens[i+2])||0, y = parseFloat(tokens[i+3])||0;
                  out.push((isUpper ? (x1 * scaleX - cx) : (x1 * scaleX)).toFixed(4));
                  out.push((isUpper ? (y1 * scaleY - cy) : (y1 * scaleY)).toFixed(4));
                  out.push((isUpper ? (x * scaleX - cx) : (x * scaleX)).toFixed(4));
                  out.push((isUpper ? (y * scaleY - cy) : (y * scaleY)).toFixed(4)); i += 4;
              } else if (c === 'C') {
                  let x1 = parseFloat(tokens[i])||0, y1 = parseFloat(tokens[i+1])||0;
                  let x2 = parseFloat(tokens[i+2])||0, y2 = parseFloat(tokens[i+3])||0;
                  let x = parseFloat(tokens[i+4])||0, y = parseFloat(tokens[i+5])||0;
                  out.push((isUpper ? (x1 * scaleX - cx) : (x1 * scaleX)).toFixed(4));
                  out.push((isUpper ? (y1 * scaleY - cy) : (y1 * scaleY)).toFixed(4));
                  out.push((isUpper ? (x2 * scaleX - cx) : (x2 * scaleX)).toFixed(4));
                  out.push((isUpper ? (y2 * scaleY - cy) : (y2 * scaleY)).toFixed(4));
                  out.push((isUpper ? (x * scaleX - cx) : (x * scaleX)).toFixed(4));
                  out.push((isUpper ? (y * scaleY - cy) : (y * scaleY)).toFixed(4)); i += 6;
              } else if (c === 'A') {
                  let rx = parseFloat(tokens[i])||0, ry = parseFloat(tokens[i+1])||0;
                  let rot = parseFloat(tokens[i+2])||0, fa = parseFloat(tokens[i+3])||0, fs = parseFloat(tokens[i+4])||0;
                  let x = parseFloat(tokens[i+5])||0, y = parseFloat(tokens[i+6])||0;
                  out.push((rx * scaleX).toFixed(4)); out.push((ry * scaleY).toFixed(4));
                  out.push(rot); out.push(fa); out.push(fs);
                  out.push((isUpper ? (x * scaleX - cx) : (x * scaleX)).toFixed(4));
                  out.push((isUpper ? (y * scaleY - cy) : (y * scaleY)).toFixed(4)); i += 7;
              } else {
                  out.push(tokens[i]); i++;
              }
          }
      }
      return out.join(' ').replace(/NaN/g, "0.0000"); 
  };

  const extractPathFromNode = (node) => {
    const tag = node.tagName.toLowerCase();
    if (tag === 'path') return node.getAttribute('d') || '';
    if (tag === 'rect') {
      const x = parseFloat(node.getAttribute('x') || 0); const y = parseFloat(node.getAttribute('y') || 0);
      const w = parseFloat(node.getAttribute('width') || 0); const h = parseFloat(node.getAttribute('height') || 0);
      return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
    }
    if (tag === 'circle') {
      const cx = parseFloat(node.getAttribute('cx') || 0); const cy = parseFloat(node.getAttribute('cy') || 0); const r = parseFloat(node.getAttribute('r') || 0);
      const c = r * 0.551915024494; 
      return `M ${cx} ${cy - r} C ${cx + c} ${cy - r} ${cx + r} ${cy - c} ${cx + r} ${cy} C ${cx + r} ${cy + c} ${cx + c} ${cy + r} ${cx} ${cy + r} C ${cx - c} ${cy + r} ${cx - r} ${cy + c} ${cx - r} ${cy} C ${cx - r} ${cy - c} ${cx - c} ${cy - r} ${cx} ${cy - r} Z`;
    }
    if (tag === 'ellipse') {
      const cx = parseFloat(node.getAttribute('cx') || 0); const cy = parseFloat(node.getAttribute('cy') || 0); 
      const rx = parseFloat(node.getAttribute('rx') || 0); const ry = parseFloat(node.getAttribute('ry') || 0);
      const ox = rx * 0.551915024494; const oy = ry * 0.551915024494;
      return `M ${cx} ${cy - ry} C ${cx + ox} ${cy - ry} ${cx + rx} ${cy - oy} ${cx + rx} ${cy} C ${cx + rx} ${cy + oy} ${cx + ox} ${cy + ry} ${cx} ${cy + ry} C ${cx - ox} ${cy + ry} ${cx - rx} ${cy + oy} ${cx - rx} ${cy} C ${cx - rx} ${cy - oy} ${cx - ox} ${cy - ry} ${cx} ${cy - ry} Z`;
    }
    if (tag === 'polygon' || tag === 'polyline') {
      const pts = (node.getAttribute('points') || '').trim().split(/[\s,]+/).filter(Boolean);
      if (pts.length < 2) return '';
      let d = `M ${pts[0]} ${pts[1]} `;
      for (let i = 2; i < pts.length; i += 2) if (pts[i+1] !== undefined) d += `L ${pts[i]} ${pts[i+1]} `;
      if (tag === 'polygon') d += 'Z';
      return d;
    }
    if (tag === 'line') {
      let x1 = parseFloat(node.getAttribute('x1') || 0), y1 = parseFloat(node.getAttribute('y1') || 0);
      let x2 = parseFloat(node.getAttribute('x2') || 0), y2 = parseFloat(node.getAttribute('y2') || 0);
      return `M ${x1} ${y1} L ${x2} ${y2}`;
    }
    return '';
  };

  const getTrianglePoints = (d, scaleX, scaleY) => {
      let norm = d.replace(/([a-zA-Z])/g, ' $1 ').trim().split(/\s+/);
      let pts = []; let currentX = 0, currentY = 0;
      for(let i=0; i<norm.length; i++) {
        let up = norm[i].toUpperCase();
        if(up==='M' || up==='L') { 
            currentX = parseFloat(norm[i+1])||0; currentY = parseFloat(norm[i+2])||0;
            pts.push({x: currentX*scaleX, y: currentY*scaleY}); i+=2; 
        }
        else if(up==='H') { currentX = parseFloat(norm[i+1])||0; pts.push({x: currentX*scaleX, y: currentY*scaleY}); i++; }
        else if(up==='V') { currentY = parseFloat(norm[i+1])||0; pts.push({x: currentX*scaleX, y: currentY*scaleY}); i++; }
      }
      let uniquePts = [];
      pts.forEach(p => {
        if(uniquePts.length === 0) uniquePts.push(p);
        else {
            let last = uniquePts[uniquePts.length-1];
            if(Math.abs(p.x - last.x) > 1 || Math.abs(p.y - last.y) > 1) {
                let first = uniquePts[0];
                if(Math.abs(p.x - first.x) > 1 || Math.abs(p.y - first.y) > 1) uniquePts.push(p);
            }
        }
      });
      if (uniquePts.length >= 3) return uniquePts.slice(0,3);
      return null;
  };

  const handleConvert = () => {
    if (!svgInput) return;

    const parser = new DOMParser();
    const doc = parser.parseFromString(svgInput, "image/svg+xml");

    let svgW = 1080; let svgH = 1350; 
    const svgElMain = doc.querySelector('svg');
    if (svgElMain) {
        const vw = svgElMain.getAttribute('viewBox');
        if (vw) {
            const parts = vw.split(/[\s,]+/);
            if (parts.length >= 4) { svgW = parseFloat(parts[2]); svgH = parseFloat(parts[3]); }
        } else {
            svgW = parseFloat(svgElMain.getAttribute('width')) || 1080;
            svgH = parseFloat(svgElMain.getAttribute('height')) || 1350;
        }
    }

    let canvasW = svgW; let canvasH = svgH;
    switch(ratio) {
      case '16:9': canvasW = 1920; canvasH = 1080; break;
      case '9:16': canvasW = 1080; canvasH = 1920; break;
      case '4:5': canvasW = 1080; canvasH = 1350; break;
      case '4:3': canvasW = 1440; canvasH = 1080; break;
      case '1:1': canvasW = 1080; canvasH = 1080; break;
      default: break; 
    }

    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.visibility = 'hidden';
    container.innerHTML = svgInput;
    document.body.appendChild(container);

    const svgDOM = container.querySelector('svg');
    if (svgDOM) {
        svgDOM.setAttribute('width', canvasW + 'px');
        svgDOM.setAttribute('height', canvasH + 'px');
    }
    
    const svgRect = svgDOM ? svgDOM.getBoundingClientRect() : container.getBoundingClientRect();
    const domElements = Array.from(container.querySelectorAll('path, rect, circle, polygon, polyline, ellipse, line'));

    let bgHex = '#ff000000';
    if (bgColor) bgHex = '#ff' + bgColor.replace('#', '').toLowerCase();

    let xml = `<?xml version='1.0' encoding='UTF-8' ?>\n`;
    xml += `<scene title="SVG_AM_Export" width="${Math.round(canvasW)}" height="${Math.round(canvasH)}" exportWidth="${Math.round(canvasW)}" exportHeight="${Math.round(canvasH)}" precompose="dynamicResolution" bgcolor="${bgHex}" totalTime="${duration}" fps="${fps}" modifiedTime="0" amver="1028417" ffver="106" am="com.alightcreative.motion/5.0.273.1028417" amplatform="android" retime="freeze" retimeAdaptFPS="false">\n`;

    // =======================================================
    // MESIN PENDETEKSI GRADASI & NORMALISASI KOORDINAT (BARU)
    // =======================================================
    const getFillData = (node, opacityGlobal, nodeRect, containerRect) => {
        let fillAttr = node.getAttribute('fill') || node.style?.fill;
        if (!fillAttr && !node.hasAttribute('fill') && !node.style?.fill) fillAttr = '#000000';
        if (!fillAttr || fillAttr === 'none') return { type: 'color', color: '#00000000', tag: '' };

        const toHexAM = (colorStr, op) => {
            if (!colorStr) return '#FF000000';
            let hex = '#ff000000';
            if (colorStr === 'currentColor') hex = '#ff000000';
            else if (colorStr.startsWith('#')) {
                let temp = colorStr.substring(1).toLowerCase();
                if (temp.length === 3) temp = temp.split('').map(c => c + c).join('');
                if (temp.length === 6) hex = '#ff' + temp;
                else if (temp.length === 8) hex = '#' + temp.substring(6, 8) + temp.substring(0, 6);
                else hex = '#ff' + temp;
            }
            if (op < 1) {
                let aa = parseInt(hex.substring(1, 3), 16);
                aa = Math.max(0, Math.min(255, Math.round(aa * op)));
                hex = '#' + aa.toString(16).padStart(2, '0').toLowerCase() + hex.substring(3);
            }
            return hex.toUpperCase(); 
        };

        let nodeOpacity = parseFloat(node.getAttribute('fill-opacity') || node.style?.fillOpacity || 1);
        let finalOpacity = opacityGlobal * nodeOpacity;

        // Cek jika fill adalah referensi Gradient "url(#...)"
        if (fillAttr.includes('url(')) {
            let match = fillAttr.match(/url\(['"]?#([^'")]+)['"]?\)/);
            if (match && match[1]) {
                // FIX BESAR: Harus pake querySelector agar support struktur SVG murni
                let gradEl = doc.querySelector(`[id="${match[1]}"]`);
                if (gradEl) {
                    let isRadial = gradEl.tagName.toLowerCase() === 'radialgradient';
                    let stops = gradEl.querySelectorAll('stop');

                    if (stops.length > 0) {
                        let startStop = stops[0];
                        let endStop = stops[stops.length - 1];

                        let startColorRaw = startStop.getAttribute('stop-color') || startStop.style?.stopColor || '#000000';
                        let endColorRaw = endStop.getAttribute('stop-color') || endStop.style?.stopColor || '#FFFFFF';

                        let startOpRaw = parseFloat(startStop.getAttribute('stop-opacity') ?? startStop.style?.stopOpacity ?? 1);
                        let endOpRaw = parseFloat(endStop.getAttribute('stop-opacity') ?? endStop.style?.stopOpacity ?? 1);

                        let startColor = toHexAM(startColorRaw, finalOpacity * startOpRaw);
                        let endColor = toHexAM(endColorRaw, finalOpacity * endOpRaw);

                        // NORMALISASI KOORDINAT GRADASI (0.0 sampai 1.0)
                        let x1 = gradEl.getAttribute('x1');
                        let y1 = gradEl.getAttribute('y1');
                        let x2 = gradEl.getAttribute('x2');
                        let y2 = gradEl.getAttribute('y2');

                        const parseCoordX = (c, defaultVal) => {
                            if (!c) return defaultVal.toFixed(6);
                            if (c.endsWith('%')) return (parseFloat(c)/100).toFixed(6);
                            let val = parseFloat(c);
                            // Kalau angkanya kegedean (berarti format Piksel, harus kita normalkan ke 0.0 - 1.0)
                            if (Math.abs(val) > 2 && nodeRect && containerRect) {
                                let norm = (val - (nodeRect.left - containerRect.left)) / (nodeRect.width || 1);
                                if (!isNaN(norm)) return norm.toFixed(6);
                            }
                            return (isNaN(val) ? defaultVal : val).toFixed(6);
                        };

                        const parseCoordY = (c, defaultVal) => {
                            if (!c) return defaultVal.toFixed(6);
                            if (c.endsWith('%')) return (parseFloat(c)/100).toFixed(6);
                            let val = parseFloat(c);
                            if (Math.abs(val) > 2 && nodeRect && containerRect) {
                                let norm = (val - (nodeRect.top - containerRect.top)) / (nodeRect.height || 1);
                                if (!isNaN(norm)) return norm.toFixed(6);
                            }
                            return (isNaN(val) ? defaultVal : val).toFixed(6);
                        };

                        let startStr = `${parseCoordX(x1, 0.0)},${parseCoordY(y1, 0.0)}`;
                        let endStr = `${parseCoordX(x2, 1.0)},${parseCoordY(y2, 1.0)}`;

                        let tag = `    <gradient type="${isRadial ? 'radial' : 'linear'}" startColor="${startColor}" endColor="${endColor}" start="${startStr}" end="${endStr}"/>\n`;

                        // Alight Motion mewajibkan fillColor Hitam Pekat kalo ada Gradient
                        return { type: 'gradient', color: '#FF000000', tag: tag };
                    }
                }
            }
        }

        return { type: 'color', color: toHexAM(fillAttr, finalOpacity), tag: '' };
    };

    domElements.forEach((node, index) => {
      const layerState = parsedLayers[index];
      if (!layerState || !layerState.included) return;

      const tag = node.tagName.toLowerCase();
      const exportType = exportMode === 'vectorart' ? 'vectorart' : layerState.exportType; 
      
      let sType = ""; let extraProps = "";
      
      const rect = node.getBoundingClientRect();
      const scaleX = canvasW / (svgRect.width || canvasW);
      const scaleY = canvasH / (svgRect.height || canvasH);
      let w = rect.width * scaleX;
      let h = rect.height * scaleY;
      
      let cx = (rect.left - svgRect.left) * scaleX + (w / 2);
      let cy = (rect.top - svgRect.top) * scaleY + (h / 2);

      if (exportType === 'triangle') {
         sType = ".triangle"; 
         let tPts = null;
         
         if (tag === 'polygon' || tag === 'polyline') {
            let ptsRaw = (node.getAttribute('points') || '').trim().split(/[\s,]+/).filter(Boolean).map(parseFloat);
            if(ptsRaw.length >= 6) {
                tPts = [
                  {x: ptsRaw[0]*scaleX, y: ptsRaw[1]*scaleY},
                  {x: ptsRaw[2]*scaleX, y: ptsRaw[3]*scaleY},
                  {x: ptsRaw[4]*scaleX, y: ptsRaw[5]*scaleY}
                ];
            }
         } else if (tag === 'path') {
            tPts = getTrianglePoints(node.getAttribute('d'), scaleX, scaleY);
         }

         if (tPts) {
             let minX = Math.min(tPts[0].x, tPts[1].x, tPts[2].x); let maxX = Math.max(tPts[0].x, tPts[1].x, tPts[2].x);
             let minY = Math.min(tPts[0].y, tPts[1].y, tPts[2].y); let maxY = Math.max(tPts[0].y, tPts[1].y, tPts[2].y);
             cx = (minX + maxX) / 2; cy = (minY + maxY) / 2;
             extraProps += `    <property name="p1" type="vec2" value="${(tPts[0].x - cx).toFixed(6)},${(tPts[0].y - cy).toFixed(6)}" />\n`;
             extraProps += `    <property name="p2" type="vec2" value="${(tPts[1].x - cx).toFixed(6)},${(tPts[1].y - cy).toFixed(6)}" />\n`;
             extraProps += `    <property name="p3" type="vec2" value="${(tPts[2].x - cx).toFixed(6)},${(tPts[2].y - cy).toFixed(6)}" />\n`;
         } else {
             extraProps += `    <property name="p1" type="vec2" value="0.000000,-${(h/2).toFixed(6)}" />\n`;
             extraProps += `    <property name="p2" type="vec2" value="${(w/2).toFixed(6)},${(h/2).toFixed(6)}" />\n`;
             extraProps += `    <property name="p3" type="vec2" value="-${(w/2).toFixed(6)},${(h/2).toFixed(6)}" />\n`;
         }
         extraProps += `    <property name="closed" type="bool" value="true" />\n`;
      }
      else if (exportType === 'roundrect') {
         sType = ".roundrect"; 
         extraProps += `    <property name="size" type="vec2" value="${w.toFixed(6)},${h.toFixed(6)}" />\n`;
         
         let corner = 0;
         if (tag === 'rect') corner = parseFloat(node.getAttribute('rx') || 0) * scaleX;
         else if (tag === 'circle' || tag === 'ellipse') corner = Math.min(w, h) / 2;
         else corner = 24; 
         
         if (corner === 0) corner = 24; 
         extraProps += `    <property name="cornerRadius" type="float" value="${corner.toFixed(6)}" />\n`;
      }
      else if (exportType === 'rect') {
         sType = ".rect";
         extraProps += `    <property name="size" type="vec2" value="${w.toFixed(6)},${h.toFixed(6)}" />\n`;
      }
      else if (exportType === 'vectorart') {
         sType = ""; 
         cx = canvasW / 2; cy = canvasH / 2;
         let d = extractPathFromNode(node); 
         extraProps += `    <path d="${shiftPath(d, cx, cy, scaleX, scaleY)}" />\n`;
      }

      // PANNGIL MESIN WARNA & GRADASI BARU
      const fillData = getFillData(node, opacity, rect, svgRect);
      
      if (includeStroke) {
        const strokeColorRaw = node.getAttribute('stroke') || node.style?.stroke;
        if (strokeColorRaw && strokeColorRaw !== 'none') {
            const strokeData = getFillData({ getAttribute: (k) => k==='fill' ? strokeColorRaw : null, style: {} }, opacity, rect, svgRect);
            let strokeWidth = parseFloat(node.getAttribute('stroke-width') || node.style?.strokeWidth);
            if (isNaN(strokeWidth)) strokeWidth = 2.0; 
            strokeWidth = strokeWidth * ((scaleX + scaleY) / 2);

            extraProps += `    <strokeColor value="${strokeData.color}" />\n`;
            extraProps += `    <property name="strokeWidth" type="float" value="${strokeWidth.toFixed(6)}" />\n`;
        }
      }

      const shapeId = 2000 + index;
      const label = layerState.name;

      // CETAK TAG SHAPE DENGAN FILLTYPE YANG BENAR
      let shapeStr = `  <shape id="${shapeId}" label="${label}" startTime="0" endTime="${duration}" fillType="${fillData.type}" mediaFillMode="fill"`;
      if (sType !== "") shapeStr += ` s="${sType}">\n`; 
      else shapeStr += `>\n`; 

      xml += shapeStr;
      xml += `    <transform>\n`;
      xml += `      <location value="${cx.toFixed(6)},${cy.toFixed(6)},0.000000" />\n`;
      xml += `    </transform>\n`;
      xml += `    <fillColor value="${fillData.color}" />\n`;
      
      // Sisipkan Tag Gradasi (Jika Ditemukan)
      if (fillData.tag) {
          xml += fillData.tag;
      }

      xml += extraProps;
      xml += `  </shape>\n`;
    });

    xml += `</scene>`;
    document.body.removeChild(container);
    setXmlOutput(xml);
    setShowOutput(true);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(xmlOutput);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!xmlOutput) return;
    const blob = new Blob([xmlOutput], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'alight_motion_gradient_support.xml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#F0D9B5] text-[#5A3A22] pb-12 selection:bg-[#FFAD60]">
      <header className="bg-[#FFAD60] border-b-[8px] border-[#5A3A22] px-6 py-4 flex items-center justify-between sticky top-0 z-50 pixel-font shadow-[0_8px_0_0_rgba(90,58,34,0.3)]">
        <div className="flex items-center gap-3">
          <div className="bg-[#5A3A22] p-2 text-[#FFAD60]">
            <Terminal size={18} strokeWidth={3} />
          </div>
          <span className="text-sm mt-1">LINIER<span className="text-[#FFF5EB]">.8BIT</span></span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8 pixel-font">
        <div className="flex flex-col gap-8">
          
          <PixelWindow title="Project Configuration" icon={Settings2}>
            <div className="mb-5 bg-[#E5CBA8] p-3 border-[4px] border-[#5A3A22]">
              <label className="text-[8px] text-[#5A3A22] mb-3 block font-bold">GLOBAL EXPORT MODE:</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setExportMode('hybrid')}
                  className="text-[8px] p-2 active:translate-y-1 transition-transform"
                  style={{
                    backgroundColor: exportMode === 'hybrid' ? '#5A3A22' : '#FFF5EB', 
                    color: exportMode === 'hybrid' ? '#FFAD60' : '#5A3A22',
                    boxShadow: exportMode === 'hybrid' ? 'none' : 'inset -2px -2px 0px 0px #E5CBA8, 0 0 0 2px #5A3A22',
                    border: exportMode === 'hybrid' ? '2px solid #5A3A22' : 'none', margin: '2px'
                  }}
                >✅ SMART HYBRID (Auto-Detect)</button>
                <button
                  onClick={() => setExportMode('vectorart')}
                  className="text-[8px] p-2 active:translate-y-1 transition-transform"
                  style={{
                    backgroundColor: exportMode === 'vectorart' ? '#5A3A22' : '#FFF5EB', 
                    color: exportMode === 'vectorart' ? '#FFAD60' : '#5A3A22',
                    boxShadow: exportMode === 'vectorart' ? 'none' : 'inset -2px -2px 0px 0px #E5CBA8, 0 0 0 2px #5A3A22',
                    border: exportMode === 'vectorart' ? '2px solid #5A3A22' : 'none', margin: '2px'
                  }}
                >🎨 PURE VECTOR ART (Force Paths)</button>
              </div>
            </div>

            <div className="mb-5">
              <label className="text-[8px] text-[#5A3A22] mb-3 block">CANVAS RATIO:</label>
              <div className="flex flex-wrap gap-2">
                {ratios.map(r => (
                  <button
                    key={r} onClick={() => setRatio(r)}
                    className="text-[8px] p-2 active:translate-y-1 transition-transform"
                    style={{
                      backgroundColor: ratio === r ? '#5A3A22' : '#FFF5EB', color: ratio === r ? '#FFAD60' : '#5A3A22',
                      boxShadow: ratio === r ? 'none' : 'inset -2px -2px 0px 0px #E5CBA8, 0 0 0 2px #5A3A22',
                      border: ratio === r ? '2px solid #5A3A22' : 'none', margin: '2px'
                    }}
                  >{r}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="text-[8px] flex items-center gap-1 text-[#5A3A22] mb-2"><MonitorPlay size={10}/> FPS:</label>
                <div className="relative">
                  <select 
                    value={fps} onChange={(e) => setFps(e.target.value)}
                    className="w-full appearance-none bg-[#FFF5EB] border-[4px] border-[#5A3A22] px-3 py-2 text-[8px] focus:outline-none"
                    style={{ boxShadow: 'inset -3px -3px 0px 0px #E5CBA8' }}
                  >
                    <option value="15">15 FPS</option>
                    <option value="30">30 FPS</option>
                    <option value="60">60 FPS</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#5A3A22]" size={14} strokeWidth={3} />
                </div>
              </div>
              <div>
                <label className="text-[8px] flex items-center gap-1 text-[#5A3A22] mb-2"><Clock size={10}/> DURATION (MS):</label>
                <input 
                  type="number" value={duration} onChange={(e) => setDuration(e.target.value)}
                  className="w-full bg-[#FFF5EB] border-[4px] border-[#5A3A22] px-3 py-1.5 text-[8px] focus:outline-none"
                  style={{ boxShadow: 'inset -3px -3px 0px 0px #E5CBA8' }}
                />
              </div>
            </div>

            <div className="bg-[#E5CBA8] p-4 border-[4px] border-[#5A3A22]">
              <div className="mb-4 flex items-center gap-3">
                <label className="text-[8px] flex items-center gap-1 text-[#5A3A22]"><Palette size={10}/> BG COLOR:</label>
                <div className="flex gap-2 flex-1">
                  <input 
                    type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)}
                    className="w-8 h-8 border-[2px] border-[#5A3A22] p-0 cursor-pointer"
                  />
                  <input 
                    type="text" value={bgColor} onChange={(e) => setBgColor(e.target.value)}
                    className="flex-1 bg-[#FFF5EB] border-[2px] border-[#5A3A22] px-2 text-[8px] uppercase focus:outline-none"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer mb-6">
                <div 
                  className="w-6 h-6 border-[4px] border-[#5A3A22] flex items-center justify-center bg-[#FFF5EB]"
                  onClick={() => setIncludeStroke(!includeStroke)}
                >
                  {includeStroke && <div className="w-3 h-3 bg-[#5A3A22]"></div>}
                </div>
                <span className="text-[8px] mt-1 font-bold">INCLUDE SVG OUTLINE STROKE</span>
              </label>

              <div>
                <div className="flex justify-between mb-3">
                  <span className="text-[8px]">GLOBAL OPACITY</span>
                  <span className="text-[8px] bg-[#5A3A22] text-[#FFAD60] px-2 py-1">{Math.round(opacity * 100)}%</span>
                </div>
                <input 
                  type="range" min="0" max="1" step="0.1" value={opacity} onChange={(e) => setOpacity(parseFloat(e.target.value))}
                />
              </div>
            </div>
          </PixelWindow>

          <PixelWindow 
            title="Input.svg" icon={FileCode2}
            rightHeader={
              <div>
                <input type="file" accept=".svg" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                <button onClick={() => fileInputRef.current.click()} className="text-[8px] bg-[#5A3A22] text-[#FFAD60] px-2 py-1 flex items-center gap-1 active:translate-y-1">
                  <UploadCloud size={10} /> UPLOAD
                </button>
              </div>
            }
          >
            <textarea 
              value={svgInput} onChange={(e) => setSvgInput(e.target.value)}
              placeholder="PASTE SVG CODE HERE..." spellCheck="false"
              className="flex-1 w-full bg-[#5A3A22] text-[#FFAD60] border-[4px] border-[#5A3A22] p-4 text-[10px] resize-none focus:outline-none min-h-[150px]"
              style={{ lineHeight: '1.8' }}
            />
          </PixelWindow>
        </div>

        <div className="flex flex-col gap-8">
          <div className="h-[250px]">
            <PixelWindow title="Preview" icon={ImageIcon}>
              <div className="w-full h-full border-[4px] border-[#5A3A22] relative overflow-hidden flex items-center justify-center bg-[#FFF5EB]">
                <div className="absolute inset-0 pixel-checkerboard"></div>
                {svgInput ? (
                  <div dangerouslySetInnerHTML={{ __html: svgInput }} className="relative z-10 w-2/3 h-2/3 flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full drop-shadow-[4px_4px_0_rgba(90,58,34,0.5)]" />
                ) : (
                  <div className="relative z-10 text-center flex flex-col items-center opacity-60">
                    <div className="w-16 h-16 border-[4px] border-[#5A3A22] bg-[#E5CBA8] mb-4 flex items-center justify-center"><ImageIcon size={32} className="text-[#5A3A22]" /></div>
                    <p className="text-[10px]">AWAITING SVG...</p>
                  </div>
                )}
              </div>
            </PixelWindow>
          </div>

          <div className="flex-1 min-h-[250px]">
            <PixelWindow 
              title="Shape Auto-Detection & Selection" icon={Layers}
              rightHeader={<span className="text-[8px] bg-[#FFAD60] text-[#5A3A22] px-2 py-1 border-[2px] border-[#5A3A22]">{parsedLayers.filter(l=>l.included).length} ITEMS</span>}
            >
               <div className="h-full bg-[#5A3A22] border-[4px] border-[#5A3A22] p-2 overflow-y-auto">
                  {parsedLayers.length > 0 ? (
                    <div className="space-y-2">
                      {parsedLayers.map((layer, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-[#4A2A12] p-2 border-l-[4px] border-[#FFAD60]">
                          <input 
                            type="checkbox" 
                            checked={layer.included} 
                            onChange={(e) => updateLayer(idx, 'included', e.target.checked)}
                            className="accent-[#FFAD60] cursor-pointer"
                          />
                          <input 
                            type="text" 
                            value={layer.name}
                            onChange={(e) => updateLayer(idx, 'name', e.target.value)}
                            className="w-16 text-[8px] flex-1 bg-transparent text-[#FFAD60] outline-none border-b border-[#5A3A22] focus:border-[#FFAD60]"
                          />
                          <div className="relative w-24">
                            <select 
                              value={exportMode === 'vectorart' ? 'vectorart' : layer.exportType}
                              disabled={exportMode === 'vectorart'}
                              onChange={(e) => updateLayer(idx, 'exportType', e.target.value)}
                              className={`w-full appearance-none ${exportMode === 'vectorart' ? 'bg-[#E5CBA8] opacity-60' : 'bg-[#FFF5EB]'} border-[2px] border-[#5A3A22] px-2 py-1 text-[8px] focus:outline-none text-[#5A3A22] font-bold`}
                            >
                              <option value="rect">.rect</option>
                              <option value="roundrect">.roundrect</option>
                              <option value="triangle">.triangle</option>
                              <option value="vectorart">Vector Art (Path)</option>
                            </select>
                            <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-[#5A3A22]" size={10} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-[8px] text-[#FFAD60] text-center opacity-50">WAITING FOR INPUT...</div>
                  )}
               </div>
            </PixelWindow>
          </div>
        </div>
      </main>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pb-8">
        <div className="bg-[#FFAD60] border-[4px] border-[#5A3A22] p-4 flex gap-4 shadow-[8px_8px_0_0_rgba(90,58,34,0.4)]">
          <PixelButton primary className="flex-1" onClick={handleConvert} disabled={!svgInput || parsedLayers.filter(l=>l.included).length === 0}>
            <Zap size={16} fill="#5A3A22" /> GENERATE SMART XML
          </PixelButton>
          <PixelButton onClick={() => {setSvgInput(''); setParsedLayers([]);}} className="w-16 flex items-center justify-center">
            <X size={16} strokeWidth={3} />
          </PixelButton>
        </div>
      </div>

      {showOutput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(90,58,34,0.8)]">
          <div className="w-full max-w-3xl h-[80vh]">
            <PixelWindow 
              title="Output.xml" icon={Terminal}
              rightHeader={<button onClick={() => setShowOutput(false)} className="text-[#5A3A22] active:translate-y-1 bg-[#FFF5EB] border-[2px] border-[#5A3A22] p-1"><X size={14} strokeWidth={3} /></button>}
            >
              <div className="p-2 relative h-full flex flex-col">
                <textarea readOnly value={xmlOutput} style={{ lineHeight: '1.8' }} className="flex-1 w-full bg-[#5A3A22] text-[#FFAD60] p-4 text-[10px] border-[4px] border-[#5A3A22] focus:outline-none resize-none" />
                <div className="mt-4 flex justify-end gap-3">
                  <PixelButton onClick={handleDownload}><Download size={14} strokeWidth={3} /> DOWNLOAD</PixelButton>
                  <PixelButton primary onClick={handleCopy}>
                    {isCopied ? <Check size={14} strokeWidth={3} /> : <Copy size={14} strokeWidth={3} />} {isCopied ? 'COPIED!' : 'COPY XML'}
                  </PixelButton>
                </div>
              </div>
            </PixelWindow>
          </div>
        </div>
      )}
    </div>
  );
}