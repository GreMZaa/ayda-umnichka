'use client';

import React, { useRef, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Pencil,
  Highlighter,
  Eraser,
  Trash2,
  Square,
  Circle,
  Minus,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
} from 'lucide-react';

interface WhiteboardProps {
  roomId?: string;
  onSaveSnapshot?: (dataUrl: string) => void;
  onClose?: () => void;
}

export default function Whiteboard({ roomId, onSaveSnapshot, onClose }: WhiteboardProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [tool, setTool] = useState<'pen' | 'highlighter' | 'eraser' | 'line' | 'rect' | 'circle'>('pen');
  const [color, setColor] = useState<string>('#F97A52'); // Warm coral default
  const [lineWidth, setLineWidth] = useState<number>(3);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [savedImageData, setSavedImageData] = useState<ImageData | null>(null);

  // Zoom & Pan states for smooth pinch-to-zoom on mobile and touch devices
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const initialPinchDistRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number>(1);
  const lastCenterRef = useRef<{ x: number; y: number } | null>(null);
  const isPinchingRef = useRef<boolean>(false);

  // Realtime multi-user drawing synchronization via Supabase Broadcast
  const myPeerIdRef = useRef<string>(`peer_${Math.random().toString(36).substring(2, 9)}`);
  const channelRef = useRef<any>(null);
  const lastDrawnPosRef = useRef<{ x: number; y: number } | null>(null);

  const renderRemoteSegment = (payload: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    tool: string;
    color: string;
    lineWidth: number;
  }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (payload.tool === 'highlighter') {
      ctx.strokeStyle = payload.color;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = Math.max(1, payload.lineWidth * w * 2.5);
    } else if (payload.tool === 'eraser') {
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = Math.max(1, payload.lineWidth * w * 3);
    } else {
      ctx.strokeStyle = payload.color;
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = Math.max(1, payload.lineWidth * w);
    }

    ctx.beginPath();
    ctx.moveTo(payload.x1 * w, payload.y1 * h);
    ctx.lineTo(payload.x2 * w, payload.y2 * h);
    ctx.stroke();
    ctx.restore();
  };

  const renderRemoteShape = (payload: {
    tool: string;
    color: string;
    lineWidth: number;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = payload.color;
    ctx.globalAlpha = 1.0;
    ctx.lineWidth = Math.max(1, payload.lineWidth * w);
    ctx.beginPath();

    const sx = payload.startX * w;
    const sy = payload.startY * h;
    const ex = payload.endX * w;
    const ey = payload.endY * h;

    if (payload.tool === 'line') {
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    } else if (payload.tool === 'rect') {
      ctx.strokeRect(sx, sy, ex - sx, ey - sy);
    } else if (payload.tool === 'circle') {
      const radius = Math.sqrt(Math.pow(ex - sx, 2) + Math.pow(ey - sy, 2));
      ctx.arc(sx, sy, radius, 0, 2 * Math.PI);
      ctx.stroke();
    }
    ctx.restore();
  };

  const handleRemoteClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  useEffect(() => {
    if (!roomId) return;
    const cleanRoomId = roomId.trim().toLowerCase();
    const channel = supabase.channel(`whiteboard_${cleanRoomId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'whiteboard-action' }, ({ payload }) => {
        if (!payload || payload.senderId === myPeerIdRef.current) return;

        if (payload.type === 'segment') {
          renderRemoteSegment(payload);
        } else if (payload.type === 'shape') {
          renderRemoteShape(payload);
        } else if (payload.type === 'clear') {
          handleRemoteClear();
        } else if (payload.type === 'request-state') {
          const canvas = canvasRef.current;
          if (canvas) {
            const dataUrl = canvas.toDataURL('image/png');
            channel.send({
              type: 'broadcast',
              event: 'whiteboard-action',
              payload: {
                senderId: myPeerIdRef.current,
                type: 'sync-state',
                dataUrl,
              },
            });
          }
        } else if (payload.type === 'sync-state' && payload.dataUrl) {
          const img = new Image();
          img.onload = () => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (canvas && ctx) {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            }
          };
          img.src = payload.dataUrl;
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'whiteboard-action',
            payload: {
              senderId: myPeerIdRef.current,
              type: 'request-state',
            },
          });
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId]);

  // Resize canvas to match actual container dimensions with high fidelity
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const targetWidth = Math.round(rect.width);
        const targetHeight = Math.round(rect.height);

        // Only resize if dimensions have meaningfully changed
        if (canvas.width === targetWidth && canvas.height === targetHeight) {
          return;
        }

        // Backup existing drawing
        let prevCanvas: HTMLCanvasElement | null = null;
        if (canvas.width > 0 && canvas.height > 0) {
          prevCanvas = document.createElement('canvas');
          prevCanvas.width = canvas.width;
          prevCanvas.height = canvas.height;
          const prevCtx = prevCanvas.getContext('2d');
          if (prevCtx) {
            prevCtx.drawImage(canvas, 0, 0);
          }
        }

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (prevCanvas && prevCanvas.width > 0 && prevCanvas.height > 0) {
          ctx.drawImage(prevCanvas, 0, 0);
        }
      }
    };

    // Run immediately
    resizeCanvas();

    // ResizeObserver watches container visibility changes (e.g. switching tabs from video to whiteboard)
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      ro = new ResizeObserver(() => {
        resizeCanvas();
      });
      ro.observe(containerRef.current);
    }

    window.addEventListener('resize', resizeCanvas);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // Compute exact pixel coordinate on the canvas bitmap regardless of screen scale, zoom, or pan
  const getCoordinates = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return { x: 0, y: 0 };

    // Ratio between canvas bitmap pixels and rendered bounding client rect
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawingAt = (x: number, y: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    setIsDrawing(true);
    setStartPos({ x, y });
    lastDrawnPosRef.current = { x, y };

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
    }

    if (['pen', 'highlighter', 'eraser'].includes(tool)) {
      if (lastDrawnPosRef.current && channelRef.current) {
        const w = canvas.width || 1;
        const h = canvas.height || 1;
        channelRef.current.send({
          type: 'broadcast',
          event: 'whiteboard-action',
          payload: {
            senderId: myPeerIdRef.current,
            type: 'segment',
            x1: lastDrawnPosRef.current.x / w,
            y1: lastDrawnPosRef.current.y / h,
            x2: x / w,
            y2: y / h,
            tool,
            color,
            lineWidth: lineWidth / w,
          },
        });
      }
      lastDrawnPosRef.current = { x, y };
    } else if (savedImageData && startPos) {
      lastDrawnPosRef.current = { x, y };
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
    if (isDrawing && ['line', 'rect', 'circle'].includes(tool) && startPos && lastDrawnPosRef.current && channelRef.current) {
      const canvas = canvasRef.current;
      if (canvas) {
        const w = canvas.width || 1;
        const h = canvas.height || 1;
        channelRef.current.send({
          type: 'broadcast',
          event: 'whiteboard-action',
          payload: {
            senderId: myPeerIdRef.current,
            type: 'shape',
            tool,
            color,
            lineWidth: lineWidth / w,
            startX: startPos.x / w,
            startY: startPos.y / h,
            endX: lastDrawnPosRef.current.x / w,
            endY: lastDrawnPosRef.current.y / h,
          },
        });
      }
    }
    setIsDrawing(false);
    setStartPos(null);
    lastDrawnPosRef.current = null;
    setSavedImageData(null);
  };

  // Mouse Handlers (Desktop)
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    const coords = getCoordinates(e.clientX, e.clientY);
    startDrawingAt(coords.x, coords.y);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCoordinates(e.clientX, e.clientY);
    drawAt(coords.x, coords.y);
  };

  // Touch Handlers for smartphones (iOS & Android) with Pinch-to-Zoom & Pan support!
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    // 2 fingers: Pinch-to-zoom / Pan gesture!
    if (e.touches.length === 2) {
      isPinchingRef.current = true;
      setIsDrawing(false);
      setStartPos(null);

      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      initialPinchDistRef.current = dist;
      initialZoomRef.current = zoom;
      lastCenterRef.current = {
        x: (t0.clientX + t1.clientX) / 2,
        y: (t0.clientY + t1.clientY) / 2,
      };
      return;
    }

    // 1 finger: Draw with active tool!
    if (e.touches.length === 1 && !isPinchingRef.current) {
      const coords = getCoordinates(e.touches[0].clientX, e.touches[0].clientY);
      startDrawingAt(coords.x, coords.y);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    // 2 fingers: Zoom & Pan calculation!
    if (e.touches.length === 2) {
      isPinchingRef.current = true;
      if (isDrawing) {
        setIsDrawing(false);
        setStartPos(null);
      }

      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const currentDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const currentCenter = {
        x: (t0.clientX + t1.clientX) / 2,
        y: (t0.clientY + t1.clientY) / 2,
      };

      // 1. Zoom computation (clamped between 0.5x and 4.0x)
      if (initialPinchDistRef.current && initialPinchDistRef.current > 0) {
        const factor = currentDist / initialPinchDistRef.current;
        const newZoom = Math.min(4.0, Math.max(0.5, initialZoomRef.current * factor));
        setZoom(Number(newZoom.toFixed(2)));
      }

      // 2. Pan computation
      if (lastCenterRef.current) {
        const dx = currentCenter.x - lastCenterRef.current.x;
        const dy = currentCenter.y - lastCenterRef.current.y;
        setPan((prev) => ({
          x: prev.x + dx,
          y: prev.y + dy,
        }));
      }
      lastCenterRef.current = currentCenter;
      return;
    }

    // 1 finger: draw stroke
    if (e.touches.length === 1 && !isPinchingRef.current) {
      const coords = getCoordinates(e.touches[0].clientX, e.touches[0].clientY);
      drawAt(coords.x, coords.y);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length < 2) {
      initialPinchDistRef.current = null;
      lastCenterRef.current = null;
      setTimeout(() => {
        isPinchingRef.current = false;
      }, 80);
    }
    if (e.touches.length === 0) {
      stopDraw();
    }
  };

  // Zoom Action Helpers
  const handleZoomIn = () => {
    setZoom((z) => Math.min(4.0, Number((z * 1.25).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoom((z) => Math.max(0.5, Number((z * 0.8).toFixed(2))));
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'whiteboard-action',
        payload: {
          senderId: myPeerIdRef.current,
          type: 'clear',
        },
      });
    }
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
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-2.5 py-1 text-xs text-white bg-coralAccent hover:bg-coralAccent-hover rounded-full font-black shadow-2xs transition-transform active:scale-90 cursor-pointer flex items-center gap-1 shrink-0"
                title="Выйти из доски и вернуться к видео"
              >
                <X className="w-3.5 h-3.5" />
                <span>Выйти</span>
              </button>
            )}
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
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-1.5 px-4 sm:px-5 py-1.5 sm:py-2 text-xs text-white bg-coralAccent hover:bg-coralAccent-hover rounded-full transition-all active:scale-[0.97] font-black shadow-xs cursor-pointer"
                title="Выйти из доски и вернуться к видео"
              >
                <X className="w-3.5 h-3.5" />
                <span>Выйти из доски</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Canvas Area with full mouse & touch drawing support + Pinch-to-Zoom & Pan */}
      <div
        ref={containerRef}
        className="relative flex-1 bg-[#FAF6F2] cursor-crosshair overflow-hidden min-h-[350px] touch-none select-none"
      >
        {/* Floating Zoom & Pan Control Pill */}
        <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 bg-white/95 backdrop-blur-md px-2 py-1 rounded-full border border-[#EADBCC] shadow-sm select-none">
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1 rounded-full text-[#161F38] hover:bg-[#FFF7EE] active:scale-90 transition-transform cursor-pointer"
            title="Уменьшить масштаб (жест 2 пальцами)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="px-2 py-0.5 text-[10px] font-black text-[#161F38] hover:text-coralAccent active:scale-95 transition-colors cursor-pointer"
            title="Сбросить масштаб (100%)"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1 rounded-full text-[#161F38] hover:bg-[#FFF7EE] active:scale-90 transition-transform cursor-pointer"
            title="Приблизить масштаб (жест 2 пальцами)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          {zoom !== 1 || pan.x !== 0 || pan.y !== 0 ? (
            <button
              type="button"
              onClick={handleResetZoom}
              className="p-1 text-[#8A95A8] hover:text-coralAccent rounded-full transition-colors cursor-pointer"
              title="Сбросить позицию и зум"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          ) : null}
        </div>

        {/* Transformable Canvas Surface */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            width: '100%',
            height: '100%',
            transition: isPinchingRef.current ? 'none' : 'transform 100ms ease-out',
          }}
          className="relative w-full h-full"
        >
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            className="w-full h-full bg-white shadow-2xs touch-none select-none block"
          />
        </div>


      </div>
    </div>
  );
}
