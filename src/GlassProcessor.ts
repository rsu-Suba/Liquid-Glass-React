import { spineFC, ringFC } from "./GlassFC";

interface ProcessGlassParams {
    ctx: CanvasRenderingContext2D;
    startPos: { x: number; y: number };
    size: { x: number; y: number };
    currentSize: { width: number; height: number };
    innerRadius: number;
    innerBlurWidth: number;
    compressionPower?: number;
}

export const processGlassRefraction = ({
    ctx,
    startPos,
    size,
    currentSize,
    innerRadius,
    innerBlurWidth,
    compressionPower = 4.0,
}: ProcessGlassParams) => {
    try {
        const maxAberration = 0.3;
        const maxSpineDistortion = 30.0;

        const imageData = ctx.getImageData(startPos.x, startPos.y, size.x, size.y);
        const data8 = imageData.data;
        const newData8 = new Uint8ClampedArray(data8);

        const spine = spineFC(currentSize.width, currentSize.height);
        innerRadius = Math.min(spine.radius - 20, spine.radius * 0.87);
        const ring = ringFC(spine.radius, innerRadius, innerBlurWidth);

        const spineMidX = (spine.Start.x + spine.End.x) * 0.5;
        const spineMidY = (spine.Start.y + spine.End.y) * 0.5;

        const dxSpine = spine.End.x - spine.Start.x;
        const dySpine = spine.End.y - spine.Start.y;
        const halfSpineLength = Math.sqrt(dxSpine * dxSpine + dySpine * dySpine) * 0.5;

        const invHalfSpineLength = halfSpineLength > 0 ? 1.0 / halfSpineLength : 0;

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

                    const ratioInRing = (distance - innerRadius) * ring.invRingThickness;
                    const compressedRatio = Math.pow(ratioInRing, compressionPower);
                    const newDistance = innerRadius - compressedRatio * (innerRadius - ring.reflectMinRadius);

                    const ratio = newDistance / distance;
                    const baseDX = dx * ratio;
                    const baseDY = dy * ratio;

                    const dxMid = cx - spineMidX;
                    const dyMid = cy - spineMidY;
                    const spineRatioX = dxMid * invHalfSpineLength;
                    const spineRatioY = dyMid * invHalfSpineLength;
                    const spineForce = -maxSpineDistortion * Math.pow(ratioInRing, 3);
                    const spineShiftX = spineRatioX * Math.abs(spineRatioX) * spineForce;
                    const spineShiftY = spineRatioY * Math.abs(spineRatioY) * spineForce;

                    const finalBaseDX = baseDX + spineShiftX;
                    const finalBaseDY = baseDY + spineShiftY;
                    const aberForce = maxAberration * Math.pow(ratioInRing, 4);
                    const shiftX = finalBaseDY * aberForce;
                    const shiftY = finalBaseDX * aberForce;

                    const srcXR = (cx + finalBaseDX - shiftX + 0.5) | 0;
                    const srcYR = (cy + finalBaseDY + shiftY + 0.5) | 0;
                    const srcXG = (cx + finalBaseDX + 0.5) | 0;
                    const srcYG = (cy + finalBaseDY + 0.5) | 0;
                    const srcXB = (cx + finalBaseDX + shiftX + 0.5) | 0;
                    const srcYB = (cy + finalBaseDY - shiftY + 0.5) | 0;

                    if (srcXG >= 0 && srcXG < size.x && srcYG >= 0 && srcYG < size.y) {
                        const index32 = rowIndexOffset + x;

                        const srcIndexR =
                            (Math.max(0, Math.min(srcYR, size.y - 1)) * size.x +
                                Math.max(0, Math.min(srcXR, size.x - 1))) <<
                            2;
                        const srcIndexG = (srcYG * size.x + srcXG) << 2;
                        const srcIndexB =
                            (Math.max(0, Math.min(srcYB, size.y - 1)) * size.x +
                                Math.max(0, Math.min(srcXB, size.x - 1))) <<
                            2;

                        const destIndex8 = index32 << 2;

                        if (distance < innerRadius + innerBlurWidth) {
                            let t = (distance - innerRadius) * ring.invInnerBlurWidth;
                            t = t * t * (3 - 2 * t);

                            newData8[destIndex8 + 0] =
                                data8[destIndex8 + 0] + (data8[srcIndexR + 0] - data8[destIndex8 + 0]) * t;
                            newData8[destIndex8 + 1] =
                                data8[destIndex8 + 1] + (data8[srcIndexG + 1] - data8[destIndex8 + 1]) * t;
                            newData8[destIndex8 + 2] =
                                data8[destIndex8 + 2] + (data8[srcIndexB + 2] - data8[destIndex8 + 2]) * t;
                        } else {
                            newData8[destIndex8 + 0] = data8[srcIndexR + 0];
                            newData8[destIndex8 + 1] = data8[srcIndexG + 1];
                            newData8[destIndex8 + 2] = data8[srcIndexB + 2];
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
