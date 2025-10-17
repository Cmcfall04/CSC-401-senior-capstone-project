import { Hammer } from "lucide-react";

export default function UnderConstruction({
  title = "Under Construction",
  note,
}: {
  title?: string;
  note?: string;
}) {
  return (
    <section className="card">
      <div className="flex items-center gap-3 mb-2">
        <Hammer />
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      <p className="text-slate-600">
        This page is part of Sprint 1 and will be built out in Sprint 2.
      </p>
      {note && <p className="mt-2 text-slate-500">{note}</p>}
    </section>
  );
}