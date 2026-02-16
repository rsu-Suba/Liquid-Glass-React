import { spineFC, ringFC } from "./GlassFC";

interface ProcessGlassParams {
    ctx: CanvasRenderingContext2D;
    startPos: { x: number; y: number };
    size: { x: number; y: number };
    currentSize: { width: number; height: number };
    innerRatio: number;
    innerBlurWidth: number;
    compressionPower?: number;
}

export const processGlassRefraction = ({
    ctx,
    startPos,
    size,
    currentSize,
    innerRatio,
    innerBlurWidth,
    compressionPower = 2.2,
}: ProcessGlassParams) => {
    try {
        const imageData = ctx.getImageData(startPos.x, startPos.y, size.x, size.y);
        const data8 = imageData.data;
        const data32 = new Uint32Array(data8.buffer);
        const newData8 = new Uint8ClampedArray(data8);
        const newData32 = new Uint32Array(newData8.buffer);

        const spine = spineFC(currentSize.width, currentSize.height);
        const ring = ringFC(spine.radius, innerRatio, innerBlurWidth);

        for (let y = 0; y < size.y; y++) {
            const cy = Math.max(spine.Start.y, Math.min(y, spine.End.y));
            const rowIndexOffset = y * size.x;

            for (let x = 0; x < size.x; x++) {
                const cx = Math.max(spine.Start.x, Math.min(x, spine.End.x));
                const dx = x - cx;
                const dy = y - cy;
                const distSq = dx * dx + dy * dy;

                if (distSq > ring.innerRadiusSq && distSq <= ring.radiusSq) {
                    const distance = Math.sqrt(distSq);
                    const ratioInRing = (distance - ring.innerRadius) * ring.invRingThickness;
                    const compressedRatio = Math.pow(ratioInRing, compressionPower);
                    const newDistance = ring.innerRadius - compressedRatio * (ring.innerRadius - ring.reflectMinRadius);
                    const ratio = newDistance / distance;
                    const srcX = (cx + dx * ratio + 0.5) | 0;
                    const srcY = (cy + dy * ratio + 0.5) | 0;

                    if (srcX >= 0 && srcX < size.x && srcY >= 0 && srcY < size.y) {
                        const index32 = rowIndexOffset + x;
                        const srcIndex32 = srcY * size.x + srcX;

                        if (distance < ring.innerRadius + innerBlurWidth) {
                            let t = (distance - ring.innerRadius) * ring.invInnerBlurWidth;
                            t = t * t * (3 - 2 * t);

                            const destIndex8 = index32 << 2;
                            const srcIndex8 = srcIndex32 << 2;

                            newData8[destIndex8 + 0] =
                                data8[destIndex8 + 0] + (data8[srcIndex8 + 0] - data8[destIndex8 + 0]) * t;
                            newData8[destIndex8 + 1] =
                                data8[destIndex8 + 1] + (data8[srcIndex8 + 1] - data8[destIndex8 + 1]) * t;
                            newData8[destIndex8 + 2] =
                                data8[destIndex8 + 2] + (data8[srcIndex8 + 2] - data8[destIndex8 + 2]) * t;
                        } else {
                            newData32[index32] = data32[srcIndex32];
                        }
                    }
                }
            }
        }

        ctx.putImageData(new ImageData(newData8, size.x, size.y), startPos.x, startPos.y);
    } catch (e) {
        console.error("Glass Refraction Error:", e);
    }
};