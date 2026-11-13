import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarIcon, ChevronLeft, ChevronRight, Moon, Phone, Search, Sun, Users, UtensilsCrossed, Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ESTADOS, resumen, type Reserva, type Turno } from "@/lib/reservas";
import { getReservas } from "@/lib/reservas.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Panel de Reservas · Comidas y Cenas" },
      { name: "description", content: "Gestiona las reservas diarias de comida y cena de tu restaurante, sincronizadas con Google Sheets." },
      { property: "og:title", content: "Panel de Reservas · Comidas y Cenas" },
      { property: "og:description", content: "Reservas del día por turno, comensales y estado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const hoy = () => format(new Date(), "yyyy-MM-dd");

function Index() {
  const [fecha, setFecha] = useState(hoy);
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("todos");

  const { data, isFetching } = useQuery({
    queryKey: ["reservas", fecha],
    queryFn: () => getReservas({ data: { fecha } }),
  });

  const reservas = data?.reservas ?? [];
  const filtradas = useMemo(
    () =>
      reservas.filter(
        (r) =>
          r.nombre.toLowerCase().includes(q.toLowerCase()) &&
          (estado === "todos" || r.estado === estado),
      ),
    [reservas, q, estado],
  );
  const total = resumen(reservas);
  const d = parseISO(fecha);
  const move = (n: number) => setFecha(format(addDays(d, n), "yyyy-MM-dd"));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground">
              <UtensilsCrossed className="size-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl leading-tight">Reservas</h1>
              <p className="text-sm text-muted-foreground">
                {data?.fuente === "sheets" ? "Sincronizado con Google Sheets" : "Datos de ejemplo · Google Sheets sin conectar"}
                {isFetching && " · actualizando…"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => move(-1)} aria-label="Día anterior">
              <ChevronLeft />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-56 justify-start capitalize">
                  <CalendarIcon />
                  {format(d, "EEEE, d 'de' MMMM yyyy", { locale: es })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={d}
                  onSelect={(x) => x && setFecha(format(x, "yyyy-MM-dd"))}
                  locale={es}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="icon" onClick={() => move(1)} aria-label="Día siguiente">
              <ChevronRight />
            </Button>
            {fecha !== hoy() && (
              <Button variant="ghost" onClick={() => setFecha(hoy())}>Hoy</Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        {data?.error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            No se pudo leer la hoja: {data.error}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-3">
          <Metric label="Total comensales" value={total.comensales} icon={<Users />} tone="primary" />
          <Metric label="Reservas de comida" value={total.comida} icon={<Sun />} tone="lunch" />
          <Metric label="Reservas de cena" value={total.cena} icon={<Moon />} tone="dinner" />
        </section>

        <section className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre de cliente…" className="bg-card pl-9" />
          </div>
          <Select value={estado} onValueChange={setEstado}>
            <SelectTrigger className="bg-card sm:w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              {ESTADOS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <TurnoBlock turno="Comida" all={reservas} list={filtradas} />
          <TurnoBlock turno="Cena" all={reservas} list={filtradas} />
        </section>
      </main>
    </div>
  );
}

const toneCls = {
  primary: "bg-primary/10 text-primary",
  lunch: "bg-lunch/15 text-lunch",
  dinner: "bg-dinner/15 text-dinner",
};

function Metric({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: keyof typeof toneCls }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className={cn("grid size-12 place-items-center rounded-xl [&_svg]:size-6", toneCls[tone])}>{icon}</div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-display text-3xl">{value}</p>
      </div>
    </div>
  );
}

function TurnoBlock({ turno, all, list }: { turno: Turno; all: Reserva[]; list: Reserva[] }) {
  const items = list.filter((r) => r.turno === turno);
  const todas = all.filter((r) => r.turno === turno);
  const pax = todas.filter((r) => r.estado !== "Cancelada").reduce((a, r) => a + r.comensales, 0);
  const isLunch = turno === "Comida";
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <div className={cn("flex items-center justify-between px-5 py-4", isLunch ? "bg-lunch/10" : "bg-dinner/10")}>
        <div className="flex items-center gap-2">
          {isLunch ? <Sun className="size-5 text-lunch" /> : <Moon className="size-5 text-dinner" />}
          <h2 className="font-display text-xl">{turno}</h2>
        </div>
        <div className="flex gap-4 text-sm">
          <span><b>{todas.length}</b> <span className="text-muted-foreground">reservas</span></span>
          <span><b>{pax}</b> <span className="text-muted-foreground">comensales</span></span>
        </div>
      </div>
      <div className="space-y-3 p-4">
        {items.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">Sin reservas para este turno.</p>
        )}
        {items.map((r) => <ReservaCard key={r.id} r={r} />)}
      </div>
    </div>
  );
}

const estadoCls: Record<string, string> = {
  Confirmada: "bg-success/15 text-success",
  Pendiente: "bg-warning/20 text-warning-foreground",
  Cancelada: "bg-destructive/10 text-destructive",
  Sentada: "bg-dinner/15 text-dinner",
};

function ReservaCard({ r }: { r: Reserva }) {
  const wa = r.telefono.replace(/\D/g, "");
  return (
    <div className={cn("flex items-center gap-4 rounded-xl border border-border bg-background p-4 transition hover:shadow-soft", r.estado === "Cancelada" && "opacity-60")}>
      <div className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-secondary py-2">
        <Users className="size-4 text-primary" />
        <span className="font-display text-2xl leading-none">{r.comensales}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-semibold">{r.nombre}</p>
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", estadoCls[r.estado] ?? "bg-muted text-muted-foreground")}>{r.estado}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-primary">
            <Phone className="size-3.5" />{r.telefono}
          </a>
          <span className="inline-flex items-center gap-1 font-mono text-xs"><Hash className="size-3" />{r.id}</span>
        </div>
      </div>
    </div>
  );
}
