interface spine {
    isHorizontal: boolean;
    radius: number;
    Start: { x: number; y: number };
    End: { x: number; y: number };
}

interface ring {
    innerRadiusSq: number;
    radiusSq: number;
    invRingThickness: number;
    invInnerBlurWidth: number;
    reflectMinRadius: number;
}

const spineFC = (width: number, height: number) => {
    const isHorizontal = width >= height;
    const radius = isHorizontal ? height / 2 : width / 2;
    const spineStartX = isHorizontal ? radius : width / 2;
    const spineEndX = isHorizontal ? width - radius : width / 2;
    const spineStartY = isHorizontal ? height / 2 : radius;
    const spineEndY = isHorizontal ? height / 2 : height - radius;

    const spine: spine = {
        isHorizontal: isHorizontal,
        radius: radius,
        Start: { x: spineStartX, y: spineStartY },
        End: { x: spineEndX, y: spineEndY },
    };

    return spine;
};

const ringFC = (radius: number, innerRadius: number, innerBlurWidth: number) => {
    const ringThickness = Math.max(radius - innerRadius, 0.001);

    const ring: ring = {
        innerRadiusSq: Math.pow(innerRadius, 2),
        radiusSq: Math.pow(radius, 2),
        invRingThickness: 1.0 / ringThickness,
        invInnerBlurWidth: 1.0 / (innerBlurWidth || 0.001),
        reflectMinRadius: 0.001
    };

    return ring;
};

export { spineFC, ringFC };
