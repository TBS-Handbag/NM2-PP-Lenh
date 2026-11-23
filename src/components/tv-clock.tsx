import { useEffect, useState } from 'react';

const TZ = 'Asia/Ho_Chi_Minh';

export function TvClock() {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    return (
        <div className="flex flex-col items-end leading-tight shrink-0">
            <time className="font-bold tabular-nums text-4xl">
                {now.toLocaleTimeString('vi-VN', { timeZone: TZ, hour12: false })}
            </time>
        </div>
    );
}
