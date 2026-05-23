export default function StatCard({ label, value, accent = 'slate', icon }) {
  const accents = {
    slate:  'bg-slate-50  text-slate-700 ring-slate-200',
    amber:  'bg-amber-50  text-amber-800 ring-amber-200',
    green:  'bg-green-50  text-green-800 ring-green-200',
    red:    'bg-red-50    text-red-800   ring-red-200',
    indigo: 'bg-indigo-50 text-indigo-800 ring-indigo-200',
  };
  return (
    <div className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200 p-5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-slate-500">{label}</div>
        {icon && (
          <div className={`text-base rounded-md px-2 py-1 ring-1 ${accents[accent]}`}>
            {icon}
          </div>
        )}
      </div>
      <div className="mt-2 text-3xl font-bold text-slate-900 tabular-nums">{value}</div>
    </div>
  );
}
