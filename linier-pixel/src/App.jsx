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
  const [svgInput, setSvgInput] = useState('');
  const [xmlOutput, setXmlOutput] = useState('');
  const [showOutput, setShowOutput] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [parsedLayers, setParsedLayers] = useState([]);
  
  const fileInputRef = useRef(null);
  const ratios = ['Auto (From SVG)', '1:1', '16:9', '9:16', '4:5', '4:3'];

  // ALGORITMA SAKTI: PENDETEKSI SHAPE DARI KODE DALAMAN <path>
  const detectPathShape = (d) => {
    if (!d) return "path";
    let norm = d.replace(/([a-zA-Z])/g, ' $1 ').trim().split(/\s+/);
    
    // Kalau ada kurva, anggap sebagai Roundrect / Circle
    const hasCurve = /[CQAcaq]/.test(d);
    if (hasCurve) {
        // Kalau bentuknya terlalu rumit (kurvanya banyak banget), jadikan path murni
        const cCount = (d.match(/[CQAcaq]/g) || []).length;
        if (cCount > 8) return "path"; 
        return "roundrect";
    }
    
    let pts = [];
    let currentX = 0, currentY = 0;
    for(let i=0; i<norm.length; i++) {
        let c = norm[i].toUpperCase();
        if(c==='M' || c==='L') { 
            currentX = parseFloat(norm[i+1]); currentY = parseFloat(norm[i+2]);
            pts.push({x: currentX, y: currentY}); i+=2; 
        }
        else if(c==='H') { currentX = parseFloat(norm[i+1]); pts.push({x: currentX, y: currentY}); i++; }
        else if(c==='V') { currentY = parseFloat(norm[i+1]); pts.push({x: currentX, y: currentY}); i++; }
    }
    
    let uniquePts = [];
    pts.forEach(p => {
        if(uniquePts.length === 0) uniquePts.push(p);
        else {
            let last = uniquePts[uniquePts.length-1];
            // Cek apakah jarak titiknya lumayan jauh (bukan titik dobel)
            if(Math.abs(p.x - last.x) > 1 || Math.abs(p.y - last.y) > 1) {
                let first = uniquePts[0];
                if(Math.abs(p.x - first.x) > 1 || Math.abs(p.y - first.y) > 1) uniquePts.push(p);
            }
        }
    });

    // Otomatis menetapkan s=".triangle" atau s=".rect" berdasarkan sudut!
    if (uniquePts.length === 3) return "triangle";
    if (uniquePts.length === 4) return "rect";
    return "path";
  };

  useEffect(() => {
    if (!svgInput.trim()) { setParsedLayers([]); return; }
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgInput, "image/svg+xml");
      const elements = doc.querySelectorAll('path, rect, circle, polygon, polyline, ellipse, line');
      
      const layers = Array.from(elements).map((el, i) => {
        const tag = el.tagName.toLowerCase();
        let detectedType = "path";

        if (tag === 'rect') {
           const rx = parseFloat(el.getAttribute('rx') || 0);
           detectedType = rx > 0 ? "roundrect" : "rect";
        } else if (tag === 'circle' || tag === 'ellipse') {
           detectedType = "roundrect";
        } else if (tag === 'polygon' || tag === 'polyline') {
           const pts = (el.getAttribute('points') || '').trim().split(/[\s,]+/).filter(Boolean);
           detectedType = pts.length === 6 ? "triangle" : "path";
        } else if (tag === 'path') {
           // BACA ISI DALAMAN FIGMA PATH
           detectedType = detectPathShape(el.getAttribute('d'));
        }

        return {
          id: i, 
          exportType: detectedType,
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

  // KALKULATOR PATH MATEMATIKA ALIGHT MOTION
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
                  let x = parseFloat(tokens[i]);
                  out.push((isUpper ? (x * scaleX - cx) : (x * scaleX)).toFixed(4)); i++;
              } else if (c === 'V') {
                  let y = parseFloat(tokens[i]);
                  out.push((isUpper ? (y * scaleY - cy) : (y * scaleY)).toFixed(4)); i++;
              } else if (c === 'M' || c === 'L' || c === 'T') {
                  let x = parseFloat(tokens[i]), y = parseFloat(tokens[i+1]);
                  out.push((isUpper ? (x * scaleX - cx) : (x * scaleX)).toFixed(4));
                  out.push((isUpper ? (y * scaleY - cy) : (y * scaleY)).toFixed(4)); i += 2;
              } else if (c === 'Q' || c === 'S') {
                  let x1 = parseFloat(tokens[i]), y1 = parseFloat(tokens[i+1]);
                  let x = parseFloat(tokens[i+2]), y = parseFloat(tokens[i+3]);
                  out.push((isUpper ? (x1 * scaleX - cx) : (x1 * scaleX)).toFixed(4));
                  out.push((isUpper ? (y1 * scaleY - cy) : (y1 * scaleY)).toFixed(4));
                  out.push((isUpper ? (x * scaleX - cx) : (x * scaleX)).toFixed(4));
                  out.push((isUpper ? (y * scaleY - cy) : (y * scaleY)).toFixed(4)); i += 4;
              } else if (c === 'C') {
                  let x1 = parseFloat(tokens[i]), y1 = parseFloat(tokens[i+1]);
                  let x2 = parseFloat(tokens[i+2]), y2 = parseFloat(tokens[i+3]);
                  let x = parseFloat(tokens[i+4]), y = parseFloat(tokens[i+5]);
                  out.push((isUpper ? (x1 * scaleX - cx) : (x1 * scaleX)).toFixed(4));
                  out.push((isUpper ? (y1 * scaleY - cy) : (y1 * scaleY)).toFixed(4));
                  out.push((isUpper ? (x2 * scaleX - cx) : (x2 * scaleX)).toFixed(4));
                  out.push((isUpper ? (y2 * scaleY - cy) : (y2 * scaleY)).toFixed(4));
                  out.push((isUpper ? (x * scaleX - cx) : (x * scaleX)).toFixed(4));
                  out.push((isUpper ? (y * scaleY - cy) : (y * scaleY)).toFixed(4)); i += 6;
              } else if (c === 'A') {
                  let rx = parseFloat(tokens[i]), ry = parseFloat(tokens[i+1]);
                  let rot = parseFloat(tokens[i+2]), fa = parseFloat(tokens[i+3]), fs = parseFloat(tokens[i+4]);
                  let x = parseFloat(tokens[i+5]), y = parseFloat(tokens[i+6]);
                  out.push((rx * scaleX).toFixed(4)); out.push((ry * scaleY).toFixed(4));
                  out.push(rot); out.push(fa); out.push(fs);
                  out.push((isUpper ? (x * scaleX - cx) : (x * scaleX)).toFixed(4));
                  out.push((isUpper ? (y * scaleY - cy) : (y * scaleY)).toFixed(4)); i += 7;
              } else {
                  out.push(tokens[i]); i++;
              }
          }
      }
      return out.join(' ');
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
      return `M ${cx} ${cy} m -${r}, 0 a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 -${r * 2},0`;
    }
    return '';
  };

  const getTrianglePoints = (d, scaleX, scaleY) => {
      let norm = d.replace(/([a-zA-Z])/g, ' $1 ').trim().split(/\s+/);
      let pts = []; let currentX = 0, currentY = 0;
      for(let i=0; i<norm.length; i++) {
        let up = norm[i].toUpperCase();
        if(up==='M' || up==='L') { 
            currentX = parseFloat(norm[i+1]); currentY = parseFloat(norm[i+2]);
            pts.push({x: currentX*scaleX, y: currentY*scaleY}); i+=2; 
        }
        else if(up==='H') { currentX = parseFloat(norm[i+1]); pts.push({x: currentX*scaleX, y: currentY*scaleY}); i++; }
        else if(up==='V') { currentY = parseFloat(norm[i+1]); pts.push({x: currentX*scaleX, y: currentY*scaleY}); i++; }
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

    // HEADER XML
    let xml = `<?xml version='1.0' encoding='UTF-8' ?>\n`;
    xml += `<scene title="SVG_AM_Export" width="${Math.round(canvasW)}" height="${Math.round(canvasH)}" exportWidth="${Math.round(canvasW)}" exportHeight="${Math.round(canvasH)}" precompose="dynamicResolution" bgcolor="${bgHex}" totalTime="${duration}" fps="${fps}" modifiedTime="0" amver="1028417" ffver="106" am="com.alightcreative.motion/5.0.273.1028417" amplatform="android" retime="freeze" retimeAdaptFPS="false">\n`;

    const parseColor = (node, attrType) => {
      let svgColor = node.getAttribute(attrType) || node.style?.[attrType];
      if (attrType === 'fill' && !node.hasAttribute('fill') && !node.style?.fill) svgColor = '#000000'; 
      if (!svgColor || svgColor === 'none') return '#00000000'; 
      
      let hex = '#ff000000'; 
      if (svgColor === 'currentColor') hex = '#ff000000'; 
      else if (svgColor.startsWith('#')) {
        let temp = svgColor.substring(1).toLowerCase();
        if (temp.length === 3) temp = temp.split('').map(c => c + c).join(''); 
        if (temp.length === 6) hex = '#ff' + temp; 
        else if (temp.length === 8) hex = '#' + temp.substring(6, 8) + temp.substring(0, 6);
        else hex = '#ff' + temp;
      }
      
      let finalOpacity = opacity;
      let attrOpacity = parseFloat(node.getAttribute(`${attrType}-opacity`) || node.style?.[`${attrType}Opacity`] || 1);
      if (attrOpacity < 1) finalOpacity = opacity * attrOpacity;

      if (finalOpacity < 1) {
        let aa = parseInt(hex.substring(1, 3), 16);
        aa = Math.round(aa * finalOpacity);
        hex = '#' + aa.toString(16).padStart(2, '0').toLowerCase() + hex.substring(3);
      }
      return hex;
    };

    domElements.forEach((node, index) => {
      const layerState = parsedLayers[index];
      if (!layerState || !layerState.included) return;

      const tag = node.tagName.toLowerCase();
      const exportType = layerState.exportType; // Mengambil tipe dari drop-down / auto-detect
      let sType = ""; let extraProps = "";
      
      const rect = node.getBoundingClientRect();
      const scaleX = canvasW / (svgRect.width || canvasW);
      const scaleY = canvasH / (svgRect.height || canvasH);
      let w = rect.width * scaleX;
      let h = rect.height * scaleY;
      
      let cx = (rect.left - svgRect.left) * scaleX + (w / 2);
      let cy = (rect.top - svgRect.top) * scaleY + (h / 2);

      // ==================================================
      // EKSEKUSI PEMBENTUKAN SHAPE BERDASARKAN DETEKSI
      // ==================================================

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
             cx = (minX + maxX) / 2;
             cy = (minY + maxY) / 2;
             extraProps += `    <property name="p1" type="vec2" value="${(tPts[0].x - cx).toFixed(6)},${(tPts[0].y - cy).toFixed(6)}" />\n`;
             extraProps += `    <property name="p2" type="vec2" value="${(tPts[1].x - cx).toFixed(6)},${(tPts[1].y - cy).toFixed(6)}" />\n`;
             extraProps += `    <property name="p3" type="vec2" value="${(tPts[2].x - cx).toFixed(6)},${(tPts[2].y - cy).toFixed(6)}" />\n`;
         } else {
             // Fallback bounding box
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
      else if (exportType === 'path') {
         sType = ""; // INI KUNCI UTAMA SHAPE_004 (BENTUK PATH MURNI TANPA s="")
         cx = canvasW / 2; 
         cy = canvasH / 2;
         let d = tag === 'path' ? node.getAttribute('d') : extractPathFromNode(node);
         extraProps += `    <path d="${shiftPath(d, cx, cy, scaleX, scaleY)}" />\n`;
      }

      const fillColor = parseColor(node, 'fill');
      
      // OUTLINE STROKE
      if (includeStroke) {
        const strokeColorRaw = node.getAttribute('stroke') || node.style?.stroke;
        if (strokeColorRaw && strokeColorRaw !== 'none') {
            const strokeColor = parseColor(node, 'stroke');
            let strokeWidth = parseFloat(node.getAttribute('stroke-width') || node.style?.strokeWidth);
            if (isNaN(strokeWidth)) strokeWidth = 2.0; 
            strokeWidth = strokeWidth * ((scaleX + scaleY) / 2);

            extraProps += `    <strokeColor value="${strokeColor}" />\n`;
            extraProps += `    <property name="strokeWidth" type="float" value="${strokeWidth.toFixed(6)}" />\n`;
        }
      }

      const shapeId = 2000 + index;
      const label = layerState.name;

      // CETAK TAG SHAPE SESUAI REQUEST ANDA (ADA YANG PAKE s= ADA YANG NGGAK)
      let shapeStr = `  <shape id="${shapeId}" label="${label}" startTime="0" endTime="${duration}" fillType="color" mediaFillMode="fill"`;
      if (sType !== "") {
         shapeStr += ` s="${sType}">\n`; 
      } else {
         shapeStr += `>\n`; 
      }

      xml += shapeStr;
      xml += `    <transform>\n`;
      xml += `      <location value="${cx.toFixed(6)},${cy.toFixed(6)},0.000000" />\n`;
      xml += `    </transform>\n`;
      xml += `    <fillColor value="${fillColor}" />\n`;
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
    a.download = 'alight_motion_smart_export.xml';
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
              rightHeader={<span className="text-[8px] bg-[#FFAD60] text-[#5A3A22] px-2 py-1 border-[2px] border-[#5A3A22]">{parsedLayers.filter(l=>l.included).length} SELECTED</span>}
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
                              value={layer.exportType}
                              onChange={(e) => updateLayer(idx, 'exportType', e.target.value)}
                              className="w-full appearance-none bg-[#FFF5EB] border-[2px] border-[#5A3A22] px-2 py-1 text-[8px] focus:outline-none text-[#5A3A22] font-bold"
                            >
                              <option value="rect">.rect</option>
                              <option value="roundrect">.roundrect</option>
                              <option value="triangle">.triangle</option>
                              <option value="path">path murni</option>
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