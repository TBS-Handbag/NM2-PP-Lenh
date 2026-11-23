import type { Status } from '../data';

/** Copy từ tbs-control components/machines/status-pill.tsx (phần TV dùng). */
export const STATUS_STYLE: Record<Status, { label: string; cell: string; band: string; chip: string }> = {
    run: {
        label: 'Đang Hoạt động',
        cell: 'bg-white/5 border-run-line',
        band: 'bg-run-band text-run-fg',
        chip: 'bg-ink/40 text-white',
    },
    idle: {
        label: 'Hết lệnh chờ',
        cell: 'bg-idle-cell border-idle-line',
        band: 'bg-idle text-idle-on',
        chip: 'bg-idle-on text-idle-fg',
    },
    stop: {
        label: 'Nhàn rỗi',
        cell: 'bg-stop-cell border-stop-line',
        band: 'bg-stop text-stop-on',
        chip: 'bg-ink/40 text-white',
    },
};
