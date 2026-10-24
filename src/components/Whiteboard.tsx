'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Pencil, Highlighter, Eraser, Trash2, Camera, Square, Circle, Minus, Download } from 'lucide-react';

interface WhiteboardProps {
  onSaveSnapshot?: (dataUrl: string) => void;
}

export default function Whiteboard({ onSaveSnapshot }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tool, setTool] = useState<'pen' | 'highlighter' | 'eraser' | 'line' | 'rect' | 'circle'>('pen');
  const [color, setColor] = useState<string>('#4F46E5');
  const [lineWidth, setLineWidth] = useState<number>(3);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [savedImageData, setSavedImageData] = useState<ImageData | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high DPI canvas resolution
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
      // Shape preview mode
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

    // Download snapshot
    const link = document.createElement('a');
    link.download = `urok-aidaumnichka-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Whiteboard Toolbar */}
      <div className="bg-slate-50 border-b border-slate-200 p-2 sm:p-3 flex flex-wrap items-center justify-between gap-2">
        {/* Tools */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          <button
            onClick={() => setTool('pen')}
            className={`p-2 rounded-lg text-xs font-medium transition-all ${
              tool === 'pen' ? 'bg-brand-50 text-brand-700 shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Карандаш"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTool('highlighter')}
            className={`p-2 rounded-lg text-xs font-medium transition-all ${
              tool === 'highlighter' ? 'bg-brand-50 text-brand-700 shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Маркер-выделитель"
          >
            <Highlighter className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`p-2 rounded-lg text-xs font-medium transition-all ${
              tool === 'eraser' ? 'bg-brand-50 text-brand-700 shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Ластик"
          >
            <Eraser className="w-4 h-4" />
          </button>
          <div className="w-[1px] h-5 bg-slate-200 mx-1" />
          <button
            onClick={() => setTool('line')}
            className={`p-2 rounded-lg text-xs font-medium transition-all ${
              tool === 'line' ? 'bg-brand-50 text-brand-700 shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Прямая линия"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTool('rect')}
            className={`p-2 rounded-lg text-xs font-medium transition-all ${
              tool === 'rect' ? 'bg-brand-50 text-brand-700 shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Прямоугольник"
          >
            <Square className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTool('circle')}
            className={`p-2 rounded-lg text-xs font-medium transition-all ${
              tool === 'circle' ? 'bg-brand-50 text-brand-700 shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Круг"
          >
            <Circle className="w-4 h-4" />
          </button>
        </div>

        {/* Colors & Thickness */}
        <div className="flex items-center gap-2">
          {/* Colors */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            {['#4F46E5', '#EF4444', '#10B981', '#F59E0B', '#0F172A'].map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={`w-6 h-6 rounded-full transition-transform ${
                  color === c ? 'scale-125 ring-2 ring-offset-1 ring-slate-400' : 'hover:scale-110'
                }`}
              />
            ))}
          </div>

          {/* Stroke Width */}
          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-xl border border-slate-200 shadow-sm">
            {[2, 4, 8].map((w) => (
              <button
                key={w}
                onClick={() => setLineWidth(w)}
                className={`px-2 py-0.5 text-xs font-bold rounded ${
                  lineWidth === w ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {w === 2 ? 'Тонкий' : w === 4 ? 'Средний' : 'Толстый'}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={clearCanvas}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors font-medium"
            title="Очистить доску"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Очистить</span>
          </button>
          <button
            onClick={saveSnapshot}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors font-medium shadow-sm"
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
        <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] text-slate-500 pointer-events-none shadow-sm">
          Интерактивная доска «АйДаУмничка» • P2P Realtime
        </div>
      </div>
    </div>
  );
}
