import { useEffect, useState } from 'react';
import { AreaPanel } from './components/area-panel';
import { MachineTile } from './components/machine-tile';
import { TvClock } from './components/tv-clock';
import { CUT_GROUPS, type Machine, getMachines, machinesByArea, stat } from './data';
import { cn } from './utils';

const REFRESH_MS = 120_000;

export function App() {
    const [machines, setMachines] = useState<Machine[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = () =>
            getMachines()
                .then((m) => (setMachines(m), setError(null)))
                // lỗi mạng tạm thời: giữ dữ liệu cũ trên TV, chỉ hiện lỗi khi chưa có gì
                .catch((e: Error) => setError(e.message));
        load();
        const t = setInterval(load, REFRESH_MS);
        return () => clearInterval(t);
    }, []);

    if (!machines)
        return (
            <p role={error ? 'alert' : 'status'} className="p-8 text-subText text-base text-center">
                {error ?? 'Đang tải dữ liệu…'}
            </p>
        );
    return <TvBoard machines={machines} error={error} />;
}

function TvBoard({ machines, error }: { machines: Machine[]; error: string | null }) {
    const total = stat(machines);
    const cut = machinesByArea(machines, 'cut');
    const press = machinesByArea(machines, 'press');
    // shortcut: 12 máy đầu (4×3) + khung 6 máy cuối (4×2) theo mock 18 máy, thêm máy thì đổi số hàng/cột
    const [pressMain, pressZone] = [press.slice(0, 12), press.slice(12)];

    return (
        // font gốc scale theo viewport (index.css .tv-screen)
        <main className="z-50 fixed inset-0 flex flex-col gap-4 bg-surface p-4 overflow-hidden text-mainText tv-screen">
            <header className="flex items-center gap-6 bg-card px-6 py-4 border-2 border-white/10 rounded-2xl text-white shrink-0">
                <h1 className="font-extrabold text-3xl">Bảng ĐH & PP lệnh CUT 1</h1>
                <span className="flex items-center gap-2 bg-line-strong px-4 py-1.5 rounded-full font-bold text-mainText text-lg">
                    <span aria-hidden="true" className="bg-run-light rounded-full size-2.5" />
                    {total.active}/{total.total} Máy đang hoạt động
                </span>
                {/* refresh lỗi: vẫn giữ dữ liệu cũ nhưng báo để không ai tin nhầm là đang cập nhật */}
                {error && (
                    <span role="alert" className="bg-stop px-4 py-1.5 rounded-full font-bold text-lg text-stop-on">
                        Mất kết nối, dữ liệu có thể chưa cập nhật
                    </span>
                )}
                <div className="ml-auto">
                    <TvClock />
                </div>
            </header>

            {/* bảng chặt thủy lực nhiều cột hơn lưới ô cắt nên chia 2:3 */}
            <div className="flex-1 gap-4 grid grid-cols-5 min-h-0">
                <AreaPanel area="cut" list={cut} className="col-span-2">
                    {/* shortcut: lưới cố định 2 nhóm × 2 cột theo mock data, đổi sang tính động khi số máy thay đổi */}
                    <div className="flex flex-col flex-1 gap-3 min-h-0">
                        {CUT_GROUPS.map((g) => {
                            const list = cut.filter((m) => m.group === g);
                            // chia chiều cao theo số hàng để ô các nhóm cao bằng nhau (lệch chút do tiêu đề nhóm)
                            // shortcut: chỉ xử lý 1–2 hàng, nhóm nào > 4 máy thì thêm nấc
                            const grow = list.length > 2 ? 'flex-[2_1_0]' : 'flex-[1_1_0]';
                            return (
                                <div key={g} className={cn('flex flex-col gap-1.5 min-h-0', grow)}>
                                    <h3 className="bg-white/10 pl-2 rounded-md font-bold text-lg uppercase tracking-widest shrink-0">
                                        {g}
                                    </h3>
                                    <div className="flex-1 gap-3 grid grid-cols-2 auto-rows-fr min-h-0">
                                        {list.map((m) => (
                                            <MachineTile key={m.id} m={m} />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </AreaPanel>

                <AreaPanel area="press" list={press} className="col-span-3">
                    {/* 3:2 theo số hàng để ô 2 khung cao bằng nhau; padding/viền khung tăng cường được cộng ngoài phần chia */}
                    <div className="flex-[3_1_0] gap-2.5 grid grid-cols-4 grid-rows-3 min-h-0">
                        {pressMain.map((m) => (
                            <MachineTile key={m.id} m={m} compact />
                        ))}
                    </div>
                    {pressZone.length > 0 && (
                        <section className="flex flex-col flex-[2_1_0] gap-2 bg-zone/5 p-2.5 border-2 border-zone rounded-2xl min-h-0">
                            <div className="flex-1 gap-2.5 grid grid-cols-4 grid-rows-2 min-h-0">
                                {pressZone.map((m) => (
                                    <MachineTile key={m.id} m={m} compact />
                                ))}
                            </div>
                        </section>
                    )}
                </AreaPanel>
            </div>
        </main>
    );
}
