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
      if (rect && rect.width > 0 && rect.height > 0) {
        let prevData: ImageData | null = null;
        if (canvas.width > 0 && canvas.height > 0) {
          try {
            prevData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          } catch (_) {}
        }

        canvas.width = rect.width;
        canvas.height = rect.height;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (prevData) {
          ctx.putImageData(prevData, 0, 0);
        }
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const getCoordinates = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawingAt = (x: number, y: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    setIsDrawing(true);
    setStartPos({ x, y });

    if (['line', 'rect', 'circle'].includes(tool)) {
      setSavedImageData(ctx.getImageData(0, 0, canvas.width, canvas.height));
    } else {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const drawAt = (x: number, y: number) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'pen') {
      ctx.strokeStyle = color;
      ctx.globalAlpha = 1.0;
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === 'highlighter') {
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = lineWidth * 2.5;
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === 'eraser') {
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = lineWidth * 3;
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (savedImageData && startPos) {
      ctx.putImageData(savedImageData, 0, 0);
      ctx.strokeStyle = color;
      ctx.globalAlpha = 1.0;
      ctx.beginPath();

      if (tool === 'line') {
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else if (tool === 'rect') {
        ctx.strokeRect(startPos.x, startPos.y, x - startPos.x, y - startPos.y);
      } else if (tool === 'circle') {
        const radius = Math.sqrt(Math.pow(x - startPos.x, 2) + Math.pow(y - startPos.y, 2));
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

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCoordinates(e.clientX, e.clientY);
    startDrawingAt(coords.x, coords.y);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCoordinates(e.clientX, e.clientY);
    drawAt(coords.x, coords.y);
  };

  // Touch Handlers for smartphones (iOS & Android)
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches[0]) {
      const coords = getCoordinates(e.touches[0].clientX, e.touches[0].clientY);
      startDrawingAt(coords.x, coords.y);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches[0]) {
      const coords = getCoordinates(e.touches[0].clientX, e.touches[0].clientY);
      drawAt(coords.x, coords.y);
    }
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
    <div className="flex flex-col h-full bg-white rounded-2xl sm:rounded-[32px] border border-[#F2E3D5] shadow-xs overflow-hidden">
      {/* Whiteboard Toolbar — Adaptive for phones & desktops */}
      <div className="bg-[#FFF8F1] border-b border-[#F4E3D2] p-2 sm:p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2 shrink-0">
        {/* Row 1 on mobile: Tools + Quick Actions (Clear & Save) */}
        <div className="flex items-center justify-between gap-1 w-full sm:w-auto">
          {/* Tools */}
          <div className="flex items-center gap-0.5 sm:gap-1 bg-white p-1 rounded-full border border-[#EADBCC] shadow-2xs">
            <button
              type="button"
              onClick={() => setTool('pen')}
              className={`p-1.5 sm:p-2 rounded-full text-xs font-bold transition-all active:scale-90 cursor-pointer ${
                tool === 'pen' ? 'bg-[#FFF7EE] text-coralAccent shadow-2xs' : 'text-ink-600 hover:bg-[#FFF7EE]'
              }`}
              title="Карандаш"
            >
              <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              type="button"
              onClick={() => setTool('highlighter')}
              className={`p-1.5 sm:p-2 rounded-full text-xs font-bold transition-all active:scale-90 cursor-pointer ${
                tool === 'highlighter' ? 'bg-[#FFF7EE] text-coralAccent shadow-2xs' : 'text-ink-600 hover:bg-[#FFF7EE]'
              }`}
              title="Маркер-выделитель"
            >
              <Highlighter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              type="button"
              onClick={() => setTool('eraser')}
              className={`p-1.5 sm:p-2 rounded-full text-xs font-bold transition-all active:scale-90 cursor-pointer ${
                tool === 'eraser' ? 'bg-[#FFF7EE] text-coralAccent shadow-2xs' : 'text-ink-600 hover:bg-[#FFF7EE]'
              }`}
              title="Ластик"
            >
              <Eraser className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <div className="w-[1px] h-4 sm:h-5 bg-[#EADBCC] mx-0.5 sm:mx-1" />
            <button
              type="button"
              onClick={() => setTool('line')}
              className={`p-1.5 sm:p-2 rounded-full text-xs font-bold transition-all active:scale-90 cursor-pointer ${
                tool === 'line' ? 'bg-[#FFF7EE] text-coralAccent shadow-2xs' : 'text-ink-600 hover:bg-[#FFF7EE]'
              }`}
              title="Прямая линия"
            >
              <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              type="button"
              onClick={() => setTool('rect')}
              className={`p-1.5 sm:p-2 rounded-full text-xs font-bold transition-all active:scale-90 cursor-pointer ${
                tool === 'rect' ? 'bg-[#FFF7EE] text-coralAccent shadow-2xs' : 'text-ink-600 hover:bg-[#FFF7EE]'
              }`}
              title="Прямоугольник"
            >
              <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              type="button"
              onClick={() => setTool('circle')}
              className={`p-1.5 sm:p-2 rounded-full text-xs font-bold transition-all active:scale-90 cursor-pointer ${
                tool === 'circle' ? 'bg-[#FFF7EE] text-coralAccent shadow-2xs' : 'text-ink-600 hover:bg-[#FFF7EE]'
              }`}
              title="Круг"
            >
              <Circle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>

          {/* Quick Actions for Mobile */}
          <div className="flex items-center gap-1 sm:hidden">
            <button
              type="button"
              onClick={clearCanvas}
              className="p-1.5 text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 rounded-full font-bold transition-colors shadow-2xs cursor-pointer active:scale-90"
              title="Очистить доску"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={saveSnapshot}
              className="p-1.5 text-ink-900 bg-limeAccent hover:bg-limeAccent-hover border border-[#CCE8A2] rounded-full font-black shadow-2xs transition-transform active:scale-90 cursor-pointer"
              title="Сохранить снимок"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Row 2 on mobile: Colors + Thickness */}
        <div className="flex items-center justify-between sm:justify-start gap-1.5 sm:gap-2 w-full sm:w-auto">
          {/* Colors */}
          <div className="flex items-center gap-1 sm:gap-1.5 bg-white p-1 sm:p-1.5 rounded-full border border-[#EADBCC] shadow-2xs">
            {['#F97A52', '#C5E87D', '#6366F1', '#EC4899', '#161F38'].map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full transition-transform cursor-pointer ${
                  color === c ? 'scale-110 sm:scale-125 ring-2 ring-offset-1 ring-ink-900' : 'hover:scale-105 opacity-90'
                }`}
                title={`Цвет ${c}`}
              />
            ))}
          </div>

          {/* Stroke Width / Thickness */}
          <div className="flex items-center gap-1 bg-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-[#EADBCC] shadow-2xs">
            {[2, 4, 8].map((w) => (
              <button
                type="button"
                key={w}
                onClick={() => setLineWidth(w)}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-0.5 text-[11px] sm:text-xs font-black rounded-full flex items-center gap-1 transition-colors cursor-pointer ${
                  lineWidth === w ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-[#FFF7EE]'
                }`}
              >
                <span
                  className="rounded-full bg-current inline-block shrink-0"
                  style={{ width: `${w * 1.3 + 2}px`, height: `${w * 1.3 + 2}px` }}
                />
                <span className="hidden sm:inline">
                  {w === 2 ? 'Тонкий' : w === 4 ? 'Средний' : 'Толстый'}
                </span>
              </button>
            ))}
          </div>

          {/* Actions for Desktop */}
          <div className="hidden sm:flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={clearCanvas}
              className="flex items-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 text-xs text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 rounded-full font-bold transition-colors cursor-pointer"
              title="Очистить доску"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Очистить</span>
            </button>
            <button
              type="button"
              onClick={saveSnapshot}
              className="flex items-center gap-1.5 px-4 sm:px-5 py-1.5 sm:py-2 text-xs text-ink-900 bg-limeAccent hover:bg-limeAccent-hover rounded-full transition-all active:scale-[0.97] font-black shadow-xs cursor-pointer"
              title="Сохранить снимок доски в историю урока"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Сохранить снимок</span>
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Area with full mouse & touch drawing support */}
      <div className="relative flex-1 bg-white cursor-crosshair overflow-hidden min-h-[300px]">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={stopDraw}
          onTouchCancel={stopDraw}
          className="absolute inset-0 w-full h-full touch-none select-none"
        />

        {/* Small desktop-only watermark */}
        <div className="absolute bottom-2 left-2 bg-[#FFF7EE]/95 border border-[#F4DEC6] rounded-full px-3 py-0.5 text-[10px] text-ink-600 font-bold pointer-events-none shadow-2xs hidden sm:block">
          Интерактивная доска «АйДаУмничка» • P2P Realtime
        </div>
      </div>
    </div>
  );
}
