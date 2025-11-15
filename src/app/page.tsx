import AircraftCabinClient from "@/components/AircraftCabinClient";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-cabin-bg to-white py-12 px-4 sm:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10">
        <header className="space-y-3 text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-text-main">
            Cathay Cargo Control
          </p>
          <h1 className="text-3xl font-bold text-uld-border sm:text-4xl">
            Boeing 747-8F 装载布局监控
          </h1>
          <p className="text-base leading-relaxed text-text-main">
            实时查看主甲板与下甲板的ULD占用情况、优先货物状态与固定仓位，帮助团队快速做出调度决策。
          </p>
        </header>

        <AircraftCabinClient />
      </div>
    </main>
  );
}
