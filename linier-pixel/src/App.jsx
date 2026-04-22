import React, { useState, useRef, useEffect } from 'react';
import { 
  Zap, 
  X, 
  Image as ImageIcon, 
  UploadCloud,
  Layers,
  Settings2,
  Check,
  Copy,
  Terminal,
  FileCode2,
  ChevronDown
} from 'lucide-react';

// === PINDAHKAN KE LUAR SINI ===
// Komponen UI diletakkan di luar fungsi utama App() agar React tidak me-render ulangnya dari nol setiap saat

const PixelWindow = ({ title, icon: Icon, children, rightHeader }) => (
  <div 
    className="bg-[#FFF5EB] relative flex flex-col h-full pixel-font"
    style={{
      boxShadow: `
        inset -4px -4px 0px 0px rgba(0,0,0,0.15),
        0 0 0 4px #5A3A22,
        8px 8px 0px 0px rgba(90, 58, 34, 0.4)
      `,
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
    onClick={onClick}
    disabled={disabled}
    className={`relative active:translate-y-1 active:shadow-[inset_0_0_0_0_rgba(0,0,0,0)] transition-transform ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    style={{
      backgroundColor: primary ? '#FFAD60' : '#FFF5EB',
      color: primary ? '#5A3A22' : '#5A3A22',
      padding: '10px 16px',
      boxShadow: primary 
        ? 'inset -4px -4px 0px 0px #D9833B, 0 0 0 4px #5A3A22'
        : 'inset -4px -4px 0px 0px #E5CBA8, 0 0 0 4px #5A3A22',
      margin: '4px',
      fontSize: '10px',
      textTransform: 'uppercase'
    }}
  >
    <div className="flex items-center justify-center gap-2 mt-1">
      {children}
    </div>
  </button>
);

// === FUNGSI UTAMA APP ===
export default function App() {
  const [ratio, setRatio] = useState('1:1');
  const [fillType, setFillType] = useState('Solid Color');
  const [groupType, setGroupType] = useState('EmbedScene');
  const [addStroke, setAddStroke] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const [svgInput, setSvgInput] = useState('');
  const [xmlOutput, setXmlOutput] = useState('');
  const [showOutput, setShowOutput] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [parsedLayers, setParsedLayers] = useState([]);
  
  const fileInputRef = useRef(null);
  const ratios = ['1:1', '16:9', '9:16', '4:5', '4:3', 'Custom'];

  useEffect(() => {
    if (!svgInput.trim()) {
      setParsedLayers([]);
      return;
    }
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgInput, "image/svg+xml");
      const elements = doc.querySelectorAll('path, rect, circle, polygon, ellipse, g');
      
      const layers = Array.from(elements).map((el, i) => {
        let name = el.getAttribute('id') || `${el.tagName} ${i + 1}`;
        return {
          id: i,
          type: el.tagName.toLowerCase(),
          name: name,
        };
      });
      setParsedLayers(layers);
    } catch (e) {
      setParsedLayers([]);
    }
  }, [svgInput]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setSvgInput(event.target.result);
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConvert = () => {
    if (!svgInput) return;
    
    const xmlMock = `<?xml version="1.0" encoding="UTF-8"?>
<scene id="scene_pixel" width="1080" height="1080" framerate="30">
    <element type="shape" name="Imported_Vector">
        <transform>
            <position x="540" y="540"/>
            <scale x="1" y="1"/>
            <opacity value="${opacity}"/>
        </transform>
        <properties>
            <fill type="${fillType === 'Solid Color' ? 'solid' : 'gradient'}">
                <color hex="#FFFFFF" alpha="1.0"/>
            </fill>
            ${addStroke ? `
            <stroke type="solid" width="4.5">
                <color hex="#000000" alpha="1.0"/>
            </stroke>` : ''}
        </properties>
        <pathData groupMode="${groupType}">
            ${parsedLayers.length > 0 ? '<path d="M 10 10 L 90 90 Z" />' : ''}
        </pathData>
    </element>
</scene>`;

    setXmlOutput(xmlMock);
    setShowOutput(true);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(xmlOutput);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
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
        
        <div className="hidden md:flex items-center gap-6 text-[10px] mt-1">
          <span className="cursor-pointer hover:text-[#FFF5EB]">CONVERTER</span>
          <span className="cursor-pointer hover:text-[#FFF5EB]">PANDUAN</span>
          <span className="cursor-pointer hover:text-[#FFF5EB]">START</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8 pixel-font">
        <div className="flex flex-col gap-8">
          <PixelWindow title="Settings" icon={Settings2}>
            <div className="mb-6">
              <label className="text-[8px] text-[#5A3A22] mb-3 block">CANVAS RATIO:</label>
              <div className="flex flex-wrap gap-2">
                {ratios.map(r => (
                  <button
                    key={r}
                    onClick={() => setRatio(r)}
                    className="text-[8px] p-2 active:translate-y-1 transition-transform"
                    style={{
                      backgroundColor: ratio === r ? '#5A3A22' : '#FFF5EB',
                      color: ratio === r ? '#FFAD60' : '#5A3A22',
                      boxShadow: ratio === r 
                        ? 'none' 
                        : 'inset -2px -2px 0px 0px #E5CBA8, 0 0 0 2px #5A3A22',
                      border: ratio === r ? '2px solid #5A3A22' : 'none',
                      margin: '2px'
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-[8px] text-[#5A3A22] mb-2 block">FILL:</label>
                <div className="relative">
                  <select 
                    value={fillType}
                    onChange={(e) => setFillType(e.target.value)}
                    className="w-full appearance-none bg-[#FFF5EB] border-[4px] border-[#5A3A22] px-3 py-2 text-[8px] focus:outline-none"
                    style={{ boxShadow: 'inset -3px -3px 0px 0px #E5CBA8' }}
                  >
                    <option>Solid Color</option>
                    <option>Gradient</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#5A3A22]" size={14} strokeWidth={3} />
                </div>
              </div>
              <div>
                <label className="text-[8px] text-[#5A3A22] mb-2 block">GROUP &lt;G&gt;:</label>
                <div className="relative">
                  <select 
                    value={groupType}
                    onChange={(e) => setGroupType(e.target.value)}
                    className="w-full appearance-none bg-[#FFF5EB] border-[4px] border-[#5A3A22] px-3 py-2 text-[8px] focus:outline-none"
                    style={{ boxShadow: 'inset -3px -3px 0px 0px #E5CBA8' }}
                  >
                    <option>EmbedScene</option>
                    <option>Merge</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#5A3A22]" size={14} strokeWidth={3} />
                </div>
              </div>
            </div>

            <div className="bg-[#E5CBA8] p-4 border-[4px] border-[#5A3A22]">
              <label className="flex items-center gap-3 cursor-pointer mb-6">
                <div 
                  className="w-6 h-6 border-[4px] border-[#5A3A22] flex items-center justify-center bg-[#FFF5EB]"
                  onClick={() => setAddStroke(!addStroke)}
                >
                  {addStroke && <div className="w-3 h-3 bg-[#5A3A22]"></div>}
                </div>
                <span className="text-[8px] mt-1">APPLY STROKE DATA</span>
              </label>

              <div>
                <div className="flex justify-between mb-3">
                  <span className="text-[8px]">OPACITY</span>
                  <span className="text-[8px] bg-[#5A3A22] text-[#FFAD60] px-2 py-1">{Math.round(opacity * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="1" step="0.1" 
                  value={opacity}
                  onChange={(e) => setOpacity(parseFloat(e.target.value))}
                />
              </div>
            </div>
          </PixelWindow>

          <PixelWindow 
            title="Input.svg" 
            icon={FileCode2}
            rightHeader={
              <div>
                <input 
                  type="file" accept=".svg" className="hidden" 
                  ref={fileInputRef} onChange={handleFileUpload}
                />
                <button 
                  onClick={() => fileInputRef.current.click()}
                  className="text-[8px] bg-[#5A3A22] text-[#FFAD60] px-2 py-1 flex items-center gap-1 active:translate-y-1"
                >
                  <UploadCloud size={10} /> UPLOAD
                </button>
              </div>
            }
          >
            <textarea 
              value={svgInput}
              onChange={(e) => setSvgInput(e.target.value)}
              placeholder="PASTE SVG CODE HERE..."
              className="flex-1 w-full bg-[#5A3A22] text-[#FFAD60] border-[4px] border-[#5A3A22] p-4 text-[10px] resize-none focus:outline-none min-h-[150px]"
              style={{ lineHeight: '1.8' }}
              spellCheck="false"
            />
          </PixelWindow>
        </div>

        <div className="flex flex-col gap-8">
          <div className="h-[350px]">
            <PixelWindow title="Preview" icon={ImageIcon}>
              <div className="w-full h-full border-[4px] border-[#5A3A22] relative overflow-hidden flex items-center justify-center bg-[#FFF5EB]">
                <div className="absolute inset-0 pixel-checkerboard"></div>
                {svgInput ? (
                  <div 
                    className="relative z-10 w-2/3 h-2/3 flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full drop-shadow-[4px_4px_0_rgba(90,58,34,0.5)]"
                    dangerouslySetInnerHTML={{ __html: svgInput }}
                  />
                ) : (
                  <div className="relative z-10 text-center flex flex-col items-center opacity-60">
                    <div className="w-16 h-16 border-[4px] border-[#5A3A22] bg-[#E5CBA8] mb-4 flex items-center justify-center">
                      <ImageIcon size={32} className="text-[#5A3A22]" />
                    </div>
                    <p className="text-[10px]">NO SIGNAL</p>
                  </div>
                )}
              </div>
            </PixelWindow>
          </div>

          <div className="flex-1 min-h-[200px]">
            <PixelWindow 
              title="Layers" 
              icon={Layers}
              rightHeader={<span className="text-[8px] bg-[#FFAD60] text-[#5A3A22] px-2 py-1 border-[2px] border-[#5A3A22]">{parsedLayers.length} PTS</span>}
            >
               <div className="h-full bg-[#5A3A22] border-[4px] border-[#5A3A22] p-3 overflow-y-auto">
                  {parsedLayers.length > 0 ? (
                    <div className="space-y-2">
                      {parsedLayers.map((layer, idx) => (
                        <div key={idx} className="flex items-center gap-3 text-[#FFAD60] text-[8px] bg-[#4A2A12] p-2 border-l-[4px] border-[#FFAD60]">
                          <span>{`>`}</span>
                          <span className="uppercase">{layer.type}</span>
                          <span className="opacity-50 flex-1 truncate">{layer.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-[8px] text-[#FFAD60] text-center opacity-50">
                      WAITING FOR INPUT...
                    </div>
                  )}
               </div>
            </PixelWindow>
          </div>
        </div>
      </main>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pb-8">
        <div className="bg-[#FFAD60] border-[4px] border-[#5A3A22] p-4 flex gap-4 shadow-[8px_8px_0_0_rgba(90,58,34,0.4)]">
          <PixelButton 
            primary 
            className="flex-1"
            onClick={handleConvert}
            disabled={!svgInput}
          >
            <Zap size={16} fill="#5A3A22" />
            GENERATE XML
          </PixelButton>
          
          <PixelButton 
            onClick={() => {setSvgInput(''); setParsedLayers([]);}}
            className="w-16 flex items-center justify-center"
          >
            <X size={16} strokeWidth={3} />
          </PixelButton>
        </div>
      </div>

      {showOutput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(90,58,34,0.8)]">
          <div className="w-full max-w-3xl h-[80vh]">
            <PixelWindow 
              title="Output.xml" 
              icon={Terminal}
              rightHeader={
                <button onClick={() => setShowOutput(false)} className="text-[#5A3A22] active:translate-y-1 bg-[#FFF5EB] border-[2px] border-[#5A3A22] p-1">
                  <X size={14} strokeWidth={3} />
                </button>
              }
            >
              <div className="p-2 relative h-full flex flex-col">
                <textarea 
                  readOnly
                  value={xmlOutput}
                  className="flex-1 w-full bg-[#5A3A22] text-[#FFAD60] p-4 text-[10px] border-[4px] border-[#5A3A22] focus:outline-none resize-none"
                  style={{ lineHeight: '1.8' }}
                />
                
                <div className="mt-4 flex justify-end">
                  <PixelButton primary onClick={handleCopy}>
                    {isCopied ? <Check size={14} strokeWidth={3} /> : <Copy size={14} strokeWidth={3} />}
                    {isCopied ? 'COPIED!' : 'COPY XML'}
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