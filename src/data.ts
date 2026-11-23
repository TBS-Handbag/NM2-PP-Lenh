// Đọc Google Sheet qua link export CSV công khai (sheet phải share "Anyone with the link → Viewer").
// Logic tính máy/lệnh copy từ tbs-control: lib/data/get-machines.ts, machines.ts, sheet.ts.
//   machines: id | name | short | area | group | sort
//   orders:   id | machine_id | day | seq | start | end   (start/end: "2026-10-28T06:00" giờ VN)
//   workers:  machine_id | role | name

const SHEET_ID = '14fmaUjsQLVRc7rn1Fvpq14vq1GXL-4aNj2_pw5qweFw';
const GID = { machines: '839318669', orders: '1899741470', workers: '1291936315' };

export type Area = 'cut' | 'press';
export type Order = { id: number; code: string; start: string; end: string };
export type WorkerRole = 'operators' | 'counters';
export type Machine = {
    id: string;
    name: string;
    short: string;
    area: Area;
    group: string;
    current: Order | null;
    queue: Order[];
    operators: string[];
    counters: string[];
};
export type Status = 'run' | 'idle' | 'stop';

export const AREAS = {
    cut: { title: 'Trải-Cắt, Bullmer' },
    press: { title: 'Chặt thủy lực' },
} as const;

export const CUT_GROUPS = ['Trải', 'Bullmer'];

export const machinesByArea = (list: Machine[], area: Area) => list.filter((m) => m.area === area);

/** run: đang Hoạt động và còn lệnh chờ · idle: đang Hoạt động lệnh cuối · stop: không có lệnh */
export const statusOf = (m: Machine): Status => (!m.current ? 'stop' : m.queue.length ? 'run' : 'idle');

export function stat(list: Machine[]) {
    const stop = list.filter((m) => statusOf(m) === 'stop').length;
    const queued = list.reduce((n, m) => n + m.queue.length, 0);
    return { total: list.length, active: list.length - stop, queued };
}

/** "2026-10-28T06:00" -> "06:00" */
export const formatTime = (s: string) => s.slice(11, 16);

const VN = 7 * 3_600_000;
/** ms -> "2026-10-28T06:00" giờ VN (VN không có DST nên cộng cứng +7) */
const toVn = (ms: number) => new Date(ms + VN).toISOString().slice(0, 16);
/** "2026-10-28T06:00" giờ VN -> ms */
const fromVn = (s: string) => Date.parse(`${s}+07:00`);
const orderCode = (seq: number) => `L${String(seq).padStart(2, '0')}`;

/** CSV RFC 4180: ô có dấu phẩy/xuống dòng nằm trong "", "" là dấu " thật */
export function parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (quoted) {
            if (ch === '"' && text[i + 1] === '"') (cell += '"'), i++;
            else if (ch === '"') quoted = false;
            else cell += ch;
        } else if (ch === '"') quoted = true;
        else if (ch === ',') row.push(cell), (cell = '');
        else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && text[i + 1] === '\n') i++;
            row.push(cell), rows.push(row), (row = []), (cell = '');
        } else cell += ch;
    }
    if (cell || row.length) row.push(cell), rows.push(row);
    return rows;
}

async function readTab(tab: keyof typeof GID) {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID[tab]}`;
    // timeout để request treo không kẹt cờ inflight ở App, chặn mọi lần refresh sau
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`Không đọc được tab "${tab}" (${res.status})`);
    // sheet bị tắt share công khai thì Google trả trang login HTML với status 200
    if (!res.headers.get('content-type')?.includes('text/csv'))
        throw new Error(`Tab "${tab}" không trả CSV, kiểm tra quyền share của sheet`);
    // bỏ dòng tiêu đề và dòng trống
    return parseCsv(await res.text())
        .slice(1)
        .filter((r) => r[0]);
}

/** Máy kèm lệnh chưa kết thúc (lệnh nối liền nên lệnh đầu là đang chạy, trừ khi nó chưa tới giờ). */
export async function getMachines(): Promise<Machine[]> {
    const [mRows, oRows, wRows] = await Promise.all([readTab('machines'), readTab('orders'), readTab('workers')]);
    const orders = oRows
        .map((r) => ({ id: Number(r[0]), machine: r[1], seq: Number(r[3]), start: fromVn(r[4]), end: fromVn(r[5]) }))
        .sort((a, b) => a.start - b.start);
    const workers = wRows.map((r) => ({ machine: r[0], role: r[1] as WorkerRole, name: r[2] }));
    const now = Date.now();
    const today = fromVn(`${toVn(now).slice(0, 10)}T00:00`);

    return mRows
        .map((r) => ({ id: r[0], name: r[1], short: r[2], area: r[3] as Area, group: r[4], sort: Number(r[5]) }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ id, name, short, area, group }) => {
            const all = orders.filter((o) => o.machine === id && o.end > today);
            // giữ đúng cách tính của bản gốc (slice theo số lệnh đã kết thúc)
            const pending = all.slice(all.filter((o) => o.end <= now).length);
            const list = pending.map((o) => ({ id: o.id, code: orderCode(o.seq), start: toVn(o.start), end: toVn(o.end) }));
            const running = pending.length > 0 && pending[0].start <= now;
            const names = (role: WorkerRole) => workers.filter((w) => w.machine === id && w.role === role).map((w) => w.name);
            return {
                id,
                name,
                short,
                area,
                group,
                current: running ? list[0] : null,
                queue: running ? list.slice(1) : list,
                operators: names('operators'),
                counters: names('counters'),
            };
        });
}
