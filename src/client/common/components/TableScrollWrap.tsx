import React, { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
    children: React.ReactNode;
    minWidth: number;
    className?: string;
}

// Wraps a table in a horizontally-scrollable track with edge fades that
// appear only when there's more content to scroll to in that direction.
const TableScrollWrap: React.FC<Props> = ({ children, minWidth, className }) => {
    const trackRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const updateFades = useCallback(() => {
        const el = trackRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 2);
        setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    }, []);

    useEffect(() => {
        updateFades();
        window.addEventListener('resize', updateFades);
        return () => window.removeEventListener('resize', updateFades);
    }, [updateFades, children]);

    return (
        <div className="table-scroll-wrap">
            <div className="table-scroll-fade table-scroll-fade--left" style={{ opacity: canScrollLeft ? 1 : 0 }} />
            <div ref={trackRef} className="table-scroll-track" onScroll={updateFades}>
                <div style={{ minWidth }} className={className}>
                    {children}
                </div>
            </div>
            <div className="table-scroll-fade table-scroll-fade--right" style={{ opacity: canScrollRight ? 1 : 0 }} />
        </div>
    );
};

export default TableScrollWrap;
