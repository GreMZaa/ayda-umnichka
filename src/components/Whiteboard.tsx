'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Pencil, Highlighter, Eraser, Trash2, Square, Circle, Minus, Download } from 'lucide-react';

interface WhiteboardProps {
  onSaveSnapshot?: (dataUrl: string) => void;
}

export default function Whiteboard({ onSaveSnapshot }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tool, setTool] = useState<'pen' | 'highlighter' | 'eraser' | 'line' | 'rect' | 'circle'>('pen');
  const [color, setColor] = useState<string>('#F97A52'); // Warm coral default
  const [lineWidth, setLineWidth] = useState<number>(3);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [savedImageData, setSavedImageData] = useState<ImageData | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = Math.max(500, rect.height || 500);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const coords = getCanvasCoordinates(e);
    setIsDrawing(true);
    setStartPos(coords);

    if (['line', 'rect', 'circle'].includes(tool)) {
      setSavedImageData(ctx.getImageData(0, 0, canvas.width, canvas.height));
    } else {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const coords = getCanvasCoordinates(e);

    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'pen') {
      ctx.strokeStyle = color;
      ctx.globalAlpha = 1.0;
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else if (tool === 'highlighter') {
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = lineWidth * 2.5;
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else if (tool === 'eraser') {
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = lineWidth * 3;
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else if (savedImageData && startPos) {
      ctx.putImageData(savedImageData, 0, 0);
      ctx.strokeStyle = color;
      ctx.globalAlpha = 1.0;
      ctx.beginPath();

      if (tool === 'line') {
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
      } else if (tool === 'rect') {
        ctx.strokeRect(startPos.x, startPos.y, coords.x - startPos.x, coords.y - startPos.y);
      } else if (tool === 'circle') {
        const radius = Math.sqrt(Math.pow(coords.x - startPos.x, 2) + Math.pow(coords.y - startPos.y, 2));
        ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
  };

  const stopDraw = () => {
    setIsDrawing(false);
    setStartPos(null);
    setSavedImageData(null);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const saveSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    if (onSaveSnapshot) onSaveSnapshot(dataUrl);

    const link = document.createElement('a');
    link.download = `urok-aidaumnichka-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-[36px] border border-[#F2E3D5] shadow-sm overflow-hidden">
      {/* Whiteboard Toolbar (Warm cream, pill buttons) */}
      <div className="bg-[#FFF8F1] border-b border-[#F4E3D2] p-3 flex flex-wrap items-center justify-between gap-2">
        {/* Tools */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-full border border-[#EADBCC] shadow-xs">
          <button
            onClick={() => setTool('pen')}
            className={`p-2 rounded-full text-xs font-bold transition-all ${
              tool === 'pen' ? 'bg-[#FFF7EE] text-coralAccent shadow-xs' : 'text-ink-600 hover:bg-[#FFF7EE]'
            }`}
            title="Карандаш"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTool('highlighter')}
            className={`p-2 rounded-full text-xs font-bold transition-all ${
              tool === 'highlighter' ? 'bg-[#FFF7EE] text-coralAccent shadow-xs' : 'text-ink-600 hover:bg-[#FFF7EE]'
            }`}
            title="Маркер-выделитель"
          >
            <Highlighter className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`p-2 rounded-full text-xs font-bold transition-all ${
              tool === 'eraser' ? 'bg-[#FFF7EE] text-coralAccent shadow-xs' : 'text-ink-600 hover:bg-[#FFF7EE]'
            }`}
            title="Ластик"
          >
            <Eraser className="w-4 h-4" />
          </button>
          <div className="w-[1px] h-5 bg-[#EADBCC] mx-1" />
          <button
            onClick={() => setTool('line')}
            className={`p-2 rounded-full text-xs font-bold transition-all ${
              tool === 'line' ? 'bg-[#FFF7EE] text-coralAccent shadow-xs' : 'text-ink-600 hover:bg-[#FFF7EE]'
            }`}
            title="Прямая линия"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTool('rect')}
            className={`p-2 rounded-full text-xs font-bold transition-all ${
              tool === 'rect' ? 'bg-[#FFF7EE] text-coralAccent shadow-xs' : 'text-ink-600 hover:bg-[#FFF7EE]'
            }`}
            title="Прямоугольник"
          >
            <Square className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTool('circle')}
            className={`p-2 rounded-full text-xs font-bold transition-all ${
              tool === 'circle' ? 'bg-[#FFF7EE] text-coralAccent shadow-xs' : 'text-ink-600 hover:bg-[#FFF7EE]'
            }`}
            title="Круг"
          >
            <Circle className="w-4 h-4" />
          </button>
        </div>

        {/* Colors & Thickness */}
        <div className="flex items-center gap-2">
          {/* Colors */}
          <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-full border border-[#EADBCC] shadow-xs">
            {['#F97A52', '#C5E87D', '#6366F1', '#EC4899', '#161F38'].map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={`w-6 h-6 rounded-full transition-transform ${
                  color === c ? 'scale-125 ring-2 ring-offset-1 ring-ink-900' : 'hover:scale-110'
                }`}
              />
            ))}
          </div>

          {/* Stroke Width */}
          <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-full border border-[#EADBCC] shadow-xs">
            {[2, 4, 8].map((w) => (
              <button
                key={w}
                onClick={() => setLineWidth(w)}
                className={`px-2.5 py-0.5 text-xs font-black rounded-full ${
                  lineWidth === w ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-[#FFF7EE]'
                }`}
              >
                {w === 2 ? 'Тонкий' : w === 4 ? 'Средний' : 'Толстый'}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={clearCanvas}
            className="flex items-center gap-1 px-4 py-2 text-xs text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 rounded-full font-bold transition-colors"
            title="Очистить доску"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Очистить</span>
          </button>
          <button
            onClick={saveSnapshot}
            className="flex items-center gap-1.5 px-5 py-2 text-xs text-ink-900 bg-limeAccent hover:bg-limeAccent-hover rounded-full transition-all font-black shadow-xs"
            title="Сохранить снимок доски в историю урока"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Сохранить снимок</span>
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative flex-1 bg-white cursor-crosshair overflow-hidden min-h-[460px]">
        <canvas
          ref={canvasRef}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          className="absolute inset-0 w-full h-full touch-none"
        />
        <div className="absolute bottom-3 left-3 bg-[#FFF7EE]/95 border border-[#F4DEC6] rounded-full px-4 py-1 text-[11px] text-ink-600 font-bold pointer-events-none shadow-xs">
          Интерактивная доска «АйДаУмничка» • P2P Realtime
        </div>
      </div>
    </div>
  );
}
