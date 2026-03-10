import React, { useRef, useEffect, useState } from "react";
import { processGlassRefraction } from "./GlassProcessor";

interface DraggablePillLensProps {
    imageUrl: string;
    initialX?: number;
    initialY?: number;
    width?: number;
    height?: number;
    innerRadius?: number;
    innerBlurWidth?: number;
    bgOffsetX?: number;
    bgOffsetY?: number;
    bgScale?: number;
}

const InvertedCircleLens: React.FC<DraggablePillLensProps> = ({
    imageUrl,
    width = 360,
    height = 120,
    innerRadius = 70,
    innerBlurWidth = 0,
    bgOffsetX = 0,
    bgOffsetY = 0,
    bgScale = 1.0
}) => {
    const canvasSize: { x: number; y: number } = { x: window.innerWidth, y: window.innerHeight };
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    const [glasses, setGlasses] = useState([
        { id: 1, x: canvasSize.x / 2, y: canvasSize.y / 2 - 200, scale: 1.0, mode: 1 },
        { id: 2, x: canvasSize.x / 2, y: canvasSize.y / 2 + 200, scale: 1.0, mode: 2 }
    ]);
    
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
    
    const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
    const initialPinchDistance = useRef<number | null>(null);
    const baseLensScale = useRef<number>(1.0);
    const activeGlassId = useRef<number | null>(null);

    useEffect(() => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = imageUrl;
        img.onload = () => setImageElement(img);
    }, [imageUrl]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !imageElement) return;

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        canvas.width = canvasSize.x;
        canvas.height = canvasSize.y;

        const scaledSize = { width: imageElement.width * bgScale, height: imageElement.height * bgScale };
        const drawPos = {
            x: canvasSize.x - scaledSize.width + bgOffsetX,
            y: (canvasSize.y - scaledSize.height) / 2 + bgOffsetY,
        };

        ctx.clearRect(0, 0, canvasSize.x, canvasSize.y);
        ctx.drawImage(imageElement, drawPos.x, drawPos.y, scaledSize.width, scaledSize.height);

        ctx.font = "Bold 60px 'SF Pro', sans-serif";
        ctx.fillStyle = "rgba(255, 255, 255, 1)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        ctx.shadowBlur = 20;
        ctx.shadowOffsetY = 10;

        ctx.fillText("🤨😓😆", canvasSize.x / 2, canvasSize.y / 2);

        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        glasses.forEach((g) => {
            const currentSize = { width: width * g.scale, height: height * g.scale };
            const size = { x: Math.round(currentSize.width), y: currentSize.height };
            const startPos = {
                x: Math.round(g.x - currentSize.width / 2),
                y: Math.round(g.y - currentSize.height / 2),
            };

            processGlassRefraction({
                ctx,
                startPos,
                size,
                currentSize,
                innerRadius,
                innerBlurWidth: innerBlurWidth * g.scale,
                mode: g.mode,
            });
        });
    }, [glasses, imageElement, width, height, innerRadius, innerBlurWidth, bgOffsetX, bgOffsetY, bgScale]);

    const getHitGlassId = (x: number, y: number) => {
        for (let i = glasses.length - 1; i >= 0; i--) {
            const g = glasses[i];
            const gWidth = width * g.scale;
            const gHeight = height * g.scale;
            if (Math.abs(x - g.x) <= gWidth / 2 && Math.abs(y - g.y) <= gHeight / 2) {
                return g.id;
            }
        }
        return null;
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        
        if (activePointers.current.size === 1) {
            const hitId = getHitGlassId(e.clientX, e.clientY);
            if (hitId !== null) {
                const hitGlass = glasses.find(g => g.id === hitId)!;
                activeGlassId.current = hitId;
                setIsDragging(true);
                setDragOffset({
                    x: e.clientX - hitGlass.x,
                    y: e.clientY - hitGlass.y,
                });
                
                // Bring the clicked glass to the front
                setGlasses(prev => {
                    const filtered = prev.filter(g => g.id !== hitId);
                    const target = prev.find(g => g.id === hitId)!;
                    return [...filtered, target];
                });
            } else {
                activeGlassId.current = null;
                setIsDragging(false);
            }
        } else if (activePointers.current.size === 2) {
            setIsDragging(false);
            if (activeGlassId.current !== null) {
                const pointers = Array.from(activePointers.current.values());
                const distance = Math.sqrt(
                    Math.pow(pointers[0].x - pointers[1].x, 2) + Math.pow(pointers[0].y - pointers[1].y, 2),
                );
                initialPinchDistance.current = distance;
                const activeGlass = glasses.find(g => g.id === activeGlassId.current);
                if (activeGlass) {
                    baseLensScale.current = activeGlass.scale;
                }
            }
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!activePointers.current.has(e.pointerId)) return;
        activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (activePointers.current.size === 1 && isDragging && activeGlassId.current !== null) {
            setGlasses(prev => prev.map(g => 
                g.id === activeGlassId.current 
                    ? { ...g, x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y }
                    : g
            ));
        } else if (activePointers.current.size === 2 && initialPinchDistance.current !== null && activeGlassId.current !== null) {
            const pointers = Array.from(activePointers.current.values());
            const currentDistance = Math.sqrt(
                Math.pow(pointers[0].x - pointers[1].x, 2) + Math.pow(pointers[0].y - pointers[1].y, 2),
            );
            const scaleFactor = currentDistance / initialPinchDistance.current;
            const newScale = Math.min(Math.max(0.5, baseLensScale.current * scaleFactor), 3.0);
            
            setGlasses(prev => prev.map(g => 
                g.id === activeGlassId.current 
                    ? { ...g, scale: newScale }
                    : g
            ));
        }
    };

    const handlePointerUpOrLeave = (e: React.PointerEvent) => {
        activePointers.current.delete(e.pointerId);
        if (activePointers.current.size < 2) {
            initialPinchDistance.current = null;
        }
        if (activePointers.current.size === 0) {
            setIsDragging(false);
            activeGlassId.current = null;
        }
    };

    return (
        <div style={{ position: "relative", display: "inline-block" }}>
            <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUpOrLeave}
                onPointerLeave={handlePointerUpOrLeave}
                className="LiquidCanvas"
                style={{ cursor: isDragging ? "grabbing" : "default", touchAction: "none" }}
            />

            {glasses.map((g) => (
                <div
                    key={g.id}
                    className="LiquidGlassObj"
                    style={{
                        top: g.y - (height * g.scale) / 2,
                        left: g.x - (width * g.scale) / 2,
                        width: width * g.scale,
                        height: height * g.scale,
                        border: `${2 * g.scale}px solid rgba(255, 255, 255, 0.2)`,
                    }}
                />
            ))}
        </div>
    );
};

export default InvertedCircleLens;