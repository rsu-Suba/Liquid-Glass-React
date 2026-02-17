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
    bgScale = 1.0,
}) => {
    const canvasSize: { x: number; y: number } = { x: window.innerWidth, y: window.innerHeight };
    const initialX: number = canvasSize.x / 2;
    const initialY: number = canvasSize.y / 2;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [pos, setPos] = useState({ x: initialX, y: initialY });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
    const [lensScale, setLensScale] = useState(1.0);
    const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
    const initialPinchDistance = useRef<number | null>(null);
    const baseLensScale = useRef<number>(1.0);

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
        const currentSize = { width: width * lensScale, height: height * lensScale };
        const size = { x: Math.round(currentSize.width), y: currentSize.height };
        const startPos = {
            x: Math.round(pos.x - currentSize.width / 2),
            y: Math.round(pos.y - currentSize.height / 2),
        };

        // ctx.fillStyle = "#000";
        // ctx.fillRect(0, 0, canvasSize.x, canvasSize.y);
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

        processGlassRefraction({
            ctx,
            startPos,
            size,
            currentSize,
            innerRadius,
            innerBlurWidth: innerBlurWidth * lensScale,
        });
    }, [pos, imageElement, width, height, innerRadius, innerBlurWidth, bgOffsetX, bgOffsetY, bgScale, lensScale]);

    const handlePointerDown = (e: React.PointerEvent) => {
        activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (activePointers.current.size === 1) {
            setIsDragging(true);
            setDragOffset({
                x: e.clientX - pos.x,
                y: e.clientY - pos.y,
            });
        } else if (activePointers.current.size === 2) {
            setIsDragging(false);
            const pointers = Array.from(activePointers.current.values());
            const distance = Math.sqrt(
                Math.pow(pointers[0].x - pointers[1].x, 2) + Math.pow(pointers[0].y - pointers[1].y, 2),
            );
            initialPinchDistance.current = distance;
            baseLensScale.current = lensScale;
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!activePointers.current.has(e.pointerId)) return;
        activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (activePointers.current.size === 1 && isDragging) {
            setPos({
                x: e.clientX - dragOffset.x,
                y: e.clientY - dragOffset.y,
            });
        } else if (activePointers.current.size === 2 && initialPinchDistance.current !== null) {
            const pointers = Array.from(activePointers.current.values());
            const currentDistance = Math.sqrt(
                Math.pow(pointers[0].x - pointers[1].x, 2) + Math.pow(pointers[0].y - pointers[1].y, 2),
            );
            const scaleFactor = currentDistance / initialPinchDistance.current;
            const newScale = Math.min(Math.max(0.5, baseLensScale.current * scaleFactor), 3.0);
            setLensScale(newScale);
        }
    };

    const handlePointerUpOrLeave = (e: React.PointerEvent) => {
        activePointers.current.delete(e.pointerId);
        if (activePointers.current.size < 2) {
            initialPinchDistance.current = null;
        }
        if (activePointers.current.size === 0) {
            setIsDragging(false);
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

            <div
                className="LiquidGlassObj"
                style={{
                    top: pos.y - (height * lensScale) / 2,
                    left: pos.x - (width * lensScale) / 2,
                    width: width * lensScale,
                    height: height * lensScale,
                    border: `${2 * lensScale}px solid rgba(255, 255, 255, 0.2)`,
                }}
            />
        </div>
    );
};

export default InvertedCircleLens;
